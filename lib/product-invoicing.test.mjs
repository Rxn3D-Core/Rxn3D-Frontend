import test from "node:test";
import assert from "node:assert/strict";

import {
  computeCancellationCharge,
  formatMoney,
  isProductInvoiceDeletable,
  isProductInvoiceEditable,
  isProductInvoiceStatementItem,
  normalizeChargeFrequency,
  normalizeInvoicingMode,
  orderSections,
  resolveStatementSelection,
  sumBillableSections,
  sumInvoiceProducts,
  toMoney,
  validateCancellationInput,
} from "./product-invoicing.ts";

test("toMoney parses API strings and rejects junk", () => {
  assert.equal(toMoney("730.00"), 730);
  assert.equal(toMoney(12.5), 12.5);
  assert.equal(toMoney(""), 0);
  assert.equal(toMoney(null), 0);
  assert.equal(toMoney("abc"), 0);
  assert.equal(toMoney(Number.NaN), 0);
});

test("formatMoney renders USD", () => {
  assert.equal(formatMoney("1234.5"), "$1,234.50");
  assert.equal(formatMoney(null), "$0.00");
});

test("normalizers default to today's behavior", () => {
  assert.equal(normalizeInvoicingMode("product"), "product");
  assert.equal(normalizeInvoicingMode("stage"), "stage");
  assert.equal(normalizeInvoicingMode(undefined), "stage");
  assert.equal(normalizeInvoicingMode("PRODUCT"), "stage");
  assert.equal(normalizeChargeFrequency("per_case"), "per_case");
  assert.equal(normalizeChargeFrequency("per_stage"), "per_stage");
  assert.equal(normalizeChargeFrequency(null), "per_stage");
  assert.equal(normalizeChargeFrequency("per_arch"), "per_stage");
});

test("editable only while pending/checked and off statements; deletable only when pending", () => {
  const cases = [
    [{ status: "pending", on_statement: false }, true, true],
    [{ status: "checked", on_statement: false }, true, false],
    [{ status: "pending", on_statement: true }, false, false],
    [{ status: "billed", on_statement: false }, false, false],
    [{ status: "paid", on_statement: true }, false, false],
    [{ status: "overdue", on_statement: false }, false, false],
    [{ status: null }, false, false],
  ];
  for (const [invoice, editable, deletable] of cases) {
    assert.equal(isProductInvoiceEditable(invoice), editable, JSON.stringify(invoice));
    assert.equal(isProductInvoiceDeletable(invoice), deletable, JSON.stringify(invoice));
  }
});

test("validateCancellationInput mirrors the API rules", () => {
  const full = "730.00";
  const cases = [
    [{ choice: "full", fullAmount: full }, null],
    [{ choice: "none", fullAmount: full }, null],
    [{ choice: "partial", partialType: null, partialValue: "10", fullAmount: full }, "partialTypeRequired"],
    [{ choice: "partial", partialType: "percent", partialValue: "", fullAmount: full }, "partialValueRequired"],
    [{ choice: "partial", partialType: "percent", partialValue: "0", fullAmount: full }, "partialValuePositive"],
    [{ choice: "partial", partialType: "amount", partialValue: "-5", fullAmount: full }, "partialValuePositive"],
    [{ choice: "partial", partialType: "percent", partialValue: "100.01", fullAmount: full }, "percentMax"],
    [{ choice: "partial", partialType: "percent", partialValue: "100", fullAmount: full }, null],
    [{ choice: "partial", partialType: "amount", partialValue: "730.01", fullAmount: full }, "amountMax"],
    [{ choice: "partial", partialType: "amount", partialValue: "730", fullAmount: full }, null],
  ];
  for (const [input, expected] of cases) {
    assert.equal(validateCancellationInput(input), expected, JSON.stringify(input));
  }
});

test("computeCancellationCharge for full, partial and none", () => {
  assert.equal(computeCancellationCharge({ choice: "full", fullAmount: "730.00" }), 730);
  assert.equal(computeCancellationCharge({ choice: "none", fullAmount: "730.00" }), 0);
  assert.equal(
    computeCancellationCharge({ choice: "partial", partialType: "percent", partialValue: "50", fullAmount: "730.00" }),
    365,
  );
  assert.equal(
    computeCancellationCharge({ choice: "partial", partialType: "percent", partialValue: "33.333", fullAmount: "100" }),
    33.33,
  );
  assert.equal(
    computeCancellationCharge({ choice: "partial", partialType: "amount", partialValue: "120.5", fullAmount: "730" }),
    120.5,
  );
  assert.equal(
    computeCancellationCharge({ choice: "partial", partialType: "amount", partialValue: "999", fullAmount: "730" }),
    null,
  );
});

test("orderSections puts stages by sequence and cancellation last", () => {
  const ordered = orderSections([
    { id: 9, kind: "cancellation", section_total: "10", lines: [] },
    { id: 3, kind: "stage", stage_sequence: 3, section_total: "1", lines: [] },
    { id: 2, kind: "stage", stage_sequence: 1, section_total: "1", lines: [] },
    { id: 1, kind: "stage", stage_sequence: null, section_total: "1", lines: [] },
  ]);
  assert.deepEqual(ordered.map((s) => s.id), [2, 3, 1, 9]);
});

test("sums exclude reference sections", () => {
  const products = [
    {
      product_id: 1, product_name: "FD", status: "completed", product_total: "730.00",
      sections: [
        { id: 1, kind: "stage", section_total: "300.00", lines: [] },
        { id: 2, kind: "stage", section_total: "430.00", lines: [] },
      ],
    },
    {
      product_id: 2, product_name: "Night guard", status: "cancelled", product_total: "150.00",
      sections: [
        { id: 3, kind: "stage", section_total: "300.00", is_reference: true, lines: [] },
        { id: 4, kind: "cancellation", section_total: "150.00", lines: [] },
      ],
    },
  ];
  assert.equal(sumBillableSections(products[1].sections), 150);
  assert.equal(sumInvoiceProducts(products), 880);
});

test("resolveStatementSelection requires one office and no statement", () => {
  assert.deepEqual(resolveStatementSelection([]), { error: "empty" });
  assert.deepEqual(resolveStatementSelection([{ office_id: 7 }, { office_id: 7 }]), { officeId: 7 });
  assert.deepEqual(resolveStatementSelection([{ office_id: 7 }, { office_id: 8 }]), { error: "mixedOffices" });
  assert.deepEqual(
    resolveStatementSelection([{ office_id: 7 }, { office_id: 7, on_statement: true }]),
    { error: "alreadyOnStatement" },
  );
  assert.deepEqual(resolveStatementSelection([{ office_id: undefined }]), { error: "mixedOffices" });
});

test("isProductInvoiceStatementItem detects product rows", () => {
  assert.equal(isProductInvoiceStatementItem({ source: "product_invoice" }), true);
  assert.equal(isProductInvoiceStatementItem({ product_invoice_id: 41 }), true);
  assert.equal(isProductInvoiceStatementItem({ source: "stage_invoice", product_invoice_id: null }), false);
  assert.equal(isProductInvoiceStatementItem({}), false);
  assert.equal(isProductInvoiceStatementItem(null), false);
});
