import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { CrashFallback, ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/logger';
import './index.css';

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return;
  // Loaded lazily so a build pointed at a real backend can tree-shake it away.
  const { startMockApi } = await import('./mocks/browser');
  await startMockApi();
}

installGlobalErrorHandlers();

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

void enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      {/* Last line of defence if the store or router itself fails to render. */}
      <ErrorBoundary fallback={() => <CrashFallback />}>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
});
