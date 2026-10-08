"use client"

import { notFound, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { RegistrationListedSuccess } from "@/components/registration/registration-listed-success"
import {
  RegistrationCard,
  RegistrationPageShell,
} from "@/components/registration/registration-page-shell"
import { isOpenRegistrationEnabled } from "@/lib/config/registration"

function SuccessPreviewContent() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const type = typeParam === "office" ? "Office" : "Lab"

  const organizationName = type === "Office" ? "Smile Dental" : "Smile Lab"

  return (
    <RegistrationPageShell size="medium" fitViewport showLogo className="justify-center">
      <RegistrationCard className="mx-auto flex w-full max-w-lg flex-col items-center justify-center !p-6 sm:!p-8">
        <RegistrationListedSuccess
          type={type}
          organizationName={organizationName}
          locationLabel="Austin, TX"
          onContinue={() => {
            window.alert("After real registration, this continues to onboarding.")
          }}
          onClose={() => {
            window.alert("This would close the window or return to sign in.")
          }}
        />
      </RegistrationCard>
    </RegistrationPageShell>
  )
}

export default function RegisterSuccessPreviewPage() {
  if (!isOpenRegistrationEnabled) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1162A8] border-t-transparent" />
        </div>
      }
    >
      <SuccessPreviewContent />
    </Suspense>
  )
}
