import assert from "node:assert/strict"
import test from "node:test"
import { fromProxiedFileUrl, getStlSourceUrls, isS3Url, toProxiedFileUrl } from "./file-proxy.ts"

const S3 = "https://rxn3d-media-files.s3.us-west-2.amazonaws.com/cases/12/upper jaw.stl"
const PRESIGNED =
  "https://rxn3d-prod-files.s3.us-west-2.amazonaws.com/a/b.stl?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc%2Bdef"

test("isS3Url accepts only our buckets", () => {
  assert.equal(isS3Url(S3), true)
  assert.equal(isS3Url(PRESIGNED), true)
  assert.equal(isS3Url("https://evil.example.com/x.stl"), false)
  assert.equal(isS3Url("https://rxn3d-media-files.s3.us-west-2.amazonaws.com.evil.com/x"), false)
  assert.equal(isS3Url("blob:http://localhost:3000/123"), false)
  assert.equal(isS3Url("not a url"), false)
})

test("fromProxiedFileUrl reverses toProxiedFileUrl exactly", () => {
  for (const url of [S3, PRESIGNED]) {
    assert.equal(fromProxiedFileUrl(toProxiedFileUrl(url)), url)
  }
  assert.equal(fromProxiedFileUrl(S3), S3)
  assert.equal(fromProxiedFileUrl("/api/other?url=x"), "/api/other?url=x")
  assert.equal(fromProxiedFileUrl(""), "")
})

test("S3 STLs load direct first, then via the proxy", () => {
  assert.deepEqual(getStlSourceUrls(S3), [S3, toProxiedFileUrl(S3)])
  // presigned URLs keep their query untouched
  assert.deepEqual(getStlSourceUrls(PRESIGNED), [PRESIGNED, toProxiedFileUrl(PRESIGNED)])
})

test("direct and proxied URLs for one file share the cache key", () => {
  assert.equal(getStlSourceUrls(toProxiedFileUrl(S3))[0], getStlSourceUrls(S3)[0])
  assert.deepEqual(getStlSourceUrls(toProxiedFileUrl(S3)), getStlSourceUrls(S3))
})

test("blob, relative and foreign STLs load as given with no fallback", () => {
  for (const url of ["blob:http://localhost:3000/abc", "/models/demo.stl", "https://cdn.example.com/a.stl"]) {
    assert.deepEqual(getStlSourceUrls(url), [url])
  }
})
