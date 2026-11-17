// Run: node --import ./test-alias-loader.mjs --test lib/role-rank.test.mjs
import assert from "node:assert/strict"
import test from "node:test"
import { canRemoveMember } from "../lib/role-rank.ts"

test("doctor cannot remove doctor admin; doctor admin can remove doctor", () => {
  assert.equal(canRemoveMember({ actorRole: "doctor", targetRole: "doctor_admin" }), false)
  assert.equal(canRemoveMember({ actorRole: "doctor_admin", targetRole: "doctor" }), true)
})

test("equal rank allowed, user cannot remove higher", () => {
  assert.equal(canRemoveMember({ actorRole: "doctor_admin", targetRole: "doctor_admin" }), true)
  assert.equal(canRemoveMember({ actorRole: "office_user", targetRole: "doctor" }), true)
  assert.equal(canRemoveMember({ actorRole: "office_user", targetRole: "office_admin" }), false)
})

test("superadmin and self are exempt", () => {
  assert.equal(canRemoveMember({ actorRole: "doctor", actorIsSuperadmin: true, targetRole: "office_admin" }), true)
  assert.equal(canRemoveMember({ actorRole: "doctor", targetRole: "office_admin", isSelf: true }), true)
})
