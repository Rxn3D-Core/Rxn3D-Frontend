/**
 * What the invitation registration page (/register?token=...) should show, given the browser's session.
 *
 * Registering creates a brand-new account and signs it in, which would silently replace whoever is
 * already signed in (a Super Admin, say). So a session that existed when the page was opened gets an
 * explicit "sign out to continue" notice instead of the form — and never an endless loader.
 *
 * The loader is kept for two short, self-resolving moments only: the auth provider reading the stored
 * session, and the redirect to onboarding right after this page's own registration signed the user in.
 */
export type RegisterSessionGate = "loading" | "signed-in" | "form"

export interface RegisterSessionGateInput {
  /** Auth provider is still reading the stored session. */
  isAuthLoading: boolean
  /** A user is signed in right now. */
  hasSession: boolean
  /** This page just registered the account and signed it in; the auth provider is redirecting onward. */
  registrationCompleted: boolean
}

export function getRegisterSessionGate({
  isAuthLoading,
  hasSession,
  registrationCompleted,
}: RegisterSessionGateInput): RegisterSessionGate {
  if (isAuthLoading) return "loading"
  if (!hasSession) return "form"
  return registrationCompleted ? "loading" : "signed-in"
}

/** Where to send the user after signing out so they land back on the same invitation. */
export function getRegisterInvitationPath(invitationToken: string): string {
  return invitationToken ? `/register?token=${encodeURIComponent(invitationToken)}` : "/register"
}

/** Only same-origin, absolute paths may be used as a post-sign-out destination (no open redirects). */
export function isSafeInternalPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
}
