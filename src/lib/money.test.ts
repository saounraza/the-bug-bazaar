import { describe, expect, it } from 'vitest';
import { formatPrice, lineTotal } from './money';

describe('formatPrice', () => {
  it('formats integer cents as dollars', () => {
    expect(formatPrice(2499)).toBe('$24.99');
    expect(formatPrice(5)).toBe('$0.05');
    expect(formatPrice(123456)).toBe('$1,234.56');
  });

  it('keeps totals exact where float dollars would drift', () => {
    // 0.1 + 0.2 !== 0.3 in floats; in cents, 10 + 20 === 30.
    expect(formatPrice(lineTotal(10, 3) + 20)).toBe('$0.50');
  });

  it('rejects non-integer input instead of silently rounding', () => {
    expect(() => formatPrice(24.99)).toThrow('Price must be integer cents');
  });
});
