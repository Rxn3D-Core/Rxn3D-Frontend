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

test("requires opposing impression when opposite_impression is enabled", () => {
  const requirement = getOpposingImpressionRequirement({
    initialArch: "maxillary",
    hasOppositeSection: true,
    oppositeImpressionEnabled: true,
    noOpposingNeeded: {},
    getCard0TeethForArch: () => [],
  });

  assert.equal(requirement.required, true);
  assert.equal(requirement.arch, "mandibular");
  assert.equal(requirement.tooth, 17);
});

test("skip opposing clears requirement", () => {
  const requirement = getOpposingImpressionRequirement({
    initialArch: "maxillary",
    hasOppositeSection: true,
    oppositeImpressionEnabled: true,
    noOpposingNeeded: { "0_mandibular_17": true },
    getCard0TeethForArch: () => [],
  });

  assert.equal(requirement.required, false);
});

test("resolveOpposingImpressionTooth prefers lowest card-0 tooth", () => {
  assert.equal(resolveOpposingImpressionTooth("maxillary", [8, 3]), 3);
});
