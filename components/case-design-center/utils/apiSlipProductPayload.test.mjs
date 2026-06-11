import assert from "node:assert/strict";
import test from "node:test";

import {
  apiSlipProductToSlipCreationProduct,
  buildBaselineEditSlipProducts,
  mergeEditSlipProductWithBaseline,
} from "./apiSlipProductPayload.ts";

test("apiSlipProductToSlipCreationProduct maps teeth_selection and grouped extractions", () => {
  const product = apiSlipProductToSlipCreationProduct({
    id: 501,
    type: "Upper",
    category: { id: 10 },
    product_id: 101,
    subcategory_id: 20,
    product: { id: 101, subcategory: { id: 20, category_id: 10 } },
    teeth_selection: [
      { teeth_number: 7, retention_option_id: 55 },
      { teeth_number: 8 },
    ],
    extractions: [
      { extraction_id: 202, teeth_numbers: [1, 16] },
      { extraction_id: 303, teeth_numbers: [3, 15] },
    ],
    tooth_chart: [
      { tooth_number: 7, extraction_id: 10 },
      { tooth_number: 1, extraction_id: 202 },
    ],
    impressions: [{ impression_id: 9, quantity: 2 }],
    grade: { grade_id: 4, name: "Standard" },
    teeth_shade: { teeth_shade_id: 11, brand: { id: 22 } },
    gum_shade: { gum_shade_id: 33, brand: { id: 44 } },
    status: "In Progress",
    notes: "Keep shade",
  });

  assert.ok(product);
  assert.equal(product.id, 501);
  assert.equal(product.type, "Upper");
  assert.deepEqual(product.teeth_selection, [
    { teeth_number: 7, retention_option_id: 55 },
    { teeth_number: 8 },
  ]);
  assert.deepEqual(product.extractions, [
    { extraction_id: 202, teeth_numbers: [1, 16] },
    { extraction_id: 303, teeth_numbers: [3, 15] },
  ]);
  assert.deepEqual(product.tooth_chart, [
    { tooth_number: 7, extraction_id: 10 },
    { tooth_number: 1, extraction_id: 202 },
  ]);
  assert.deepEqual(product.impressions, [{ impression_id: 9, quantity: 2 }]);
  assert.equal(product.grade_id, 4);
  assert.equal(product.teeth_shade_id, 11);
  assert.equal(product.teeth_shade_brand_id, 22);
  assert.equal(product.gum_shade_id, 33);
  assert.equal(product.gum_shade_brand_id, 44);
  assert.equal(product.notes, "Keep shade");
});

test("mergeEditSlipProductWithBaseline keeps API teeth when collector omits them", () => {
  const baseline = {
    type: "Upper",
    category_id: 10,
    product_id: 101,
    subcategory_id: 20,
    id: 501,
    teeth_selection: [
      { teeth_number: 7 },
      { teeth_number: 8 },
      { teeth_number: 9 },
      { teeth_number: 10 },
    ],
    extractions: [{ extraction_id: 202, teeth_numbers: [1, 16] }],
    tooth_chart: [{ tooth_number: 7, extraction_id: 10 }],
    grade_id: 4,
    teeth_shade_id: 11,
    teeth_shade_brand_id: 22,
  };

  const prepared = {
    type: "Upper",
    category_id: 10,
    product_id: 101,
    subcategory_id: 20,
    id: 501,
    status: "In Progress",
    notes: "Updated note",
  };

  const merged = mergeEditSlipProductWithBaseline(prepared, baseline);
  assert.deepEqual(merged.teeth_selection, baseline.teeth_selection);
  assert.deepEqual(merged.extractions, baseline.extractions);
  assert.deepEqual(merged.tooth_chart, baseline.tooth_chart);
  assert.equal(merged.grade_id, 4);
  assert.equal(merged.teeth_shade_id, 11);
  assert.equal(merged.notes, "Updated note");
});

test("mergeEditSlipProductWithBaseline prefers collector teeth when present", () => {
  const baseline = {
    type: "Upper",
    category_id: 10,
    product_id: 101,
    subcategory_id: 20,
    teeth_selection: [{ teeth_number: 7 }, { teeth_number: 8 }],
    extractions: [{ extraction_id: 202, teeth_numbers: [1, 16] }],
  };

  const prepared = {
    type: "Upper",
    category_id: 10,
    product_id: 101,
    subcategory_id: 20,
    teeth_selection: [{ teeth_number: 9 }, { teeth_number: 10 }],
    extractions: [{ extraction_id: 303, teeth_numbers: [3, 15] }],
  };

  const merged = mergeEditSlipProductWithBaseline(prepared, baseline);
  assert.deepEqual(merged.teeth_selection, prepared.teeth_selection);
  assert.deepEqual(merged.extractions, prepared.extractions);
});

test("buildBaselineEditSlipProducts preserves one row per API product", () => {
  const rows = buildBaselineEditSlipProducts([
    { id: 1, type: "Upper", category: { id: 10 }, product_id: 101, subcategory_id: 20, product: { id: 101, subcategory: { id: 20, category_id: 10 } }, teeth_selection: [7, 8] },
    { id: 2, type: "Lower", category: { id: 10 }, product_id: 102, subcategory_id: 21, product: { id: 102, subcategory: { id: 21, category_id: 10 } }, teeth_selection: [24, 25] },
  ]);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].teeth_selection, [{ teeth_number: 7 }, { teeth_number: 8 }]);
  assert.deepEqual(rows[1].teeth_selection, [{ teeth_number: 24 }, { teeth_number: 25 }]);
});
