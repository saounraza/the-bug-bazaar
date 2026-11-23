import type { Order, OrderLine, Product, ProductQuery, User } from '../api/types';
import { seedProducts } from './seed';

/**
 * The mock backend's "database". It lives in page memory (MSW handlers run in
 * the page, not in the service worker). Changes that a real backend would keep
 * (stock, orders, sessions, idempotency keys) are saved to localStorage so a
 * reload behaves like a real server that still remembers them.
 */

export const DEMO_USER: User = { id: 'u-1', name: 'Ada Debugger', email: 'demo@bugbazaar.dev' };
export const DEMO_PASSWORD = 'password123';
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

type StoredOrder = Order & { userId: string; createdAt: number; lines: OrderLine[] };

type PersistedState = {
  stock: Record<string, number>;
  orders: Record<string, StoredOrder>;
  /** Idempotency-Key header value -> order id. */
  idempotency: Record<string, string>;
  /** Valid session tokens -> user id. */
  sessions: Record<string, string>;
};

const STORAGE_KEY = 'bb-mock-db';
const seeded = seedProducts();

let products = new Map<string, Product>();
let persisted: PersistedState = emptyState();

function emptyState(): PersistedState {
  return { stock: {}, orders: {}, idempotency: {}, sessions: {} };
}

function save(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore: the mock simply forgets changes on reload.
  }
}

function loadPersisted(): PersistedState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return emptyState();
  }
}

/** Rebuilds the database from the seed. `wipe` also forgets saved changes. */
export function resetDb({ wipe = false }: { wipe?: boolean } = {}): void {
  persisted = wipe ? emptyState() : loadPersisted();
  if (wipe) save();
  products = new Map(
    seeded.map((product) => [
      product.id,
      { ...product, stock: persisted.stock[product.id] ?? product.stock },
    ]),
  );
}

resetDb();

// ---------------------------------------------------------------- products

export function getProduct(id: string): Product | undefined {
  return products.get(id);
}

export function allProducts(): Product[] {
  return [...products.values()];
}

export function setStock(id: string, stock: number): Product | undefined {
  const product = products.get(id);
  if (!product) return undefined;
  const updated = { ...product, stock: Math.max(0, stock) };
  products.set(id, updated);
  persisted.stock[id] = updated.stock;
  save();
  return updated;
}

const compare: Record<NonNullable<ProductQuery['sort']>, (a: Product, b: Product) => number> = {
  featured: (a, b) => a.id.localeCompare(b.id),
  'price-asc': (a, b) => a.price - b.price || a.id.localeCompare(b.id),
  'price-desc': (a, b) => b.price - a.price || a.id.localeCompare(b.id),
  'rating-desc': (a, b) => b.rating - a.rating || a.id.localeCompare(b.id),
  'name-asc': (a, b) => a.name.localeCompare(b.name),
};

// Performance (docs/performance.md, fix 2): name, price, rating and id never
// change, so each sort order is computed once and cached as a list of ids,
// and names are lower-cased once for search. A request then only filters an
// already-sorted list: no per-request sort (localeCompare over 5,000 names
// took ~30 ms) and no per-request toLowerCase.
const lowerNames = new Map(seeded.map((product) => [product.id, product.name.toLowerCase()]));
const sortedIds = new Map<NonNullable<ProductQuery['sort']>, string[]>();

function idsSortedBy(sort: NonNullable<ProductQuery['sort']>): string[] {
  let ids = sortedIds.get(sort);
  if (!ids) {
    ids = [...seeded].sort(compare[sort]).map((product) => product.id);
    sortedIds.set(sort, ids);
  }
  return ids;
}

export function queryProducts(query: ProductQuery): { items: Product[]; total: number } {
  const search = query.search?.trim().toLowerCase() ?? '';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

  const matches: Product[] = [];
  for (const id of idsSortedBy(query.sort ?? 'featured')) {
    const product = products.get(id);
    if (!product) continue;
    if (search && !lowerNames.get(id)?.includes(search)) continue;
    if (query.category && product.category !== query.category) continue;
    if (query.inStock && product.stock <= 0) continue;
    matches.push(product);
  }

  const start = (page - 1) * pageSize;
  return { items: matches.slice(start, start + pageSize), total: matches.length };
}

// ---------------------------------------------------------------- sessions

export function createSession(userId: string): string {
  const token = `bb_${crypto.randomUUID()}`;
  persisted.sessions[token] = userId;
  save();
  return token;
}

export function userForToken(token: string | null): User | undefined {
  if (!token) return undefined;
  return persisted.sessions[token] === DEMO_USER.id ? DEMO_USER : undefined;
}

/** Simulates every session expiring on the server (used by the Mock controls). */
export function revokeAllSessions(): void {
  persisted.sessions = {};
  save();
}

// ---------------------------------------------------------------- orders

export type PlaceOrderResult =
  | { kind: 'created'; order: Order }
  | { kind: 'replayed'; order: Order }
  | { kind: 'out-of-stock'; product: Product; requested: number };

/** Order status advances with time so the confirmation page has something to poll. */
function statusAt(order: StoredOrder, now: number): Order['status'] {
  const age = now - order.createdAt;
  if (age < 3000) return 'queued';
  if (age < 6000) return 'processing';
  return 'confirmed';
}

export function placeOrder(
  userId: string,
  lines: OrderLine[],
  idempotencyKey: string | null,
): PlaceOrderResult {
  // Same key = same logical checkout: return the order we already created
  // instead of charging and decrementing stock a second time.
  if (idempotencyKey) {
    const existingId = persisted.idempotency[idempotencyKey];
    const existing = existingId ? persisted.orders[existingId] : undefined;
    if (existing && existing.userId === userId) {
      return { kind: 'replayed', order: { id: existing.id, status: 'queued' } };
    }
  }

  // Check every line before changing anything, so an order is all-or-nothing.
  for (const line of lines) {
    const product = products.get(line.productId);
    if (!product) throw new Error(`Unknown product ${line.productId}`);
    if (line.quantity > product.stock) {
      return { kind: 'out-of-stock', product, requested: line.quantity };
    }
  }

  for (const line of lines) {
    const product = products.get(line.productId);
    if (product) setStock(product.id, product.stock - line.quantity);
  }

  const order: StoredOrder = {
    id: `o-${crypto.randomUUID().slice(0, 8)}`,
    status: 'queued',
    userId,
    createdAt: Date.now(),
    lines,
  };
  persisted.orders[order.id] = order;
  if (idempotencyKey) persisted.idempotency[idempotencyKey] = order.id;
  save();

  return { kind: 'created', order: { id: order.id, status: order.status } };
}

export function getOrder(id: string, userId: string, now = Date.now()): Order | undefined {
  const order = persisted.orders[id];
  if (!order || order.userId !== userId) return undefined;
  return { id: order.id, status: statusAt(order, now) };
}
