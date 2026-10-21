import assert from "node:assert/strict"
import test from "node:test"
import {
  getRegisterInvitationPath,
  getRegisterSessionGate,
  isSafeInternalPath,
} from "./register-session-gate.ts"

const gate = (isAuthLoading, hasSession, registrationCompleted = false) =>
  getRegisterSessionGate({ isAuthLoading, hasSession, registrationCompleted })

test("signed-out visitor sees the registration form (unchanged)", () => {
  assert.equal(gate(false, false), "form")
})

test("a signed-in user (e.g. Super Admin) opening the link gets the sign-out notice, not an endless loader", () => {
  assert.equal(gate(false, true), "signed-in")
})

test("the loader still covers the auth provider reading the stored session", () => {
  assert.equal(gate(true, false), "loading")
  assert.equal(gate(true, true), "loading")
})

test("the loader still covers the redirect right after this page registered the account", () => {
  assert.equal(gate(false, true, true), "loading")
})

test("registrationCompleted alone never hides the form for a signed-out visitor", () => {
  assert.equal(gate(false, false, true), "form")
})

test("the only state that can stay on the loader indefinitely requires registration to have just completed", () => {
  for (const isAuthLoading of [false]) {
    for (const hasSession of [false, true]) {
      for (const registrationCompleted of [false, true]) {
        const result = gate(isAuthLoading, hasSession, registrationCompleted)
        if (result === "loading") assert.ok(hasSession && registrationCompleted)
      }
    }
  }
})

test("getRegisterInvitationPath keeps the invitation token, URL-encoded", () => {
  assert.equal(getRegisterInvitationPath("abc123"), "/register?token=abc123")
  assert.equal(getRegisterInvitationPath("a+b/c=="), "/register?token=a%2Bb%2Fc%3D%3D")
  assert.equal(getRegisterInvitationPath(""), "/register")
})

test("isSafeInternalPath accepts only same-origin absolute paths", () => {
  assert.equal(isSafeInternalPath("/register?token=abc"), true)
  assert.equal(isSafeInternalPath("/login"), true)
  assert.equal(isSafeInternalPath("//evil.example"), false)
  assert.equal(isSafeInternalPath("https://evil.example"), false)
  assert.equal(isSafeInternalPath("/\\evil.example"), false)
  assert.equal(isSafeInternalPath(""), false)
  assert.equal(isSafeInternalPath(undefined), false)
  assert.equal(isSafeInternalPath({ redirectTo: "/x" }), false) // e.g. a click event passed by onClick={logout}
})
