import test from "node:test";
import assert from "node:assert/strict";

import {
  isNoToothChartProduct,
  shouldHideReferenceTeethSelection,
} from "./noToothChartProduct.ts";

test("shouldHideReferenceTeethSelection reads Yes flag", () => {
  assert.equal(shouldHideReferenceTeethSelection({ hide_reference_teeth_selection: "Yes" }), true);
  assert.equal(shouldHideReferenceTeethSelection({ hide_reference_teeth_selection: "No" }), false);
  assert.equal(shouldHideReferenceTeethSelection(null), false);
});

test("isNoToothChartProduct: no extractions or hide_reference", () => {
  assert.equal(
    isNoToothChartProduct({
      has_extraction: "No",
      extractions: [],
      has_impression: "Yes",
    }),
    true
  );
  assert.equal(
    isNoToothChartProduct({
      hide_reference_teeth_selection: "Yes",
      extractions: [
        { name: "Teeth in mouth", code: "TIM1", is_default: "Yes", is_tim: "Yes", status: "Active" },
      ],
    }),
    true
  );
  assert.equal(
    isNoToothChartProduct({
      has_retention: "Yes",
      retention_options: [{ id: 1 }],
      extractions: [],
    }),
    false
  );
  assert.equal(
    isNoToothChartProduct({
      extractions: [
        { name: "Missing teeth", code: "MT1", is_default: "Yes", is_tim: "No", status: "Active" },
      ],
    }),
    false
  );
});
