// Run: node --import ./test-alias-loader.mjs --test lib/panel-access.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { activePanelSide, canAccessPanel } from "./panel-access.ts"

function input(role, customerType, extra = {}) {
  return {
    user: { role, roles: [role] },
    isActingAsLabAdmin: false,
    activeCustomerType: customerType,
    profileRole: role,
    ...extra,
  }
}

const LAB_ROLES = ["lab_admin", "lab_user", "lab_driver"]
const OFFICE_ROLES = ["office_admin", "office_user", "doctor_admin", "doctor"]

test("lab roles open lab panels and are refused office and superadmin panels", () => {
  for (const role of LAB_ROLES) {
    assert.equal(canAccessPanel("lab", input(role, "lab")), true, role)
    assert.equal(canAccessPanel("office", input(role, "lab")), false, role)
    assert.equal(canAccessPanel("superadmin", input(role, "lab")), false, role)
  }
})

test("office roles open office panels and are refused lab and superadmin panels", () => {
  for (const role of OFFICE_ROLES) {
    assert.equal(canAccessPanel("office", input(role, "office")), true, role)
    assert.equal(canAccessPanel("lab", input(role, "office")), false, role)
    assert.equal(canAccessPanel("superadmin", input(role, "office")), false, role)
  }
})

test("superadmin opens every panel", () => {
  const sa = input("superadmin", null)
  for (const panel of ["lab", "office", "superadmin"]) {
    assert.equal(canAccessPanel(panel, sa), true, panel)
  }
})

test("superadmin acting as lab admin counts as lab but keeps superadmin panels", () => {
  const acting = input("superadmin", "lab", { isActingAsLabAdmin: true, profileRole: "lab_admin" })
  assert.equal(canAccessPanel("lab", acting), true)
  assert.equal(canAccessPanel("office", acting), false)
  assert.equal(canAccessPanel("superadmin", acting), true)
})

test("active customer type wins over the role (user with a lab and an office profile)", () => {
  const user = { role: "lab_admin", roles: ["lab_admin", "office_admin"] }
  const onOffice = { user, isActingAsLabAdmin: false, activeCustomerType: "office", profileRole: "office_admin" }
  assert.equal(canAccessPanel("office", onOffice), true)
  assert.equal(canAccessPanel("lab", onOffice), false)
  const onLab = { ...onOffice, activeCustomerType: "Lab", profileRole: "lab_admin" }
  assert.equal(canAccessPanel("lab", onLab), true)
  assert.equal(canAccessPanel("office", onLab), false)
})

test("without a customer type the profile role, then the primary role, decides", () => {
  assert.equal(activePanelSide(input("Lab Admin", null)), "lab")
  assert.equal(activePanelSide(input("office_user", undefined)), "office")
  assert.equal(
    activePanelSide({ user: { roles: ["doctor"] }, isActingAsLabAdmin: false, activeCustomerType: null, profileRole: null }),
    "office",
  )
  assert.equal(activePanelSide({ user: { role: "user" }, isActingAsLabAdmin: false, activeCustomerType: null }), null)
})

test("no user, or a user whose side is unknown, is refused", () => {
  assert.equal(canAccessPanel("lab", { user: null, isActingAsLabAdmin: false, activeCustomerType: "lab" }), false)
  assert.equal(canAccessPanel("superadmin", { user: undefined, isActingAsLabAdmin: false, activeCustomerType: null }), false)
  const unknown = { user: { role: "user" }, isActingAsLabAdmin: false, activeCustomerType: null }
  assert.equal(canAccessPanel("lab", unknown), false)
  assert.equal(canAccessPanel("office", unknown), false)
})
