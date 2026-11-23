import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V3FilterBar.tsx and V3CaseWidget.tsx are JSX, which node:test cannot import,
// so these checks read the source until Vitest exists (RXN-110).
const filterBar = readFileSync(new URL("./V3FilterBar.tsx", import.meta.url), "utf8")
const widget = readFileSync(new URL("./V3CaseWidget.tsx", import.meta.url), "utf8")

test("office listing defaults add the Lab (office) column", () => {
  assert.match(
    filterBar,
    /const DEFAULT_VISIBLE_OFFICE = new Set<ColumnKey>\(\[\.\.\.DEFAULT_VISIBLE, "office"\]\)/,
  )
})

test("Lab (office) column stays toggleable in the picker", () => {
  assert.match(filterBar, /\{ key: "office",\s+label: "Office",\s+default: false \}/)
})

test("lab listing defaults do not include the office column", () => {
  const block = filterBar.match(/const DEFAULT_VISIBLE = new Set<ColumnKey>\(\[([\s\S]*?)\]\)/)
  assert.ok(block, "DEFAULT_VISIBLE not found")
  assert.doesNotMatch(block[1], /"office"/)
})

test("office column load runs the one-time Lab migration first", () => {
  const prefs = readFileSync(new URL("../../../lib/slip-listing-preferences.ts", import.meta.url), "utf8")
  assert.match(
    prefs,
    /loadSlipListingVisibleColumns\(profile: SlipListingProfile\)[^{]*\{\s*if \(profile === "office"[^)]*\) \{\s*try \{\s*migrateOfficeLabColumn\(localStorage\)/,
  )
})

test("widget uses office defaults only when nothing is saved", () => {
  assert.match(
    widget,
    /loadSlipListingVisibleColumns\(props\.listingProfile\) \?\?\s*\(props\.listingProfile === "office" \? DEFAULT_VISIBLE_OFFICE : DEFAULT_VISIBLE\)/,
  )
})
