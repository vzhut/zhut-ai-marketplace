# architecture-review

A read-only architecture reviewer. Give it a diff and it checks layering, placement and import boundaries, then reports findings with `path:line`, the violated rule, a severity and a recommendation.

| | |
|---|---|
| Version | 1.0.0 (see [CHANGELOG](CHANGELOG.md)) |
| Agent | `architecture-reviewer` (sonnet; Read, Grep, Glob, Skill) |
| Depends on | [`engineering-paved-path`](../engineering-paved-path/README.md) `^1.0.0` (the architecture skills it loads) |
| Used by | [`sdd-engineering`](../sdd-engineering/README.md) (`run-plan` Phase B) |

## Install

In a Claude Code session:

```
/plugin marketplace add vzhut/zhut-ai-marketplace
/plugin install architecture-review@zhut-ai-marketplace
/reload-plugins
```

Or from a terminal:

```bash
claude plugin marketplace add vzhut/zhut-ai-marketplace
claude plugin install architecture-review@zhut-ai-marketplace
```

`engineering-paved-path` is installed automatically.

## What it checks

Rules come from your project's own documents first (`CLAUDE.md` / `AGENTS.md`, `ARCHITECTURE.md`, `docs/`), then from skills in `engineering-paved-path`, loaded on demand:

| Area | Skill | Typical checks |
|---|---|---|
| Backend | `engineering-paved-path:onion-architecture` | thin entry points, ORM only in data access, no cross-module imports, adapters isolated, new ports have a test double and wiring, errors and transactions in the right place |
| Frontend | `engineering-paved-path:frontend-architecture` | file placement, thin pages, no raw network calls in components, import boundaries, no `export *` |
| Next.js | `engineering-paved-path:next-best-practices` | server/client boundary placement |
| Contracts | `engineering-paved-path:zod` | parse at the boundary, schemas in the right place, mirrored copies changed together |

It also checks that core packages stay pure (no database, network or filesystem access).

## Guarantees

- **Read-only.** Tools are Read, Grep, Glob and Skill; it cannot write or run commands.
- **Changed lines only.** Existing violations are baseline. Known deviations and accepted exceptions from your docs are listed as "Baseline hits skipped", but copying one into new code is a finding.
- **No evidence, no finding.** Low-confidence observations go under "Questions".
- **Zero findings is a valid result.** It does not invent findings.
- No PASS/BLOCK verdict: the caller decides.

## Usage

The agent has no shell, so give it the diff:

```bash
git diff --name-status main...HEAD > /tmp/review.diff && git diff main...HEAD >> /tmp/review.diff
```

```
Use architecture-reviewer on the diff in /tmp/review.diff (base: main).
```

or paste the unified diff inline. Without a diff it returns a `Clarification needed` block.

### Severity scale

| Severity | Meaning |
|---|---|
| CRITICAL | Breaks the dependency rule in a way that blocks testing or replacing a component, or corrupts a shared contract |
| HIGH | Clear layering or placement violation in new code |
| MEDIUM | Misplaced code that works but will spread, or a missing test double |
| LOW | Naming or structure nit that follows a documented rule |

## Layout

```
architecture-review/
├── .claude-plugin/plugin.json
├── agents/architecture-reviewer.md
├── README.md
└── CHANGELOG.md
```

## Known limits

Runs on `sonnet` to save cost; finding quality at that tier is unverified, so spot-check the first runs. If `engineering-paved-path` skills are unavailable it says so under "Not verified" and reviews against your project documents only.
