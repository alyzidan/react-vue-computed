# react-vue-computed

Vue 3's `computed` mental model brought into React: auto-tracked dependencies, lazy memoization, and re-renders that fire only when the derived value actually changes.

Built on JavaScript `Proxy` and React's `useSyncExternalStore`. No dependency arrays.

## Features

- **No dependency arrays.** Dependencies are auto-tracked at runtime by reading reactive sources inside the getter.
- **Lazy memoization.** The getter only re-runs when one of its tracked dependencies has actually changed.
- **Reference-equal re-render skipping.** A derived value that comes out reference-equal to the previous one (`Object.is`) does not trigger a React re-render, even if upstream state changed.
- **Writable computed.** Pass `{ get, set }` to get a `[value, setValue]` tuple for two-way derived state.
- **TypeScript-first.** Full overload-based typing, no casts needed at call sites.

## Installation

```bash
npm install react-vue-computed
```

Requires React 18 or newer (for `useSyncExternalStore`).

## Why this exists

React Compiler closes much of the manual-memoization gap (`useMemo` / `useCallback` deps arrays). What it does not change is the underlying model: components are pull-based, memoization happens at the component level, and a state write triggers re-renders for any component reading that state through the React tree.

This library gives you push-based reactivity with **property-level** dependency tracking. A write to `state.foo` only invalidates derivations that actually read `foo` — not anything that reads `state` more broadly. Useful for cross-cutting application state read by many components.

If you want all of Vue's reactivity API (`watch`, `watchEffect`, `effectScope`, etc.) you want a fuller-featured library; this one is intentionally scoped to `ref`, `reactive`, and computed-via-hook.

## Usage

### Read-only computed

```tsx
import { ref, useComputed } from 'react-vue-computed';

const firstName = ref('John');
const lastName = ref('Doe');

export function Greeting() {
  const fullName = useComputed(() => `${firstName.value} ${lastName.value}`);
  return <h1>Hello, {fullName}</h1>;
}
```

No deps array. The hook subscribes to `firstName` and `lastName` automatically because they were read inside the getter. Mutating either will trigger a re-render of `Greeting` if and only if the joined string actually changed.

### Reactive objects

For object-shaped state, use `reactive` instead of multiple refs:

```tsx
import { reactive, useComputed } from 'react-vue-computed';

const cart = reactive({
  items: [] as Array<{ price: number; qty: number }>,
  taxRate: 0.15,
});

export function CartTotal() {
  const total = useComputed(() => {
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
    return subtotal * (1 + cart.taxRate);
  });
  return <p>Total: ${total.toFixed(2)}</p>;
}
```

`reactive()` returns a deep `Proxy`. Property reads are tracked, writes (including `delete`) trigger anything subscribed to that specific property.

### Writable computed

Pass `{ get, set }` to get a `[value, setValue]` tuple:

```tsx
import { ref, useComputed } from 'react-vue-computed';

const basePrice = ref(100);
const TAX_RATE = 1.15;

export function PriceEditor() {
  const [withTax, setWithTax] = useComputed({
    get: () => basePrice.value * TAX_RATE,
    set: (v: number) => {
      basePrice.value = v / TAX_RATE;
    },
  });

  return (
    <input
      type="number"
      value={withTax}
      onChange={(e) => setWithTax(Number(e.target.value))}
    />
  );
}
```

When the setter writes to `basePrice`, anything else deriving from `basePrice` updates too.

### Helpers

```ts
import { ref, isRef, unref, type Ref } from 'react-vue-computed';

const r = ref(7);
isRef(r);        // true
isRef(7);        // false
unref(r);        // 7
unref(7);        // 7
```

## Constraints (read this part)

This library only tracks values read through `ref()` or `reactive()`. There is no magic that intercepts plain variables.

**Do not capture React props or local state in the getter** and expect them to invalidate the cache. They won't:

```tsx
function Broken({ multiplier }: { multiplier: number }) {
  // ❌ multiplier change will NOT invalidate the cache,
  //    because multiplier is not a reactive source.
  const result = useComputed(() => count.value * multiplier);
}
```

The getter closure stays "live" — it always sees the latest `multiplier` when it runs — but the cache is only invalidated when a tracked reactive source changes. If `count` doesn't change, the cache won't recompute, and the prop change won't be reflected.

This is the same constraint Vue users follow. Either lift the dependency into the reactive system, or don't use `useComputed` for that derivation:

```tsx
function Working({ multiplier }: { multiplier: number }) {
  // Just compute it directly; React Compiler / useMemo handle the rest.
  const result = count.value /* if reading reactive in render works for you */ * multiplier;
}
```

**Returning fresh objects every recompute will trigger re-renders.** `useSyncExternalStore` compares snapshots with `Object.is`. A getter that returns `{ ...state }` produces a new reference every run. If you want stable identity, return the underlying reactive object directly, or wrap with your own equality check.

## How it works

Three pieces:

1. **`ref` / `reactive`** wrap state. Reads call an internal `track()` that adds the currently running effect to a per-source `Set<Effect>`. Writes call `trigger()` that runs every effect in the set.
2. **`ComputedImpl`** is itself an effect. When its getter runs, the global `activeEffect` is set to its own effect, so any reactive read inside the getter subscribes the computed. Re-runs are lazy and only happen on the next `.value` read after a dep change. Cleanup removes stale subscriptions before each re-run, so conditional reads work correctly.
3. **`useComputed`** wires the computed into React via `useSyncExternalStore`. The store's `subscribe` adds React's notify callback; `getSnapshot` returns the lazily-computed value. React's built-in `Object.is` comparison on snapshots is what gives you the "skip re-render if value unchanged" behavior.

## License

MIT
