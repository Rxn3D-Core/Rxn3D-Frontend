// Run: node --import ./test-alias-loader.mjs --test lib/connection-hold-state.test.mjs
// RXN-41: getHoldState matrix (3 states x 2 viewer sides, legacy fallback, throttle) against the RXN-37 fixtures.
import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { getHoldBadgeKey, getHoldState } from "../lib/connection-utils.ts"

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../e2e/fixtures/rxn-37/${name}`, import.meta.url), "utf8"))

const labView = fixture("connections-list.lab-view.json").data
const officeView = fixture("connections-list.office-view.json").data
const legacy = fixture("connections-list.legacy-no-hold.json").data
const byId = (list, id) => list.find((c) => c.id === id)

// Before the throttle in the office-view fixture ends (2026-11-04T12:00:00Z).
const NOW = Date.parse("2026-11-03T13:00:00Z")

const CASES = [
  // [label, connection, expected subset, badge key]
  ["lab viewer, Active", byId(labView, 12),
    { onHold: false, isMine: false, canHold: true, canResume: false, canRequestResume: false }, "badgeConnected"],
  ["lab viewer, held by me", byId(labView, 13),
    { onHold: true, isMine: true, heldBySide: "lab", canHold: false, canResume: true, canRequestResume: false }, "badgeOnHoldByYou"],
  ["lab viewer, held by office", byId(labView, 14),
    { onHold: true, isMine: false, heldBySide: "office", canHold: false, canResume: false, canRequestResume: true, requestPending: false }, "badgeOnHoldByOffice"],
  ["office viewer, Active", byId(officeView, 12),
    { onHold: false, canHold: true, canResume: false, canRequestResume: false }, "badgeConnected"],
  ["office viewer, held by lab", byId(officeView, 15),
    { onHold: true, isMine: false, heldBySide: "lab", canHold: false, canResume: false, canRequestResume: true }, "badgeOnHoldByLab"],
  ["office viewer, held by me", byId(officeView, 16),
    { onHold: true, isMine: true, heldBySide: "office", canResume: true, canRequestResume: false }, "badgeOnHoldByYou"],
  ["office viewer, held by lab, already requested", byId(officeView, 17),
    { onHold: true, isMine: false, canResume: false, canRequestResume: false, requestPending: true,
      requestedAt: "2026-11-03T12:00:00Z", requestAvailableAt: "2026-11-04T12:00:00Z" }, "badgeOnHoldByLab"],
]

for (const [label, connection, expected, badge] of CASES) {
  test(`getHoldState: ${label}`, () => {
    assert.ok(connection, "fixture row exists")
    const state = getHoldState(connection, NOW)
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(state[key], value, `${key}`)
    }
    assert.equal(getHoldBadgeKey(state), badge)
  })
}

test("the non-holder never gets Hold or Resume on a held connection", () => {
  for (const connection of [byId(labView, 14), byId(officeView, 15), byId(officeView, 17)]) {
    const state = getHoldState(connection, NOW)
    assert.equal(state.canHold, false)
    assert.equal(state.canResume, false)
  }
})

test("throttle: Request to Resume comes back once request_resume_available_at has passed", () => {
  const later = Date.parse("2026-11-04T12:00:01Z")
  const state = getHoldState(byId(officeView, 17), later)
  assert.equal(state.requestPending, false)
  assert.equal(state.requestAvailableAt, null)
  // can_request_resume is false in this row (server computed it while throttled), so nothing to send until refetch.
  assert.equal(state.canRequestResume, false)
})

test("throttle: server says can_request_resume but the time is still in the future -> pending, not sendable", () => {
  const connection = structuredClone(byId(officeView, 15))
  connection.hold.request_resume_available_at = "2026-11-04T12:00:00Z"
  const state = getHoldState(connection, NOW)
  assert.equal(state.requestPending, true)
  assert.equal(state.canRequestResume, false)
})

test("Active connection without permission shows no Hold", () => {
  const connection = structuredClone(byId(labView, 12))
  connection.hold.can_hold = false
  assert.equal(getHoldState(connection, NOW).canHold, false)
})

test("legacy backend without `hold` falls back to status", () => {
  const active = getHoldState(byId(legacy, 12), NOW)
  assert.deepEqual(
    { onHold: active.onHold, canHold: active.canHold, canResume: active.canResume, canRequestResume: active.canRequestResume },
    { onHold: false, canHold: true, canResume: false, canRequestResume: false },
  )
  assert.equal(getHoldBadgeKey(active), "badgeConnected")

  const held = getHoldState(byId(legacy, 15), NOW)
  assert.deepEqual(
    { onHold: held.onHold, isMine: held.isMine, heldBySide: held.heldBySide, canHold: held.canHold, canResume: held.canResume },
    { onHold: true, isMine: false, heldBySide: null, canHold: false, canResume: true },
  )
  assert.equal(getHoldBadgeKey(held), "badgeOnHold")
})

test("legacy fallback accepts status spellings and a null hold", () => {
  for (const status of ["OnHold", "on_hold", "On Hold", "on-hold"]) {
    assert.equal(getHoldState({ status, hold: null }, NOW).onHold, true, status)
  }
  assert.equal(getHoldState({ status: "Active" }, NOW).onHold, false)
})
