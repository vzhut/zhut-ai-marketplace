# Compatibility

## Claude Code

| | Version |
|---|---|
| Minimum to install and run | **2.1.110** |
| Last version tested | 2.1.304 |
| Needed only to run the evals (`claude plugin eval`) | 2.1.269 |

`sdd-engineering` declares version-constrained dependencies (`^1.0.0`) in `plugin.json`, and installing it pulls in `engineering-paved-path`, `research-tools` and `architecture-review`. The 2.1.110 floor comes from the course material this marketplace follows for version-constrained dependencies; it has not been checked against older releases. If you use a newer Claude Code feature, record it here and raise the minimum.

## Plugin dependencies

| Plugin | Range |
|---|---|
| `engineering-paved-path` | `^1.0.0` |
| `research-tools` | `^1.0.0` |
| `architecture-review` | `^1.0.0` (which itself needs `engineering-paved-path` `^1.0.0`) |

Dependencies resolve against git tags named `<plugin>--vX.Y.Z`. Until a plugin is tagged, a relative-path plugin falls back to the marketplace's current copy and the range is checked at load time.

## Runtime requirements

- `git` (agents read the diff and history; `spec-creator` locates the main checkout with `git rev-parse`).
- Whatever your project needs for its own typecheck and tests. The agents discover the commands from your `CLAUDE.md` / `AGENTS.md` or package scripts; with none found, `implementer` reports the work as not verified instead of guessing.
- Network access only if you ask `spec-creator` to read a design link (`WebFetch`) or `researcher` to search the web.

## Platforms

No hooks, `bin/` files, MCP servers or shell scripts are shipped, so there are no OS-specific requirements.
