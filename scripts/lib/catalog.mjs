// Scans the marketplace and builds the catalog payloads (index, health, details).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseFrontmatter } from './frontmatter.mjs';

const KINDS = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'];
const BODY_LIMIT = 2000;
const BODY_LIMIT_SMALL = 800;
const SOFT_BUDGET = 1024 * 1024;
const HARD_BUDGET = 2 * 1024 * 1024;
const STALE_DAYS = 180;
const SECRET_PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['Anthropic/OpenAI key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{32,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
];

const toList = (v) => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
/** plugin.json dependencies: strings or { name, version } objects. */
const toDeps = (v) =>
  (Array.isArray(v) ? v : [])
    .map((d) => (typeof d === 'string' ? { name: d } : d && typeof d.name === 'string' ? { name: d.name, ...(d.version ? { version: String(d.version) } : {}) } : null))
    .filter(Boolean);
const titleCase = (s) => s.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const posix = (p) => p.split('\\').join('/');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read JSON ${path}: ${err.message}`);
  }
}

function readMarkdown(path) {
  try {
    return parseFrontmatter(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${path}: ${err.message}`);
  }
}

export function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, (b) => b.replace(/```\w*/g, ' '))
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function defaultGitDate(root, path) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', path], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function resolveRepo(root, marketplaceName) {
  let slug = process.env.GITHUB_REPOSITORY || '';
  if (!slug) {
    try {
      const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      slug = (/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/.exec(url) || [])[1] || '';
    } catch {
      /* no remote */
    }
  }
  const [owner = '', name = marketplaceName] = slug.split('/');
  return { owner, name, url: owner ? `https://github.com/${owner}/${name}` : '', branch: 'main' };
}

function walkMd(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return path.endsWith('.md') ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((d) => {
    const p = join(path, d.name);
    return d.isDirectory() ? walkMd(p) : d.name.endsWith('.md') ? [p] : [];
  });
}

function skillFiles(base) {
  if (!existsSync(base)) return [];
  if (existsSync(join(base, 'SKILL.md'))) return [join(base, 'SKILL.md')];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(base, d.name, 'SKILL.md')))
    .map((d) => join(base, d.name, 'SKILL.md'));
}

function componentPaths(pluginDir, pluginJson, key, fallback) {
  const declared = toList(pluginJson[key]);
  return [...new Set([join(pluginDir, fallback), ...declared.map((p) => join(pluginDir, p))])];
}

function parseChangelog(path) {
  if (!existsSync(path)) return [];
  const out = [];
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^##\s+\[?v?(\d+\.\d+\.\d+[^\]\s)]*)\]?\s*(?:[-–(]\s*)?(\d{4}-\d{2}-\d{2})?\)?/.exec(lines[i]);
    if (!m) continue;
    let summary = '';
    for (let j = i + 1; j < lines.length && !/^##\s/.test(lines[j]); j++) {
      const t = lines[j].replace(/^[-*]\s+/, '').replace(/^#+\s*/, '').trim();
      if (t) {
        summary = stripMarkdown(t);
        break;
      }
    }
    out.push({ version: m[1], date: m[2] || '', summary });
  }
  return out;
}

const detailFile = (id) => `artifacts/${id.replace(/[:/]/g, '__')}.json`;

function tokens(s) {
  return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Compatibility note shown on the plugin page. `plugin.json` rejects unknown top-level keys under --strict, so it lives in the free-form `metadata` object; a top-level `compatibility` is still read. */
const compatibilityOf = (pj) => {
  const value = pj.metadata?.compatibility ?? pj.compatibility;
  return value ? String(value) : '';
};

export function buildCatalog({ root = '.', gitDate = defaultGitDate, now = new Date() } = {}) {
  const marketplace = readJson(join(root, '.claude-plugin/marketplace.json'));
  const repo = resolveRepo(root, marketplace.name);
  const blobBase = repo.url ? `${repo.url}/blob/${repo.branch}/` : '';
  const treeBase = repo.url ? `${repo.url}/tree/${repo.branch}/` : '';
  const entries = [];
  const details = {};
  const health = [];
  const warn = (code, message, extra = {}) => health.push({ severity: 'warning', code, message, ...extra });
  const listedDirs = new Set();

  const addEntry = (entry, markdown, text) => {
    for (const [label, re] of SECRET_PATTERNS) {
      if (re.test(`${markdown}\n${entry.description}`)) throw new Error(`Possible secret (${label}) in ${entry.path}; fix it or hide the file with "site: false"`);
    }
    if (entries.some((e) => e.id === entry.id)) throw new Error(`Duplicate artifact id "${entry.id}" (${entry.path})`);
    const plain = text ?? stripMarkdown(markdown);
    entry.body = plain.slice(0, BODY_LIMIT);
    entry.detail = detailFile(entry.id);
    details[entry.detail] = { id: entry.id, markdown };
    entries.push(entry);
  };

  for (const mp of marketplace.plugins ?? []) {
    if (typeof mp.source !== 'string') {
      warn('non-local-source', `Plugin "${mp.name}" has a non-local source and is not indexed`);
      continue;
    }
    const dir = join(root, mp.source);
    if (!existsSync(dir)) throw new Error(`Plugin "${mp.name}": source directory ${mp.source} does not exist`);
    listedDirs.add(posix(relative(root, resolve(dir))));
    const pjPath = join(dir, '.claude-plugin/plugin.json');
    const pj = existsSync(pjPath) ? readJson(pjPath) : {};
    if (pj['x-site']?.hidden) continue;

    const name = mp.name;
    const author = pj.author?.name ?? mp.author?.name ?? marketplace.owner?.name ?? '';
    const version = pj.version ?? mp.version ?? '';
    const category = mp.category ?? pj.category ?? '';
    const keywords = [...new Set([...toList(mp.keywords ?? mp.tags), ...toList(pj.keywords)])];
    const rel = (p) => posix(relative(root, p));
    const base = { plugin: name, category, author, version };
    const common = (path) => ({ ...base, keywords, path: rel(path), url: blobBase + rel(path), updated: gitDate(root, rel(path)), invocation: '', tools: [] });
    const counts = { skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 };

    const addMd = (kind, file, requireName) => {
      const { data, body } = readMarkdown(file);
      if (data.site === false) return;
      const fileName = kind === 'skill' ? basename(join(file, '..')) : basename(file, '.md');
      const artName = String(data.name || (requireName ? '' : fileName));
      if (!artName) throw new Error(`${file}: missing "name" in frontmatter`);
      const description = String(data.description || '');
      if (requireName && !description) throw new Error(`${file}: missing "description" in frontmatter`);
      const entry = {
        ...common(file),
        id: `${kind}:${name}/${artName}`, kind, name: artName, displayName: String(data.title || titleCase(artName)),
        description, tools: toList(data.tools ?? data['allowed-tools']),
        keywords: [...new Set([...toList(data.keywords ?? data.metadata?.tags ?? data.tags), ...keywords])],
        // Skills with `user-invocable: false` are background knowledge, not slash commands.
        invocation: (kind === 'skill' || kind === 'command') && data['user-invocable'] !== false ? `/${name}:${artName}` : '',
      };
      if (data.model) entry.model = String(data.model);
      entry.lines = body.split('\n').length;
      addEntry(entry, body, undefined);
      counts[kind]++;
    };

    for (const p of componentPaths(dir, pj, 'skills', 'skills')) for (const f of skillFiles(p)) addMd('skill', f, true);
    for (const p of componentPaths(dir, pj, 'agents', 'agents')) for (const f of walkMd(p)) addMd('agent', f, true);
    for (const p of componentPaths(dir, pj, 'commands', 'commands')) for (const f of walkMd(p)) addMd('command', f, false);

    const hooksPath = join(dir, 'hooks/hooks.json');
    if (existsSync(hooksPath)) {
      const hooks = readJson(hooksPath).hooks ?? {};
      for (const [event, groups] of Object.entries(hooks)) {
        const list = Array.isArray(groups) ? groups : [];
        const n = list.reduce((a, g) => a + (g.hooks?.length ?? 0), 0);
        const matchers = [...new Set(list.map((g) => g.matcher).filter(Boolean))];
        const description = `Runs ${n} hook command${n === 1 ? '' : 's'} on ${event}${matchers.length ? ` (matching ${matchers.join(', ')})` : ''}.`;
        addEntry({ ...common(hooksPath), id: `hook:${name}/${event}`, kind: 'hook', name: event, displayName: event, description }, description, description);
        counts.hook++;
      }
    }
    const mcpPath = join(dir, '.mcp.json');
    if (existsSync(mcpPath)) {
      const cfg = readJson(mcpPath);
      for (const [server, def] of Object.entries(cfg.mcpServers ?? cfg)) {
        if (typeof def !== 'object' || def === null) continue;
        const transport = def.type ?? (def.url ? 'http' : 'stdio');
        const description = `MCP server "${server}" (${transport}${def.command ? `, command: ${def.command}` : ''}).`;
        addEntry({ ...common(mcpPath), id: `mcp:${name}/${server}`, kind: 'mcp', name: server, displayName: server, description }, description, description);
        counts.mcp++;
      }
    }

    const readmePath = ['README.md', 'readme.md'].map((f) => join(dir, f)).find(existsSync);
    const readme = readmePath ? readMarkdown(readmePath).body : '';
    const description = mp.description ?? pj.description ?? '';
    const own = entries.filter((e) => e.plugin === name);
    const plugin = {
      ...base, keywords, id: `plugin:${name}`, kind: 'plugin', name, displayName: titleCase(name), description,
      path: rel(dir), url: treeBase + rel(dir), invocation: '', tools: [],
      updated: own.map((e) => e.updated).sort().pop() || gitDate(root, rel(dir)),
      counts, deps: toDeps(pj.dependencies), compatibility: compatibilityOf(pj),
      changelog: parseChangelog(join(dir, 'CHANGELOG.md')),
    };
    addEntry(plugin, readme || description, undefined);
    entries.splice(entries.indexOf(plugin), 1);
    entries.unshift(plugin);

    if (!version) warn('plugin-no-version', `Plugin "${name}" has no version`, { id: plugin.id });
    if (!author) warn('plugin-no-author', `Plugin "${name}" has no author`, { id: plugin.id });
    if (own.length === 0) warn('plugin-empty', `Plugin "${name}" has no skills, agents, commands, hooks or MCP servers`, { id: plugin.id });
    if (!description) warn('missing-description', `Plugin "${name}" has no description`, { id: plugin.id });
  }

  // Plugins on disk but not listed in the marketplace.
  const pluginsRoot = join(root, 'plugins');
  if (existsSync(pluginsRoot)) {
    for (const d of readdirSync(pluginsRoot, { withFileTypes: true })) {
      if (d.isDirectory() && !listedDirs.has(`plugins/${d.name}`)) warn('unlisted-plugin', `Directory plugins/${d.name} is not listed in marketplace.json`, { path: `plugins/${d.name}` });
    }
  }

  for (const e of entries) {
    if (e.kind !== 'plugin' && !e.description) warn('missing-description', `${e.kind} "${e.name}" has no description`, { id: e.id, path: e.path });
    else if (e.description && e.description.length < 20) warn('short-description', `${e.kind} "${e.name}" description is very short`, { id: e.id, path: e.path });
    if (e.kind === 'skill' && e.lines > 500) warn('oversized-skill', `Skill "${e.name}" is ${e.lines} lines (> 500)`, { id: e.id, path: e.path });
    if (e.updated && (now - new Date(e.updated)) / 864e5 > STALE_DAYS) warn('stale', `${e.kind} "${e.name}" was last updated ${e.updated} (> ${STALE_DAYS} days ago)`, { id: e.id, path: e.path });
    delete e.lines;
  }
  const tok = entries.map((e) => tokens(e.description));
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[i].kind === entries[j].kind && jaccard(tok[i], tok[j]) >= 0.8) warn('duplicate-description', `"${entries[i].name}" and "${entries[j].name}" have near-identical descriptions`, { id: entries[i].id });
    }
  }

  const build = () => ({
    schema: 1,
    generated: now.toISOString(),
    marketplace: { name: marketplace.name, description: marketplace.description ?? '', owner: marketplace.owner?.name ?? '' },
    repo,
    kinds: KINDS,
    entries,
  });
  let index = build();
  if (JSON.stringify(index).length > SOFT_BUDGET) {
    for (const e of entries) e.body = e.body.slice(0, BODY_LIMIT_SMALL);
    index = build();
    if (JSON.stringify(index).length > HARD_BUDGET) throw new Error('index.json exceeds 2 MB; the index needs chunking');
  }

  const healthReport = {
    generated: now.toISOString(),
    summary: { entries: entries.length, warnings: health.length },
    findings: health,
  };
  return { index, health: healthReport, details };
}
