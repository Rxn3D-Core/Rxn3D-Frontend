// Run: node --import ./test-alias-loader.mjs --test lib/timezone/index.test.mjs
// The process zone is India on purpose: the device zone must never matter (RXN-123).
process.env.TZ = "Asia/Kolkata"

import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_TIME_ZONE,
  TIME_ZONE_OPTIONS,
  clockToInstant,
  convertClock,
  formatInstant,
  isValidTimeZone,
  normalizeTimeZone,
  resolveViewerTimeZone,
  timeZoneLabel,
  todayInZone,
  zoneAbbreviation,
} from "./index.ts"

const LA = "America/Los_Angeles"
const NY = "America/New_York"
const SH = "Asia/Shanghai"

test("the process runs in Asia/Kolkata", () => {
  assert.equal(new Date(Date.UTC(2026, 10, 25)).getTimezoneOffset(), -330)
})

test("missing or invalid zones fall back to America/Los_Angeles", () => {
  assert.equal(DEFAULT_TIME_ZONE, LA)
  for (const v of [undefined, null, "", "  ", "America/Las_Vegas", "Pacific Time (Las Vegas / Los Angeles)", "+05:00", "Nevada", 42]) {
    assert.equal(normalizeTimeZone(v), LA, String(v))
  }
  assert.equal(normalizeTimeZone(" America/New_York "), NY)
  assert.equal(isValidTimeZone("Asia/Kolkata"), true)
  assert.equal(isValidTimeZone("America/Las_Vegas"), false)
})

test("every curated option is a valid zone and the list has no duplicates", () => {
  const values = TIME_ZONE_OPTIONS.map((o) => o.value)
  assert.equal(new Set(values).size, values.length)
  for (const v of values) assert.equal(isValidTimeZone(v), true, v)
  assert.equal(values[0], LA)
})

test("labels: Pacific keeps today's text, others name the zone", () => {
  assert.equal(timeZoneLabel(undefined), "Pacific Time (Las Vegas / Los Angeles)")
  assert.equal(timeZoneLabel(LA), "Pacific Time (Las Vegas / Los Angeles)")
  assert.equal(timeZoneLabel(NY), "Eastern Time (New York)")
  assert.equal(timeZoneLabel("America/Argentina/Buenos_Aires"), "America/Argentina/Buenos Aires")
})

test("viewer zone comes from the selected profile in login customers[]", () => {
  const user = {
    customers: [
      { id: 1, timezone: LA },
      { id: 2, timezone: NY },
      { id: 3 }, // old backend: no timezone
    ],
  }
  assert.equal(resolveViewerTimeZone(user, 2), NY)
  assert.equal(resolveViewerTimeZone(user, "2"), NY)
  assert.equal(resolveViewerTimeZone(user, 1), LA)
  assert.equal(resolveViewerTimeZone(user, 3), LA)
  assert.equal(resolveViewerTimeZone({ ...user, customer_id: 2 }, null), NY)
  assert.equal(resolveViewerTimeZone({ customers: [{ id: 9, timezone: SH }] }, null), SH)
  // Several profiles and none selected: no guess.
  assert.equal(resolveViewerTimeZone(user, null), LA)
  assert.equal(resolveViewerTimeZone(null, 2), LA)
  assert.equal(resolveViewerTimeZone({ customers: [{ id: 2, timezone: "Bad/Zone" }] }, 2), LA)
})

test("acceptance: 8:00 AM Las Vegas is 11:00 AM in New York", () => {
  const iso = "2026-11-25T08:00:00-08:00"
  assert.equal(formatInstant(iso, LA, "time"), "8:00 AM PST")
  assert.equal(formatInstant(iso, NY, "time"), "11:00 AM EST")
  assert.equal(formatInstant(iso, NY), "Nov 25, 2026, 11:00 AM EST")
})

test("acceptance: Monday 08:00 Shanghai is Sunday 4:00 PM for a Las Vegas lab in November", () => {
  const iso = "2026-11-23T08:00:00+08:00" // Monday
  assert.equal(formatInstant(iso, LA), "Nov 22, 2026, 4:00 PM PST")
  assert.equal(new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: LA }).format(new Date(iso)), "Sunday")
})

test("acceptance: a 3:00 PM New York cut-off shows as 12:00 PM to a Las Vegas viewer", () => {
  assert.deepEqual(convertClock("15:00", NY, LA, "2026-11-25"), { date: "2026-11-25", time: "12:00" })
  assert.deepEqual(convertClock("15:00:00", NY, NY, "2026-11-25"), { date: "2026-11-25", time: "15:00" })
  // Shanghai 09:00 on Nov 26 is Nov 25 17:00 in Las Vegas (the day changes).
  assert.deepEqual(convertClock("09:00", SH, LA, "2026-11-26"), { date: "2026-11-25", time: "17:00" })
  assert.equal(convertClock("25:00", NY, LA, "2026-11-25"), null)
  assert.equal(convertClock("15:00", NY, LA, "2026-02-30"), null)
})

test("clock values become instants with the zone's offset for that day", () => {
  assert.equal(clockToInstant("2026-11-27", "15:00:00", NY), "2026-11-27T15:00:00-05:00")
  assert.equal(clockToInstant("2026-12-02", "16:00", NY), "2026-12-02T16:00:00-05:00")
  assert.equal(clockToInstant("2026-07-01", "09:30", LA), "2026-07-01T09:30:00-07:00")
  assert.equal(clockToInstant("2026-11-26", "09:00", SH), "2026-11-26T09:00:00+08:00")
  assert.equal(clockToInstant("2026-11-26", "09:00", undefined), "2026-11-26T09:00:00-08:00")
})

test("DST gap moves forward by the gap, as Carbon does", () => {
  // 2027-03-14 02:30 does not exist in the US.
  assert.equal(clockToInstant("2027-03-14", "02:30", LA), "2027-03-14T03:30:00-07:00")
  assert.equal(clockToInstant("2027-03-14", "02:30", NY), "2027-03-14T03:30:00-04:00")
  assert.equal(clockToInstant("2027-03-14", "01:59", LA), "2027-03-14T01:59:00-08:00")
  assert.equal(clockToInstant("2027-03-14", "03:00", LA), "2027-03-14T03:00:00-07:00")
})

test("DST overlap uses the first, earlier occurrence (daylight time)", () => {
  assert.equal(clockToInstant("2026-11-01", "01:30", LA), "2026-11-01T01:30:00-07:00")
  assert.equal(clockToInstant("2026-11-01", "01:30", NY), "2026-11-01T01:30:00-04:00")
  assert.equal(clockToInstant("2026-11-01", "02:00", LA), "2026-11-01T02:00:00-08:00")
  assert.equal(clockToInstant("2026-11-01", "00:59", LA), "2026-11-01T00:59:00-07:00")
})

test("today is the zone's calendar day", () => {
  // 2026-11-25 22:00 in Los Angeles is 2026-11-26 01:00 in New York and 11:30 in Kolkata.
  const now = new Date("2026-11-26T06:00:00Z")
  assert.equal(todayInZone(LA, now), "2026-11-25")
  assert.equal(todayInZone(NY, now), "2026-11-26")
  assert.equal(todayInZone("Bad/Zone", now), "2026-11-25")
})

test("date-only values are never shifted", () => {
  for (const tz of [LA, NY, SH, "Pacific/Honolulu", "Pacific/Kiritimati"]) {
    assert.equal(formatInstant("2026-11-26", tz), "Nov 26, 2026", tz)
    assert.equal(formatInstant("2026-11-26", tz, "time"), "Nov 26, 2026", tz)
  }
})

test("abbreviations follow DST; bad input is returned as is", () => {
  assert.equal(zoneAbbreviation(NY, new Date("2026-07-01T12:00:00Z")), "EDT")
  assert.equal(zoneAbbreviation(NY, new Date("2026-12-01T12:00:00Z")), "EST")
  assert.equal(zoneAbbreviation("nope", new Date("2026-12-01T12:00:00Z")), "PST")
  assert.equal(formatInstant("not a date", NY), "not a date")
  assert.equal(formatInstant(null, NY), "")
  assert.equal(formatInstant("2026-11-25T08:00:00-08:00", NY, "date"), "Nov 25, 2026")
})
