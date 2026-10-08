"use client"

import { Suspense } from "react"
import { notFound, useSearchParams } from "next/navigation"
import { SelfOrgRegistrationWizard } from "@/components/registration/self-org-registration-wizard"
import { isOpenRegistrationEnabled } from "@/lib/config/registration"

function RegisterOfficeContent() {
  const searchParams = useSearchParams()
  const skipOtp = searchParams.get("authenticated") === "1"

  return <SelfOrgRegistrationWizard type="Office" skipOtp={skipOtp} />
}

export default function RegisterOfficePage() {
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
      <RegisterOfficeContent />
    </Suspense>
  )
}
