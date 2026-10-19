import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Catalog } from '../types';

const kind = z.enum(['plugin', 'skill', 'agent', 'command', 'hook', 'mcp']);

// Annotating with z.ZodType<Catalog> ties the schema to the TypeScript types: if they drift apart,
// this file stops compiling.
const entry = z.object({
  id: z.string(),
  kind,
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  plugin: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  author: z.string(),
  version: z.string(),
  updated: z.string(),
  path: z.string(),
  url: z.string(),
  invocation: z.string(),
  tools: z.array(z.string()),
  model: z.string().optional(),
  body: z.string(),
  detail: z.string(),
  counts: z.partialRecord(kind, z.number()).optional(),
  deps: z.array(z.object({ name: z.string(), version: z.string().optional() })).optional(),
  compatibility: z.string().optional(),
  changelog: z.array(z.object({ version: z.string(), date: z.string(), summary: z.string() })).optional(),
});

const catalogSchema: z.ZodType<Catalog> = z.object({
  schema: z.literal(1),
  generated: z.string(),
  marketplace: z.object({ name: z.string(), description: z.string(), owner: z.string() }),
  repo: z.object({ owner: z.string(), name: z.string(), url: z.string(), branch: z.string() }),
  kinds: z.array(kind),
  entries: z.array(entry),
});

describe('data contract', () => {
  it('the indexer output for this repository matches the types the site relies on', () => {
    // Run the real CLI, exactly as `npm run build` does, and read the files the site will fetch.
    const repoRoot = join(__dirname, '../../..');
    const out = mkdtempSync(join(tmpdir(), 'site-contract-'));
    try {
      execFileSync('node', [join(repoRoot, 'scripts/build-index.mjs'), out], {
        cwd: repoRoot,
        stdio: 'pipe',
      });
      const read = (file: string) => JSON.parse(readFileSync(join(out, file), 'utf8')) as unknown;
      const parsed = catalogSchema.parse(read('index.json'));

      expect(parsed.entries.length).toBeGreaterThan(0);
      for (const e of parsed.entries) {
        // every entry has a detail file the site can fetch, with the same id
        expect((read(e.detail) as { id: string }).id).toBe(e.id);
      }
      // ids are unique, since routes and lookups rely on them
      expect(new Set(parsed.entries.map((e) => e.id)).size).toBe(parsed.entries.length);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
