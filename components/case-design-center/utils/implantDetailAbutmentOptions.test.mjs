import test from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_ABUTMENT_DETAIL_OPTIONS,
  LEGACY_ABUTMENT_TYPE_OPTIONS,
  getImplantDetailAbutmentOptions,
} from "./implantDetailAbutmentOptions.ts";

test("uses advance field options when abutment fields are present", () => {
  const result = getImplantDetailAbutmentOptions({
    advanceFields: [
      {
        id: 27,
        name: "Abutment Type",
        field_type: "dropdown",
        advance_subcategory_id: 27,
        options: [
          { id: 1, name: "Custom", status: "Active" },
          { id: 2, name: "Hidden", status: "Inactive" },
        ],
      },
      {
        id: 28,
        name: "Abutment Detail",
        field_type: "dropdown",
        advance_subcategory_id: 27,
        options: [
          { id: 3, name: "Office provided", status: "Active" },
        ],
      },
    ],
  });

  assert.deepEqual(result.abutmentTypeOptions, ["Custom"]);
  assert.deepEqual(result.abutmentDetailOptions, ["Office provided"]);
  assert.equal(result.usesLegacyFallback, false);
});

test("falls back to legacy abutment options when no advance fields exist", () => {
  const result = getImplantDetailAbutmentOptions({
    advanceFields: undefined,
  });

  assert.deepEqual(result.abutmentTypeOptions, LEGACY_ABUTMENT_TYPE_OPTIONS);
  assert.deepEqual(result.abutmentDetailOptions, LEGACY_ABUTMENT_DETAIL_OPTIONS);
  assert.equal(result.usesLegacyFallback, true);
});
