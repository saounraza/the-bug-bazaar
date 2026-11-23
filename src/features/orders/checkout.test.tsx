import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RootState } from '../../app/store';
import { setChaos } from '../../mocks/chaos';
import { createSession, DEMO_USER, getProduct, setStock } from '../../mocks/db';
import { server } from '../../mocks/node';
import { renderApp } from '../../test/renderApp';
import { initialCartState, type CartLine } from '../cart/cartSlice';

/** Starts the app signed in, with the given products already in the cart. */
function renderCheckout(items: { id: string; quantity: number }[]) {
  const token = createSession(DEMO_USER.id);
  const lines: CartLine[] = items.map(({ id, quantity }) => {
    const product = getProduct(id)!;
    return { ...product, productId: product.id, quantity };
  });
  const state: Partial<RootState> = {
    session: { status: 'authenticated', token, user: DEMO_USER },
    cart: { ...initialCartState, lines },
  };
  return renderApp('/checkout', state);
}

function countOrderPosts() {
  const counter = { posts: 0 };
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/api/orders')) counter.posts++;
  });
  return counter;
}

describe('checkout', () => {
  it('places an order, empties the cart, shows a confirmation and decrements stock', async () => {
    setStock('p-0002', 10);
    const { user, store, router } = renderCheckout([{ id: 'p-0002', quantity: 3 }]);

    await user.click(await screen.findByRole('button', { name: 'Place order' }));

    expect(
      await screen.findByRole('heading', { name: 'Thanks for your order!' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/orders\/o-/);
    expect(store.getState().cart.lines).toHaveLength(0);
    expect(getProduct('p-0002')!.stock).toBe(7);
  });

  it('a 409 names the item that ran out and lowers its quantity limit', async () => {
    setStock('p-0002', 5);
    const { user, store } = renderCheckout([{ id: 'p-0002', quantity: 4 }]);
    setStock('p-0002', 1); // someone else bought most of them meanwhile

    await user.click(await screen.findByRole('button', { name: 'Place order' }));

    const name = getProduct('p-0002')!.name;
    expect(
      await screen.findByText(`${name} only has 1 left. Lower the quantity to continue.`),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review your cart' })).toBeInTheDocument();
    expect(store.getState().cart.lines[0]).toMatchObject({ quantity: 1, stock: 1 });
  });

  it('a retried checkout returns the same order instead of creating a second one', async () => {
    setStock('p-0002', 10);
    const counter = countOrderPosts();
    // The server saves the order, then the response is "lost" (500).
    setChaos({ failAfterCommit: true });
    const { user, router } = renderCheckout([{ id: 'p-0002', quantity: 2 }]);

    await user.click(await screen.findByRole('button', { name: 'Place order' }));
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(getProduct('p-0002')!.stock).toBe(8); // the first attempt did go through

    setChaos({ failAfterCommit: false });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'Thanks for your order!' }),
    ).toBeInTheDocument();
    expect(counter.posts).toBe(2);
    expect(getProduct('p-0002')!.stock).toBe(8); // still 8: the retry was not a second order
    expect(router.state.location.pathname).toMatch(/^\/orders\/o-/);
  });

  it('cart page: quantities are clamped to stock and the badge follows', async () => {
    setStock('p-0002', 3);
    const { user, store } = renderCheckout([{ id: 'p-0002', quantity: 1 }]);
    await screen.findByRole('button', { name: 'Place order' });

    await user.click(screen.getByRole('link', { name: /cart, 1 item/i }));
    const input = await screen.findByRole('spinbutton', { name: 'Quantity' });
    await user.clear(input);
    await user.type(input, '9');

    expect(store.getState().cart.lines[0]?.quantity).toBe(3);
    expect(screen.getByRole('link', { name: /cart, 3 items/i })).toBeInTheDocument();
  });
});
