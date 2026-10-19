# Examples

The quality bar for an entry. Every pair below is the same finding written badly and well.

## Vague vs. useful

**Vague** (fails the banality test):

> Be careful with the database in tests.

**Useful:**

### Integration tests leak rows between files

`test/orders/orders.it.test.ts:31` · 2026-09-16

Two integration test files that share one database passed alone and failed together: `orders` saw rows
created by `invoices`.

The test runner executes files in parallel workers, but both files truncate tables only in `afterAll`,
so a slow worker still holds its rows while the other one reads.

Truncate in `beforeEach`, or give each worker its own schema (`TEST_SCHEMA=test_${process.env.VITEST_POOL_ID}`).

---

**Vague:**

> Path handling is tricky.

**Useful:**

### CLI entrypoint guard never matches on a path with a space

`src/cli.ts:12` · 2026-09-20

The CLI exited silently with status 0 when run from a checkout whose path contains a space.

`import.meta.url` percent-encodes the space (`%20`) while `process.argv[1]` does not, so the
"am I the entrypoint" comparison is always false.

Compare with `fileURLToPath(import.meta.url) === process.argv[1]`.

## What Doesn't Work (the section most often skipped)

### Retrying the upload inside the request handler

`src/upload/handler.ts:58` · 2026-09-21

Tried wrapping the storage call in a 3-attempt retry inside the handler. Under load this doubled the
request time and exhausted the connection pool, because every retry held its connection while waiting.
Move retries to the background job that already owns the upload; keep the handler single-shot.

## A worked wrap-up

**Session:** added a new scanner to a shared library package and spent 40 minutes on results that vanished.

| Candidate | Verdict |
|---|---|
| Results silently dropped unless the result `kind` is listed in an allow-list constant | **Record** → the library's `INSIGHTS.md` → Codebase Patterns (silent failure, cost 40 minutes) |
| The library is written in TypeScript | Drop: obvious from the code |
| Renamed two variables | Drop: routine |
| Could the allow-list be derived from the schema? | **Record** → Open Questions |

Then, in the final message, name each entry and its file so the user can spot-check:

> Recorded 2 entries: "Results are dropped unless `kind` is in the allow-list" (`lib/INSIGHTS.md`, Codebase Patterns) and
> "Derive the allow-list from the schema?" (`lib/INSIGHTS.md`, Open Questions).

A session that produces no entries is a normal outcome. Say so and stop.

## What not to record

- Restatements of `CLAUDE.md` or `AGENTS.md`. Stable conventions live there; the insights file is for what was learned.
- Anything the code already says: names, types, obvious structure.
- Per-session chatter outside the Session Notes section.
