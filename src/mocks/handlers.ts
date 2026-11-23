import { delay, http, HttpResponse } from 'msw';
import {
  isCategory,
  isSortOption,
  type ApiError,
  type ApiErrorCode,
  type CreateOrderRequest,
  type LoginRequest,
  type OrderLine,
} from '../api/types';
import { getChaos, type EndpointKey } from './chaos';
import * as db from './db';
import { stockSocketHandler } from './stockSocket';

// `*` matches any origin, so the same handlers work in the browser, in Node
// tests, and with any VITE_API_BASE_URL.
const api = (path: string) => `*/api${path}`;

function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string>,
) {
  const body: ApiError = { error: { code, message, ...(details ? { details } : {}) } };
  return HttpResponse.json(body, { status });
}

const serverError = () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.');
const unauthorized = () => apiError(401, 'UNAUTHORIZED', 'Missing or expired session token.');
const notFound = (what: string) => apiError(404, 'NOT_FOUND', `${what} not found.`);

/** Waits for the configured latency, then returns a forced error if one is set. */
async function simulateNetwork(endpoint: EndpointKey, extraDelayMs = 0) {
  const chaos = getChaos();
  const total = chaos.latencyMs + extraDelayMs;
  if (total > 0) await delay(total);
  return chaos.forcedErrors[endpoint];
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function parseLines(body: unknown): OrderLine[] | null {
  if (typeof body !== 'object' || body === null || !('items' in body)) return null;
  const { items } = body as Partial<CreateOrderRequest>;
  if (!Array.isArray(items) || items.length === 0) return null;
  const valid = items.every(
    (line) =>
      typeof line?.productId === 'string' &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0 &&
      db.getProduct(line.productId) !== undefined,
  );
  return valid ? items : null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handlers = [
  http.get(api('/products'), async ({ request }) => {
    const chaos = getChaos();
    const forced = await simulateNetwork(
      'listProducts',
      chaos.raceySearch ? Math.floor(Math.random() * 2000) : 0,
    );
    if (forced) return serverError();

    const params = new URL(request.url).searchParams;
    const category = params.get('category');
    const sort = params.get('sort');
    const page = Number(params.get('page') ?? '1');
    const pageSize = Number(params.get('pageSize') ?? db.DEFAULT_PAGE_SIZE);

    return HttpResponse.json(
      db.queryProducts({
        search: params.get('search') ?? '',
        category: isCategory(category) ? category : undefined,
        sort: isSortOption(sort) ? sort : undefined,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : db.DEFAULT_PAGE_SIZE,
        inStock: params.get('inStock') === 'true',
      }),
    );
  }),

  http.get(api('/products/:id'), async ({ params }) => {
    const forced = await simulateNetwork('getProduct');
    if (forced === 500) return serverError();
    const product = forced === 404 ? undefined : db.getProduct(String(params.id));
    return product ? HttpResponse.json(product) : notFound('Product');
  }),

  http.post(api('/login'), async ({ request }) => {
    const forced = await simulateNetwork('login');
    if (forced === 500) return serverError();
    if (forced === 400) {
      return apiError(400, 'VALIDATION_FAILED', 'Invalid login request.', {
        email: 'invalid_email',
      });
    }
    if (forced === 401) {
      return apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const body = (await readJson(request)) as Partial<LoginRequest> | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const details: Record<string, string> = {};
    if (!email) details.email = 'required';
    else if (!EMAIL_PATTERN.test(email)) details.email = 'invalid_email';
    if (!password) details.password = 'required';
    if (Object.keys(details).length > 0) {
      return apiError(400, 'VALIDATION_FAILED', 'Invalid login request.', details);
    }

    if (email.toLowerCase() !== db.DEMO_USER.email || password !== db.DEMO_PASSWORD) {
      return apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    return HttpResponse.json({ token: db.createSession(db.DEMO_USER.id), user: db.DEMO_USER });
  }),

  http.get(api('/me'), async ({ request }) => {
    const forced = await simulateNetwork('me');
    if (forced === 500) return serverError();
    const user = forced === 401 ? undefined : db.userForToken(bearerToken(request));
    return user ? HttpResponse.json(user) : unauthorized();
  }),

  http.post(api('/orders'), async ({ request }) => {
    const forced = await simulateNetwork('createOrder');
    if (forced === 500) return serverError();

    const user = forced === 401 ? undefined : db.userForToken(bearerToken(request));
    if (!user) return unauthorized();

    const body = await readJson(request);
    const lines = forced === 400 ? null : parseLines(body);
    if (!lines) {
      return apiError(400, 'VALIDATION_FAILED', 'The order is invalid.', { items: 'invalid' });
    }

    if (forced === 409) {
      const first = lines[0];
      const product = first ? db.getProduct(first.productId) : undefined;
      if (product) {
        return apiError(409, 'OUT_OF_STOCK', `${product.name} is out of stock.`, {
          productId: product.id,
          productName: product.name,
          available: '0',
        });
      }
    }

    const result = db.placeOrder(user.id, lines, request.headers.get('Idempotency-Key'));

    if (result.kind === 'out-of-stock') {
      return apiError(409, 'OUT_OF_STOCK', `${result.product.name} is out of stock.`, {
        productId: result.product.id,
        productName: result.product.name,
        available: String(result.product.stock),
      });
    }

    // Simulates the order being saved but the response never reaching the client.
    // A retry with the same Idempotency-Key must return this order, not a new one.
    if (getChaos().failAfterCommit && result.kind === 'created') return serverError();

    return HttpResponse.json(result.order, {
      status: 201,
      headers: result.kind === 'replayed' ? { 'Idempotent-Replayed': 'true' } : {},
    });
  }),

  http.get(api('/orders/:id'), async ({ request, params }) => {
    const forced = await simulateNetwork('getOrder');
    if (forced === 500) return serverError();
    const user = forced === 401 ? undefined : db.userForToken(bearerToken(request));
    if (!user) return unauthorized();
    const order = forced === 404 ? undefined : db.getOrder(String(params.id), user.id);
    return order ? HttpResponse.json(order) : notFound('Order');
  }),

  stockSocketHandler,
];
