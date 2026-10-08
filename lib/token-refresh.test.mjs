import assert from "node:assert/strict"
import test from "node:test"
import {
  getRequestUrl,
  isAuthExemptUrl,
} from "../lib/token-refresh.ts"

test("isAuthExemptUrl skips login refresh logout paths", () => {
  assert.equal(isAuthExemptUrl("https://api.example.com/v1/auth/login"), true)
  assert.equal(isAuthExemptUrl("https://api.example.com/v1/auth/refresh_token"), true)
  assert.equal(isAuthExemptUrl("https://api.example.com/v1/auth/logout"), true)
  assert.equal(isAuthExemptUrl("https://api.example.com/v1/auth/register"), true)
  assert.equal(isAuthExemptUrl("https://api.example.com/v1/slips"), false)
  assert.equal(isAuthExemptUrl("https://api.example.com/v1/auth/validate_token"), false)
})

test("getRequestUrl reads string and URL inputs", () => {
  assert.equal(getRequestUrl("https://api.example.com/v1/slips"), "https://api.example.com/v1/slips")
  assert.equal(
    getRequestUrl(new URL("https://api.example.com/v1/auth/login")),
    "https://api.example.com/v1/auth/login",
  )
})
