import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(axeMatchers);

// Node 25+ ships a built-in localStorage that shadows jsdom's and fails without a file.
// Replace both storages with a simple in-memory one so tests behave the same on every Node.
const createStorage = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: createStorage(), configurable: true });

// Node 24 (the CI runtime) builds Request with its own fetch, which rejects jsdom's
// AbortSignal. React Router creates a Request for every navigation, so without this every
// redirect and link fails in tests while passing on Node 22. Tests never abort a
// navigation, so the signal is dropped before it reaches Node's Request.
const NodeRequest = globalThis.Request;
globalThis.Request = class Request extends NodeRequest {
  constructor(input, init = {}) {
    const { signal, ...rest } = init;
    super(input, rest);
  }
};

// jsdom does not implement these browser APIs used by the UI.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
