// Builds the catalog data for the site: index.json, health.json and artifacts/*.json.
// Usage: node scripts/build-index.mjs [outDir]   (default: site/public/data)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './lib/catalog.mjs';

// The repository root is derived from this file, so the script works from any cwd.
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] ?? join(root, 'site/public/data'));
const { index, health, details } = buildCatalog({ root });

rmSync(join(out, 'artifacts'), { recursive: true, force: true });
mkdirSync(join(out, 'artifacts'), { recursive: true });
const write = (file, data) => writeFileSync(join(out, file), JSON.stringify(data) + '\n');
write('index.json', index);
write('health.json', health);
for (const [file, data] of Object.entries(details)) write(file, data);

console.log(`Indexed ${index.entries.length} artifacts -> ${out}/ (${health.summary.warnings} health warnings)`);
for (const f of health.findings) console.log(`  warning [${f.code}] ${f.message}`);
