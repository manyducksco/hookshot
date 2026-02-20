# @manyducks.co/stator

At some point in the life of every React developer comes the question, "How do I share one hook's state between multiple components?" Stator makes this simple.

## Installation

```bash
npm install @manyducks.co/stator
```

## Example: Counter Store

```tsx
import { createStore } from "@manyducks.co/stator";
import { useState, useCallback } from "react";

type CounterOptions = {
  initialValue?: number;
};

// Write your hook code, pass it to `createStore`, get a Provider and a hook.

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
    // You can render multiple `<CounterProvider>`s in different parts of your app,
    // and each one maintains its own isolated state.
    <CounterProvider options={{ initialValue: 51 }}>
      <CounterDisplay />
      <CounterControls />
    </CounterProvider>
  );
}

function CounterDisplay() {
  // All children can access the same instance via the hook.
  // TypeScript will automatically infer the correct return types here.
  const { value } = useCounter();

  return <p>Count is: {value}</p>;
}

function CounterControls() {
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

It's typical to only need part of a store's state. A component that calls `useCounter` will render every time the store state changes, even if it's not using the part of the state that changed. You can pass a selector function to pluck out the parts you care about so your component will only render when you need it to.

Let's optimize the Counter components.

```tsx
function CounterDisplay() {
  const value = useCounter((state) => state.value);
  // We only care about the value.
  // If we add more state to the counter store later, this component won't even notice.

  return <p>Count is: {value}</p>;
}

function CounterControls() {
  const [increment, decrement, reset] = useCounter((state) => [
    state.increment,
    state.decrement,
    state.reset,
  ]);
  // We don't care about the value, only the functions to modify it.
  // Because we've wrapped them in `useCallback` they will always reference the same functions.
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

> [!NOTE]
> The hook performs a shallow check on the selected value that treats arrays or objects with equivalent keys and values as equal.
> A selector may return an array or object with multiple values (like in our CounterControls example above).
> In this case the return value is just a container. It's the items _inside_ the array that are compared for equality.

### Memoize everything

> [!IMPORTANT]
> Because Stator relies on referential equality when comparing selected state, you must memoize any selected functions and derived objects returned by your base hook.

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

We have been long time users of the great [unstated-next](https://github.com/jamiebuilds/unstated-next). Stator was created to add memoization and an improved API on top of that same idea.

## License

Stator is provided under the MIT license.
