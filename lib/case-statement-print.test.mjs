import test from "node:test";
import assert from "node:assert/strict";

import {
  findBillingInvoiceIdFromSearchResults,
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
