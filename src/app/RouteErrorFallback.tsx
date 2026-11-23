import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { CrashFallback } from '../components/ErrorBoundary';
import { logError } from '../lib/logger';

export function RouteErrorFallback() {
  const error = useRouteError();
  useEffect(() => {
    logError(error, 'render', { context: { boundary: 'route' } });
  }, [error]);
  return (
    <main className="main">
      <CrashFallback />
    </main>
  );
}
