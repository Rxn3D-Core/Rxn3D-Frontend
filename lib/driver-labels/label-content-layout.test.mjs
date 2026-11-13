// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-content-layout.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { planStickerLayout, FRAME_H_PX, TEXT_H_PX } from "./label-content-layout.ts"
import { defaultDriverLabelPrintSettings } from "./label-print-settings.ts"

const off = (...keys) => {
  const s = defaultDriverLabelPrintSettings()
  for (const k of keys) s[k] = false
  return s
}
const ALL_OPTIONAL = ["showDoctor", "showStage", "showPan", "showProduct", "showStatus", "showCaseNumber", "showSlipNumber", "showQrCode", "showPickup", "showDelivery"]
const keysOf = (l) => [...l.mid, ...(l.footer ? [l.footer] : [])].flatMap((r) => r.cells.map((c) => c.key))

function assertTidy(l) {
  const rows = [...l.mid, ...(l.footer ? [l.footer] : [])]
  let prevBottom = 96
  for (const r of rows) {
    assert.ok(r.top >= prevBottom - 0.01, "rows do not overlap")
    assert.ok(r.top + TEXT_H_PX <= FRAME_H_PX, "row inside the label")
    prevBottom = r.top + TEXT_H_PX
    for (const c of r.cells) assert.ok(c.left + c.maxW <= 480 - 14 + 0.01, "cell inside the width")
    if (r.cells.length === 2) assert.ok(r.cells[0].left + r.cells[0].maxW <= r.cells[1].left, "cells do not overlap")
  }
}

test("everything on reproduces the original Figma layout", () => {
  const l = planStickerLayout(defaultDriverLabelPrintSettings())
  assert.deepEqual(l.rules, [96, 192])
  assert.deepEqual(l.mid.map((r) => r.top), [106, 125.5, 145, 164.5])
  assert.equal(l.footer.top, 202)
  assert.deepEqual(keysOf(l), ["case", "slip", "stage", "pan", "prod", "status", "pickup", "deliver"])
  assert.equal(l.headerDy, 0)
  assert.equal(l.showQr, true)
})

test("each of the five new switches removes only its own field", () => {
  const cases = [["showCaseNumber", "case"], ["showSlipNumber", "slip"], ["showPickup", "pickup"], ["showDelivery", "deliver"]]
  for (const [setting, key] of cases) {
    const l = planStickerLayout(off(setting))
    const keys = keysOf(l)
    assert.equal(keys.includes(key), false, setting)
    assert.equal(keys.length, 7, setting)
    assertTidy(l)
  }
})

test("a single remaining field in a pair row takes the full width from the left", () => {
  const l = planStickerLayout(off("showCaseNumber"))
  assert.deepEqual(l.mid[0].cells, [{ key: "slip", left: 14, maxW: 452 }])
  const f = planStickerLayout(off("showPickup")).footer
  assert.deepEqual(f.cells, [{ key: "deliver", left: 14, maxW: 452 }])
})

test("QR code off frees the header width", () => {
  assert.equal(planStickerLayout(off("showQrCode")).showQr, false)
})

test("no gap: rows are centred between the rules and stay inside the label", () => {
  for (let mask = 0; mask < 1 << ALL_OPTIONAL.length; mask++) {
    const s = defaultDriverLabelPrintSettings()
    ALL_OPTIONAL.forEach((k, i) => { if (mask & (1 << i)) s[k] = false })
    assertTidy(planStickerLayout(s))
  }
})

test("all optional fields off: header only, no dividers, header centred", () => {
  const l = planStickerLayout(off(...ALL_OPTIONAL))
  assert.deepEqual(keysOf(l), [])
  assert.deepEqual(l.rules, [])
  assert.equal(l.headerDy, 72)
  assert.equal(l.footer, null)
})

test("footer only: one rule, footer centred below the header", () => {
  const l = planStickerLayout(off("showCaseNumber", "showSlipNumber", "showStage", "showPan", "showProduct", "showStatus"))
  assert.deepEqual(l.rules, [96])
  assert.ok(l.footer.top > 96 && l.footer.top < 202)
})

test("dividers off removes every rule", () => {
  assert.deepEqual(planStickerLayout(off("showDividers")).rules, [])
})
