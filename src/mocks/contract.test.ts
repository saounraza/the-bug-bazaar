import { describe, expect, it } from 'vitest';
import type { ApiError, LoginResponse, Order, Product, ProductPage } from '../api/types';
import { setChaos, setForcedError } from './chaos';
import { DEMO_PASSWORD, DEMO_USER, setStock } from './db';
import { PRODUCT_COUNT } from './seed';

/**
 * Contract tests: every endpoint returns the documented shape and status code,
 * including every listed error (docs/api-contract.md).
 */

const url = (path: string) => new URL(path, window.location.origin).toString();

async function call<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(url(path), init);
  return { status: response.status, body: (await response.json()) as T };
}

const json = (body: unknown, token?: string): RequestInit => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});

async function login(): Promise<string> {
  const { body } = await call<LoginResponse>(
    '/api/login',
    json({ email: DEMO_USER.email, password: DEMO_PASSWORD }),
  );
  return body.token;
}

function expectApiError(body: unknown, code: string) {
  expect(body).toMatchObject({ error: { code, message: expect.any(String) } });
}

describe('GET /api/products', () => {
  it('returns a page of products and the total across 5,000 seeded items', async () => {
    const { status, body } = await call<ProductPage>('/api/products');
    expect(status).toBe(200);
    expect(body.total).toBe(PRODUCT_COUNT);
    expect(body.items).toHaveLength(24);
    expect(body.items[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      price: expect.any(Number),
      category: expect.stringMatching(/^(keyboards|ducks|coffee|stickers)$/),
      stock: expect.any(Number),
      rating: expect.any(Number),
      imageUrl: expect.any(String),
    });
  });

  it('filters by search, category and stock, and sorts', async () => {
    const { body } = await call<ProductPage>(
      '/api/products?search=duck&category=ducks&sort=price-asc&inStock=true&pageSize=100',
    );
    expect(body.total).toBeGreaterThan(0);
    for (const product of body.items) {
      expect(product.name.toLowerCase()).toContain('duck');
      expect(product.category).toBe('ducks');
      expect(product.stock).toBeGreaterThan(0);
    }
    const prices = body.items.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('returns 500 when forced', async () => {
    setForcedError('listProducts', 500);
    const { status, body } = await call<ApiError>('/api/products');
    expect(status).toBe(500);
    expectApiError(body, 'INTERNAL_ERROR');
  });
});

describe('GET /api/products/:id', () => {
  it('returns one product', async () => {
    const { status, body } = await call<Product>('/api/products/p-0001');
    expect(status).toBe(200);
    expect(body.id).toBe('p-0001');
  });

  it('returns 404 for an unknown id', async () => {
    const { status, body } = await call<ApiError>('/api/products/nope');
    expect(status).toBe(404);
    expectApiError(body, 'NOT_FOUND');
  });
});

describe('POST /api/login and GET /api/me', () => {
  it('returns a token and user, and /me accepts the token', async () => {
    const token = await login();
    const me = await call('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect(me.body).toEqual(DEMO_USER);
  });

  it('returns 400 with field details for missing fields', async () => {
    const { status, body } = await call<ApiError>('/api/login', json({ email: '' }));
    expect(status).toBe(400);
    expect(body.error.details).toEqual({ email: 'required', password: 'required' });
  });

  it('returns 401 for wrong credentials', async () => {
    const { status, body } = await call<ApiError>(
      '/api/login',
      json({ email: DEMO_USER.email, password: 'wrong' }),
    );
    expect(status).toBe(401);
    expectApiError(body, 'INVALID_CREDENTIALS');
  });

  it('/me returns 401 without a token', async () => {
    const { status } = await call('/api/me');
    expect(status).toBe(401);
  });
});

describe('POST /api/orders and GET /api/orders/:id', () => {
  it('creates a queued order (201) that can be fetched', async () => {
    const token = await login();
    const created = await call<Order>(
      '/api/orders',
      json({ items: [{ productId: 'p-0002', quantity: 1 }] }, token),
    );
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(String), status: 'queued' });

    const fetched = await call<Order>(`/api/orders/${created.body.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(created.body.id);
  });

  it('returns 400 for an empty order and 401 without a token', async () => {
    const token = await login();
    expect((await call('/api/orders', json({ items: [] }, token))).status).toBe(400);
    expect((await call('/api/orders', json({ items: [] }))).status).toBe(401);
  });

  it('returns 409 naming the product when stock is too low', async () => {
    const token = await login();
    setStock('p-0002', 1);
    const { status, body } = await call<ApiError>(
      '/api/orders',
      json({ items: [{ productId: 'p-0002', quantity: 2 }] }, token),
    );
    expect(status).toBe(409);
    expect(body.error.details).toMatchObject({ productId: 'p-0002', available: '1' });
  });

  it('replays the same order for a repeated Idempotency-Key', async () => {
    const token = await login();
    const request = () =>
      fetch(url('/api/orders'), {
        ...json({ items: [{ productId: 'p-0002', quantity: 1 }] }, token),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': 'checkout-123',
        },
      }).then((r) => r.json() as Promise<Order>);

    const first = await request();
    const second = await request();
    expect(second.id).toBe(first.id);
  });

  it('returns 404 for an unknown order and 401 without a token', async () => {
    const token = await login();
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    expect((await call('/api/orders/o-missing', auth)).status).toBe(404);
    expect((await call('/api/orders/o-missing')).status).toBe(401);
  });

  it('every listed error can be forced from the chaos settings', async () => {
    const token = await login();
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    setChaos({
      forcedErrors: { getProduct: 404, me: 401, createOrder: 409, getOrder: 404, login: 400 },
    });
    expect((await call('/api/products/p-0001')).status).toBe(404);
    expect((await call('/api/me', auth)).status).toBe(401);
    expect((await call('/api/orders/any', auth)).status).toBe(404);
    expect((await call('/api/login', json({}))).status).toBe(400);
    expect(
      (await call('/api/orders', json({ items: [{ productId: 'p-0002', quantity: 1 }] }, token)))
        .status,
    ).toBe(409);
  });
});
