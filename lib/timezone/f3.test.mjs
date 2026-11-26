// Run: node --import ./test-alias-loader.mjs --test lib/timezone/f3.test.mjs
// RXN-123 slice F3. The process zone is India on purpose: the device zone must never matter.
process.env.TZ = "Asia/Kolkata"

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { clockOfInstant, clockToInstant, parseApiInstant, toZonedWallDate, zonedNow } from "./index.ts"
import { listingCreatedAt, listingDueClock, listingDueDay } from "./listing.ts"
import { readViewerTimeZone } from "./viewer.ts"
import { formatSlipListingTimestamp } from "../slip-listing-timestamp.ts"
import { formatCaseManagementDueDate, parseSlipListingDueDate } from "../slip-listing-due-date.ts"
import { applyViewerZoneToHeader, buildVirtualSlipVM } from "../virtual-slip-view-model.ts"
import { formatCallLogTimestamp, flattenCaseCallLogs } from "../call-log-transformers.ts"
import { formatHoldBannerTimestamp } from "../slip-hold-info.ts"
import { formatSlipNoteTimestamp } from "../api/slip-notes.ts"

const LA = "America/Los_Angeles"
const NY = "America/New_York"
const SH = "Asia/Shanghai"
const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../../tests/fixtures/rxn-123/${name}`, import.meta.url), "utf8"))

// --- Instants ---

test("API instants: offsets kept, values without an offset are Pacific, date-only is not an instant", () => {
  assert.equal(parseApiInstant("2026-11-25T08:00:00-08:00")?.toISOString(), "2026-11-25T16:00:00.000Z")
  assert.equal(parseApiInstant("2026-11-25T16:00:00.000000Z")?.toISOString(), "2026-11-25T16:00:00.000Z")
  assert.equal(parseApiInstant("2026-11-25 08:00:00")?.toISOString(), "2026-11-25T16:00:00.000Z")
  assert.equal(parseApiInstant("2026-07-01T08:00:00")?.toISOString(), "2026-07-01T15:00:00.000Z")
  assert.equal(parseApiInstant("2026-11-25"), null)
  assert.equal(parseApiInstant("nope"), null)
  assert.equal(parseApiInstant(""), null)
})

test("acceptance: 8:00 AM Las Vegas is 11:00 AM for a NY lab; Monday 08:00 Shanghai is Sunday 4:00 PM in LV", () => {
  const ny = toZonedWallDate("2026-11-25T08:00:00-08:00", NY)
  assert.deepEqual([ny.getDate(), ny.getHours(), ny.getMinutes()], [25, 11, 0])
  const lv = toZonedWallDate("2026-11-23T08:00:00+08:00", LA)
  assert.deepEqual([lv.getDay(), lv.getDate(), lv.getHours()], [0, 22, 16])
  // Date-only stays that day in every zone.
  const d = toZonedWallDate("2026-11-26", SH)
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 10, 26, 0])
  assert.equal(toZonedWallDate(null, NY), null)
  assert.equal(clockOfInstant("2026-11-25T08:00:00-08:00", NY), "11:00:00")
})

test("viewer 'today' and the viewer zone outside React", () => {
  const now = new Date("2026-11-26T06:00:00Z") // 01:00 NY, 22:00 LA (Nov 25)
  assert.equal(zonedNow(NY, now).getDate(), 26)
  assert.equal(zonedNow(LA, now).getDate(), 25)
  // No browser here: Pacific.
  assert.equal(readViewerTimeZone(), LA)
})

// --- Listings (S3) ---

test("lab listing rows: created time and due date in the viewer's zone, date-only untouched", () => {
  const [pacific, newYork, shanghai, dateOnly] = fixture("lab-slips-ny.json").data
  assert.equal(listingCreatedAt(newYork, NY), "11/25/26 @ 11:00 am")
  assert.equal(listingCreatedAt(newYork, LA), "11/25/26 @ 8:00 am")
  assert.equal(listingCreatedAt(shanghai, LA), "11/22/26 @ 4:00 pm")
  // Older backend: the API's own text.
  assert.equal(listingCreatedAt({ timestamp: "11/25/26 @ 8:00 am" }, NY), "11/25/26 @ 8:00 am")

  assert.equal(listingDueDay(pacific, pacific.delivery_date.final_date, NY), "2026-12-02")
  assert.equal(listingDueDay(newYork, newYork.delivery_date.final_date, LA), "2026-12-02")
  assert.equal(listingDueClock(newYork, "16:00:00", LA), "13:00:00")
  // Shanghai due Nov 26 09:00 = Nov 25 17:00 in Las Vegas (decision 1: the day changes).
  assert.equal(listingDueDay(shanghai, shanghai.delivery_date.final_date, LA), "2026-11-25")
  assert.equal(listingDueClock(shanghai, "09:00:00", LA), "17:00:00")
  // delivery_at null: date-only, never shifted.
  assert.equal(listingDueDay(dateOnly, dateOnly.delivery_date.final_date, SH), "2026-12-04")
  assert.equal(listingDueClock(dateOnly, undefined, SH), undefined)
})

test("listing timestamp formatting keeps the old device behaviour without a zone", () => {
  assert.equal(formatSlipListingTimestamp("11/25/26 @ 8:00 am", NY), "11/25/26 @ 8:00 am")
  assert.equal(formatSlipListingTimestamp("2026-11-25T08:00:00-08:00", NY), "11/25/26 @ 11:00 am")
  assert.equal(formatSlipListingTimestamp("", NY), "—")
})

test("countdown uses the viewer's today, not the device's", () => {
  // Device (Kolkata) is already Nov 26; a LV viewer is still on Nov 25.
  const now = new Date("2026-11-26T06:00:00Z")
  const due = parseSlipListingDueDate("2026-11-26")
  assert.equal(formatCaseManagementDueDate(due, zonedNow(LA, now)), "1d · 11/26")
  assert.equal(formatCaseManagementDueDate(due, zonedNow(NY, now)), "Today · 11/26")
})

// --- Virtual slip (S4) ---

test("virtual slip header shows pickup and due on the viewer's clock with the viewer's zone", () => {
  const record = fixture("slip-detail-ny.json").data
  const lv = buildVirtualSlipVM(record, { viewerTimeZone: LA }).header
  assert.equal(lv.dueDate, "12/02/26")
  assert.equal(lv.deliveryTime, "1:00 PM PST")
  assert.equal(lv.pickupDate, "11/27/26")
  // The NY lab sees its own clock, no abbreviation added.
  const ny = buildVirtualSlipVM(record, { viewerTimeZone: NY }).header
  assert.equal(ny.deliveryTime, "4:00 PM")
  // Print paths pass no viewer zone: the lab's values, as stored.
  const print = buildVirtualSlipVM(record).header
  assert.equal(print.deliveryTime, "4:00 PM")
  assert.equal(print.dueDate, "12/02/26")
})

test("virtual slip header: day change, date-only final date and older backends", () => {
  const base = { dueDate: "11/26/26", deliveryTime: "9:00 AM", pickupDate: "11/24/26" }
  const shanghai = {
    lab_timezone: SH,
    delivery: { final_at: "2026-11-26T09:00:00+08:00", pickup_at: "2026-11-24T10:00:00+08:00" },
  }
  const h = applyViewerZoneToHeader(base, shanghai, LA)
  assert.deepEqual([h.dueDate, h.deliveryTime, h.pickupDate], ["11/25/26", "5:00 PM PST", "11/23/26"])
  // final_at null = date-only final date (e.g. a rush date): kept.
  const rush = { lab_timezone: SH, delivery: { final_at: null, delivery_at: "2026-11-26T09:00:00+08:00" } }
  assert.deepEqual(applyViewerZoneToHeader(base, rush, LA), base)
  // Older backend: no instants, unchanged.
  assert.equal(applyViewerZoneToHeader(base, { delivery: {} }, LA), base)
  assert.equal(applyViewerZoneToHeader(base, shanghai, null), base)
})

test("a custom due date chosen on the viewer's clock is sent with the viewer's offset", () => {
  // A Las Vegas viewer picks Dec 2, 1:00 PM on their clock; a NY lab picks 4:00 PM on its own.
  assert.equal(clockToInstant("2026-12-02", "13:00", LA), "2026-12-02T13:00:00-08:00")
  assert.equal(clockToInstant("2026-12-02", "16:00", NY), "2026-12-02T16:00:00-05:00")
})

// --- Notes, call logs, hold (S5) ---

test("notes, call logs and hold times are shown on the viewer's clock", () => {
  const data = fixture("notes-and-call-logs.json")
  // Monday 08:00 Shanghai note, seen by a LV lab in November: Sunday 4:00 PM.
  assert.match(formatSlipNoteTimestamp(data.notes[0].created_at, LA), /^11\/22\/26,? 4:00\sPM$/)
  assert.match(formatSlipNoteTimestamp(data.notes[0].created_at, SH), /^11\/23\/26,? 8:00\sAM$/)
  assert.equal(formatHoldBannerTimestamp(data.hold.held_at, LA).replace(/\s/g, " "), "11/22/2026 @ 4:00 PM")
  // Call log: the Pacific wall time (no offset) and the instant (B3) give the same NY time.
  assert.equal(formatCallLogTimestamp(data.call_logs[0].call_date_time, NY), "11/25/26 @ 11:00 AM")
  assert.equal(formatCallLogTimestamp(data.call_logs[0].timestamp.iso, NY), "11/25/26 @ 11:00 AM")
  assert.equal(formatCallLogTimestamp("not a date", NY), "not a date")
})

test("flattened call logs prefer timestamp.iso", () => {
  const data = fixture("notes-and-call-logs.json")
  const rows = flattenCaseCallLogs({
    id: 1,
    patient_name: "P",
    slips: [{ id: 2, slip_number: "S-0002", call_logs: data.call_logs, products: [] }],
  })
  assert.equal(rows[0].timestamp, "2026-11-25T08:00:00-08:00")
})
