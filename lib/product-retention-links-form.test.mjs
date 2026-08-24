// Run: node --import ./test-alias-loader.mjs --test lib/product-retention-links-form.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  hydrateRetentionOptionsFromProduct,
  remapRetentionOptionsToCatalog,
  serializeRetentionOptionsForApi,
} from "./product-retention-links-form.ts"

test("hydrate prefers library option id over lab_library_retention_options id", () => {
  const rows = hydrateRetentionOptionsFromProduct({
    retention_options: [
      {
        id: 41,
        name: "Implant",
        code: "IMP",
        lab_retention_option: { id: 9001, name: "Implant", code: "IMP" },
      },
    ],
  })
  assert.deepEqual(rows, [
    { retention_option_id: 41, sequence: 1, status: "Active", name: "Implant", code: "IMP" },
  ])
})

test("hydrate reads nested retention_option_id when the embedding has no top-level id", () => {
  const rows = hydrateRetentionOptionsFromProduct({
    retention_options: [{ retention_option_id: "12", name: "Prep" }],
  })
  assert.equal(rows[0]?.retention_option_id, 12)
})

test("remap swaps global ids onto lab catalog ids by global_relationship_id and name", () => {
  const remapped = remapRetentionOptionsToCatalog(
    [
      { retention_option_id: 7, sequence: 1, status: "Active", name: "Implant" },
      { retention_option_id: 8, sequence: 2, status: "Active", name: "Prep" },
    ],
    [
      { id: 41, name: "Implant", code: "IMP", global_relationship_id: 7 },
      { id: 42, name: "Prep", code: "PRP", global_relationship_id: 99 },
    ],
  )
  assert.deepEqual(
    remapped.map((row) => row.retention_option_id),
    [41, 42],
  )
})

test("serialize remaps through catalog so stage-tab save keeps selected options", () => {
  const payload = serializeRetentionOptionsForApi(
    [{ retention_option_id: 7, sequence: 1, status: "Active", name: "Implant" }],
    [{ id: 41, name: "Implant", global_relationship_id: 7 }],
  )
  assert.deepEqual(payload, [{ retention_option_id: 41, sequence: 1, status: "Active" }])
})
