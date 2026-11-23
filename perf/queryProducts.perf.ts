import { expect, test } from 'vitest';
import { queryProducts } from '../src/mocks/db';
import type { ProductQuery } from '../src/api/types';

/**
 * Cost of answering GET /api/products. In the browser, MSW handlers run on the
 * page's main thread, so this time blocks rendering and input on every request.
 * Run with: npm run perf
 */
const cases: [string, ProductQuery][] = [
  ['default list (featured)', { page: 1, pageSize: 60 }],
  ['search "duck"', { search: 'duck', page: 1, pageSize: 60 }],
  ['sort by name A-Z', { sort: 'name-asc', page: 1, pageSize: 60 }],
  [
    'search + category + price sort',
    { search: 'pro', category: 'keyboards', sort: 'price-desc', page: 2, pageSize: 60 },
  ],
];

function measure(query: ProductQuery, runs = 200): { median: number; p95: number } {
  for (let i = 0; i < 20; i++) queryProducts(query); // warm up the JIT
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    queryProducts(query);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const at = (q: number) => Number((times[Math.floor(times.length * q)] ?? 0).toFixed(3));
  return { median: at(0.5), p95: at(0.95) };
}

test('GET /api/products handler timings', () => {
  const rows = cases.map(([name, query]) => ({ case: name, ...measure(query) }));
  console.info('\nqueryProducts (ms per request)');
  console.table(rows);
  expect(rows).toHaveLength(cases.length);
});
