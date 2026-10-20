# sdd-engineering

Spec-Driven Development (SDD) for Claude Code: a request becomes an approved requirements spec, then a phased plan, then implemented and verified code. Four agents do the work, and two skills run and review the whole pipeline.

| | |
|---|---|
| Version | 1.0.0 (see [CHANGELOG](CHANGELOG.md)) |
| Agents | `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier` |
| Skills | `run-plan`, `workflow-retro` |
| Depends on | [`engineering-paved-path`](../engineering-paved-path/README.md) `^1.0.0`, [`research-tools`](../research-tools/README.md) `^1.0.0`, [`architecture-review`](../architecture-review/README.md) `^1.0.0` |

## Install

In a Claude Code session:

```
/plugin marketplace add vzhut/zhut-ai-marketplace
/plugin install sdd-engineering@zhut-ai-marketplace
/reload-plugins
```

Or from a terminal:

```bash
claude plugin marketplace add vzhut/zhut-ai-marketplace
claude plugin install sdd-engineering@zhut-ai-marketplace
```

The three dependencies are installed with it. Runtime requirements: `git`, and whatever your project needs to run its own tests and typecheck.

## How it works

```
request ──▶ spec-creator ──(parallel)──▶ researcher × N          (research-tools)
               │
               ▼
        <date>-<feature>.md   Status: draft
               │   open questions? parent asks the user, then edits or re-invokes
               ▼
        human sets Status: approved
               ▼
        implementation-planner ──▶ <spec>.plan.md + <spec>.tasks.md
               │   unclear requirement / execution mode? parent asks the user
               ▼
        /sdd-engineering:run-plan <plan>
               │
               ├─ Phase A  implementer (single pass, or parallel waves per task)
               ├─ Phase B  architecture-reviewer ∥ plan-verifier        (architecture-review)
               ├─ Phase C  bounded fix loop (default 3 rounds)
               └─ Phase E  Delivery log + handoff
               ▼
        /sdd-engineering:workflow-retro   (manual only: cost and friction of the run)
```

### Who does what

| Piece | Role | Model | Tools | Writes |
|---|---|---|---|---|
| `spec-creator` | Turns a request (plus any design material you supply) into an EARS-format requirements spec | opus | Read, Grep, Glob, Write, Edit, Bash, WebFetch, Agent, Skill | one spec file and its index row |
| `implementation-planner` | Reviews the approved spec against the repo and writes a phased plan with task cards | opus | Read, Grep, Glob, Bash, Write, Skill | `<spec>.plan.md`, `<spec>.tasks.md` |
| `implementer` | Executes one task (or the whole plan) inside its owned paths and checks its own work | sonnet | Read, Grep, Glob, Edit, Write, Bash, Skill | files in the task's owned paths |
| `plan-verifier` | Checks the code against every requirement and task acceptance with executed evidence | sonnet | Read, Grep, Glob, Bash, Skill | nothing |
| `run-plan` (skill) | Drives implementer waves, then both reviewers, then the fix loop | n/a | n/a | the plan's Delivery log |
| `workflow-retro` (skill) | Manual retrospective of a finished multi-agent run | n/a | n/a | one entry in the retro ledger |

From the dependencies: `research-tools:researcher` (spawned by `spec-creator`), `architecture-review:architecture-reviewer` (run by `run-plan`), and the `engineering-paved-path:*` skills the agents load by name.

### Ground rules

- **The parent session talks to the user and commits.** Subagents cannot ask questions. Anything they cannot decide comes back as `Clarification needed`, `Open questions` / `Open decisions`, or `Status: blocked` plus `Questions`; the parent asks you and resumes them with your answers. Agents never run `git commit`, `push` or similar.
- **Files are the contract.** `spec-creator` owns `YYYY-MM-DD-<feature>.md`. `implementation-planner` owns `<spec>.plan.md` and `<spec>.tasks.md` next to it and treats the spec as read-only. Requirement problems go back through the parent, never into an edit of the spec.
- **A human approves the spec.** Planning starts only when `Status: approved`.
- **Execution mode is chosen before planning:** `single-agent` (one implementer pass in dependency order) or `multi-agent` (tasks with disjoint `Owned paths` run in parallel waves).
- **Read-only reviewers.** `plan-verifier` and `architecture-reviewer` change nothing; unconfirmed items are `UNVERIFIED`, not `PASS`.

## Usage

1. **Spec.** Ask for a spec: "Use spec-creator to write a spec for <feature>". Hand it design material if you have any (text, a design-tool link, screenshot paths, or a pointer to existing code). Answer its open questions, then set `Status: approved` yourself.
2. **Plan.** "Use implementation-planner on `<spec path>`". It asks for the execution mode if you haven't said. It ends with `Status: ready` when no decisions are open.
3. **Run.** `/sdd-engineering:run-plan <plan path>` (optionally `fix-cap: <n>`). It stops at the first blocker and asks you.
4. **Review the result and commit** yourself.
5. **Retro (optional).** `/sdd-engineering:workflow-retro` or `/sdd-engineering:workflow-retro deep`. It never runs on its own.

You can also call any agent directly, for example `plan-verifier` on a spec you implemented by hand.

## Project conventions the agents look for

Nothing is hard-coded to one repository. The agents read, in this order: your `CLAUDE.md` / `AGENTS.md`, `README`, `docs/`, and the package manifests. Useful things to document there:

- the verify commands (typecheck, unit, build, integration, end-to-end);
- layering and naming rules, and contract files that must stay in sync;
- files agents must not touch (generated code, lockfiles, vendored directories);
- where specs live (default `specs/`) and where notes on traps are kept (default `INSIGHTS.md`).

## What is not in this plugin

Product specs, secrets, caches and project-specific instructions. Test-writing and documentation agents, and a pre-publish self-review skill, are planned for a later minor release.

## Layout

```
sdd-engineering/
├── .claude-plugin/plugin.json
├── agents/        spec-creator, implementation-planner, implementer, plan-verifier
├── skills/        run-plan, workflow-retro
├── README.md
└── CHANGELOG.md
```

## Known limits

- `architecture-reviewer` and `plan-verifier` run on `sonnet` to save cost; finding quality at that tier is unverified. Watch the first runs.
- `run-plan`'s conversion of review findings into fix tasks is the least-tested part; check the first fix tasks before trusting it unattended.
- Skills from `engineering-paved-path` are loaded on demand with the `Skill` tool by their namespaced name, because plugin agents cannot preload skills from another plugin.
