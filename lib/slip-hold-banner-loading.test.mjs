import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isSlipBannerDetailLoading } from "./slip-hold-info.ts"

const complete = {
  authorName: "Jane Lab",
  heldAt: "2026-10-30T15:25:00Z",
  reason: "Waiting for impression",
}

test("banner loads while notes are pending and no detail is resolved yet", () => {
  assert.equal(isSlipBannerDetailLoading(true, null), true)
})

test("banner loads while notes are pending and the detail is incomplete", () => {
  assert.equal(
    isSlipBannerDetailLoading(true, { ...complete, authorName: "Unknown" }),
    true
  )
  assert.equal(isSlipBannerDetailLoading(true, { ...complete, reason: " " }), true)
  assert.equal(isSlipBannerDetailLoading(true, { ...complete, heldAt: "" }), true)
})

test("banner renders a complete detail even while notes are pending", () => {
  assert.equal(isSlipBannerDetailLoading(true, complete), false)
})

test("banner keeps today's fallbacks once loading has finished", () => {
  assert.equal(isSlipBannerDetailLoading(false, null), false)
  assert.equal(
    isSlipBannerDetailLoading(false, { authorName: "Unknown", heldAt: "", reason: "" }),
    false
  )
})

test("VirtualSlipHoldBanner swaps the text for a skeleton when loading", () => {
  const source = readFileSync(
    new URL("../components/virtual-slip/VirtualSlipHoldBanner.tsx", import.meta.url),
    "utf8"
  )
  assert.match(source, /loading\s*\?\s*\(/)
  assert.match(source, /data-testid="virtual-slip-banner-loading"/)
  assert.match(source, /<Skeleton\b/)
})
