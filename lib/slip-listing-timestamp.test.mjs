import assert from "node:assert/strict"
import test from "node:test"
import { formatSlipListingTimestamp } from "./slip-listing-timestamp.ts"

test("formatSlipListingTimestamp — passes through API timestamp", () => {
  assert.equal(
    formatSlipListingTimestamp("01/23/25 @ 1:23 pm"),
    "01/23/25 @ 1:23 pm",
  )
})

test("formatSlipListingTimestamp — formats ISO created_at", () => {
  const result = formatSlipListingTimestamp("2025-01-23T13:23:00.000Z")
  assert.match(result, /^01\/23\/25 @ /)
  assert.match(result, /pm$/)
})

test("formatSlipListingTimestamp — empty", () => {
  assert.equal(formatSlipListingTimestamp(""), "—")
})
