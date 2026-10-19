import type { Entry, Kind, SearchState, Synonyms } from '../types';
import { KINDS } from './search-params';
import { parseQuery, type Hit, type Searcher } from './search';

export interface QueryResult {
  /** Hits after the text query but before facet filters (used for facet counts). */
  base: Hit[];
  /** Hits after facet filters and sorting. */
  hits: Hit[];
  words: string[];
  /** Type words from the query that matched nothing, so results were widened to all types. */
  widenedFrom: Kind[];
}

const byKindThenName = (a: Entry, b: Entry) =>
  KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.displayName.localeCompare(b.displayName);

export function runQuery(
  searcher: Searcher,
  entries: Entry[],
  state: SearchState,
  synonyms: Synonyms,
): QueryResult {
  const parsed = parseQuery(state.q, synonyms);
  let base: Hit[] =
    searcher.search(parsed) ?? entries.map((entry) => ({ entry, score: 0, matched: [], highlight: [] }));
  // A type word ("skill") narrows the results, unless nothing of that type matches: then show everything related.
  let widenedFrom: Kind[] = [];
  if (parsed.kinds.length) {
    const narrowed = base.filter((h) => parsed.kinds.includes(h.entry.kind));
    if (narrowed.length > 0 || base.length === 0) base = narrowed;
    else widenedFrom = parsed.kinds;
  }

  const pick = <T>(selected: T[], value: T) => selected.length === 0 || selected.includes(value);
  const hits = base.filter(
    ({ entry: e }) =>
      pick(state.types, e.kind) &&
      pick(state.plugins, e.plugin) &&
      pick(state.categories, e.category) &&
      pick(state.authors, e.author) &&
      (state.keywords.length === 0 || state.keywords.some((k) => e.keywords.includes(k))),
  );

  const textual = parsed.terms.length > 0;
  hits.sort((a, b) => {
    if (state.sort === 'name') return a.entry.displayName.localeCompare(b.entry.displayName);
    if (state.sort === 'updated')
      return (
        b.entry.updated.localeCompare(a.entry.updated) ||
        a.entry.displayName.localeCompare(b.entry.displayName)
      );
    return textual ? b.score - a.score : byKindThenName(a.entry, b.entry);
  });
  return { base, hits, words: parsed.words, widenedFrom };
}
