# Security

Plugins run code on user machines (hooks, MCP servers, `bin/`, shell commands in skills). Treat every plugin PR as a code-execution review.

## Policy

- **No secrets** in the repo: no tokens, keys, passwords, connection strings. Use `userConfig` with `"sensitive": true` so users supply them locally.
- **No absolute or machine-specific paths** (`/Users/...`, `/home/...`, `C:\Users\...`, usernames, hostnames). Use relative paths, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` or `${CLAUDE_PROJECT_DIR}`.
- Review hooks, `bin/`, `.mcp.json` and every shell command line by line.
- Minimal permissions; writes only to `${CLAUDE_PLUGIN_DATA}` or the project directory; no network calls to unknown hosts.
- Pin external sources with `ref`/`sha`. `npm` sources do not run install scripts.
- The catalog holds no credentials. Private-repo access uses each user's own git credentials.
- Changes to `.claude-plugin/marketplace.json` and workflows require review by the owning team (CODEOWNERS plus the branch ruleset in `.github/rulesets/`).

## Automated checks

`scripts/check-hygiene.mjs` runs in CI and fails on absolute paths and common secret patterns (private keys, GitHub/AWS/API tokens). It is a safety net, not a substitute for review.

## Reporting a vulnerability

Do not open a public issue. Contact the repository owners privately (GitHub private vulnerability reporting, if enabled, or the security contact in CODEOWNERS). Include the plugin, version and reproduction steps.

## If a dangerous release ships

1. **Contain** (within the hour): remove the plugin from `marketplace.json` and merge via an urgent PR, or move the `stable` channel back to the last good tag (see [RELEASES](RELEASES.md)). If users must be uninstalled automatically, set `forceRemoveDeletedPlugins: true` in the marketplace file for that change.
2. **Revoke**: if a secret leaked, rotate it immediately. Deleting it from git history is not enough.
3. **Fix forward**: publish a higher patched version (users only update when `version` changes). Never reuse or move a published tag.
4. **Notify**: announce affected versions, impact, and the required action (`claude plugin marketplace update`, then `claude plugin update`).
5. **Review**: write a short post-mortem, then add a check or checklist item that would have caught it.
