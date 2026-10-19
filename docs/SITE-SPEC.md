# Site spec: Marketplace Catalog (GitHub Pages)

Status: v1 implemented (stack: React + TypeScript + Vite). See sections 13-15 for the design prototype, local development and implementation notes.

## 1. Goal

A public static catalog that lets people find and install anything in this marketplace (plugins, skills, agents, commands, hooks, MCP servers) by describing what they need in plain English, e.g. "I need a skill for architecture review".

## 2. Constraints

- GitHub Pages only: static files, no backend, no database, no server-side search.
- All data is produced at build time by CI and shipped as JSON. All search and state is client-side.
- Frontend stack: React + TypeScript + Vite, as a standalone app in `site/` with its own `package.json` and committed lockfile. Runtime dependencies are kept minimal: `react`, `react-dom`, `minisearch`, `react-markdown` (no `rehype-raw`). No router library, no UI kit, no state library, no CSS framework (plain CSS modules / CSS variables).
- The indexer (`scripts/build-index.mjs`) stays dependency-free Node and runs before the Vite build.
- Vite `base` is `/<repo-name>/` (project Pages URL); asset and data URLs must be relative to it.
- UI language: English. Public site.
- The site has its own workflow, `.github/workflows/site.yml` (display name **Site**), separate from `validate.yml`, which checks the plugin/marketplace harness. Its `build` job runs on every pull request and push; its `deploy` job runs only on `main`, nightly and manually.

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
Boosts: `name` ×4, `keywords` ×3, `description` ×2, `plugin` ×1.5, `body` ×1. Prefix matching on (terms of 2+ chars), fuzzy 0.2 only for terms of 5+ chars (short words would otherwise match unrelated ones, e.g. "zod" ≈ "code"), combine with OR so a natural-language sentence still returns partial matches, ordered by score.

### 5.3 Natural-language queries
No LLM. Query is lowercased, tokenised, stop words removed ("I", "need", "a", "for", "skill", "that" …). Type words ("skill", "agent", "plugin", "command", "hook", "mcp") are lifted out and applied as a type filter hint, not a search term. A small `public/data/synonyms.json` (hand-maintained, e.g. `review ↔ audit`, `docs ↔ documentation`, `test ↔ testing`) expands tokens.

### 5.4 Result behavior
- Empty query: show everything, grouped or sorted by type then name; plugins first.
- A type word in the query narrows results to that type. If nothing of that type matches, results are widened to all types and a note says so (real catalogs often lack e.g. skills for a topic).
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
Real paths (React Router), see section 17. Search state lives in the query string of `/search`: `?q=<text>&type=skill,agent&plugin=<name>&category=<c>&kw=<k>&author=<a>&sort=<s>`. Back/forward navigation works and every URL is shareable.

### 6.5 Keyboard
`/` focus search, `Esc` clear/close detail, `↑/↓` move between cards, `Enter` opens.

### 6.6 Basket
Selected plugins are stored in `localStorage` (try/catch around access, page works without it). The basket drawer shows:
1. Install commands, one per plugin, copyable.
2. `.claude/settings.json` snippet with `extraKnownMarketplaces` and `enabledPlugins` for the selection.

### 6.7 Non-functional UI
- Responsive from 320 px; WCAG 2.1 AA contrast; semantic landmarks, labelled controls, visible focus; results count announced via `aria-live`.
- Light and dark theme following `prefers-color-scheme`, with manual override.
- No third-party requests at runtime (no CDN or analytics). IBM Plex Sans/Mono are bundled with Fontsource (latin subsets), so fonts are served from the site itself.
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

The page lists findings by severity. CI prints the same report in the job summary; errors fail the Site build, warnings do not.

## 9. Feedback

No backend: all feedback goes through prefilled GitHub Issue URLs (`/issues/new?template=…&title=…&body=…`).

- "Report an issue" on each artifact (prefilled with id and path).
- "Request a skill/agent" from the empty-results state (prefilled with the search query).
- Issue templates added under `.github/ISSUE_TEMPLATE/`: `artifact-request.yml`, `artifact-issue.yml`.

## 10. Repository changes

```
scripts/build-index.mjs            CLI: writes site/public/data/ (index.json, health.json, artifacts/*.json)
scripts/lib/catalog.mjs            scanner, validation, health checks
scripts/lib/frontmatter.mjs        YAML-subset parser (nested maps, lists, block scalars)
scripts/catalog.test.mjs           node --test suite for the indexer
scripts/check-bundle-size.mjs      fails CI when initial JS > 150 KB gzip
scripts/copy-404.mjs               copies dist/index.html to dist/404.html (SPA fallback for GitHub Pages)
site/package.json, package-lock.json, tsconfig.json, vite.config.ts, eslint.config.js, .prettierrc
site/index.html                    Vite entry (with <noscript> fallback)
site/src/                          app/, pages/, features/, shared/, context/, hooks/, i18n/, lib/ (section 17; tests next to the code)
site/src/i18n/en.ts                all UI text (section 16); i18n/index.ts is the t() function
site/public/data/synonyms.json     committed; other files in data/ are generated and git-ignored
site/dist/                         build output (git-ignored)
scripts/write-site-summary.mjs     Markdown summary of the built catalog for the job summary
.github/workflows/site.yml         "Site": job `build` (tests, lint, typecheck, build, size) + job `deploy` (main only)
.github/workflows/validate.yml     unchanged: plugin and marketplace harness checks only
.github/dependabot.yml             weekly npm (site) and Actions updates
.github/ISSUE_TEMPLATE/*.yml      artifact-request, artifact-issue
```

Generated JSON is built in CI and must not be committed. Vite's `base` is `/<repository>/` in GitHub Actions (taken from `GITHUB_REPOSITORY`) and `/` locally; `SITE_BASE` overrides it (use `/` for a custom domain).

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

## 13. Design prototype (`docs/design/catalog-prototype/`)

The imported design (a self-contained "dc-runtime" prototype: `index.html` + `support.js`) is kept as a visual reference only. It uses hardcoded mock data (invented plugins, an English translation of the original Ukrainian text), so it is **not deployed**: the published site shows real catalog data only.

- To view it locally: `cd docs/design/catalog-prototype && python3 -m http.server 8000`, then open http://localhost:8000/ (it loads React/Babel from `unpkg.com` and fonts from Google Fonts, so it needs internet access).
- Real-data rule for the site: every card, count, facet and release comes from `data/index.json`, which the indexer builds from `.claude-plugin/marketplace.json` and the plugin directories. Nothing is seeded or synthesised: plugins not listed in the marketplace are not shown, hidden artifacts are not shown, and "What's new" lists only entries parsed from real `CHANGELOG.md` files (it is empty until a plugin has one).

## 14. Local development

```bash
cd site
npm install          # first time only
npm run dev          # builds the catalog index, then starts Vite at http://localhost:5173
```

`npm run dev` runs the indexer first (`predev`), then the Vite dev server with hot reload. After changing a skill, agent or plugin file, re-run `npm run index` (or restart the dev server) and reload; the app only reads `public/data/`.

| Command (in `site/`) | What it does |
|---|---|
| `npm run dev` | Index + dev server with hot reload (no CSP, so HMR works) |
| `npm run build` | Typecheck, index and production build into `dist/` |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm test` / `npm run lint` / `npm run typecheck` | Vitest, ESLint, `tsc --noEmit` |
| `npm run check:size` | Initial JS budget (150 KB gzip) |

Indexer tests run from the repo root: `node --test scripts/*.test.mjs`.

## 15. Implementation notes

Differences from the plan above, and what is deliberately not done yet:

- Facet sections (Plugin, Category, Keywords, Author) are shown only when the current results contain more than one value.
- What's new shows only real `CHANGELOG.md` entries; the home section is hidden and the page shows an empty state until one exists.
- Hero input on the home page hands focus over to the header search once the search page replaces it.
- The "Subscribe" link on What's new points to GitHub's commits Atom feed; a generated per-plugin RSS feed is still a v2 item.
- Not implemented: `↑/↓` navigation between result cards (the command palette supports it), Lighthouse checks in CI, git-tag based release history (changelog comes from `CHANGELOG.md`).
- Descriptions are rendered as plain text; inline markdown such as backticks is shown literally.

## 16. Translations and CI visibility

### Translations
- Every user-facing string lives in one file, `site/src/i18n/en.ts`. Components call `t('section.key', { vars })` from `i18n/index.ts` and contain no literal text, including `aria-label`, `placeholder` and `title` attributes, page titles, kind labels and plural forms.
- Placeholders are `{name}`; plural messages are `{ one, other }` and take a `count` variable. Keys are typed (`MessageKey`), so a typo fails `tsc`.
- A new language is a new file typed as `Messages` (same shape as `en.ts`) registered in `i18n/index.ts`.
- `src/i18n/i18n.test.ts` enforces this in CI: it parses every component with the TypeScript compiler and fails on JSX text, text attributes or capitalised string literals; it also fails on messages that no code references.
- Not covered by the translation file: `site/index.html` (page title, meta description and the `<noscript>` text are static HTML), the health findings and other messages produced by the indexer at build time (English), and the search stop-word list in `lib/search.ts` (search configuration, not UI text).

### CI visibility
- Checks appear separately on a pull request: **validate** (harness: plugin and marketplace validation) and **Site / Build site** (indexer tests, lint, typecheck, unit tests, build, bundle size). On `main` a **Site / Deploy to GitHub Pages** job follows the build.
- The build job writes a summary (artifact counts per type, plugin list, health warnings) to the run's summary page.

## 17. Architecture

### Routing
React Router (declarative mode, `BrowserRouter`) with real paths:

| Path | Page |
|---|---|
| `/` | Home |
| `/search?q=…&type=…` | Search with facets |
| `/plugins/:plugin` | Plugin |
| `/:kind/:plugin/:name` | Artifact; `kind` is `skills`, `agents`, `commands`, `hooks` or `mcp` |
| `/whats-new`, `/get-started`, `/health` | Info pages |
| anything else | Page not found |

- All paths are built in one place, `lib/routes.ts` (`paths.entry(entry)`, `paths.search({…})`), and every page-to-page jump is a real `<Link>`, so Ctrl/middle-click and "copy link" work.
- GitHub Pages has no server-side routing. `npm run build` copies `index.html` to `404.html`, so a deep link such as `/skills/engineering-paved-path/zod` is answered with the app shell and the router renders the page. Pages sends these with HTTP status 404 (browsers render them normally; the pages are not meant for search engines).
- Because paths are nested, assets use an absolute base (`/<repository>/`, see section 10) and the router `basename` comes from `import.meta.env.BASE_URL`.
- The router runs with `useTransitions={false}`: typing in the search box navigates on every keystroke and relies on the URL state being committed synchronously.
- After a page change the app scrolls to the top and focuses the page `<h1>` (`app/useRouteFocus.ts`); typing in the search box and query-string changes do not move focus. There is a skip link, and each page sets the tab title (`app/useDocumentTitle.ts`).
- Only the home page is in the main bundle; every other page is lazy. `ErrorBoundary` catches render errors and failed chunk loads and resets on navigation.

### Folder structure
```
src/app/        App (data loading, routes), Layout (shell, overlays), Header, ErrorBoundary, route focus/title hooks
src/pages/      one file per route (HomePage, SearchPage, PluginPage, ArtifactPage, …)
src/features/   search (cards, facets, URL state hook), basket, palette
src/shared/ui/  Dialog (focus trap), Markdown, BackButton, small display components
src/context/    catalog (static, derived once), basket, copy, ui
src/lib/        pure logic: search, query, routes, links, search-params, install helpers, data access
src/i18n/       en.ts (all text) and t()
```

### State
- `CatalogProvider` holds the loaded catalog plus everything derived from it once (id lookup, counts, search index, top keywords). It never changes, so it does not cause re-renders.
- Basket, "copied" feedback and overlay controls are separate contexts, so a change in one does not re-render consumers of another.
- Search and filters live in the URL, not in React state (`features/search/useSearchState.ts`).

### Data access
- `lib/data.ts` fetches each JSON file once per page load and retries after a failure.
- Data URLs carry `?v=<build id>`; the id changes on every build (commit + run id), so a new deploy never reads cached old JSON while the files keep stable names.
- `lib/contract.test.ts` runs the real indexer on this repository and validates its output with a zod schema bound to the TypeScript types, so the indexer and the site cannot drift apart unnoticed.
- Relative links in markdown (`CHANGELOG.md`, `../other/README.md`) are resolved against the file's location in the repository and open on GitHub (`lib/links.ts`). Images are shown as their alt text because the site's CSP only allows its own images. Markdown is rendered with GitHub-flavoured extensions (tables).

### Accessibility
- Modal overlays (command palette, basket) use `shared/ui/Dialog`: focus moves inside, Tab stays inside, Escape and a backdrop click close it, and focus returns to the opener.
- `eslint-plugin-jsx-a11y` runs in lint. ESLint is pinned to 9.x because the plugin does not support ESLint 10 yet.

### Not done yet
- CSS is still one global stylesheet (`src/styles.css`); CSS Modules are a possible next step.
- No end-to-end tests (Playwright) or automated accessibility audit (axe, Lighthouse) in CI.
- Results are not paginated (every match is rendered); fine for hundreds of artifacts.

### Repository settings
- **Settings → Pages → Source: GitHub Actions** (one time). The `Deploy to GitHub Pages` job cannot publish before this is set.
- The branch ruleset in `.github/rulesets/main.json` requires the **validate** (plugin harness) and **Build site** (site) checks before merging to the default branch. Rulesets in that file are applied by importing it (Settings → Rules → Rulesets → New ruleset → Import a ruleset).

