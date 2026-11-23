/**
 * A request is in exactly one of these states. Because it is a discriminated
 * union, "loading with an error" or "success without data" cannot be written:
 * `data` only exists when status is 'success', `error` only when it is 'error'.
 * RTK Query results are converted into it by `toRequestState()`.
 */
export type RequestState<T, E> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };
