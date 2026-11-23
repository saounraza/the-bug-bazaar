import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '../lib/logger';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** When this value changes (e.g. the route), a crashed boundary resets itself. */
  resetKey?: unknown;
  fallback?: (reset: () => void) => ReactNode;
};

type ErrorBoundaryState = { error: Error | null; resetKey: unknown };

/**
 * Catches errors thrown while rendering its children, logs them, and shows a
 * fallback instead of a blank page. Class component because React only offers
 * error boundaries through getDerivedStateFromError/componentDidCatch.
 * (Errors in event handlers and async code are caught by the global handlers
 * in lib/logger.ts instead.)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    // Navigating away from a crashed page clears the error.
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logError(error, 'render', { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ error: null });

  override render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return <CrashFallback onReset={this.reset} />;
  }
}

export function CrashFallback({ onReset }: { onReset?: () => void }) {
  return (
    <section className="status status--error status--centered" role="alert">
      <p className="status__icon" aria-hidden="true">
        🪲
      </p>
      <h1 tabIndex={-1}>Something broke on this page</h1>
      <p>
        We have logged the problem. Your cart is safe. You can try again, or go back to the shop.
      </p>
      <div className="status__actions">
        {onReset && (
          <button type="button" className="button" onClick={onReset}>
            Try again
          </button>
        )}
        <a className="button button--secondary" href="/">
          Back to the shop
        </a>
      </div>
    </section>
  );
}
