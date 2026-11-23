import { describe, expect, it } from 'vitest';
import { describeError, fieldMessage, fromHttpResponse } from './errors';

const body = (code: string, message: string, details?: Record<string, string>) => ({
  error: { code, message, ...(details ? { details } : {}) },
});

describe('error normalization', () => {
  it('maps each status to one kind of AppError', () => {
    expect(fromHttpResponse(400, body('VALIDATION_FAILED', 'x', { email: 'required' }))).toEqual({
      kind: 'validation',
      fields: { email: 'required' },
    });
    expect(fromHttpResponse(401, body('INVALID_CREDENTIALS', 'x'))).toEqual({
      kind: 'invalid-credentials',
    });
    expect(fromHttpResponse(401, body('UNAUTHORIZED', 'x'))).toEqual({ kind: 'unauthorized' });
    expect(fromHttpResponse(404, body('NOT_FOUND', 'x'))).toEqual({ kind: 'not-found' });
    expect(
      fromHttpResponse(
        409,
        body('OUT_OF_STOCK', 'x', { productId: 'p-1', productName: 'Duck', available: '2' }),
      ),
    ).toEqual({ kind: 'out-of-stock', productId: 'p-1', productName: 'Duck', available: 2 });
    expect(fromHttpResponse(503, 'Service Unavailable')).toEqual({ kind: 'server', status: 503 });
  });

  it('never passes the raw server message through to the UI copy', () => {
    const raw = 'SQLSTATE[42P01]: relation "orders" does not exist';
    for (const status of [400, 401, 404, 409, 500]) {
      const { title, message } = describeError(fromHttpResponse(status, body('X', raw)));
      expect(`${title} ${message}`).not.toContain('SQLSTATE');
    }
  });

  it('translates field codes into our own words, with a safe fallback', () => {
    expect(fieldMessage('invalid_email')).toMatch(/valid email/);
    expect(fieldMessage('something_new')).toBe('This value is not valid.');
  });
});
