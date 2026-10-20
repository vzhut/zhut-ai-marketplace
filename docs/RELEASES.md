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
3. Maintainer pushes the tag.
4. Optionally promote to `stable` (below).

## Release channels

Channels are git refs of this marketplace repository; users pick one when adding it.

| Channel | Ref | Audience | Command |
|---|---|---|---|
| latest | `main` | early adopters, internal testing | `claude plugin marketplace add <owner>/zhut-ai-marketplace` |
| stable | `stable` branch | everyone else | `claude plugin marketplace add <owner>/zhut-ai-marketplace#stable` |

Promotion: a maintainer fast-forwards `stable` to a commit that has been on `main` long enough to be trusted and whose plugins are tagged. Only maintainers may push `stable`.

To hold users of a single plugin on an exact version, pin its marketplace entry with `ref` or `sha`.

## Update

```bash
claude plugin marketplace update zhut-ai-marketplace
claude plugin update <plugin>@zhut-ai-marketplace
```

Auto-update is off by default; users enable it in `/plugin`, or admins set `autoUpdate` in managed settings.

## Rollback

1. Move `stable` back to the last good commit/tag (force-push by a maintainer is allowed on this branch only), or pin the plugin entry with `sha`.
2. Fix forward: publish a higher version; never republish an existing version.
3. For a security incident follow [SECURITY](SECURITY.md#if-a-dangerous-release-ships).

## Renames and removals

- Rename: add the old name to `renames` in `marketplace.json`. Changing `name` alone breaks existing installs (`displayName` changes only the label).
- Removal: set `forceRemoveDeletedPlugins: true` only when users must be uninstalled.
