import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { request, RequestError, type RequestOptions } from './client';
import type { AppError } from './errors';

export type ApiRequest = RequestOptions & { url: string };

/**
 * Adapter between RTK Query and our HTTP client. RTK Query handles caching,
 * de-duplication and loading flags; `request()` still does the actual call,
 * so there is exactly one network path.
 */
const clientBaseQuery: BaseQueryFn<ApiRequest, unknown, AppError> = async (
  { url, ...options },
  { signal },
) => {
  try {
    return { data: await request(url, { ...options, signal }) };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.appError };
    throw error;
  }
};

/**
 * Feature folders add their endpoints with `api.injectEndpoints`, so each
 * feature owns its queries while sharing one cache and one middleware.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: clientBaseQuery,
  tagTypes: ['Product', 'ProductList', 'Me', 'Order'],
  // Coming back online refetches whatever is on screen (needs setupListeners in the store).
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
