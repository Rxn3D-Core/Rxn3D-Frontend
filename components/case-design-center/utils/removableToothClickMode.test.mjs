import test from "node:test";
import assert from "node:assert/strict";

import {
  getRemovableToothClickMode,
  shouldAddToProductSelectionOnRemovableClick,
} from "./removableToothClickMode.ts";

test("uses status assignment when a removable status box is active", () => {
  assert.equal(
    getRemovableToothClickMode({
      activeProductIsRemovables: true,
      activeExtractionCode: "MT",
    }),
    "status_assignment"
  );
});

test("uses product selection when no removable status box is active", () => {
  assert.equal(
    getRemovableToothClickMode({
      activeProductIsRemovables: true,
      activeExtractionCode: null,
    }),
    "product_selection"
  );
});

test("returns null for non-removable products", () => {
  assert.equal(
    getRemovableToothClickMode({
      activeProductIsRemovables: false,
      activeExtractionCode: "MT",
    }),
    null
  );
});

test("keeps a tooth in product selection during removable status assignment", () => {
  assert.equal(
    shouldAddToProductSelectionOnRemovableClick({
      activeProductIsRemovables: true,
      activeExtractionCode: "MT",
    }),
    true
  );
});

test("adds a tooth to product selection when no removable status box is active", () => {
  assert.equal(
    shouldAddToProductSelectionOnRemovableClick({
      activeProductIsRemovables: true,
      activeExtractionCode: null,
    }),
    true
  );
});

test("does not add clasp/overlay status to product selection", () => {
  assert.equal(
    shouldAddToProductSelectionOnRemovableClick({
      activeProductIsRemovables: true,
      activeExtractionCode: "CLASP_L1_G6",
      extractions: [
        { code: "CLASP_L1_G6", name: "Clasps", overlay: "Yes", status: "Active" },
      ],
    }),
    false
  );
});
