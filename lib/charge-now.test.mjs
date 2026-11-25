import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChargeNowPayload,
  chargeNowBasePrice,
  chargeNowCandidates,
  chargeNowStagePrices,
  chargeNowStagePrompts,
  chargeNowTotal,
  hasInvalidStageInput,
  isChargeableStatus,
  parseMoneyInput,
  slipAddonLines,
  toChargeNowArch,
} from "./charge-now.ts";

const upper = {
  type: "Upper",
  status: "In Progress",
  price: "100.00",
  product: { id: 7, name: "Full denture", price: "100.00" },
  grade: { id: 3, name: "Premium" },
  addons: [{ quantity: 2, addon: { name: "Gold tooth", price: "15.50" } }],
};
const lower = { ...upper, type: "Lower", addons: [] };

function eligibility(overrides = {}) {
  return {
    invoicingMode: "product",
    isLabAdmin: true,
    slipStatus: "In Progress",
    products: [
      { apiProduct: upper, status: "In Progress" },
      { apiProduct: lower, status: "In Progress" },
    ],
    invoicedArches: new Set(),
    ...overrides,
  };
}

test("toChargeNowArch maps slip types and VM arch keys", () => {
  assert.equal(toChargeNowArch("Upper"), "Upper");
  assert.equal(toChargeNowArch("mandibular"), "Lower");
  assert.equal(toChargeNowArch(""), null);
  assert.equal(toChargeNowArch(undefined), null);
});

test("isChargeableStatus allows in progress and on hold, not finished/cancelled/deleted", () => {
  assert.equal(isChargeableStatus("In Progress"), true);
  assert.equal(isChargeableStatus("On Hold"), true);
  assert.equal(isChargeableStatus(null), true);
  assert.equal(isChargeableStatus("Finished"), false);
  assert.equal(isChargeableStatus("cancelled"), false);
  assert.equal(isChargeableStatus("Deleted"), false);
});

test("chargeNowCandidates offers both arches for an eligible slip", () => {
  const out = chargeNowCandidates(eligibility());
  assert.deepEqual(out.map((c) => c.arch), ["Upper", "Lower"]);
  assert.equal(out[0].productId, 7);
  assert.equal(out[0].gradeName, "Premium");
});

test("chargeNowCandidates hides the button for stage mode, unknown mode and non-admins", () => {
  assert.equal(chargeNowCandidates(eligibility({ invoicingMode: "stage" })).length, 0);
  assert.equal(chargeNowCandidates(eligibility({ invoicingMode: undefined })).length, 0);
  assert.equal(chargeNowCandidates(eligibility({ isLabAdmin: false })).length, 0);
});

test("chargeNowCandidates hides finished/cancelled slips and arches", () => {
  assert.equal(chargeNowCandidates(eligibility({ slipStatus: "Finished" })).length, 0);
  assert.equal(chargeNowCandidates(eligibility({ slipStatus: "Cancelled" })).length, 0);
  const out = chargeNowCandidates(
    eligibility({
      products: [
        { apiProduct: upper, status: "Finished" },
        { apiProduct: lower, status: "In Progress" },
      ],
    })
  );
  assert.deepEqual(out.map((c) => c.arch), ["Lower"]);
});

test("chargeNowCandidates skips invoiced arches and hides while invoices are unknown", () => {
  assert.deepEqual(
    chargeNowCandidates(eligibility({ invoicedArches: new Set(["Upper"]) })).map((c) => c.arch),
    ["Lower"]
  );
  assert.equal(chargeNowCandidates(eligibility({ invoicedArches: new Set(["Upper", "Lower"]) })).length, 0);
  assert.equal(chargeNowCandidates(eligibility({ invoicedArches: null })).length, 0);
});

test("slipAddonLines multiplies unit price by quantity", () => {
  assert.deepEqual(slipAddonLines(upper.addons), [
    { name: "Gold tooth", quantity: 2, unitPrice: 15.5, total: 31 },
  ]);
  assert.deepEqual(slipAddonLines(null), []);
});

test("chargeNowBasePrice prefers the grade price, then library product price, then slip price", () => {
  const [candidate] = chargeNowCandidates(eligibility());
  assert.equal(chargeNowBasePrice(candidate, { price: "90", grades: [{ id: 3, price: "120.00" }] }), 120);
  assert.equal(chargeNowBasePrice(candidate, { price: "90", grades: [{ id: 3, price: "0.00" }] }), 90);
  assert.equal(chargeNowBasePrice(candidate, { price: null, grades: [] }), 100);
  assert.equal(chargeNowBasePrice(candidate, null), 100);
});

test("chargeNowStagePrompts lists $0/unset active stages in sequence, honoring grade prices", () => {
  const [candidate] = chargeNowCandidates(eligibility());
  const library = {
    stages: [
      { id: 12, name: "Try in with teeth", sequence: 3, price: "0.00" },
      { id: 11, name: "Bite block", sequence: 2, price: null },
      { id: 10, name: "Custom tray", sequence: 1, price: "25.00" },
      { id: 13, name: "Finish", sequence: 4, price: "0" },
      { id: 14, name: "Old stage", sequence: 5, price: "0", status: "Inactive" },
    ],
    // Grade price for stage 13 is set, so it is not prompted; grade price 0 on stage 10 prompts it.
    stage_grade_details: [
      { stage_id: 13, grade_id: 3, price: "40.00" },
      { stage_id: 10, grade_id: 3, price: "0.00" },
    ],
  };
  assert.deepEqual(
    chargeNowStagePrompts(candidate, library).map((s) => s.stageName),
    ["Custom tray", "Bite block", "Try in with teeth"]
  );
  assert.deepEqual(chargeNowStagePrompts(candidate, null), []);
});

test("parseMoneyInput accepts blank, whole and 2-decimal amounts", () => {
  assert.equal(parseMoneyInput(""), null);
  assert.equal(parseMoneyInput("  "), null);
  assert.equal(parseMoneyInput("12"), 12);
  assert.equal(parseMoneyInput("12.5"), 12.5);
  assert.equal(parseMoneyInput(".75"), 0.75);
  assert.ok(Number.isNaN(parseMoneyInput("-1")));
  assert.ok(Number.isNaN(parseMoneyInput("1.234")));
  assert.ok(Number.isNaN(parseMoneyInput("abc")));
});

test("stage prices skip blanks; totals add base, add-ons and stage prices", () => {
  const inputs = { 11: "20", 12: "", 13: "5.25" };
  const prices = chargeNowStagePrices(inputs);
  assert.deepEqual(prices, { 11: 20, 13: 5.25 });
  assert.equal(hasInvalidStageInput(inputs), false);
  assert.equal(hasInvalidStageInput({ 11: "x" }), true);
  const addons = slipAddonLines(upper.addons);
  assert.equal(chargeNowTotal(100, addons, prices), 156.25);
  assert.equal(chargeNowTotal(100, [], {}), 100);
});

test("buildChargeNowPayload matches the contract and omits empty stage_prices", () => {
  assert.deepEqual(buildChargeNowPayload({ slipId: 55, arch: "Upper", amount: 156.251, stagePrices: {} }), {
    slip_id: 55,
    arch: "Upper",
    amount: 156.25,
  });
  assert.deepEqual(
    buildChargeNowPayload({ slipId: 55, arch: "Lower", amount: 10, stagePrices: { 11: 20 } }),
    { slip_id: 55, arch: "Lower", amount: 10, stage_prices: { 11: 20 } }
  );
});
