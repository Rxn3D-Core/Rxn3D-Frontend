import assert from "node:assert/strict"
import test from "node:test"
import { getLoginEmailFieldState, validateLoginEmail } from "./auth/login-email-validation.ts"

const state = (value, overrides = {}) =>
  getLoginEmailFieldState({ value, touched: false, submitted: false, editing: false, ...overrides })

test("malformed emails are invalid", () => {
  for (const value of [
    "name@",
    "name@example",
    "name@example.",
    "name@.com",
    "name@example..com",
    "name@exa mple.com",
    "name@@example.com",
    "@example.com",
    "name@example.c",
    "name@-example.com",
  ]) {
    const result = validateLoginEmail(value)
    assert.equal(result.isValid, false, value)
    assert.equal(result.issue, "email", value)
  }
})

test("values without @ are not accepted: there is no username login", () => {
  for (const value of ["dr_smith", "abc", "ab", "name"]) {
    const result = validateLoginEmail(value)
    assert.equal(result.isValid, false, value)
    assert.equal(result.issue, "email", value)
  }
})

test("well-formed emails are valid, including 2-letter and multi-label domains", () => {
  for (const value of [
    "name@example.com",
    "name@example.co",
    "first.last+tag@sub.example.co.uk",
    "name@xn--p1ai.xn--p1ai",
    "  name@example.com  ",
  ]) {
    const result = validateLoginEmail(value)
    assert.equal(result.isValid, true, value)
    assert.equal(result.issue, null, value)
  }
})

test("empty and whitespace-only values are required", () => {
  assert.equal(validateLoginEmail("").issue, "required")
  assert.equal(validateLoginEmail("   ").issue, "required")
})

test("untouched empty field is neutral, and stays neutral when merely focused/blurred empty", () => {
  assert.equal(state("").status, "default")
  assert.equal(state("", { editing: true }).status, "default")
  assert.equal(state("", { touched: true }).status, "default")
})

test("incomplete value is amber while editing, red after blur", () => {
  assert.equal(state("name@", { editing: true }).status, "warning")
  assert.equal(state("name@example", { editing: true }).status, "warning")
  assert.equal(state("n", { editing: true }).status, "warning")
  assert.equal(state("name@", { touched: true }).status, "error")
  assert.equal(state("name@example", { touched: true }).status, "error")
  assert.equal(state("dr_smith", { touched: true }).status, "error")
})

test("submit forces red for invalid and for empty", () => {
  assert.equal(state("name@", { submitted: true, editing: true }).status, "error")
  assert.equal(state("", { submitted: true }).status, "error")
  assert.equal(state("", { submitted: true }).issue, "required")
})

test("green is only for syntactically valid email", () => {
  assert.equal(state("name@example.com", { editing: true }).status, "valid")
  assert.equal(state("name@example.co", { touched: true }).status, "valid")
  assert.equal(state("name@example.com", { touched: true, submitted: true }).status, "valid")
  assert.notEqual(state("dr_smith", { editing: true }).status, "valid")
  assert.notEqual(state("dr_smith", { touched: true }).status, "valid")
})

test("non-empty invalid value that was never focused (autofill) stays neutral until submit", () => {
  assert.equal(state("name@").status, "default")
  assert.equal(state("name@", { submitted: true }).status, "error")
})
