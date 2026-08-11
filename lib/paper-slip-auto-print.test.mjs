import test from "node:test";
import assert from "node:assert/strict";

import { consumeSlipAutoPrint, markSlipForAutoPrint } from "./paper-slip-auto-print.ts";

function installWindow(t) {
  const store = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };
  t.after(() => {
    delete globalThis.window;
  });
  return store;
}

test("marked slip auto-prints exactly once — reloads never re-trigger", (t) => {
  installWindow(t);

  markSlipForAutoPrint(4210);

  assert.equal(consumeSlipAutoPrint(4210), true);
  // Second mount (reload) must not print again.
  assert.equal(consumeSlipAutoPrint(4210), false);
});

test("a different slip does not consume the flag", (t) => {
  installWindow(t);

  markSlipForAutoPrint(4210);

  assert.equal(consumeSlipAutoPrint(9999), false);
  assert.equal(consumeSlipAutoPrint(4210), true);
});

test("unmarked slip never triggers", (t) => {
  installWindow(t);

  assert.equal(consumeSlipAutoPrint(4210), false);
});

test("storage failures make auto-print a no-op instead of throwing", (t) => {
  globalThis.window = {
    sessionStorage: {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    },
  };
  t.after(() => {
    delete globalThis.window;
  });

  assert.doesNotThrow(() => markSlipForAutoPrint(4210));
  assert.equal(consumeSlipAutoPrint(4210), false);
});
