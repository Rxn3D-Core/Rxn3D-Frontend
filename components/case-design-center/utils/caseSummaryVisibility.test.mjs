import test from "node:test";
import assert from "node:assert/strict";

import {
  computeSlipValidationComplete,
  shouldShowCaseSummaryNotes,
} from "./caseSummaryVisibility.ts";

test("slip validation requires at least one product on an arch", () => {
  assert.equal(
    computeSlipValidationComplete({
      hasMaxillaryProducts: false,
      hasMandibularProducts: false,
      maxillarySideReady: true,
      mandibularSideReady: true,
    }),
    false,
  );
});

test("slip validation stays false while an arch with products is incomplete", () => {
  assert.equal(
    computeSlipValidationComplete({
      hasMaxillaryProducts: true,
      hasMandibularProducts: false,
      maxillarySideReady: false,
      mandibularSideReady: true,
    }),
    false,
  );
});

test("slip validation is false when tooth-status validation fails", () => {
  assert.equal(
    computeSlipValidationComplete({
      hasMaxillaryProducts: true,
      hasMandibularProducts: false,
      maxillarySideReady: true,
      mandibularSideReady: true,
      hasToothStatusValidation: true,
    }),
    false,
  );
});

test("slip validation passes when every populated arch is ready", () => {
  assert.equal(
    computeSlipValidationComplete({
      hasMaxillaryProducts: true,
      hasMandibularProducts: true,
      maxillarySideReady: true,
      mandibularSideReady: true,
    }),
    true,
  );
});

test("keeps case summary notes hidden until all products are complete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      allProductsComplete: false,
    }),
    false,
  );
});

test("shows case summary notes when every product accordion is complete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      allProductsComplete: true,
    }),
    true,
  );
});

test("shows case summary notes for submitted cases even when incomplete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      caseSubmitted: true,
      allProductsComplete: false,
    }),
    true,
  );
});
