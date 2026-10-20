# zhut-ai-marketplace

Claude Code plugin marketplace. The repository is public: everything committed here is publicly readable.

## Plugins

| Plugin | Purpose |
|---|---|
| `engineering-paved-path` | Paved-path engineering workflows and conventions |
| `research-tools` | Research and information gathering |
| `architecture-review` | Architecture review helpers |
| `sdd-engineering` | Spec-driven development workflows |

## Install

```bash
claude plugin marketplace add vzhut/zhut-ai-marketplace
claude plugin install research-tools@zhut-ai-marketplace
```

Private repo: git credentials must work non-interactively (SSH key loaded in ssh-agent, or `gh auth login && gh auth setup-git`).

Update: `claude plugin marketplace update zhut-ai-marketplace`, then `claude plugin update <plugin>@zhut-ai-marketplace`.

## Team setup

Add to `.claude/settings.json` of a project:

```json
{
  "extraKnownMarketplaces": {
    "zhut-ai-marketplace": {
      "source": { "source": "github", "repo": "vzhut/zhut-ai-marketplace" }
    }
  }
}
```

## Catalog site

A searchable catalog of everything in this repository (plugins, skills, agents, commands, hooks, MCP servers), published to GitHub Pages by `.github/workflows/site.yml`.

```bash
cd site && npm install && npm run dev   # http://localhost:5173, index is rebuilt on start
```

See [Site spec](docs/SITE-SPEC.md) for the architecture and the other commands.

## Docs

- [Plugin guidelines](docs/PLUGIN-GUIDELINES.md)
- [Security](docs/SECURITY.md)
- [Releases](docs/RELEASES.md)
- [Site spec](docs/SITE-SPEC.md)
- [Cost baseline](docs/COST-BASELINE.md)
- [Contributing](CONTRIBUTING.md)
