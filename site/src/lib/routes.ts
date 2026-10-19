import type { Entry, Kind, SearchState } from '../types';
import { buildSearch, emptySearch } from './search-params';

/** URL segment for each artifact kind: /skills/<plugin>/<name>. Plugins live under /plugins/<name>. */
const SEGMENT: Record<Kind, string> = {
  plugin: 'plugins',
  skill: 'skills',
  agent: 'agents',
  command: 'commands',
  hook: 'hooks',
  mcp: 'mcp',
};

const kindBySegment = new Map(Object.entries(SEGMENT).map(([kind, seg]) => [seg, kind as Kind]));

export const paths = {
  home: '/',
  whatsNew: '/whats-new',
  start: '/get-started',
  health: '/health',
  search(state: Partial<SearchState> = {}): string {
    const qs = buildSearch({ ...emptySearch, ...state }).toString();
    return qs ? `/search?${qs}` : '/search';
  },
  entry(e: Pick<Entry, 'kind' | 'plugin' | 'name'>): string {
    return e.kind === 'plugin'
      ? `/plugins/${encodeURIComponent(e.name)}`
      : `/${SEGMENT[e.kind]}/${encodeURIComponent(e.plugin)}/${encodeURIComponent(e.name)}`;
  },
};

/** Maps /<segment>/<plugin>/<name> back to an entry id, or null for an unknown segment. */
export function entryId(segment: string, plugin: string, name: string): string | null {
  const kind = kindBySegment.get(segment);
  return kind && kind !== 'plugin' ? `${kind}:${plugin}/${name}` : null;
}
