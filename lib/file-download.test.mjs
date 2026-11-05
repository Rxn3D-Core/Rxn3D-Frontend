import assert from "node:assert/strict"
import test from "node:test"
import { downloadFromS3 } from "./file-download.ts"

const URL_S3 = "https://rxn3d-media-files.s3.us-west-2.amazonaws.com/a/b.stl?X-Amz-Signature=abc"

function stubBrowser(fetchImpl) {
  const calls = { fetched: [], clicked: [], opened: [] }
  globalThis.fetch = async (url) => {
    calls.fetched.push(url)
    return fetchImpl(url)
  }
  globalThis.document = {
    createElement: () => {
      const a = { href: "", download: "", click: () => calls.clicked.push({ href: a.href, download: a.download }) }
      return a
    },
  }
  globalThis.window = { open: (...args) => calls.opened.push(args) }
  URL.createObjectURL = () => "blob:test/1"
  URL.revokeObjectURL = () => {}
  return calls
}

test("fetches the S3 URL unchanged and saves it under the file name", async () => {
  const calls = stubBrowser(() => new Response("solid x"))
  await downloadFromS3(URL_S3, "Upper jaw.stl")
  assert.deepEqual(calls.fetched, [URL_S3])
  assert.deepEqual(calls.clicked, [{ href: "blob:test/1", download: "Upper jaw.stl" }])
  assert.equal(calls.opened.length, 0)
})

test("opens the S3 URL in a new tab when the fetch fails", async () => {
  for (const impl of [() => { throw new TypeError("Failed to fetch") }, () => new Response("", { status: 403 })]) {
    const calls = stubBrowser(impl)
    await downloadFromS3(URL_S3, "b.stl")
    assert.equal(calls.clicked.length, 0)
    assert.deepEqual(calls.opened, [[URL_S3, "_blank", "noopener,noreferrer"]])
  }
})
