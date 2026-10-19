---
name: frontend-architecture
description: "Where code lives and how it is split in a React / Next.js App Router frontend (with a data-fetching library such as TanStack Query). Use this whenever you add a new page, component, hook, constant, helper, type, API call or business rule to the frontend and have to pick a file/folder for it; when a component or page file has grown big and needs splitting; when code from one route is needed by another (moving it to shared components or lib); when asked about folder structure, utils/helpers/constants placement, where business logic should go, private route folders, index.ts/barrels or import paths; and when reviewing a frontend change for structure. Use it even if the user never says 'architecture': any 'where should this go' or 'this file is too big' in a frontend qualifies. Not for how to write React code itself (react-best-practices) or Next.js API mechanics (next-best-practices)."
metadata:
  version: 1.0.0
  stack: next (App Router), react, "@tanstack/react-query" (the rules apply to similar stacks)
---

# Frontend Architecture — where client code lives

Answers one question: **"I have this piece of code — where does it go, and how do I split it?"**
The goal is that anyone (human or agent) can guess where a file is without searching, and that moving or deleting a feature touches one folder instead of five.

**Project map first.** This skill gives the rules and a default layout. Before applying it, read the project's own notes (`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/`) and use their folder names, naming rules, accepted exceptions and known debt; where the project documents a placement map, it wins over the defaults here. In this file `src/` is the frontend source root, `<route>` a route folder, `<Name>` a PascalCase component and `<kebab>` a kebab-case folder name.

Bundled files, loaded only when they're needed:
- [examples.md](examples.md) — before/after. Read it when you're about to split a page/component, promote code to shared, or fix imports.
- [references/sources.md](references/sources.md) — the article or doc behind each rule. Read it only when a rule is challenged.

**Quick procedure** for any new or moved piece of code:
1. What kind of thing is it? → row in §2.
2. How many places use it *now* (not "might later")? One → keep it next to that place. Two+ → lowest common level (§7).
3. Does it touch React? No → it's pure and goes to `helpers.ts` / `lib/<concept>.ts` (§4).
4. Check the import you'll need is allowed (§8). If not, the file is in the wrong place — move it, don't reach across.

Neighbours (link, don't repeat):
- How to write components, hooks, state, effects → `react-best-practices`
- Next.js mechanics (special files, RSC, route handlers) → `next-best-practices`
- Tests → `react-testing-library`

Strategy: Next.js *"split by feature or route"* — route-local code is colocated in `app/**/_components/`, code used by 2+ routes lives in `src/components/` or `src/lib/`. There is no catch-all `features/` or `utils/` folder; don't add one unless the project has it.

---

## 1. The map

```
src/
├── app/                         routes only + their colocated code
│   ├── layout.tsx               root layout (providers)
│   └── <route>/
│       ├── page.tsx             thin: renders <Name>View
│       ├── constants.ts         route-level, shared by this route's _components  (optional)
│       ├── helpers.ts           route-level pure functions                       (optional)
│       └── _components/<Name>/  route-local components (private folder, not routed)
├── components/<kebab-name>/     UI used by 2+ routes
├── lib/
│   ├── api.ts                   the ONLY place that calls fetch
│   ├── hooks/<domain>.ts        data hooks over api.ts, per domain
│   ├── <kebab-name>.ts          shared pure logic / formatting
│   ├── <kebab-name>.tsx         app-wide providers/context
│   └── types.ts                 client-only types (+ re-exports of shared contract types)
└── i18n / messages              strings, one namespace per area (if the project localizes)
```

## 2. Placement table — "I have X → it goes to Y"

| I have… | Goes to | Notes |
|---|---|---|
| A new route | `app/<route>/page.tsx` + `app/<route>/_components/<Name>View/` | Page renders the View, nothing else (§5) |
| A component used by one route | `app/<route>/_components/<Name>/<Name>.tsx` | Nearest route that uses it |
| A piece of one component | `…/<Parent>/_components/<Child>/<Child>.tsx` | Nest under the parent that owns it |
| Trivial markup-only pieces (label/value rows, tiles) used across one component tree | `…/<Parent>/_components/atoms.tsx` | No state, no logic, not tested alone |
| A component used by 2+ routes | `components/<kebab-name>/<PascalName>.tsx` | Promote (§7) |
| A constant used by one component | `<Name>/constants.ts` | `UPPER_SNAKE_CASE` |
| A constant used by several components of one route | `app/<route>/constants.ts` | |
| A constant used by 2+ routes | `lib/<kebab-name>.ts` (next to the logic it belongs to) | |
| A pure function (format, filter, sort, map) for one component | `<Name>/helpers.ts` | No React, no hooks, no JSX |
| …for one route | `app/<route>/helpers.ts` | |
| …for 2+ routes | `lib/<kebab-name>.ts` | One module per concept, not a `utils.ts` dump |
| A business rule / domain calculation | `helpers.ts` or `lib/<concept>.ts` — **never inside the component body** | Pure, unit-tested |
| Styles | the project's styling convention (e.g. `<Name>/styles.ts`, CSS modules) | Inline `style` only for one-off trivial values |
| A type used by one file | Declare in that file | |
| A type shared inside one component folder | `<Name>/types.ts` | |
| A wire/API contract type | the shared contract package — never redefine | Client-only view types → `lib/types.ts` |
| Stateful UI logic of one component (keyboard nav, measuring, local reducers) | `<Name>/use<Thing>.ts`; several → `<Name>/hooks/` with `index.ts` | |
| Server data (read or mutate) | `lib/hooks/<domain>.ts` hook over `lib/api.ts` | Components don't call `fetch` / `api.*` directly — query keys, polling and invalidation stay in one place |
| A new API endpoint call | a method on `api` in `lib/api.ts` | |
| App-wide context/provider | `lib/<kebab-name>.tsx`, mounted in one providers file | Context only when prop drilling is real, not pre-emptively |
| UI text | the project's i18n files, key `<component>.<key>` | Never hard-code user-visible strings when the project localizes |
| A test | Next to the file: `<Name>.test.tsx`, `helpers.test.ts` | |

If nothing fits: put it next to its only consumer and promote later.

## 3. Component folder anatomy

```
<Name>/
├── <Name>.tsx          the component; named export `export function <Name>`
├── index.ts            export { <Name> } from "./<Name>";   (+ public types if any)
├── styles.ts           styling, if the project keeps styles in code
├── constants.ts        static data; no functions with logic
├── helpers.ts          pure functions; may import constants.ts, never React
├── types.ts            only if 2+ files in the folder share types
├── use<Thing>.ts       component-specific hook (or hooks/ when several)
├── <Name>.test.tsx     component test;  helpers.test.ts for pure logic
└── _components/<Child>/  sub-components, same anatomy
```

- Create a file only when it has content — a component with no constants has no `constants.ts`.
- Inside `app/` sub-components go in `_components/` (Next private folder). Inside `src/components/<kebab>/` there is no routing, so sub-components are plain `PascalName/` folders.
- Export components by name. Default exports only where Next requires them (`page`, `layout`, `error`, `loading`, …).

## 4. Layers — where business logic lives

| Layer | Lives in | Does | Must not |
|---|---|---|---|
| View | `<Name>.tsx` | Render props/state, wire events to handlers | Compute domain values inline, call `api`, hold long logic blocks |
| State | `use<Thing>.ts`, `lib/hooks/<domain>.ts` | React state, effects, data fetching, URL params | Contain JSX; contain domain rules that could be pure |
| Domain / pure logic | `helpers.ts`, `lib/<concept>.ts` | Calculations, grouping, filtering, formatting, validation | Import React or touch the network |
| API | `lib/api.ts` | HTTP, error mapping | Know about components or query caches |

Test: **could this line run in a plain Node unit test with no React?** If yes, it belongs in the pure layer.

Server state stays in the data-fetching cache — don't copy it into `useState` or context. UI state (open/closed, selected tab) lives in the lowest component that needs it; state that must survive reload or be linkable goes into the URL (`?tab=`).

## 5. Pages and the server/client boundary

- `page.tsx` is a **thin server component** (no `'use client'`): it renders one `<Name>View` from `_components` and nothing else. Why: the route file then only says *where* the screen is; the View says *what* it does, can be tested like any component, and moving the screen to another URL is a one-line change.
- The View is the client entry. It reads `useParams` / `useSearchParams` itself and composes route components.
- Every file that uses hooks, state, event handlers or browser APIs starts with `'use client'` (explicit per file), unless the project documents another convention.
- `constants.ts`, `helpers.ts`, `styles.ts`, `types.ts`, `lib/<pure>.ts` have **no** `'use client'` — they are safe on both sides.
- If the frontend has a separate backend, it has no backend of its own: no Server Actions, no route handlers, no database access. All data comes from the API through `lib/api.ts`. (Projects that use Next as a full-stack framework document their own rule; follow it.)
- Loading/error/empty states for a page live in its View.

## 6. When to split a component

Split when **any** of these is true — length alone (≈200 lines) is only a prompt to look:

1. A block has **its own state** that the rest of the component doesn't read → move it down into a child ("move state down").
2. You can name a block with **one noun** that isn't the parent's name (header, filter bar, row, tab).
3. A block is **conditionally rendered** as a whole (tab body, modal, drawer, empty state with its own logic).
4. A block is **repeated** in a `.map()` and has more than a couple of elements → `<Item>` child.
5. You want to **test** it in isolation.
6. Another place needs the **same** block → split, then promote (§7).

How, in this order:
1. Pull non-React logic into `helpers.ts` first — often that alone is enough.
2. Pull stateful logic into `use<Thing>.ts`.
3. Only then split JSX into `_components/<Child>/`.
4. If a wrapper doesn't use its children's data, pass them as `children` ("lift content up") instead of threading props.

Don't: split into `renderHeader()` functions inside the component (see `react-best-practices` → render factories); create a child that takes 8+ props just to forward them — the boundary is wrong.

## 7. Promotion ladder — when code moves up

```
<Name>/helpers.ts ──(2nd component in same route)──▶ app/<route>/helpers.ts ──(2nd route)──▶ lib/<concept>.ts
<Name>/_components/X ──(sibling needs it)──▶ app/<route>/_components/X ──(2nd route)──▶ components/<kebab-x>/
```

- **One consumer → stays local.** Don't pre-emptively put things in `lib/` or `components/`.
- **Second consumer → promote to the lowest common level**, not straight to global. `lib/` and `components/` are what every route sees; each thing put there without need makes the shared layer noisier and harder to change safely.
- **Promote only when the semantics are identical.** Two lookalike 3-line helpers with different meaning stay duplicated — duplication beats the wrong abstraction (AHA).
- When promoting: move the file, update imports, move its test with it, delete the old copy. No re-export shim left behind.

## 8. Import boundaries

| From | May import | Must not import |
|---|---|---|
| `app/<route>/**` | its own tree, `@/components/*`, `@/lib/*`, shared packages | another route's `_components` or helpers |
| `components/<kebab>/**` | its own tree, other `@/components/*`, `@/lib/*`, shared packages | anything under `app/` |
| `lib/**` | other `lib/*`, shared packages | `app/`, `components/` |

- A route that needs another route's component → **promote it** (§7), don't reach across.
- **Relative paths only inside the component's own folder tree** (`./helpers`, `./_components/Child`, `../styles` from a child). Everything else via the path alias (`@/lib/hooks/orders`, `@/components/app-shell`) — not `../../../../lib/…`. Why: alias imports survive moving the file (promotion, splitting), and they make boundary violations visible — an `@/app/…` import in `components/` stands out, a `../../../` one doesn't.
- Import another component through its folder (`@/components/diff-viewer`, `../AgentCard`), not its internal files.
- Data hooks: import the domain file (`@/lib/hooks/orders`), not a `@/lib/hooks` barrel.

## 9. `index.ts`

- `index.ts` is the folder's **public API**: named re-exports only — `export { DiffViewer } from "./DiffViewer"; export type { DiffCommentApi } from "./comments";`
- **No `export *`**, anywhere. It makes every importer load every module in the folder (slower dev server and tests, circular-import surprises) and silently turns internals into public API.
- Don't re-export internals (helpers, constants, sub-components) unless an outside consumer genuinely needs them.

## 10. Naming

| Thing | Convention | Example |
|---|---|---|
| Route-local component folder + file | `PascalCase` | `_components/OrderCard/OrderCard.tsx` |
| Shared component folder | `kebab-case`, file inside `PascalCase` | `components/status-badge/StatusBadge.tsx` |
| Shared non-UI module | `kebab-case.ts` | `lib/format-currency.ts` |
| Hook | `use<Thing>` | `useShellCommands.ts`, `useOrders` |
| Module constant | `UPPER_SNAKE_CASE` | `STATUS_RANK` |
| i18n | namespace file `camelCase.json`, keys `component.key` | `orders.panel.statusFilter` |

If the project documents its own naming conventions and they disagree with this table, the project wins — and fix the project's docs or this skill's usage, don't mix both.

## 11. Review checklist

1. Is every new file in the place §2 says? Would a newcomer find it by guessing?
2. Is `page.tsx` thin (renders one View, no hooks, no `'use client'`)?
3. Any `fetch` / `api.*` outside `lib/api.ts` and `lib/hooks/`? Any server data copied into `useState`?
4. Any domain logic (grouping, filtering, formatting, thresholds) inside a component body instead of `helpers.ts` / `lib/`?
5. Any component with state/blocks that §6 says should be a child?
6. Anything placed in `lib/` or `components/` with only one consumer? Anything used by 2 routes but still living in one route's `_components`?
7. Any import that crosses routes, goes `lib → components/app`, or uses a deep `../../../` path?
8. Any new `export *`, default-exported component, or `index.ts` exposing internals?
9. Any hard-coded user-visible string, or wire type redefined instead of taken from the shared contracts?
10. Tests moved along with promoted code?

## Accepted exceptions and known debt

Every real project has some. This skill only fixes the policy: the project's own documentation lists them. Don't "fix" them in an unrelated change, don't cite them as permission, and treat a **new** instance as a review finding, not debt. A project's vendored or generated directories are exempt from these rules and are not edited here.
