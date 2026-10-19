# Spec: SDD plugin set

Status: draft v1. Source: [`vzhut/dev-digest`](https://github.com/vzhut/dev-digest) (`.claude/agents/`, `.claude/skills/`).

## 1. Goal

Package the Spec-Driven Development (SDD) workflow from DevDigest as reusable plugins in this marketplace. One end-user plugin (`sdd-engineering`) delivers the workflow; three dependency plugins deliver the reusable parts.

## 2. Scope

### Included
- `sdd-engineering`: agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`; skills `run-plan`, `workflow-retro`; evals; docs.
- `research-tools`: agent `researcher`.
- `architecture-review`: agent `architecture-reviewer` (generalized).
- `engineering-paved-path`: shared skills used by the agents above.

### Not carried over
Product specs, secrets, cache, DevDigest-specific instructions (`AGENTS.md` rules, `INSIGHTS.md` paths, `client/` `server/` `reviewer-core/` layout, `pnpm` commands). `test-writer` and `doc-writer` are not in this release (see 9).

## 3. Dependency graph

```
sdd-engineering ──depends──▶ engineering-paved-path   ^1.0.0
                ├─────────▶ research-tools           ^1.0.0
                └─────────▶ architecture-review      ^1.0.0
                                   └──depends──▶ engineering-paved-path ^1.0.0
```

`architecture-review` itself depends on `engineering-paved-path` `^1.0.0`, because `architecture-reviewer` loads its architecture skills (`onion-architecture`, `frontend-architecture`, `next-best-practices`, `zod`). `sdd-engineering` still declares all three directly, since its own agents and skills use each of them. `engineering-paved-path` and `research-tools` have no dependencies. All four plugins release independently (tags `<plugin>-vX.Y.Z`, see [RELEASES](RELEASES.md)).

`sdd-engineering/.claude-plugin/plugin.json` declares the dependencies:

```json
{
  "name": "sdd-engineering",
  "version": "1.0.0",
  "dependencies": [
    { "name": "engineering-paved-path", "version": "^1.0.0" },
    { "name": "research-tools", "version": "^1.0.0" },
    { "name": "architecture-review", "version": "^1.0.0" }
  ]
}
```

Because the range is `^1.0.0`, the three dependency plugins must be released as `1.0.0` before `sdd-engineering` (they are `0.1.0` today). Verify the exact `dependencies` syntax against the current Claude Code plugin docs when implementing.

## 4. Layout

```
plugins/
├── sdd-engineering/
│   ├── .claude-plugin/plugin.json
│   ├── README.md                 # how the pieces work together (section 6)
│   ├── CHANGELOG.md              # release history (section 7)
│   ├── agents/
│   │   ├── spec-creator.md
│   │   ├── implementation-planner.md
│   │   ├── implementer.md
│   │   └── plan-verifier.md
│   ├── skills/
│   │   ├── run-plan/SKILL.md
│   │   └── workflow-retro/SKILL.md
│   └── evals/
├── research-tools/
│   ├── .claude-plugin/plugin.json
│   ├── README.md  CHANGELOG.md
│   └── agents/researcher.md
├── architecture-review/
│   ├── .claude-plugin/plugin.json
│   ├── README.md  CHANGELOG.md
│   └── agents/architecture-reviewer.md
└── engineering-paved-path/
    ├── .claude-plugin/plugin.json
    ├── README.md  CHANGELOG.md
    └── skills/<skill>/SKILL.md
```

## 5. Components

### 5.1 `sdd-engineering`

| Component | Type | Model | Tools | Writes |
|---|---|---|---|---|
| `spec-creator` | agent | opus | Read, Grep, Glob, Write, Edit, Bash, WebFetch, Agent, Skill | one requirements spec (EARS) |
| `implementation-planner` | agent | opus | Read, Grep, Glob, Bash, Write, Skill | `<spec>.plan.md` + `<spec>.tasks.md` |
| `implementer` | agent | sonnet | Read, Grep, Glob, Edit, Write, Bash, Skill | files in the task's `Owned paths` |
| `plan-verifier` | agent | sonnet | Read, Grep, Glob, Bash, Skill | nothing (table of PASS/PARTIAL/MISSING with evidence) |
| `run-plan` | skill | n/a | n/a | runs an approved plan: implementer waves, then architecture-reviewer + plan-verifier, then a bounded fix loop |
| `workflow-retro` | skill | n/a | n/a | manual-only retro of a finished multi-agent run; appends to a retro ledger |

Adaptation rules when porting (from the release steps):
1. Remove DevDigest paths (`specs/`, `docs/retro/ledger.md`, `INSIGHTS.md`, package names, `AGENTS.md` commands) and replace them with explicit inputs: spec directory, verify commands and retro ledger path are passed by the caller or read from the project's `CLAUDE.md`.
2. Invoke skills through the plugin namespace, for example `engineering-paved-path:react-best-practices`, never by bare name.
3. Locate supporting scripts through `${CLAUDE_SKILL_DIR}` (skill files) or `${CLAUDE_PLUGIN_ROOT}` (plugin files), never through `.claude/skills/`.
4. Subagents spawn only `researcher` (`research-tools:researcher`); the parent session owns user questions and commits.
5. The agents' `skills:` frontmatter preloads skills from the same plugin only; skills from `engineering-paved-path` are loaded on demand with the `Skill` tool. Verify cross-plugin preloading before relying on it.

### 5.2 `research-tools`
`researcher`: read-only (Read, Grep, Glob, Bash, WebFetch, WebSearch), sonnet. Returns findings, evidence and confidence. Remove the DevDigest wording; keep the hard read-only constraints.

### 5.3 `architecture-review`
`architecture-reviewer`: read-only (Read, Grep, Glob, Skill), sonnet. The DevDigest version is tied to `onion-architecture` and `frontend-architecture` for `client/` and `server/`. The generalized version reviews layering and placement against whichever architecture skills the project provides (from `engineering-paved-path` or the project itself) and takes the diff or file list as input.

### 5.4 `engineering-paved-path`: shared skills
The skills the agents use, with the proposed home:

| Skill | Used by | In `engineering-paved-path`? |
|---|---|---|
| `react-best-practices`, `next-best-practices`, `react-testing-library` | spec-creator, planner, implementer, reviewer | yes (frontend) |
| `fastify-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design` | planner, implementer | yes (backend) |
| `onion-architecture` | all four SDD agents, reviewer | yes (architecture) |
| `zod`, `typescript-expert` | planner, implementer, reviewer | yes (full-stack) |
| `security` | spec-creator, planner, implementer | yes |
| `mermaid-diagram` | spec-creator, planner | yes (shared) |
| `frontend-architecture` | spec-creator, planner, verifier, reviewer | yes; generalize first: remove DevDigest's `client/` layout |
| `engineering-insights` | planner, implementer | yes; generalize first: the insights file path becomes an input instead of per-package `INSIGHTS.md` |
| `pr-self-review` | manual, not an agent dependency | no for v1: not in the requested set; ships many DevDigest-coupled scripts |
| `writing-for-agents` | spec-creator | no: it is not in the source repository (it comes from a personal global skill set with unknown license); the reference was removed from `spec-creator` |

Reuse rule: a skill used by more than one plugin lives in `engineering-paved-path` and is referenced by namespace. A skill used by one plugin only lives in that plugin. No skill is copied between plugins.

## 6. `sdd-engineering/README.md` contents

1. What SDD is and the 5-phase flow.
2. The pipeline diagram (Mermaid):

```
request ─▶ spec-creator ─(parallel)─▶ researcher × N
              │
              ▼
          spec (Status: draft) ── human approves ──▶ implementation-planner
              ▼
          plan + tasks ─▶ /run-plan ─▶ implementer (waves)
              ▼
          architecture-reviewer ∥ plan-verifier ─▶ fix loop (cap 3)
              ▼
          /workflow-retro (manual)
```
3. Who does what: parent session talks to the user and commits; subagents return `Clarification needed` / `Open questions` / `Status: blocked` instead of asking.
4. File contract: spec (`<date>-<feature>.md`), plan (`<spec>.plan.md`), tasks (`<spec>.tasks.md`); spec and plan are written by different agents, never the same file.
5. Install, including the three dependencies and the required versions.
6. Agent and skill table (section 5.1), inputs each one expects, runtime requirements (git, Node).
7. Link to `CHANGELOG.md`.

## 7. Versions and releases

- Version lives only in each `plugin.json` (SemVer), per [RELEASES](RELEASES.md). The marketplace entries do not carry `version`; the slides mention a version per entry, which conflicts with that rule, so the existing rule wins.
- Each plugin has a `CHANGELOG.md` in Keep a Changelog format, one section per released version. The marketplace-wide release record stays in [RELEASES](RELEASES.md).
- First release: `engineering-paved-path`, `research-tools`, `architecture-review` at `1.0.0`; `sdd-engineering` at `1.0.0` after them. Tags: `<plugin>-v1.0.0`.
- Marketplace commit or tag after the four entries land fixes the catalog state.

## 8. Registration

`.claude-plugin/marketplace.json` already has the four entries (`name`, `source`, `description`, `category`). Changes: update descriptions, keep `owner` at marketplace level, no `version` in entries. The CI validation and `scripts/build-index.mjs` must accept agents with `skills`/`dependencies` fields.

## 9. Implementation steps

1. Copy the 6 agents and 2 skills from dev-digest into the plugin layout; apply the porting rules (5.1).
2. Copy and, where needed, generalize the shared skills into `engineering-paved-path`; rename references to namespaced form.
3. Write per-plugin READMEs and CHANGELOGs; write the SDD README (section 6).
4. Set versions, declare dependencies, update marketplace entries.
5. Run CI validation (`check-hygiene`, `build-index`) and grep for leftovers: `DevDigest`, `.claude/`, `AGENTS.md`, `INSIGHTS`, `pnpm`.
6. Smoke test in a clean project: install `sdd-engineering` only and confirm the three dependencies install and `/run-plan` resolves namespaced skills.
7. Tag and release.

## 10. Decisions

1. `frontend-architecture`, `engineering-insights` are generalized and shipped in `engineering-paved-path` 1.0.0 (5.4); `writing-for-agents` is not bundled (it is not in the source repository and its license is unknown).
2. `test-writer`, `doc-writer`, `pr-self-review` are deferred to `sdd-engineering` 1.1.0 (MINOR).
3. `architecture-reviewer` stays on `sonnet`; watch finding quality over the first runs.
4. Licenses: before the first public release, trace the origin of each third-party skill (`fastify-best-practices`, `zod`, `next-best-practices`, ...), add a `NOTICE` where required, and drop any skill that cannot be redistributed. This blocks step 7 of section 9.
