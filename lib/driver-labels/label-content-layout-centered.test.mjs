// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-content-layout-centered.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { fitLogoInBox, planCenteredLayout } from "./label-content-layout-centered.ts"
import { DEFAULT_DRIVER_LABEL_PRINT_SETTINGS } from "./label-print-settings.ts"
import { ROLL_SIZES, SHEET_TEMPLATES } from "./label-layout.ts"

const ALL = { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS }
const EPS = 1e-9
const keys = (plan) => plan.cells.map((c) => c.key)
const cell = (plan, key) => plan.cells.find((c) => c.key === key)
const px = (v, w) => (v / w) * 4 * 120 // inches along the width back to artboard px

const SIZES = [
  ...SHEET_TEMPLATES.map((t) => [t.widthIn, t.heightIn]),
  ...ROLL_SIZES.map((r) => [r.widthIn, r.heightIn]),
  [2, 1], [5, 3], [3.1, 4.4], // custom sizes
]

function overlaps(a, b) {
  return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
}
function inside(box, w, h) {
  return box.x >= -EPS && box.y >= -EPS && box.x + box.w <= w + EPS && box.y + box.h <= h + EPS
}

test("all fields on: stage and pan on one line, then Ofc/Dr/Pt, Case/Slip, Pku/Del", () => {
  const p = planCenteredLayout(ALL, 4, 2)
  assert.deepEqual(keys(p).sort(), ["case", "deliver", "dr", "ofc", "pan", "pickup", "pt", "prod", "slip", "stage", "status"].sort())
  assert.equal(cell(p, "stage").y, cell(p, "pan").y)
  assert.ok(cell(p, "pan").x > cell(p, "stage").x)
  assert.ok(cell(p, "ofc").y < cell(p, "dr").y && cell(p, "dr").y < cell(p, "pt").y)
  assert.equal(cell(p, "case").y, cell(p, "ofc").y)
  assert.equal(cell(p, "slip").y, cell(p, "dr").y)
  assert.ok(cell(p, "case").x > cell(p, "ofc").x)
  assert.equal(cell(p, "pickup").y, cell(p, "deliver").y)
  assert.ok(cell(p, "pickup").y > cell(p, "prod").y)
  assert.ok(p.qr && p.rule)
})

test("Product and Status print as one extra row only when their switches are on", () => {
  const off = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false }, 4, 2)
  assert.equal(cell(off, "prod"), undefined)
  assert.equal(cell(off, "status"), undefined)
  const on = planCenteredLayout(ALL, 4, 2)
  assert.equal(cell(on, "prod").y, cell(on, "status").y)
  assert.ok(cell(on, "prod").y > cell(on, "pt").y)
  const onlyProd = planCenteredLayout({ ...ALL, showStatus: false }, 4, 2)
  assert.ok(cell(onlyProd, "prod").w > cell(on, "prod").w, "a single entry uses the full width")
})

test("Dr hidden: Pt moves up; Case hidden: Slip moves to the first row", () => {
  const base = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false }, 4, 2)
  const noDr = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false, showDoctor: false }, 4, 2)
  assert.equal(cell(noDr, "dr"), undefined)
  assert.ok(Math.abs((cell(noDr, "pt").y - cell(noDr, "ofc").y) - (cell(base, "dr").y - cell(base, "ofc").y)) < 1e-6)
  const noCase = planCenteredLayout({ ...ALL, showCaseNumber: false }, 4, 2)
  assert.equal(cell(noCase, "slip").y, cell(noCase, "ofc").y)
  assert.equal(cell(noCase, "slip").x, cell(planCenteredLayout(ALL, 4, 2), "slip").x)
})

test("Stage or Pan hidden: the other stays left; both hidden: no line and the name is centred", () => {
  const noStage = planCenteredLayout({ ...ALL, showStage: false }, 4, 2)
  assert.equal(cell(noStage, "pan").x, cell(planCenteredLayout(ALL, 4, 2), "stage").x)
  const none = planCenteredLayout({ ...ALL, showStage: false, showPan: false }, 4, 2)
  assert.equal(cell(none, "stage"), undefined)
  assert.equal(cell(none, "pan"), undefined)
  assert.ok(none.header.y > planCenteredLayout(ALL, 4, 2).header.y)
})

test("Pku or Del hidden: the other stays in its column; both hidden: no rule", () => {
  const all = planCenteredLayout(ALL, 4, 2)
  const noPku = planCenteredLayout({ ...ALL, showPickup: false }, 4, 2)
  assert.equal(cell(noPku, "deliver").x, cell(all, "deliver").x)
  const noDel = planCenteredLayout({ ...ALL, showDelivery: false }, 4, 2)
  assert.equal(cell(noDel, "pickup").x, cell(all, "pickup").x)
  const neither = planCenteredLayout({ ...ALL, showPickup: false, showDelivery: false }, 4, 2)
  assert.equal(neither.rule, null)
  assert.equal(cell(neither, "pickup"), undefined)
})

test("dividers off: no rule; QR off: no QR and the header uses the full width", () => {
  assert.equal(planCenteredLayout({ ...ALL, showDividers: false }, 4, 2).rule, null)
  const noQr = planCenteredLayout({ ...ALL, showQrCode: false }, 4, 2)
  assert.equal(noQr.qr, null)
  assert.ok(noQr.header.w > planCenteredLayout(ALL, 4, 2).header.w)
  assert.ok(Math.abs(noQr.header.x * 2 + noQr.header.w - 4) < 1e-9, "centred on the label")
})

test("minimum fields: only lab, patient and office remain", () => {
  const min = {
    ...ALL, showDoctor: false, showStage: false, showPan: false, showProduct: false, showStatus: false,
    showCaseNumber: false, showSlipNumber: false, showQrCode: false, showPickup: false, showDelivery: false,
  }
  const p = planCenteredLayout(min, 4, 2)
  assert.deepEqual(keys(p).sort(), ["ofc", "pt"])
  assert.equal(p.qr, null)
  assert.equal(p.rule, null)
})

test("geometry: every hide combination on every size stays inside the label and overlaps nothing", () => {
  const flags = ["showDoctor", "showStage", "showPan", "showProduct", "showStatus", "showCaseNumber", "showSlipNumber", "showQrCode", "showPickup", "showDelivery", "showDividers"]
  for (const [w, h] of SIZES) {
    for (let mask = 0; mask < 1 << flags.length; mask++) {
      const settings = { ...ALL }
      flags.forEach((f, i) => (settings[f] = Boolean(mask & (1 << i))))
      const p = planCenteredLayout(settings, w, h)
      const label = `${w}x${h} mask ${mask}`
      const boxes = [
        ...p.cells.map((c) => [c.key, c]),
        ["name", p.nameCell],
        ["logo", p.logoBox],
        ...(p.qr ? [["qr", p.qr]] : []),
      ]
      for (const [name, b] of boxes) {
        assert.ok(inside(b, w, h), `${label}: ${name} outside the label`)
        assert.ok(b.w > 0 && b.h > 0, `${label}: ${name} has no size`)
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          // the name and the logo share the header on purpose (only one prints)
          if (boxes[i][0] === "name" && boxes[j][0] === "logo") continue
          assert.ok(!overlaps(boxes[i][1], boxes[j][1]), `${label}: ${boxes[i][0]} overlaps ${boxes[j][0]}`)
        }
      }
      const hd = p.header
      assert.ok(p.logoBox.x >= hd.x - EPS && p.logoBox.x + p.logoBox.w <= hd.x + hd.w + EPS, `${label}: logo outside header`)
      if (p.rule) assert.ok(p.rule.x + p.rule.w <= w + EPS && p.rule.y < h, `${label}: rule outside`)
    }
  }
})

test("fitLogoInBox keeps the aspect ratio and centres the logo", () => {
  const box = { x: 1, y: 1, w: 2, h: 0.5 }
  const wide = fitLogoInBox(box, 8)
  assert.ok(Math.abs(wide.w / wide.h - 8) < 1e-9 && wide.w <= box.w + EPS && wide.h <= box.h + EPS)
  const tall = fitLogoInBox(box, 0.5)
  assert.ok(Math.abs(tall.h - box.h) < EPS && Math.abs(tall.w - 0.25) < EPS)
  assert.ok(Math.abs(tall.x + tall.w / 2 - (box.x + box.w / 2)) < EPS)
  assert.deepEqual(fitLogoInBox(box, 0), { x: 1, y: 1, w: 0, h: 0 })
})
