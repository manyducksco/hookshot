import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  createElement,
} from "react";

const EMPTY: unique symbol = Symbol();

export interface StoreProviderProps<Value, Options> {
  options?: Options;
  ref?: React.Ref<Value>;
  children: React.ReactNode;
}

export interface StoreProviderPropsWithOptions<
  Value,
  Options,
> extends StoreProviderProps<Value, Options> {
  options: Options;
}

/**
 * Provides a single instance of a store to all its children.
 */
export type StoreProvider<Value, Options> = React.ComponentType<
  StoreProviderProps<Value, Options>
>;

export type StoreProviderWithOptions<Value, Options> = React.ComponentType<
  StoreProviderPropsWithOptions<Value, Options>
>;

/**
 * Plucks only the parts of the state this component cares about.
 */
export type Selector<Value, Selected> = (value: Value) => Selected;

/**
 * Compares the current selected value to the previous to determine if this component needs to render.
 */
export type Comparator<Selected> = (
  current: Selected,
  previous: Selected,
) => any;

/**
 * Accesses the nearest parent instance of a store.
 */
export interface StoreHook<Value> {
  (): Value;
  <Selected>(
    select: Selector<Value, Selected>,
    compare?: Comparator<Selected>,
  ): Selected;
}

/**
 * Defines a new store, returning its provider and hook.
 */
export function createStore<Value, Options>(
  fn: () => Value,
): [StoreProvider<Value, Options>, StoreHook<Value>];

/**
 * Defines a new store, returning its provider and hook.
 */
export function createStore<Value, Options>(
  fn: (options: Options) => Value,
): [StoreProviderWithOptions<Value, Options>, StoreHook<Value>];

export function createStore<Value, Options>(
  fn: (options?: Options) => Value,
):
  | [StoreProvider<Value, Options>, StoreHook<Value>]
  | [StoreProviderWithOptions<Value, Options>, StoreHook<Value>] {
  const Context = createContext<Value | typeof EMPTY>(EMPTY);

  function Provider(props: StoreProviderProps<Value, Options>) {
    const value = fn(props.options);
    _setRef(props.ref, value);
    return createElement(Context.Provider, { value, children: props.children });
  }

  function useStore<Selected = Value>(
    select?: Selector<Value, Selected>,
    compare: Comparator<Selected> = _compare,
  ) {
    const value = useContext(Context);

    if (value === EMPTY) {
      throw new Error("Component must be wrapped with a store <Provider>");
    }

    // Optimization: Skip selector logic if no selector is passed.
    // We are assuming the argument types never change between renders.
    if (!select) return value;

    // Blop gets flagged on and off to trigger a re-render.
    const [blop, setBlop] = useState(false);
    const selected = useRef(select(value));

    useEffect(() => {
      const next = select(value);
      if (!compare(selected.current as any, next as any)) {
        selected.current = next;
        setBlop((x) => !x);
      }
    }, [value]);

    return useMemo(() => selected.current, [blop]);
  }

  return [Provider, useStore];
}

function _setRef<Value>(ref: React.Ref<Value> | undefined, value: Value) {
  if (!ref) return;

  if (typeof ref === "function") {
    ref(value);
  } else if ("current" in ref) {
    ref.current = value;
  } else {
    throw new Error(`Unknown ref type.`);
  }
}

function _compare(a: any, b: any): boolean {
  // Same object is obviously equal.
  if (Object.is(a, b)) return true;

  // Must be the same type.
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
  } else if (typeof a === "object") {
    if (a.prototype !== b.prototype) return false;

    // Two different maps or sets are not equal.
    if (a instanceof Map) return false;
    if (a instanceof Set) return false;

    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key in a) {
      if (!Object.is(a[key], b[key])) return false;
    }
  }

  return true;
}

/**
 * Infers the value type that this provider holds.
 */
export type InferProviderValue<T extends StoreProvider<any, any>> =
  T extends StoreProvider<infer V, any> ? V : never;

/**
 * Infers the value type that this hook returns.
 */
export type InferHookValue<T extends StoreHook<any>> = ReturnType<T>;
