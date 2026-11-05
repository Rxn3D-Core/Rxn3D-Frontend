import assert from "node:assert/strict"
import test from "node:test"
import { createSharedDownloadCache } from "./shared-download-cache.ts"

const buf = (n) => new ArrayBuffer(n)

test("callers asking while a download runs share it and all see progress", async () => {
  const cache = createSharedDownloadCache(1000)
  let starts = 0
  let finish
  const start = (emit) => {
    starts++
    emit({ pct: 10 })
    return new Promise((r) => (finish = () => r(buf(10))))
  }
  const seenA = []
  const seenB = []
  const a = cache.get("k", start, (p) => seenA.push(p.pct))
  const b = cache.get("k", start, (p) => seenB.push(p.pct)) // joins; replays last progress
  finish()
  const [ra, rb] = await Promise.all([a, b])
  assert.equal(starts, 1)
  assert.equal(ra, rb)
  assert.deepEqual(seenA, [10])
  assert.deepEqual(seenB, [10])
})

test("a later caller gets the finished bytes without downloading again", async () => {
  const cache = createSharedDownloadCache(1000)
  let starts = 0
  const start = async () => (starts++, buf(10))
  const first = await cache.get("k", start)
  const second = await cache.get("k", start)
  assert.equal(starts, 1)
  assert.equal(first, second)
})

test("a failed download is not remembered", async () => {
  const cache = createSharedDownloadCache(1000)
  let starts = 0
  const start = async () => {
    starts++
    if (starts === 1) throw new Error("boom")
    return buf(10)
  }
  await assert.rejects(cache.get("k", start), /boom/)
  await cache.get("k", start)
  assert.equal(starts, 2)
})

test("evicts the oldest finished download when over the byte limit, never the newest", async () => {
  const cache = createSharedDownloadCache(25)
  const starts = { a: 0, b: 0, c: 0 }
  const make = (k) => async () => (starts[k]++, buf(10))
  await cache.get("a", make("a"))
  await cache.get("b", make("b"))
  await cache.get("c", make("c")) // total 30 > 25, so "a" is dropped
  await cache.get("c", make("c"))
  await cache.get("b", make("b"))
  assert.equal(starts.c, 1)
  assert.equal(starts.b, 1)
  await cache.get("a", make("a"))
  assert.equal(starts.a, 2)
})

test("an unsubscribed caller stops receiving progress", async () => {
  const cache = createSharedDownloadCache(1000)
  let emitFn
  let finish
  const start = (emit) => {
    emitFn = emit
    return new Promise((r) => (finish = () => r(buf(5))))
  }
  const seen = []
  const first = cache.get("k", start, (p) => seen.push(p))
  const second = cache.get("k", start)
  emitFn(1)
  finish()
  await Promise.all([first, second])
  emitFn(2)
  assert.deepEqual(seen, [1])
})
