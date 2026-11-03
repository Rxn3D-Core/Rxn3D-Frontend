// Run: node --import ./test-alias-loader.mjs --test lib/modal-submit.test.mjs
// RXN-44: reason modals stay busy (and keep their form) until the submit promise settles.
import assert from "node:assert/strict"
import test from "node:test"
import { runModalSubmit } from "../lib/modal-submit.ts"

const deferred = () => {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

test("busy while the request runs, idle after success", async () => {
  const inFlight = { current: false }
  const busy = []
  const d = deferred()
  const run = runModalSubmit(inFlight, (v) => busy.push(v), () => d.promise)
  assert.deepEqual(busy, [true])
  assert.equal(inFlight.current, true)
  d.resolve()
  assert.equal(await run, "settled")
  assert.deepEqual(busy, [true, false])
  assert.equal(inFlight.current, false)
})

test("a second submit while in flight is skipped", async () => {
  const inFlight = { current: false }
  let calls = 0
  const d = deferred()
  const first = runModalSubmit(inFlight, () => {}, () => { calls++; return d.promise })
  assert.equal(await runModalSubmit(inFlight, () => {}, () => { calls++; return d.promise }), "skipped")
  assert.equal(calls, 1)
  d.resolve()
  await first
})

test("a failed request clears busy without throwing, so the modal stays usable", async () => {
  const inFlight = { current: false }
  const busy = []
  const d = deferred()
  const run = runModalSubmit(inFlight, (v) => busy.push(v), () => d.promise)
  d.reject(new Error("500"))
  assert.equal(await run, "settled")
  assert.deepEqual(busy, [true, false])
  assert.equal(inFlight.current, false)
})

test("a callback that returns nothing is reported as sync and never sets busy", async () => {
  const inFlight = { current: false }
  const busy = []
  assert.equal(await runModalSubmit(inFlight, (v) => busy.push(v), () => undefined), "sync")
  assert.deepEqual(busy, [])
})
