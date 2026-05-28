import test from "node:test";
import assert from "node:assert/strict";

import {
  computeBasePriceFromTargetGross,
  buildStatementHeaderDraft,
  findMatchingBillingTarget,
  findMatchingBillingInvoiceId,
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
