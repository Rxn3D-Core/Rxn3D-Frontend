import test from "node:test";
import assert from "node:assert/strict";

import { productSupportsAddons } from "./addonDisplayHelpers.ts";

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
