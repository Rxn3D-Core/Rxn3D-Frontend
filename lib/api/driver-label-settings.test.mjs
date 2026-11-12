// Run: node --import ./test-alias-loader.mjs --test lib/api/driver-label-settings.test.mjs
import assert from "node:assert/strict"
import test from "node:test"

process.env.NEXT_PUBLIC_API_BASE_URL = "http://mock.test/v1"
globalThis.localStorage = { getItem: () => "tok", setItem() {}, removeItem() {} }
globalThis.window = { location: { href: "" } }

const { getDriverLabelSettings, saveDriverLabelSettings } = await import("./driver-label-settings.ts")
const { defaultDriverLabelPrintSettings } = await import("../driver-labels/label-print-settings.ts")

const API_SETTINGS = {
  show_doctor: false, show_stage: true, show_pan: true, show_product: false,
  show_status: true, compact_abbreviations: true, show_dividers: false, uppercase_status: true,
}

function mockFetch(status, body) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return { ok: status >= 200 && status < 300, status, json: async () => body }
  }
  return calls
}

test("GET reads the lab-wide setting and the edit flag", async () => {
  const calls = mockFetch(200, { success: true, data: { lab_id: 1, is_default: false, can_edit: true, settings: API_SETTINGS } })
  const r = await getDriverLabelSettings()
  assert.equal(calls[0].url, "http://mock.test/v1/slip-settings/driver-label")
  assert.equal(calls[0].init.method, "GET")
  assert.equal(r.canEdit, true)
  assert.equal(r.settings.showDoctor, false)
  assert.equal(r.settings.showDividers, false)
  assert.equal(r.settings.showStage, true)
})

test("a non-admin reads can_edit false", async () => {
  mockFetch(200, { success: true, data: { lab_id: 1, is_default: true, can_edit: false, settings: API_SETTINGS } })
  assert.equal((await getDriverLabelSettings()).canEdit, false)
})

test("GET failure rejects so the modal can show the load notice", async () => {
  mockFetch(500, { message: "boom" })
  await assert.rejects(getDriverLabelSettings(), /boom/)
})

test("PUT sends the snake_case body and returns the saved values", async () => {
  const calls = mockFetch(200, { success: true, data: { lab_id: 1, is_default: false, can_edit: true, settings: API_SETTINGS } })
  const draft = { ...defaultDriverLabelPrintSettings(), showDoctor: false }
  const r = await saveDriverLabelSettings(draft)
  assert.equal(calls[0].url, "http://mock.test/v1/slip-settings/driver-label")
  assert.equal(calls[0].init.method, "PUT")
  const sent = JSON.parse(calls[0].init.body)
  assert.equal(sent.show_doctor, false)
  assert.equal("scope" in sent, false)
  assert.equal(r.settings.showProduct, false)
})

test("PUT 403 and 422 reject with the API message (not shown as saved)", async () => {
  mockFetch(403, { success: false, message: "Only lab admins can change the driver label settings." })
  await assert.rejects(saveDriverLabelSettings(defaultDriverLabelPrintSettings()), /Only lab admins/)
  mockFetch(422, { status: false, message: "invalid" })
  await assert.rejects(saveDriverLabelSettings(defaultDriverLabelPrintSettings()), /invalid/)
})
