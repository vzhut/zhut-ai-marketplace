// Fails when the initial JS of the built site exceeds the budget (gzipped).
// Usage: node scripts/check-bundle-size.mjs [distDir] [budgetKB]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'site/dist';
const budgetKb = Number(process.argv[3] ?? 150);
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
if (files.length === 0) throw new Error(`No script found in ${dist}/index.html`);

let total = 0;
for (const f of files) {
  const size = gzipSync(readFileSync(join(dist, f))).length;
  total += size;
  console.log(`${f}: ${(size / 1024).toFixed(1)} KB gzip`);
}
console.log(`Initial JS: ${(total / 1024).toFixed(1)} KB gzip (budget ${budgetKb} KB)`);
if (total > budgetKb * 1024) {
  console.error('Initial JS exceeds the budget');
  process.exit(1);
}
