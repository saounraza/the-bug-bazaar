/**
 * "Chaos" settings let anyone trigger every documented error, slow responses and
 * out-of-order responses on purpose, from the Mock controls panel in the app or
 * from tests. Settings persist in localStorage so they survive a reload.
 */

export const ENDPOINTS = {
  listProducts: { label: 'GET /api/products', statuses: [500] },
  getProduct: { label: 'GET /api/products/:id', statuses: [404, 500] },
  login: { label: 'POST /api/login', statuses: [400, 401, 500] },
  me: { label: 'GET /api/me', statuses: [401, 500] },
  createOrder: { label: 'POST /api/orders', statuses: [400, 401, 409, 500] },
  getOrder: { label: 'GET /api/orders/:id', statuses: [401, 404, 500] },
} as const satisfies Record<string, { label: string; statuses: readonly number[] }>;

export type EndpointKey = keyof typeof ENDPOINTS;

export type ChaosConfig = {
  /** Added to every HTTP response. */
  latencyMs: number;
  /** Adds a random 0-2000 ms to product list requests so responses arrive out of order. */
  raceySearch: boolean;
  /** When set, the endpoint answers with this status instead of its normal result. */
  forcedErrors: Partial<Record<EndpointKey, number>>;
  /** POST /api/orders commits the order, then answers 500 as if the response was lost. */
  failAfterCommit: boolean;
};

export const DEFAULT_CHAOS: ChaosConfig = {
  latencyMs: 250,
  raceySearch: false,
  forcedErrors: {},
  failAfterCommit: false,
};

const STORAGE_KEY = 'bb-chaos';
type Listener = () => void;

let config: ChaosConfig = load();
const listeners = new Set<Listener>();

function load(): ChaosConfig {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHAOS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_CHAOS;
    return { ...DEFAULT_CHAOS, ...(parsed as Partial<ChaosConfig>) };
  } catch {
    return DEFAULT_CHAOS;
  }
}

export function getChaos(): ChaosConfig {
  return config;
}

export function setChaos(patch: Partial<ChaosConfig>): void {
  config = { ...config, ...patch };
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage can be full or disabled; chaos settings then last for this page only.
  }
  listeners.forEach((listener) => listener());
}

export function setForcedError(endpoint: EndpointKey, status: number | undefined): void {
  const forcedErrors = { ...config.forcedErrors };
  if (status === undefined) delete forcedErrors[endpoint];
  else forcedErrors[endpoint] = status;
  setChaos({ forcedErrors });
}

export function resetChaos(overrides: Partial<ChaosConfig> = {}): void {
  setChaos({ ...DEFAULT_CHAOS, ...overrides });
}

/** For useSyncExternalStore in the Mock controls panel. */
export function subscribeChaos(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
