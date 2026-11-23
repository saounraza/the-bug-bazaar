import { ws } from 'msw';
import { getProduct, setStock } from './db';

/**
 * Mock WebSocket server for live stock: ws(s)://<host>/ws/stock
 *
 * Client -> server: { type: 'subscribe', productIds: string[] }
 * Server -> client: { type: 'stock', productId, stock }
 *
 * While at least one client is connected, a ticker changes the stock of a
 * random subscribed product every TICK_MS, as if other shoppers were buying.
 */

export const STOCK_SOCKET_PATH = '/ws/stock';
export const TICK_MS = 2000;

export const stockSocket = ws.link(`*${STOCK_SOCKET_PATH}`);

type Client = (typeof stockSocket)['clients'] extends Set<infer C> ? C : never;

const subscriptions = new Map<Client, Set<string>>();
let ticker: ReturnType<typeof setInterval> | undefined;

function tick(): void {
  const subscribed = [...new Set([...subscriptions.values()].flatMap((ids) => [...ids]))];
  if (subscribed.length === 0) return;
  const id = subscribed[Math.floor(Math.random() * subscribed.length)];
  const product = id ? getProduct(id) : undefined;
  if (!product) return;

  // Mostly sales (stock goes down), sometimes a restock.
  const delta = Math.random() < 0.75 ? -(1 + Math.floor(Math.random() * 3)) : 5;
  const updated = setStock(product.id, product.stock + delta);
  if (!updated) return;

  const message = JSON.stringify({ type: 'stock', productId: updated.id, stock: updated.stock });
  for (const [client, ids] of subscriptions) {
    if (ids.has(updated.id)) client.send(message);
  }
}

function startTicker(): void {
  ticker ??= setInterval(tick, TICK_MS);
}

function stopTickerIfIdle(): void {
  if (subscriptions.size > 0 || ticker === undefined) return;
  clearInterval(ticker);
  ticker = undefined;
}

export const stockSocketHandler = stockSocket.addEventListener('connection', ({ client }) => {
  subscriptions.set(client, new Set());
  startTicker();

  client.addEventListener('message', (event) => {
    try {
      const message: unknown = JSON.parse(String(event.data));
      if (
        typeof message === 'object' &&
        message !== null &&
        (message as { type?: unknown }).type === 'subscribe' &&
        Array.isArray((message as { productIds?: unknown }).productIds)
      ) {
        const ids = (message as { productIds: unknown[] }).productIds.filter(
          (id): id is string => typeof id === 'string',
        );
        subscriptions.set(client, new Set(ids.slice(0, 500)));
      }
    } catch {
      // Ignore malformed frames, as a real server would.
    }
  });

  client.addEventListener('close', () => {
    subscriptions.delete(client);
    stopTickerIfIdle();
  });
});

/** Mock controls: simulate the server dropping every connection. */
export function dropAllStockClients(): void {
  for (const client of subscriptions.keys()) client.close(4000, 'Server dropped the connection');
}

/** How many clients are connected right now (used in tests). */
export function connectedStockClients(): number {
  return subscriptions.size;
}

/** Tests: run one tick on demand instead of waiting for the interval. */
export const runStockTick = tick;
