import test from "node:test";
import assert from "node:assert/strict";

import {
  isSingleDefaultOnlyExtractionList,
  isExtractionSelectionOptional,
  canSkipExtractionToothSelection,
  shouldAutoSelectArchForDefaultExtraction,
  isOverlayExtractionCode,
  toothHasTimBaseExtraction,
  isDirectTwoExtractionToggleEligible,
  resolveDirectTwoExtractionToggleCode,
  resolveDirectTwoExtractionToggleAction,
} from "./extractionHelpers.ts";

const SAMPLE_EXTRACTIONS = [
  { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", overlay: "No", status: "Active" },
  { name: "Missing teeth", code: "MT_L1_G2", is_default: "No", is_tim: "No", overlay: "No", status: "Active" },
  { name: "Clasps", code: "CLASP_L1_G6", is_default: "No", is_tim: "No", overlay: "Yes", status: "Active" },
];

const IMMEDIATE_FULL_DENTURE_EXTRACTIONS = [
  {
    name: "Missing teeth",
    code: "MT_IFD",
    is_default: "No",
    is_tim: "No",
    overlay: "No",
    is_optional: "Yes",
    status: "Active",
  },
  {
    name: "Will extract on delivery",
    code: "WE_IFD",
    is_default: "Yes",
    is_tim: "No",
    overlay: "No",
    status: "Active",
  },
];

test("single default extraction list still identifies a TIM-only list", () => {
  const result = isSingleDefaultOnlyExtractionList([
    { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
  ]);

  assert.equal(result, true);
});

test("isExtractionSelectionOptional: single default (orthodontics) is optional", () => {
  assert.equal(
    isExtractionSelectionOptional([
      { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
    ]),
    true
  );
});

test("isExtractionSelectionOptional: default + optional missing tooth (night guard) is optional", () => {
  assert.equal(
    isExtractionSelectionOptional([
      { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", is_optional: "No", status: "Active" },
      { name: "Missing tooth", code: "MT1", is_default: "No", is_optional: "Yes", is_required: "No", status: "Active" },
    ]),
    true
  );
});

test("isExtractionSelectionOptional: required non-default (partial denture) is NOT optional", () => {
  assert.equal(
    isExtractionSelectionOptional([
      { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
      { name: "Missing teeth", code: "MT", is_default: "No", is_required: "Yes", status: "Active" },
    ]),
    false
  );
});

test("isExtractionSelectionOptional: no default extraction is NOT optional", () => {
  assert.equal(
    isExtractionSelectionOptional([
      { name: "Missing teeth", code: "MT", is_default: "No", is_optional: "Yes", status: "Active" },
    ]),
    false
  );
});

test("isExtractionSelectionOptional: empty list is NOT optional", () => {
  assert.equal(isExtractionSelectionOptional([]), false);
});

test("canSkipExtractionToothSelection: empty list skips chart selection", () => {
  assert.equal(canSkipExtractionToothSelection([]), true);
  assert.equal(canSkipExtractionToothSelection(undefined), true);
});

test("canSkipExtractionToothSelection: required non-default still requires selection", () => {
  assert.equal(
    canSkipExtractionToothSelection([
      { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
      { name: "Missing teeth", code: "MT", is_default: "No", is_required: "Yes", status: "Active" },
    ]),
    false
  );
});

test("canSkipExtractionToothSelection: default + optional skips selection", () => {
  assert.equal(
    canSkipExtractionToothSelection([
      { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
      { name: "Missing tooth", code: "MT1", is_default: "No", is_optional: "Yes", status: "Active" },
    ]),
    true
  );
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

test("isDirectTwoExtractionToggleEligible: immediate full denture (2 exclusive, one default, no retention)", () => {
  assert.equal(
    isDirectTwoExtractionToggleEligible(IMMEDIATE_FULL_DENTURE_EXTRACTIONS, { hasRetention: false }),
    true
  );
});

test("isDirectTwoExtractionToggleEligible: rejects when retention is present", () => {
  assert.equal(
    isDirectTwoExtractionToggleEligible(IMMEDIATE_FULL_DENTURE_EXTRACTIONS, { hasRetention: true }),
    false
  );
});

test("isDirectTwoExtractionToggleEligible: rejects 3+ extractions", () => {
  assert.equal(isDirectTwoExtractionToggleEligible(SAMPLE_EXTRACTIONS, { hasRetention: false }), false);
});

test("isDirectTwoExtractionToggleEligible: rejects when one of two is overlay", () => {
  assert.equal(
    isDirectTwoExtractionToggleEligible(
      [
        { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", overlay: "No", status: "Active" },
        { name: "Clasps", code: "CLASP1", is_default: "No", overlay: "Yes", status: "Active" },
      ],
      { hasRetention: false }
    ),
    false
  );
});

test("resolveDirectTwoExtractionToggleCode: toggles default ↔ non-default both ways", () => {
  assert.equal(
    resolveDirectTwoExtractionToggleCode("WE_IFD", IMMEDIATE_FULL_DENTURE_EXTRACTIONS),
    "MT_IFD"
  );
  assert.equal(
    resolveDirectTwoExtractionToggleCode("MT_IFD", IMMEDIATE_FULL_DENTURE_EXTRACTIONS),
    "WE_IFD"
  );
  assert.equal(
    resolveDirectTwoExtractionToggleCode(undefined, IMMEDIATE_FULL_DENTURE_EXTRACTIONS),
    "MT_IFD"
  );
});

test("resolveDirectTwoExtractionToggleAction: re-stamps non-TIM default", () => {
  assert.deepEqual(
    resolveDirectTwoExtractionToggleAction("MT_IFD", IMMEDIATE_FULL_DENTURE_EXTRACTIONS),
    { type: "assign", code: "WE_IFD" }
  );
  assert.deepEqual(
    resolveDirectTwoExtractionToggleAction("WE_IFD", IMMEDIATE_FULL_DENTURE_EXTRACTIONS),
    { type: "assign", code: "MT_IFD" }
  );
});

test("resolveDirectTwoExtractionToggleAction: clears map when returning to TIM default", () => {
  const timPlusMissing = [
    { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", overlay: "No", status: "Active" },
    { name: "Missing teeth", code: "MT1", is_default: "No", is_tim: "No", overlay: "No", status: "Active" },
  ];
  assert.deepEqual(resolveDirectTwoExtractionToggleAction("MT1", timPlusMissing), {
    type: "clear",
    code: "MT1",
  });
  assert.deepEqual(resolveDirectTwoExtractionToggleAction(undefined, timPlusMissing), {
    type: "assign",
    code: "MT1",
  });
});
