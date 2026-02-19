import { createStore } from "./main.js";

const [Provider, useStore] = createStore(() => {
  const [value, setValue] = useState("test");

  return { value };
});
