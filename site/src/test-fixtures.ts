import type { Catalog, Entry, Kind } from './types';

export function entry(kind: Kind, name: string, description: string, extra: Partial<Entry> = {}): Entry {
  const plugin = extra.plugin ?? (kind === 'plugin' ? name : 'alpha');
  return {
    id: kind === 'plugin' ? `plugin:${name}` : `${kind}:${plugin}/${name}`,
    kind,
    name,
    displayName: name
      .split('-')
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' '),
    description,
    plugin,
    category: 'engineering',
    keywords: [],
    author: 'Tester',
    version: '1.0.0',
    updated: '2026-01-01',
    path: `plugins/${plugin}`,
    url: `https://github.com/o/r/blob/main/plugins/${plugin}`,
    invocation: '',
    tools: [],
    body: '',
    detail: `artifacts/${kind}__${plugin}__${name}.json`,
    ...extra,
  };
}

export const entries: Entry[] = [
  entry('plugin', 'alpha', 'Engineering workflows and conventions', { keywords: ['workflow'] }),
  entry('plugin', 'architecture-review', 'Architecture review helpers'),
  entry('plugin', 'research-tools', 'Tools for research and information gathering', { category: 'research' }),
  entry('skill', 'review-architecture', 'Reviews architecture decisions and proposes improvements', {
    plugin: 'architecture-review',
  }),
  entry('skill', 'web-research', 'Searches the web and summarises sources', {
    plugin: 'research-tools',
    body: 'Useful for competitive analysis',
  }),
  entry('agent', 'doc-writer', 'Writes documentation from code', { plugin: 'alpha' }),
];

export const catalog: Catalog = {
  schema: 1,
  generated: '2026-01-01T00:00:00.000Z',
  marketplace: { name: 'test-mp', description: 'Test marketplace', owner: 'Tester' },
  repo: { owner: 'o', name: 'r', url: 'https://github.com/o/r', branch: 'main' },
  kinds: ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'],
  entries,
};
