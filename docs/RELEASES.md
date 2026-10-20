# Releases

## Versioning

**Decision: explicit SemVer `version` in each plugin's `plugin.json`** (never in the marketplace entry).

Users only receive an update when the computed version changes. Pushing commits without bumping `version` delivers nothing.

- MAJOR: breaking changes (removed or renamed skill/command, changed behavior)
- MINOR: new skills, commands or agents
- PATCH: fixes and docs that affect behavior

Alternative (not used here): omit `version` everywhere so the commit SHA is the version. Do not mix strategies.

## Tags

Each plugin is released independently: tag `<plugin>--vX.Y.Z` (two dashes, for example `research-tools--v1.2.0`) on the merge commit. Claude Code resolves dependency version ranges such as `^1.0.0` against exactly this tag format, so create tags with `claude plugin tag --push` from the plugin directory. Without a matching tag, a plugin referenced by a relative path falls back to the marketplace's current copy and the range is checked when the plugin loads. Tags are immutable: never move or reuse one.

## Release process

1. Bump `version` in `plugins/<name>/.claude-plugin/plugin.json` in the PR.
2. PR approved by the responsible team, CI green, merged to `main`.
3. The `Release tags` workflow tags the merge commit automatically (`<plugin>--vX.Y.Z`, only for versions that have no tag yet). To tag by hand: `claude plugin tag --push` from the plugin directory, or run the workflow manually with `dry_run` off.
4. Optionally promote to `stable` (below).

## Release channels

Channels are git refs of this marketplace repository; users pick one when adding it.

| Channel | Ref | Audience | Command |
|---|---|---|---|
| latest | `main` | early adopters, internal testing | `claude plugin marketplace add vzhut/zhut-ai-marketplace` |
| stable | `stable` branch | everyone else | `claude plugin marketplace add vzhut/zhut-ai-marketplace#stable` |

Promotion: a maintainer fast-forwards `stable` to a commit that has been on `main` long enough to be trusted and whose plugins are tagged. Only maintainers may push `stable`:

```bash
git fetch --tags origin
git push origin <commit-with-all-tags>:refs/heads/stable      # first time, or a fast-forward
```

`stable` currently points at `cfb2068`, the commit that carries `sdd-engineering--v1.0.1` and the `1.0.0` tags of the other three plugins.

Both channels declare the same marketplace name (`zhut-ai-marketplace`), so a project can use only one at a time. Switching channels means removing the marketplace and adding the other one (see Rollback).

To hold users of a single plugin on an exact version, pin its marketplace entry with `ref` or `sha`.

## Update

In a session: `/plugin marketplace update zhut-ai-marketplace`, then `/reload-plugins`. From a terminal (project scope shown; omit `--scope` for user scope):

```bash
claude plugin marketplace update zhut-ai-marketplace
claude plugin update <plugin>@zhut-ai-marketplace --scope project
```

Then `/reload-plugins` or start a new session, and confirm with `claude plugin list --json` that the plugin reports the new `version`. Dependencies resolve against the `<plugin>--vX.Y.Z` tags, so they show a version with a commit suffix, for example `1.0.0-cfb20686e3a8`.

Auto-update is off by default; users enable it in `/plugin`, or admins set `autoUpdate` in managed settings.

## Rollback

Rehearsed on 2026-10-20 in an isolated project with project-scope installs: `sdd-engineering` 1.1.0 (latest) to 1.0.1 (`stable`) and back. There is no `plugin rollback` command; a rollback is a channel switch.

**Before you start**
- The plugins in this marketplace keep no persistent data and declare no `userConfig`. If a plugin ever does, note that `claude plugin marketplace remove` deletes the plugin's saved options, secrets and data (`${CLAUDE_PLUGIN_DATA}`) and has no `--keep-data` flag, so back up `~/.claude/plugins/data/<plugin-id>/` first.
- User files are not plugin data. Specs, plans, notes and retro ledgers live in the project and are untouched by a rollback. Files written by a newer version stay readable by an older one as long as the release notes say the format is unchanged (1.1.0 only adds a `Coverage:` header line).
- The agents write only project files; they never commit, push or call write APIs. If a future plugin changes external state, document its recovery in that plugin's README before releasing.

**Roll back a project to `stable`** (project scope shown):

```bash
claude plugin marketplace remove zhut-ai-marketplace --scope project
claude plugin marketplace add vzhut/zhut-ai-marketplace#stable --scope project
claude plugin install sdd-engineering@zhut-ai-marketplace --scope project
```

Then `/reload-plugins` or start a new session and check `claude plugin list --json`: `sdd-engineering` must show the stable version (1.0.1 at the time of writing) with no `dependency-unsatisfied`, `range-conflict` or `no-matching-tag` entries. Run a smoke eval against the stable ref (see the plugin README for the command).

**Return to latest** once the fix is released:

```bash
claude plugin marketplace remove zhut-ai-marketplace --scope project
claude plugin marketplace add vzhut/zhut-ai-marketplace --scope project
claude plugin install sdd-engineering@zhut-ai-marketplace --scope project
```

**Maintainer side**
1. If `stable` itself must go back, move it to the last good tagged commit (force-push by a maintainer is allowed on this branch only). To hold a single plugin, pin its marketplace entry with `ref` or `sha` instead.
2. Fix forward: publish a higher version; never republish or move an existing tag.
3. For a security incident follow [SECURITY](SECURITY.md#if-a-dangerous-release-ships).

## Renames and removals

- Rename: add the old name to `renames` in `marketplace.json`. Changing `name` alone breaks existing installs (`displayName` changes only the label).
- Removal: set `forceRemoveDeletedPlugins: true` only when users must be uninstalled.
