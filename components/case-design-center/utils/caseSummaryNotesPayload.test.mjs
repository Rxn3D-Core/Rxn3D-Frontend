import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSlipLevelNotes,
  clearProductNotesWhenUsingCaseSummary,
} from "./caseSummaryNotesPayload.ts";

test("buildSlipLevelNotes prefers case summary textarea over product notes", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  assert.deepEqual(buildSlipLevelNotes(products, "user edited note", 0), [
    { note: "user edited note" },
  ]);
});

test("clearProductNotesWhenUsingCaseSummary removes per-product notes", () => {
  const products = [{ type: "Upper", notes: "auto" }];
  clearProductNotesWhenUsingCaseSummary(products, "summary");
  assert.equal(products[0].notes, undefined);
});
