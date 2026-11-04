// Run: node --import ./test-alias-loader.mjs --test lib/connection-on-hold-error.test.mjs
// RXN-41: slip-create 409 connection_on_hold must not be treated as the 402 plan-limit error.
import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import {
  isConnectionOnHoldError,
  isSlipLimitExceededError,
  SlipCreationApiError,
} from "../lib/slip-creation-guardrails.ts"

const body = JSON.parse(
  readFileSync(new URL("../e2e/fixtures/rxn-37/slip-create.409-connection-on-hold.json", import.meta.url), "utf8"),
)

// Same construction as services/slip-creation-service.ts on a non-OK response.
const fromResponse = (status, json) =>
  new SlipCreationApiError(json.message || json.error || "Failed", { status, code: json.code, errors: json.errors })

test("409 connection_on_hold from the contract fixture", () => {
  const error = fromResponse(409, body)
  assert.equal(isConnectionOnHoldError(error), true)
  assert.equal(isSlipLimitExceededError(error), false)
  assert.equal(error.message, body.message)
})

test("402 plan limit is not an on-hold error", () => {
  const error = fromResponse(402, { message: "Slip creation limit reached", code: "slip_limit_exceeded" })
  assert.equal(isConnectionOnHoldError(error), false)
  assert.equal(isSlipLimitExceededError(error), true)
})

const NOT_ON_HOLD = [
  ["null", null],
  ["undefined", undefined],
  ["string", "connection_on_hold"],
  ["plain Error", new Error("connection_on_hold")],
  ["409 other code", { status: 409, code: "conflict" }],
  ["422 validation", { status: 422, code: undefined }],
  ["wrong status with the code", { status: 500, code: "connection_on_hold" }],
  ["invitation-style object without status but other code", { code: "connection_already_on_hold" }],
]

for (const [label, value] of NOT_ON_HOLD) {
  test(`not an on-hold error: ${label}`, () => {
    assert.equal(isConnectionOnHoldError(value), false)
  })
}

test("code match is case-insensitive and status may be missing", () => {
  assert.equal(isConnectionOnHoldError({ code: "CONNECTION_ON_HOLD" }), true)
  assert.equal(isConnectionOnHoldError({ status: 409, code: "connection_on_hold" }), true)
})
