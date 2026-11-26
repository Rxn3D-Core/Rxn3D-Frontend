// Run: node --import ./test-alias-loader.mjs --test services/customer-timezone-service.test.mjs
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { timezoneFieldError, updateCustomerTimezone } from "./customer-timezone-service.ts"

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../tests/fixtures/rxn-123/${name}`, import.meta.url), "utf8"))

let calls = []
function mockFetch(status, body) {
  calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
  }
}

test("sends only the timezone with PUT and returns the stored zone", async () => {
  mockFetch(200, fixture("customer-ny-lab.json"))
  assert.equal(await updateCustomerTimezone(42, "America/New_York"), "America/New_York")
  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /\/customers\/42$/)
  assert.equal(calls[0].init.method, "PUT")
  assert.deepEqual(JSON.parse(calls[0].init.body), { timezone: "America/New_York" })
})

test("422 bodies surface the data.timezone field error (invalid zone, beta gate)", async () => {
  const bodies = fixture("customer-update-422.json")
  for (const key of ["invalid", "not_available", "with_other_field"]) {
    mockFetch(422, bodies[key])
    await assert.rejects(updateCustomerTimezone(42, "Mars/Base"), { message: bodies[key].data.timezone[0] }, key)
  }
})

test("field errors are read from data.timezone, then errors.timezone", () => {
  assert.equal(timezoneFieldError({ data: { timezone: ["a"] }, errors: { timezone: ["b"] } }), "a")
  assert.equal(timezoneFieldError({ message: "x", errors: { timezone: ["b"] } }), "b")
  assert.equal(timezoneFieldError({ status: false, message: "x", data: { name: ["n"] } }), null)
  assert.equal(timezoneFieldError(null), null)
})

test("other errors keep the backend message", async () => {
  mockFetch(403, { status: false, message: "Unauthorized access.", error: "authorization_failed" })
  await assert.rejects(updateCustomerTimezone(42, "America/New_York"), { message: "Unauthorized access." })
})

test("a backend without B1 (no timezone in the response) is reported as not saved", async () => {
  mockFetch(200, { message: "Customer updated successfully", data: { id: 42, name: "Empire Dental Lab" } })
  await assert.rejects(updateCustomerTimezone(42, "America/New_York"), {
    message: "Timezone selection is not available yet.",
  })
})
