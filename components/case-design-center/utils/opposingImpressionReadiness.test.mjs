import test from "node:test";
import assert from "node:assert/strict";

import {
  archHasOpposingImpressionSelections,
  getOpposingArch,
  getOpposingImpressionRequirement,
  resolveOpposingFieldStorage,
  resolveOpposingImpressionProductId,
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

test("resolveOpposingFieldStorage maps maxillary-primary opposing to maxillary sentinel", () => {
  assert.deepEqual(resolveOpposingFieldStorage("maxillary"), {
    fieldArch: "maxillary",
    fieldTooth: 1,
  });
});

test("resolveOpposingImpressionProductId finds non-zero product keys", () => {
  const selected = { "42_mandibular_alginate": 1 };
  assert.equal(
    resolveOpposingImpressionProductId({ id: 42 }, selected, "mandibular"),
    "42"
  );
});

test("archHasOpposingImpressionSelections ignores primary-arch keys", () => {
  assert.equal(
    archHasOpposingImpressionSelections(
      { "0_maxillary_alginate": 1, "42_mandibular_light": 1 },
      "mandibular"
    ),
    true
  );
  assert.equal(
    archHasOpposingImpressionSelections({ "0_maxillary_alginate": 1 }, "mandibular"),
    false
  );
});
