import type { Catalog, ChangelogItem, Entry, RepoInfo } from '../types';

export const installCommand = (plugin: string, marketplace: string) =>
  `claude plugin install ${plugin}@${marketplace}`;

export const marketplaceAddCommand = (repo: RepoInfo, marketplace: string) =>
  `claude plugin marketplace add ${repo.owner ? `${repo.owner}/${repo.name}` : marketplace}`;

export const marketplaceUpdateCommand = (marketplace: string) =>
  `claude plugin marketplace update ${marketplace}`;

/** A `.claude/settings.json` snippet that registers the marketplace and enables the plugins. */
export function settingsSnippet(catalog: Catalog, plugins: string[]): string {
  const { repo, marketplace } = catalog;
  return JSON.stringify(
    {
      extraKnownMarketplaces: {
        [marketplace.name]: {
          source: { source: 'github', repo: repo.owner ? `${repo.owner}/${repo.name}` : marketplace.name },
        },
      },
      enabledPlugins: Object.fromEntries(plugins.map((p) => [`${p}@${marketplace.name}`, true])),
    },
    null,
    2,
  );
}

export function issueUrl(
  repo: RepoInfo,
  template: string,
  title: string,
  fields: Record<string, string>,
): string {
  if (!repo.url) return '#';
  const p = new URLSearchParams({ template, title, ...fields });
  return `${repo.url}/issues/new?${p.toString()}`;
}

export interface Release extends ChangelogItem {
  plugin: Entry;
}

/** Real CHANGELOG.md entries across plugins, newest first. Plugins without a changelog contribute nothing. */
export function collectReleases(entries: Entry[]): Release[] {
  const out: Release[] = [];
  for (const plugin of entries) {
    if (plugin.kind !== 'plugin') continue;
    for (const item of plugin.changelog ?? []) out.push({ ...item, plugin });
  }
  return out.sort(
    (a, b) => b.date.localeCompare(a.date) || a.plugin.displayName.localeCompare(b.plugin.displayName),
  );
}
