import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function startMockApi(): Promise<void> {
  await worker.start({
    quiet: true,
    // Images, fonts and Vite's own requests are not part of the API.
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
