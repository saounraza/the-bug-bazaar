import { fromHttpResponse, type AppError } from './errors';

/**
 * The one place the app talks to the network. Every HTTP request, whether it
 * comes from RTK Query or anywhere else, goes through `request()`, which:
 *  - prefixes the base URL and serializes query params and JSON bodies,
 *  - attaches the session token,
 *  - turns every failure into a typed `AppError` (thrown as `RequestError`),
 *  - reports 401s on authenticated calls so the session can be cleared.
 * A lint rule (no-restricted-globals) forbids `fetch` anywhere else in src/.
 */

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export class RequestError extends Error {
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(`Request failed: ${appError.kind}`);
    this.name = 'RequestError';
    this.appError = appError;
  }
}

type ClientConfig = {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
};

const config: ClientConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  getToken: () => null,
  onUnauthorized: () => {},
};

/** Called once by the store so the client can read the token without importing the store. */
export function configureClient(patch: Partial<ClientConfig>): void {
  Object.assign(config, patch);
}

export function buildUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(`${config.baseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, headers = {}, signal } = options;
  const token = config.getToken();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    throw new RequestError(aborted ? { kind: 'aborted' } : { kind: 'network' });
  }

  const data = await readBody(response);

  if (!response.ok) {
    const appError = fromHttpResponse(response.status, data);
    // Only a request that carried a token can prove the session is dead.
    // A 401 from the login form just means "wrong password".
    if (appError.kind === 'unauthorized' && token) config.onUnauthorized();
    throw new RequestError(appError);
  }

  return data as T;
}
