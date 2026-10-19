const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

/**
 * Markdown in the catalog is written for GitHub, where `CHANGELOG.md` or `../other/README.md` point to files
 * next to the source file. On the site those paths do not exist, so relative links are resolved against the
 * file's location in the repository. Absolute URLs and in-page anchors are returned unchanged.
 */
export function resolveRepoLink(href: string, repoUrl: string, branch: string, baseDir: string): string {
  if (!href || ABSOLUTE.test(href)) return href;
  if (!repoUrl) return '';
  const root = `${repoUrl}/blob/${branch}/`;
  try {
    return href.startsWith('/')
      ? new URL(href.slice(1), root).toString()
      : new URL(href, `${root}${baseDir.replace(/^\/|\/$/g, '')}/`).toString();
  } catch {
    return '';
  }
}

/** Directory of the repository file that an entry's markdown comes from. */
export function markdownBaseDir(entry: { kind: string; path: string }): string {
  return entry.kind === 'plugin' ? entry.path : entry.path.split('/').slice(0, -1).join('/');
}
