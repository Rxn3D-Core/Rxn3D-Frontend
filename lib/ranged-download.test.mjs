import assert from "node:assert/strict"
import test from "node:test"
import { chunkSizeFor, downloadRanged, RangedDownloadUnsupported } from "./ranged-download.ts"

const MB = 1024 * 1024
const URL = "https://rxn3d-prod-files.s3.us-west-2.amazonaws.com/a/b.stl"

function makeFile(size) {
  const data = new Uint8Array(size)
  for (let i = 0; i < size; i++) data[i] = (i * 31 + 7) % 251
  return data
}

/** Fake S3: serves HEAD and Range GETs from `data`. */
function fakeS3(data, { etag = '"abc"', failFirstN = 0, status206 = 206, headStatus = 200 } = {}) {
  const calls = { head: 0, ranges: [], maxConcurrent: 0 }
  let concurrent = 0
  let failures = 0
  const impl = async (_url, init = {}) => {
    if (init.method === "HEAD") {
      calls.head++
      return new Response(null, {
        status: headStatus,
        headers: { "content-length": String(data.byteLength), etag },
      })
    }
    const range = init.headers?.Range
    const [, s, e] = /bytes=(\d+)-(\d+)/.exec(range)
    calls.ranges.push(range)
    concurrent++
    calls.maxConcurrent = Math.max(calls.maxConcurrent, concurrent)
    try {
      await new Promise((r) => setTimeout(r, 5))
      if (failures < failFirstN) {
        failures++
        throw new Error("network blip")
      }
      return new Response(data.slice(Number(s), Number(e) + 1), { status: status206, headers: { etag } })
    } finally {
      concurrent--
    }
  }
  return { impl, calls }
}

test("chunkSizeFor stays within 2 MB and 16 MB", () => {
  assert.equal(chunkSizeFor(5 * MB), 2 * MB)
  assert.equal(chunkSizeFor(61_697_784), Math.ceil(61_697_784 / 12))
  assert.equal(chunkSizeFor(900 * MB), 16 * MB)
})

test("reassembles the file from parallel range requests", async () => {
  const data = makeFile(20 * MB + 123)
  const { impl, calls } = fakeS3(data)
  const progress = []
  const buf = await downloadRanged(URL, { fetchImpl: impl, onProgress: (l, t) => progress.push([l, t]) })
  assert.deepEqual(new Uint8Array(buf), data)
  assert.equal(calls.head, 1)
  assert.ok(calls.ranges.length > 1)
  assert.ok(calls.maxConcurrent > 1, "chunks should download in parallel")
  assert.ok(calls.maxConcurrent <= 6, "never more than 6 requests in flight")
  assert.deepEqual(progress.at(-1), [data.byteLength, data.byteLength])
})

test("retries a failed chunk", async () => {
  const data = makeFile(10 * MB)
  const { impl } = fakeS3(data, { failFirstN: 2 })
  const buf = await downloadRanged(URL, { fetchImpl: impl })
  assert.deepEqual(new Uint8Array(buf), data)
})

test("throws Unsupported when the server ignores Range (200 instead of 206)", async () => {
  const { impl } = fakeS3(makeFile(10 * MB), { status206: 200 })
  await assert.rejects(downloadRanged(URL, { fetchImpl: impl }), RangedDownloadUnsupported)
})

test("throws Unsupported for small files and when HEAD is rejected", async () => {
  await assert.rejects(downloadRanged(URL, { fetchImpl: fakeS3(makeFile(1 * MB)).impl }), RangedDownloadUnsupported)
  await assert.rejects(
    downloadRanged(URL, { fetchImpl: fakeS3(makeFile(10 * MB), { headStatus: 403 }).impl }),
    RangedDownloadUnsupported,
  )
})

test("fails when a chunk comes from a different file version", async () => {
  const data = makeFile(10 * MB)
  const { impl } = fakeS3(data)
  const mismatched = async (u, init = {}) => {
    const res = await impl(u, init)
    if (init.method === "HEAD") return res
    return new Response(await res.arrayBuffer(), { status: 206, headers: { etag: '"other"' } })
  }
  await assert.rejects(downloadRanged(URL, { fetchImpl: mismatched }), /file changed/)
})
