import test from "node:test";
import assert from "node:assert/strict";

import {
  archHasSingleDefaultOnlyProduct,
  canShowAddProductButton,
  isSingleDefaultOnlyProduct,
} from "./archAddProductReadiness.ts";

const singleDefaultProduct = {
  id: 1,
  extractions: [
    {
      name: "Missing teeth",
      code: "MT1",
      is_default: "Yes",
      is_tim: "No",
      status: "Active",
    },
  ],
};

const multiExtractionProduct = {
  id: 2,
  extractions: [
    {
      name: "Teeth in mouth",
      code: "TIM1",
      is_default: "Yes",
      is_tim: "Yes",
      status: "Active",
    },
    {
      name: "Missing teeth",
      code: "MT1",
      is_default: "No",
      is_tim: "No",
      status: "Active",
    },
  ],
};

const impressionOnlyProduct = {
  id: 3,
  has_impression: "Yes",
  has_extraction: "No",
  extractions: [],
};

test("isSingleDefaultOnlyProduct detects full-arch default products", () => {
  assert.equal(isSingleDefaultOnlyProduct(singleDefaultProduct), true);
  assert.equal(isSingleDefaultOnlyProduct(multiExtractionProduct), false);
  assert.equal(isSingleDefaultOnlyProduct(impressionOnlyProduct), false);
});

test("canShowAddProductButton hides when single-default-only product is on arch", () => {
  assert.equal(
    canShowAddProductButton({
      arch: "maxillary",
      hasProductsOnArch: true,
      allAccordionsCompleteOnArch: true,
      archIncomplete: false,
      removableCard0Blocked: false,
      oppositeArchHasProducts: false,
      oppositeArchReady: false,
      inlineAddProductArch: null,
      hasSingleDefaultOnlyProduct: true,
    }),
    false
  );
});

test("canShowAddProductButton still shows for complete multi-status arch", () => {
  assert.equal(
    canShowAddProductButton({
      arch: "maxillary",
      hasProductsOnArch: true,
      allAccordionsCompleteOnArch: true,
      archIncomplete: false,
      removableCard0Blocked: false,
      oppositeArchHasProducts: false,
      oppositeArchReady: false,
      inlineAddProductArch: null,
      hasSingleDefaultOnlyProduct: false,
    }),
    true
  );
});

test("archHasSingleDefaultOnlyProduct checks card 0 and added products", () => {
  assert.equal(
    archHasSingleDefaultOnlyProduct("maxillary", {
      initialArch: "maxillary",
      selectedProductId: 1,
      initialProductDetails: singleDefaultProduct,
      addedProducts: [],
    }),
    true
  );

  assert.equal(
    archHasSingleDefaultOnlyProduct("maxillary", {
      initialArch: "maxillary",
      selectedProductId: 2,
      initialProductDetails: multiExtractionProduct,
      addedProducts: [],
    }),
    false
  );

  assert.equal(
    archHasSingleDefaultOnlyProduct("maxillary", {
      initialArch: "maxillary",
      selectedProductId: 2,
      initialProductDetails: multiExtractionProduct,
      addedProducts: [
        {
          id: 99,
          arch: "maxillary",
          productId: 1,
          product: singleDefaultProduct,
          expanded: true,
        },
      ],
    }),
    true
  );

  assert.equal(
    archHasSingleDefaultOnlyProduct("maxillary", {
      initialArch: "maxillary",
      selectedProductId: 3,
      initialProductDetails: impressionOnlyProduct,
      addedProducts: [],
    }),
    false
  );
});
