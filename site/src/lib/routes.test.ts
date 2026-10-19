import { describe, expect, it } from 'vitest';
import { entryId, paths } from './routes';

describe('paths', () => {
  it('builds readable paths for plugins and artifacts', () => {
    expect(paths.entry({ kind: 'plugin', plugin: 'alpha', name: 'alpha' })).toBe('/plugins/alpha');
    expect(paths.entry({ kind: 'skill', plugin: 'alpha', name: 'review' })).toBe('/skills/alpha/review');
    expect(paths.entry({ kind: 'mcp', plugin: 'alpha', name: 'pg' })).toBe('/mcp/alpha/pg');
  });
  it('encodes unsafe characters', () => {
    expect(paths.entry({ kind: 'hook', plugin: 'a', name: 'Pre Tool/Use' })).toBe(
      '/hooks/a/Pre%20Tool%2FUse',
    );
  });
  it('builds search URLs and omits the query string when empty', () => {
    expect(paths.search()).toBe('/search');
    expect(paths.search({ types: ['skill'], q: 'x y' })).toBe('/search?q=x+y&type=skill');
  });
});

describe('entryId', () => {
  it('maps a path back to an entry id', () => {
    expect(entryId('skills', 'alpha', 'review')).toBe('skill:alpha/review');
    expect(entryId('hooks', 'a', 'PreToolUse')).toBe('hook:a/PreToolUse');
  });
  it('rejects unknown segments and the plugins segment', () => {
    expect(entryId('nope', 'a', 'b')).toBeNull();
    expect(entryId('plugins', 'a', 'b')).toBeNull();
  });
});
