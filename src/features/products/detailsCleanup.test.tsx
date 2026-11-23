import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setChaos } from '../../mocks/chaos';
import { getProduct } from '../../mocks/db';
import { server } from '../../mocks/node';
import { renderApp } from '../../test/renderApp';

describe('details page effects and cleanup', () => {
  it('switching products quickly never shows the wrong product', async () => {
    setChaos({ latencyMs: 150 });
    const { router } = renderApp('/products/p-0001');
    // Leave before p-0001 has loaded, then leave p-0002 too.
    await act(() => router.navigate('/products/p-0002'));
    await act(() => router.navigate('/products/p-0003'));

    const expected = getProduct('p-0003')!.name;
    expect(await screen.findByRole('heading', { level: 1, name: expected })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400)); // let any stale response land
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(expected);
    expect(screen.queryByText(getProduct('p-0001')!.name)).not.toBeInTheDocument();
  });

  it('aborts the in-flight request for the product the user left', async () => {
    setChaos({ latencyMs: 200 });
    const aborted: string[] = [];
    const onStart = ({ request }: { request: Request }) => {
      request.signal.addEventListener('abort', () => aborted.push(new URL(request.url).pathname));
    };
    server.events.on('request:start', onStart);

    const { router } = renderApp('/products/p-0010');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await act(() => router.navigate('/products/p-0011'));
    await screen.findByRole('heading', { level: 1, name: getProduct('p-0011')!.name });

    server.events.removeListener('request:start', onStart);
    expect(aborted).toContain('/api/products/p-0010');
  });

  it('removes the Back to Top scroll listener when the page closes', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { router } = renderApp('/products/p-0001');
    await screen.findByRole('heading', { level: 1 });

    await act(() => router.navigate('/cart'));
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything());
  });

  it('shows Back to Top after scrolling down', async () => {
    renderApp('/products/p-0001');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
    await act(async () => {
      Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
});
