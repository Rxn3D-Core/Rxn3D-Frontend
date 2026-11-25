import test from "node:test";
import assert from "node:assert/strict";

import { productInvoiceDateRange, productInvoiceToRows } from "./product-invoice-rows.ts";

const header = {
  id: 41, invoice_number: "HMC-INV-001-20261118", case_id: 901, case_number: "C901", patient_name: "J Doe",
  arch: "Upper", lab_id: 10, office_id: 20, office_name: "Smile Dental", status: "pending", total_amount: "825.00",
  finalized_reason: "completed", finalized_at: "2026-11-18T10:00:00+00:00", on_statement: false, statement_id: null,
  products_count: 1, created_at: "2026-11-18T10:00:00+00:00",
};

test("v1 list row (header only): shows what exists, dashes the rest", () => {
  const [row] = productInvoiceToRows(header);
  assert.equal(row.patient, "J Doe");
  assert.equal(row.ul, "U");
  assert.equal(row.stage, "All stages");
  assert.equal(row.product, "—");
  assert.equal(row.grade, "—");
  assert.equal(row.addOn, "—");
  assert.equal(row.rPercent, "—");
  assert.equal(row.gross, "$825.00");
  assert.equal(row.grossValue, 825);
  assert.equal(row.status, "Pending");
  assert.equal(row.officeCode, "—");
  assert.equal(row.slipId, null);
  assert.match(row.dueDate, /^11\/18\/26$/);
});

test("requested row fields are used as-is", () => {
  const [row] = productInvoiceToRows({
    ...header,
    office_code: "SMD", slip_id: 77, product_name: "Full Denture", grade_name: "Premium", base_total: "700.00",
    addons: [
      { name: "Characterization", price: "50.00", total: "50.00" },
      { name: "characterization ", price: "50.00", quantity: 1, total: "50.00" },
      { name: "Gold tooth", price: "25.00", quantity: 2 },
    ],
    rush_percentage: "10.00", rush_fee: "75.00", gross_amount: "925.00", due_date: "2026-12-18", status: "checked",
  });
  assert.equal(row.officeCode, "SMD");
  assert.equal(row.slipId, 77);
  assert.equal(row.product, "Full Denture");
  assert.equal(row.grade, "Premium");
  assert.equal(row.baseTotal, "$700.00");
  assert.equal(row.addOn, "Characterization x2\nGold tooth x2");
  assert.equal(row.subTotal, "$100.00\n$50.00");
  assert.equal(row.rPercent, "10%");
  assert.equal(row.gross, "$925.00");
  assert.equal(row.status, "Checked");
  // RXN-123: a date-only due date is never shifted by a zone.
  assert.equal(row.dueDate, "12/18/26");
});

test("derives product columns from sections when the row carries them; reference sections ignored", () => {
  const rows = productInvoiceToRows({
    ...header,
    total_amount: "975.00",
    products_count: 2,
    products: [
      {
        product_id: 310, product_name: "Full Denture", product_total: "825.00",
        sections: [
          { id: 1, kind: "stage", grade_name: "Premium", rush_percentage: "0.00", rush_fee: "0.00", section_total: "0.00",
            lines: [{ id: 1, line_type: "stage_base", name: "Try-in", price: "0.00", total: "0.00" }] },
          { id: 2, kind: "stage", grade_name: "Premium", rush_percentage: "10.00", rush_fee: "75.00", section_total: "825.00",
            lines: [
              { id: 2, line_type: "stage_base", name: "Full Denture", price: "700.00", total: "700.00" },
              { id: 3, line_type: "addon", name: "Characterization", price: "50.00", quantity: 1, total: "50.00" },
              { id: 4, line_type: "rush", name: "Rush", price: "75.00", total: "75.00" },
            ] },
        ],
      },
      {
        product_id: 311, product_name: "Night Guard", status: "cancelled", product_total: "150.00",
        sections: [
          { id: 5, kind: "stage", is_reference: true, rush_percentage: "20.00", rush_fee: "10.00", section_total: "300.00",
            lines: [{ id: 6, line_type: "addon", name: "Ref only", price: "50.00", total: "50.00" }] },
          { id: 7, kind: "cancellation", section_total: "150.00",
            lines: [{ id: 8, line_type: "cancellation_charge", name: "Cancellation", price: "150.00", total: "150.00" }] },
        ],
      },
    ],
  });
  assert.equal(rows.length, 2);
  const [fd, ng] = rows;
  assert.equal(fd.product, "Full Denture");
  assert.equal(fd.grade, "Premium");
  assert.equal(fd.baseTotal, "$700.00");
  assert.equal(fd.addOn, "Characterization x1");
  assert.equal(fd.subTotal, "$50.00");
  assert.equal(fd.rPercent, "10%");
  assert.equal(fd.gross, "$825.00");
  assert.equal(ng.product, "Night Guard");
  assert.equal(ng.addOn, "—", "reference sections are not charged");
  assert.equal(ng.rPercent, "—");
  assert.equal(ng.baseTotal, "—");
  assert.equal(ng.gross, "$150.00");
  assert.notEqual(fd.id, ng.id);
  // Row-level fields are not copied onto every product of a multi-product invoice.
  assert.equal(ng.grade, "—");
});

test("multi-product invoice without product blocks says how many products", () => {
  const [row] = productInvoiceToRows({ ...header, products_count: 3 });
  assert.equal(row.product, "3 products");
  assert.equal(row.gross, "$825.00");
});

test("date presets", () => {
  const now = new Date(2026, 10, 19); // Thu 19 Nov 2026
  assert.deepEqual(productInvoiceDateRange("all", now), {});
  assert.deepEqual(productInvoiceDateRange("today", now), { date_from: "2026-11-19", date_to: "2026-11-19" });
  assert.deepEqual(productInvoiceDateRange("this_week", now), { date_from: "2026-11-16", date_to: "2026-11-19" });
  assert.deepEqual(productInvoiceDateRange("this_month", now), { date_from: "2026-11-01", date_to: "2026-11-19" });
  assert.deepEqual(productInvoiceDateRange("last_month", now), { date_from: "2026-10-01", date_to: "2026-10-31" });
  assert.deepEqual(productInvoiceDateRange("this_year", now), { date_from: "2026-01-01", date_to: "2026-11-19" });
});
