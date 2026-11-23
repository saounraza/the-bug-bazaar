import { defineConfig } from 'vitest/config';

/** Timing harness for docs/performance.md. Not part of `npm test`. */
export default defineConfig({
  test: { include: ['perf/**/*.perf.ts'], environment: 'node', testTimeout: 120_000 },
});
