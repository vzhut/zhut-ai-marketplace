// GitHub Pages serves 404.html for unknown paths. Using the app shell as 404.html makes deep links
// (e.g. /skills/plugin/name) load the SPA, which then renders the right page client-side.
// Usage: node scripts/copy-404.mjs [distDir]
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'site/dist';
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
console.log(`Wrote ${dist}/404.html`);
