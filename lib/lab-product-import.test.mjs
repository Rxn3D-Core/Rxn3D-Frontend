import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  IMPORT_BATCH_SIZE,
  MAX_IMPORT_PRODUCTS,
  buildCatalogQuery,
  canImportProducts,
  importProgressPercent,
  readImportError,
  runImportInBatches,
  setSelected,
} from "./lab-product-import.ts"

test("only a lab admin with create_product can import", () => {
  const base = { activeRole: "lab_admin", isSuperadminUser: false, canCreateProduct: true }
  assert.equal(canImportProducts(base), true)
  assert.equal(canImportProducts({ ...base, activeRole: "lab_user" }), false)
  assert.equal(canImportProducts({ ...base, activeRole: null }), false)
  assert.equal(canImportProducts({ ...base, isSuperadminUser: true }), false)
  assert.equal(canImportProducts({ ...base, canCreateProduct: false }), false)
})

test("catalog query sends the lab id and drops empty filters", () => {
  assert.equal(
    buildCatalogQuery(5, { q: "  ", category_id: null, import_state: "all" }),
    "customer_id=5",
  )
  assert.equal(
    buildCatalogQuery(5, { q: " crown ", category_id: 1, subcategory_id: 4, import_state: "imported" }, { page: 2 }),
    "customer_id=5&q=crown&category_id=1&subcategory_id=4&import_state=imported&page=2",
  )
})

test("selection adds, removes and stops at the API limit", () => {
  const start = new Set([1, 2])
  assert.deepEqual([...setSelected(start, [2, 3], true)], [1, 2, 3])
  assert.deepEqual([...setSelected(start, [1], false)], [2])
  assert.deepEqual([...start], [1, 2])
  const many = Array.from({ length: MAX_IMPORT_PRODUCTS + 20 }, (_, i) => i + 1)
  assert.equal(setSelected(new Set(), many, true).size, MAX_IMPORT_PRODUCTS)
})

test("a selection is imported batch by batch with only its own confirmations", async () => {
  const ids = Array.from({ length: IMPORT_BATCH_SIZE + 2 }, (_, i) => i + 1)
  const sent = []
  const progress = []
  const { run, error } = await runImportInBatches({
    ids,
    confirmIds: [1, 7],
    send: async (batch, confirmed) => {
      sent.push([batch, confirmed])
      return { items: batch.map((id) => ({ global_product_id: id, status: id === 2 ? "failed" : "imported" })) }
    },
    onProgress: (state) => progress.push([state.status, state.items.length]),
  })
  assert.deepEqual(sent, [[[1, 2, 3, 4, 5], [1]], [[6, 7], [7]]])
  assert.deepEqual(progress, [["processing", 0], ["processing", 5], ["processing", 7], ["completed", 7]])
  assert.deepEqual([run.imported_count, run.failed_count, error], [6, 1, null])
})

test("a failed request stops the run and keeps what was imported", async () => {
  let calls = 0
  const { run, error } = await runImportInBatches({
    ids: Array.from({ length: IMPORT_BATCH_SIZE * 3 }, (_, i) => i + 1),
    confirmIds: [],
    send: async (batch) => {
      if (++calls === 2) throw new Error("timeout")
      return { items: batch.map((id) => ({ global_product_id: id, status: "imported" })) }
    },
    onProgress: () => {},
  })
  assert.equal(calls, 2)
  assert.equal(run.status, "failed")
  assert.equal(run.imported_count, IMPORT_BATCH_SIZE)
  assert.equal(error.message, "timeout")
})

test("progress is the share of finished products", () => {
  assert.equal(importProgressPercent({ total: 0, items: [] }), 0)
  assert.equal(importProgressPercent({ total: 3, items: [{}] }), 33)
  assert.equal(importProgressPercent({ total: 2, items: [{}, {}] }), 100)
})

test("API error code is read from the response body", () => {
  const error = Object.assign(new Error("x"), { status: 403, body: { error: "plan_scope_half" } })
  assert.equal(readImportError(error).code, "plan_scope_half")
  assert.equal(readImportError(new Error("Network error")).code, undefined)
  assert.equal(readImportError(null).code, undefined)
})

test("en and es have the same import strings, and every used key exists", () => {
  const load = (lang) =>
    JSON.parse(readFileSync(new URL(`../public/locales/${lang}/translation.json`, import.meta.url))).productImport
  const keys = (object, prefix = "") =>
    Object.entries(object).flatMap(([key, value]) =>
      typeof value === "string" ? [prefix + key] : keys(value, `${prefix}${key}.`),
    )
  const en = keys(load("en"))
  assert.deepEqual(keys(load("es")), en)
  for (const file of ["button", "dialog"].map((n) => `import-products-${n}`).concat("import-catalog-step", "import-run-step", "import-product-detail-step")) {
    const source = readFileSync(
      new URL(`../components/product-management/import-products/${file}.tsx`, import.meta.url),
      "utf8",
    )
    for (const [, key] of source.matchAll(/t\("productImport\.([\w.]+)"/g)) assert.ok(en.includes(key), `${file}: ${key}`)
  }
})
