// Runs Lighthouse's accessibility audit on the home, cart and login pages.
// Start the production build first:  npm run build && npm run preview
// Then:                               npm run a11y   (or pass a base URL)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173';
const pages = { home: '/', cart: '/cart', login: '/login' };
const out = mkdtempSync(join(tmpdir(), 'lighthouse-'));
let failed = false;

for (const [name, path] of Object.entries(pages)) {
  const file = join(out, `${name}.json`);
  execFileSync(
    process.execPath,
    [
      'node_modules/lighthouse/cli/index.js',
      base + path,
      '--only-categories=accessibility',
      '--chrome-flags=--headless=new',
      '--output=json',
      `--output-path=${file}`,
      '--quiet',
    ],
    { stdio: 'inherit' },
  );
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const score = Math.round(report.categories.accessibility.score * 100);
  const issues = Object.values(report.audits)
    .filter((audit) => audit.scoreDisplayMode === 'binary' && audit.score === 0)
    .map((audit) => audit.id);
  console.info(
    `${name.padEnd(6)} ${score}${issues.length ? `  (failing: ${issues.join(', ')})` : ''}`,
  );
  if (score < 90) failed = true;
}

process.exit(failed ? 1 : 0);
