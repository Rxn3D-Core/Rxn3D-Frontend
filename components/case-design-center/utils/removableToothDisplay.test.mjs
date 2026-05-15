import test from "node:test";
import assert from "node:assert/strict";

import {
  getCardScopedSelectedTeeth,
  getRemovableHeaderTeeth,
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
