import { describe, expect, it } from 'vitest';
import { buildSearch, emptySearch, hasFilters, parseSearch } from './search-params';

describe('search params', () => {
  it('round-trips filters, query and sort', () => {
    const state = {
      ...emptySearch,
      q: 'review docs',
      types: ['skill' as const, 'agent' as const],
      plugins: ['alpha'],
      keywords: ['a', 'b'],
      sort: 'name' as const,
    };
    const qs = buildSearch(state).toString();
    expect(qs).toBe('q=review+docs&type=skill%2Cagent&plugin=alpha&kw=a%2Cb&sort=name');
    expect(parseSearch(new URLSearchParams(qs))).toEqual(state);
  });
  it('ignores unknown types and sorts', () => {
    expect(parseSearch(new URLSearchParams('type=nope,skill&sort=zzz'))).toMatchObject({
      types: ['skill'],
      sort: 'relevance',
    });
  });
  it('builds an empty query string when nothing is set', () => {
    expect(buildSearch(emptySearch).toString()).toBe('');
    expect(hasFilters(emptySearch)).toBe(false);
    expect(hasFilters({ ...emptySearch, q: 'x' })).toBe(true);
  });
});
