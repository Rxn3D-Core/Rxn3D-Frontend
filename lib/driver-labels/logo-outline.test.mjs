// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/logo-outline.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { logoToOutlineRgba } from "./logo-outline.ts"

function image(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(fn(x, y), (y * w + x) * 4)
  return d
}
const px = (out, w, x, y) => out.data[(y * w + x) * 4]

test("a solid square becomes a ring: the inside and the far outside turn white", () => {
  const W = 40
  const src = image(W, W, (x, y) => (x >= 10 && x < 30 && y >= 10 && y < 30 ? [20, 60, 200, 255] : [255, 255, 255, 255]))
  const out = logoToOutlineRgba(src, W, W, true)
  assert.equal(out.blank, false)
  assert.equal(px(out, W, 20, 20), 255, "inside is white")
  assert.equal(px(out, W, 2, 2), 255, "background is white")
  assert.equal(px(out, W, 10, 20) === 0 || px(out, W, 9, 20) === 0, true, "the border is black")
  assert.equal(px(out, W, 20, 10) === 0 || px(out, W, 20, 9) === 0, true)
})

test("transparent pixels count as white", () => {
  const W = 30
  const src = image(W, W, (x, y) => (x >= 8 && x < 22 && y >= 8 && y < 22 ? [0, 0, 0, 255] : [0, 0, 0, 0]))
  const out = logoToOutlineRgba(src, W, W, true)
  assert.equal(px(out, W, 1, 1), 255)
  assert.equal(px(out, W, 15, 15), 255)
  assert.equal(out.blank, false)
})

test("a logo that touches the image border still gets a closed outline", () => {
  const W = 20
  const src = image(W, W, () => [0, 0, 0, 255])
  const out = logoToOutlineRgba(src, W, W, true)
  assert.equal(px(out, W, 0, 10), 0)
  assert.equal(px(out, W, 10, 10), 255)
})

test("a fully white or fully transparent image is blank (the caller prints the lab name)", () => {
  const W = 16
  assert.equal(logoToOutlineRgba(image(W, W, () => [255, 255, 255, 255]), W, W, true).blank, true)
  assert.equal(logoToOutlineRgba(image(W, W, () => [0, 0, 0, 0]), W, W, true).blank, true)
  assert.equal(logoToOutlineRgba(image(W, W, () => [255, 255, 255, 255]), W, W, false).blank, true)
})

test("outline off keeps the picture, flattened onto white", () => {
  const W = 10
  const src = image(W, W, (x) => (x < 5 ? [0, 0, 0, 255] : [0, 0, 0, 0]))
  const out = logoToOutlineRgba(src, W, W, false)
  assert.equal(px(out, W, 1, 1), 0)
  assert.equal(px(out, W, 8, 1), 255)
  assert.equal(out.blank, false)
  for (let i = 3; i < out.data.length; i += 4) assert.equal(out.data[i], 255)
})

test("output is opaque black and white only when outlined", () => {
  const W = 24
  const out = logoToOutlineRgba(image(W, W, (x) => (x > 12 ? [255, 0, 0, 255] : [255, 255, 255, 255])), W, W, true)
  for (let i = 0; i < W * W; i++) {
    assert.ok(out.data[i * 4] === 0 || out.data[i * 4] === 255)
    assert.equal(out.data[i * 4 + 3], 255)
  }
})
