// Run: node --import ./test-alias-loader.mjs --test lib/timezone/f2.test.mjs
// RXN-123 slice F2. The process zone is India on purpose: the device zone must never matter.
process.env.TZ = "Asia/Kolkata"

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  clockZoneAbbreviation,
  dayOfInstant,
  deliveryEstimateDay,
  matchesTimeZoneSearch,
  slipLabTimeZone,
  timeZoneChoices,
  timeZoneOffsetLabel,
  timeZoneCity,
} from "./index.ts"
import { IANA_TIME_ZONES } from "./iana-zones.ts"
import { resolveUpcomingCutoff } from "./cutoff.ts"
import { convertWeeklyClock, nextDateOfWeekday, weeklyHoursRange } from "./business-hours.ts"
import { labTimezoneLabel, labTimezoneLabelForDay } from "../lab-timezone.ts"
import {
  defaultSlipActivityFilters,
  buildSlipActivityEventsQuery,
  withSlipActivityTimeZone,
} from "../slip-activity/query-params.ts"
import { formatSlipActivityDateTime, slipActivityToday } from "../slip-activity/time-zone.ts"

const LA = "America/Los_Angeles"
const NY = "America/New_York"
const SH = "Asia/Shanghai"
const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../../tests/fixtures/rxn-123/${name}`, import.meta.url), "utf8"))

// --- Cut-off banner (S2) ---

test("acceptance: a NY 3:00 PM cut-off warns from 2:50 PM NY time and shows 12:00 PM PST to a LV office", () => {
  // 2026-11-25 14:52 in New York = 11:52 in Las Vegas.
  const now = new Date("2026-11-25T19:52:00Z")
  const c = resolveUpcomingCutoff(["15:00:00"], now, NY, LA)
  assert.deepEqual(c, { minutesLeft: 8, label: "12:00 PM", zone: "PST", labLabel: "3:00 PM", labZone: "EST" })
  // The NY lab itself sees its own clock.
  assert.equal(resolveUpcomingCutoff(["15:00:00"], now, NY, NY)?.label, "3:00 PM")
  assert.equal(resolveUpcomingCutoff(["15:00:00"], now, NY, NY)?.zone, "EST")
})

test("the cut-off window is on the lab's clock, not the viewer's (the old 3-hour bug)", () => {
  // 14:52 Pacific = 17:52 New York: a NY 3:00 PM cut-off has passed, so no warning.
  const now = new Date("2026-11-25T22:52:00Z")
  assert.equal(resolveUpcomingCutoff(["15:00"], now, NY, LA), null)
  // Without zones (old backend) it is Pacific, as before.
  assert.equal(resolveUpcomingCutoff(["15:00"], now)?.minutesLeft, 8)
  assert.equal(resolveUpcomingCutoff(["15:00"], now)?.label, "3:00 PM")
  assert.equal(resolveUpcomingCutoff(["15:00"], now)?.zone, "PST")
})

test("cut-off: outside the window, passed, and the nearest of two", () => {
  const now = new Date("2026-11-25T19:52:00Z") // 14:52 NY
  assert.equal(resolveUpcomingCutoff(["15:05"], now, NY, LA), null) // 13 min away
  assert.equal(resolveUpcomingCutoff(["14:52"], now, NY, LA), null) // now
  assert.equal(resolveUpcomingCutoff(["3:00 PM", "14:55"], now, NY, LA)?.minutesLeft, 3)
  assert.equal(resolveUpcomingCutoff([null, undefined, "bad"], now, NY, LA), null)
})

test("a Shanghai cut-off is shown on the Las Vegas clock (the previous evening)", () => {
  // 09:55 Shanghai on 2026-11-26 = 17:55 Las Vegas on 2026-11-25.
  const now = new Date("2026-11-26T01:55:00Z")
  const c = resolveUpcomingCutoff(["10:00"], now, SH, LA)
  assert.equal(c?.minutesLeft, 5)
  assert.equal(c?.label, "6:00 PM")
  assert.equal(c?.zone, "PST")
  // Intl has no short name for China time in en-US.
  assert.equal(c?.labZone, "GMT+8")
})

// --- Estimated due date (S2) ---

test("estimate day: delivery_at in the viewer's zone, else the lab's delivery_date", () => {
  assert.equal(deliveryEstimateDay(fixture("delivery-date-ny.json").data, LA), "2026-12-02")
  assert.equal(deliveryEstimateDay(fixture("delivery-date-ny.json").data, NY), "2026-12-02")
  // Shanghai due Nov 26 09:00 is Nov 25 5:00 PM in Las Vegas (decision 1: the day changes).
  assert.equal(deliveryEstimateDay(fixture("delivery-date-shanghai.json").data, LA), "2026-11-25")
  assert.equal(deliveryEstimateDay(fixture("delivery-date-shanghai.json").data, SH), "2026-11-26")
  // Older backend: date-only, never shifted.
  assert.equal(deliveryEstimateDay(fixture("delivery-date-legacy.json").data, SH), "2026-12-02")
  assert.equal(deliveryEstimateDay({ delivery_date: "2026-12-02T07:00:00.000000Z", delivery_at: null }, SH), "2026-12-02")
  assert.equal(deliveryEstimateDay({}, LA), null)
  assert.equal(deliveryEstimateDay(null, LA), null)
  assert.equal(dayOfInstant("2026-11-26", LA), "2026-11-26")
  assert.equal(dayOfInstant("nope", LA), null)
})

// --- Paper slip label (S8) ---

test("slip lab zone comes from delivery.timezone, lab_timezone or timezone; else Pacific", () => {
  assert.equal(slipLabTimeZone({ delivery: { timezone: NY } }), NY)
  assert.equal(slipLabTimeZone({ lab_timezone: SH }), SH)
  assert.equal(slipLabTimeZone({ timezone: NY }), NY)
  assert.equal(slipLabTimeZone({ case: { lab: { timezone: NY } } }), NY)
  assert.equal(slipLabTimeZone({}), LA)
  assert.equal(slipLabTimeZone(null), LA)
  assert.equal(clockZoneAbbreviation("2026-12-02", NY), "EST")
  assert.equal(clockZoneAbbreviation("2026-08-14", LA), "PDT")
  assert.equal(clockZoneAbbreviation("2026-08-14T00:00:00.000000Z", LA), "PDT")
  assert.equal(clockZoneAbbreviation(null, NY, new Date("2026-07-01T12:00:00Z")), "EDT")
})

// --- Slip Activity in the lab's zone (S6) ---

test("slip activity: a NY lab's days, boundaries and times are New York ones", () => {
  // 2026-11-26 01:00 in New York, still 2026-11-25 in Los Angeles.
  const now = new Date("2026-11-26T06:00:00Z")
  assert.equal(slipActivityToday(now, NY), "2026-11-26")
  assert.equal(slipActivityToday(now), "2026-11-25")
  const filters = defaultSlipActivityFilters(now, NY)
  assert.equal(filters.toDate, "2026-11-26")
  assert.equal(filters.timeZone, NY)
  const q = new URLSearchParams(buildSlipActivityEventsQuery({ ...filters, fromDate: "2026-11-01", toDate: "2026-11-26" }))
  assert.equal(q.get("from"), "2026-11-01T00:00:00-04:00")
  assert.equal(q.get("to"), "2026-11-26T23:59:59-05:00")
  assert.equal(q.has("timeZone"), false)
  assert.match(formatSlipActivityDateTime("2026-11-25T08:00:00-08:00", "en-US", NY), /^Nov 25, 2026, 11:00\sAM EST$/)
  // Without a zone the filters are exactly the old Pacific ones.
  assert.equal("timeZone" in defaultSlipActivityFilters(now), false)
})

test("slip activity: switching zone recomputes untouched default dates only", () => {
  const now = new Date("2026-11-26T06:00:00Z")
  const la = defaultSlipActivityFilters(now)
  const moved = withSlipActivityTimeZone(la, NY, now)
  assert.equal(moved.timeZone, NY)
  assert.equal(moved.toDate, "2026-11-26")
  const chosen = { ...la, fromDate: "2026-10-01", toDate: "2026-10-31" }
  const kept = withSlipActivityTimeZone(chosen, NY, now)
  assert.deepEqual([kept.fromDate, kept.toDate, kept.timeZone], ["2026-10-01", "2026-10-31", NY])
  assert.equal(withSlipActivityTimeZone(moved, NY, now), moved)
})

// --- Other organisation's hours (S1 hint, item b) ---

test("weekly hours of a NY lab shown to a LV viewer", () => {
  const now = new Date("2026-11-25T18:00:00Z") // Wednesday
  assert.equal(nextDateOfWeekday("Wednesday", NY, now), "2026-11-25")
  assert.equal(nextDateOfWeekday("Monday", NY, now), "2026-11-30")
  assert.equal(nextDateOfWeekday("Funday", NY, now), null)
  assert.equal(weeklyHoursRange("Monday", "09:00 am", "05:00 pm", NY, LA, now), "6:00 AM – 2:00 PM")
  assert.equal(weeklyHoursRange("Monday", "09:00 am", "05:00 pm", NY, NY, now), "9:00 AM – 5:00 PM")
  assert.equal(convertWeeklyClock("Monday", "not a time", NY, LA, now), "not a time")
})

test("weekly hours that cross the day name the other day", () => {
  const now = new Date("2026-11-25T18:00:00Z")
  // Shanghai Monday 09:00-17:00 = Las Vegas Sunday 5:00 PM - Monday 1:00 AM.
  assert.equal(weeklyHoursRange("Monday", "09:00", "17:00", SH, LA, now), "Sun 5:00 PM – 1:00 AM")
  // Las Vegas Friday 17:00 = Shanghai Saturday 09:00.
  assert.equal(convertWeeklyClock("Friday", "17:00", LA, SH, now), "Sat 9:00 AM")
})

test("weekly hours use the DST of that week in each zone", () => {
  // 2027-03-14 (Sunday) US clocks change; Europe changes on 2027-03-28.
  const now = new Date("2027-03-12T12:00:00Z") // Friday
  // Monday 2027-03-15: New York EDT (-4), London GMT (+0): 9:00 NY = 13:00 London.
  assert.equal(convertWeeklyClock("Monday", "09:00", NY, "Europe/London", now), "1:00 PM")
  // Friday 2027-03-12: still EST (-5): 9:00 NY = 14:00 London.
  assert.equal(convertWeeklyClock("Friday", "09:00", NY, "Europe/London", now), "2:00 PM")
})

// --- Calendar labels (item c) ---

test("calendar labels use the lab's zone; Pacific keeps today's text", () => {
  const winter = new Date("2026-12-15T12:00:00Z")
  assert.equal(labTimezoneLabel(winter), "PST · Los Angeles / Las Vegas")
  assert.equal(labTimezoneLabel(winter, NY), "EST · New York")
  assert.equal(labTimezoneLabel(winter, "America/Argentina/Buenos_Aires"), "GMT-3 · Buenos Aires")
  assert.equal(labTimezoneLabelForDay("2026-07-04", NY), "EDT · New York")
  assert.equal(labTimezoneLabelForDay("2026-07-04"), "PDT · Los Angeles / Las Vegas")
  assert.equal(timeZoneCity("Asia/Singapore"), "Singapore")
  assert.equal(timeZoneCity(undefined), "Los Angeles / Las Vegas")
})

// --- Dropdown search over all zones (item a) ---

test("choices list the common zones first, then all backend zones, without duplicates", () => {
  const choices = timeZoneChoices(NY)
  const values = choices.map((c) => c.value)
  assert.equal(values[0], LA)
  assert.equal(new Set(values).size, values.length)
  assert.equal(values.length, IANA_TIME_ZONES.length)
  const firstOther = choices.findIndex((c) => !c.common)
  assert.ok(choices.slice(0, firstOther).every((c) => c.common))
  assert.ok(choices.slice(firstOther).every((c) => !c.common))
  assert.ok(values.includes("America/Argentina/Buenos_Aires"))
  assert.ok(!values.includes("US/Eastern"))
  assert.ok(!values.includes("Asia/Calcutta"))
  // A stored zone outside the backend list stays visible at the top.
  assert.equal(timeZoneChoices("Asia/Calcutta")[0].value, "Asia/Calcutta")
})

test("search matches labels and IANA names, ignoring _ and /", () => {
  const choices = timeZoneChoices()
  const find = (q) => choices.filter((c) => matchesTimeZoneSearch(c, q)).map((c) => c.value)
  assert.deepEqual(find("buenos aires"), ["America/Argentina/Buenos_Aires"])
  assert.ok(find("new york").includes(NY))
  assert.ok(find("eastern").includes(NY))
  assert.ok(find("Asia/Kol").includes("Asia/Kolkata"))
  assert.ok(find("las vegas").includes(LA))
  assert.equal(find("").length, choices.length)
  assert.deepEqual(find("zzzz"), [])
})

test("offsets follow daylight saving and half-hour zones, and can be searched", () => {
  const winter = new Date("2026-01-15T12:00:00Z")
  const summer = new Date("2026-07-15T12:00:00Z")
  assert.equal(timeZoneOffsetLabel("America/Los_Angeles", winter), "UTC\u221208:00")
  assert.equal(timeZoneOffsetLabel("America/Los_Angeles", summer), "UTC\u221207:00")
  assert.equal(timeZoneOffsetLabel("Asia/Kolkata", winter), "UTC+05:30")
  assert.equal(timeZoneOffsetLabel("Asia/Kathmandu", winter), "UTC+05:45")
  assert.equal(timeZoneOffsetLabel("UTC", winter), "UTC+00:00")

  const find = (q) =>
    timeZoneChoices()
      .filter((c) => matchesTimeZoneSearch(c, q, winter))
      .map((c) => c.value)
  assert.ok(find("+05:30").includes("Asia/Kolkata"))
  assert.ok(find("-08:00").includes("America/Los_Angeles"))
  assert.ok(find("UTC+05:45").includes("Asia/Kathmandu"))
  assert.ok(!find("+05:30").includes("America/New_York"))
})
