# Contributing

Everything needed to prepare a plugin PR is on this page. Deeper reference: [PLUGIN-GUIDELINES](docs/PLUGIN-GUIDELINES.md), [SECURITY](docs/SECURITY.md), [RELEASES](docs/RELEASES.md).

## 1. Where files go

```
.claude-plugin/marketplace.json      # catalog: one entry per plugin (CODEOWNERS-protected)
plugins/<plugin-name>/
├── .claude-plugin/plugin.json       # manifest; the ONLY file inside .claude-plugin/
├── README.md                        # what it does, requirements, usage
├── skills/<skill-name>/SKILL.md     # skills
├── commands/<name>.md               # slash commands (prefer skills for new work)
├── agents/<name>.md                 # subagents
├── hooks/hooks.json                 # wrapper form: {"hooks": {...}}
└── .mcp.json                        # MCP servers
```

Everything except `plugin.json` lives at the plugin root, not inside `.claude-plugin/`. Create only the components the plugin needs. Files outside `plugins/<name>/` are not copied on install, so a plugin must not reference them.

## 2. Manifest fields

`plugins/<name>/.claude-plugin/plugin.json`:

| Field | Rule |
|---|---|
| `name` | Required. Must equal the directory name and the marketplace entry. Letters, digits, `.`, `_`, `-`; starts with a letter or digit. Renaming breaks installs. |
| `version` | Required in this repo. SemVer. Set here only, never in the marketplace entry. |
| `description` | Required in this repo. One sentence. |
| `author` | Required in this repo: `{ "name": "..." }`. |

Marketplace entry in `.claude-plugin/marketplace.json`: `name`, `source` (`./plugins/<name>`), `description`, `category`. Do not duplicate `version` there.

## 3. Dependency rules

- Declare every runtime requirement (Node, Python, CLIs, MCP servers) in the plugin's README with minimum versions.
- Prefer no dependencies. Do not commit `node_modules/` or virtualenvs.
- Plugin code must be self-contained: no `..` paths, no files from other plugins or from the repo root.
- Reference plugin files with `${CLAUDE_PLUGIN_ROOT}`; keep persistent state in `${CLAUDE_PLUGIN_DATA}` (the root changes on every update).
- External plugin sources must be pinned with `ref` or `sha`.
- No absolute paths, usernames, or machine-specific values anywhere (see [SECURITY](docs/SECURITY.md)).

## 4. Checks to run before opening a PR

```bash
claude plugin validate . --strict
claude plugin validate plugins/<name> --strict
node scripts/check-hygiene.mjs      # absolute paths and secret patterns
node scripts/build-index.mjs
```

Then test a real install, because `validate` does not catch install-time errors:

```bash
claude plugin marketplace add ./
claude plugin install <name>@zhut-ai-marketplace
```

CI (`validate.yml`) runs the same checks and must be green.

## 5. Making the change

1. Branch from `main`; never push to `main` directly.
2. Add or change `plugins/<name>/`.
3. For a new plugin, add its entry to `marketplace.json`.
4. For any change to released behavior, bump `version` in `plugin.json` (otherwise users receive nothing). See [RELEASES](docs/RELEASES.md).
5. Update `CHANGELOG.md` if present, and the plugin README.
6. Open a PR; the template checklist is mandatory. CODEOWNERS requests review from the responsible team automatically.

## 6. Pull request checklist

This is also in `.github/pull_request_template.md`.

- [ ] `validate --strict` passes for the marketplace and the plugin
- [ ] `check-hygiene.mjs` passes (no absolute paths, no secrets)
- [ ] Real install tested locally
- [ ] `name` matches across directory, `plugin.json` and `marketplace.json`
- [ ] `version` bumped (or the change is docs-only)
- [ ] Dependencies and requirements documented in the plugin README
- [ ] Hooks, `bin/`, `.mcp.json` and shell commands reviewed line by line
- [ ] Minimal permissions; no network calls to unknown hosts; writes only to `${CLAUDE_PLUGIN_DATA}` or the project
