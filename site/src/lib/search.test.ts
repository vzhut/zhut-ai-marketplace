import { describe, expect, it } from 'vitest';
import { entries } from '../test-fixtures';
import { emptySearch } from './search-params';
import { runQuery } from './query';
import { createSearcher, parseQuery } from './search';

const searcher = createSearcher(entries);
const run = (q: string, patch = {}) =>
  runQuery(searcher, entries, { ...emptySearch, q, ...patch }, { docs: ['documentation'] });
const names = (q: string, patch = {}) => run(q, patch).hits.map((h) => h.entry.name);

describe('parseQuery', () => {
  it('drops stop words and lifts type words into kinds', () => {
    expect(parseQuery('I need a skill for architecture review')).toMatchObject({
      words: ['architecture', 'review'],
      kinds: ['skill'],
    });
  });
  it('expands synonyms but keeps the user words for highlighting', () => {
    const p = parseQuery('docs', { docs: ['documentation'] });
    expect(p.terms).toEqual(['docs', 'documentation']);
    expect(p.words).toEqual(['docs']);
  });
});

describe('runQuery', () => {
  it('ranks the best name match first', () => {
    expect(names('architecture review')[0]).toBe('architecture-review');
  });
  it('treats a type word as a filter when that type matches', () => {
    expect(names('skill architecture review')).toEqual(['review-architecture']);
  });
  it('widens to all types when nothing of the requested type matches', () => {
    const r = run('command architecture review');
    expect(r.widenedFrom).toEqual(['command']);
    expect(r.hits.length).toBeGreaterThan(0);
  });
  it('matches prefixes, body text and synonyms', () => {
    expect(names('architec')).toContain('architecture-review');
    expect(names('competitive')).toEqual(['web-research']);
    expect(names('docs')).toContain('doc-writer');
  });
  it('explains where the query matched', () => {
    const hit = run('research').hits.find((h) => h.entry.name === 'research-tools');
    expect(hit?.matched).toContain('name');
  });
  it('lists everything for an empty query, plugins first, and applies facets and sorting', () => {
    expect(run('').hits).toHaveLength(entries.length);
    expect(run('').hits[0].entry.kind).toBe('plugin');
    expect(names('', { types: ['skill'] })).toHaveLength(2);
    expect(names('', { categories: ['research'] })).toEqual(['research-tools']);
    expect(names('', { sort: 'name' })[0]).toBe('alpha');
  });
  it('does not fuzzy-match short words', () => {
    expect(names('wrote')).not.toContain('web-research');
    expect(names('doe')).toEqual([]);
  });
  it('returns nothing for a query that matches nothing', () => {
    expect(names('zzzzqqqq')).toEqual([]);
  });
});
