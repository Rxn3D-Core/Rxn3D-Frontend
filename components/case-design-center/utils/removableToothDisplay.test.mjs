import test from "node:test";
import assert from "node:assert/strict";

import {
  getCardScopedSelectedTeeth,
  getRemovableHeaderTeeth,
  getRemovableOrangeHeaderTeeth,
  getStatusBoxTeeth,
} from "./removableToothDisplay.ts";

test("card-scoped selected teeth exclude status-only teeth owned by the card", () => {
  const teeth = getCardScopedSelectedTeeth({
    selectedTeeth: [2, 8, 11],
    cardId: 7,
    arch: "maxillary",
    getToothProductCard: (_arch, toothNumber) => {
      const mapping = {
        2: 7,
        8: 7,
        10: 7,
        11: 7,
      };

      return mapping[toothNumber] ?? 0;
    },
  });

  assert.deepEqual(teeth, [2, 8, 11]);
});

test("removable header teeth stay tied to product-selected teeth", () => {
  const teeth = getRemovableHeaderTeeth({
    selectedTeeth: [4, 8, 9],
    toothExtractionMap: {
      4: "MT",
      8: "FR",
      9: "FR",
      10: "MT",
    },
    isFullDenture: false,
  });

  assert.deepEqual(teeth, [8, 9]);
});

test("status box teeth include teeth assigned only through extraction map", () => {
  const teeth = getStatusBoxTeeth({
    selectedTeeth: [4, 8, 9],
    toothExtractionMap: {
      4: "MT",
      8: "FR",
      9: "FR",
      10: "MT",
    },
    claspTeeth: [],
    extractionCode: "MT",
    isDefault: false,
    isClasp: false,
  });

  assert.deepEqual(teeth, [4, 10]);
});

test("orange header excludes teeth assigned via active status box", () => {
  const teeth = getRemovableOrangeHeaderTeeth({
    selectedTeeth: [7, 8, 9, 10],
    toothExtractionMap: {
      7: "MT",
      8: "MT",
      9: "MT",
    },
    noActiveBoxTeeth: [],
    isFullDenture: false,
  });

  assert.deepEqual(teeth, [10]);
});

test("orange header shows all scoped teeth when product has only one default status", () => {
  const teeth = getRemovableOrangeHeaderTeeth({
    selectedTeeth: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    toothExtractionMap: {
      1: "MT",
      2: "MT",
      3: "MT",
    },
    noActiveBoxTeeth: [],
    isFullDenture: false,
    isSingleDefaultOnly: true,
  });

  assert.deepEqual(teeth, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
});

test("orange header excludes teeth with overlay clasp assignment only", () => {
  const teeth = getRemovableOrangeHeaderTeeth({
    selectedTeeth: [3, 4, 5],
    toothExtractionMap: {},
    claspTeeth: [4, 5],
    noActiveBoxTeeth: [],
    extractions: [
      { code: "TIM1", is_tim: "Yes", overlay: "No" },
      { code: "CLASP_L1_G6", is_tim: "No", overlay: "Yes" },
    ],
    isFullDenture: false,
  });

  assert.deepEqual(teeth, [3]);
});

test("orange header keeps popover-assigned missing teeth when flagged no-active-box", () => {
  const teeth = getRemovableOrangeHeaderTeeth({
    selectedTeeth: [1, 8, 9, 10, 16],
    toothExtractionMap: {
      1: "MT",
      8: "MT",
      9: "MT",
      10: "MT",
      16: "MT",
    },
    noActiveBoxTeeth: [8, 9, 10],
    isFullDenture: false,
  });

  assert.deepEqual(teeth, [8, 9, 10]);
});

test("default box still uses selected teeth that are not assigned to a specific extraction", () => {
  const teeth = getStatusBoxTeeth({
    selectedTeeth: [3, 4, 8],
    toothExtractionMap: {
      4: "MT",
      10: "FR",
    },
    claspTeeth: [],
    extractionCode: "TIM",
    isDefault: true,
    isClasp: false,
  });

  assert.deepEqual(teeth, [3, 8]);
});
