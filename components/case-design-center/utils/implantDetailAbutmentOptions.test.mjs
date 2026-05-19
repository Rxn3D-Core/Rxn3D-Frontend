import test from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_ABUTMENT_DETAIL_OPTIONS,
  LEGACY_ABUTMENT_TYPE_OPTIONS,
  getImplantDetailAbutmentOptions,
  getProductAbutmentFieldOptions,
} from "./implantDetailAbutmentOptions.ts";

test("uses product abutments from product details when available", () => {
  const result = getImplantDetailAbutmentOptions({
    productAbutments: [
      {
        id: 1,
        type: "Office Provided",
        code: "OFFICE",
        status: "Active",
        options: [
          { id: 11, name: "Stock Abutment", status: "Active" },
          { id: 12, name: "Custom Abutment", status: "Active" },
        ],
      },
    ],
  });

  assert.deepEqual(result.abutmentCategoryOptions, ["Office Provided"]);
  assert.deepEqual(result.getAbutmentTypeOptions("Office Provided"), [
    "Stock Abutment",
    "Custom Abutment",
  ]);
  assert.equal(result.usesApiAbutments, true);
});

test("uses advance field options when abutment fields are present", () => {
  const result = getImplantDetailAbutmentOptions({
    advanceFields: [
      {
        id: 27,
        name: "Abutment",
        field_type: "dropdown",
        advance_subcategory_id: 27,
        options: [{ id: 1, name: "Office provided", status: "Active" }],
      },
      {
        id: 28,
        name: "Abutment Type",
        field_type: "dropdown",
        advance_subcategory_id: 27,
        options: [{ id: 3, name: "Stock abutment", status: "Active" }],
      },
    ],
  });

  assert.deepEqual(result.abutmentCategoryOptions, ["Office provided"]);
  assert.deepEqual(result.getAbutmentTypeOptions("x"), ["Stock abutment"]);
  assert.equal(result.usesLegacyFallback, false);
});

test("falls back to legacy abutment options when no API or advance fields exist", () => {
  const result = getImplantDetailAbutmentOptions({
    advanceFields: undefined,
  });

  assert.deepEqual(result.abutmentCategoryOptions, LEGACY_ABUTMENT_DETAIL_OPTIONS);
  assert.deepEqual(
    result.getAbutmentTypeOptions("Office provided"),
    LEGACY_ABUTMENT_TYPE_OPTIONS
  );
  assert.equal(result.usesLegacyFallback, true);
});

test("getProductAbutmentFieldOptions filters inactive entries", () => {
  const result = getProductAbutmentFieldOptions([
    {
      id: 1,
      type: "Lab Provided",
      status: "Inactive",
      options: [],
    },
    {
      id: 2,
      type: "Office Provided",
      status: "Active",
      options: [{ id: 3, name: "Healing Abutment", status: "Active" }],
    },
  ]);

  assert.deepEqual(result.categoryOptions, ["Office Provided"]);
  assert.deepEqual(result.getTypeOptionsForCategory("Office Provided"), [
    "Healing Abutment",
  ]);
});
