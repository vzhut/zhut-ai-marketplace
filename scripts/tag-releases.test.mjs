import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { planTags, readPlugins, tagName } from './tag-releases.mjs';

function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'tag-test-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(content));
  }
  return root;
}

test('tag name uses two dashes', () => {
  assert.equal(tagName('research-tools', '1.2.0'), 'research-tools--v1.2.0');
});

test('plans only the missing tags and never touches existing ones', () => {
  const plugins = [{ name: 'a', version: '1.0.1' }, { name: 'b', version: '1.0.0' }];
  const plan = planTags(plugins, ['a--v1.0.0', 'b--v1.0.0']);
  assert.deepEqual(plan.toCreate, ['a--v1.0.1']);
  assert.deepEqual(plan.existing, ['b--v1.0.0']);
});

test('reads marketplace plugins and reports blocking problems', () => {
  const root = makeRepo({
    '.claude-plugin/marketplace.json': {
      name: 'mp',
      plugins: [
        { name: 'ok', source: './plugins/ok' },
        { name: 'bad-version', source: './plugins/bad-version' },
        { name: 'renamed', source: './plugins/renamed' },
        { name: 'missing', source: './plugins/missing' },
      ],
    },
    'plugins/ok/.claude-plugin/plugin.json': { name: 'ok', version: '1.0.0' },
    'plugins/bad-version/.claude-plugin/plugin.json': { name: 'bad-version', version: 'latest' },
    'plugins/renamed/.claude-plugin/plugin.json': { name: 'other', version: '1.0.0' },
  });
  try {
    const { plugins, problems } = readPlugins(root);
    assert.deepEqual(plugins, [{ name: 'ok', version: '1.0.0' }]);
    assert.equal(problems.length, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
