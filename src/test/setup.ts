import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { resetChaos } from '../mocks/chaos';
import { resetDb } from '../mocks/db';
import { server } from '../mocks/node';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  localStorage.clear();
  resetChaos({ latencyMs: 0 });
  resetDb({ wipe: true });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
