# engineering-paved-path

The shared engineering skills of this marketplace: frontend, backend, architecture, testing, security and workflow helpers. The [`sdd-engineering`](../sdd-engineering/README.md) and [`architecture-review`](../architecture-review/README.md) agents load them by name, and you can install the plugin on its own to give Claude the same guidance in any session.

| | |
|---|---|
| Version | 1.0.0 (see [CHANGELOG](CHANGELOG.md)) |
| Components | 13 skills, no agents |
| Depends on | nothing |
| Used by | `architecture-review`, `sdd-engineering` |

## Install

In a Claude Code session:

```
/plugin marketplace add vzhut/zhut-ai-marketplace
/plugin install engineering-paved-path@zhut-ai-marketplace
/reload-plugins
```

Or from a terminal:

```bash
claude plugin marketplace add vzhut/zhut-ai-marketplace
claude plugin install engineering-paved-path@zhut-ai-marketplace
```

## Skills

Claude loads a skill on demand when its description matches the task. Invoke one explicitly with its namespace, for example `engineering-paved-path:react-best-practices`.

### Frontend

| Skill | Use it for |
|---|---|
| `react-best-practices` | React anti-patterns, state management, hooks rules |
| `next-best-practices` | Next.js App Router, RSC boundaries, data fetching, optimization |
| `react-testing-library` | React Testing Library with Vitest: queries, user events, async |
| `frontend-architecture` | Where frontend code lives: placement, component splitting, promotion, import boundaries |

### Backend

| Skill | Use it for |
|---|---|
| `fastify-best-practices` | Fastify routes, plugins, JSON-schema validation, error handling, performance |
| `drizzle-orm-patterns` | Drizzle schema, queries, relations, transactions, migrations |
| `postgresql-table-design` | PostgreSQL schema design, data types, indexing, constraints |
| `onion-architecture` | Backend layering (ports and adapters): where routes, services, repositories and adapters go, and what each may import |

### Full-stack

| Skill | Use it for |
|---|---|
| `zod` | Zod schemas, parsing, error handling, type inference |
| `typescript-expert` | Type-level programming, performance, tooling, migrations |
| `security` | OWASP Top 10:2025, authentication, injection, uploads, secrets |

### Shared

| Skill | Use it for |
|---|---|
| `mermaid-diagram` | Mermaid diagrams in Markdown (flowcharts, sequence, ERD, ...) |
| `engineering-insights` | Recording non-obvious findings from a session into the project's insights file |

## Architecture skills and your project

`onion-architecture` and `frontend-architecture` give the rules and a default vocabulary. They are written to be project-neutral: they tell the agent to read your `CLAUDE.md` / `AGENTS.md` / `docs/` first and to prefer your folder names, known deviations and accepted exceptions. To get the best results, document a short layer map and placement map in your project.

`engineering-insights` writes to `INSIGHTS.md` per package and at the repository root by default; if your project names its notes file differently, say so in `CLAUDE.md`.

## Layout

```
engineering-paved-path/
├── .claude-plugin/plugin.json
├── skills/<skill>/SKILL.md      plus examples.md, references/ or rules/ where a skill has them
├── README.md
└── CHANGELOG.md
```

## Provenance

Several skills are community or third-party material (for example `fastify-best-practices`, `zod`, `next-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design`, `typescript-expert`, `security`). Their origin and license must be confirmed and recorded here before this marketplace is published publicly. Until then, treat this plugin as internal.
