// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-print-settings.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  defaultDriverLabelPrintSettings,
  driverLabelSettingsFromApi,
  driverLabelSettingsToApi,
} from "./label-print-settings.ts"
import * as settingsModule from "./label-print-settings.ts"

const ALL_FALSE_API = {
  show_doctor: false,
  show_stage: false,
  show_pan: false,
  show_product: false,
  show_status: false,
  show_case_number: false,
  show_slip_number: false,
  show_qr_code: false,
  show_pickup: false,
  show_delivery: false,
  compact_abbreviations: false,
  show_dividers: false,
  uppercase_status: false,
}

test("localStorage helpers are gone", () => {
  assert.equal("loadDriverLabelPrintSettings" in settingsModule, false)
  assert.equal("saveDriverLabelPrintSettings" in settingsModule, false)
})

test("missing or empty API values fall back to the defaults", () => {
  assert.deepEqual(driverLabelSettingsFromApi(null), DEFAULT_DRIVER_LABEL_PRINT_SETTINGS)
  assert.deepEqual(driverLabelSettingsFromApi({}), DEFAULT_DRIVER_LABEL_PRINT_SETTINGS)
})

test("API values map to print settings, scope is always all", () => {
  const s = driverLabelSettingsFromApi(ALL_FALSE_API)
  assert.equal(s.scope, "all")
  for (const [k, v] of Object.entries(s)) if (k !== "scope") assert.equal(v, false, k)
})

test("non-boolean API values are ignored", () => {
  const s = driverLabelSettingsFromApi({ show_doctor: "no", show_stage: 0, show_pan: false })
  assert.equal(s.showDoctor, true)
  assert.equal(s.showStage, true)
  assert.equal(s.showPan, false)
})

test("print settings map to the PUT body without scope, and round-trip", () => {
  const draft = { ...defaultDriverLabelPrintSettings(), showDoctor: false, uppercaseStatus: false }
  const body = driverLabelSettingsToApi(draft)
  assert.equal("scope" in body, false)
  assert.deepEqual(Object.keys(body).sort(), Object.keys(ALL_FALSE_API).sort())
  assert.equal(body.show_doctor, false)
  assert.equal(body.uppercase_status, false)
  assert.equal(body.show_stage, true)
  assert.deepEqual(driverLabelSettingsFromApi(body), draft)
})

test("defaultDriverLabelPrintSettings returns an independent copy", () => {
  const a = defaultDriverLabelPrintSettings()
  a.showDoctor = false
  assert.equal(DEFAULT_DRIVER_LABEL_PRINT_SETTINGS.showDoctor, true)
})

test("RXN-66: the five new keys default to true when an older API omits them", () => {
  const s = driverLabelSettingsFromApi({ show_doctor: false, show_stage: false })
  for (const k of ["showCaseNumber", "showSlipNumber", "showQrCode", "showPickup", "showDelivery"]) {
    assert.equal(s[k], true, k)
  }
  assert.equal(s.showDoctor, false)
})

test("RXN-66: the new keys map both ways", () => {
  const draft = { ...defaultDriverLabelPrintSettings(), showQrCode: false, showDelivery: false }
  const body = driverLabelSettingsToApi(draft)
  assert.equal(body.show_qr_code, false)
  assert.equal(body.show_delivery, false)
  assert.equal(body.show_case_number, true)
  assert.deepEqual(driverLabelSettingsFromApi(body), draft)
})

test("RXN-66: only lab name, patient and office are locked; the rest are optional", () => {
  assert.deepEqual([...settingsModule.DRIVER_LABEL_LOCKED_FIELDS], ["Lab name", "Patient", "Office"])
  assert.deepEqual(
    settingsModule.DRIVER_LABEL_OPTIONAL_FIELDS.map((f) => f.key),
    ["showDoctor", "showStage", "showPan", "showProduct", "showStatus", "showCaseNumber", "showSlipNumber", "showQrCode", "showPickup", "showDelivery"],
  )
  const qr = settingsModule.DRIVER_LABEL_OPTIONAL_FIELDS.find((f) => f.key === "showQrCode")
  assert.ok(qr.hint)
})
