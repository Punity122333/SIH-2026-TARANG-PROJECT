import "@testing-library/jest-dom/vitest";
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] || null
  };
  Object.defineProperty(window, "localStorage", { value: mock, writable: true });
}
if (typeof globalThis !== "undefined" && !((globalThis as unknown as Record<string, unknown>)["localStorage"])) {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>)["localStorage"] = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear()
  };
}
