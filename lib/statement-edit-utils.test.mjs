import test from "node:test";
import assert from "node:assert/strict";

import {
  computeBasePriceFromTargetGross,
  buildStatementHeaderDraft,
  findMatchingBillingTarget,
  findMatchingBillingInvoiceId,
  formatStatementPartyAddress,
  mergeStatementPartyWithProfile,
  parseStatementMoney,
  statementPartyNeedsLocationEnrichment,
  summarizeStatementPreviewTotals,
} from "./statement-edit-utils.ts";

test("buildStatementHeaderDraft normalizes statement fields for edit mode", () => {
  const draft = buildStatementHeaderDraft({
    id: 7,
    statement_id: "STMT-1001",
    recipient_email: "billing@example.com",
    created_at: "2026-05-28T10:30:00.000Z",
    due_date: "2026-06-27T00:00:00.000Z",
  });

  assert.deepEqual(draft, {
    statementId: "STMT-1001",
    recipientEmail: "billing@example.com",
    statementDate: "2026-05-28",
    dueDate: "2026-06-27",
  });
});

test("formatStatementPartyAddress joins street, city, state, postal, and country", () => {
  assert.equal(
    formatStatementPartyAddress({
      address: "123 Innovation Drive",
      city: "San Francisco",
      state: { name: "CA" },
      postal_code: "94105",
      country: { name: "United States" },
    }),
    "123 Innovation Drive\nSan Francisco, CA 94105\nUnited States",
  );
});

test("formatStatementPartyAddress omits missing parts and falls back when empty", () => {
  assert.equal(
    formatStatementPartyAddress({ address: "321 Implant Street", city: "Austin" }),
    "321 Implant Street\nAustin",
  );
  assert.equal(formatStatementPartyAddress({ country: "Canada" }), "Canada");
  assert.equal(formatStatementPartyAddress(null), "—");
  assert.equal(formatStatementPartyAddress({}), "—");
});

test("statementPartyNeedsLocationEnrichment is true when city or state is missing", () => {
  assert.equal(statementPartyNeedsLocationEnrichment(null), true);
  assert.equal(statementPartyNeedsLocationEnrichment({ address: "123 Main" }), true);
  assert.equal(statementPartyNeedsLocationEnrichment({ city: "Austin" }), true);
  assert.equal(statementPartyNeedsLocationEnrichment({ state: "TX" }), true);
  assert.equal(
    statementPartyNeedsLocationEnrichment({ city: "Austin", state: { name: "TX" } }),
    false,
  );
});

test("mergeStatementPartyWithProfile fills missing city/state from customer profile", () => {
  const merged = mergeStatementPartyWithProfile(
    { id: 10, name: "Smile Office", address: "123 Implant Street" },
    {
      id: 10,
      city: "Austin",
      state: { id: 1, name: "TX" },
      postal_code: "78701",
      country: { id: 1, name: "United States" },
    },
  );

  assert.deepEqual(merged, {
    id: 10,
    name: "Smile Office",
    address: "123 Implant Street",
    city: "Austin",
    postal_code: "78701",
    state: { id: 1, name: "TX" },
    country: { id: 1, name: "United States" },
  });

  assert.equal(
    formatStatementPartyAddress(merged),
    "123 Implant Street\nAustin, TX 78701\nUnited States",
  );
});

test("mergeStatementPartyWithProfile keeps existing party location fields", () => {
  const merged = mergeStatementPartyWithProfile(
    {
      id: 2,
      address: "Street from statement",
      city: "Dallas",
      state: "TX",
    },
    {
      id: 2,
      address: "Street from profile",
      city: "Austin",
      state: { name: "CA" },
      postal_code: "78701",
    },
  );

  assert.equal(merged?.address, "Street from statement");
  assert.equal(merged?.city, "Dallas");
  assert.equal(merged?.state, "TX");
  assert.equal(merged?.postal_code, "78701");
});

test("findMatchingBillingInvoiceId prefers the invoice whose product line best matches the statement row", () => {
  const invoiceId = findMatchingBillingInvoiceId(
    {
      patient_name: "John Smith",
      product_name: "Complete Upper Denture",
      grade_name: "Premium Grade",
      stage_name: "Two visits",
      gross_amount: 150,
    },
    [
      {
        id: 10,
        slip: { case: { patient_name: "Jane Smith" } },
        products: [
          {
            id: 101,
            product_name: "Complete Upper Denture",
            grade_name: "Premium Grade",
            stage_name: "Two visits",
            total_price: 150,
          },
        ],
      },
      {
        id: 22,
        slip: { case: { patient_name: "John Smith" } },
        products: [
          {
            id: 202,
            product_name: "Complete Upper Denture",
            grade_name: "Premium Grade",
            stage_name: "Two visits",
            total_price: 150,
          },
        ],
      },
    ],
  );

  assert.equal(invoiceId, 22);
});

test("findMatchingBillingTarget returns both invoice and product ids for inline editing", () => {
  const target = findMatchingBillingTarget(
    {
      patient_name: "John Smith",
      product_name: "Complete Upper Denture",
      grade_name: "Premium Grade",
      stage_name: "Two visits",
      gross_amount: 150,
    },
    [
      {
        id: 22,
        slip: { case: { patient_name: "John Smith" } },
        products: [
          {
            id: 202,
            product_name: "Complete Upper Denture",
            grade_name: "Premium Grade",
            stage_name: "Two visits",
            total_price: 150,
          },
        ],
      },
    ],
  );

  assert.deepEqual(target, { invoiceId: 22, productId: 202 });
});

test("findMatchingBillingInvoiceId returns null when no invoice clears the confidence threshold", () => {
  const invoiceId = findMatchingBillingInvoiceId(
    {
      patient_name: "John Smith",
      product_name: "Implant",
      grade_name: "Premium",
      stage_name: "Design",
      gross_amount: 400,
    },
    [
      {
        id: 33,
        slip: { case: { patient_name: "Mary Jones" } },
        products: [
          {
            id: 303,
            product_name: "Full Denture",
            grade_name: "Basic",
            stage_name: "Wax try-in",
            total_price: 120,
          },
        ],
      },
    ],
  );

  assert.equal(invoiceId, null);
});

test("computeBasePriceFromTargetGross solves base price when rush and add-ons exist", () => {
  const basePrice = computeBasePriceFromTargetGross(165, {
    id: 1,
    material_price: 10,
    rush_percentage: 10,
    addons: [{ id: 4, price: 20, quantity: 1 }],
    retentions: [{ id: 5, price: 5 }],
    advance_fields: [{ id: 6, price: 10, quantity: 1 }],
  });

  assert.equal(basePrice, 105);
});

test("parseStatementMoney parses numeric strings from API", () => {
  assert.equal(parseStatementMoney("50.00"), 50);
  assert.equal(parseStatementMoney(""), 0);
  assert.equal(parseStatementMoney(null), 0);
});

test("summarizeStatementPreviewTotals combines line-item and statement refunds", () => {
  const summary = summarizeStatementPreviewTotals(500, 25, {
    statementRefundAmount: "50.00",
    refundReason: "refund for testing",
  });

  assert.deepEqual(summary, {
    lineItemRefund: 25,
    statementRefund: 50,
    totalRefund: 75,
    grandTotal: 425,
    showRefundLine: true,
    refundReason: "refund for testing",
  });
});

test("summarizeStatementPreviewTotals hides refund line when zero", () => {
  const summary = summarizeStatementPreviewTotals(500, 0, {
    statementRefundAmount: 0,
    refundReason: "",
  });

  assert.equal(summary.totalRefund, 0);
  assert.equal(summary.showRefundLine, false);
  assert.equal(summary.grandTotal, 500);
  assert.equal(summary.refundReason, null);
});

test("summarizeStatementPreviewTotals shows statement-level refund only", () => {
  const summary = summarizeStatementPreviewTotals(200, 0, {
    statementRefundAmount: "50.00",
    refundReason: "refund for testing",
  });

  assert.equal(summary.statementRefund, 50);
  assert.equal(summary.totalRefund, 50);
  assert.equal(summary.grandTotal, 150);
  assert.equal(summary.showRefundLine, true);
});
