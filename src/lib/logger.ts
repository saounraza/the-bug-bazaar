/**
 * Minimal error logger. In development it prints to the console; in every
 * environment it keeps the last entries in memory (handy in a bug report) and,
 * if VITE_LOG_ENDPOINT is set, ships each entry with navigator.sendBeacon, which
 * still delivers while the page is unloading.
 *
 * In production this is where Sentry, Datadog RUM or similar would plug in;
 * the rest of the app only ever calls logError().
 */

export type LogEntry = {
  level: 'error' | 'warn';
  message: string;
  source: 'render' | 'window' | 'promise' | 'api' | 'manual';
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  url: string;
  at: string;
};

const MAX_ENTRIES = 50;
const entries: LogEntry[] = [];
type Listener = (entry: LogEntry) => void;
const listeners = new Set<Listener>();

function toMessage(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error)
    return { message: `${error.name}: ${error.message}`, stack: error.stack };
  if (typeof error === 'string') return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

export function logError(
  error: unknown,
  source: LogEntry['source'],
  extra: { componentStack?: string; context?: Record<string, unknown> } = {},
): LogEntry {
  const entry: LogEntry = {
    level: 'error',
    source,
    ...toMessage(error),
    ...(extra.componentStack ? { componentStack: extra.componentStack } : {}),
    ...(extra.context ? { context: extra.context } : {}),
    url: typeof window === 'undefined' ? '' : window.location.pathname + window.location.search,
    at: new Date().toISOString(),
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  listeners.forEach((listener) => listener(entry));

  console.error(`[bug-bazaar] ${source} error:`, entry.message, entry);

  const endpoint = import.meta.env.VITE_LOG_ENDPOINT;
  if (endpoint && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    navigator.sendBeacon(endpoint, JSON.stringify(entry));
  }
  return entry;
}

export function recentLogs(): readonly LogEntry[] {
  return entries;
}

export function onLog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let installed = false;

/** Catches errors that never reach a React error boundary. */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => logError(event.error ?? event.message, 'window'));
  window.addEventListener('unhandledrejection', (event) => logError(event.reason, 'promise'));
}
