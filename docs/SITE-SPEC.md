# Site spec: Marketplace Catalog (GitHub Pages)

Status: draft v1 (stack: React + TypeScript + Vite). Replaces the previous stub.

## 1. Goal

A public static catalog that lets people find and install anything in this marketplace (plugins, skills, agents, commands, hooks, MCP servers) by describing what they need in plain English, e.g. "I need a skill for architecture review".

## 2. Constraints

- GitHub Pages only: static files, no backend, no database, no server-side search.
- All data is produced at build time by CI and shipped as JSON. All search and state is client-side.
- Frontend stack: React + TypeScript + Vite, as a standalone app in `site/` with its own `package.json` and committed lockfile. Runtime dependencies are kept minimal: `react`, `react-dom`, `minisearch`, `react-markdown` (no `rehype-raw`). No router library, no UI kit, no state library, no CSS framework (plain CSS modules / CSS variables).
- The indexer (`scripts/build-index.mjs`) stays dependency-free Node and runs before the Vite build.
- Vite `base` is `/<repo-name>/` (project Pages URL); asset and data URLs must be relative to it.
- UI language: English. Public site.
- Build runs on every push to `main` (existing `pages.yml`) and may also run on a nightly `schedule` and `workflow_dispatch`.

### Decision required before publishing

`README.md` calls this repo private, but the site is public. Everything indexed (including SKILL.md bodies) becomes publicly readable. Before the first deploy, either make the repo public, or confirm the content is safe to publish and apply the exclusion rules in section 4.4. Pages for private repos also depends on the plan.

## 3. Scope

### v1 (this spec)
1. Artifact indexer (build time)
2. Client-side search with cards
3. Facets and shareable URL state
4. Artifact detail view
5. Install helpers: copy command, plugin "basket" generating `settings.json` snippet
6. Catalog health report (CI + page)
7. Feedback links via GitHub Issues
8. Accessibility, dark/light theme, mobile layout

### Out of scope for v1 (v2 candidates)
Changelog from git history, relationship graph, token-cost estimates, contributor generator, RSS, semantic (embedding) search, analytics/ratings/install counters (need external service).

## 4. Data pipeline

### 4.1 Build script
`scripts/build-index.mjs` (Node 22, zero dependencies) is extended to emit:

- `site/public/data/index.json`: search index payload (all artifacts, trimmed)
- `site/public/data/health.json`: catalog quality findings
- `site/public/data/artifacts/<id>.json`: optional full body per artifact (lazy-loaded by detail view, keeps `index.json` small)

Vite copies `public/` into `dist/` unchanged, so the app fetches these at runtime from `<base>data/…`.

The script fails the build on invalid data (see 4.5).

### 4.2 Sources scanned

For each plugin listed in `.claude-plugin/marketplace.json` (`source` dir), read:

| Type | Location | Metadata |
|---|---|---|
| plugin | `.claude-plugin/plugin.json` + marketplace entry | name, version, description, author, category, keywords |
| skill | `skills/*/SKILL.md` | frontmatter `name`, `description`; body |
| agent | `agents/*.md` | frontmatter `name`, `description`, `tools`, `model`; body |
| command | `commands/*.md` | frontmatter `description`, `argument-hint`; body |
| hook | `hooks/hooks.json` | events, matchers |
| mcp | `.mcp.json` | server names, transport |

Custom component paths declared in `plugin.json` must be honoured. Missing directories are not errors. Frontmatter is parsed by a small built-in parser (YAML subset: scalars, lists, quoted strings).

### 4.3 Artifact record

```json
{
  "id": "research-tools/skill/web-research",
  "type": "skill",
  "name": "web-research",
  "plugin": "research-tools",
  "category": "research",
  "description": "…",
  "keywords": ["…"],
  "body": "first ~2000 chars of plain text, markdown stripped",
  "path": "plugins/research-tools/skills/web-research/SKILL.md",
  "url": "https://github.com/<owner>/zhut-ai-marketplace/blob/main/<path>",
  "install": "claude plugin install research-tools@zhut-ai-marketplace",
  "version": "0.1.0",
  "updated": "2026-10-19"
}
```

`updated` comes from `git log -1 --format=%cs -- <path>` (CI checkout uses `fetch-depth: 0`). `<owner>` is derived from `GITHUB_REPOSITORY`, with a local fallback.

### 4.4 Exclusions
Files or plugins can opt out with `site: false` in frontmatter or `"x-site": { "hidden": true }` in `plugin.json`. Hidden items never enter any JSON output. The build also scans indexed text for secret-like patterns (tokens, private keys) and fails if found.

### 4.5 Validation (build fails)
- Duplicate `id`
- Plugin `source` directory missing (existing rule)
- Skill/agent without `name` or `description`
- Malformed frontmatter or JSON

Warnings (do not fail; go to `health.json`): see section 8.

### 4.6 Size budget
`index.json` target: under 1 MB uncompressed (GitHub Pages serves gzip). If exceeded, body text is cut to 800 chars, and beyond 2 MB the build fails and asks for chunking.

## 5. Search

### 5.1 Engine
MiniSearch (npm dependency, exact version pinned). The index is built in the browser on load from `data/index.json` inside a `useSearchIndex` hook (memoised, built once; expected under 50 ms for hundreds of artifacts).

### 5.2 Fields and ranking
Boosts: `name` ×4, `keywords` ×3, `description` ×2, `plugin` ×1.5, `body` ×1. Prefix matching on, fuzzy 0.2, combine with OR so a natural-language sentence still returns partial matches, ordered by score.

### 5.3 Natural-language queries
No LLM. Query is lowercased, tokenised, stop words removed ("I", "need", "a", "for", "skill", "that" …). Type words ("skill", "agent", "plugin", "command", "hook", "mcp") are lifted out and applied as a type filter hint, not a search term. A small `public/data/synonyms.json` (hand-maintained, e.g. `review ↔ audit`, `docs ↔ documentation`, `test ↔ testing`) expands tokens.

### 5.4 Result behavior
- Empty query: show everything, grouped or sorted by type then name; plugins first.
- No results: message, suggestions (closest tags), and a "Request this" link (section 9).
- Each result shows which field matched (name / description / content) and highlights terms.
- Search runs on input with 100 ms debounce.

## 6. UI

Single-page React app, no router: the "route" is the query string (6.4), read and written through a `useUrlState` hook (`history.pushState` + `popstate`). Suggested components: `SearchBar`, `Facets`, `ResultGrid`, `ArtifactCard`, `ArtifactDetail`, `BasketDrawer`, `HealthPage` (shown at `?view=health`). State lives in React (`useReducer` + context for basket); no external state library. Function components and hooks only, strict TypeScript, ESLint + Prettier.

### 6.1 Layout
- Header: title, search input (autofocus), basket button with count, theme toggle.
- Left (or top on mobile): facets (Type, Plugin, Category, Keywords) with counts that update with the query.
- Main: result count, sort (Relevance / Name / Recently updated), grid of cards.

### 6.2 Card
Type badge, name, plugin, one-line description (clamped to 3 lines), category chip, updated date, actions: **Copy install**, **Open** (detail), **View on GitHub**, **Add to basket** (plugins only; for other types, adds their parent plugin).

### 6.3 Detail view
`?id=<artifact id>` opens a panel/route with: full metadata, rendered body (loaded from `data/artifacts/<id>.json`, rendered with `react-markdown`; raw HTML is not allowed, links get `rel="noopener noreferrer"`), install command, GitHub link, "Report an issue" link, and for a plugin: list of contained artifacts.

### 6.4 URL state
`?q=<text>&type=skill,agent&plugin=<name>&category=<c>&sort=<s>&id=<id>`. Back/forward navigation works. Shareable.

### 6.5 Keyboard
`/` focus search, `Esc` clear/close detail, `↑/↓` move between cards, `Enter` opens.

### 6.6 Basket
Selected plugins are stored in `localStorage` (try/catch around access, page works without it). The basket drawer shows:
1. Install commands, one per plugin, copyable.
2. `.claude/settings.json` snippet with `extraKnownMarketplaces` and `enabledPlugins` for the selection.

### 6.7 Non-functional UI
- Responsive from 320 px; WCAG 2.1 AA contrast; semantic landmarks, labelled controls, visible focus; results count announced via `aria-live`.
- Light and dark theme following `prefers-color-scheme`, with manual override.
- No third-party requests at runtime (no CDN fonts or analytics). System font stack.
- Without JS: `<noscript>` in `index.html` shows a link to the GitHub repo and the install commands (the catalog itself requires JS).
- Content-Security-Policy meta tag: `default-src 'self'` (Vite output has no inline scripts).
- Code-split the detail view and health page (`React.lazy`) to keep the initial bundle small.

## 7. Install helpers

Install command per plugin: `claude plugin install <plugin>@<marketplace>`. Marketplace add command shown once at the top: `claude plugin marketplace add <owner>/zhut-ai-marketplace`. Copy uses the Clipboard API with a text-selection fallback and a visible "Copied" confirmation.

## 8. Catalog health

`health.json` is generated in CI and rendered on `health.html`. Checks:

- Artifact with missing/short description (< 20 chars)
- Plugin with no version, no author, or no components
- Plugin in `plugins/` not listed in `marketplace.json`, and vice versa
- Near-duplicate descriptions (token Jaccard similarity ≥ 0.8)
- Not updated in over 180 days
- Oversized SKILL.md (> 500 lines)

The page lists findings by severity. CI prints the same report in the job summary; errors fail `validate.yml`, warnings do not.

## 9. Feedback

No backend: all feedback goes through prefilled GitHub Issue URLs (`/issues/new?template=…&title=…&body=…`).

- "Report an issue" on each artifact (prefilled with id and path).
- "Request a skill/agent" from the empty-results state (prefilled with the search query).
- Issue templates added under `.github/ISSUE_TEMPLATE/`: `artifact-request.yml`, `artifact-issue.yml`.

## 10. Repository changes

```
scripts/build-index.mjs          extended (4.1-4.6), writes to site/public/data/
scripts/lib/frontmatter.mjs      small parser
site/package.json, package-lock.json, tsconfig.json, vite.config.ts, eslint config
site/index.html                  Vite entry (with <noscript> fallback)
site/src/                        main.tsx, App.tsx, components/, hooks/, lib/search.ts, styles/
site/public/data/                generated JSON (git-ignored) + synonyms.json (committed)
site/dist/                       build output (git-ignored)
.github/workflows/pages.yml      see below
.github/workflows/validate.yml   build-index, health check, lint, typecheck, tests
.github/ISSUE_TEMPLATE/*.yml
```

`pages.yml` steps: checkout (`fetch-depth: 0`) → setup-node 22 with npm cache keyed on `site/package-lock.json` → `node scripts/build-index.mjs` → `npm ci && npm run build` in `site/` → `actions/upload-pages-artifact` with `path: site/dist` → deploy. Optional nightly `schedule` and `workflow_dispatch` triggers.

Generated JSON is built in CI and must not be committed: remove the currently committed `site/index.json` from git and add `site/public/data/*.json` (except `synonyms.json`), `site/dist` and `node_modules` to `.gitignore`. For local dev, `npm run dev` in `site/` runs the indexer first (`predev` script).

## 11. Testing and acceptance

Indexer tests use `node --test` (built in): frontmatter parser, each artifact scanner (fixtures under `scripts/__fixtures__/`), and a failing build for each validation rule in 4.5.

Frontend tests use Vitest + React Testing Library:
- Search ranking: a fixed set of queries returns the expected top result (e.g. "architecture review" → `architecture-review`); query parsing lifts type words into filters.
- `useUrlState` round-trips filters, and basket output matches a valid `settings.json` snippet.
- Components: card actions (copy, add to basket), facet counts, empty-results state.

CI also runs `tsc --noEmit` and ESLint.

Acceptance criteria:
1. Every skill, agent, command, hook and MCP server in `plugins/` appears in the index and as a card.
2. Typing "I need a skill for research" shows `skill`-type results about research first, with highlights.
3. A filtered, searched view can be shared by URL and reopens identically.
4. Basket produces a valid `settings.json` snippet for the selected plugins.
5. Lighthouse (mobile): Performance ≥ 90, Accessibility ≥ 95; first load transfers under 300 KB gzipped (app bundle + `index.json`); the bundle is checked in CI and the build fails if the initial JS exceeds 150 KB gzipped.
6. A hidden (`site: false`) artifact is absent from every generated file.
7. Health page reports a seeded artifact with an empty description.

## 12. Risks and open items

| Item | Note |
|---|---|
| Public site vs private repo | See section 2; decide before first deploy. |
| Bundle size / dependency churn | React adds a baseline (~45 KB gzipped); dependency list is kept to four packages and updated via Dependabot. |
| Index growth | Mitigated by body trimming and lazy detail files; chunking if > 2 MB. |
| Stale data | Rebuilds on push to `main` and nightly. Changes elsewhere (tags, releases) need a manual dispatch. |
| Keyword search quality | Mitigate with `keywords` in frontmatter and `synonyms.json`; revisit semantic search in v2 if search tests show misses. |
| Plugins currently have no components | Indexer will show only plugin cards until skills/agents are added; fixtures cover the rest. |
