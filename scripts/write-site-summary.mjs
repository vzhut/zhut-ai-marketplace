// Prints a Markdown summary of the built catalog (for the GitHub Actions job summary).
// Usage: node scripts/write-site-summary.mjs [distDir] >> "$GITHUB_STEP_SUMMARY"
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'site/dist';
const index = JSON.parse(readFileSync(join(dist, 'data/index.json'), 'utf8'));
const health = JSON.parse(readFileSync(join(dist, 'data/health.json'), 'utf8'));

const count = (kind) => index.entries.filter((e) => e.kind === kind).length;
const rows = index.kinds.map((k) => `| ${k} | ${count(k)} |`).join('\n');
const plugins = index.entries.filter((e) => e.kind === 'plugin').map((e) => `\`${e.name}\``).join(', ') || '_none_';

const lines = [
  '## Site build',
  '',
  `Indexed **${index.entries.length}** artifacts from \`${index.marketplace.name}\`.`,
  '',
  '| Type | Count |',
  '|---|---|',
  rows,
  '',
  `Plugins: ${plugins}`,
  '',
  `### Catalog health: ${health.summary.warnings} warning${health.summary.warnings === 1 ? '' : 's'}`,
  '',
  ...health.findings.slice(0, 50).map((f) => `- \`${f.code}\` ${f.message}`),
];
console.log(lines.join('\n'));
