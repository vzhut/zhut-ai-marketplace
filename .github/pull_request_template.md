## What and why

<!-- Plugin(s) changed, and the reason. -->

## Checklist (see CONTRIBUTING.md)

- [ ] `claude plugin validate . --strict` and `validate plugins/<name> --strict` pass
- [ ] `node scripts/check-hygiene.mjs` passes (no absolute paths, no secrets)
- [ ] Real install tested locally (`marketplace add ./` + `install`)
- [ ] `name` matches across directory, `plugin.json` and `marketplace.json`
- [ ] `version` bumped in `plugin.json` (or the change is docs-only)
- [ ] Dependencies and requirements documented in the plugin README
- [ ] Hooks, `bin/`, `.mcp.json`, shell commands reviewed line by line
- [ ] Minimal permissions; no unknown network hosts; writes only to `${CLAUDE_PLUGIN_DATA}` or the project
