// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-content-layout-v3.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import {
  V3_CAPTIONS,
  V3_FRAMES,
  V3_SIZES,
  fitLogoLeft,
  fitValueSize,
  formatDeliverV3,
  formatPickupV3,
  isV3Size,
  planV3Layout,
  repackHeader,
  v3FrameKey,
} from "./label-content-layout-v3.ts"
import { DEFAULT_DRIVER_LABEL_PRINT_SETTINGS } from "./label-print-settings.ts"
import { ROLL_SIZES, SHEET_TEMPLATES } from "./label-layout.ts"

const ALL = { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS }
const EPS = 1e-6
const px = (inch) => inch * 96
const cell = (p, key) => p.cells.find((c) => c.key === key)
const keys = (p) => p.cells.map((c) => c.key)
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`)

// Numbers read from the Figma frames (px at 96 dpi), per size:
// [frame, widthPx, heightPx, slipX, caseX, panX, patientLabelY, rowX[3], ruleY, ruleW, pickupY, deliverX, qr[x,y,size]]
const FIGMA = [
  ["roll:4x6", 384, 576, 266, 304, 347, 53, [10, 87, 195], 470, 364, 532, 115, [290, 485, 71]],
  ["roll:4x2.5", 384, 240, 265, 303, 345, 40.5, [14, 94, 194], 148, 356, 201.5, 94, [300, 156, 70]],
  ["roll:4x2", 384, 192, 265, 303, 345, 43.5, [14, 94, 194], 123, 356, 158, 94, [315, 127, 55]],
  ["roll:3x2", 288, 192, 169, 207, 249, 41.5, [14, 80, 163.76], 123, 260, 156, 80, [229, 134, 44]],
  ["roll:2.25x1.25", 216, 120, 101, 139, 181, 30.5, [10, 61, 137], 83, 196, 88, 86, [181, 87, 25]],
  ["sheet:2.5x2.5", 240, 240, 121, 159, 201, 45.5, [14, 70, 147], 162, 212, 197, 75, [171, 166, 55]],
  ["sheet:4x2.5", 384, 240, 265, 303, 345, 42.5, [14, 94, 194], 148, 356, 196.5, 94, [305, 154, 65]],
  ["sheet:3.75x2", 360, 192, 241, 279, 321, 42.5, [14, 94, 194], 123, 332, 157, 94, [295, 128, 51]],
  ["sheet:3.25x2.25", 312, 216, 193, 231, 273, 43.5, [14, 80, 176.24], 124, 284, 172.5, 80, [233, 130, 65]],
  ["sheet:3.375x2.33", 324, 224, 205, 243, 285, 42.5, [14, 83, 182.48], 132, 296, 180.5, 83, [244, 137, 66]],
  ["sheet:4x3", 384, 288, 265, 303, 345, 41.5, [14, 94, 194], 196, 356, 244.5, 94, [305, 202, 65]],
  ["sheet:3x2", 288, 192, 169, 207, 249, 42.5, [14, 80, 163.76], 123, 260, 154, 80, [226, 128, 48]],
  ["sheet:4x2", 384, 192, 265, 303, 345, 42.5, [14, 94, 194], 123, 356, 157, 94, [315, 126, 55]],
]

function sizeOf(frameKey) {
  const [media, dims] = frameKey.split(":")
  const [w, h] = dims.split("x").map(Number)
  return { media, w, h }
}

test("every size in V3_SIZES has a frame and the frame table has nothing else", () => {
  assert.equal(V3_SIZES.length, 13)
  assert.deepEqual(
    V3_SIZES.map((s) => v3FrameKey(s.media, s.widthIn, s.heightIn)).sort(),
    Object.keys(V3_FRAMES).sort(),
  )
  assert.deepEqual(FIGMA.map((f) => f[0]).sort(), Object.keys(V3_FRAMES).sort())
})

test("each size matches the Figma frame numbers (no scaling: px positions as designed)", () => {
  for (const [key, wPx, hPx, sx, cx, pxX, ptY, rowX, ruleY, ruleW, pickY, delX, qr] of FIGMA) {
    const { media, w, h } = sizeOf(key)
    near(w * 96, wPx, `${key} width`)
    assert.ok(Math.abs(h * 96 - hPx) < 0.5, `${key} height`) // 2.33 in is 223.68 px; the Figma frame is 224
    const p = planV3Layout(ALL, w, h, media)
    near(px(cell(p, "slip").x), sx, `${key} slip x`)
    near(px(cell(p, "case").x), cx, `${key} case x`)
    near(px(cell(p, "pan").x), pxX, `${key} pan x`)
    near(px(cell(p, "ofc").x), rowX[0], `${key} office x`)
    near(px(cell(p, "dr").x), rowX[1], `${key} doctor x`)
    near(px(cell(p, "stage").x), rowX[2], `${key} stage x`)
    near(px(cell(p, "pt").labelBase), ptY + 9.5 * 0.92, `${key} patient caption y`)
    near(px(p.rule.y), ruleY, `${key} rule y`)
    near(px(p.rule.w), ruleW, `${key} rule w`)
    near(px(p.rule.widthIn), 1, `${key} rule 1 px`)
    near(px(cell(p, "pickup").labelBase), pickY + 9.5 * 0.92, `${key} pickup y`)
    near(px(cell(p, "deliver").x), delX, `${key} deliver x`)
    near(px(p.qr.x), qr[0], `${key} qr x`)
    near(px(p.qr.y), qr[1], `${key} qr y`)
    near(px(p.qr.w), qr[2], `${key} qr size`)
    // Type never scales: captions 9.5 px, values 10.5 px (9.5 on 2.25x1.25), header values 10 px.
    near(cell(p, "ofc").labelPt, 9.5 * 0.75, `${key} caption size`)
    near(cell(p, "ofc").valuePt, (key === "roll:2.25x1.25" ? 9.5 : 10.5) * 0.75, `${key} value size`)
    near(cell(p, "slip").valuePt, 10 * 0.75, `${key} header value size`)
    assert.ok(Math.abs(px(p.qr.x + p.qr.w) - qr[0] - qr[2]) < 1e-6)
  }
})

test("frame specifics: 4x6 logo and name, 2.25x1.25 special frame, 4x2.5 caption x", () => {
  const p = planV3Layout(ALL, 4, 6, "roll")
  near(px(p.logoBox.x), 10, "logo x")
  near(px(p.logoBox.y), 13.5, "logo y")
  near(px(p.logoBox.w), 66, "logo w")
  near(px(p.logoBox.h), 20, "logo h")
  near(cell(p, "pt").valuePt, 31 * 0.75, "name 31 px")
  near(px(cell(p, "pt").x), 10, "name x")

  const s = planV3Layout(ALL, 2.25, 1.25, "roll")
  near(px(s.logoBox.w), 48, "small logo w")
  near(px(s.logoBox.h), 15, "small logo h")
  assert.ok(!cell(s, "ofc").caption && !cell(s, "dr").caption && !cell(s, "stage").caption, "no row captions on 2.25x1.25")
  assert.ok(cell(s, "slip").caption && cell(s, "pt").caption)
  near(cell(s, "pt").valuePt, 20 * 0.75, "inferred name size")
  near(px(cell(s, "ofc").valueBase), 66.5 + 9.5 * 0.92, "row values y")

  const n = planV3Layout(ALL, 4, 2.5, "roll")
  near(px(cell(n, "pt").labelX), 16, "4x2.5 caption x")
  near(px(cell(n, "pt").x), 14, "4x2.5 name x")
  const q = planV3Layout(ALL, 2.5, 2.5, "sheet")
  near(cell(q, "pt").valuePt, 26 * 0.75, "inferred name size 2.5x2.5")
})

test("v3 sizes: five roll sizes and eight sheet sizes with their own grids; custom sizes are not v3", () => {
  const roll = V3_SIZES.filter((s) => s.media === "roll")
  assert.equal(roll.length, ROLL_SIZES.length)
  for (const r of ROLL_SIZES) assert.ok(isV3Size("roll", r.widthIn, r.heightIn), r.id)
  const perSheet = { "4x2.5": 8, "3.75x2": 8, "3.25x2.25": 8, "3.375x2.33": 8, "4x3": 6, "3x2": 10, "4x2": 10, "2.5x2.5": 12 }
  assert.equal(SHEET_TEMPLATES.length, Object.keys(perSheet).length)
  for (const [id, n] of Object.entries(perSheet)) {
    const t = SHEET_TEMPLATES.find((x) => x.id === id)
    assert.ok(isV3Size("sheet", t.widthIn, t.heightIn), id)
    assert.equal(t.cols * t.rows, n, `${id} keeps ${n} labels per sheet`)
  }
  assert.ok(!isV3Size("roll", 3.75, 2))
  assert.ok(!isV3Size("sheet", 4, 6))
  assert.ok(!isV3Size("sheet", 5, 3))
})

test("captions are the full capital words", () => {
  assert.deepEqual(V3_CAPTIONS, {
    slip: "SLIP #", case: "CASE #", pan: "PAN #", pt: "PATIENT", ofc: "OFFICE", dr: "DOCTOR",
    stage: "STAGE #", pickup: "PICKUP", deliver: "DELIVER",
  })
})

test("hidden fields leave no gap", () => {
  const std = planV3Layout(ALL, 4, 6, "roll")
  const noSlip = planV3Layout({ ...ALL, showSlipNumber: false }, 4, 6, "roll")
  assert.ok(!keys(noSlip).includes("slip"))
  near(px(cell(noSlip, "case").x), 304, "case stays at its own position")
  near(px(cell(noSlip, "pan").x), 347, "pan too")
  const noPan = planV3Layout({ ...ALL, showPan: false }, 4, 6, "roll")
  near(px(cell(noPan, "slip").x), 304, "slip moves right into the free column")
  near(px(cell(noPan, "case").x), 347, "case too (columns pack to the right edge)")
  assert.ok(noSlip.nameCell.w > std.nameCell.w)
  const onlyPan = planV3Layout({ ...ALL, showSlipNumber: false, showCaseNumber: false }, 4, 6, "roll")
  near(px(cell(onlyPan, "pan").x), 347, "pan stays at the right")
  const noHeader = planV3Layout({ ...ALL, showSlipNumber: false, showCaseNumber: false, showPan: false }, 4, 6, "roll")
  assert.ok(noHeader.nameCell.w > noSlip.nameCell.w)

  const noDoctor = planV3Layout({ ...ALL, showDoctor: false }, 4, 6, "roll")
  near(px(cell(noDoctor, "ofc").x), 10, "office")
  near(px(cell(noDoctor, "stage").x), 87, "stage takes the doctor position")
  const officeOnly = planV3Layout({ ...ALL, showDoctor: false, showStage: false }, 4, 6, "roll")
  near(px(cell(officeOnly, "ofc").w), 384 - 14 - 10, "office runs to the margin")

  const noPickup = planV3Layout({ ...ALL, showPickup: false }, 4, 6, "roll")
  near(px(cell(noPickup, "deliver").x), 10, "deliver takes the pickup position")
  const noQr = planV3Layout({ ...ALL, showQrCode: false }, 4, 2.5, "roll")
  assert.equal(noQr.qr, null)
  assert.ok(px(cell(noQr, "deliver").w) > 250)
  assert.ok(noQr.rule)

  assert.equal(planV3Layout({ ...ALL, showQrCode: false, showPickup: false, showDelivery: false }, 3, 2, "roll").rule, null)
  assert.equal(planV3Layout({ ...ALL, showDividers: false }, 3, 2, "roll").rule, null)
})

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

/** Ink rectangles (inches): caps / digits from baseline - 0.72 em to baseline (+ descender for values). */
function inkRects(p) {
  const out = []
  for (const c of p.cells) {
    const lem = c.labelPt / 72
    const vem = c.valuePt / 72
    if (c.caption) out.push({ n: `${c.key}.caption`, x: c.labelX, y: c.labelBase - 0.72 * lem, w: c.w, h: 0.72 * lem + 0.03 * lem })
    out.push({ n: `${c.key}.value`, x: c.x, y: c.valueBase - 0.72 * vem, w: c.w, h: 0.72 * vem + 0.21 * vem })
  }
  const n = p.nameCell
  out.push({ n: "labname", x: n.x, y: n.baseline - 0.72 * (n.fontPt / 72), w: n.w, h: 0.93 * (n.fontPt / 72) })
  if (p.qr) out.push({ n: "qr", ...p.qr })
  out.push({ n: "rule", x: p.rule ? p.rule.x : 0, y: p.rule ? p.rule.y : 0, w: p.rule ? p.rule.w : 0, h: 0.001 })
  return out.filter((r) => r.w > 0)
}
const overlaps = (a, b) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS

test("every size and hide combination: inside the label, nothing overlaps", () => {
  for (const { media, widthIn: w, heightIn: h } of V3_SIZES) {
    const W = (Math.round(w * 96) / 96) // frame width
    const H = V3_FRAMES[v3FrameKey(media, w, h)] && Math.round(h * 96) / 96
    for (const s of combos()) {
      const p = planV3Layout(s, w, h, media)
      const rs = inkRects(p)
      const label = `${media} ${w}x${h}`
      for (const r of rs) {
        assert.ok(r.x >= -EPS && r.y >= -EPS && r.x + r.w <= W + 0.01 && r.y + r.h <= H + 0.01, `${label} ${r.n} outside ${JSON.stringify(r)}`)
      }
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) {
          // lab name / logo area does not overlap header columns; patient slot spans the width but sits below the header
          assert.ok(!overlaps(rs[i], rs[j]), `${label} ${rs[i].n} overlaps ${rs[j].n} (${JSON.stringify(s)})`)
        }
    }
  }
})

test("dates as in the Figma frames: pickup MM/DD/YYYY, delivery without a dot, shorter on 2.5x2.5 and 2.25x1.25", () => {
  assert.equal(formatPickupV3("2026-09-29"), "09/29/2026")
  assert.equal(formatPickupV3(""), "-")
  assert.equal(formatDeliverV3("2026-10-05", "16:00", "long"), "10/05/2026 4:00 PM")
  assert.equal(formatDeliverV3("2026-10-05", "16:00", "short"), "10/05/26 4:00 PM")
  assert.equal(formatDeliverV3("2026-10-05", "16:00", "hour"), "10/05/26 4 PM")
  assert.equal(formatDeliverV3("2026-10-05", "16:30", "hour"), "10/05/26 4:30 PM")
  assert.equal(formatDeliverV3("2026-10-05", "00:00", "hour"), "10/05/26 12 AM")
  assert.equal(formatDeliverV3("2026-10-05", null, "long"), "10/05/2026")
  assert.equal(formatDeliverV3(null, null, "long"), "-")
  assert.equal(planV3Layout(ALL, 2.25, 1.25, "roll").dateMode, "short")
  assert.equal(planV3Layout(ALL, 2.5, 2.5, "sheet").dateMode, "hour")
  for (const f of ["roll:4x6", "roll:4x2.5", "roll:4x2", "roll:3x2", "sheet:4x3", "sheet:3.25x2.25", "sheet:3.375x2.33"]) {
    const { media, w, h } = sizeOf(f)
    assert.equal(planV3Layout(ALL, w, h, media).dateMode, "long", f)
  }
})

test("2.25x1.25 prints row, pickup and delivery values at 9.5 px; every other frame at 10.5 px", () => {
  for (const f of Object.keys(V3_FRAMES)) {
    const { media, w, h } = sizeOf(f)
    const p = planV3Layout(ALL, w, h, media)
    const want = f === "roll:2.25x1.25" ? 9.5 : 10.5
    for (const k of ["ofc", "dr", "stage", "pickup", "deliver"]) near(cell(p, k).valuePt, want * 0.75, `${f} ${k}`)
  }
})

test("repackHeader keeps Figma slots when texts fit, packs right by real widths when not", () => {
  const cols = [{ x: 2.76, w: 0.39 }, { x: 3.17, w: 0.35 }, { x: 3.61, w: 0.3 }]
  assert.deepEqual(repackHeader(cols, [0.3, 0.3, 0.3], 3.9, 1), cols)
  const out = repackHeader(cols, [0.6, 0.5, 0.45], 3.9, 1)
  assert.ok(Math.abs(out[2].x + out[2].w - 3.9) < 1e-9)
  assert.ok(out[0].x + out[0].w + 10 / 96 <= out[1].x + 1e-9 && out[1].x + out[1].w + 10 / 96 <= out[2].x + 1e-9, "10 px gap kept")
  // Texts that fit their slot but sit closer than 10 px to the next column are spread to keep the gap.
  const tight = [{ x: 2.76, w: 0.4 - 10 / 96 }, { x: 3.16, w: 0.4 - 10 / 96 }, { x: 3.56, w: 0.3 }]
  assert.deepEqual(repackHeader(tight, [0.29, 0.29, 0.2], 3.9, 1), tight)
  const spread = repackHeader(tight, [0.4, 0.3, 0.2], 3.9, 1)
  assert.ok(spread[1].x >= spread[0].x + 0.4 + 10 / 96 - 1e-9)
  assert.deepEqual(repackHeader(cols, [2, 2, 2], 3.9, 1), cols) // cannot fit: Figma slots, text is shrunk
})

test("fitValueSize: full size, then shrink, then ellipsis", () => {
  const measure = (t, pt) => t.length * pt * 0.01
  assert.deepEqual(fitValueSize(measure, "abcd", 1, 10, 6), { pt: 10, ellipsis: false })
  const shrunk = fitValueSize(measure, "x".repeat(14), 1, 10, 6)
  assert.ok(shrunk.pt < 10 && shrunk.pt >= 6 && !shrunk.ellipsis)
  assert.ok(measure("x".repeat(14), shrunk.pt) <= 1)
  assert.deepEqual(fitValueSize(measure, "x".repeat(40), 1, 10, 6), { pt: 6, ellipsis: true })
})

test("fitLogoLeft keeps the aspect, left aligned", () => {
  const box = { x: 0.1, y: 0.1, w: 0.6, h: 0.2 }
  const wide = fitLogoLeft(box, 6)
  assert.ok(Math.abs(wide.w / wide.h - 6) < 1e-9 && wide.x === 0.1 && wide.w <= 0.6 + EPS)
  const tall = fitLogoLeft(box, 1)
  assert.ok(Math.abs(tall.h - 0.2) < 1e-9 && tall.x === 0.1)
  assert.equal(fitLogoLeft(box, 0).w, 0)
})
