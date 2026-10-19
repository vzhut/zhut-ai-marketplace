import { createSearcher, type Searcher } from './search';
import { KINDS } from './search-params';
import type { Catalog, Entry, Kind, Synonyms } from '../types';

/** Everything derived from the catalog once, so components do plain lookups instead of re-scanning. */
export interface CatalogData {
  catalog: Catalog;
  synonyms: Synonyms;
  searcher: Searcher;
  byId: Map<string, Entry>;
  plugins: Entry[];
  counts: Record<Kind, number>;
  /** Most common keywords, falling back to categories when no entry has keywords. */
  chips: { kind: 'keywords' | 'categories'; values: string[] };
}

export function buildCatalogData(catalog: Catalog, synonyms: Synonyms): CatalogData {
  const entries = catalog.entries;
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>;
  const keywordCount = new Map<string, number>();
  for (const e of entries) {
    counts[e.kind]++;
    for (const k of e.keywords) keywordCount.set(k, (keywordCount.get(k) ?? 0) + 1);
  }
  const chips = keywordCount.size
    ? {
        kind: 'keywords' as const,
        values: [...keywordCount.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k),
      }
    : { kind: 'categories' as const, values: [...new Set(entries.map((e) => e.category).filter(Boolean))] };
  return {
    catalog,
    synonyms,
    searcher: createSearcher(entries),
    byId: new Map(entries.map((e) => [e.id, e])),
    plugins: entries.filter((e) => e.kind === 'plugin'),
    counts,
    chips: { ...chips, values: chips.values.slice(0, 7) },
  };
}

/** Skills, agents, commands, hooks and MCP servers that belong to a plugin. */
export const childrenOf = (entries: Entry[], plugin: string): Entry[] =>
  entries.filter((e) => e.plugin === plugin && e.kind !== 'plugin');
