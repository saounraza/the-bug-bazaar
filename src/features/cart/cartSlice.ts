import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../api/types';
import { lineTotal } from '../../lib/money';
import { productsApi } from '../products/productsApi';

export type CartLine = {
  productId: string;
  name: string;
  /** Unit price in cents at the time it was added. */
  price: number;
  imageUrl: string;
  /** Last known stock. Quantities are clamped to it. */
  stock: number;
  quantity: number;
  /** Set when a stock change forced the quantity down, so the cart can explain why. */
  reducedFrom?: number;
};

export type CartState = {
  lines: CartLine[];
  /**
   * Idempotency key for the current checkout attempt. Created on the first
   * "Place order" click and reused by every retry of that attempt, so the
   * server can recognise a retry and return the order it already created.
   * Any change to the cart makes it a different order, so the key is cleared.
   */
  checkoutKey: string | null;
};

export const initialCartState: CartState = { lines: [], checkoutKey: null };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    itemAdded(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const { product, quantity = 1 } = action.payload;
      if (product.stock <= 0 || quantity <= 0) return;
      const line = state.lines.find((l) => l.productId === product.id);
      if (line) {
        line.stock = product.stock;
        line.quantity = clamp(line.quantity + quantity, 1, product.stock);
        delete line.reducedFrom;
      } else {
        state.lines.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          stock: product.stock,
          quantity: clamp(quantity, 1, product.stock),
        });
      }
      state.checkoutKey = null;
    },

    quantityChanged(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const line = state.lines.find((l) => l.productId === action.payload.productId);
      if (!line || !Number.isFinite(action.payload.quantity)) return;
      line.quantity = clamp(Math.trunc(action.payload.quantity), 1, Math.max(1, line.stock));
      delete line.reducedFrom;
      state.checkoutKey = null;
    },

    itemRemoved(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((l) => l.productId !== action.payload);
      state.checkoutKey = null;
    },

    /** Live stock changes and fresh product data keep cart limits honest. */
    stockUpdated(state, action: PayloadAction<{ productId: string; stock: number }>) {
      const line = state.lines.find((l) => l.productId === action.payload.productId);
      if (!line) return;
      line.stock = action.payload.stock;
      if (line.quantity > line.stock && line.stock > 0) {
        line.reducedFrom ??= line.quantity;
        line.quantity = line.stock;
        state.checkoutKey = null;
      }
    },

    checkoutKeyIssued: {
      reducer(state, action: PayloadAction<string>) {
        state.checkoutKey ??= action.payload;
      },
      // Randomness belongs in `prepare`, keeping the reducer pure and testable.
      prepare: () => ({ payload: crypto.randomUUID() }),
    },

    cartCleared() {
      return initialCartState;
    },
  },
  extraReducers: (builder) => {
    // Whenever fresh product data arrives, update the stock limit of that cart line.
    builder.addMatcher(productsApi.endpoints.getProduct.matchFulfilled, (state, action) => {
      cartSlice.caseReducers.stockUpdated(state, {
        type: stockUpdated.type,
        payload: { productId: action.payload.id, stock: action.payload.stock },
      });
    });
  },
});

export const {
  itemAdded,
  quantityChanged,
  itemRemoved,
  stockUpdated,
  checkoutKeyIssued,
  cartCleared,
} = cartSlice.actions;

// ---------------------------------------------------------------- selectors

type WithCart = { cart: CartState };

export const selectCartLines = (state: WithCart) => state.cart.lines;
export const selectCheckoutKey = (state: WithCart) => state.cart.checkoutKey;

/** Derived, memoized: recomputed only when `lines` changes. Drives the header badge. */
export const selectCartCount = createSelector([selectCartLines], (lines) =>
  lines.reduce((sum, line) => sum + line.quantity, 0),
);

/** Total in integer cents. */
export const selectCartTotal = createSelector([selectCartLines], (lines) =>
  lines.reduce((sum, line) => sum + lineTotal(line.price, line.quantity), 0),
);

export const selectQuantityInCart = (state: WithCart, productId: string) =>
  state.cart.lines.find((line) => line.productId === productId)?.quantity ?? 0;

export const selectHasUnavailableItems = createSelector([selectCartLines], (lines) =>
  lines.some((line) => line.stock <= 0 || line.quantity > line.stock),
);

export function isCartState(value: unknown): value is CartState {
  if (typeof value !== 'object' || value === null) return false;
  const { lines, checkoutKey } = value as Partial<CartState>;
  return (
    Array.isArray(lines) &&
    (checkoutKey === null || typeof checkoutKey === 'string') &&
    lines.every(
      (line) =>
        typeof line?.productId === 'string' &&
        typeof line.name === 'string' &&
        Number.isInteger(line.price) &&
        Number.isInteger(line.quantity) &&
        Number.isInteger(line.stock) &&
        typeof line.imageUrl === 'string',
    )
  );
}
