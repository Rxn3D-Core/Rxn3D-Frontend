// Run: node --import ./test-alias-loader.mjs --test lib/timezone/f4.test.mjs
// RXN-123 slice F4 (billing, statements, invoices). The process zone is India on purpose.
process.env.TZ = "Asia/Kolkata"

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { dateOnlyDay, dayOfInstant, formatUsDay, zonedNow } from "./index.ts"
import { formatShortDate, formatShortDay } from "../billing/charge-row-format.ts"
import { productInvoiceDateRange, productInvoiceToRows } from "../billing/product-invoice-rows.ts"
import { buildStatementHeaderDraft } from "../statement-edit-utils.ts"

const LA = "America/Los_Angeles"
const NY = "America/New_York"
const SH = "Asia/Shanghai"

test("date-only statement values are never shifted, whatever the zone or format", () => {
  for (const v of ["2026-12-01", "2026-12-01T00:00:00.000000Z", "2026-12-01 00:00:00"]) {
    assert.equal(dateOnlyDay(v), "2026-12-01", v)
    assert.equal(formatShortDay(v), "12/01/26", v)
  }
  assert.equal(dateOnlyDay(null), null)
  assert.equal(dateOnlyDay("12/01/2026"), null)
  assert.equal(dateOnlyDay("2026-02-31"), null)
  assert.equal(formatShortDay(""), "—")
  assert.equal(formatUsDay("2026-12-01", true), "12/01/2026")
})

test("instants (created_at, finalized_at, date_sent) use the viewer's calendar day", () => {
  // 2026-11-26 03:00 UTC = Nov 25 in Los Angeles and New York, Nov 26 in Shanghai.
  const iso = "2026-11-26T03:00:00.000000Z"
  assert.equal(formatShortDate(iso, LA), "11/25/26")
  assert.equal(formatShortDate(iso, NY), "11/25/26")
  assert.equal(formatShortDate(iso, SH), "11/26/26")
  // Outside a browser the viewer is Pacific.
  assert.equal(formatShortDate(iso), "11/25/26")
  // A value without an offset is the app's Pacific wall time.
  assert.equal(dayOfInstant("2026-11-25 23:30:00", NY), "2026-11-26")
  assert.equal(formatShortDate(null, NY), "—")
  assert.equal(formatShortDate("bad", NY), "—")
})

test("product invoice rows: due_date as stored, otherwise finalized_at on the viewer's calendar", () => {
  const base = {
    id: 1, invoice_number: "PI-1", case_id: 3, status: "pending", gross_amount: "10.00",
    finalized_at: "2026-11-26T03:00:00+00:00", created_at: "2026-11-26T03:00:00+00:00",
  }
  assert.equal(productInvoiceToRows({ ...base, due_date: "2026-12-18" })[0].dueDate, "12/18/26")
  assert.equal(productInvoiceToRows({ ...base, due_date: "2026-12-18T00:00:00.000000Z" })[0].dueDate, "12/18/26")
  assert.equal(productInvoiceToRows(base)[0].dueDate, "11/25/26")
})

test("product invoice presets use the viewer's today", () => {
  // Device (Kolkata) is Nov 26; a Pacific viewer is still on Nov 25.
  const now = new Date("2026-11-26T06:00:00Z")
  assert.deepEqual(productInvoiceDateRange("today", zonedNow(LA, now)), { date_from: "2026-11-25", date_to: "2026-11-25" })
  assert.deepEqual(productInvoiceDateRange("today", zonedNow(SH, now)), { date_from: "2026-11-26", date_to: "2026-11-26" })
})

test("statement list payload: created_at on the viewer's calendar, due_date as stored", () => {
  const body = JSON.parse(readFileSync(new URL("../../tests/fixtures/rxn-123/statements-list.json", import.meta.url), "utf8"))
  const row = body.data[0]
  assert.equal(formatUsDay(dayOfInstant(row.created_at, NY), true), "11/25/2026")
  assert.equal(formatUsDay(dayOfInstant(row.created_at, SH), true), "11/26/2026")
  assert.equal(formatUsDay(dateOnlyDay(row.due_date), true), "12/26/2026")
})

test("statement header draft: statement date on the viewer's calendar, due date as stored", () => {
  const draft = buildStatementHeaderDraft({
    id: 9,
    statement_id: "ST-9",
    recipient_email: "office@example.test",
    created_at: "2026-11-26T03:00:00.000000Z",
    due_date: "2026-12-26T00:00:00.000000Z",
  })
  assert.equal(draft.statementDate, "2026-11-25")
  assert.equal(draft.dueDate, "2026-12-26")
})
