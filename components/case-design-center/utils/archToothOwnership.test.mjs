import test from "node:test";
import assert from "node:assert/strict";

import {
  buildToothOwnershipConflictMessage,
  filterTeethAvailableForActiveProduct,
  isToothLockedByAnotherProduct,
  resolveProductCardDisplayName,
} from "./archToothOwnership.ts";

test("locks a tooth already owned by another product card", () => {
  const locked = isToothLockedByAnotherProduct({
    arch: "maxillary",
    toothNumber: 9,
    activeProductCardId: 22,
    getToothProductCard: () => 11,
    maxillaryTeeth: [9],
    mandibularTeeth: [],
  });

  assert.equal(locked, true);
});

test("allows an unselected tooth for the active product", () => {
  const locked = isToothLockedByAnotherProduct({
    arch: "maxillary",
    toothNumber: 9,
    activeProductCardId: 22,
    getToothProductCard: () => 11,
    maxillaryTeeth: [],
    mandibularTeeth: [],
  });

  assert.equal(locked, false);
});

test("allows the owning product to modify its own tooth", () => {
  const locked = isToothLockedByAnotherProduct({
    arch: "maxillary",
    toothNumber: 9,
    activeProductCardId: 11,
    getToothProductCard: () => 11,
    maxillaryTeeth: [9],
    mandibularTeeth: [],
  });

  assert.equal(locked, false);
});

test("filters select-all teeth to exclude teeth owned elsewhere", () => {
  const { allowed, blocked } = filterTeethAvailableForActiveProduct("maxillary", [4, 5, 9], {
    activeProductCardId: 22,
    getToothProductCard: (arch, tn) => (tn === 9 ? 11 : 22),
    maxillaryTeeth: [4, 5, 9],
    mandibularTeeth: [],
  });

  assert.deepEqual(allowed, [4, 5]);
  assert.deepEqual(blocked, [9]);
});

test("builds a readable conflict message", () => {
  assert.equal(
    buildToothOwnershipConflictMessage(9, "3 teeth Flipper"),
    'Tooth #9 is already selected for "3 teeth Flipper". It cannot be used on another product.'
  );
});

test("resolves display names for card 0 and added cards", () => {
  assert.equal(
    resolveProductCardDisplayName({
      cardId: 0,
      arch: "maxillary",
      addedProducts: [],
      selectedProductName: "Metal Frame Acrylic",
    }),
    "Metal Frame Acrylic"
  );

  assert.equal(
    resolveProductCardDisplayName({
      cardId: 42,
      arch: "maxillary",
      addedProducts: [
        { id: 42, arch: "maxillary", product: { name: "3 teeth Flipper" }, expanded: true },
      ],
      selectedProductName: "Metal Frame Acrylic",
    }),
    "3 teeth Flipper"
  );
});
