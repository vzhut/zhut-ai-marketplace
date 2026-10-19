# onion-architecture: examples

Generic before/after pairs. The "before" snippets are shortened; the "after" versions show the target shape. Apply one only when your task touches that code (SKILL.md §7–§8). Names (`orders`, `PaymentsClient`) are placeholders.

## 1. A fat route handler

**Before:** `modules/orders/routes.ts`, `GET /orders/:id`. The handler reads the database, calls a payment provider, rewrites two tables, and swallows the provider failure.

```ts
app.get('/orders/:id', async (req) => {
  const row = await app.container.db.select().from(orders).where(eq(orders.id, req.params.id));
  try {
    const pay = await app.container.payments();
    const remote = await pay.fetchOrder(row[0].externalId);
    await app.container.db.update(orders).set({ status: remote.status }).where(eq(orders.id, row[0].id));
  } catch (err) {
    app.log.warn({ err }, 'refresh skipped');
  }
  return row[0];
});
```

**After:**

```ts
// routes.ts — driving adapter: parse, context, one service call, reply
app.get('/orders/:id', { schema: { params: IdParams, response: { 200: OrderDto } } }, async (req) => {
  return service.getOrder(getContext(app.container, req), req.params.id);
});

// service.ts — application: the use case and the offline-fallback decision
async getOrder(ctx: Ctx, id: string): Promise<OrderDto> {
  const order = await this.deps.repo.findForTenant(ctx.tenantId, id);
  if (!order) throw new NotFoundError('order');
  try {
    const remote = await (await this.deps.payments()).fetchOrder(order.externalId);
    await this.deps.repo.updateStatus(order.id, remote.status);
    return toOrderDto({ ...order, status: remote.status });
  } catch (err) {
    this.deps.log.warn({ err }, 'refresh skipped; serving persisted order');
    return toOrderDto(order);
  }
}

// repository.ts — driven adapter: the only file here that imports the ORM
```

Why it's better: the offline-fallback decision can be unit-tested with a mock `PaymentsClient` set to throw, and the route no longer knows the database or the provider exist.

## 2. A rule hidden in an executor

**Before:** an executor file computes cost and groups results inline while also writing to the database.
**After:** `helpers.ts` exports `computeCost(usage, pricing)` and `groupByStatus(items)` as pure functions with unit tests; the service reads, calls the helpers, and writes. Read → decide (pure) → write.

## 3. A new port + adapter + test double

Example task: "post a summary to Slack when a job completes".

1. **Port** (core ring): `interface Notifier { send(channel: string, text: string): Promise<void> }`.
2. **Adapter** (`adapters/slack/index.ts`): implements `Notifier` with the Slack SDK; maps SDK failures to `ExternalServiceError`; imports nothing from feature modules.
3. **Test double** (`adapters/mocks.ts`): `MockNotifier` records calls.
4. **Container:** a lazy `notifier()` getter, an override slot for tests, and the token read through the secrets provider.
5. **Service:** depends on `Notifier`; calls it from the job-completion use case, never from a route; a notification failure is logged and does not fail the job.

Adding a new secret key is a contract change: update the shared contract in every place the project keeps it.

## 4. A cross-module need

Module `reports` needs data owned by module `orders`. Don't `import ... from '../orders/repository'`. Either expose a container getter (`container.ordersRepo`) that `reports` receives as a narrow dependency, or move the shared concept down into shared code. If both sides own the concept equally, move it down.
