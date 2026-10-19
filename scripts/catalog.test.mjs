import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { buildCatalog, stripMarkdown } from './lib/catalog.mjs';

/** Creates a throwaway repo from a { path: content } map; objects are written as JSON. */
function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'catalog-test-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

const marketplace = (plugins) => ({
  '.claude-plugin/marketplace.json': { name: 'test-mp', owner: { name: 'Tester' }, plugins },
});
const plugin = (name, extra = {}) => ({ name, source: `./plugins/${name}`, description: `The ${name} plugin for tests`, category: 'testing', ...extra });
const skill = (name, description = 'Reviews architecture decisions for consistency') => `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n\nBody text.`;
const build = (files, gitDate = () => '2026-01-02') => {
  const root = makeRepo(files);
  try {
    return buildCatalog({ root, gitDate, now: new Date('2026-02-01') });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('frontmatter: scalars, lists, booleans and block scalars', () => {
  const { data, body } = parseFrontmatter(
    '---\nname: demo\ntitle: "Quoted: title"\nsite: false\ntags: [a, b]\ntools:\n  - Read\n  - Grep\ndescription: >\n  folded\n  text\n---\nBody',
  );
  assert.deepEqual(data, { name: 'demo', title: 'Quoted: title', site: false, tags: ['a', 'b'], tools: ['Read', 'Grep'], description: 'folded text' });
  assert.equal(body, 'Body');
});

test('frontmatter: files without a block are plain bodies, broken blocks throw', () => {
  assert.deepEqual(parseFrontmatter('# Title'), { data: {}, body: '# Title' });
  assert.throws(() => parseFrontmatter('---\nname: x\nno closing'), /Unterminated/);
  assert.throws(() => parseFrontmatter('---\nnot yaml at all\n---\n'), /Invalid frontmatter/);
});

test('frontmatter: nested maps, continuation lines and escaped quotes', () => {
  const { data } = parseFrontmatter(
    '---\nname: x\ndescription: "Says \\"hi\\": really"\nmetadata:\n  tags: a, b\n  deep:\n    k: v\nlong: first\n  second\nuser-invocable: false\n---\n',
  );
  assert.deepEqual(data, { name: 'x', description: 'Says "hi": really', metadata: { tags: 'a, b', deep: { k: 'v' } }, long: 'first second', 'user-invocable': false });
});

test('stripMarkdown removes formatting', () => {
  assert.equal(stripMarkdown('# Hi\n\nSee [docs](http://x) and `code` **now**'), 'Hi See docs and code now');
});

test('indexes plugins, skills, agents, commands, hooks and MCP servers', () => {
  const { index, details } = build({
    ...marketplace([plugin('alpha')]),
    'plugins/alpha/.claude-plugin/plugin.json': { name: 'alpha', version: '1.2.0', author: { name: 'Alice' }, keywords: ['demo'] },
    'plugins/alpha/skills/review/SKILL.md': skill('review'),
    'plugins/alpha/agents/helper.md': '---\nname: helper\ndescription: A helper agent that does things\ntools: Read, Grep\nmodel: sonnet\n---\nAgent body',
    'plugins/alpha/commands/ship.md': '---\ndescription: Ship the thing to production\n---\nRun it',
    'plugins/alpha/hooks/hooks.json': { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }] } },
    'plugins/alpha/.mcp.json': { mcpServers: { pg: { command: 'node', args: ['server.js'], env: { TOKEN: 'secret' } } } },
    'plugins/alpha/README.md': '# Alpha\n\nReadme body',
  });
  const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));
  assert.deepEqual(Object.keys(byId).sort(), ['agent:alpha/helper', 'command:alpha/ship', 'hook:alpha/PreToolUse', 'mcp:alpha/pg', 'plugin:alpha', 'skill:alpha/review']);
  assert.equal(byId['plugin:alpha'].version, '1.2.0');
  assert.equal(byId['plugin:alpha'].author, 'Alice');
  assert.deepEqual(byId['plugin:alpha'].counts, { skill: 1, agent: 1, command: 1, hook: 1, mcp: 1 });
  assert.deepEqual(byId['agent:alpha/helper'].tools, ['Read', 'Grep']);
  assert.equal(byId['skill:alpha/review'].invocation, '/alpha:review');
  assert.deepEqual(byId['skill:alpha/review'].keywords, ['demo']);
  assert.equal(byId['skill:alpha/review'].updated, '2026-01-02');
  assert.match(details[byId['plugin:alpha'].detail].markdown, /Readme body/);
  assert.ok(!JSON.stringify(index).includes('secret'), 'MCP env values must not be indexed');
});

test('hidden skills and plugins never reach any output', () => {
  const { index, details } = build({
    ...marketplace([plugin('alpha'), plugin('ghost')]),
    'plugins/alpha/skills/shown/SKILL.md': skill('shown'),
    'plugins/alpha/skills/secret/SKILL.md': '---\nname: secret\ndescription: Internal only skill, do not publish\nsite: false\n---\nhidden body',
    'plugins/ghost/.claude-plugin/plugin.json': { name: 'ghost', 'x-site': { hidden: true } },
    'plugins/ghost/skills/boo/SKILL.md': skill('boo'),
  });
  assert.deepEqual(index.entries.map((e) => e.id).sort(), ['plugin:alpha', 'skill:alpha/shown']);
  assert.ok(!JSON.stringify([index, details]).includes('hidden body'));
});

test('honours custom component paths from plugin.json', () => {
  const { index } = build({
    ...marketplace([plugin('alpha')]),
    'plugins/alpha/.claude-plugin/plugin.json': { name: 'alpha', skills: ['./extra-skills'] },
    'plugins/alpha/extra-skills/one/SKILL.md': skill('one'),
  });
  assert.ok(index.entries.some((e) => e.id === 'skill:alpha/one'));
});

test('parses CHANGELOG.md', () => {
  const { index } = build({
    ...marketplace([plugin('alpha')]),
    'plugins/alpha/CHANGELOG.md': '# Changelog\n\n## [1.1.0] - 2026-01-05\n- Added a thing\n\n## 1.0.0 (2025-12-01)\nFirst release\n',
  });
  assert.deepEqual(index.entries[0].changelog, [
    { version: '1.1.0', date: '2026-01-05', summary: 'Added a thing' },
    { version: '1.0.0', date: '2025-12-01', summary: 'First release' },
  ]);
});

test('build fails on missing source directory', () => {
  assert.throws(() => build(marketplace([plugin('alpha')])), /source directory .* does not exist/);
});

test('build fails on a skill without description or name', () => {
  const base = marketplace([plugin('alpha')]);
  assert.throws(() => build({ ...base, 'plugins/alpha/skills/a/SKILL.md': '---\nname: a\n---\nx' }), /missing "description"/);
  assert.throws(() => build({ ...base, 'plugins/alpha/skills/a/SKILL.md': '---\ndescription: Has no name at all\n---\nx' }), /missing "name"/);
});

test('build fails on duplicate ids and malformed frontmatter or JSON', () => {
  const base = { ...marketplace([plugin('alpha')]), 'plugins/alpha/.claude-plugin/plugin.json': { name: 'alpha', skills: ['./more'] } };
  assert.throws(() => build({ ...base, 'plugins/alpha/skills/a/SKILL.md': skill('same'), 'plugins/alpha/more/b/SKILL.md': skill('same') }), /Duplicate artifact id/);
  assert.throws(() => build({ ...base, 'plugins/alpha/skills/a/SKILL.md': '---\nname: a\nnever closed' }), /Unterminated/);
  assert.throws(() => build({ ...marketplace([plugin('alpha')]), 'plugins/alpha/hooks/hooks.json': '{ nope' }), /Cannot read JSON/);
});

test('build fails when a secret is about to be published', () => {
  assert.throws(
    () => build({ ...marketplace([plugin('alpha')]), 'plugins/alpha/skills/a/SKILL.md': skill('a', 'Uses key AKIAABCDEFGHIJKLMNOP for access') }),
    /Possible secret/,
  );
});

test('health: empty plugins, short and duplicate descriptions, unlisted dirs, stale entries', () => {
  const { health } = build({
    ...marketplace([plugin('alpha'), plugin('empty')]),
    'plugins/alpha/skills/a/SKILL.md': skill('a', 'Tiny'),
    'plugins/alpha/skills/b/SKILL.md': skill('b', 'Reviews architecture decisions for consistency and quality'),
    'plugins/alpha/skills/c/SKILL.md': skill('c', 'Reviews architecture decisions for consistency and quality'),
    'plugins/orphan/.claude-plugin/plugin.json': { name: 'orphan' },
    'plugins/empty/.keep': '',
  });
  const codes = health.findings.map((f) => f.code);
  for (const code of ['plugin-empty', 'short-description', 'duplicate-description', 'unlisted-plugin', 'plugin-no-version']) assert.ok(codes.includes(code), `expected ${code}`);
  assert.ok(!codes.includes('stale'), 'entries updated 30 days before "now" are fresh');
});

test('health: flags entries not updated for over 180 days', () => {
  const { health } = build({ ...marketplace([plugin('alpha')]), 'plugins/alpha/skills/a/SKILL.md': skill('a') }, () => '2025-01-01');
  assert.ok(health.findings.some((f) => f.code === 'stale'));
});

test('real-world skill frontmatter: tags become keywords, user-invocable:false hides the slash command, object dependencies are kept', () => {
  const { index } = build({
    ...marketplace([plugin('alpha')]),
    'plugins/alpha/.claude-plugin/plugin.json': { name: 'alpha', dependencies: [{ name: 'beta', version: '^1.0.0' }, 'gamma'] },
    'plugins/alpha/skills/s/SKILL.md': '---\nname: s\ndescription: A skill with metadata tags\nuser-invocable: false\nmetadata:\n  tags: fastify, nodejs\n---\nBody',
  });
  const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));
  assert.deepEqual(byId['skill:alpha/s'].keywords, ['fastify', 'nodejs']);
  assert.equal(byId['skill:alpha/s'].invocation, '');
  assert.deepEqual(byId['plugin:alpha'].deps, [{ name: 'beta', version: '^1.0.0' }, { name: 'gamma' }]);
});
