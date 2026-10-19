// Fails on absolute paths and common secret patterns in marketplace content (no dependencies).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['.claude-plugin', 'plugins'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
const MAX_BYTES = 1_000_000;

const RULES = [
  ['absolute path', /(?:\/Users\/[^\s"'`/]+|\/home\/[^\s"'`/]+|[A-Za-z]:\\Users\\[^\s"'`\\]+)/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['API key (sk-)', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
];

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (stat.size <= MAX_BYTES) scan(path);
  }
}

function scan(path) {
  const text = readFileSync(path, 'utf8');
  if (text.includes('\u0000')) return; // binary
  text.split('\n').forEach((line, i) => {
    for (const [label, re] of RULES) {
      if (re.test(line)) findings.push(`${path}:${i + 1}: ${label}`);
    }
  });
}

for (const root of ROOTS) {
  try {
    walk(root);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

if (findings.length) {
  console.error('Hygiene check failed:\n' + findings.join('\n'));
  process.exit(1);
}
console.log('Hygiene check passed');
