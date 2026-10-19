// Builds site/index.json from .claude-plugin/marketplace.json (no dependencies).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const marketplace = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8'));

const plugins = marketplace.plugins.map((p) => {
  if (typeof p.source === 'string' && !existsSync(p.source)) {
    throw new Error(`Plugin "${p.name}": source directory ${p.source} does not exist`);
  }
  return {
    name: p.name,
    description: p.description ?? '',
    category: p.category ?? '',
    install: `claude plugin install ${p.name}@${marketplace.name}`,
  };
});

mkdirSync('site', { recursive: true });
writeFileSync(
  'site/index.json',
  JSON.stringify({ name: marketplace.name, description: marketplace.description, plugins }, null, 2) + '\n',
);
console.log(`Indexed ${plugins.length} plugins -> site/index.json`);
