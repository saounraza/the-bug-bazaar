import { api } from '../../api/baseApi';
import type { Order, OrderLine } from '../../api/types';

export type CreateOrderArgs = { items: OrderLine[]; idempotencyKey: string };

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    createOrder: build.mutation<Order, CreateOrderArgs>({
      query: ({ items, idempotencyKey }) => ({
        url: '/api/orders',
        method: 'POST',
        body: { items },
        // Same key on every retry of one checkout: the server returns the
        // existing order instead of creating (and charging) a second one.
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      // Stock changed on the server, so cached stock for these products is now
      // stale. Refetch them (and any list showing them) after an order or a 409.
      invalidatesTags: (result, error, { items }) => {
        if (result) {
          return [
            'ProductList',
            ...items.map((item) => ({ type: 'Product' as const, id: item.productId })),
          ];
        }
        if (error?.kind === 'out-of-stock') {
          return ['ProductList', { type: 'Product' as const, id: error.productId }];
        }
        return [];
      },
    }),

    getOrder: build.query<Order, string>({
      query: (id) => ({ url: `/api/orders/${encodeURIComponent(id)}` }),
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
  }),
});

export const { useCreateOrderMutation, useGetOrderQuery } = ordersApi;
