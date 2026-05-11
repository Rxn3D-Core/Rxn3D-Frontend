import test from "node:test";
import assert from "node:assert/strict";

import { resolveRemovableOwnershipUpdate } from "./removableOwnership.js";

test("reassigns an already-selected tooth to the active added removable card", () => {
  const result = resolveRemovableOwnershipUpdate({
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

test("keeps card 0 ownership when the initial removable product is active", () => {
  const result = resolveRemovableOwnershipUpdate({
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
  const result = resolveRemovableOwnershipUpdate({
    isActiveProductRemovables: false,
    activeProductCardId: 9,
    activeArchMatches: true,
    activeProductId: 501,
    currentCardId: 0,
    selectedProductId: 101,
  });

  assert.equal(result, null);
});
