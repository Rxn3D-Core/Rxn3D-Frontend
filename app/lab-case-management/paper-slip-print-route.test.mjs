import assert from "node:assert/strict";
import test from "node:test";

import { buildPaperSlipPrintRoute } from "./paper-slip-print-route.mjs";

test("buildPaperSlipPrintRoute uses slip_ids for lab flow", () => {
  assert.equal(
    buildPaperSlipPrintRoute({ customerType: "lab", ids: [11, 12] }),
    "/paper-slip/print?slip_ids=11%2C12",
  );
});

test("buildPaperSlipPrintRoute uses case_ids for office flow", () => {
  assert.equal(
    buildPaperSlipPrintRoute({ customerType: "office", ids: [91, 92] }),
    "/paper-slip/print?case_ids=91%2C92",
  );
});

test("buildPaperSlipPrintRoute dedupes and drops invalid ids", () => {
  assert.equal(
    buildPaperSlipPrintRoute({ customerType: "lab", ids: [7, 7, NaN, -2, 9] }),
    "/paper-slip/print?slip_ids=7%2C9",
  );
});

test("buildPaperSlipPrintRoute returns null when no valid ids remain", () => {
  assert.equal(buildPaperSlipPrintRoute({ customerType: "lab", ids: [NaN, -2] }), null);
});
