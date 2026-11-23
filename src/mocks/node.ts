import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Same handlers as the browser, used by Vitest. */
export const server = setupServer(...handlers);
