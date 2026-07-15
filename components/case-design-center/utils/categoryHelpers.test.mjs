import test from "node:test";
import assert from "node:assert/strict";

import {
  hasRetentionOptions,
  hasExtractionOptions,
  getProductLayers,
  resolveStageSelection,
  shouldSkipStageSelection,
  productHasStageField,
  getResolvedStageName,
  isDisplayableStageValue,
  SKIPPED_STAGE_LABEL,
  parseStageFieldValue,
  resolveStageIdFromSelection,
} from "./categoryHelpers.ts";

test("treats has_retention Yes as fixed even when retention_options are omitted", () => {
  assert.equal(hasRetentionOptions({ has_retention: "Yes" }), true);
});

test("hasExtractionOptions: flag Yes wins even without extractions array", () => {
  assert.equal(hasExtractionOptions({ has_extraction: "Yes" }), true);
});

test("hasExtractionOptions: flag No wins even when extractions present", () => {
  assert.equal(
    hasExtractionOptions({ has_extraction: "No", extractions: [{ code: "MT" }] }),
    false
  );
});

test("hasExtractionOptions: falls back to extractions array when flag absent", () => {
  assert.equal(hasExtractionOptions({ extractions: [{ code: "MT" }] }), true);
  assert.equal(hasExtractionOptions({ extractions: [] }), false);
  assert.equal(hasExtractionOptions(null), false);
});

test("getProductLayers reports all four capability combinations", () => {
  assert.deepEqual(
    getProductLayers({ has_retention: "Yes", has_extraction: "No" }),
    { retention: true, extraction: false }
  );
  assert.deepEqual(
    getProductLayers({ has_retention: "No", has_extraction: "Yes" }),
    { retention: false, extraction: true }
  );
  assert.deepEqual(
    getProductLayers({ has_retention: "Yes", has_extraction: "Yes" }),
    { retention: true, extraction: true }
  );
  assert.deepEqual(
    getProductLayers({ has_retention: "No", has_extraction: "No" }),
    { retention: false, extraction: false }
  );
});

test("treats has_retention No as non-retention even when retention_options are omitted", () => {
  assert.equal(hasRetentionOptions({ has_retention: "No" }), false);
});

test("falls back to retention_options array when has_retention is absent", () => {
  assert.equal(hasRetentionOptions({ retention_options: [{ id: 1 }] }), true);
});

test("productHasStageField is false when has_stage is No", () => {
  assert.equal(
    productHasStageField({
      has_stage: "No",
      stages: [{ name: "Custom Trays" }],
    }),
    false
  );
});

test("productHasStageField is false when is_single_stage is Yes", () => {
  assert.equal(
    productHasStageField({ is_single_stage: "Yes", stages: [{ name: "Finish" }] }),
    false
  );
});

test("productHasStageField is false when stages array is empty or missing", () => {
  assert.equal(productHasStageField({ is_single_stage: "No", stages: [] }), false);
  assert.equal(productHasStageField({ is_single_stage: "No" }), false);
});

test("productHasStageField is true when stages has one or more entries", () => {
  assert.equal(
    productHasStageField({
      is_single_stage: "No",
      stages: [{ name: "Custom Trays" }],
    }),
    true
  );
});

test("resolveStageSelection auto-selects the only stage when field is shown", () => {
  const r = resolveStageSelection({
    is_single_stage: "No",
    stages: [{ name: "Bite Block", is_default: "No" }],
  });
  assert.deepEqual(r, { kind: "auto", stageName: "Bite Block" });
});

test("resolveStageSelection auto-selects default when multiple stages exist", () => {
  const r = resolveStageSelection({
    is_single_stage: "No",
    stages: [
      { name: "Try In", is_default: "No" },
      { name: "Finish", is_default: "Yes" },
    ],
  });
  assert.deepEqual(r, { kind: "auto", stageName: "Finish" });
});

test("resolveStageSelection prompts when multiple stages and no default", () => {
  const r = resolveStageSelection({
    is_single_stage: "No",
    stages: [
      { name: "Try In", is_default: "No" },
      { name: "Finish", is_default: "No" },
    ],
  });
  assert.equal(r.kind, "prompt");
});

test("shouldSkipStageSelection is false when user must pick a stage", () => {
  assert.equal(
    shouldSkipStageSelection({
      is_single_stage: "No",
      stages: [
        { name: "A", is_default: "No" },
        { name: "B", is_default: "No" },
      ],
    }),
    false
  );
});

test("getResolvedStageName returns null when prompt is required", () => {
  assert.equal(
    getResolvedStageName({
      is_single_stage: "No",
      stages: [
        { name: "A", is_default: "No" },
        { name: "B", is_default: "No" },
      ],
    }),
    null
  );
});

test("isDisplayableStageValue rejects skip placeholder", () => {
  assert.equal(isDisplayableStageValue(SKIPPED_STAGE_LABEL), false);
  assert.equal(isDisplayableStageValue("Custom Trays"), true);
});

test("parseStageFieldValue reads stage_id from JSON", () => {
  assert.deepEqual(
    parseStageFieldValue('{"stage_id":13,"name":"Custom Trays"}'),
    { stage_id: 13, name: "Custom Trays" }
  );
  assert.deepEqual(parseStageFieldValue("Custom Trays"), { name: "Custom Trays" });
});

test("resolveStageIdFromSelection prefers stored stage_id", () => {
  const product = { stages: [{ name: "Custom Trays", stage_id: 13 }] };
  assert.equal(
    resolveStageIdFromSelection(product, '{"stage_id":13,"name":"Custom Trays"}', null),
    13
  );
  assert.equal(resolveStageIdFromSelection(product, null, "Custom Trays"), 13);
});

test("resolveStageIdFromSelection resolves plain stage name from selectedStages fallback", () => {
  const product = {
    stages: [
      { name: "Bite block", stage_id: 42, id: 42 },
      { name: "Finish", stage_id: 43, id: 43 },
    ],
  };
  assert.equal(resolveStageIdFromSelection(product, "Bite block", "Bite block"), 42);
  assert.equal(resolveStageIdFromSelection(product, null, "Bite block"), 42);
});
