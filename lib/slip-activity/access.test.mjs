// Run: node --import ./test-alias-loader.mjs --test lib/slip-activity/access.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { canAccessSlipActivity } from "./access.ts"

const LAB = 10
const OFFICE = 20

function userWith(role, type = "lab", extra = {}) {
  const id = type === "lab" ? LAB : OFFICE
  return { role, roles: [role], customers: [{ id, type, role }], ...extra }
}

function decide(user, customerId = LAB, customerType = "lab", storedRole = null) {
  return canAccessSlipActivity({ user, activeCustomerId: customerId, activeCustomerType: customerType, storedRole })
}

test("lab roles on their lab profile are allowed", () => {
  for (const role of ["lab_admin", "lab_user", "lab_driver"]) {
    assert.equal(decide(userWith(role)), true, role)
  }
})

test("office and doctor roles are denied", () => {
  for (const role of ["office_admin", "office_user", "doctor_admin", "doctor"]) {
    assert.equal(decide(userWith(role, "office"), OFFICE, "office"), false, role)
  }
})

test("superadmin is denied, also when acting as lab admin on a lab profile", () => {
  assert.equal(decide({ role: "superadmin", roles: ["superadmin"], customers: [] }, null, null), false)
  const acting = { role: "superadmin", roles: ["superadmin"], customers: [{ id: LAB, type: "lab", role: "lab_admin" }] }
  assert.equal(decide(acting, LAB, "lab", "lab_admin"), false)
})

test("a lab role on an office profile is denied", () => {
  const user = { role: "lab_admin", customers: [{ id: LAB, type: "lab", role: "lab_admin" }, { id: OFFICE, type: "office", role: "office_admin" }] }
  assert.equal(decide(user, OFFICE, "office"), false)
  assert.equal(decide(user, LAB, "lab"), true)
})

test("no user or no active customer is denied", () => {
  assert.equal(decide(null), false)
  assert.equal(decide(undefined), false)
  assert.equal(decide(userWith("lab_admin"), null, "lab"), false)
  assert.equal(decide(userWith("lab_admin"), "", "lab"), false)
})

test("customer id from localStorage is a string", () => {
  assert.equal(decide(userWith("lab_user"), String(LAB), "lab"), true)
})

test("role given as { id, name } object is normalized", () => {
  const user = { role: "lab_user", customers: [{ id: LAB, type: "lab", role: { id: 3, name: "lab_driver" } }] }
  assert.equal(decide(user), true)
})

test("falls back to stored role and customer type when the profile entry lacks them", () => {
  const user = { role: "lab_user", customers: [{ id: LAB }] }
  assert.equal(decide(user, LAB, "lab", "lab_user"), true)
  assert.equal(decide(user, LAB, "lab", "office_user"), false)
  assert.equal(decide(user, LAB, "office", "lab_user"), false)
  assert.equal(decide(user, LAB, "lab", null), false)
})
