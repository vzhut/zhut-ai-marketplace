import MiniSearch from 'minisearch';
import type { Entry, Kind, Synonyms } from '../types';

const STOP_WORDS = new Set(
  'i me my we you need needs want wants looking look for find show give get a an the to of in on at with that which this is are be can could would should please some any all do does how what where when something anything my our your and or but if it its as by from about using use make help me us there'.split(
    ' ',
  ),
);

const TYPE_WORDS: Record<string, Kind> = {
  plugin: 'plugin',
  plugins: 'plugin',
  skill: 'skill',
  skills: 'skill',
  agent: 'agent',
  agents: 'agent',
  command: 'command',
  commands: 'command',
  hook: 'hook',
  hooks: 'hook',
  mcp: 'mcp',
};

export interface ParsedQuery {
  /** Search terms after stop-word removal and synonym expansion. */
  terms: string[];
  /** The user's own content words (no synonyms), used for highlighting. */
  words: string[];
  /** Type words lifted out of the text ("skill", "agents", ...). */
  kinds: Kind[];
}

export function parseQuery(q: string, synonyms: Synonyms = {}): ParsedQuery {
  const words: string[] = [];
  const kinds: Kind[] = [];
  for (const raw of q.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    const kind = TYPE_WORDS[raw];
    if (kind) {
      if (!kinds.includes(kind)) kinds.push(kind);
    } else if (!STOP_WORDS.has(raw)) {
      words.push(raw);
    }
  }
  const terms = [...new Set(words.flatMap((w) => [w, ...(synonyms[w] ?? [])]))];
  return { terms, words, kinds };
}

export interface Hit {
  entry: Entry;
  score: number;
  /** Where the query matched, as ids understood by `card.field.*` messages. */
  matched: string[];
  /** Terms to highlight in the UI. */
  highlight: string[];
}

const FIELD_ID: Record<string, string> = {
  name: 'name',
  displayName: 'name',
  keywords: 'keywords',
  category: 'keywords',
  description: 'description',
  plugin: 'plugin',
  body: 'content',
};

export interface Searcher {
  /** Returns hits for the text query, or null when there is nothing to search for. */
  search(parsed: ParsedQuery): Hit[] | null;
}

export function createSearcher(entries: Entry[]): Searcher {
  const index = new MiniSearch<Entry>({
    fields: ['name', 'displayName', 'keywords', 'description', 'category', 'plugin', 'body'],
    idField: 'id',
    extractField: (doc, field) => {
      const v = (doc as unknown as Record<string, unknown>)[field];
      return Array.isArray(v) ? v.join(' ') : (v as string);
    },
  });
  index.addAll(entries);
  const byId = new Map(entries.map((e) => [e.id, e]));

  return {
    search(parsed) {
      if (parsed.terms.length === 0) return null;
      const results = index.search(parsed.terms.join(' '), {
        boost: { name: 4, displayName: 4, keywords: 3, description: 2, category: 1.5, plugin: 1.5, body: 1 },
        // Short words match exactly or by prefix only: fuzzy matching turns "zod" into "code".
        prefix: (term) => term.length >= 2,
        fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
        combineWith: 'OR',
      });
      return results.flatMap((r) => {
        const entry = byId.get(r.id);
        if (!entry) return [];
        const matched = [
          ...new Set(
            Object.values(r.match)
              .flat()
              .map((f) => FIELD_ID[f] ?? f),
          ),
        ];
        return [{ entry, score: r.score, matched, highlight: [...new Set([...parsed.words, ...r.terms])] }];
      });
    },
  };
}
