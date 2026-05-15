import test from "node:test";
import assert from "node:assert/strict";

import {
  isSingleDefaultOnlyExtractionList,
  shouldAutoSelectArchForDefaultExtraction,
} from "./extractionHelpers.ts";

test("single default extraction list still identifies a TIM-only list", () => {
  const result = isSingleDefaultOnlyExtractionList([
    { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
  ]);

  assert.equal(result, true);
});

test("does not auto-select the arch for a TIM default extraction", () => {
  const result = shouldAutoSelectArchForDefaultExtraction([
    { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
    { name: "Missing teeth", code: "MT_L1_G2", is_default: "No", is_tim: "No", status: "Active" },
  ]);

  assert.equal(result, false);
});

test("auto-selects the arch for a non-TIM default extraction", () => {
  const result = shouldAutoSelectArchForDefaultExtraction([
    { name: "Missing teeth", code: "MT_L1_G2", is_default: "Yes", is_tim: "No", status: "Active" },
    { name: "Teeth in mouth", code: "TIM1", is_default: "No", is_tim: "Yes", status: "Active" },
  ]);

  assert.equal(result, true);
});
