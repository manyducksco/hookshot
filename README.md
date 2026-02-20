# @manyducks.co/hookshot

Hookshot is a simple state management library for React that makes it easy to share state between components.

## Installation

```bash
npm install @manyducks.co/hookshot
```

## Example: Counter

```tsx
import { createStore } from "@manyducks.co/hookshot";
import { useState, useCallback } from "react";

type CounterOptions = {
  initialValue?: number;
};

// Define a store; get a provider and a dedicated hook.

const [CounterProvider, useCounter] = createStore((options: CounterOptions) => {
  const [value, setValue] = useState(options.initialValue ?? 0);

  const increment = useCallback((amount = 1) => {
    setValue((current) => current + amount);
  }, []);

  const decrement = useCallback((amount = 1) => {
    setValue((current) => current - amount);
  }, []);

  const reset = useCallback(() => {
    setValue(0);
  }, []);

  return {
    value,
    increment,
    decrement,
    reset,
  };
});

function MyApp() {
  return (
    // One instance of your store is created wherever you render the provider.
    // Multiple `<CounterProvider>`s in different parts of your app will each maintain their own state.
    <CounterProvider options={{ initialValue: 51 }}>
      <CounterDisplay />
      <CounterControls />
    </CounterProvider>
  );
}

function CounterDisplay() {
  // All children can access the shared state with the dedicated hook.
  // TypeScript will automatically infer the correct return types here.
  const { value } = useCounter();

  return <p>Count is: {value}</p>;
}

function CounterControls() {
  // Same instance of the counter store.
  // These functions will alter the value that CounterDisplay sees.
  const { increment, decrement, reset } = useCounter();

  return (
    <div>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Optimizing with a selector

It's typical to only need part of the state. A component that calls `useCounter` will render every time the store renders, even if it's not using the part of the state that changed. You can pass a selector function to pluck only what you care about so your component will render just when you need it to.

Let's optimize the components.

```tsx
function CounterDisplay() {
  const value = useCounter((state) => state.value);
  // We select only the value to display.
  // If we add more state to the counter store later, this component won't even notice.

  return <p>Count is: {value}</p>;
}

function CounterControls() {
  const [increment, decrement, reset] = useCounter((state) => [
    state.increment,
    state.decrement,
    state.reset,
  ]);
  // We don't care about the value here, only the functions to modify it.
  // Because we've wrapped them in `useCallback` their references will remain stable.
  // Changes to the counter value will never cause this component to render.

  return (
    <div>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### Memoize everything

> [!IMPORTANT]
> Because Hookshot relies on referential equality when comparing selected state, you must memoize any selected functions and derived objects returned by your hook.

If you return a new function or object reference on every render, components selecting those values will also re-render every time, defeating the selector optimization.

```ts
// ❌ Bad: This creates a new function reference every render!
const increment = (amount = 1) => setValue((current) => current + amount);

// ✅ Good: The reference remains stable.
const increment = useCallback((amount = 1) => {
  setValue((current) => current + amount);
}, []);
```

## Prior art

We have been long time users of the great [unstated-next](https://github.com/jamiebuilds/unstated-next). Hookshot was created to add memoization and an improved API on top of that same idea.

## License

This code is provided under the MIT license.
