import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, parseFilters, serializeFilters } from './useProductFilters';

describe('filter <-> URL mapping', () => {
  it('round-trips every filter through the URL', () => {
    const filters = {
      search: 'duck',
      category: 'ducks',
      sort: 'price-asc',
      inStock: true,
    } as const;
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });

  it('leaves defaults out, so the plain shop URL stays clean', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('falls back to defaults for hand-edited or malformed values', () => {
    const parsed = parseFilters(new URLSearchParams('category=laptops&sort=lol&inStock=yes'));
    expect(parsed).toEqual(DEFAULT_FILTERS);
  });
});
