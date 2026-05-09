# react-vue-computed 🚀

Bring Vue's elegant, push-based reactivity mental model directly into React. Say goodbye to manual dependency arrays (`useMemo` / `useCallback`) and stale closures.

Built with JS Proxies and React's native `useSyncExternalStore`.

## ✨ Features

- **Zero Dependency Arrays:** Dependencies are auto-tracked at runtime.
- **Lazy Evaluation & Memoization:** Computeds only re-run when their tracked dependencies mutate.
- **Writable Computeds:** Supports two-way derived state out of the box.
- **React-Native Integration:** Triggers re-renders *only* when the evaluated result actually changes (Deep equality support).
- **TypeScript Ready:** First-class types included.

## 📦 Installation

```bash
npm install react-vue-computed
# or
yarn add react-vue-computed
# or
pnpm add react-vue-computed
```

## 🚀 Quick Start (Read-Only)

No more guessing what goes into the `useMemo` array. Just use `ref` and `useComputed`!

```tsx
import { ref, useComputed } from 'react-vue-computed';

// Define state outside or inside your components
const firstName = ref('John');
const lastName = ref('Doe');
const basePrice = ref(100);

export function UserProfile() {
  // Auto-tracks firstName and lastName. 
  // No dependency array needed!
  const fullName = useComputed(() => `${firstName.value} ${lastName.value}`);
  
  const finalPrice = useComputed(() => basePrice.value * 1.15); // +15% tax

  return (
    <div>
      <h2>Welcome, {fullName}!</h2>
      <p>Total: ${finalPrice}</p>
      
      <button onClick={() => firstName.value = 'Jane'}>
        Change Name
      </button>
    </div>
  );
}
```

## ✍️ Writable Computed (Two-way Binding)

Need a derived state that you can also update? Pass an object with `get` and `set`.

```tsx
import { useState, useEffect } from 'react';
import { ref, useComputed } from 'react-vue-computed';

const first = ref('John');
const last = ref('Doe');

export function NameEditor() {
  const [computedFullName, setComputedFullName] = useComputed({
    get: () => `${first.value} ${last.value}`.trim(),
    set: (newValue) => {
      const parts = newValue.trim().split(/\s+/);
      first.value = parts[0] || '';
      last.value = parts.slice(1).join(' ') || '';
    }
  });

  // Best Practice for Controlled Inputs:
  // Use a local state buffer to prevent typing issues (like losing trailing spaces)
  const [inputValue, setInputValue] = useState(computedFullName);

  useEffect(() => {
    setInputValue(computedFullName);
  }, [computedFullName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);           // Update UI instantly
    setComputedFullName(val);     // Update reactivity engine in the background
  };

  return (
    <input 
      value={inputValue} 
      onChange={handleChange} 
      placeholder="Enter full name" 
    />
  );
}
```

## 🧠 How it Works (The Mental Model)

Unlike React's default pull-based rendering, this library uses a push-based reactivity engine:
1. **Proxies (`ref`, `reactive`):** Wrap your data to track exactly when and where they are read.
2. **Auto-Tracking:** When `useComputed` runs your getter, it subscribes to any `ref` you touched.
3. **`useSyncExternalStore`:** Bridges our custom reactivity engine with React's render cycle, ensuring tearing-free UI updates and bailing out of renders if the derived value hasn't changed.

## ⚠️ Important Edge Cases

*   **Don't read React Props directly inside `useComputed`:** The engine only tracks `ref` and `reactive` objects. If you need to derive a computed from a React prop, sync the prop to a `ref` first inside a `useEffect`.
*   **Return Primitives when possible:** If your `useComputed` returns a new object/array reference every time, React will trigger a re-render. 

## 📝 License

MIT