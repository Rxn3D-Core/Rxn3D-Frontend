import test from "node:test";
import assert from "node:assert/strict";

import {
  isSingleDefaultOnlyExtractionList,
  shouldAutoSelectArchForDefaultExtraction,
  isOverlayExtractionCode,
  toothHasTimBaseExtraction,
} from "./extractionHelpers.ts";

const SAMPLE_EXTRACTIONS = [
  { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", overlay: "No", status: "Active" },
  { name: "Missing teeth", code: "MT_L1_G2", is_default: "No", is_tim: "No", overlay: "No", status: "Active" },
  { name: "Clasps", code: "CLASP_L1_G6", is_default: "No", is_tim: "No", overlay: "Yes", status: "Active" },
];

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

test("isOverlayExtractionCode uses API overlay Yes", () => {
  assert.equal(isOverlayExtractionCode("CLASP_L1_G6", SAMPLE_EXTRACTIONS), true);
  assert.equal(isOverlayExtractionCode("MT_L1_G2", SAMPLE_EXTRACTIONS), false);
});

test("toothHasTimBaseExtraction: unmapped tooth is TIM bucket", () => {
  assert.equal(toothHasTimBaseExtraction(3, {}, SAMPLE_EXTRACTIONS), true);
});

test("toothHasTimBaseExtraction: missing teeth is not TIM base", () => {
  assert.equal(
    toothHasTimBaseExtraction(3, { 3: "MT_L1_G2" }, SAMPLE_EXTRACTIONS),
    false
  );
});

test("toothHasTimBaseExtraction: explicit TIM code is TIM base", () => {
  assert.equal(
    toothHasTimBaseExtraction(3, { 3: "TIM1" }, SAMPLE_EXTRACTIONS),
    true
  );
});

test("isOverlayExtractionCode does not match by clasp name alone", () => {
  assert.equal(
    isOverlayExtractionCode("CLASP_L1_G6", [{ code: "CLASP_L1_G6", name: "Clasps", overlay: "No", status: "Active" }]),
    false
  );
});

test("toothHasTimBaseExtraction: missing teeth is not TIM base for overlay", () => {
  assert.equal(
    toothHasTimBaseExtraction(5, { 5: "MT_L1_G2" }, SAMPLE_EXTRACTIONS),
    false
  );
});
