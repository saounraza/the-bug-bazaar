/**
 * A request is in exactly one of these states. Because it is a discriminated
 * union, "loading with an error" or "success without data" cannot be written:
 * `data` only exists when status is 'success', `error` only when it is 'error'.
 */
export type RequestState<T, E> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

export const idle = { status: 'idle' } as const;
export const loading = { status: 'loading' } as const;
export const success = <T>(data: T) => ({ status: 'success', data }) as const;
export const failure = <E>(error: E) => ({ status: 'error', error }) as const;
