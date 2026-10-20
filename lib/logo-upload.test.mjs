import assert from "node:assert/strict"
import test from "node:test"
import { LOGO_SIZE_ERROR, LOGO_TYPE_ERROR, validateLogoFile } from "./logo-upload.ts"

const file = (name, type, bytes = 10) => new File([new Uint8Array(bytes)], name, { type })

test("PNG and JPG logos are accepted, whatever the letter case", () => {
  for (const [name, type] of [
    ["logo.png", "image/png"],
    ["logo.jpg", "image/jpeg"],
    ["logo.jpeg", "image/jpeg"],
    ["logo.jpg", "image/jpg"],
    ["LOGO.PNG", "image/png"],
    ["My Lab Logo.Jpeg", "image/jpeg"],
  ]) {
    assert.equal(validateLogoFile(file(name, type)), null, name)
  }
})

test("SVG logos are rejected, including an SVG saved under a .png name", () => {
  assert.equal(validateLogoFile(file("logo.svg", "image/svg+xml")), LOGO_TYPE_ERROR)
  assert.equal(validateLogoFile(file("LOGO.SVG", "image/svg+xml")), LOGO_TYPE_ERROR)
  assert.equal(validateLogoFile(file("logo.png", "image/svg+xml")), LOGO_TYPE_ERROR)
  assert.equal(validateLogoFile(file("logo.svg", "image/png")), LOGO_TYPE_ERROR)
  assert.equal(validateLogoFile(file("logo.svg", "")), LOGO_TYPE_ERROR)
})

test("other formats and files with no extension are rejected", () => {
  for (const [name, type] of [
    ["logo.gif", "image/gif"],
    ["logo.webp", "image/webp"],
    ["logo.pdf", "application/pdf"],
    ["logo", "image/png"],
    ["logo.png.exe", "image/png"],
  ]) {
    assert.equal(validateLogoFile(file(name, type)), LOGO_TYPE_ERROR, name)
  }
})

test("a system that reports an empty type still gets the extension check (the server checks the content)", () => {
  assert.equal(validateLogoFile(file("logo.png", "")), null)
  assert.equal(validateLogoFile(file("logo.jpg", "")), null)
})

test("logos over 1 MB are rejected, exactly 1 MB is fine", () => {
  assert.equal(validateLogoFile(file("logo.png", "image/png", 1024 * 1024)), null)
  assert.equal(validateLogoFile(file("logo.png", "image/png", 1024 * 1024 + 1)), LOGO_SIZE_ERROR)
})
