import assert from "node:assert/strict"
import test from "node:test"
import {
  countSlipListingOverdueWorkingDays,
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

test("keeps today's and future due dates as calendar-day labels", () => {
  const now = new Date(2026, 10, 3, 23, 59)
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 3), now), "Today · 11/03")
  assert.equal(formatCaseManagementDueDate(new Date(2026, 10, 5), now), "2d · 11/05")
})

test("counts other weekdays and keeps API timestamps on their stated calendar date", () => {
  const wednesdayDueDate = new Date(2026, 9, 28)
  assert.equal(formatCaseManagementDueDate(wednesdayDueDate, new Date(2026, 10, 2)), "3d ago · 10/28")

  const dueWithTime = parseSlipListingDueDate("2026-10-30T23:30:00-08:00")
  assert.ok(dueWithTime)
  assert.equal(formatCaseManagementDueDate(dueWithTime, new Date(2026, 10, 3, 0, 1)), "2d ago · 10/30")
})
