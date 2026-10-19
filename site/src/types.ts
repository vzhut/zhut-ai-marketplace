export type Kind = 'plugin' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp';
export type SortKey = 'relevance' | 'name' | 'updated';

export interface ChangelogItem {
  version: string;
  date: string;
  summary: string;
}

export interface Entry {
  id: string;
  kind: Kind;
  name: string;
  displayName: string;
  description: string;
  plugin: string;
  category: string;
  keywords: string[];
  author: string;
  version: string;
  updated: string;
  path: string;
  url: string;
  invocation: string;
  tools: string[];
  model?: string;
  body: string;
  detail: string;
  counts?: Partial<Record<Kind, number>>;
  deps?: { name: string; version?: string }[];
  compatibility?: string;
  changelog?: ChangelogItem[];
}

export interface RepoInfo {
  owner: string;
  name: string;
  url: string;
  branch: string;
}

export interface Catalog {
  schema: number;
  generated: string;
  marketplace: { name: string; description: string; owner: string };
  repo: RepoInfo;
  kinds: Kind[];
  entries: Entry[];
}

export interface HealthFinding {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  id?: string;
  path?: string;
}

export interface HealthReport {
  generated: string;
  summary: { entries: number; warnings: number };
  findings: HealthFinding[];
}

export type Synonyms = Record<string, string[]>;

/** Search and filter state, stored in the query string of /search. */
export interface SearchState {
  q: string;
  types: Kind[];
  plugins: string[];
  categories: string[];
  keywords: string[];
  authors: string[];
  sort: SortKey;
}
