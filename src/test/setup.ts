import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { resetChaos } from '../mocks/chaos';
import { resetDb } from '../mocks/db';
import { server } from '../mocks/node';

// findBy* waits up to 3 s: the first render of the whole app can be slow when
// every test file runs in parallel.
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  localStorage.clear();
  resetChaos({ latencyMs: 0 });
  resetDb({ wipe: true });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  server.events.removeAllListeners();
});

afterAll(() => server.close());
