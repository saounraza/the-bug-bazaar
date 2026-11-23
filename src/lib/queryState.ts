import type { SerializedError } from '@reduxjs/toolkit';
import { isAppError, type AppError } from '../api/errors';
import type { RequestState } from './requestState';

type QueryLike<T> = {
  currentData?: T;
  error?: AppError | SerializedError;
  isError: boolean;
  isFetching: boolean;
  isUninitialized: boolean;
};

/**
 * Collapses RTK Query's independent flags (isLoading, isFetching, isError,
 * data, currentData...) into exactly one RequestState. `currentData` is used
 * rather than `data` because `data` can hold the result of a *previous*
 * argument, which is how a list shows results for an old search.
 */
export function toRequestState<T>(query: QueryLike<T>): RequestState<T, AppError> {
  if (query.isUninitialized) return { status: 'idle' };
  if (query.isError && !query.isFetching) {
    const error = isAppError(query.error) ? query.error : { kind: 'server' as const, status: 0 };
    return { status: 'error', error };
  }
  if (query.currentData !== undefined) return { status: 'success', data: query.currentData };
  return { status: 'loading' };
}
