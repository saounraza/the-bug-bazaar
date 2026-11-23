import type { ReactNode } from 'react';
import type { AppError } from '../api/errors';
import type { RequestState } from '../lib/requestState';
import { ErrorState, LoadingState } from './StatusViews';

type AsyncViewProps<T> = {
  state: RequestState<T, AppError>;
  /** Text announced to screen readers while loading. */
  loadingLabel: string;
  /** Skeleton shown while loading. */
  skeleton: ReactNode;
  onRetry: () => void;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  /** Rendered instead of the error box for a 404. */
  notFound?: ReactNode;
  children: (data: T) => ReactNode;
};

/**
 * The one way pages render a request: loading, empty, error (with retry) or
 * success. Because it switches on the RequestState union, every page handles
 * every state, and they all look the same.
 */
export function AsyncView<T>({
  state,
  loadingLabel,
  skeleton,
  onRetry,
  isEmpty,
  empty,
  notFound,
  children,
}: AsyncViewProps<T>) {
  switch (state.status) {
    case 'idle':
    case 'loading':
      return <LoadingState label={loadingLabel}>{skeleton}</LoadingState>;
    case 'error':
      if (state.error.kind === 'not-found' && notFound) return <>{notFound}</>;
      return <ErrorState error={state.error} onRetry={onRetry} />;
    case 'success':
      if (isEmpty?.(state.data) && empty) return <>{empty}</>;
      return <>{children(state.data)}</>;
  }
}
