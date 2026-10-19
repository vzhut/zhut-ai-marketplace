---
name: run-plan
description: >
  Runs the implementation half of the Spec-Driven Development pipeline from an
  already-approved Development Plan: implementer waves (baseline shared once per wave, full
  suite only on the plan's Checkpoint task) -> architecture-reviewer + plan-verifier in parallel
  -> a bounded fix loop on their findings -> Delivery log + handoff. Does NOT run spec-creator or implementation-planner — both are invoked by hand
  before this skill starts — and does NOT run a separate test-writing pass (the implementer already writes tests
  alongside its code). TRIGGER when the user hands
  you a plan path (`<name>.plan.md` + `<name>.tasks.md`, `Status: ready`) and wants it executed
  through review, or says "implement this plan", "run the plan end to end", "take this plan
  through review". DO NOT TRIGGER before a spec/plan exists, or when only one phase is wanted
  (spawn that agent directly instead).
metadata:
  version: 1.0.0
  stack: Claude Code sub-agents
---

# SDD implement

One job: take an **approved, already-planned** feature through implementation, review and a
bounded fix loop. The spec and the plan are made before this skill runs — by hand, with
`spec-creator` and `implementation-planner` — and this skill never spawns either.

You (the session running this skill) are the **parent**: the only one with `AskUserQuestion`, the
only one who commits, the only one who writes a spec's/plan's `## Delivery log`. Subagents return
`Clarification needed` / `Status: blocked` blocks instead of asking. See the plugin README for the
full map.

## Agents used

| Role | Agent |
|---|---|
| implement | `sdd-engineering:implementer` |
| architecture review | `architecture-review:architecture-reviewer` |
| spec compliance | `sdd-engineering:plan-verifier` |
| planning gaps (Phase C) | `sdd-engineering:implementation-planner` |

If an agent is not installed, stop and tell the user which plugin to install; don't substitute.

## Invocation

```
/run-plan <plan path>               # <name>.plan.md, Status: ready, tasks file alongside
/run-plan <plan path> fix-cap: <n>  # override the default fix-loop cap (3)
```

No plan path, the plan doesn't exist, or its `Status` is `needs decisions`/`incomplete` → stop and
say so; don't start implementing against a plan that still has open decisions — send the user back
to `implementation-planner` instead.

## What this skill deliberately skips (cost)

- **No `spec-creator` / `implementation-planner` calls.** Both run manually, outside this skill.
- **No separate test-writing pass.** The implementer writes tests alongside its code already; running a
  separate full coverage pass on top is the kind of redundant work the Checkpoint convention below
  exists to avoid. A real gap (implementer reports "Untestable", or a fix-loop finding needs a
  missing test) is fixed inline as part of that fix task — same `implementer`, same file.
- **No execution-mode question.** The plan already states it (`Execution mode:` in its header) —
  read it, don't ask.
- **`architecture-reviewer` and `plan-verifier` both run on `sonnet`**, not `opus`, to keep cost down.
  Finding quality at that tier is unverified: watch the first few runs.

## Phase A — Implement (`implementer`)

1. **Single-agent mode** (plan header says so): one `implementer` call, handed the whole plan
   path; it runs tasks in dependency order itself.
2. **Multi-agent mode:** first, **one environment precheck**: check the prerequisites the plan's
   tasks need (for example a container runtime or database for integration tests and migrations,
   an end-to-end harness) using the project's documented health commands, and which dev servers
   already listen on their ports. If a needed dependency is missing, ask the user **once**
   (`AskUserQuestion`) before wave 1 instead of starting tasks that will stall. If a dev server
   is running, no agent may run a production build that shares its output directory — say so in
   every affected task prompt. Then walk the plan's Execution waves table. Per wave:
   - Before a package's full-suite checkpoint, check for orphaned test workers from earlier
     agents (`ps aux | grep` for the test runner; kill only ones no live agent owns). A hung
     worker can make a full suite take many times longer and fail timing tests.
   - Run the wave's baseline check yourself once per touched package (the commands the plan's Testing
     strategy lists, which come from the project's documented verify commands), keep the one-line pass/fail summary.
   - Spawn one `implementer` per task, **in parallel** (one message, multiple `Agent` calls) when
     `Owned paths` are disjoint. Each prompt includes: plan path, task ID, tasks-cards file path,
     the wave's baseline summary (so it skips re-running it), and whether its card is
     `Checkpoint: yes`.
   - A task continuing the same package/area from a prior wave → `SendMessage` to the same
     implementer instance instead of a fresh spawn.
3. `Status: blocked` → batch its `### Questions` to the user via `AskUserQuestion`, resume with
   `SendMessage`. Don't stall independent tasks waiting on an unrelated blocked one.
4. After all waves: `git status`/`git diff --stat` yourself against the plan's declared
   `Owned paths` — flag anything outside them.
5. Delivery-log line on the plan (and the spec it points to): `Phase A (implement) — <date> — <N>
   tasks done, waves: <N>`.

## Phase B — Review (`architecture-reviewer` + `plan-verifier`, parallel, both `sonnet`)

1. Generate the diff `architecture-reviewer` needs (it has no Bash): `git diff --name-status
   <base>...HEAD` + the unified diff, saved to a scratchpad file. Pick `<base>` once (branch point
   / merge-base with the default branch) and reuse it for every fix-loop round — the reviewer's "added/changed
   lines only" rule depends on a stable base.
2. One message, both agents: `architecture-reviewer` (diff file + base ref) and `plan-verifier`
   (the plan's spec path — it pulls in the companion `.plan.md`/`.tasks.md` itself). Independent,
   read-only, no need to see each other's output.
3. Delivery-log line: `Phase B (review) — <date> — architecture: CRITICAL <n>/HIGH <n>/MEDIUM
   <n>/LOW <n>; plan-verifier: <verdict>, PASS <n>/PARTIAL <n>/MISSING <n>/UNVERIFIED <n>`.

## Phase C — Fix loop (bounded, default cap 3, override with `fix-cap:`)

**Qualifies for another round:** `architecture-reviewer` CRITICAL/HIGH, or `plan-verifier`
`MISSING`/`PARTIAL`. MEDIUM/LOW and `UNVERIFIED` (integration/e2e/manual-only) never trigger a round —
collect them for the final report; a retry can't resolve what no agent here can check faster.

**Cap hit with qualifying findings still open:** stop, report what's left and why, let the user
decide (another round, accept as known issue, fix it themselves).

Each round:

1. **Classify before assigning:**
   - `architecture-reviewer` finding, or a `plan-verifier` item whose AC *was* covered by a task
     that just didn't finish right → **fix task** for `implementer`, scoped to that finding's
     file(s) + its test file. A correction within the existing plan's intent.
   - `plan-verifier` `MISSING` because **no task in the plan ever covered that AC** → a planning
     gap, not an implementer slip. Send it back to `implementation-planner` (`SendMessage` to the
     same instance if still live, else a fresh call) to add the missing task(s); run those through
     Phase A before re-reviewing. Don't improvise a task yourself here.
2. **Shape each fix task** like `implementation-planner` does: `Action`, `Owned paths`,
   `Depends-on: none` unless two findings share a file, `Risk` from severity, `Acceptance: finding
   resolved + <package> targeted tests + typecheck pass`. Group same-file findings into one task.
3. **Dispatch:** `SendMessage` to the implementer instance that still owns that file/area if live
   and small; otherwise spawn fresh, scoped to just this fix. Independent fix tasks (disjoint
   files) run in parallel.
4. **Re-review:** regenerate the diff against the *same* base ref; re-spawn **fresh**
   `architecture-reviewer` and `plan-verifier` instances (cheap, read-only — a fresh read avoids
   anchoring on what last round claimed was fixed). **Make the re-review incremental** (full re-reads of a nearly identical large diff
   are expensive):
   from round 2 on, hand the architecture-reviewer the diff of **only the files the fix round
   touched** plus the previous round's findings list and say "everything else was clean last
   round"; keep the full diff only for the final pass before Phase E. The plan-verifier still
   re-checks every item but should be told which items changed.
5. Exit on zero qualifying findings, or the cap.

Delivery-log line per round: `Phase C round <k> — <date> — fixed <n>, carried <n>, new <n>`.

## Phase D — Docs (optional)

Only if the plan's `## Affected packages & contracts` or the spec implies docs, or the user asks.
Documentation is not part of this plugin's agents: update docs yourself (or with the project's own
doc agent, if it has one) from the implemented code and the spec.

## Phase E — Wrap-up

1. Final Delivery-log entry: `Phase E (done) — <date> — <summary>, review: clean | <n> items
   deferred, docs: written | not needed`.
2. Summarize the run in under ~10 lines: mode used, round count, anything deferred.
3. Recommend the project's own pre-publish check (self-review, CI) before publishing, and offer
   `/sdd-engineering:workflow-retro` if the user wants a retrospective. **Never** `git commit`/`push`/open
   a PR yourself.

## Known limits

- The finding→task classification in Phase C step 1 is the riskiest part: it improvises task shape
  from a review finding rather than from a human-approved spec. Check early runs' fix tasks before
  trusting them unattended.
- `architecture-reviewer` and `plan-verifier` run on `sonnet`; no comparison run against `opus` on
  the same diff yet.
