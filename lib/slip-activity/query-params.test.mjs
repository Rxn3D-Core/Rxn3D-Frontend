// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/query-params.test.mjs
// The browser/process zone must never matter (RXN-9): run in India (+05:30, no DST) and expect
// America/Los_Angeles output (-07:00 in October, -08:00 in December).
process.env.TZ = "Asia/Kolkata"

import assert from "node:assert/strict"
import test from "node:test"
import {
  buildSlipActivityEventsQuery,
  buildSlipActivityExportQuery,
  defaultSlipActivityFilters,
  slipActivityExportFilename,
  validateSlipActivityRange,
} from "./query-params.ts"
import { slipActivityDayBoundary } from "./time-zone.ts"

const base = {
  fromDate: "2026-10-01",
  toDate: "2026-10-27",
  locationIds: [],
  page: 1,
  perPage: 25,
  sort: "action_at",
  direction: "desc",
}

test("the process zone really is Asia/Kolkata in this file", () => {
  assert.equal(new Date(Date.UTC(2026, 9, 1)).getTimezoneOffset(), -330)
})

test("day boundaries carry the America/Los_Angeles offset and are inclusive", () => {
  assert.equal(slipActivityDayBoundary("2026-10-01", "start"), "2026-10-01T00:00:00-07:00")
  assert.equal(slipActivityDayBoundary("2026-10-27", "end"), "2026-10-27T23:59:59-07:00")
  // After the DST change the offset moves to -08:00.
  assert.equal(slipActivityDayBoundary("2026-12-01", "start"), "2026-12-01T00:00:00-08:00")
})

test("invalid days give null", () => {
  for (const day of ["", "2026-13-01", "2026-02-31", "27/10/2026", "2026-1-1"]) {
    assert.equal(slipActivityDayBoundary(day, "start"), null, day)
  }
})

test("events query without statuses sends no location_ids or match", () => {
  const params = new URLSearchParams(buildSlipActivityEventsQuery(base))
  assert.equal(params.get("from"), "2026-10-01T00:00:00-07:00")
  assert.equal(params.get("to"), "2026-10-27T23:59:59-07:00")
  assert.deepEqual(params.getAll("location_ids[]"), [])
  assert.equal(params.get("match"), null)
  assert.equal(params.get("page"), "1")
  assert.equal(params.get("per_page"), "25")
})

test("multiple statuses are de-duplicated, sorted and matched on either side", () => {
  const params = new URLSearchParams(buildSlipActivityEventsQuery({ ...base, locationIds: [4, 3, 4], page: 2 }))
  assert.deepEqual(params.getAll("location_ids[]"), ["3", "4"])
  assert.equal(params.get("match"), "either")
  assert.equal(params.get("page"), "2")
})

test("export query has the same filters and a format, no tz and no paging", () => {
  const params = new URLSearchParams(buildSlipActivityExportQuery({ ...base, locationIds: [2] }, "xlsx"))
  assert.equal(params.get("from"), "2026-10-01T00:00:00-07:00")
  assert.deepEqual(params.getAll("location_ids[]"), ["2"])
  assert.equal(params.get("match"), "either")
  assert.equal(params.get("format"), "xlsx")
  assert.equal(params.get("tz"), null)
  assert.equal(params.get("page"), null)
  assert.equal(params.get("per_page"), null)
})

test("range validation", () => {
  const cases = [
    ["2026-10-01", "2026-10-27", null],
    ["2026-10-27", "2026-10-27", null],
    ["2026-10-28", "2026-10-27", "fromAfterTo"],
    ["2025-10-27", "2026-10-27", null], // 365 days
    ["2025-10-26", "2026-10-27", "rangeTooLong"], // 366 days
    ["", "2026-10-27", "invalidDate"],
    ["2026-02-30", "2026-03-01", "invalidDate"],
  ]
  for (const [from, to, expected] of cases) {
    assert.equal(validateSlipActivityRange(from, to), expected, `${from}..${to}`)
  }
})

test("default filters cover the last 30 days up to today in Los Angeles, page 1", () => {
  // 2026-10-28 10:30 in Kolkata is still 2026-10-27 22:00 in Los Angeles.
  const f = defaultSlipActivityFilters(new Date("2026-10-28T05:00:00Z"))
  assert.deepEqual(f, {
    fromDate: "2026-09-27",
    toDate: "2026-10-27",
    locationIds: [],
    page: 1,
    perPage: 25,
    sort: "action_at",
    direction: "desc",
  })
  assert.equal(validateSlipActivityRange(f.fromDate, f.toDate), null)
})

test("export filename is built from the filter days", () => {
  assert.equal(slipActivityExportFilename(base, "csv"), "slip-activity_2026-10-01_2026-10-27.csv")
  assert.equal(slipActivityExportFilename(base, "xlsx"), "slip-activity_2026-10-01_2026-10-27.xlsx")
})

test("events query sends the default sort, newest first", () => {
  const params = new URLSearchParams(buildSlipActivityEventsQuery(base))
  assert.equal(params.get("sort"), "action_at")
  assert.equal(params.get("direction"), "desc")
})

test("events and export queries carry the chosen sort and direction", () => {
  const sorted = { ...base, sort: "patient_name", direction: "asc", page: 3 }
  const events = new URLSearchParams(buildSlipActivityEventsQuery(sorted))
  assert.equal(events.get("sort"), "patient_name")
  assert.equal(events.get("direction"), "asc")
  assert.equal(events.get("page"), "3")
  const exported = new URLSearchParams(buildSlipActivityExportQuery({ ...sorted, sort: "status", direction: "desc" }, "csv"))
  assert.equal(exported.get("sort"), "status")
  assert.equal(exported.get("direction"), "desc")
  assert.equal(exported.getAll("sort").length, 1)
})
