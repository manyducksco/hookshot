# Stator

Stator answers the question, "How do I share one hook's state between multiple components?" React's answer is [Context](https://react.dev/learn/passing-data-deeply-with-context). Stator makes this process even simpler.

Let's start with a familiar example:

## Example: Counter Store

```tsx
type CounterOptions = {
  initialValue?: number;
};

// Write your hook code, pass it to `createStore`, and get a Provider and a hook to access the shared state.

const [CounterProvider, useCounter] = createStore((options: CounterOptions) => {
  const [value, setValue] = useState(options.initialValue ?? 0);

  const increment = useCallback((amount = 1) => {
    setCount((current) => current + amount);
  }, []);

  const decrement = useCallback((amount = 1) => {
    setCount((current) => current - amount);
  }, []);

  const reset = useCallback(() => {
    setCount(0);
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
    <CounterProvider initialValue={51}>
      <CounterDisplay />
      <CounterControls />
    </CounterProvider>
  );
}

function CounterDisplay() {
  // And all children can access the same instance via the hook.
  const { value } = useCounter();

  return <p>Count is: {value}</p>;
}

function CounterControls() {
  // This is the same object <CounterDisplay> is looking at.
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

It's typical to only need part of a store's state. A component that calls `useCounter` will render every time the store's state changes, even if it's a value that's never used. You can pass a selector function to pluck out the part of the state you care about so your component will only render when you need it to.

Let's optimize the Counter components.

```tsx
function CounterDisplay() {
  // We only care about the value.
  // If we add more state to the counter store later, this component won't even notice.
  const value = useCounter((state) => state.value);

  return <p>Count is: {value}</p>;
}

function CounterControls() {
  // We don't care about the value here. We only need the functions to modify it.
  // Because we've wrapped them in `useCallback` they will always reference the same functions.
  // Changes to the counter value will never cause this component to render.
  const [increment, decrement, reset] = useCounter((state) => [
    state.increment,
    state.decrement,
    state.reset,
  ]);

  return (
    <div>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Further optimization with a comparator

If more control over rendering is needed, you can pass a second function to your hook. It takes the current and the previous selected values, returning a truthy value to update and render, or a falsy value to ignore the change.

> [!NOTE]
> The default comparator is a shallow comparison that will treat two different arrays or objects with equivalent keys and values as equal.
> A selector may return an array or object with multiple values, and it's the contents of that object that will be compared.

```ts
// Only update the value if the count increases or decreases by at least 2. Otherwise `value` will remain unchanged.
const value = useCounter(
  (state) => state.value,
  (current, previous) => Math.abs(current - previous) > 2,
);
```

## TypeScript utilities

Included are two utility types that infer a store's value from either its provider or its hook.

```ts
import { InferProviderType, InferHookType } from "@manyducksco/stator";

// ...store definition...

type CounterProviderValue = InferProviderType<typeof CounterProvider>;
type CounterHookValue = InferHookType<typeof useCounter>;

// Both types are inferred from what the store actually returns. In this example, something like:
type EquivalentType = {
  value: number;
  increment: (amount?: number) => void;
  decrement: (amount?: number) => void;
  reset: () => void;
};
```

## Prior art

We have been long time users of the great [unstated-next](https://github.com/jamiebuilds/unstated-next). Stator was created to add memoization and an improved API on top of that same idea.

## License

Stator is available under the MIT license.
