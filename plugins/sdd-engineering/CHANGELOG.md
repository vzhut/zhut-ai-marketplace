# Changelog

All notable changes to `sdd-engineering`. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/) (see the marketplace's [RELEASES](../../docs/RELEASES.md)).

## [Unreleased]

### Planned (1.1.0)
- Test-writing and documentation agents, and a pre-publish self-review skill.

## [1.0.0] - 2026-10-19

### Added
- Agents: `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`.
- Skills: `run-plan` (implement, review, bounded fix loop), `workflow-retro` (manual retrospective of a multi-agent run).
- README describing the end-to-end flow.

### Changed (relative to the source project)
- No project-specific paths: specs directory, verify commands and notes files are discovered from the project's documentation or passed in.
- Skills are invoked through their plugin namespace (`engineering-paved-path:<skill>`).

### Dependencies
- `engineering-paved-path` `^1.0.0`, `research-tools` `^1.0.0`, `architecture-review` `^1.0.0`.
