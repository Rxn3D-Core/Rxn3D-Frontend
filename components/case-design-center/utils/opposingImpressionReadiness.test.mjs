import test from "node:test";
import assert from "node:assert/strict";

import {
  getOpposingArch,
  getOpposingImpressionRequirement,
  hasSkippedOpposing,
  resolveOpposingImpressionTooth,
} from "./opposingImpressionReadiness.ts";

test("opposing arch for maxillary-primary slip is mandibular", () => {
  assert.equal(getOpposingArch("maxillary"), "mandibular");
});

test("opposing impression is never required", () => {
  const requirement = getOpposingImpressionRequirement({
    initialArch: "maxillary",
    hasOppositeSection: true,
    oppositeImpressionEnabled: true,
    noOpposingNeeded: {},
    getCard0TeethForArch: () => [],
  });

  assert.equal(requirement.required, false);
  assert.equal(requirement.arch, null);
  assert.equal(requirement.tooth, null);
});

test("resolveOpposingImpressionTooth prefers lowest card-0 tooth", () => {
  assert.equal(resolveOpposingImpressionTooth("maxillary", [8, 3]), 3);
});
