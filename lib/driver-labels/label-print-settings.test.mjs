// Run: node --import ./test-alias-loader.mjs --test lib/driver-labels/label-print-settings.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import {
  officeText,
  DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  defaultDriverLabelPrintSettings,
  driverLabelSettingsFromApi,
  driverLabelSettingsToApi,
  fieldLabel,
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
  logo_outline: false,
  label_design: "classic",
  logo_source: "none",
  office_display: "code",
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
  for (const [k, v] of Object.entries(s)) if (!["scope", "labelDesign", "logoSource", "officeDisplay"].includes(k)) assert.equal(v, false, k)
  assert.equal(s.labelDesign, "classic")
  assert.equal(s.logoSource, "none")
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

test("compact field names are short with only the first letter capital (RXN-64)", () => {
  const wanted = {
    pt: "Pt:",
    ofc: "Ofc:",
    dr: "Dr:",
    case: "Case #",
    slip: "Slip #",
    stage: "Stg:",
    pan: "Pan #",
    prod: "Prod:",
    status: "Sts:",
    pickup: "Pku:",
    deliver: "Del:",
  }
  for (const [key, name] of Object.entries(wanted)) assert.equal(fieldLabel(key, true), name, key)
})

test("full field names are unchanged when compact abbreviations are off", () => {
  const full = {
    pt: "Patient",
    ofc: "Office",
    dr: "Doctor",
    case: "Case #",
    slip: "Slip #",
    stage: "Stage",
    pan: "Pan #",
    prod: "Product",
    status: "Status",
    pickup: "Pickup",
    deliver: "Deliver",
  }
  for (const [key, name] of Object.entries(full)) assert.equal(fieldLabel(key, false), name, key)
})

test("no field name ends with a space or doubles its colon", () => {
  for (const compact of [true, false]) {
    for (const key of ["pt", "ofc", "dr", "case", "slip", "stage", "pan", "prod", "status", "pickup", "deliver"]) {
      const name = fieldLabel(key, compact)
      assert.equal(name, name.trim(), key)
      assert.equal(name.includes("::"), false, key)
    }
  }
})

test("RXN-65: design, logo source and outline default for an older API and for unknown values", () => {
  for (const values of [{}, null, { label_design: "fancy", logo_source: "http://x", logo_outline: "yes" }, { label_design: 3, logo_source: null }]) {
    const s = driverLabelSettingsFromApi(values)
    assert.equal(s.labelDesign, "classic")
    assert.equal(s.logoSource, "none")
    assert.equal(s.logoOutline, true)
  }
  assert.equal(DEFAULT_DRIVER_LABEL_PRINT_SETTINGS.labelDesign, "classic")
})

test("RXN-65: design, logo source and outline round-trip through the API mapping", () => {
  const draft = { ...defaultDriverLabelPrintSettings(), labelDesign: "centered", logoSource: "custom", logoOutline: false }
  const body = driverLabelSettingsToApi(draft)
  assert.equal(body.label_design, "centered")
  assert.equal(body.logo_source, "custom")
  assert.equal(body.logo_outline, false)
  assert.equal("custom_logo_url" in body, false)
  assert.deepEqual(driverLabelSettingsFromApi(body), draft)
})

test("RXN-65: office display defaults to code, maps both ways, unknown values fall back", () => {
  assert.equal(driverLabelSettingsFromApi({}).officeDisplay, "code")
  assert.equal(driverLabelSettingsFromApi({ office_display: "full" }).officeDisplay, "code")
  const draft = { ...defaultDriverLabelPrintSettings(), officeDisplay: "name" }
  assert.equal(driverLabelSettingsToApi(draft).office_display, "name")
  assert.deepEqual(driverLabelSettingsFromApi(driverLabelSettingsToApi(draft)), draft)
})

test("RXN-65: officeText prints the name only when asked and available, else the code", () => {
  const slip = { office_code: "DOH", office_name: "Downtown Oral Health" }
  assert.equal(officeText(slip, "code"), "DOH")
  assert.equal(officeText(slip, "name"), "Downtown Oral Health")
  assert.equal(officeText({ office_code: "DOH" }, "name"), "DOH")
  assert.equal(officeText({ office_code: "DOH", office_name: "N/A" }, "name"), "DOH")
  assert.equal(officeText({ office_code: "DOH", office_name: "  " }, "name"), "DOH")
})
