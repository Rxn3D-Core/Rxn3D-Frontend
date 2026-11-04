// Run: node --import ./test-alias-loader.mjs --test hooks/use-connected-offices.test.mjs
// RXN-41: includeOnHold reaches the URL and the query key; the default (slip-create pickers) is unchanged.
import assert from "node:assert/strict"
import test from "node:test"
import {
  buildConnectedListUrl,
  connectedOfficesOrLabsQueryKey,
  connectedOfficesOrLabsQueryKeyFor,
  connectedOfficesQueryKey,
  connectedOfficesQueryKeyFor,
} from "../hooks/use-connected-offices.ts"

const BASE = "http://127.0.0.1:8141"

test("default keys stay the original keys", () => {
  assert.deepEqual(connectedOfficesQueryKeyFor(), connectedOfficesQueryKey)
  assert.deepEqual(connectedOfficesQueryKeyFor(false), ["connected-offices"])
  assert.deepEqual(connectedOfficesOrLabsQueryKeyFor("office_admin"), connectedOfficesOrLabsQueryKey("office_admin"))
})

test("includeOnHold keys are distinct but share the invalidation prefix", () => {
  const key = connectedOfficesQueryKeyFor(true)
  assert.notDeepEqual(key, connectedOfficesQueryKey)
  assert.equal(key[0], "connected-offices")
  const roleKey = connectedOfficesOrLabsQueryKeyFor("office_admin", true)
  assert.deepEqual(roleKey.slice(0, 2), ["connected-offices-or-labs", "office_admin"])
  assert.deepEqual(roleKey[2], { includeOnHold: true })
})

test("URL adds include_on_hold=1 only when asked", () => {
  assert.equal(buildConnectedListUrl("/v1/slip/connected-offices", BASE), `${BASE}/v1/slip/connected-offices`)
  assert.equal(
    buildConnectedListUrl("/v1/slip/connected-labs", BASE, true),
    `${BASE}/v1/slip/connected-labs?include_on_hold=1`,
  )
})
