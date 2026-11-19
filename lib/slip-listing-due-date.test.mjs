import assert from "node:assert/strict"
import test from "node:test"
import {
  countSlipListingOverdueWorkingDays,
  countSlipListingUpcomingWorkingDays,
  formatCaseManagementDueDate,
  formatSlipListingDueDate,
  parseSlipListingDueDate,
} from "./slip-listing-due-date.ts"

const today = new Date(2026, 5, 9) // 2026-06-09 local

test("formatSlipListingDueDate — overdue", () => {
  const result = formatSlipListingDueDate("2026-06-08", today)
  assert.equal(result.label, "1 days past 06/08")
  assert.equal(result.tone, "overdue")
})

test("formatSlipListingDueDate — due today", () => {
  const result = formatSlipListingDueDate("2026-06-09", today)
  assert.equal(result.label, "Due today 06/09")
  assert.equal(result.tone, "today")
})

test("formatSlipListingDueDate — upcoming", () => {
  const result = formatSlipListingDueDate("2026-06-10", today)
  assert.equal(result.label, "1 days to 06/10")
  assert.equal(result.tone, "upcoming")
})

test("formatSlipListingDueDate — empty", () => {
  const result = formatSlipListingDueDate("", today)
  assert.equal(result.label, "—")
  assert.equal(result.tone, "empty")
})

test("counts only Monday-Friday after a Friday due date", () => {
  const due = new Date(2026, 9, 30)
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 9, 31)), 0)
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 10, 1)), 0)
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 10, 2)), 1)
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 10, 3)), 2)
  assert.equal(formatCaseManagementDueDate(due, new Date(2026, 9, 31)), "0d ago · 10/30")
  assert.equal(formatCaseManagementDueDate(due, new Date(2026, 10, 2)), "1d ago · 10/30")
  assert.equal(formatCaseManagementDueDate(due, new Date(2026, 10, 3)), "2d ago · 10/30")
})

test("uses the Lab's configured open days when available", () => {
  const due = new Date(2026, 9, 30)
  const hours = [
    { day: "monday", is_open: true },
    { day: "tuesday", is_open: true },
    { day: "wednesday", is_open: true },
    { day: "thursday", is_open: true },
    { day: "friday", is_open: false },
    { day: "saturday", is_open: true },
    { day: "sunday", is_open: false },
  ]
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 9, 31), hours), 1)
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 10, 2, 0, 1), hours), 2)
  assert.equal(countSlipListingOverdueWorkingDays(due, new Date(2026, 10, 2, 23, 59), hours), 2)
  assert.equal(formatCaseManagementDueDate(due, new Date(2026, 10, 2, 23, 59), hours), "2d ago · 10/30")
})

test("keeps today's label and counts future due dates in working days", () => {
  const now = new Date(2026, 10, 3, 23, 59)
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 3), now), "Today · 11/03")
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 5), now), "2d · 11/05")
})

const ALL_WEEK_OPEN = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
  (day) => ({ day, is_open: true }),
)

test("future countdown skips the weekend with the Monday-Friday default", () => {
  const friday = new Date(2026, 10, 20, 9, 0)
  assert.equal(countSlipListingUpcomingWorkingDays(new Date(2026, 10, 23), friday), 1)
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 23), friday), "1d · 11/23")
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 24), friday), "2d · 11/24")
  assert.equal(countSlipListingUpcomingWorkingDays(new Date(2026, 10, 20), friday), 0)
  assert.equal(countSlipListingUpcomingWorkingDays(new Date(2026, 10, 19), friday), 0)
})

test("future countdown counts weekends for a Lab open all week", () => {
  const friday = new Date(2026, 10, 20, 9, 0)
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 22), friday, ALL_WEEK_OPEN), "2d · 11/22")
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 23), friday, ALL_WEEK_OPEN), "3d · 11/23")
})

test("Lab holidays are skipped in both directions", () => {
  const holidays = ["2026-11-26"]
  const friday = new Date(2026, 10, 20, 9, 0)
  const nextFriday = new Date(2026, 10, 27)
  assert.equal(formatCaseManagementDueDate(nextFriday, friday), "5d · 11/27")
  assert.equal(formatCaseManagementDueDate(nextFriday, friday, null, holidays), "4d · 11/27")
  assert.equal(formatCaseManagementDueDate(nextFriday, friday, ALL_WEEK_OPEN, holidays), "6d · 11/27")
  assert.equal(countSlipListingOverdueWorkingDays(friday, nextFriday, null, holidays), 4)
  assert.equal(formatCaseManagementDueDate(friday, nextFriday, null, holidays), "4d ago · 11/20")
  // A holiday on a closed day is not subtracted twice.
  assert.equal(formatCaseManagementDueDate(nextFriday, friday, null, ["2026-11-21"]), "5d · 11/27")
})

test("counts other weekdays and keeps API timestamps on their stated calendar date", () => {
  const wednesdayDueDate = new Date(2026, 9, 28)
  assert.equal(formatCaseManagementDueDate(wednesdayDueDate, new Date(2026, 10, 2)), "3d ago · 10/28")

  const dueWithTime = parseSlipListingDueDate("2026-10-30T23:30:00-08:00")
  assert.ok(dueWithTime)
  assert.equal(formatCaseManagementDueDate(dueWithTime, new Date(2026, 10, 3, 0, 1)), "2d ago · 10/30")
})
