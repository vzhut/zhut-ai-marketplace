import type { Kind, SearchState, SortKey } from '../types';

export const KINDS: Kind[] = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'];
const SORTS: SortKey[] = ['relevance', 'name', 'updated'];

export const emptySearch: SearchState = {
  q: '',
  types: [],
  plugins: [],
  categories: [],
  keywords: [],
  authors: [],
  sort: 'relevance',
};

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export function hasFilters(s: SearchState): boolean {
  return !!(
    s.q ||
    s.types.length ||
    s.plugins.length ||
    s.categories.length ||
    s.keywords.length ||
    s.authors.length
  );
}

export function parseSearch(params: URLSearchParams): SearchState {
  const sort = params.get('sort') as SortKey;
  return {
    q: params.get('q') ?? '',
    types: list(params.get('type')).filter((k): k is Kind => KINDS.includes(k as Kind)),
    plugins: list(params.get('plugin')),
    categories: list(params.get('category')),
    keywords: list(params.get('kw')),
    authors: list(params.get('author')),
    sort: SORTS.includes(sort) ? sort : 'relevance',
  };
}

export function buildSearch(s: SearchState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.types.length) p.set('type', s.types.join(','));
  if (s.plugins.length) p.set('plugin', s.plugins.join(','));
  if (s.categories.length) p.set('category', s.categories.join(','));
  if (s.keywords.length) p.set('kw', s.keywords.join(','));
  if (s.authors.length) p.set('author', s.authors.join(','));
  if (s.sort !== 'relevance') p.set('sort', s.sort);
  return p;
}
