import test from "node:test";
import assert from "node:assert/strict";

import { resolveProductOwnershipUpdate } from "./productOwnership.js";

test("reassigns an already-selected tooth to the active added product card", () => {
  const result = resolveProductOwnershipUpdate({
    isActiveProductRemovables: true,
    activeProductCardId: 12,
    activeArchMatches: true,
    activeProductId: 501,
    currentCardId: 0,
    selectedProductId: 101,
  });

  assert.deepEqual(result, {
    targetCardId: 12,
    targetProductId: 501,
  });
});

test("keeps card 0 ownership when the initial product is active", () => {
  const result = resolveProductOwnershipUpdate({
    isActiveProductRemovables: true,
    activeProductCardId: 0,
    activeArchMatches: true,
    activeProductId: null,
    currentCardId: 4,
    selectedProductId: 101,
  });

  assert.deepEqual(result, {
    targetCardId: 0,
    targetProductId: 101,
  });
});

test("does nothing when the active product is not removable", () => {
  const result = resolveProductOwnershipUpdate({
    isActiveProductRemovables: false,
    activeProductCardId: 9,
    activeArchMatches: true,
    activeProductId: 501,
    currentCardId: 0,
    selectedProductId: 101,
  });

  assert.equal(result, null);
});
