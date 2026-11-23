import { afterEach, describe, expect, it, vi } from 'vitest';
import { setForcedError } from '../mocks/chaos';
import { configureClient, request, RequestError } from './client';
import type { AppError } from './errors';

async function errorOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RequestError) return error.appError;
  }
  throw new Error('Expected the request to fail');
}

afterEach(() => configureClient({ getToken: () => null, onUnauthorized: () => {} }));

describe('HTTP client', () => {
  it('serializes params and returns parsed JSON', async () => {
    const page = await request<{ total: number }>('/api/products', {
      params: { category: 'ducks', search: '', inStock: false },
    });
    expect(page.total).toBe(1250);
  });

  it('turns an error response into a typed AppError', async () => {
    expect(await errorOf(request('/api/products/missing'))).toEqual({ kind: 'not-found' });
    setForcedError('listProducts', 500);
    expect(await errorOf(request('/api/products'))).toEqual({ kind: 'server', status: 500 });
  });

  it('reports a 401 on an authenticated call, but not a failed login', async () => {
    const onUnauthorized = vi.fn<() => void>();
    configureClient({ getToken: () => 'stale-token', onUnauthorized });
    expect(await errorOf(request('/api/me'))).toEqual({ kind: 'unauthorized' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    configureClient({ getToken: () => null });
    const loginError = await errorOf(
      request('/api/login', {
        method: 'POST',
        body: { email: 'demo@bugbazaar.dev', password: 'x' },
      }),
    );
    expect(loginError).toEqual({ kind: 'invalid-credentials' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
