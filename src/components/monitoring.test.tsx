import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockControlEvents } from '../features/devtools/mockControlEvents';
import { recentLogs } from '../lib/logger';
import { setForcedError } from '../mocks/chaos';
import { renderApp } from '../test/renderApp';

describe('monitoring', () => {
  it('a thrown render error shows a fallback, is logged, and the app keeps working', async () => {
    // React also reports caught errors to console.error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { router } = renderApp('/products/p-0001');
    await screen.findByRole('heading', { level: 1 });

    act(() => mockControlEvents.emit('throw-render-error'));

    expect(
      await screen.findByRole('heading', { name: 'Something broke on this page' }),
    ).toBeInTheDocument();
    const entry = recentLogs().at(-1);
    expect(entry).toMatchObject({
      source: 'render',
      message: 'Error: Test crash from Mock controls',
    });
    expect(entry?.componentStack).toBeTruthy();

    // The header (and cart) still work, and navigating away clears the crash.
    expect(screen.getByRole('link', { name: /cart, 0 items/i })).toBeInTheDocument();
    await act(() => router.navigate('/cart'));
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
  });

  it('logs server errors from the API, but not expected ones like a 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = recentLogs().length;
    renderApp('/products/does-not-exist');
    await screen.findByRole('heading', { name: /couldn.t find that product/i });
    expect(recentLogs()).toHaveLength(before);

    setForcedError('listProducts', 500);
    renderApp('/');
    await screen.findAllByRole('alert');
    expect(recentLogs().at(-1)).toMatchObject({
      source: 'api',
      context: { endpoint: 'getProducts', kind: 'server', status: 500 },
    });
  });
});
