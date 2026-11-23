import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { listingLabLogoUrl } from "./listing-lab-logo.mjs"

test("listingLabLogoUrl returns the trimmed lab logo URL", () => {
  assert.equal(listingLabLogoUrl({ logo_url: " https://cdn.example/hmc.png " }), "https://cdn.example/hmc.png")
})

test("listingLabLogoUrl returns undefined when the lab has no logo", () => {
  assert.equal(listingLabLogoUrl({ logo_url: null }), undefined)
  assert.equal(listingLabLogoUrl({ logo_url: "   " }), undefined)
  assert.equal(listingLabLogoUrl({}), undefined)
  assert.equal(listingLabLogoUrl(null), undefined)
  assert.equal(listingLabLogoUrl(undefined), undefined)
})

test("office listing passes the lab logo through to the Lab column", () => {
  const context = readFileSync(new URL("../../contexts/office-slip-context.tsx", import.meta.url), "utf8")
  assert.match(context, /labLogoUrl: listingLabLogoUrl\(apiCase\.lab\)/)
  const page = readFileSync(new URL("../office-case-management/page.tsx", import.meta.url), "utf8")
  assert.match(page, /labLogoUrl: slip\.labLogoUrl/)
  const table = readFileSync(new URL("./components/V3CaseTable.tsx", import.meta.url), "utf8")
  assert.match(table, /row\.labLogoUrl/)
})
