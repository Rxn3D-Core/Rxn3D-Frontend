import test from "node:test";
import assert from "node:assert/strict";

import {
  getRemovableHeaderTitle,
  shouldShowRemovableHeaderContent,
} from "./removableHeaderLabel.ts";

test('returns only the product name when has_variation is "No"', () => {
  const title = getRemovableHeaderTitle({
    productName: "Metal Frame Acrylic",
    hasVariation: "No",
    teethCount: 6,
    isFullDenture: false,
    hasVariationMatch: false,
  });

  assert.equal(title, "Metal Frame Acrylic");
});

test("keeps variation-match wording when variations are enabled", () => {
  const title = getRemovableHeaderTitle({
    productName: "Metal Frame Acrylic 6 teeth",
    hasVariation: "Yes",
    teethCount: 6,
    isFullDenture: false,
    hasVariationMatch: true,
  });

  assert.equal(title, "Metal Frame Acrylic 6 teeth");
});

test("keeps count-based wording when variations are enabled but unmatched", () => {
  const title = getRemovableHeaderTitle({
    productName: "Metal Frame Acrylic",
    hasVariation: "Yes",
    teethCount: 2,
    isFullDenture: false,
    hasVariationMatch: false,
  });

  assert.equal(title, "Metal Frame Acrylic");
});

test("returns blank when variations are enabled but no teeth are selected yet", () => {
  const title = getRemovableHeaderTitle({
    productName: "Flipper / Stayplate",
    hasVariation: "Yes",
    teethCount: 0,
    isFullDenture: false,
    hasVariationMatch: false,
  });

  assert.equal(title, "");
});

test("shows removable header content when product data exists even with no selected teeth", () => {
  const visible = shouldShowRemovableHeaderContent({
    hasProduct: true,
    hasVariation: "No",
    teethCount: 0,
    caseSubmitted: false,
  });

  assert.equal(visible, true);
});

test('hides removable header content when has_variation is "Yes"', () => {
  const visible = shouldShowRemovableHeaderContent({
    hasProduct: true,
    hasVariation: "Yes",
    teethCount: 0,
    caseSubmitted: false,
  });

  assert.equal(visible, false);
});

test('shows removable header content when has_variation is "Yes" and teeth are selected', () => {
  const visible = shouldShowRemovableHeaderContent({
    hasProduct: true,
    hasVariation: "Yes",
    teethCount: 3,
    caseSubmitted: false,
  });

  assert.equal(visible, true);
});
