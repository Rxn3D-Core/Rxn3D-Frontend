import test from "node:test";
import assert from "node:assert/strict";

import {
  collectDownloadableInvoiceUrls,
  filterSubscriptionInvoices,
  findSubscriptionInvoiceById,
  getSubscriptionInvoiceDisplayAmount,
  paginateSubscriptionInvoices,
} from "./subscription-invoices.ts";

const invoices = [
  {
    id: 1,
    invoice_number: "INV-9042",
    amount: 99,
    currency: "USD",
    status: "paid",
    hosted_invoice_url: "https://example.com/invoices/1",
    invoice_pdf: "https://example.com/invoices/1.pdf",
    created_at: "2025-07-10T00:00:00.000Z",
  },
  {
    id: 2,
    invoice_number: "INV-7892",
    amount: 119,
    currency: "USD",
    status: "failed",
    hosted_invoice_url: "https://example.com/invoices/2",
    created_at: "2025-03-10T00:00:00.000Z",
  },
  {
    id: 3,
    invoice_number: "INV-6412",
    amount: 990,
    currency: "USD",
    status: "pending",
    invoice_pdf: "https://example.com/invoices/3.pdf",
    created_at: "2024-10-10T00:00:00.000Z",
  },
  {
    id: 4,
    invoice_number: "INV-6975",
    amount: 99,
    currency: "USD",
    status: "refunded",
    created_at: "2024-12-10T00:00:00.000Z",
  },
];

test("filterSubscriptionInvoices applies status and inclusive date range filters", () => {
  const filtered = filterSubscriptionInvoices(invoices, {
    status: "paid",
    from: "2025-07-10",
    to: "2025-07-10",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].invoice_number, "INV-9042");
});

test("filterSubscriptionInvoices ignores all-status filters and returns newest first", () => {
  const filtered = filterSubscriptionInvoices(invoices, {
    status: "all",
  });

  assert.deepEqual(
    filtered.map((invoice) => invoice.invoice_number),
    ["INV-9042", "INV-7892", "INV-6975", "INV-6412"],
  );
});

test("paginateSubscriptionInvoices returns the requested slice and total pages", () => {
  const page = paginateSubscriptionInvoices(invoices, {
    page: 2,
    pageSize: 2,
  });

  assert.equal(page.totalItems, 4);
  assert.equal(page.totalPages, 2);
  assert.deepEqual(
    page.items.map((invoice) => invoice.invoice_number),
    ["INV-6412", "INV-6975"],
  );
});

test("collectDownloadableInvoiceUrls prefers PDFs and removes empty duplicates", () => {
  const urls = collectDownloadableInvoiceUrls([
    invoices[0],
    invoices[1],
    invoices[2],
    { ...invoices[2], id: 5 },
  ]);

  assert.deepEqual(urls, [
    "https://example.com/invoices/1.pdf",
    "https://example.com/invoices/2",
    "https://example.com/invoices/3.pdf",
  ]);
});

test("findSubscriptionInvoiceById matches route params by numeric id", () => {
  const invoice = findSubscriptionInvoiceById(invoices, "2");

  assert.equal(invoice?.invoice_number, "INV-7892");
});

test("getSubscriptionInvoiceDisplayAmount falls back across available amount fields", () => {
  const amount = getSubscriptionInvoiceDisplayAmount({
    id: 99,
    amount: null,
    amount_paid: null,
    amount_due: "149",
    total_amount: null,
    subtotal: null,
  });

  assert.equal(amount, "149");
});
