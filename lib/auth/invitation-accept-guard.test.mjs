import assert from "node:assert/strict"
import test from "node:test"
import { getInvitationAcceptBlock, invitationAcceptBlockMessage } from "./invitation-accept-guard.ts"

const invitationEmail = "angelica@example.com"

test("impersonating is always blocked, even as the invited user", () => {
  for (const signedInEmail of [invitationEmail, "ANGELICA@example.com"]) {
    assert.equal(
      getInvitationAcceptBlock({ isAuthenticated: true, isImpersonating: true, signedInEmail, invitationEmail }),
      "impersonating",
    )
  }
})

test("a different signed-in user is blocked", () => {
  assert.equal(
    getInvitationAcceptBlock({ isAuthenticated: true, isImpersonating: false, signedInEmail: "admin@example.com", invitationEmail }),
    "different-user",
  )
})

test("the invited user (any email casing) may continue", () => {
  assert.equal(
    getInvitationAcceptBlock({ isAuthenticated: true, isImpersonating: false, signedInEmail: " Angelica@Example.com ", invitationEmail }),
    null,
  )
})

test("signed out may continue (registration or log in)", () => {
  assert.equal(
    getInvitationAcceptBlock({ isAuthenticated: false, isImpersonating: false, signedInEmail: null, invitationEmail }),
    null,
  )
})

test("message names the invited email", () => {
  assert.equal(
    invitationAcceptBlockMessage(invitationEmail),
    "This invitation is for angelica@example.com. You are signed in as a different user. Please sign out and continue with the invited account.",
  )
})
