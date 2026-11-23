import type { ReactNode } from 'react';
import { describeError, type AppError } from '../api/errors';

type LoadingStateProps = { label: string; children: ReactNode };

/** Skeleton placeholder plus a polite announcement for screen readers. */
export function LoadingState({ label, children }: LoadingStateProps) {
  return (
    <div aria-busy="true">
      <p role="status" className="visually-hidden">
        {label}
      </p>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

type EmptyStateProps = { title: string; message: string; action?: ReactNode };

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="status" role="status">
      <p className="status__icon" aria-hidden="true">
        🔍
      </p>
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <div className="status__actions">{action}</div>}
    </div>
  );
}

type ErrorStateProps = { error: AppError; onRetry?: () => void };

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { title, message } = describeError(error);
  return (
    <div className="status status--error" role="alert">
      <p className="status__icon" aria-hidden="true">
        🐛
      </p>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <div className="status__actions">
          <button type="button" className="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}
