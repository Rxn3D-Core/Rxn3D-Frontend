import test from "node:test";
import assert from "node:assert/strict";

import { printAfterNextPaint } from "./paper-slip-print-scheduler.ts";

test("printAfterNextPaint waits for two animation frames before printing", () => {
  const queuedFrames = [];
  let printCalls = 0;

  const requestAnimationFrame = (callback) => {
    queuedFrames.push(callback);
    return queuedFrames.length;
  };

  printAfterNextPaint({
    print: () => {
      printCalls += 1;
    },
    requestAnimationFrame,
  });

  assert.equal(printCalls, 0);
  assert.equal(queuedFrames.length, 1);

  queuedFrames.shift()(0);
  assert.equal(printCalls, 0);
  assert.equal(queuedFrames.length, 1);

  queuedFrames.shift()(16);
  assert.equal(printCalls, 1);
  assert.equal(queuedFrames.length, 0);
});
