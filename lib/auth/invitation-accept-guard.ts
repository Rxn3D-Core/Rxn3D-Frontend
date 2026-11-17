// RXN-84: an invitation may only be accepted by the invited user themselves.
// While a superadmin is impersonating, or when anyone else is signed in, the page must block
// acceptance (never accept on their behalf, never replace their session).

export type InvitationAcceptBlockReason = "impersonating" | "different-user"

export interface InvitationAcceptGuardInput {
  isAuthenticated: boolean
  isImpersonating: boolean
  signedInEmail?: string | null
  invitationEmail?: string | null
}

const norm = (email?: string | null) => (email ?? "").trim().toLowerCase()

/** Returns why accepting must be blocked, or null when the visitor may continue. */
export function getInvitationAcceptBlock(input: InvitationAcceptGuardInput): InvitationAcceptBlockReason | null {
  if (input.isImpersonating) return "impersonating"
  if (!input.isAuthenticated) return null
  const signedIn = norm(input.signedInEmail)
  const invited = norm(input.invitationEmail)
  if (signedIn && invited && signedIn !== invited) return "different-user"
  return null
}

export function invitationAcceptBlockMessage(invitationEmail: string): string {
  return `This invitation is for ${invitationEmail}. You are signed in as a different user. Please sign out and continue with the invited account.`
}
