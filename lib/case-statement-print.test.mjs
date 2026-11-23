import test from "node:test";
import assert from "node:assert/strict";

import {
  findBillingInvoiceIdFromSearchResults,
  findSlipBillingIdBySlipId,
  resolveCaseStatementBillingId,
} from "./case-statement-print.ts";

test("resolveCaseStatementBillingId prefers explicit row-level billing ids", () => {
  assert.equal(resolveCaseStatementBillingId({ billingId: 42, billing_id: 7 }), 42);
  assert.equal(resolveCaseStatementBillingId({ billing_id: 99 }), 99);
});

test("resolveCaseStatementBillingId falls back to nested billing/invoice objects", () => {
  assert.equal(resolveCaseStatementBillingId({ billing: { id: 55 } }), 55);
  assert.equal(resolveCaseStatementBillingId({ invoice: { id: 21 } }), 21);
});

test("resolveCaseStatementBillingId extracts ids from slip listing style payloads", () => {
  assert.equal(
    resolveCaseStatementBillingId({
      billing_invoice: { id: 13 },
      slip_billing: { id: 14 },
    }),
    13,
  );
});

test("resolveCaseStatementBillingId returns null when no valid id exists", () => {
  assert.equal(resolveCaseStatementBillingId({ billingId: "abc" }), null);
  assert.equal(resolveCaseStatementBillingId(null), null);
});

test("findBillingInvoiceIdFromSearchResults prefers exact slip number matches", () => {
  const invoiceId = findBillingInvoiceIdFromSearchResults(
    [
      { id: 1, slip: { slip_number: "C00036-S01", case: { case_number: "C00036", patient_name: "das adsa" } } },
      { id: 2, slip: { slip_number: "C00037-S01", case: { case_number: "C00037", patient_name: "dasd asdas" } } },
    ],
    { slipNumber: "C00037-S01", caseNumber: "C00037", patient: "dasd asdas" },
  );

  assert.equal(invoiceId, 2);
});

test("findSlipBillingIdBySlipId matches only the given slip id", () => {
  const invoices = [
    { id: 10, slip_id: 7, slip: { id: 7 } },
    { id: 11, slip_id: 8, slip: { id: 8 } },
  ];
  assert.equal(findSlipBillingIdBySlipId(invoices, 8), 11);
  assert.equal(findSlipBillingIdBySlipId(invoices, 9), null);
  assert.equal(findSlipBillingIdBySlipId([], 8), null);
});

test("findSlipBillingIdBySlipId falls back to nested slip id and picks the newest record", () => {
  const invoices = [
    { id: 3, slip: { id: 5 } },
    { id: 9, slip_id: "5" },
    { id: 4, slip_id: 5 },
  ];
  assert.equal(findSlipBillingIdBySlipId(invoices, 5), 9);
});

test("findSlipBillingIdBySlipId ignores records without a valid id", () => {
  assert.equal(findSlipBillingIdBySlipId([{ id: null, slip_id: 5 }, { id: "x", slip_id: 5 }], 5), null);
});
