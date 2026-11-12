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
