import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSlipLevelNotes,
  clearProductNotesWhenUsingCaseSummary,
} from "./caseSummaryNotesPayload.ts";

test("buildSlipLevelNotes prefers case summary textarea over product notes on a single slip", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  assert.deepEqual(buildSlipLevelNotes(products, "user edited note", 0, 1), [
    { note: "user edited note", type: "stage" },
  ]);
});

test("buildSlipLevelNotes creates stage-type notes from product notes when no summary", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  assert.deepEqual(buildSlipLevelNotes(products, undefined, 0, 1), [
    { note: "auto generated", type: "stage" },
  ]);
});

test("buildSlipLevelNotes attaches product notes per slip when multiple slips exist", () => {
  const upperNote = { type: "Upper", notes: "Upper FDA note" };
  const lowerIspNote = { type: "Lower", notes: "Lower ISP note" };
  const lowerFdaNote = { type: "Lower", notes: "Lower FDA note" };

  assert.deepEqual(
    buildSlipLevelNotes([upperNote, lowerFdaNote], "combined summary", 0, 2),
    [
      { note: "Upper FDA note", type: "stage" },
      { note: "Lower FDA note", type: "stage" },
    ]
  );
  assert.deepEqual(buildSlipLevelNotes([lowerIspNote], "combined summary", 1, 2), [
    { note: "Lower ISP note", type: "stage" },
  ]);
});

test("clearProductNotesWhenUsingCaseSummary removes per-product notes only for a single slip", () => {
  const products = [{ type: "Upper", notes: "auto" }];
  clearProductNotesWhenUsingCaseSummary(products, "summary", 1);
  assert.equal(products[0].notes, "auto");
  clearProductNotesWhenUsingCaseSummary(products, "summary");
  assert.equal(products[0].notes, undefined);
});
