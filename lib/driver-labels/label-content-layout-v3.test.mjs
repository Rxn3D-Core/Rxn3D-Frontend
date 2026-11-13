// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-content-layout-v3.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import {
  V3_CAPTIONS,
  V3_SIZES,
  fitLogoLeft,
  fitValueSize,
  isV3Size,
  planV3Layout,
  v3Scale,
} from "./label-content-layout-v3.ts"
import { DEFAULT_DRIVER_LABEL_PRINT_SETTINGS } from "./label-print-settings.ts"
import { ROLL_SIZES, SHEET_TEMPLATES } from "./label-layout.ts"

const ALL = { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS }
const EPS = 1e-9
const cell = (p, key) => p.cells.find((c) => c.key === key)
const keys = (p) => p.cells.map((c) => c.key)

const OPTIONAL = ["showDoctor", "showStage", "showPan", "showCaseNumber", "showSlipNumber", "showQrCode", "showPickup", "showDelivery", "showDividers"]
function combos() {
  const out = []
  for (let m = 0; m < 1 << OPTIONAL.length; m++) {
    const s = { ...ALL }
    OPTIONAL.forEach((k, i) => (s[k] = !(m & (1 << i))))
    out.push(s)
  }
  return out
}

function rects(p) {
  const out = []
  for (const c of p.cells) {
    out.push({ n: `${c.key}.label`, x: c.x, y: c.labelY, w: c.w, h: c.labelH })
    out.push({ n: `${c.key}.value`, x: c.x, y: c.valueY, w: c.w, h: c.valueH })
  }
  if (p.qr) out.push({ n: "qr", ...p.qr })
  out.push({ n: "logo", ...p.logoBox })
  return out
}
const overlaps = (a, b) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS

test("v3 sizes: five roll sizes and eight sheet sizes with their own grids; custom sizes are not v3", () => {
  const roll = V3_SIZES.filter((s) => s.media === "roll")
  assert.equal(roll.length, ROLL_SIZES.length)
  for (const r of ROLL_SIZES) assert.ok(isV3Size("roll", r.widthIn, r.heightIn), r.id)
  const perSheet = { "4x2.5": 8, "3.75x2": 8, "3.25x2.25": 8, "3.375x2.33": 8, "4x3": 6, "3x2": 10, "4x2": 10, "2.5x2.5": 12 }
  assert.equal(V3_SIZES.filter((s) => s.media === "sheet").length, Object.keys(perSheet).length)
  assert.equal(SHEET_TEMPLATES.length, Object.keys(perSheet).length)
  for (const [id, n] of Object.entries(perSheet)) {
    const t = SHEET_TEMPLATES.find((x) => x.id === id)
    assert.ok(isV3Size("sheet", t.widthIn, t.heightIn), id)
    assert.equal(t.cols * t.rows, n, `${id} keeps ${n} labels per sheet`)
  }
  assert.ok(!isV3Size("roll", 3.75, 2))
  assert.ok(!isV3Size("sheet", 4, 6))
  assert.ok(!isV3Size("roll", 2, 1))
  assert.ok(!isV3Size("sheet", 5, 3))
})

test("4x6 matches the Figma numbers at scale 1", () => {
  assert.equal(v3Scale(4, 6), 1)
  const p = planV3Layout(ALL, 4, 6)
  const px = (inch) => inch * 96
  assert.equal(p.k, 1)
  assert.ok(Math.abs(px(p.qr.w) - 71) < 1e-6)
  assert.ok(Math.abs(px(p.qr.x + p.qr.w) - (384 - 10)) < 1e-6)
  assert.ok(Math.abs(px(p.qr.y + p.qr.h) - (576 - 10)) < 1e-6)
  assert.ok(Math.abs(px(p.rule.y) - 460) < 1e-6) // footer 116 px
  assert.ok(Math.abs(px(p.rule.widthIn) - 1) < 1e-6)
  assert.ok(Math.abs(px(cell(p, "pickup").labelY) - 484) < 1e-6) // text row 24 px under the line
  assert.ok(Math.abs(px(cell(p, "pt").labelY) - 47) < 1e-6) // patient block starts under the 47 px header
  assert.ok(Math.abs(cell(p, "pt").valuePt - 31 * 0.75) < 1e-9)
  assert.ok(Math.abs(cell(p, "ofc").labelPt - 9.5 * 0.75) < 1e-9)
  assert.ok(Math.abs(cell(p, "ofc").valuePt - 10.5 * 0.75) < 1e-9)
  assert.ok(Math.abs(px(p.logoBox.w) - 66) < 1e-6 && Math.abs(px(p.logoBox.h) - 20) < 1e-6)
  assert.equal(px(p.logoBox.x), 10)
})

test("captions are the full capital words", () => {
  assert.deepEqual(V3_CAPTIONS, {
    slip: "SLIP #", case: "CASE #", pan: "PAN #", pt: "PATIENT", ofc: "OFFICE", dr: "DOCTOR",
    stage: "STAGE #", pickup: "PICKUP", deliver: "DELIVER",
  })
})

test("all fields on: header columns right, patient, office row, footer left, QR right", () => {
  const p = planV3Layout(ALL, 4, 6)
  assert.deepEqual(keys(p).sort(), ["case", "deliver", "dr", "ofc", "pan", "pickup", "pt", "slip", "stage"].sort())
  assert.ok(cell(p, "slip").x < cell(p, "case").x && cell(p, "case").x < cell(p, "pan").x)
  assert.equal(cell(p, "slip").labelY, cell(p, "pan").labelY)
  assert.ok(cell(p, "ofc").x < cell(p, "dr").x && cell(p, "dr").x < cell(p, "stage").x)
  assert.ok(cell(p, "pt").valueY > cell(p, "pt").labelY)
  assert.ok(cell(p, "pickup").labelY < cell(p, "deliver").labelY)
  assert.ok(cell(p, "deliver").x + cell(p, "deliver").w <= p.qr.x)
})

test("hidden fields leave no gap", () => {
  const noHeader = planV3Layout({ ...ALL, showSlipNumber: false, showCaseNumber: false, showPan: false }, 4, 6)
  assert.ok(!keys(noHeader).includes("slip"))
  assert.ok(noHeader.nameCell.w > planV3Layout(ALL, 4, 6).nameCell.w) // lab name may use the freed width
  const onlyPan = planV3Layout({ ...ALL, showSlipNumber: false, showCaseNumber: false }, 4, 6)
  assert.ok(Math.abs(onlyPan.cells.find((c) => c.key === "pan").x + onlyPan.cells.find((c) => c.key === "pan").w - (4 - 10 / 96)) < 1e-9) // packed to the right edge

  const officeOnly = planV3Layout({ ...ALL, showDoctor: false, showStage: false }, 4, 6)
  assert.equal(cell(officeOnly, "ofc").x, planV3Layout(ALL, 4, 6).cells.find((c) => c.key === "ofc").x)
  assert.ok(Math.abs(cell(officeOnly, "ofc").w - (4 - 20 / 96)) < 1e-9) // full width

  const noDoctor = planV3Layout({ ...ALL, showDoctor: false }, 4, 6)
  assert.ok(Math.abs(cell(noDoctor, "ofc").x + cell(noDoctor, "ofc").w + 8 / 96 - cell(noDoctor, "stage").x) < 1e-9)

  const noDeliver = planV3Layout({ ...ALL, showPickup: false }, 4, 6)
  assert.equal(cell(noDeliver, "deliver").labelY, planV3Layout(ALL, 4, 6).cells.find((c) => c.key === "pickup").labelY)

  const noQr = planV3Layout({ ...ALL, showQrCode: false }, 4, 2.5)
  assert.equal(noQr.qr, null)
  assert.ok(Math.abs(cell(noQr, "pickup").w - (4 - 20 / 96)) < 1e-9 || cell(noQr, "pickup").w > 3)

  const bare = planV3Layout({ ...ALL, showQrCode: false, showPickup: false, showDelivery: false }, 3, 2)
  assert.equal(bare.rule, null)
  const noLine = planV3Layout({ ...ALL, showDividers: false }, 3, 2)
  assert.equal(noLine.rule, null)
})

test("every v3 size and hide combination: inside the label, nothing overlaps", () => {
  const sizes = V3_SIZES
  for (const { widthIn: w, heightIn: h } of sizes) {
    for (const s of combos()) {
      const p = planV3Layout(s, w, h)
      const rs = rects(p)
      for (const r of rs) {
        assert.ok(r.w > 0 && r.h > 0 || r.n === "logo", `${w}x${h} ${r.n} empty`)
        assert.ok(r.x >= -EPS && r.y >= -EPS && r.x + r.w <= w + EPS && r.y + r.h <= h + EPS, `${w}x${h} ${r.n} outside ${JSON.stringify(r)}`)
      }
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) {
          // the logo box and the lab name share the same space on purpose; label/value of one cell never overlap either
          assert.ok(!overlaps(rs[i], rs[j]), `${w}x${h} ${rs[i].n} overlaps ${rs[j].n} (${JSON.stringify(s)})`)
        }
      // the rule is above every footer item and below the row
      if (p.rule) {
        for (const c of p.cells.filter((c) => c.key === "pickup" || c.key === "deliver")) assert.ok(c.labelY > p.rule.y)
        for (const c of p.cells.filter((c) => c.key === "ofc")) assert.ok(c.labelY + c.labelH + c.valueH <= p.rule.y + EPS)
        if (p.qr) assert.ok(p.qr.y > p.rule.y)
      }
      // name box does not run into the header columns
      const header = p.cells.filter((c) => ["slip", "case", "pan"].includes(c.key))
      for (const c of header) assert.ok(p.nameCell.x + p.nameCell.w <= c.x + EPS)
      // header columns clear of the patient block
      const pt = cell(p, "pt")
      for (const c of header) assert.ok(c.valueY + c.valueH <= pt.labelY + EPS)
      // patient clears the office row
      assert.ok(pt.valueY + pt.valueH <= cell(p, "ofc").labelY + EPS, `${w}x${h} patient vs row`)
    }
  }
})

test("text sizes stay readable and scale with the label", () => {
  const sizes = V3_SIZES.map((s) => v3Scale(s.widthIn, s.heightIn))
  for (const k of sizes) assert.ok(k > 0.5 && k <= 1)
  assert.ok(v3Scale(2.25, 1.25) < v3Scale(4, 2.5))
  assert.equal(v3Scale(4, 2.5), 1)
})

test("fitValueSize: full size, then shrink, then ellipsis", () => {
  const measure = (t, pt) => t.length * pt * 0.01
  assert.deepEqual(fitValueSize(measure, "abcd", 1, 10, 6), { pt: 10, ellipsis: false })
  const shrunk = fitValueSize(measure, "x".repeat(14), 1, 10, 6)
  assert.ok(shrunk.pt < 10 && shrunk.pt >= 6 && !shrunk.ellipsis)
  assert.ok(measure("x".repeat(14), shrunk.pt) <= 1)
  const cut = fitValueSize(measure, "x".repeat(40), 1, 10, 6)
  assert.deepEqual(cut, { pt: 6, ellipsis: true })
})

test("fitLogoLeft keeps the aspect, left aligned", () => {
  const box = { x: 0.1, y: 0.1, w: 0.6, h: 0.2 }
  const wide = fitLogoLeft(box, 6)
  assert.ok(Math.abs(wide.w / wide.h - 6) < 1e-9 && wide.x === 0.1 && wide.w <= 0.6 + EPS)
  const tall = fitLogoLeft(box, 1)
  assert.ok(Math.abs(tall.h - 0.2) < 1e-9 && tall.x === 0.1)
  assert.equal(fitLogoLeft(box, 0).w, 0)
})
