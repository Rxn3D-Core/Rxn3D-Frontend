import test from "node:test";
import assert from "node:assert/strict";

import { filterToothStateForActiveCard } from "./activeRemovableCardState.js";

test("filters removable tooth state to the active added card", () => {
  const result = filterToothStateForActiveCard({
    activeProductCardId: 12,
    selectedTeeth: [5, 9, 12],
    toothExtractionMap: { 5: "MT", 9: "WED", 12: "MT" },
    toothStatusByTooth: { 5: "MT", 9: "WED", 12: "MT" },
    claspTeeth: [5, 12],
    willExtractTeeth: [9],
    missingTeeth: [5, 12],
    getToothProductCard: (arch, toothNumber) => {
      void arch;
      return toothNumber === 12 ? 12 : 0;
    },
    arch: "maxillary",
  });

  assert.deepEqual(result.selectedTeeth, [12]);
  assert.deepEqual(result.toothExtractionMap, { 12: "MT" });
  assert.deepEqual(result.toothStatusByTooth, { 12: "MT" });
  assert.deepEqual(result.claspTeeth, [12]);
  assert.deepEqual(result.willExtractTeeth, []);
  assert.deepEqual(result.missingTeeth, [12]);
});

test("returns original state when no added removable card is active", () => {
  const input = {
    activeProductCardId: 0,
    selectedTeeth: [5, 9],
    toothExtractionMap: { 5: "MT", 9: "WED" },
    toothStatusByTooth: { 5: "MT", 9: "WED" },
    claspTeeth: [5],
    willExtractTeeth: [9],
    missingTeeth: [5],
    getToothProductCard: () => 0,
    arch: "mandibular",
  };

  const result = filterToothStateForActiveCard(input);

  assert.deepEqual(result.selectedTeeth, input.selectedTeeth);
  assert.deepEqual(result.toothExtractionMap, input.toothExtractionMap);
  assert.deepEqual(result.toothStatusByTooth, input.toothStatusByTooth);
  assert.deepEqual(result.claspTeeth, input.claspTeeth);
  assert.deepEqual(result.willExtractTeeth, input.willExtractTeeth);
  assert.deepEqual(result.missingTeeth, input.missingTeeth);
});

test("returns empty status arrays when none are provided", () => {
  const result = filterToothStateForActiveCard({
    activeProductCardId: 7,
    selectedTeeth: [8],
    toothExtractionMap: {},
    toothStatusByTooth: {},
    claspTeeth: [],
    getToothProductCard: () => 7,
    arch: "maxillary",
  });

  assert.deepEqual(result.willExtractTeeth, []);
  assert.deepEqual(result.missingTeeth, []);
});
