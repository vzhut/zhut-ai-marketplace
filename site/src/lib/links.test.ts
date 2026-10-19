import { describe, expect, it } from 'vitest';
import { markdownBaseDir, resolveRepoLink } from './links';

const resolve = (href: string, dir = 'plugins/alpha/skills/review') =>
  resolveRepoLink(href, 'https://github.com/o/r', 'main', dir);

describe('resolveRepoLink', () => {
  it('resolves links relative to the markdown file', () => {
    expect(resolve('rules/a.md')).toBe(
      'https://github.com/o/r/blob/main/plugins/alpha/skills/review/rules/a.md',
    );
    expect(resolve('./CHANGELOG.md', 'plugins/alpha')).toBe(
      'https://github.com/o/r/blob/main/plugins/alpha/CHANGELOG.md',
    );
    expect(resolve('../beta/README.md', 'plugins/alpha')).toBe(
      'https://github.com/o/r/blob/main/plugins/beta/README.md',
    );
  });
  it('resolves root-relative links against the repository root', () => {
    expect(resolve('/docs/SECURITY.md')).toBe('https://github.com/o/r/blob/main/docs/SECURITY.md');
  });
  it('keeps absolute URLs, mailto and anchors', () => {
    expect(resolve('https://example.com/x')).toBe('https://example.com/x');
    expect(resolve('mailto:a@b.c')).toBe('mailto:a@b.c');
    expect(resolve('#usage')).toBe('#usage');
  });
  it('returns nothing for a relative link when the repository is unknown', () => {
    expect(resolveRepoLink('a.md', '', 'main', 'x')).toBe('');
  });
});

describe('markdownBaseDir', () => {
  it('uses the plugin directory for plugins and the file directory otherwise', () => {
    expect(markdownBaseDir({ kind: 'plugin', path: 'plugins/alpha' })).toBe('plugins/alpha');
    expect(markdownBaseDir({ kind: 'skill', path: 'plugins/alpha/skills/s/SKILL.md' })).toBe(
      'plugins/alpha/skills/s',
    );
  });
});
