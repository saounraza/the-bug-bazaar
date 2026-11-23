import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { isAppError } from '../api/errors';
import { logError } from '../lib/logger';

/**
 * Logs failed API calls that point to a real problem (5xx, network down).
 * Expected outcomes (400 validation, 401, 404, 409) are normal app flow and
 * are handled in the UI, so they are not logged as errors.
 */
export const apiErrorLogger: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action) && isAppError(action.payload)) {
    const error = action.payload;
    if (error.kind === 'server' || error.kind === 'network') {
      const meta = action.meta as { arg?: { endpointName?: string } } | undefined;
      logError(new Error(`API ${error.kind} error`), 'api', {
        context: { endpoint: meta?.arg?.endpointName, ...error },
      });
    }
  }
  return next(action);
};
