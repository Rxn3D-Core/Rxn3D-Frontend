"use client"

import Link from "next/link"
import { Loader2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  RegistrationCard,
  RegistrationPageHeader,
  RegistrationPageShell,
} from "@/components/registration/registration-page-shell"

interface AlreadySignedInNoticeProps {
  /** Who is signed in, e.g. "Jane Doe (jane@example.com)". */
  signedInAs: string
  /** Where "stay signed in" goes (the signed-in user's own landing page). */
  homeHref: string
  onSignOut: () => void
  isSigningOut: boolean
}

/**
 * Shown on the invitation registration page when someone is already signed in on this browser.
 * Registering signs the new account in, so the visitor chooses explicitly between signing out to
 * continue with the invitation or staying where they are.
 */
export function AlreadySignedInNotice({ signedInAs, homeHref, onSignOut, isSigningOut }: AlreadySignedInNoticeProps) {
  return (
    <RegistrationPageShell size="narrow" showLogo>
      <RegistrationCard className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-[#1162A8]">
          <UserCheck className="h-7 w-7" />
        </div>
        <RegistrationPageHeader
          title="You're already signed in"
          description={`You're signed in as ${signedInAs}. This invitation sets up a new account, so sign out of the current one to continue.`}
          className="mb-0 text-center"
        />
        <Button
          className="mt-6 w-full bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110"
          onClick={onSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign out and continue
        </Button>
        <Link
          href={homeHref}
          className="mt-4 inline-flex items-center text-sm font-semibold text-[#1162A8] hover:underline"
        >
          Stay signed in
        </Link>
      </RegistrationCard>
    </RegistrationPageShell>
  )
}
