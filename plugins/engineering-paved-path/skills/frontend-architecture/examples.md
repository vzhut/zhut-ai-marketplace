# frontend-architecture: examples

Generic before/after pairs. Names (`orders`, `OrderCard`) are placeholders; "before" snippets are shortened.

## 1. A fat page → thin page + View

**Before:** `app/orders/page.tsx` is `'use client'`, 400 lines: it reads params, fetches, filters, groups, and renders the table, the filter bar and the drawer.

**After:**

```
app/orders/
├── page.tsx                      thin server component: renders <OrdersView />
├── helpers.ts                    filterOrders, groupByStatus (pure, tested)
└── _components/
    └── OrdersView/
        ├── OrdersView.tsx        'use client'; reads search params, composes children
        ├── index.ts
        └── _components/
            ├── OrdersTable/
            ├── FilterBar/
            └── OrderDrawer/
```

```tsx
// app/orders/page.tsx
import { OrdersView } from "./_components/OrdersView";
export default function Page() {
  return <OrdersView />;
}
```

Order of work: move the pure logic into `helpers.ts` first, then the stateful logic into a hook, and only then split the JSX.

## 2. Deep relative imports → alias imports

**Before:**
```ts
import { useOrders, useCancelOrder } from "../../../../../lib/hooks/orders";
```
**After:**
```ts
import { useOrders, useCancelOrder } from "@/lib/hooks/orders";
```
Relative paths stay only inside a component's own folder tree.

## 3. Promotion: a second consumer appears

`app/orders/helpers.ts` exports `severityCounts`. The `reports` route now needs the same grouping with the same meaning.

1. Move it to `lib/severity.ts` (one module per concept) and move `severity.test.ts` with it.
2. Update both routes to `import { severityCounts } from "@/lib/severity"`.
3. Delete the old copy. Leave no re-export shim.

If `reports` needed something that only *looked* similar (different rule, same shape), keep two local copies instead: the wrong abstraction costs more than duplication.

## 4. Data access: no `fetch` in components

**Before:** a component calls `fetch('/api/orders')` in an effect and copies the result into `useState`.
**After:** `lib/api.ts` gets `api.orders.list()`; `lib/hooks/orders.ts` exports `useOrders()` (query key defined once, invalidation in the mutation hooks); the component calls `useOrders()` and reads `data`. No copy into local state.

## 5. A barrel file

**Before:** `components/diff-viewer/index.ts` has `export * from "./DiffViewer"; export * from "./helpers";`
**After:**
```ts
export { DiffViewer } from "./DiffViewer";
export type { DiffCommentApi } from "./comments";
```
Helpers stay internal unless an outside consumer needs them.
