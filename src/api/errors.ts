import { isApiError, type ApiError } from './types';

/**
 * Every failure the app can meet, normalized into one serializable union.
 * The UI switches on `kind` and writes its own copy, so the server's raw
 * `error.message` is never rendered.
 */
export type AppError =
  /** 400: `fields` maps an input name to a machine code such as "required". */
  | { kind: 'validation'; fields: Record<string, string> }
  /** 401 from POST /api/login: wrong email or password. */
  | { kind: 'invalid-credentials' }
  /** 401 anywhere else: the session is missing or expired. */
  | { kind: 'unauthorized' }
  | { kind: 'not-found' }
  | { kind: 'out-of-stock'; productId: string; productName: string; available: number }
  | { kind: 'server'; status: number }
  | { kind: 'network' }
  | { kind: 'aborted' };

export function fromHttpResponse(status: number, body: unknown): AppError {
  const apiError: ApiError['error'] | undefined = isApiError(body) ? body.error : undefined;
  const details = apiError?.details ?? {};

  switch (status) {
    case 400:
      return { kind: 'validation', fields: details };
    case 401:
      return apiError?.code === 'INVALID_CREDENTIALS'
        ? { kind: 'invalid-credentials' }
        : { kind: 'unauthorized' };
    case 404:
      return { kind: 'not-found' };
    case 409:
      return {
        kind: 'out-of-stock',
        productId: details.productId ?? '',
        productName: details.productName ?? '',
        available: Number(details.available ?? 0) || 0,
      };
    default:
      return { kind: 'server', status };
  }
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof (value as { kind: unknown }).kind === 'string'
  );
}

/** Field error codes from the API, translated into our own words. */
const FIELD_MESSAGES: Record<string, string> = {
  required: 'This field is required.',
  invalid_email: 'Enter a valid email address, like name@example.com.',
  invalid: 'This value is not valid.',
};

export function fieldMessage(code: string): string {
  return FIELD_MESSAGES[code] ?? FIELD_MESSAGES.invalid ?? 'This value is not valid.';
}

/** A short, human message for any error. The single place UI copy for errors lives. */
export function describeError(error: AppError): { title: string; message: string } {
  switch (error.kind) {
    case 'validation':
      return { title: 'Check the form', message: 'Some fields need your attention.' };
    case 'invalid-credentials':
      return { title: 'Could not sign in', message: 'That email and password do not match.' };
    case 'unauthorized':
      return { title: 'Session expired', message: 'Please sign in again to continue.' };
    case 'not-found':
      return { title: 'Not found', message: 'We could not find what you were looking for.' };
    case 'out-of-stock': {
      const name = error.productName || 'An item in your cart';
      return {
        title: 'Item out of stock',
        message:
          error.available > 0
            ? `${name} only has ${error.available} left. Lower the quantity to continue.`
            : `${name} just sold out. Remove it from your cart to continue.`,
      };
    }
    case 'network':
      return {
        title: 'You seem to be offline',
        message: 'Check your connection, then try again.',
      };
    case 'aborted':
      return { title: 'Request cancelled', message: 'The request was cancelled.' };
    case 'server':
      return {
        title: 'Something went wrong',
        message: 'Our server had a problem. It is usually temporary, so please try again.',
      };
  }
}
