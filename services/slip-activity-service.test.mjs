// Run: node --import ./test-alias-loader.mjs --test services/slip-activity-service.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import {
  fetchSlipActivityEvents,
  fetchSlipActivityExport,
  fetchSlipActivityStatuses,
  isSlipActivityForbidden,
  SlipActivityApiError,
} from "./slip-activity-service.ts"

const filters = {
  fromDate: "2026-10-01",
  toDate: "2026-10-27",
  locationIds: [3],
  page: 2,
  perPage: 25,
  sort: "office_name",
  direction: "asc",
}
const realFetch = globalThis.fetch

function stubFetch(status, body, contentType = "application/json") {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const payload = typeof body === "string" ? body : JSON.stringify(body)
    return new Response(payload, { status, headers: { "Content-Type": contentType } })
  }
  return calls
}

test.afterEach(() => {
  globalThis.fetch = realFetch
})

test("statuses and events hit the contract paths with the filter query", async () => {
  const calls = stubFetch(200, { success: true, message: "ok", data: [] })
  await fetchSlipActivityStatuses()
  await fetchSlipActivityEvents(filters)
  assert.match(calls[0].url, /\/slip-activity\/statuses$/)
  const url = new URL(calls[1].url, "http://x")
  assert.equal(url.pathname.endsWith("/slip-activity/events"), true)
  assert.deepEqual(url.searchParams.getAll("location_ids[]"), ["3"])
  assert.equal(url.searchParams.get("page"), "2")
  assert.equal(url.searchParams.get("sort"), "office_name")
  assert.equal(url.searchParams.get("direction"), "asc")
  assert.equal(calls[1].init.method, "GET")
})

test("403 becomes a forbidden SlipActivityApiError with the backend message", async () => {
  stubFetch(403, { success: false, message: "This page is only available to lab users.", error: "lab_role_required" })
  await assert.rejects(fetchSlipActivityEvents(filters), (error) => {
    assert.ok(error instanceof SlipActivityApiError)
    assert.equal(error.status, 403)
    assert.equal(error.message, "This page is only available to lab users.")
    assert.equal(isSlipActivityForbidden(error), true)
    return true
  })
})

test("422 export cap is not forbidden and keeps its message", async () => {
  const message = "Too many rows to export (12450). Narrow the date range or statuses to 10000 rows or fewer."
  stubFetch(422, { message, errors: { export: [message] } })
  await assert.rejects(fetchSlipActivityExport(filters, "csv"), (error) => {
    assert.equal(error.status, 422)
    assert.equal(error.message, message)
    assert.equal(isSlipActivityForbidden(error), false)
    return true
  })
})

test("export returns the file body as a blob", async () => {
  const calls = stubFetch(200, "Date/time,Slip number\n", "text/csv; charset=UTF-8")
  const blob = await fetchSlipActivityExport(filters, "csv")
  assert.equal(await blob.text(), "Date/time,Slip number\n")
  const url = new URL(calls[0].url, "http://x")
  assert.equal(url.pathname.endsWith("/slip-activity/events/export"), true)
  assert.equal(url.searchParams.get("format"), "csv")
  assert.equal(url.searchParams.get("sort"), "office_name")
  assert.equal(url.searchParams.get("direction"), "asc")
  assert.equal(url.searchParams.get("tz"), null)
})

test("non-JSON error body falls back to the status text", async () => {
  stubFetch(500, "<html>oops</html>", "text/html")
  await assert.rejects(fetchSlipActivityStatuses(), /HTTP error! status: 500/)
})
