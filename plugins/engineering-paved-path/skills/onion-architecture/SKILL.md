---
name: onion-architecture
description: "Onion Architecture (ports & adapters) for backend services, in particular Node.js/TypeScript with an HTTP framework such as Fastify, an ORM such as Drizzle, Zod validation and external SDK adapters. Use this whenever you add or change a backend module, route, service, repository, adapter, port, job handler or pure helper and must decide which file it belongs in and what it may import; when a route handler touches the database, the ORM or an SDK directly; when a service grows or needs a new dependency; when adding an integration with an external system; when deciding where a transaction, a DTO mapping, a domain error or a schema parse goes; and when reviewing a backend change for layering. Use it even without the words 'onion'/'hexagonal'/'clean architecture': any 'where should this backend code go', 'this handler is too fat' or 'how do I add a new endpoint/module' qualifies. Not for HTTP-framework API mechanics (fastify-best-practices), ORM query syntax (drizzle-orm-patterns), table design (postgresql-table-design) or frontend code (frontend-architecture)."
metadata:
  version: 1.0.0
  stack: node, typescript, fastify, drizzle-orm, zod (the rules apply to any stack; examples use these)
---

# Onion Architecture for backend services

This skill answers one question: **"Which ring does this backend code belong to, what may it import, and how do I keep it there?"**
For before/after examples, see [examples.md](examples.md). For the sources behind each rule, see [references/sources.md](references/sources.md).

**Project map first.** This skill gives the rules and a default folder vocabulary. Concrete paths differ per project. Before applying it, read the project's own architecture notes (`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/`) and use their folder names, their known deviations and their accepted exceptions. Where the project documents a layer map, it wins over the defaults here. In this file, `<src>` is the backend source root and `<m>` a feature module.

Neighbouring skills (link to them rather than repeating them):
- HTTP framework mechanics (hooks, plugins, schemas) → `fastify-best-practices`
- ORM query syntax, relations, migrations → `drizzle-orm-patterns`
- Tables, indexes, constraints → `postgresql-table-design`
- Schema authoring → `zod` · secrets and auth → `security`
- Frontend placement → `frontend-architecture`

**Why bother:** the domain rules are the product. SDKs, the ORM and the HTTP framework are replaceable details. When dependencies point inward, the domain logic can be unit-tested without a database or network, and a change of LLM, payment, storage or Git provider stays inside one adapter.

---

## 1. The rings

```
            ┌────────────────────── infrastructure (outer) ──────────────────────┐
            │  driving: <m>/routes · job handlers                                │
            │  driven:  <m>/repository · adapters/<kind>/* (SDK wrappers)        │
            │  wiring:  composition root (container) · app bootstrap             │
            │   ┌────────────────── application services ──────────────────┐     │
            │   │  <m>/service (use cases, transactions)                   │     │
            │   │   ┌──────────────── ports (interfaces) ──────────────┐   │     │
            │   │   │  one interface per external system the app needs │   │     │
            │   │   │   ┌──────────── domain (core) ──────────────┐    │   │     │
            │   │   │   │ shared contracts & types                │    │   │     │
            │   │   │   │ <m>/helpers, constants, pure rules      │    │   │     │
            │   │   │   │ domain errors · pure core packages      │    │   │     │
            │   │   │   └─────────────────────────────────────────┘    │   │     │
            │   │   └──────────────────────────────────────────────────┘   │     │
            │   └──────────────────────────────────────────────────────────┘     │
            └────────────────────────────────────────────────────────────────────┘
```

Identify a file's ring by its **role (file name)**, not by its folder: a `platform/` folder often holds both pure and infrastructure files. Keep modules flat (`routes / service / repository / helpers / constants`) when the project already does; don't add `domain/`, `application/` or `infrastructure/` subfolders on top of a naming scheme that already encodes the rings, because a second scheme splits the codebase in two.

## 2. The dependency rule

> Source-code dependencies point **inward only**. An inner ring never names anything declared in an outer ring: no types, no functions, and no data formats.

| From ↓ · may import → | shared contracts | domain (helpers, constants, errors, pure core) | ports | services | repositories / adapters | framework · ORM · schema · SDKs | container |
|---|---|---|---|---|---|---|---|
| **domain** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **service** | ✅ | ✅ | ✅ | ✅ its own module | via the **port/type** it receives | ❌ (a type-only import of row types is tolerated, §4.3) | ⚠️ only where the project already does; new code receives narrow deps |
| **routes** | ✅ | ✅ | — | ✅ its own module | ❌ | the framework only | resolve context, build the service |
| **repository** | ✅ | ✅ | — | ❌ | ❌ | the ORM and data-layer files only | ❌ (receives the DB handle) |
| **adapters** | ✅ | ✅ shared only | implements | ❌ | ❌ | its own SDK only | ❌ |
| **composition root** | everything: the one place allowed to know every concrete class |

Three corollaries that catch most violations:
1. **Feature module A never imports module B's internals.** Cross-module needs go through the container or move down into shared code.
2. **Adapters never import feature modules or the data layer.** An adapter depends only on its SDK and the port it implements.
3. **Outer data formats stay outside.** SDK payloads, ORM query builders, framework request objects and SQL fragments are never passed into a service or a pure function. Map them at the edge.

## 3. Placement table: "I have X → it goes to Y"

| I have… | Goes to | Ring |
|---|---|---|
| An HTTP endpoint | `<m>/routes`, a thin handler (§4.1) | infra (driving) |
| Request/response shape | Schema: wire contract → shared contracts; route-only params → top of the routes file or a module-shared schema file | boundary |
| A use case (import data, run a job, create an entity) | a method on `<m>/service` | application |
| A business rule or calculation (score, status, cost, grouping, filtering) | a pure function in `<m>/helpers` (or a named file when it is a named concept) | domain |
| A rule reused by 2+ modules | a pure shared module; a wire type → shared contracts | domain |
| A SQL query / insert / upsert | a method on `<m>/repository` (split per entity once it grows) | infra (driven) |
| A row → DTO mapping | `<m>/helpers` | domain (pure mapper) |
| Row types (inferred from the schema) | one data-layer file that exports types only | persistence |
| A new external system (API, CLI, SDK) | port interface + implementation in the adapters layer + test double + lazy getter and override in the container | port + infra |
| An error the caller should see | throw a domain error subclass in the service; the app's error handler renders it | domain |
| A background job | register a handler in the service; the handler only calls a service method | infra (driving) |
| Config / secrets | the config module or secrets provider, read in the container or an adapter, never in a service or helper | infra |
| A module constant | `<m>/constants` (`UPPER_SNAKE_CASE`) | domain |

## 4. Per-tool rules

### 4.1 HTTP framework (e.g. Fastify): the driving adapter
- A handler does four things: **parse** (the route schema), **resolve context** (user, tenant), **call one service method**, and **shape the reply** (status code, DTO). Branching on business state, looping over rows, database access, or `try/catch` around SDK calls inside a handler means the logic is in the wrong ring.
- Validation comes from the route schema (via the framework's type provider), not from a hand-rolled `Schema.parse(req.body)`.
- Build the service once per module plugin, not per request.
- A module is an encapsulated plugin. Don't wrap it in `fastify-plugin` or decorate module internals onto the root instance; decorate only the container. DI goes through the container, not framework decorators, so the same service works from a route, a job or a test.
- Error → HTTP mapping lives only in the app's error handler. Handlers and services throw domain errors; they never call `reply.status(4xx)` for errors.

### 4.2 Schemas (e.g. Zod): parse at the boundary, trust inside
- Parse where untrusted data **enters**: the route schema (HTTP in), the adapter (SDK or LLM responses in), and config (environment in). After that, pass typed values. Don't re-validate inside services or helpers.
- Keep wire DTOs separate from rows. A pure mapper in `helpers` converts between them. Don't return raw rows from a route.

### 4.3 ORM / database (e.g. Drizzle): the driven adapter
- ORM and schema **value** imports belong only in repositories and the data-layer folder. A service that needs data calls a repository method named after intent (`findOrderForTenant`, `upsertOrders`), not after SQL (`selectWhere`).
- A repository receives the DB handle in its constructor and returns rows, DTOs or plain values. It never returns a query builder or SQL fragment, and contains no business decisions beyond the query itself.
- Scope every query by tenant/owner where the data model has one; the repository signature takes it explicitly.
- **Transactions are owned by the service**, because it knows the unit of work. Open the transaction in the service and pass the transaction handle into repository methods that accept it. Don't open transactions inside a repository method another use case may need to compose.
- Services may import **types** of rows from the one types-only data-layer file (erased at build time). They may not import schema values, the DB client value or the ORM.

### 4.4 External systems: LLM, source hosting, Git, search, payments, email
- Every SDK sits behind a port. Services depend on the **port type**.
- The adapter is an **anti-corruption layer**. It maps SDK payloads to shared types and SDK failures to a domain error, so no SDK type appears in a service signature.
- Construct adapters only in the composition root, lazily. Credentials come from the secrets provider.
- Every port has a test double and an override slot in the container. A port nobody can mock is a leak.
- A pure core package (prompt building, scoring, parsing) is the model to copy: pure pipeline, with the external client injected. Don't give it database, filesystem or network access.

### 4.5 Jobs, events, time
- The job queue and event bus are infrastructure. A service may enqueue or publish, and a job handler is a driving adapter that forwards to a service method.
- Pure functions take `now` or ids as parameters instead of calling `Date.now()` / `randomUUID()` themselves when the result is asserted in tests. Read → decide (pure) → write is the target shape of a service method.

## 5. Recipes

**New module:** routes (schemas + thin handlers) → service (use cases, transactions, errors) → repository (ORM only) → helpers (pure rules + DTO mappers) → constants → register the module the way its siblings are registered. If another module needs its repository, expose it through a container getter. Don't import it across modules.

**New service constructor (new code):** receive narrow dependencies, not the whole container:
```ts
export class OrdersService {
  constructor(private deps: { repo: OrdersRepository; payments: () => Promise<PaymentsClient>; log: Logger }) {}
}
// routes: const service = new OrdersService({ repo: new OrdersRepository(app.container.db), payments: () => app.container.payments(), log: app.log });
```
The constructor then documents exactly what the use case touches, and tests pass mocks without building a container. If the dependency list passes about five entries, the service is doing more than one job.

**New external integration:** port interface → adapter → test double → container getter + override → the service depends on the port. See [examples.md §3](examples.md#3-a-new-port--adapter--test-double).

## 6. Testing by ring

| Ring | Test | Doubles |
|---|---|---|
| domain (helpers, pure core) | plain inputs → outputs | none needed; that's the payoff |
| service | unit tests with doubles for the ports (or narrow deps) | mock **unmanaged** dependencies only (LLM, HTTP APIs, Git). The database is managed: cover it with integration tests instead of mocking repositories |
| repository | integration tests against the real database (a container, or the project's test database) | none |
| routes | the framework's in-process injection, no network | as needed |

## 7. When NOT to add a layer

- A pure CRUD endpoint still gets a repository method and a thin route. The service may be a one-line pass-through, and that's fine. The rule being enforced is "no ORM in routes", not "every call needs three hops".
- Don't create a port for something that has one implementation, is never mocked and isn't I/O. A pure function is already its own seam.
- Don't introduce DDD entities, aggregates, value-object classes, a CQRS bus or a DI framework unless the project already has them. Shared schema types plus pure functions are the domain model.
- Don't refactor existing violations (§8) unless the task touches that code or the user asks.

## 8. Known deviations

Every real codebase has some. The project's own documentation lists them; this skill only fixes the policy:
- **Don't copy a documented deviation into new code**, and don't fix it unasked. When a task touches that code, move the part you are changing into the right ring and leave the rest.
- A composition root importing every concrete class is **not** a violation.
- Domain errors carrying an HTTP status code are tolerated when the project does it consistently; don't add other HTTP concerns to the domain.
- If the project documents none, treat any existing violation you meet as baseline, report it and keep new code clean.

## 9. Review checklist

Adapt these grep gates to the project's folder names. On a diff, each should print nothing for **new or changed** lines:
```bash
# ORM / schema / db access outside repositories
grep -nE "from 'drizzle-orm'|/schema|container\.db" <src>/modules/*/*.ts | grep -vE "repository|Repository\("
# cross-module imports
grep -rnE "from '\.\./(<other-module-names>)/" <src>/modules
# adapter leaks into feature modules or the data layer
grep -rnE "modules/|/db/" <src>/adapters --include='*.ts' | grep import
# config read outside the config module
grep -rn "process.env" <src>/modules <src>/platform --include='*.ts' | grep -v "config"
```
Then by eye:
- [ ] Each handler is parse → context → one service call → reply; no business branching.
- [ ] Every new SDK call is behind a port with a test double and a container override slot.
- [ ] No SDK, ORM or framework type appears in a service or helper signature.
- [ ] Business rules are pure functions with a unit test; integration tests cover new repository methods.
- [ ] Errors are thrown as domain errors, not rendered with `reply.status`.
- [ ] Transactions are opened in the service and the handle is passed down.
- [ ] Nothing from the project's known-deviations list was copied into new code.

Automated enforcement (for example a `dependency-cruiser` ruleset) is worth adding when the team wants it; don't add tooling to a project unasked.
