import test from "node:test";
import assert from "node:assert/strict";

import {
  productSupportsAddons,
  resolveRemovableAddonDisplay,
  shouldShowRemovableAddonField,
  getDefaultAddonDisplayFromProduct,
  resolveCardAddonFieldValue,
} from "./addonDisplayHelpers.ts";

test("productSupportsAddons is false when has_addon is No", () => {
  assert.equal(productSupportsAddons({ has_addon: "No", addons: [{ id: 1, name: "X" }] }), false);
});

test("productSupportsAddons is true when has_addon is Yes", () => {
  assert.equal(productSupportsAddons({ has_addon: "Yes" }), true);
});

test("productSupportsAddons is true when active addons exist without explicit flag", () => {
  assert.equal(
    productSupportsAddons({
      addons: [{ id: 10, addon_id: 5, name: "Warranty", status: "Active" }],
    }),
    true
  );
});

test("productSupportsAddons is false when only inactive addons exist", () => {
  assert.equal(
    productSupportsAddons({
      addons: [{ id: 10, name: "Warranty", status: "Inactive" }],
    }),
    false
  );
});

test("productSupportsAddons is false for null product", () => {
  assert.equal(productSupportsAddons(null), false);
});

test("resolveRemovableAddonDisplay prefers saved field value", () => {
  assert.equal(
    resolveRemovableAddonDisplay({
      fieldValue: "2x Wire clasp",
      storeAddons: [{ addon_id: 1, qty: 1, name: "Acrylic clasps" }],
      product: { addons: [] },
    }),
    "2x Wire clasp"
  );
});

test("resolveRemovableAddonDisplay falls back to modal store selections", () => {
  assert.equal(
    resolveRemovableAddonDisplay({
      fieldValue: "",
      storeAddons: [
        { addon_id: 1, qty: 2, name: "Wire clasp" },
        { addon_id: 2, qty: 1, name: "Acrylic clasps" },
      ],
      product: { addons: [] },
    }),
    "2x Wire clasp, 1x Acrylic clasps"
  );
});

test("resolveRemovableAddonDisplay falls back to product defaults", () => {
  assert.equal(
    resolveRemovableAddonDisplay({
      fieldValue: "0 selected",
      product: {
        addons: [
          { id: 5, name: "Wire clasp", is_default: "Yes", quantity: 2, status: "Active" },
        ],
      },
    }),
    "2x Wire clasp"
  );
});

test("shouldShowRemovableAddonField is true when modal store has selections", () => {
  assert.equal(
    shouldShowRemovableAddonField(
      { has_addon: "Yes" },
      {
        fieldValue: "",
        storeAddons: [{ addon_id: 1, qty: 2, name: "Wire clasp" }],
      }
    ),
    true
  );
});

test("getDefaultAddonDisplayFromProduct uses is_default and quantity", () => {
  assert.equal(
    getDefaultAddonDisplayFromProduct({
      addons: [
        { id: 1, name: "Wire clasp", is_default: "Yes", quantity: 2, status: "Active" },
        { id: 2, name: "Inactive add-on", is_default: "Yes", status: "Inactive" },
      ],
    }),
    "2x Wire clasp"
  );
});

test("resolveCardAddonFieldValue reads virtual slot when rep tooth is empty", () => {
  const values = {
    "mandibular_-2_addons": "2x Wire clasp",
  };
  const display = resolveCardAddonFieldValue(
    "mandibular",
    2,
    [25, 26],
    25,
    (arch, tooth, step) => values[`${arch}_${tooth}_${step}`] ?? ""
  );
  assert.equal(display, "2x Wire clasp");
});
