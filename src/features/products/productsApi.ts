import { api } from '../../api/baseApi';
import type { Category, Product, ProductPage, SortOption } from '../../api/types';

export const PAGE_SIZE = 60;

/** Everything that selects a result set. One cache entry per distinct value. */
export type ProductFilters = {
  search: string;
  category: Category | null;
  sort: SortOption;
  inStock: boolean;
};

export const productsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.infiniteQuery<ProductPage, ProductFilters, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
          lastPageParam * PAGE_SIZE < lastPage.total ? lastPageParam + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/api/products',
        params: {
          search: queryArg.search.trim(),
          category: queryArg.category,
          sort: queryArg.sort === 'featured' ? undefined : queryArg.sort,
          inStock: queryArg.inStock,
          page: pageParam,
          pageSize: PAGE_SIZE,
        },
      }),
      providesTags: ['ProductList'],
    }),

    getProduct: build.query<Product, string>({
      query: (id) => ({ url: `/api/products/${encodeURIComponent(id)}` }),
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
  }),
});

export const { useGetProductsInfiniteQuery, useGetProductQuery } = productsApi;
