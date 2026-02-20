import { cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { createStore } from "./main.js";

type TestStoreOptions = { initialCount?: number; initialText?: string };

afterEach(() => {
  cleanup();
});

const [TestProvider, useTestStore] = createStore(
  (options?: TestStoreOptions) => {
    const [count, setCount] = useState(options?.initialCount ?? 0);
    const [text, setText] = useState(options?.initialText ?? "hello");

    const increment = useCallback(() => setCount((c) => c + 1), []);
    const updateText = useCallback((t: string) => setText(t), []);

    return { count, text, increment, updateText };
  },
);

test("throws when hook is used outside of provider", () => {
  // Suppress React's internal error logging for this specific test
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() => renderHook(() => useTestStore())).toThrow(
    "Component must be wrapped with a <Provider>",
  );

  consoleError.mockRestore();
});

test("store receives options object from provider props", () => {
  const { result } = renderHook(() => useTestStore(), {
    wrapper: ({ children }) => (
      <TestProvider options={{ initialCount: 10, initialText: "initialized" }}>
        {children}
      </TestProvider>
    ),
  });

  expect(result.current.count).toBe(10);
  expect(result.current.text).toBe("initialized");
  expect(typeof result.current.increment).toBe("function");
});

test("hook returns only the selected state", () => {
  const { result } = renderHook(() => useTestStore((state) => state.count), {
    wrapper: ({ children }) => <TestProvider>{children}</TestProvider>,
  });

  expect(result.current).toBe(0);
});

test("renders only when selected state changes", () => {
  const displaySpy = vi.fn();
  const controlSpy = vi.fn();

  const DisplayComponent = () => {
    displaySpy();
    const count = useTestStore((state) => state.count);
    return <div data-testid="display">{count}</div>;
  };

  const ControlComponent = () => {
    controlSpy();
    const increment = useTestStore((state) => state.increment);
    return (
      <button data-testid="increment" onClick={increment}>
        Increment
      </button>
    );
  };

  const { getByTestId } = render(
    <TestProvider>
      <DisplayComponent />
      <ControlComponent />
    </TestProvider>,
  );

  expect(displaySpy).toHaveBeenCalledTimes(1);
  expect(controlSpy).toHaveBeenCalledTimes(1);

  fireEvent.click(getByTestId("increment"));

  expect(displaySpy).toHaveBeenCalledTimes(2);
  expect(controlSpy).toHaveBeenCalledTimes(1);
  expect(getByTestId("display").textContent).toBe("1");
});

test("handles new array/object references deeply", () => {
  const selectSpy = vi.fn();
  const renderSpy = vi.fn();

  const CountComponent = () => {
    renderSpy();
    const [count, increment] = useTestStore((state) => {
      selectSpy();
      return [state.count, state.increment];
    });
    return (
      <div>
        <div>{count}</div>
        <button data-testid="increment" onClick={() => increment()}>
          Increment
        </button>
      </div>
    );
  };

  const TextComponent = () => {
    const [text, setText] = useTestStore((state) => [
      state.text,
      state.updateText,
    ]);
    return (
      <button
        data-testid="update-text"
        onClick={() => {
          setText("text has been updated!");
        }}
      >
        {text}
      </button>
    );
  };

  const { getByTestId } = render(
    <TestProvider>
      <CountComponent />
      <TextComponent />
    </TestProvider>,
  );

  expect(selectSpy).toHaveBeenCalledTimes(1);
  expect(renderSpy).toHaveBeenCalledTimes(1);
  expect(getByTestId("update-text").textContent).toBe("hello");

  // The hook should see the contents are deeply equal and abort the render.
  fireEvent.click(getByTestId("update-text"));

  expect(selectSpy).toHaveBeenCalledTimes(2); // selected again
  expect(renderSpy).toHaveBeenCalledTimes(1); // still rendered once
  expect(getByTestId("update-text").textContent).toBe("text has been updated!");

  fireEvent.click(getByTestId("increment"));

  expect(selectSpy).toHaveBeenCalledTimes(3);
  expect(renderSpy).toHaveBeenCalledTimes(2);
});
