// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/rows.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { toSlipActivityRow } from "./rows.ts"

const event = {
  id: 90412,
  action_at: "2026-10-27T08:14:03-07:00",
  slip: { id: 5531, slip_number: "S-004812", case_id: 2207 },
  patient_name: "John Doe",
  office_name: "Smile Dental",
  from_status: { id: 3, name: "In lab" },
  to_status: { id: 4, name: "In lab ready to pickup" },
  actor: { id: 88, name: "Maria Lopez" },
}

test("maps a contract event to a table row with the slip detail link", () => {
  assert.deepEqual(toSlipActivityRow(event), {
    id: 90412,
    actionAt: "2026-10-27T08:14:03-07:00",
    slipNumber: "S-004812",
    slipHref: "/virtual-slip/2207/5531",
    patientName: "John Doe",
    officeName: "Smile Dental",
    fromStatus: "In lab",
    toStatus: "In lab ready to pickup",
    userName: "Maria Lopez",
  })
})

test("null actor gives a blank user", () => {
  assert.equal(toSlipActivityRow({ ...event, actor: null }).userName, "")
})

test("null or missing patient and office give blanks", () => {
  const row = toSlipActivityRow({ ...event, patient_name: null, office_name: undefined })
  assert.equal(row.patientName, "")
  assert.equal(row.officeName, "")
})

test("missing case id falls back to the legacy slip route", () => {
  assert.equal(toSlipActivityRow({ ...event, slip: { ...event.slip, case_id: null } }).slipHref, "/virtual-slip-v2/5531")
})
