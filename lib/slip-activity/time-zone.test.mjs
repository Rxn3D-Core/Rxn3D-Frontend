// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/time-zone.test.mjs
// The process zone is India on purpose: output must still be America/Los_Angeles (RXN-9).
process.env.TZ = "Asia/Kolkata"

import assert from "node:assert/strict"
import test from "node:test"
import {
  SLIP_ACTIVITY_TIME_ZONE,
  formatSlipActivityDateTime,
  parseCalendarDay,
  slipActivityDayBoundary,
  slipActivityToday,
  slipActivityZoneAbbreviation,
} from "./time-zone.ts"

test("the zone is fixed to America/Los_Angeles while the process runs in Asia/Kolkata", () => {
  assert.equal(SLIP_ACTIVITY_TIME_ZONE, "America/Los_Angeles")
  assert.equal(new Date(Date.UTC(2026, 9, 1)).getTimezoneOffset(), -330)
})

test("day boundaries use the offset of that day, including DST change days", () => {
  const cases = [
    ["2026-10-27", "start", "2026-10-27T00:00:00-07:00"],
    ["2026-10-27", "end", "2026-10-27T23:59:59-07:00"],
    ["2026-12-15", "start", "2026-12-15T00:00:00-08:00"],
    // DST ends 2026-11-01 at 02:00: the day starts in PDT and ends in PST.
    ["2026-11-01", "start", "2026-11-01T00:00:00-07:00"],
    ["2026-11-01", "end", "2026-11-01T23:59:59-08:00"],
    // DST starts 2026-03-08 at 02:00: the day starts in PST and ends in PDT.
    ["2026-03-08", "start", "2026-03-08T00:00:00-08:00"],
    ["2026-03-08", "end", "2026-03-08T23:59:59-07:00"],
    ["2026-03-07", "end", "2026-03-07T23:59:59-08:00"],
    ["2026-11-02", "start", "2026-11-02T00:00:00-08:00"],
  ]
  for (const [day, edge, expected] of cases) {
    assert.equal(slipActivityDayBoundary(day, edge), expected, `${day} ${edge}`)
  }
})

test("boundaries are the exact instants of Los Angeles midnight and 23:59:59", () => {
  assert.equal(new Date(slipActivityDayBoundary("2026-11-01", "start")).toISOString(), "2026-11-01T07:00:00.000Z")
  assert.equal(new Date(slipActivityDayBoundary("2026-11-01", "end")).toISOString(), "2026-11-02T07:59:59.000Z")
})

test("invalid calendar days give null", () => {
  for (const day of ["", "2026-13-01", "2026-02-31", "27/10/2026", "2026-1-1"]) {
    assert.equal(parseCalendarDay(day), null, day)
    assert.equal(slipActivityDayBoundary(day, "end"), null, day)
  }
  assert.deepEqual(parseCalendarDay("2028-02-29"), { year: 2028, month: 2, day: 29 })
})

test("today is the Los Angeles calendar day, not the process one", () => {
  // 2026-10-28 10:30 in Kolkata, 2026-10-27 22:00 in Los Angeles.
  assert.equal(slipActivityToday(new Date("2026-10-28T05:00:00Z")), "2026-10-27")
  // 2026-10-28 00:30 in Los Angeles.
  assert.equal(slipActivityToday(new Date("2026-10-28T07:30:00Z")), "2026-10-28")
})

test("zone abbreviation follows DST", () => {
  assert.equal(slipActivityZoneAbbreviation(new Date("2026-10-27T15:14:03Z")), "PDT")
  assert.equal(slipActivityZoneAbbreviation(new Date("2026-12-15T15:14:03Z")), "PST")
})

test("action_at is shown in Los Angeles time with its abbreviation", () => {
  assert.match(formatSlipActivityDateTime("2026-10-27T08:14:03-07:00", "en-US"), /^Oct 27, 2026, 8:14\sAM PDT$/)
  // The same instant given in UTC, or in another offset, renders identically.
  assert.equal(
    formatSlipActivityDateTime("2026-10-27T15:14:03Z", "en-US"),
    formatSlipActivityDateTime("2026-10-27T08:14:03-07:00", "en-US"),
  )
  // Late evening in Los Angeles is already the next day in Kolkata; the Los Angeles day wins.
  assert.match(formatSlipActivityDateTime("2026-12-15T23:30:00-08:00", "en-US"), /^Dec 15, 2026, 11:30\sPM PST$/)
  // Other UI languages keep the Los Angeles clock time and the PDT/PST abbreviation.
  assert.match(formatSlipActivityDateTime("2026-10-27T08:14:03-07:00", "de"), /08:14 PDT$/)
})

test("unparseable values are shown as given", () => {
  assert.equal(formatSlipActivityDateTime("not a date", "en-US"), "not a date")
})
