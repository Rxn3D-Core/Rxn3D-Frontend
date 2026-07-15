import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveRemovablePopoverExtractionsForActiveCard,
  shouldApplyExtractionOnPopoverSelect,
} from "./removableToothPopoverAssign.ts";

test("popover select does not toggle off when the same extraction code is chosen", () => {
  assert.equal(shouldApplyExtractionOnPopoverSelect("MT", "MT"), false);
  assert.equal(shouldApplyExtractionOnPopoverSelect(undefined, "MT"), true);
  assert.equal(shouldApplyExtractionOnPopoverSelect("WE", "MT"), true);
});

test("resolveRemovablePopoverExtractionsForActiveCard prefers card product extractions", () => {
  const extractions = resolveRemovablePopoverExtractionsForActiveCard({
    useArchSharedRemovable: false,
    mergedExtractions: [],
    activeProductCardId: 42,
    addedProducts: [{ id: 42, arch: "maxillary", product: { extractions: [{ code: "MT", name: "Missing" }] } }],
    arch: "maxillary",
    allArchTeeth: [7, 8, 9],
    getToothProduct: () => null,
    getToothProductCard: () => null,
    card0Extractions: [],
  });

  assert.deepEqual(extractions, [{ code: "MT", name: "Missing" }]);
});
