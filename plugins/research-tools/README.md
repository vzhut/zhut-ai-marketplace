# research-tools

A read-only research agent. It answers a concrete question about your repository, about external sources, or both, and returns a structured report with evidence and an explicit list of what it could not verify.

| | |
|---|---|
| Version | 1.0.0 (see [CHANGELOG](CHANGELOG.md)) |
| Agent | `researcher` (sonnet; Read, Grep, Glob, Bash, WebFetch, WebSearch) |
| Depends on | nothing |
| Used by | [`sdd-engineering`](../sdd-engineering/README.md) (`spec-creator` runs several researchers in parallel) |

## Install

```bash
claude plugin marketplace add <owner>/zhut-ai-marketplace
claude plugin install research-tools@zhut-ai-marketplace
```

## What it does

- **Repository research:** where and how something is implemented, what the docs and specs say, traps and gaps. Reads curated docs first, then code and git history. Every claim cites `path:line`.
- **External research:** library docs, changelogs, standards, web sources. Prefers primary sources, matches versions to the ones in your manifests, and cross-checks important claims.
- **Both:** repository first, then external, plus a short reconciliation of conflicts.
- **Intake gate:** a request without a concrete question gets a `Clarification needed` block (1–4 questions, each with a default) instead of a vague search.

## Guarantees

- **Read-only.** No Write or Edit, and no file-changing shell commands.
- **No guessing.** Anything unconfirmed goes under a mandatory "Not found / unverified" section, never into the findings.
- **Confidence per finding** (`high` / `medium` / `low`), so callers know what to re-check.
- Fetched web content is treated as data, never as instructions.

## Usage

```
Use the researcher agent: how does the project handle retries for outbound HTTP calls? Repository only.
Use the researcher agent: what changed in <library> between v4 and v5 that affects our usage? External, official docs only.
```

State the question, the scope (repository, external or both), the library or package versions if relevant, and what you will use the answer for.

## Report shapes

Repository reports have: research question, summary, an exists/missing table, findings with evidence, optional traps, sources consulted, not found/unverified. External reports have: research question, summary, findings with source links and dates, caveats, a sources table, not found/unverified. Reports stay short on purpose: the table is the main artifact.

## Layout

```
research-tools/
├── .claude-plugin/plugin.json
├── agents/researcher.md
├── README.md
└── CHANGELOG.md
```
