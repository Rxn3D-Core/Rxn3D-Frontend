// Run: node --import ./test-alias-loader.mjs --test lib/profile-role.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import {
  extractRoleName,
  normalizeRoleSlug,
  sanitizeStoredRole,
  toProfileRole,
} from "../lib/role-utils.ts"
import { parsePermissionsProfile, roleOnCustomer } from "../lib/permissions.ts"

// Same operation that crashed the app: `(profileRole || "").toLowerCase()`.
const lowerLikeTheApp = (role) => (role || "").toLowerCase()

// Unexpected shapes a role can arrive in. None may throw or reach toLowerCase as a non-string.
const HOSTILE_ROLES = [
  undefined,
  null,
  "",
  "   ",
  0,
  42,
  true,
  {},
  { id: 7 },
  { name: null },
  { name: 5 },
  [],
  [null, {}],
  () => "doctor",
  Symbol("role"),
]

test("toProfileRole never returns a non-string and never throws on unexpected input", () => {
  for (const value of HOSTILE_ROLES) {
    let result
    assert.doesNotThrow(() => {
      result = toProfileRole(value)
    }, `threw for ${String(typeof value)}`)
    assert.ok(result === null || typeof result === "string")
    assert.doesNotThrow(() => lowerLikeTheApp(result))
  }
})

test("normalizeRoleSlug falls back to an empty string for unusable values", () => {
  for (const value of HOSTILE_ROLES) {
    assert.equal(normalizeRoleSlug(value), "")
  }
})

test("extractRoleName reads strings, { id, name } objects and arrays of either", () => {
  assert.equal(extractRoleName("doctor"), "doctor")
  assert.equal(extractRoleName({ id: 3, name: "office_user" }), "office_user")
  assert.equal(extractRoleName({ slug: "doctor_admin" }), "doctor_admin")
  assert.equal(extractRoleName([null, "", { id: 1, name: "office_admin" }]), "office_admin")
})

test("normalizeRoleSlug still maps labels and snake_case like before", () => {
  assert.equal(normalizeRoleSlug("Office Admin"), "office_admin")
  assert.equal(normalizeRoleSlug("DOCTOR"), "doctor")
  assert.equal(normalizeRoleSlug(" lab_admin "), "lab_admin")
  assert.equal(normalizeRoleSlug(null), "")
  assert.equal(normalizeRoleSlug(undefined), "")
})

test("sanitizeStoredRole drops placeholder strings written by older builds", () => {
  assert.equal(sanitizeStoredRole("[object Object]"), null)
  assert.equal(sanitizeStoredRole("undefined"), null)
  assert.equal(sanitizeStoredRole("null"), null)
  assert.equal(sanitizeStoredRole(""), null)
  assert.equal(sanitizeStoredRole(null), null)
  assert.equal(sanitizeStoredRole("doctor"), "doctor")
  // Multi-role logins persist a JSON array string; that must keep working.
  assert.equal(sanitizeStoredRole('["doctor","office_user"]'), '["doctor","office_user"]')
})

// ---- Multi-organization accounts -------------------------------------------------

const SMILE = 101 // Smile Dental Demo
const SHINING = 202 // Shining Smile Demo

/** `customers[]` as login returns it (UserPermissionResolver): role is a string. */
const loginCustomers = (smileRole, shiningRole) => [
  { id: SMILE, name: "Smile Dental Demo", type: "office", role: smileRole },
  { id: SHINING, name: "Shining Smile Demo", type: "office", role: shiningRole },
]

/** `customers[]` as profile endpoints return it (UserProfileResource): role is { id, name }. */
const profileCustomers = (smileRole, shiningRole) => [
  { id: SMILE, name: "Smile Dental Demo", type: "office", role: { id: 1, name: smileRole } },
  { id: SHINING, name: "Shining Smile Demo", type: "office", role: { id: 2, name: shiningRole } },
]

const ACCOUNTS = [
  { label: "Doctor", smile: "doctor", shining: "doctor_admin" },
  { label: "Office User", smile: "office_user", shining: "office_admin" },
]

for (const account of ACCOUNTS) {
  for (const [shapeName, build] of [
    ["login (string role)", loginCustomers],
    ["profile (object role)", profileCustomers],
  ]) {
    test(`${account.label}: switching organizations back and forth yields the right role — ${shapeName}`, () => {
      const customers = build(account.smile, account.shining)
      const expected = { [SMILE]: account.smile, [SHINING]: account.shining }

      // Smile -> Shining -> Smile -> Shining -> Smile, as a user flipping the header switcher.
      for (const target of [SHINING, SMILE, SHINING, SMILE, SHINING, SHINING, SMILE]) {
        const role = roleOnCustomer(customers, target)
        assert.equal(typeof role, "string")
        assert.equal(role, expected[target])
        assert.doesNotThrow(() => lowerLikeTheApp(role))
      }
    })
  }

  test(`${account.label}: a string customer id from a <select> or profile payload still resolves`, () => {
    const customers = profileCustomers(account.smile, account.shining)
    assert.equal(roleOnCustomer(customers, String(SHINING)), account.shining)
  })
}

test("roleOnCustomer returns null (not a crash) for a missing org, null role, or no customers", () => {
  const customers = [
    { id: SMILE, role: null },
    { id: SHINING, role: { id: 9 } },
    { id: 303 },
  ]
  assert.equal(roleOnCustomer(customers, SMILE), null)
  assert.equal(roleOnCustomer(customers, SHINING), null)
  assert.equal(roleOnCustomer(customers, 303), null)
  assert.equal(roleOnCustomer(customers, 999), null)
  assert.equal(roleOnCustomer(undefined, SMILE), null)
  assert.equal(roleOnCustomer([], SMILE), null)
})

test("parsePermissionsProfile only ever exposes a string or null role", () => {
  const cases = [
    [{ role: "doctor", permissions: ["a"] }, "doctor"],
    [{ data: { role: "office_user", permissions: ["a"] } }, "office_user"],
    [{ role: { id: 1, name: "doctor_admin" }, permissions: ["a"] }, "doctor_admin"],
    [{ data: { role: { id: 2, name: "office_admin" } } }, "office_admin"],
    [{ data: { role: 12 }, role: ["office_user"] }, "office_user"],
    [{ role: 12, permissions: ["a"] }, null],
    [{ role: null }, null],
    [{}, null],
    [null, null],
    ["not-an-object", null],
  ]
  for (const [payload, expected] of cases) {
    const snapshot = parsePermissionsProfile(payload)
    // Non-object payloads return early with `role` omitted, which the type allows.
    assert.equal(snapshot.role ?? null, expected, JSON.stringify(payload))
    assert.doesNotThrow(() => lowerLikeTheApp(snapshot.role))
  }
})
