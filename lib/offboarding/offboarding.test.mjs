import test from "node:test"
import assert from "node:assert/strict"
import {
  buildOffboardPayload,
  findUncoveredCaseIds,
  blockerMessageKey,
  blockedBy,
  mapValidationErrors,
  isMembershipInactive,
  membershipInactiveDestination,
} from "./offboarding.ts"

const cases = [{ case_id: 1 }, { case_id: 2 }, { case_id: 3 }]

test("one doctor for all sends only the default", () => {
  assert.deepEqual(buildOffboardPayload({ cases, defaultTargetId: 9, caseTargets: {}, reason: "" }), {
    default_target_doctor_id: 9,
  })
})

test("per-case override that differs from the default goes into transfers", () => {
  const p = buildOffboardPayload({ cases, defaultTargetId: 9, caseTargets: { 2: 7, 3: 9 }, reason: "  left  " })
  assert.deepEqual(p, { default_target_doctor_id: 9, transfers: [{ case_id: 2, target_doctor_id: 7 }], reason: "left" })
})

test("no default: every case sent explicitly", () => {
  const p = buildOffboardPayload({ cases, defaultTargetId: null, caseTargets: { 1: 5, 2: 5, 3: 6 }, reason: "" })
  assert.equal(p.default_target_doctor_id, undefined)
  assert.equal(p.transfers?.length, 3)
})

test("no open cases sends an empty body, or only the reason", () => {
  assert.deepEqual(buildOffboardPayload({ cases: [], defaultTargetId: null, caseTargets: {}, reason: "" }), {})
  assert.deepEqual(buildOffboardPayload({ cases: [], defaultTargetId: 4, caseTargets: {}, reason: "x" }), { reason: "x" })
})

test("findUncoveredCaseIds", () => {
  assert.deepEqual(findUncoveredCaseIds(cases, null, { 1: 5 }), [2, 3])
  assert.deepEqual(findUncoveredCaseIds(cases, 9, {}), [])
  assert.deepEqual(findUncoveredCaseIds(cases, 9, { 2: null }), [])
})

test("blockerMessageKey", () => {
  assert.equal(blockerMessageKey("last_admin"), "offboarding.blockers.last_admin")
  assert.equal(blockerMessageKey("no_eligible_target"), "offboarding.blockers.no_eligible_target")
  assert.equal(blockerMessageKey("weird"), "offboarding.errors.generic")
})

test("blockedBy adds no_eligible_target when transfer needed and no doctors (no admin fallback)", () => {
  const base = { blockers: [], requires_transfer: true, eligible_targets: [] }
  assert.deepEqual(blockedBy(base), ["no_eligible_target"])
  assert.deepEqual(blockedBy({ ...base, blockers: ["no_eligible_target"] }), ["no_eligible_target"])
  assert.deepEqual(blockedBy({ ...base, requires_transfer: false }), [])
})

test("mapValidationErrors maps indexes back to case ids", () => {
  const sent = [{ case_id: 22, target_doctor_id: 1 }, { case_id: 33, target_doctor_id: 2 }]
  const out = mapValidationErrors(
    { "transfers.1.target_doctor_id": ["Choose an active doctor in this office."], default_target_doctor_id: ["Pick"] },
    sent,
  )
  assert.deepEqual(out, { default: "Pick", byCase: { 33: "Choose an active doctor in this office." } })
})

test("isMembershipInactive", () => {
  assert.equal(isMembershipInactive(403, { error: "membership_inactive" }), true)
  assert.equal(isMembershipInactive(403, { error: "forbidden" }), false)
  assert.equal(isMembershipInactive(409, { error: "membership_inactive" }), false)
  assert.equal(isMembershipInactive(403, null), false)
})

test("membershipInactiveDestination", () => {
  assert.equal(membershipInactiveDestination(5, [5, 6]), "/multiple-location")
  assert.equal(membershipInactiveDestination(5, [5]), "/login")
  assert.equal(membershipInactiveDestination(null, []), "/login")
})
