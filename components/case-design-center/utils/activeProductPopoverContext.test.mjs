import test from "node:test";
import assert from "node:assert/strict";

import { getActiveProductPopoverContextToken } from "./activeProductPopoverContext.js";

test("changes token when switching between removable and fixed added cards", () => {
  const removable = getActiveProductPopoverContextToken({
    arch: "maxillary",
    activeProductCardId: 12,
    activeFixedGroupProductId: null,
    activeProductIsRemovables: true,
    hasOpposingProduct: false,
  });

  const fixed = getActiveProductPopoverContextToken({
    arch: "maxillary",
    activeProductCardId: 12,
    activeFixedGroupProductId: null,
    activeProductIsRemovables: false,
    hasOpposingProduct: false,
  });

  assert.notEqual(removable, fixed);
});

test("changes token when switching between added cards", () => {
  const first = getActiveProductPopoverContextToken({
    arch: "mandibular",
    activeProductCardId: 4,
    activeFixedGroupProductId: null,
    activeProductIsRemovables: true,
    hasOpposingProduct: false,
  });

  const second = getActiveProductPopoverContextToken({
    arch: "mandibular",
    activeProductCardId: 5,
    activeFixedGroupProductId: null,
    activeProductIsRemovables: true,
    hasOpposingProduct: false,
  });

  assert.notEqual(first, second);
});

test("changes token when switching fixed card-0 groups", () => {
  const first = getActiveProductPopoverContextToken({
    arch: "maxillary",
    activeProductCardId: 0,
    activeFixedGroupProductId: 101,
    activeProductIsRemovables: false,
    hasOpposingProduct: false,
  });

  const second = getActiveProductPopoverContextToken({
    arch: "maxillary",
    activeProductCardId: 0,
    activeFixedGroupProductId: 202,
    activeProductIsRemovables: false,
    hasOpposingProduct: false,
  });

  assert.notEqual(first, second);
});

test("includes opposing mode for card-0 tooth status behavior", () => {
  const noOpposing = getActiveProductPopoverContextToken({
    arch: "mandibular",
    activeProductCardId: 0,
    activeFixedGroupProductId: null,
    activeProductIsRemovables: false,
    hasOpposingProduct: false,
  });

  const withOpposing = getActiveProductPopoverContextToken({
    arch: "mandibular",
    activeProductCardId: 0,
    activeFixedGroupProductId: null,
    activeProductIsRemovables: false,
    hasOpposingProduct: true,
  });

  assert.notEqual(noOpposing, withOpposing);
});
