// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/rows.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { toSlipActivityRow } from "./rows.ts"

const event = {
  id: 90412,
  action_at: "2026-10-27T08:14:03-07:00",
  slip_created_at: "2026-10-26T15:04:05-07:00",
  slip: { id: 5531, slip_number: "S-004812", case_id: 2207 },
  patient_name: "John Doe",
  office: { id: 41, name: "Smile Dental", code: "SMD" },
  from_status: { id: 3, name: "In lab" },
  to_status: { id: 4, name: "In lab ready to pickup" },
  actor: { id: 88, name: "Maria Lopez" },
  digital_impressions: ["iTero scan", "3Shape Trios"],
  digital_impression_codes: ["ITERO", "3SHP"],
  has_digital_impression: true,
}

test("maps a contract event to a table row with the slip detail link", () => {
  assert.deepEqual(toSlipActivityRow(event), {
    id: 90412,
    actionAt: "2026-10-27T08:14:03-07:00",
    slipCreatedAt: "2026-10-26T15:04:05-07:00",
    slipNumber: "S-004812",
    slipHref: "/virtual-slip/2207/5531",
    patientName: "John Doe",
    officeName: "Smile Dental",
    officeCode: "SMD",
    fromStatus: "In lab",
    toStatus: "In lab ready to pickup",
    userName: "Maria Lopez",
    digitalImpressions: "iTero scan, 3Shape Trios",
    digitalImpressionTags: ["ITERO", "3SHP"],
    digitalImpressionNames: ["iTero scan", "3Shape Trios"],
  })
})

test("null actor gives a blank user", () => {
  assert.equal(toSlipActivityRow({ ...event, actor: null }).userName, "")
})

test("null office and missing patient give blanks", () => {
  const row = toSlipActivityRow({ ...event, patient_name: null, office: null })
  assert.equal(row.patientName, "")
  assert.equal(row.officeName, "")
})

test("missing case id falls back to the legacy slip route", () => {
  assert.equal(toSlipActivityRow({ ...event, slip: { ...event.slip, case_id: null } }).slipHref, "/virtual-slip-v2/5531")
})

test("no digital impressions gives a blank cell", () => {
  assert.equal(toSlipActivityRow({ ...event, digital_impressions: [], has_digital_impression: false }).digitalImpressions, "")
})

test("missing digital_impressions (older backend) gives a blank cell", () => {
  const { digital_impressions, has_digital_impression, ...older } = event
  assert.equal(toSlipActivityRow(older).digitalImpressions, "")
})

test("missing slip_created_at (older backend) gives a blank", () => {
  const { slip_created_at, ...older } = event
  assert.equal(toSlipActivityRow(older).slipCreatedAt, "")
})

test("tags fall back to the impression names when the backend sends no codes", () => {
  const { digital_impression_codes, ...older } = event
  assert.deepEqual(toSlipActivityRow(older).digitalImpressionTags, ["iTero scan", "3Shape Trios"])
})
