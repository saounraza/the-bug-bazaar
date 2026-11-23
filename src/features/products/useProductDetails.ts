import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { productsApi } from './productsApi';

const { getProduct } = productsApi.endpoints;

/**
 * Loads one product for the details page and cleans up after itself:
 *  - Subscribes to the cache entry for `id` while the page shows it, so
 *    revisiting a product reuses cached data (D3-5).
 *  - When `id` changes or the page unmounts, unsubscribes and **aborts** the
 *    request if it is still in flight, so a slow response for the previous
 *    product never finishes in the background.
 *  - Reads with `currentData`, which only ever holds data for the current
 *    `id`. Even a late response for another id can't be shown.
 */
export function useProductDetails(id: string) {
  const dispatch = useAppDispatch();
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    activeId.current = id;
    const subscription = dispatch(getProduct.initiate(id));

    return () => {
      subscription.unsubscribe();
      if (activeId.current === id) activeId.current = null;
      // Abort on the next microtask, and only if no effect for the same id took
      // over. In development, StrictMode unmounts and remounts every effect
      // straight away; aborting then would cancel the request the remounted
      // effect is waiting on. A real product switch or unmount still aborts.
      queueMicrotask(() => {
        if (activeId.current !== id) subscription.abort();
      });
    };
  }, [dispatch, id]);

  const state = getProduct.useQueryState(id);

  const refetch = useCallback(() => {
    void dispatch(getProduct.initiate(id, { subscribe: false, forceRefetch: true }));
  }, [dispatch, id]);

  return { ...state, refetch };
}

/** "p-0042" -> "p-0043" for delta 1. Undefined below p-0001 or for a non-catalog id. */
export function adjacentProductId(id: string, delta: number): string | undefined {
  const match = /^p-(\d+)$/.exec(id);
  if (!match?.[1]) return undefined;
  const next = Number(match[1]) + delta;
  if (next < 1) return undefined;
  return `p-${String(next).padStart(match[1].length, '0')}`;
}
