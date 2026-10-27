// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/sort.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { nextSlipActivitySort, SLIP_ACTIVITY_DEFAULT_SORT, slipActivityAriaSort } from "./sort.ts"

test("default sort is date/time newest first", () => {
  assert.deepEqual(SLIP_ACTIVITY_DEFAULT_SORT, { sort: "action_at", direction: "desc" })
})

test("a new column starts ascending, except date/time which starts descending", () => {
  const cases = [
    [{ sort: "action_at", direction: "desc" }, "slip_number", { sort: "slip_number", direction: "asc" }],
    [{ sort: "action_at", direction: "asc" }, "patient_name", { sort: "patient_name", direction: "asc" }],
    [{ sort: "patient_name", direction: "desc" }, "office_name", { sort: "office_name", direction: "asc" }],
    [{ sort: "office_name", direction: "asc" }, "status", { sort: "status", direction: "asc" }],
    [{ sort: "status", direction: "asc" }, "user_name", { sort: "user_name", direction: "asc" }],
    [{ sort: "user_name", direction: "asc" }, "action_at", { sort: "action_at", direction: "desc" }],
  ]
  for (const [current, column, expected] of cases) {
    assert.deepEqual(nextSlipActivitySort(current, column), expected, `${current.sort} -> ${column}`)
  }
})

test("the same column toggles between ascending and descending", () => {
  let state = SLIP_ACTIVITY_DEFAULT_SORT
  state = nextSlipActivitySort(state, "action_at")
  assert.deepEqual(state, { sort: "action_at", direction: "asc" })
  state = nextSlipActivitySort(state, "action_at")
  assert.deepEqual(state, { sort: "action_at", direction: "desc" })

  state = nextSlipActivitySort(state, "status")
  assert.deepEqual(state, { sort: "status", direction: "asc" })
  state = nextSlipActivitySort(state, "status")
  assert.deepEqual(state, { sort: "status", direction: "desc" })
  state = nextSlipActivitySort(state, "status")
  assert.deepEqual(state, { sort: "status", direction: "asc" })
})

test("nextSlipActivitySort does not mutate the current state", () => {
  const current = { sort: "slip_number", direction: "asc" }
  nextSlipActivitySort(current, "slip_number")
  assert.deepEqual(current, { sort: "slip_number", direction: "asc" })
})

test("aria-sort reflects only the active column", () => {
  const state = { sort: "office_name", direction: "asc" }
  assert.equal(slipActivityAriaSort(state, "office_name"), "ascending")
  assert.equal(slipActivityAriaSort({ ...state, direction: "desc" }, "office_name"), "descending")
  for (const column of ["action_at", "slip_number", "patient_name", "status", "user_name"]) {
    assert.equal(slipActivityAriaSort(state, column), "none", column)
  }
})
