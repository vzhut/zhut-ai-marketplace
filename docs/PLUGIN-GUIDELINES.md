# Plugin guidelines

## Layout

```
plugins/<name>/
├── .claude-plugin/plugin.json   # only file inside .claude-plugin/
├── skills/<skill>/SKILL.md
├── commands/  agents/  hooks/hooks.json  .mcp.json   # as needed, at plugin root
```

## Rules

- `plugin.json` requires `name`; add `description` and `author`.
- Component paths in manifests start with `./` and stay inside the plugin directory. Files outside the plugin are not copied on install.
- Use `${CLAUDE_PLUGIN_ROOT}` for plugin files and `${CLAUDE_PLUGIN_DATA}` for persistent state (the root changes on every update).
- Hooks in marketplace entries must be inline objects; put file-based hooks in `hooks/hooks.json`.
- Do not declare `version` in both `plugin.json` and the marketplace entry. See [RELEASES](RELEASES.md).
- Plugin names: letters, digits, `.`, `_`, `-`; unique within the marketplace.
- Dependencies: document runtime requirements (Node, Python, CLIs) in the plugin README.
- Compatibility: declare what the plugin needs in `plugin.json` under `metadata.compatibility` (for example `"Claude Code with plugin dependency support"`). `--strict` validation rejects unknown top-level keys, and the catalog site shows this value on the plugin page.
