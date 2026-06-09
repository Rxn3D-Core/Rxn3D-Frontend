import assert from "node:assert/strict"
import test from "node:test"
import { formatSlipListingPatientName } from "./slip-listing-patient-name.ts"

test("formatSlipListingPatientName — title-cases each word", () => {
  assert.equal(formatSlipListingPatientName("tes tes"), "Tes Tes")
  assert.equal(formatSlipListingPatientName("silvesttre krupesh gilbet"), "Silvesttre Krupesh Gilbet")
  assert.equal(formatSlipListingPatientName("test for krupesh"), "Test For Krupesh")
})

test("formatSlipListingPatientName — empty", () => {
  assert.equal(formatSlipListingPatientName(""), "")
  assert.equal(formatSlipListingPatientName("   "), "")
})
