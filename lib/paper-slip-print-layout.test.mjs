import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkPaperSlipSectionsForHalfPage,
  isPaperSlipPrintLayout,
} from "../lib/paper-slip-print-layout.ts";

test("isPaperSlipPrintLayout accepts full and half only", () => {
  assert.equal(isPaperSlipPrintLayout("full"), true);
  assert.equal(isPaperSlipPrintLayout("half"), true);
  assert.equal(isPaperSlipPrintLayout("quarter"), false);
  assert.equal(isPaperSlipPrintLayout(""), false);
});

test("chunkPaperSlipSectionsForHalfPage pairs slips for landscape sheets", () => {
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage([1, 2, 3, 4]), [
    [1, 2],
    [3, 4],
  ]);
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage(["a"]), [["a"]]);
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage(["a", "b", "c"]), [
    ["a", "b"],
    ["c"],
  ]);
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage([]), []);
});
