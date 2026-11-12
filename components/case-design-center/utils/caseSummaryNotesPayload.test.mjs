import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSlipLevelNotes,
  clearProductNotesWhenUsingCaseSummary,
} from "./caseSummaryNotesPayload.ts";

test("buildSlipLevelNotes prefers case summary textarea over product notes on a single slip", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  assert.deepEqual(buildSlipLevelNotes(products, "user edited note", 0, 1, true), [
    { note: "user edited note", type: "stage" },
  ]);
});

test("buildSlipLevelNotes creates stage-type notes from product notes when no summary", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  assert.deepEqual(buildSlipLevelNotes(products, undefined, 0, 1, true), [
    { note: "auto generated", type: "stage" },
  ]);
});

test("buildSlipLevelNotes attaches product notes per slip when multiple slips exist", () => {
  const upperNote = { type: "Upper", notes: "Upper FDA note" };
  const lowerIspNote = { type: "Lower", notes: "Lower ISP note" };
  const lowerFdaNote = { type: "Lower", notes: "Lower FDA note" };

  assert.deepEqual(
    buildSlipLevelNotes([upperNote, lowerFdaNote], "combined summary", 0, 2, true),
    [
      { note: "Upper FDA note", type: "stage" },
      { note: "Lower FDA note", type: "stage" },
    ]
  );
  assert.deepEqual(buildSlipLevelNotes([lowerIspNote], "combined summary", 1, 2, true), [
    { note: "Lower ISP note", type: "stage" },
  ]);
});

test("clearProductNotesWhenUsingCaseSummary removes per-product notes only for a single slip", () => {
  const products = [{ type: "Upper", notes: "auto" }];
  clearProductNotesWhenUsingCaseSummary(products, "summary", 2, true);
  assert.equal(products[0].notes, "auto");
  clearProductNotesWhenUsingCaseSummary(products, "summary", 1, true);
  assert.equal(products[0].notes, undefined);
});

test("auto notes off (RXN-62): the flag is off by default", async () => {
  const { AUTO_GENERATED_NOTES_ENABLED } = await import("./caseSummaryNotesPayload.ts");
  assert.equal(AUTO_GENERATED_NOTES_ENABLED, false);
});

test("auto notes off (RXN-62): generated product notes are never sent", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  assert.deepEqual(buildSlipLevelNotes(products, undefined, 0, 1), []);
  assert.deepEqual(buildSlipLevelNotes(products, "   ", 0, 2), []);
  clearProductNotesWhenUsingCaseSummary(products, undefined, 2);
  assert.equal(products[0].notes, undefined);
});

test("auto notes off (RXN-62): a typed note is sent on every slip", () => {
  const products = [{ type: "Upper", notes: "auto generated" }];
  const typed = [{ note: "typed by user", type: "stage" }];
  assert.deepEqual(buildSlipLevelNotes(products, " typed by user ", 0, 1), typed);
  assert.deepEqual(buildSlipLevelNotes(products, "typed by user", 0, 2), typed);
  assert.deepEqual(buildSlipLevelNotes(products, "typed by user", 1, 2), typed);
});
