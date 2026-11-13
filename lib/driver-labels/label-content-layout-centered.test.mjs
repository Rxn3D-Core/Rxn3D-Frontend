// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-content-layout-centered.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { fitLogoInBox, fitLogoLeft, planCenteredLayout } from "./label-content-layout-centered.ts"
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

test("all fields on: rows are Ofc|Dr, Pt|Stage, Slip|Case+Pan, Prod|Status, Pku|Del", () => {
  const p = planCenteredLayout(ALL, 4, 2)
  assert.deepEqual(keys(p).sort(), ["case", "deliver", "dr", "ofc", "pan", "pickup", "pt", "prod", "slip", "stage", "status"].sort())
  const rows = [["ofc", "dr"], ["pt", "stage"], ["slip", "case"], ["prod", "status"], ["pickup", "deliver"]]
  rows.forEach(([l, r], i) => {
    assert.equal(cell(p, l).y, cell(p, r).y, `${l}|${r} share a row`)
    assert.ok(cell(p, r).x > cell(p, l).x)
    if (i > 0) assert.ok(cell(p, l).y > cell(p, rows[i - 1][0]).y)
  })
  assert.equal(cell(p, "pan").y, cell(p, "case").y)
  assert.equal(cell(p, "pan").after, "case")
  assert.ok(p.qr && p.rule)
})

test("Product and Status print as one extra row only when their switches are on", () => {
  const off = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false }, 4, 2)
  assert.equal(cell(off, "prod"), undefined)
  assert.equal(cell(off, "status"), undefined)
  const onlyProd = planCenteredLayout({ ...ALL, showStatus: false }, 4, 2)
  assert.ok(cell(onlyProd, "prod").w > cell(planCenteredLayout(ALL, 4, 2), "prod").w, "a single entry uses the full width")
})

test("hidden fields leave no gap: rows pack and a lone right part keeps the right column", () => {
  const full = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false }, 4, 2)
  const noDr = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false, showDoctor: false }, 4, 2)
  assert.equal(cell(noDr, "dr"), undefined)
  assert.equal(cell(noDr, "ofc").y, cell(full, "ofc").y, "the row stays, only the right part is gone")
  const noSlip = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false, showSlipNumber: false }, 4, 2)
  assert.equal(cell(noSlip, "case").x, cell(full, "case").x, "Case keeps the right column")
  const noStage = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false, showStage: false }, 4, 2)
  assert.equal(cell(noStage, "stage"), undefined)
  const noCasePan = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false, showCaseNumber: false, showPan: false, showSlipNumber: false }, 4, 2)
  assert.equal(cell(noCasePan, "slip"), undefined)
  assert.equal(cell(noCasePan, "case"), undefined)
  assert.ok(cell(noCasePan, "pickup").y < cell(full, "pickup").y, "the empty row is dropped and rows move up or re-centre")
  const noPan = planCenteredLayout({ ...ALL, showProduct: false, showStatus: false, showPan: false }, 4, 2)
  assert.equal(cell(noPan, "pan"), undefined)
  assert.ok(cell(noPan, "case").w > cell(full, "case").w)
})

test("Stage and Pan are no longer under the header", () => {
  const p = planCenteredLayout(ALL, 4, 2)
  assert.ok(cell(p, "stage").y > cell(p, "ofc").y)
  assert.ok(cell(p, "pan").y > cell(p, "ofc").y)
})

test("Pku and Del share the last row; both hidden: no row and no rule", () => {
  const p = planCenteredLayout(ALL, 4, 2)
  assert.equal(cell(p, "pickup").y, cell(p, "deliver").y)
  const noPku = planCenteredLayout({ ...ALL, showPickup: false }, 4, 2)
  assert.equal(cell(noPku, "deliver").x, cell(p, "deliver").x, "Del keeps the right column")
  const neither = planCenteredLayout({ ...ALL, showPickup: false, showDelivery: false }, 4, 2)
  assert.equal(neither.rule, null)
  assert.equal(cell(neither, "pickup"), undefined)
})

test("rows are evenly spaced", () => {
  const p = planCenteredLayout(ALL, 4, 2)
  const ys = ["ofc", "pt", "slip", "prod", "pickup"].map((k) => cell(p, k).y)
  const d = ys.slice(1).map((y, i) => y - ys[i])
  for (const v of d) assert.ok(Math.abs(v - d[0]) < 1e-9)
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

test("fitLogoLeft is left aligned, keeps the aspect ratio and is null for an unusable logo", () => {
  const box = { x: 0.1, y: 0.1, w: 2, h: 0.2 }
  const fit = fitLogoLeft(box, 5)
  assert.equal(fit.x, box.x)
  assert.ok(Math.abs(fit.w / fit.h - 5) < 1e-9 && fit.h <= box.h + EPS && fit.w <= box.w + EPS)
  assert.equal(fitLogoLeft(box, 0), null)
})
