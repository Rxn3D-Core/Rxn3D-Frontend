// Run: node --import ./test-alias-loader.mjs --test lib/product-releasing-stages.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { applyReleasingStageFlagsToStages } from "./product-releasing-stages.ts"

test("unchecked releasing stages send No even when GET hydrated Yes", () => {
  const payload = applyReleasingStageFlagsToStages(
    [
      { stage_id: 1, is_releasing_stage: "Yes" },
      { stage_id: 2, is_releasing_stage: "Yes" },
      { stage_id: 3, is_releasing_stage: "Yes" },
    ],
    [],
  )
  assert.deepEqual(
    payload.map((row) => row.is_releasing_stage),
    ["No", "No", "No"],
  )
})

test("only checkbox-selected ids stay Yes, matching string vs number ids", () => {
  const payload = applyReleasingStageFlagsToStages(
    [
      { stage_id: 10, is_releasing_stage: "Yes" },
      { stage_id: "11", is_releasing_stage: "Yes" },
      { stage_id: 12, is_releasing_stage: "No" },
    ],
    ["10"],
  )
  assert.deepEqual(
    payload.map((row) => [row.stage_id, row.is_releasing_stage]),
    [
      [10, "Yes"],
      ["11", "No"],
      [12, "No"],
    ],
  )
})
