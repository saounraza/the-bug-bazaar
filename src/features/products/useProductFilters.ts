import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { isCategory, isSortOption } from '../../api/types';
import type { ProductFilters } from './productsApi';

export const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  category: null,
  sort: 'featured',
  inStock: false,
};

/** URL -> filters. Anything unknown or malformed falls back to the default. */
export function parseFilters(params: URLSearchParams): ProductFilters {
  const category = params.get('category');
  const sort = params.get('sort');
  return {
    search: params.get('q') ?? '',
    category: isCategory(category) ? category : null,
    sort: isSortOption(sort) ? sort : 'featured',
    inStock: params.get('inStock') === '1',
  };
}

/** Filters -> URL. Defaults are left out, so the plain shop URL stays "/". */
export function serializeFilters(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  if (filters.inStock) params.set('inStock', '1');
  return params;
}

type UpdateOptions = { replace?: boolean };

/**
 * The URL is the single source of truth for the product filters. That gives
 * refresh, shareable links and the Back button for free: there is no copy of
 * the filters in React or Redux state that could disagree with the address bar.
 */
export function useProductFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const updateFilters = useCallback(
    (patch: Partial<ProductFilters>, { replace = false }: UpdateOptions = {}) => {
      setParams((current) => serializeFilters({ ...parseFilters(current), ...patch }), {
        replace,
      });
    },
    [setParams],
  );

  const clearFilters = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  const isFiltered =
    filters.search !== '' ||
    filters.category !== null ||
    filters.sort !== 'featured' ||
    filters.inStock;

  return { filters, updateFilters, clearFilters, isFiltered };
}
