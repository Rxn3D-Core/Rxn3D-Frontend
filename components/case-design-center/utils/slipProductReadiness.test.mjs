import test from "node:test";
import assert from "node:assert/strict";

import {
  archHasAnyConfiguredProduct,
  countRemovableProductTeethOnCard,
  countRemovableHeaderTeethOnCard,
  isRemovableCardReadyForSubmit,
  areArchRemovableProductsReadyForSubmit,
  areArchFixedAddedProductsReadyForSubmit,
} from "./slipProductReadiness.ts";

const MANDIBULAR = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const fieldsComplete = () => true;
const fieldsIncomplete = () => false;

test("archHasAnyConfiguredProduct is true when only an added removable exists", () => {
  assert.equal(
    archHasAnyConfiguredProduct({
      hasTeethOrRetentionProducts: false,
      hasFixedAdded: false,
      hasRemovableAdded: true,
    }),
    true
  );
});

test("countRemovableProductTeethOnCard counts owned selected teeth only", () => {
  assert.equal(
    countRemovableProductTeethOnCard({
      arch: "mandibular",
      cardId: 2,
      selectedTeeth: [21, 22, 25],
      getToothProductCard: (_arch, tn) => (tn === 25 ? 0 : 2),
    }),
    2
  );
});

test("countRemovableHeaderTeethOnCard counts owned uncoded product teeth", () => {
  assert.equal(
    countRemovableHeaderTeethOnCard({
      arch: "mandibular",
      cardId: 2,
      allArchTeeth: MANDIBULAR,
      selectedTeeth: [],
      toothExtractionMap: {},
      getToothProductCard: (_arch, tn) => (tn === 26 || tn === 27 ? 2 : 0),
    }),
    2
  );
});

test("removable card is not ready with zero product teeth when selection is required", () => {
  const product = {
    id: 10,
    name: "Metal Frame Acrylic",
    extractions: [
      {
        code: "TIM1",
        name: "Teeth in mouth",
        status: "Active",
        is_default: "Yes",
        is_tim: "Yes",
        is_required: "No",
        is_optional: "No",
        sequence: 1,
      },
      {
        code: "MT",
        name: "Missing teeth",
        status: "Active",
        is_default: "No",
        is_required: "Yes",
        is_optional: "No",
        min_teeth: 1,
        sequence: 2,
      },
    ],
  };

  assert.equal(
    isRemovableCardReadyForSubmit({
      arch: "mandibular",
      cardId: 2,
      product,
      allArchTeeth: MANDIBULAR,
      selectedTeeth: [],
      toothExtractionMap: {},
      claspTeeth: [],
      getToothProduct: () => product,
      getToothProductCard: () => 0,
      areSelectionFieldsComplete: fieldsComplete,
    }),
    false
  );
});

test("product teeth stamped with a non-TIM default still count toward submit", () => {
  const product = {
    id: 11,
    name: "Immediate Denture",
    extractions: [
      {
        code: "WED",
        name: "Will extract on delivery",
        status: "Active",
        is_default: "Yes",
        is_tim: "No",
        is_required: "Yes",
        is_optional: "No",
        min_teeth: 1,
        sequence: 1,
      },
      {
        code: "MT",
        name: "Missing teeth",
        status: "Active",
        is_default: "No",
        is_required: "No",
        is_optional: "Yes",
        sequence: 2,
      },
    ],
  };

  assert.equal(
    isRemovableCardReadyForSubmit({
      arch: "mandibular",
      cardId: 2,
      product,
      allArchTeeth: MANDIBULAR,
      selectedTeeth: [],
      toothExtractionMap: { 27: "WED", 28: "WED", 29: "WED" },
      claspTeeth: [],
      getToothProduct: () => product,
      getToothProductCard: (_arch, tn) => (tn >= 27 && tn <= 29 ? 2 : 0),
      areSelectionFieldsComplete: fieldsComplete,
    }),
    true
  );
});

test("removable card with product teeth and complete fields is ready for submit", () => {
  const product = {
    id: 10,
    name: "Metal Frame Acrylic",
    extractions: [
      {
        code: "TIM1",
        name: "Teeth in mouth",
        status: "Active",
        is_default: "Yes",
        is_tim: "Yes",
        is_required: "No",
        is_optional: "No",
        sequence: 1,
      },
      {
        code: "MT",
        name: "Missing teeth",
        status: "Active",
        is_default: "No",
        is_required: "Yes",
        is_optional: "No",
        min_teeth: 1,
        sequence: 2,
      },
    ],
  };

  assert.equal(
    isRemovableCardReadyForSubmit({
      arch: "mandibular",
      cardId: 2,
      product,
      allArchTeeth: MANDIBULAR,
      selectedTeeth: [26, 27],
      toothExtractionMap: {},
      claspTeeth: [],
      getToothProduct: () => product,
      getToothProductCard: (_a, tn) => (tn === 26 || tn === 27 ? 2 : 0),
      areSelectionFieldsComplete: fieldsComplete,
    }),
    true
  );
});

test("removable card is not ready when selection fields are incomplete", () => {
  const product = {
    id: 10,
    name: "Metal Frame Acrylic",
    extractions: [
      {
        code: "TIM1",
        name: "Teeth in mouth",
        status: "Active",
        is_default: "Yes",
        is_tim: "Yes",
        sequence: 1,
      },
      {
        code: "MT",
        name: "Missing",
        status: "Active",
        is_default: "No",
        sequence: 2,
      },
    ],
  };

  assert.equal(
    isRemovableCardReadyForSubmit({
      arch: "mandibular",
      cardId: 2,
      product,
      allArchTeeth: MANDIBULAR,
      selectedTeeth: [21],
      toothExtractionMap: {},
      claspTeeth: [],
      getToothProduct: () => product,
      getToothProductCard: () => 2,
      areSelectionFieldsComplete: fieldsIncomplete,
    }),
    false
  );
});

test("arch removable readiness fails when an added card has no teeth yet", () => {
  const product = {
    id: 10,
    name: "Metal Frame Acrylic",
    extractions: [
      {
        code: "TIM1",
        name: "Teeth in mouth",
        status: "Active",
        is_default: "Yes",
        is_tim: "Yes",
        is_required: "No",
        is_optional: "No",
        sequence: 1,
      },
      {
        code: "MT",
        name: "Missing",
        status: "Active",
        is_default: "No",
        is_required: "Yes",
        is_optional: "No",
        min_teeth: 1,
        sequence: 2,
      },
    ],
  };

  assert.equal(
    areArchRemovableProductsReadyForSubmit({
      arch: "mandibular",
      addedProducts: [{ id: 2, arch: "mandibular", productId: 10, product }],
      card0IsRemovable: false,
      card0Product: null,
      allArchTeeth: MANDIBULAR,
      selectedTeeth: [],
      toothExtractionMap: {},
      claspTeeth: [],
      getToothProduct: (_a, tn) => (tn === -2 ? product : null),
      getToothProductCard: () => 0,
      areSelectionFieldsComplete: fieldsComplete,
    }),
    false
  );
});

test("fixed added product is not ready until a retention tooth is assigned", () => {
  assert.equal(
    areArchFixedAddedProductsReadyForSubmit({
      arch: "mandibular",
      addedProducts: [
        {
          id: 3,
          arch: "mandibular",
          productId: 99,
          product: { id: 99, retention_options: [{ id: 1 }] },
        },
      ],
      retentionTypesByTooth: {},
      getToothProductCard: () => 3,
    }),
    false
  );

  assert.equal(
    areArchFixedAddedProductsReadyForSubmit({
      arch: "mandibular",
      addedProducts: [
        {
          id: 3,
          arch: "mandibular",
          productId: 99,
          product: { id: 99, retention_options: [{ id: 1 }] },
        },
      ],
      retentionTypesByTooth: { 21: ["Prep"] },
      getToothProductCard: () => 3,
    }),
    true
  );
});
