import { describe, expect, it } from 'vitest';
import type { Product } from '../../api/types';
import { loadPersistedState } from '../../app/persistence';
import { makeStore } from '../../app/store';
import {
  checkoutKeyIssued,
  itemAdded,
  itemRemoved,
  quantityChanged,
  selectCartCount,
  selectCartTotal,
  stockUpdated,
} from './cartSlice';

const duck: Product = {
  id: 'p-1',
  name: 'Pirate Duck',
  price: 1299,
  category: 'ducks',
  stock: 3,
  rating: 4.5,
  imageUrl: '/images/ducks-1.svg',
};
const coffee: Product = { ...duck, id: 'p-2', name: 'Cold Brew', price: 1850, stock: 10 };

describe('cart logic', () => {
  it('derives item count and total (in cents) from the lines', () => {
    const store = makeStore();
    store.dispatch(itemAdded({ product: duck, quantity: 2 }));
    store.dispatch(itemAdded({ product: coffee }));
    expect(selectCartCount(store.getState())).toBe(3);
    expect(selectCartTotal(store.getState())).toBe(2 * 1299 + 1850);
  });

  it('never lets a quantity exceed stock, whether adding or editing', () => {
    const store = makeStore();
    store.dispatch(itemAdded({ product: duck, quantity: 2 }));
    store.dispatch(itemAdded({ product: duck, quantity: 5 }));
    expect(store.getState().cart.lines[0]?.quantity).toBe(3);

    store.dispatch(quantityChanged({ productId: 'p-1', quantity: 99 }));
    expect(store.getState().cart.lines[0]?.quantity).toBe(3);
    store.dispatch(quantityChanged({ productId: 'p-1', quantity: 0 }));
    expect(store.getState().cart.lines[0]?.quantity).toBe(1);
  });

  it('ignores out-of-stock products and removes lines', () => {
    const store = makeStore();
    store.dispatch(itemAdded({ product: { ...duck, stock: 0 } }));
    expect(store.getState().cart.lines).toHaveLength(0);
    store.dispatch(itemAdded({ product: coffee }));
    store.dispatch(itemRemoved('p-2'));
    expect(selectCartCount(store.getState())).toBe(0);
  });

  it('lowers a quantity when stock drops and remembers why', () => {
    const store = makeStore();
    store.dispatch(itemAdded({ product: coffee, quantity: 6 }));
    store.dispatch(stockUpdated({ productId: 'p-2', stock: 4 }));
    expect(store.getState().cart.lines[0]).toMatchObject({ quantity: 4, reducedFrom: 6 });
  });

  it('keeps one checkout key across retries, and a cart change starts a new one', () => {
    const store = makeStore();
    store.dispatch(itemAdded({ product: coffee }));
    store.dispatch(checkoutKeyIssued());
    const key = store.getState().cart.checkoutKey;
    store.dispatch(checkoutKeyIssued()); // a retry
    expect(store.getState().cart.checkoutKey).toBe(key);

    store.dispatch(quantityChanged({ productId: 'p-2', quantity: 2 }));
    expect(store.getState().cart.checkoutKey).toBeNull();
  });

  it('survives a reload through localStorage, and rejects corrupted data', () => {
    const store = makeStore();
    store.dispatch(itemAdded({ product: duck, quantity: 2 }));

    const reloaded = makeStore(loadPersistedState());
    expect(selectCartCount(reloaded.getState())).toBe(2);

    localStorage.setItem('bb-cart', '{"lines":[{"productId":42}]}');
    expect(loadPersistedState().cart).toBeUndefined();
  });
});
