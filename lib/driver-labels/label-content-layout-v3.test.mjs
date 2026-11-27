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

// Frame numbers (px at 96 dpi) per size, started from the Figma frames and re-spaced for RXN-103 (bigger type and QR):
// [frame, widthPx, heightPx, slipX, caseX, panX, patientLabelY, rowX[3], ruleY, ruleW, pickupY, deliverX, qr[x,y,size]]
const FIGMA = [
  ["roll:4x6", 384, 576, 212, 268, 326, 56, [10, 108, 250], 505, 250, 522, 108, [268, 460, 106]],
  ["roll:4x2.5", 384, 240, 208, 264, 322, 40, [14, 108, 262], 190, 247, 196, 108, [269, 128, 105]],
  ["roll:4x2", 384, 192, 208, 264, 322, 32.5, [14, 100, 218], 153, 270, 155.5, 108, [292, 104, 82]],
  ["roll:3x2", 288, 192, 126, 176, 232, 32.5, [14, 90, 212], 153, 192, 155.5, 88, [214, 118, 66]],
  ["roll:4x3", 384, 288, 208, 264, 322, 43, [14, 108, 262], 237, 255, 244, 108, [277, 183, 97]],
  ["roll:2.25x1.25", 216, 120, 68, 116, 170, 29.5, [10, 61, 137], 80, 154, 82, 78, [172, 79, 37.5]],
  ["sheet:2.5x2.5", 240, 240, 84, 132, 186, 42, [14, 74, 164], 138, 212, 148, 14, [150, 148, 82]],
  ["sheet:4x2.5", 384, 240, 208, 264, 322, 40, [14, 108, 262], 190, 255, 196, 108, [277, 135, 97]],
  ["sheet:3.75x2", 360, 192, 190, 244, 302, 32.5, [14, 104, 246], 153, 254, 155.5, 108, [276, 110, 76]],
  ["sheet:3.25x2.25", 312, 216, 148, 200, 256, 32.5, [14, 96, 220], 151.5, 185, 153, 14, [207, 113, 97]],
  ["sheet:3.375x2.33", 324, 224, 160, 212, 268, 35, [14, 98, 230], 183, 195, 186, 88, [217, 119, 99]],
  ["sheet:4x3", 384, 288, 208, 264, 322, 43, [14, 108, 262], 237, 255, 244, 108, [277, 183, 97]],
  ["sheet:3x2", 288, 192, 126, 176, 232, 32.5, [14, 90, 212], 153, 188, 155.5, 86, [210, 114, 72]],
  ["sheet:4x2", 384, 192, 208, 264, 322, 35, [14, 100, 218], 137, 270, 144, 108, [292, 104, 82]],
]

function sizeOf(frameKey) {
  const [media, dims] = frameKey.split(":")
  const [w, h] = dims.split("x").map(Number)
  return { media, w, h }
}

test("every size in V3_SIZES has a frame and the frame table has nothing else", () => {
  assert.equal(V3_SIZES.length, 14)
  assert.deepEqual(
    V3_SIZES.map((s) => v3FrameKey(s.media, s.widthIn, s.heightIn)).sort(),
    Object.keys(V3_FRAMES).sort(),
  )
  assert.deepEqual(FIGMA.map((f) => f[0]).sort(), Object.keys(V3_FRAMES).sort())
})

test("each size matches its frame numbers (no scaling: px positions as designed)", () => {
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
    near(px(cell(p, "pt").labelBase), ptY + 12.5 * 0.92, `${key} patient caption y`)
    near(px(p.rule.y), ruleY, `${key} rule y`)
    near(px(p.rule.w), ruleW, `${key} rule w`)
    near(px(p.rule.widthIn), 1, `${key} rule 1 px`)
    near(px(cell(p, "pickup").labelBase), pickY + 12.5 * 0.92, `${key} pickup y`)
    near(px(cell(p, "deliver").x), delX, `${key} deliver x`)
    near(px(p.qr.x), qr[0], `${key} qr x`)
    near(px(p.qr.y), qr[1], `${key} qr y`)
    near(px(p.qr.w), qr[2], `${key} qr size`)
    // Type never scales: row captions 14.5 px and values 15.5 px (14.5 on 2.25x1.25), header values 13 px.
    near(cell(p, "ofc").labelPt, 14.5 * 0.75, `${key} row caption size`)
    near(cell(p, "pickup").labelPt, 12.5 * 0.75, `${key} caption size`)
    near(cell(p, "ofc").valuePt, (key === "roll:2.25x1.25" ? 14.5 : 15.5) * 0.75, `${key} value size`)
    near(cell(p, "slip").valuePt, 13 * 0.75, `${key} header value size`)
    assert.ok(Math.abs(px(p.qr.x + p.qr.w) - qr[0] - qr[2]) < 1e-6)
  }
})

test("frame specifics: 4x6 logo and name, 2.25x1.25 special frame, 4x2.5 caption x", () => {
  const p = planV3Layout(ALL, 4, 6, "roll")
  near(px(p.logoBox.x), 10, "logo x")
  near(px(p.logoBox.y), 13.5, "logo y")
  near(px(p.logoBox.w), 66, "logo w")
  near(px(p.logoBox.h), 20, "logo h")
  near(cell(p, "pt").valuePt, 34 * 0.75, "name 34 px")
  near(px(cell(p, "pt").x), 10, "name x")

  const s = planV3Layout(ALL, 2.25, 1.25, "roll")
  near(px(s.logoBox.w), 48, "small logo w")
  near(px(s.logoBox.h), 15, "small logo h")
  assert.ok(!cell(s, "ofc").caption && !cell(s, "dr").caption && !cell(s, "stage").caption, "no row captions on 2.25x1.25")
  assert.ok(cell(s, "slip").caption && cell(s, "pt").caption)
  near(cell(s, "pt").valuePt, 23 * 0.75, "inferred name size")
  near(px(cell(s, "ofc").valueBase), 60.5 + 14.5 * 0.92, "row values y")

  const n = planV3Layout(ALL, 4, 2.5, "roll")
  near(px(cell(n, "pt").labelX), 16, "4x2.5 caption x")
  near(px(cell(n, "pt").x), 14, "4x2.5 name x")
  const q = planV3Layout(ALL, 2.5, 2.5, "sheet")
  near(cell(q, "pt").valuePt, 29 * 0.75, "inferred name size 2.5x2.5")
})

test("v3 sizes: six roll sizes and eight sheet sizes with their own grids", () => {
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
})

test("RXN-103: custom sizes print v3 from 2.25 x 1.25 in up to a Letter page, smaller or larger ones do not", () => {
  assert.ok(isV3Size("roll", 3.75, 2))
  assert.ok(isV3Size("sheet", 5, 3))
  assert.ok(isV3Size("sheet", 4, 6))
  assert.ok(!isV3Size("roll", 2, 1))
  assert.ok(!isV3Size("sheet", 1.5, 2.5))
  assert.ok(!isV3Size("sheet", 9, 4))
  assert.ok(!isV3Size("roll", 0, 0))
  assert.ok(!isV3Size("roll", Number.NaN, 2))
})

test("RXN-103: a custom size keeps the frame of its nearest listed size, moved by the size difference", () => {
  const base = planV3Layout(ALL, 4, 3, "sheet")
  // 0.5 in wider, 0.25 in taller than the 4 x 3 frame: right-anchored things move 48 px, bottom-anchored 24 px.
  const big = planV3Layout(ALL, 4.5, 3.25, "sheet")
  near(px(big.qr.x), px(base.qr.x) + 48, "qr x")
  near(px(big.qr.y), px(base.qr.y) + 24, "qr y")
  near(px(big.rule.w), px(base.rule.w) + 48, "rule w")
  near(px(big.rule.y), px(base.rule.y) + 24, "rule y")
  near(px(cell(big, "slip").x), px(cell(base, "slip").x) + 48, "slip x")
  assert.equal(cell(big, "pt").w > cell(base, "pt").w, true, "patient name uses the wider label")
  for (const [media, w, h] of [["roll", 3.5, 2.25], ["roll", 5, 7], ["sheet", 2.3, 1.3], ["sheet", 8, 10]]) {
    const p = planV3Layout(ALL, w, h, media)
    for (const c of p.cells) {
      assert.ok(c.x >= -EPS && c.x + c.w <= w + EPS, `${media}:${w}x${h} ${c.key} inside the width`)
    }
    if (p.qr) assert.ok(p.qr.x + p.qr.w <= w + EPS && p.qr.y + p.qr.h <= h + EPS, `${media}:${w}x${h} QR inside the label`)
  }
  assert.throws(() => planV3Layout(ALL, 1, 1, "roll"))
})

test("captions are the full capital words", () => {
  assert.deepEqual(V3_CAPTIONS, {
    slip: "SLIP #", case: "CASE #", pan: "PAN #", pt: "PATIENT", ofc: "OFFICE", dr: "DOCTOR",
    stage: "STAGE #", pickup: "PICKUP", deliver: "DELIVER", status: "STATUS", location: "LOCATION",
  })
})

test("hidden fields leave no gap", () => {
  const std = planV3Layout(ALL, 4, 6, "roll")
  const noSlip = planV3Layout({ ...ALL, showSlipNumber: false }, 4, 6, "roll")
  assert.ok(!keys(noSlip).includes("slip"))
  near(px(cell(noSlip, "case").x), 268, "case stays at its own position")
  near(px(cell(noSlip, "pan").x), 326, "pan too")
  const noPan = planV3Layout({ ...ALL, showPan: false }, 4, 6, "roll")
  near(px(cell(noPan, "slip").x), 268, "slip moves right into the free column")
  near(px(cell(noPan, "case").x), 326, "case too (columns pack to the right edge)")
  assert.ok(noSlip.nameCell.w > std.nameCell.w)
  const onlyPan = planV3Layout({ ...ALL, showSlipNumber: false, showCaseNumber: false }, 4, 6, "roll")
  near(px(cell(onlyPan, "pan").x), 326, "pan stays at the right")
  const noHeader = planV3Layout({ ...ALL, showSlipNumber: false, showCaseNumber: false, showPan: false }, 4, 6, "roll")
  assert.ok(noHeader.nameCell.w > noSlip.nameCell.w)

  const noDoctor = planV3Layout({ ...ALL, showDoctor: false }, 4, 6, "roll")
  near(px(cell(noDoctor, "ofc").x), 10, "office")
  near(px(cell(noDoctor, "stage").x), 108, "stage takes the doctor position")
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
    out.push({ n: `${c.key}.value`, x: c.x, y: c.valueBase - 0.72 * vem, w: c.w, h: 0.72 * vem + 0.21 * vem + (c.maxLines - 1) * c.lineGap })
  }
  for (const [i, l] of p.statusLines.entries()) {
    const em = l.pt / 72
    out.push({ n: `statusLine${i}`, x: l.x, y: l.base - 0.72 * em, w: l.w, h: 0.93 * em })
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

test("2.25x1.25 prints row values at 14.5 px and pickup / delivery at 12.5 px; every other frame 15.5 and 13.5 px", () => {
  for (const f of Object.keys(V3_FRAMES)) {
    const { media, w, h } = sizeOf(f)
    const p = planV3Layout(ALL, w, h, media)
    const small = f === "roll:2.25x1.25"
    for (const k of ["ofc", "dr", "stage"]) near(cell(p, k).valuePt, (small ? 14.5 : 15.5) * 0.75, `${f} ${k}`)
    for (const k of ["pickup", "deliver"]) near(cell(p, k).valuePt, (small ? 12.5 : 13.5) * 0.75, `${f} ${k}`)
  }
})

test("RXN-103: custom sizes of any shape: inside the label, nothing overlaps", () => {
  for (const media of ["roll", "sheet"]) {
    for (let w = 2.25; w <= 8.5; w += 0.25) {
      for (let h = 1.25; h <= 11; h += 0.25) {
        const p = planV3Layout(ALL, w, h, media)
        const rs = inkRects(p)
        for (const r of rs) {
          assert.ok(r.x >= -EPS && r.y >= -EPS && r.x + r.w <= w + 0.01 && r.y + r.h <= h + 0.01, `${media} ${w}x${h} ${r.n} outside`)
        }
        for (let i = 0; i < rs.length; i++)
          for (let j = i + 1; j < rs.length; j++)
            assert.ok(!overlaps(rs[i], rs[j]), `${media} ${w}x${h} ${rs[i].n} overlaps ${rs[j].n}`)
      }
    }
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

// Status / location: [frame, kind, y, x]
const STATUS_FIGMA = [
  ["roll:4x6", "columns", 170, [10, 108]],
  ["roll:4x2.5", "columns", 130, [14, 108]],
  ["roll:4x2", "columns", 108, [14, 108]],
  ["roll:3x2", "columns", 108, [14, 90]],
  ["sheet:4x2.5", "columns", 130, [14, 108]],
  ["sheet:3.75x2", "columns", 108, [14, 104]],
  ["sheet:3.25x2.25", "columns", 108, [14, 96]],
  ["sheet:3.375x2.33", "columns", 114, [14, 98]],
  ["sheet:4x3", "columns", 154, [14, 108]],
  ["sheet:3x2", "columns", 108, [14, 90]],
  ["sheet:4x2", "line", 114, 14],
]
const NO_STATUS = ["roll:2.25x1.25", "sheet:2.5x2.5"]

test("status and location sit where each Figma frame puts them; 2.25x1.25 and sheet 2.5x2.5 have none", () => {
  for (const key of NO_STATUS) {
    const { media, w, h } = sizeOf(key)
    assert.equal(V3_FRAMES[key].status, undefined, key)
    const p = planV3Layout(ALL, w, h, media)
    assert.equal(p.statusLines.length, 0)
    assert.ok(!p.cells.some((c) => c.key === "status" || c.key === "location"), key)
  }
  assert.equal(STATUS_FIGMA.length + NO_STATUS.length, 13)
  for (const [key, kind, y, x] of STATUS_FIGMA) {
    const { media, w, h } = sizeOf(key)
    const p = planV3Layout(ALL, w, h, media)
    const sb = V3_FRAMES[key].status
    assert.equal(sb.kind, kind, key)
    near(sb.y, y, `${key} y`)
    if (kind === "columns") {
      const st = cell(p, "status"), loc = cell(p, "location")
      near(st.x * 96, x[0], `${key} status x`)
      near(loc.x * 96, x[1], `${key} location x`)
      near(st.labelBase, (y + 12.5 * 0.92) / 96, `${key} caption y`)
      near(st.valueBase, (y + 14 + 12.5 * 0.92) / 96, `${key} value y`)
      assert.equal(loc.maxLines, 2, `${key} location wraps to 2 lines`)
      assert.ok(loc.w * 96 > 0 && loc.w * 96 <= 135 + 1e-6, `${key} location box up to 135 px`)
      near(loc.lineGap * 96, 13, `${key} line gap`)
      assert.equal(p.statusLines.length, 0)
      assert.ok(st.w > 0 && st.x + st.w <= loc.x + 1e-9, `${key} slots`)
    } else {
      assert.equal(p.statusLines.length, 1, key)
      near(p.statusLines[0].x * 96, x, `${key} x`)
      near(p.statusLines[0].base, (y + 12.5 * 0.92) / 96, `${key} line y`)
      assert.deepEqual(p.statusLines[0].keys, ["status", "location"])
    }
  }
})

test("status and location are hidden by the Status switch", () => {
  for (const { media, widthIn: w, heightIn: h } of V3_SIZES) {
    const p = planV3Layout({ ...ALL, showStatus: false }, w, h, media)
    assert.equal(p.statusLines.length, 0)
    assert.ok(!p.cells.some((c) => c.key === "status" || c.key === "location"))
  }
})

test("the rule never touches the QR code and the 2-line location block ends above the rule", () => {
  for (const { media, widthIn: w, heightIn: h } of V3_SIZES) {
    const p = planV3Layout(ALL, w, h, media)
    if (p.rule && p.qr) {
      const hitsQr = p.rule.y >= p.qr.y - 1e-9 && p.rule.y <= p.qr.y + p.qr.h && p.rule.x + p.rule.w > p.qr.x - 1e-9
      assert.ok(!hitsQr, `${media} ${w}x${h} rule meets the QR code`)
    }
    const loc = p.cells.find((c) => c.key === "location")
    if (loc && p.rule) {
      const bottom = loc.valueBase + loc.lineGap + 0.21 * (loc.valuePt / 72)
      assert.ok(bottom <= p.rule.y + 1e-9, `${media} ${w}x${h} second location line reaches the rule`)
    }
  }
})
