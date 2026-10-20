// Creates a `<plugin>--vX.Y.Z` git tag for every plugin whose plugin.json version has no tag yet (no dependencies).
// Claude Code resolves dependency ranges such as ^1.0.0 against exactly this tag format.
// Tags are immutable: an existing tag is never moved, even if the plugin changed without a version bump.
// Usage: node scripts/tag-releases.mjs [--push] [--dry-run]   (default: create local tags only)
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const tagName = (plugin, version) => `${plugin}--v${version}`;

/** Reads the marketplace plugins and returns { name, version } per plugin, plus problems that block tagging. */
export function readPlugins(root) {
  const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  const plugins = [];
  const problems = [];
  for (const entry of marketplace.plugins ?? []) {
    const manifest = join(root, entry.source, '.claude-plugin/plugin.json');
    if (!existsSync(manifest)) {
      problems.push(`${entry.name}: ${entry.source}/.claude-plugin/plugin.json not found`);
      continue;
    }
    const { name, version } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (name !== entry.name) problems.push(`${entry.name}: manifest name is "${name}"`);
    else if (!SEMVER.test(version ?? '')) problems.push(`${entry.name}: version "${version}" is not SemVer`);
    else plugins.push({ name, version });
  }
  return { plugins, problems };
}

/** Pure: which tags are missing, and which already exist. */
export function planTags(plugins, existingTags) {
  const have = new Set(existingTags);
  const toCreate = [];
  const existing = [];
  for (const p of plugins) {
    const tag = tagName(p.name, p.version);
    (have.has(tag) ? existing : toCreate).push(tag);
  }
  return { toCreate, existing };
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function main() {
  const push = process.argv.includes('--push');
  const dry = process.argv.includes('--dry-run');
  const root = process.cwd();
  const { plugins, problems } = readPlugins(root);
  if (problems.length) {
    console.error('Cannot tag:\n' + problems.map((p) => `  ${p}`).join('\n'));
    process.exit(1);
  }
  const { toCreate, existing } = planTags(plugins, git(['tag', '--list', '*--v*']).split('\n').filter(Boolean));
  for (const tag of existing) console.log(`exists   ${tag}`);
  if (!toCreate.length) {
    console.log('Nothing to tag.');
    return;
  }
  const sha = git(['rev-parse', '--short', 'HEAD']);
  for (const tag of toCreate) {
    console.log(`${dry ? 'would create' : 'create  '} ${tag} at ${sha}`);
    if (dry) continue;
    git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'tag', '-a', tag, '-m', `Release ${tag}`]);
    if (push) git(['push', 'origin', `refs/tags/${tag}`]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
