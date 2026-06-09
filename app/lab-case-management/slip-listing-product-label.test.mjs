import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSlipListingProductLabel,
  formatSlipListingProducts,
} from "./slip-listing-product-label.mjs";

test("formatSlipListingProductLabel joins product and stage codes with a hyphen", () => {
  assert.equal(
    formatSlipListingProductLabel({ product_code: "PFM", stage_code: "FD" }),
    "PFM-FD",
  );
});

test("formatSlipListingProductLabel falls back to nested catalog and stage codes", () => {
  assert.equal(
    formatSlipListingProductLabel({
      product: { code: "CT" },
      stage: { code: "SC" },
    }),
    "CT-SC",
  );
});

test("formatSlipListingProducts joins multiple products with commas and no spaces", () => {
  assert.equal(
    formatSlipListingProducts([
      { product_code: "PFM", stage_code: "FD" },
      { product_code: "CT", stage_code: "SC" },
    ]),
    "PFM-FD,CT-SC",
  );
});

test("formatSlipListingProducts uses slash for upper and lower arch products", () => {
  assert.equal(
    formatSlipListingProducts([
      { product_code: "MFA", stage_code: "BB", type: "Upper" },
      { product_code: "MFA", stage_code: "BB", type: "Lower" },
    ]),
    "MFA-BB/MFA-BB",
  );
});
