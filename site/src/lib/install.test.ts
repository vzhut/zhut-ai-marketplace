import { describe, expect, it } from 'vitest';
import { catalog, entries, entry } from '../test-fixtures';
import { collectReleases, installCommand, issueUrl, settingsSnippet } from './install';

describe('install helpers', () => {
  it('builds the install command', () => {
    expect(installCommand('alpha', 'test-mp')).toBe('claude plugin install alpha@test-mp');
  });
  it('builds a valid settings.json snippet for the basket', () => {
    const json = JSON.parse(settingsSnippet(catalog, ['alpha', 'research-tools']));
    expect(json.extraKnownMarketplaces['test-mp']).toEqual({ source: { source: 'github', repo: 'o/r' } });
    expect(json.enabledPlugins).toEqual({ 'alpha@test-mp': true, 'research-tools@test-mp': true });
  });
  it('prefills GitHub issue URLs', () => {
    const url = issueUrl(catalog.repo, 'artifact-request.yml', 'Request: x', { request: 'x y' });
    expect(url).toBe(
      'https://github.com/o/r/issues/new?template=artifact-request.yml&title=Request%3A+x&request=x+y',
    );
  });
  it('lists only real changelog entries, newest first, and invents nothing for plugins without one', () => {
    const withLog = entry('plugin', 'logged', 'Has a changelog', {
      changelog: [
        { version: '1.0.0', date: '2026-01-01', summary: 'First' },
        { version: '1.1.0', date: '2026-02-01', summary: 'Second' },
      ],
    });
    expect(collectReleases(entries)).toEqual([]);
    expect(collectReleases([...entries, withLog]).map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
  });
});
