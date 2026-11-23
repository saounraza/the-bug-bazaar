import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import { stockUpdated } from '../cart/cartSlice';
import { productsApi } from './productsApi';

type State = Parameters<typeof productsApi.util.selectCachedArgsForQuery>[0];

/**
 * Applies one live stock change everywhere the product is cached: its details
 * entry, every cached list page that contains it, and the cart's quantity
 * limit. Patching the cache means no refetch, and every component reading
 * that data re-renders with the new stock.
 */
export const stockChanged =
  (productId: string, stock: number): ThunkAction<void, State, unknown, UnknownAction> =>
  (dispatch, getState) => {
    dispatch(
      productsApi.util.updateQueryData('getProduct', productId, (draft) => {
        draft.stock = stock;
      }),
    );
    for (const args of productsApi.util.selectCachedArgsForQuery(getState(), 'getProducts')) {
      dispatch(
        productsApi.util.updateQueryData('getProducts', args, (draft) => {
          for (const page of draft.pages) {
            const item = page.items.find((product) => product.id === productId);
            if (item) item.stock = stock;
          }
        }),
      );
    }
    dispatch(stockUpdated({ productId, stock }));
  };
