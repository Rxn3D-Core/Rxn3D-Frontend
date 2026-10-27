// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/query-params.test.mjs
// Fixed zone so offsets are deterministic (America/Los_Angeles: -07:00 in October, -08:00 in December).
process.env.TZ = "America/Los_Angeles"

import assert from "node:assert/strict"
import test from "node:test"
import {
  buildSlipActivityEventsQuery,
  buildSlipActivityExportQuery,
  defaultSlipActivityFilters,
  localDayBoundary,
  slipActivityExportFilename,
  validateSlipActivityRange,
} from "./query-params.ts"

const base = { fromDate: "2026-10-01", toDate: "2026-10-27", locationIds: [], page: 1, perPage: 25 }

test("local day boundaries carry the local offset and are inclusive", () => {
  assert.equal(localDayBoundary("2026-10-01", "start"), "2026-10-01T00:00:00-07:00")
  assert.equal(localDayBoundary("2026-10-27", "end"), "2026-10-27T23:59:59-07:00")
  // After the DST change the offset moves to -08:00.
  assert.equal(localDayBoundary("2026-12-01", "start"), "2026-12-01T00:00:00-08:00")
})

test("invalid days give null", () => {
  for (const day of ["", "2026-13-01", "2026-02-31", "27/10/2026", "2026-1-1"]) {
    assert.equal(localDayBoundary(day, "start"), null, day)
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

test("export query has the same filters, a format and tz, and no paging", () => {
  const params = new URLSearchParams(buildSlipActivityExportQuery({ ...base, locationIds: [2] }, "xlsx", "America/New_York"))
  assert.equal(params.get("from"), "2026-10-01T00:00:00-07:00")
  assert.deepEqual(params.getAll("location_ids[]"), ["2"])
  assert.equal(params.get("match"), "either")
  assert.equal(params.get("format"), "xlsx")
  assert.equal(params.get("tz"), "America/New_York")
  assert.equal(params.get("page"), null)
  assert.equal(params.get("per_page"), null)
  assert.equal(new URLSearchParams(buildSlipActivityExportQuery(base, "csv", null)).get("tz"), null)
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

test("default filters cover the last 30 days, page 1", () => {
  const f = defaultSlipActivityFilters(new Date(2026, 9, 27, 15, 30))
  assert.deepEqual(f, { fromDate: "2026-09-27", toDate: "2026-10-27", locationIds: [], page: 1, perPage: 25 })
  assert.equal(validateSlipActivityRange(f.fromDate, f.toDate), null)
})

test("export filename is built from the filter days", () => {
  assert.equal(slipActivityExportFilename(base, "csv"), "slip-activity_2026-10-01_2026-10-27.csv")
  assert.equal(slipActivityExportFilename(base, "xlsx"), "slip-activity_2026-10-01_2026-10-27.xlsx")
})
