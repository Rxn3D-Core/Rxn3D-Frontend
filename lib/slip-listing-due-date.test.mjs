import assert from "node:assert/strict"
import test from "node:test"
import { formatSlipListingDueDate } from "./slip-listing-due-date.ts"

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
