import test from "node:test";
import assert from "node:assert/strict";

import {
  addedProductAppliesToArch,
  getActiveProductLayersOnArch,
  isActiveProductSelectionOnlyOnArch,
  shouldUseRemovableToothChartPath,
} from "./activeProductChartMode.ts";

test("addedProductAppliesToArch accepts matching arch and both", () => {
  assert.equal(
    addedProductAppliesToArch({ id: 1, arch: "maxillary", product: {}, expanded: true }, "maxillary"),
    true
  );
  assert.equal(
    addedProductAppliesToArch({ id: 1, arch: "both", product: {}, expanded: true }, "maxillary"),
    true
  );
  assert.equal(
    addedProductAppliesToArch({ id: 1, arch: "mandibular", product: {}, expanded: true }, "maxillary"),
    false
  );
});

test("fixed added product is not selection-only", () => {
  const selectionOnly = isActiveProductSelectionOnlyOnArch({
    arch: "maxillary",
    activeProductCardId: 99,
    addedProducts: [
      {
        id: 99,
        arch: "maxillary",
        expanded: true,
        productId: 501,
        product: { has_retention: "Yes", retention_options: [{ id: 1 }] },
      },
    ],
    getToothProduct: () => null,
    getToothProductCard: () => 99,
    allArchTeeth: [1, 2, 3, 4],
    initialProductDetails: { has_retention: "No" },
    initialProductDetailsPending: false,
    initialArch: "maxillary",
  });
  assert.equal(selectionOnly, false);
});

test("removable card 0 stays selection-only when no fixed group override", () => {
  const selectionOnly = isActiveProductSelectionOnlyOnArch({
    arch: "maxillary",
    activeProductCardId: 0,
    addedProducts: [],
    getToothProduct: () => null,
    getToothProductCard: () => 0,
    allArchTeeth: [1, 2, 3, 4],
    initialProductDetails: { has_retention: "No" },
    initialProductDetailsPending: false,
    initialArch: "maxillary",
    activeFixedGroupProductId: null,
  });
  assert.equal(selectionOnly, true);
});

test("removable chart path is off when a fixed card-0 group is active", () => {
  assert.equal(
    shouldUseRemovableToothChartPath({
      arch: "maxillary",
      activeProductCardId: 0,
      activeFixedGroupProductId: 12,
      isActiveProductSelectionOnly: true,
    }),
    false
  );
});

test("removable chart path follows active removable added card", () => {
  assert.equal(
    shouldUseRemovableToothChartPath({
      arch: "maxillary",
      activeProductCardId: 8,
      activeFixedGroupProductId: null,
      isActiveProductSelectionOnly: true,
    }),
    true
  );
});

const layersParams = (product) => ({
  arch: "maxillary",
  activeProductCardId: 7,
  addedProducts: [
    { id: 7, arch: "maxillary", expanded: true, productId: 700, product },
  ],
  getToothProduct: () => null,
  getToothProductCard: () => 7,
  allArchTeeth: [1, 2, 3, 4],
  initialProductDetails: null,
  initialProductDetailsPending: false,
  initialArch: "maxillary",
});

test("getActiveProductLayersOnArch resolves the four capability combinations", () => {
  assert.deepEqual(
    getActiveProductLayersOnArch(layersParams({ has_retention: "Yes", has_extraction: "No" })),
    { retention: true, extraction: false }
  );
  assert.deepEqual(
    getActiveProductLayersOnArch(layersParams({ has_retention: "No", has_extraction: "Yes" })),
    { retention: false, extraction: true }
  );
  assert.deepEqual(
    getActiveProductLayersOnArch(layersParams({ has_retention: "Yes", has_extraction: "Yes" })),
    { retention: true, extraction: true }
  );
  assert.deepEqual(
    getActiveProductLayersOnArch(layersParams({ has_retention: "No", has_extraction: "No" })),
    { retention: false, extraction: false }
  );
});

test("getActiveProductLayersOnArch returns all-false when product can't be resolved", () => {
  assert.deepEqual(
    getActiveProductLayersOnArch({
      arch: "maxillary",
      activeProductCardId: 0,
      addedProducts: [],
      getToothProduct: () => null,
      getToothProductCard: () => 0,
      allArchTeeth: [1, 2, 3, 4],
      initialProductDetails: null,
      initialProductDetailsPending: true,
      initialArch: "maxillary",
      activeFixedGroupProductId: null,
    }),
    { retention: false, extraction: false }
  );
});

test("getActiveProductLayersOnArch: a 'both' added product keeps extraction alive (binary helper collapses it)", () => {
  const params = layersParams({ has_retention: "Yes", has_extraction: "Yes" });
  // The legacy binary helper reports NOT selection-only (retention wins)...
  assert.equal(isActiveProductSelectionOnlyOnArch(params), false);
  // ...but the layer resolver preserves the extraction capability.
  assert.equal(getActiveProductLayersOnArch(params).extraction, true);
});

test("fixed added product stays retention path even when card 0 initial is non-retention", () => {
  const selectionOnly = isActiveProductSelectionOnlyOnArch({
    arch: "maxillary",
    activeProductCardId: 42,
    addedProducts: [
      {
        id: 42,
        arch: "maxillary",
        expanded: true,
        productId: 900,
        product: { has_retention: "Yes", retention_options: [{ id: 1, name: "Prep" }] },
      },
    ],
    getToothProduct: () => null,
    getToothProductCard: () => 0,
    allArchTeeth: [1, 2, 3, 4],
    initialProductDetails: { has_retention: "No" },
    initialProductDetailsPending: false,
    initialArch: "maxillary",
  });
  assert.equal(selectionOnly, false);
  assert.equal(
    shouldUseRemovableToothChartPath({
      arch: "maxillary",
      activeProductCardId: 42,
      activeFixedGroupProductId: null,
      isActiveProductSelectionOnly: selectionOnly,
    }),
    false
  );
});
