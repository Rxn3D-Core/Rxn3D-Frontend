import test from "node:test";
import assert from "node:assert/strict";

import {
  hasRetentionOptions,
  resolveStageSelection,
  shouldSkipStageSelection,
  getResolvedStageName,
  SKIPPED_STAGE_LABEL,
} from "./categoryHelpers.ts";

test("treats has_retention Yes as fixed even when retention_options are omitted", () => {
  assert.equal(hasRetentionOptions({ has_retention: "Yes" }), true);
});

test("treats has_retention No as non-retention even when retention_options are omitted", () => {
  assert.equal(hasRetentionOptions({ has_retention: "No" }), false);
});

test("falls back to retention_options array when has_retention is absent", () => {
  assert.equal(hasRetentionOptions({ retention_options: [{ id: 1 }] }), true);
});

test("resolveStageSelection skips when is_single_stage is Yes", () => {
  const r = resolveStageSelection({ is_single_stage: "Yes", stages: [{ name: "Finish" }] });
  assert.equal(r.kind, "skip");
  assert.equal(r.stageLabel, SKIPPED_STAGE_LABEL);
});

test("resolveStageSelection skips when is_single_stage is No and stages array is empty", () => {
  const r = resolveStageSelection({ is_single_stage: "No", stages: [] });
  assert.equal(r.kind, "skip");
});

test("resolveStageSelection auto-selects the only stage when is_single_stage is No", () => {
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
