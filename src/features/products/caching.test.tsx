import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession, DEMO_USER, getProduct, setStock } from '../../mocks/db';
import { server } from '../../mocks/node';
import { renderApp } from '../../test/renderApp';

function countRequests(match: (url: URL, method: string) => boolean) {
  const counter = { count: 0 };
  server.events.on('request:start', ({ request }) => {
    if (match(new URL(request.url), request.method)) counter.count++;
  });
  return counter;
}

describe('caching', () => {
  it('revisiting a product page reuses cached data instead of refetching', async () => {
    const productRequests = countRequests((url) => url.pathname === '/api/products/p-0005');
    const { router } = renderApp('/products/p-0005');
    const name = getProduct('p-0005')!.name;
    await screen.findByRole('heading', { level: 1, name });

    await act(() => router.navigate('/cart'));
    await screen.findByRole('heading', { name: 'Your cart' });
    await act(() => router.navigate('/products/p-0005'));

    // Rendered straight from the cache, with no loading state in between.
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
    expect(productRequests.count).toBe(1);
  });

  it('going Back to a search reuses its cached results', async () => {
    const listRequests = countRequests((url) => url.pathname === '/api/products');
    const { router } = renderApp('/?category=ducks');
    await screen.findByText('1,250 results');
    const afterFirst = listRequests.count;

    await act(() => router.navigate('/?category=coffee'));
    await waitFor(() => expect(listRequests.count).toBe(afterFirst + 1));
    await screen.findByText('1,250 results');
    await act(() => router.navigate(-1));

    expect(await screen.findByText('1,250 results')).toBeInTheDocument();
    // Only the coffee request was added; ducks came from the cache.
    expect(listRequests.count).toBe(afterFirst + 1);
  });

  it('placing an order refreshes the stock of the products in it', async () => {
    setStock('p-0006', 10);
    const token = createSession(DEMO_USER.id);
    const { user, router } = renderApp('/products/p-0006', {
      session: { status: 'authenticated', token, user: DEMO_USER },
    });
    expect(await screen.findByText('10 in stock')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    await act(() => router.navigate('/checkout'));
    await user.click(await screen.findByRole('button', { name: 'Place order' }));
    await screen.findByRole('heading', { name: 'Thanks for your order!' });

    await act(() => router.navigate('/products/p-0006'));
    expect(await screen.findByText('9 in stock')).toBeInTheDocument();
  });
});
