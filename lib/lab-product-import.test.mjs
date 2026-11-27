import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  MAX_IMPORT_PRODUCTS,
  buildCatalogQuery,
  canImportProducts,
  importProgressPercent,
  isImportActive,
  readImportError,
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

test("polling continues only while the import is queued or processing", () => {
  assert.equal(isImportActive({ status: "queued" }), true)
  assert.equal(isImportActive({ status: "processing" }), true)
  assert.equal(isImportActive({ status: "completed" }), false)
  assert.equal(isImportActive({ status: "failed" }), false)
  assert.equal(isImportActive(null), false)
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
  for (const file of ["button", "dialog"].map((n) => `import-products-${n}`).concat("import-catalog-step", "import-run-step")) {
    const source = readFileSync(
      new URL(`../components/product-management/import-products/${file}.tsx`, import.meta.url),
      "utf8",
    )
    for (const [, key] of source.matchAll(/t\("productImport\.([\w.]+)"/g)) assert.ok(en.includes(key), `${file}: ${key}`)
  }
})
