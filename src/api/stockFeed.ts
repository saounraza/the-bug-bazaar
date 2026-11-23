/**
 * Client for the live stock WebSocket (docs/api-contract.md, "Live stock").
 * The only place in src/ allowed to construct a WebSocket.
 *
 *  - Reconnects with exponential backoff plus jitter (1s, 2s, 4s... capped at
 *    15s) after an unexpected close, and re-sends the subscription on reconnect.
 *  - Reconnects straight away when the browser comes back online.
 *  - `close()` stops everything: the socket, pending reconnect timers and
 *    listeners. Nothing keeps running after the page closes.
 */

export type FeedStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export type StockMessage = { type: 'stock'; productId: string; stock: number };

export type StockFeedOptions = {
  url: string;
  onStock: (message: StockMessage) => void;
  onStatus?: (status: FeedStatus) => void;
  /** For tests. */
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export type StockFeed = {
  subscribe: (productIds: string[]) => void;
  /** Skip the backoff wait and reconnect now (e.g. the browser came back online). */
  reconnectNow: () => void;
  close: () => void;
};

function isStockMessage(value: unknown): value is StockMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === 'stock' &&
    typeof message.productId === 'string' &&
    typeof message.stock === 'number'
  );
}

export function stockSocketUrl(path = '/ws/stock'): string {
  const url = new URL(path, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function createStockFeed({
  url,
  onStock,
  onStatus,
  baseDelayMs = 1000,
  maxDelayMs = 15_000,
}: StockFeedOptions): StockFeed {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let closedByUs = false;
  let productIds: string[] = [];

  const sendSubscription = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', productIds }));
    }
  };

  const connect = () => {
    if (closedByUs) return;
    onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting');
    const current = new WebSocket(url);
    socket = current;

    current.addEventListener('open', () => {
      attempt = 0;
      onStatus?.('open');
      sendSubscription();
    });

    current.addEventListener('message', (event) => {
      try {
        const message: unknown = JSON.parse(String(event.data));
        if (isStockMessage(message)) onStock(message);
      } catch {
        // Ignore frames we don't understand.
      }
    });

    current.addEventListener('close', () => {
      if (socket !== current) return; // a newer socket has replaced this one
      socket = null;
      if (closedByUs) return;
      scheduleReconnect();
    });
  };

  const scheduleReconnect = () => {
    clearTimeout(retryTimer);
    onStatus?.('reconnecting');
    const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    // Jitter spreads reconnects out, so a server restart isn't hit by every
    // client in the same millisecond.
    const delay = exponential / 2 + Math.random() * (exponential / 2);
    attempt += 1;
    retryTimer = setTimeout(connect, delay);
  };

  connect();

  return {
    subscribe(ids) {
      productIds = [...new Set(ids)];
      sendSubscription();
    },
    reconnectNow() {
      if (closedByUs || socket) return;
      clearTimeout(retryTimer);
      connect();
    },
    close() {
      closedByUs = true;
      clearTimeout(retryTimer);
      socket?.close(1000, 'Page closed');
      socket = null;
      onStatus?.('closed');
    },
  };
}
