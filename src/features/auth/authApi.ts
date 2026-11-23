import { api } from '../../api/baseApi';
import type { LoginRequest, LoginResponse, User } from '../../api/types';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/api/login', method: 'POST', body }),
      // A new session must not see the previous user's cached account or orders.
      invalidatesTags: ['Me', 'Order'],
    }),
    getMe: build.query<User, void>({
      query: () => ({ url: '/api/me' }),
      providesTags: ['Me'],
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery } = authApi;
