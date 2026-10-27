"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/auth-context"
import { canAccessSlipActivity } from "@/lib/slip-activity/access"

export function SlipActivityAccessDenied() {
  const { t } = useTranslation()
  return (
    <div
      data-testid="slip-activity-access-denied"
      role="alert"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <ShieldAlert className="h-10 w-10 text-[#CF0202]" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-gray-900">
        {t("slipActivity.accessDenied.title", "Access denied")}
      </h1>
      <p className="max-w-md text-sm text-gray-600">
        {t("slipActivity.accessDenied.body", "This page is only available to lab users.")}
      </p>
    </div>
  )
}

/** Renders children only for lab_admin, lab_user and lab_driver on a lab profile. Use inside ProtectedRoute. */
export function LabSideRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    if (isLoading) return
    setAllowed(
      canAccessSlipActivity({
        user,
        activeCustomerId: localStorage.getItem("customerId"),
        activeCustomerType: localStorage.getItem("customerType"),
        storedRole: localStorage.getItem("role"),
      }),
    )
  }, [user, isLoading])

  if (allowed === null) return null
  if (!allowed) return <SlipActivityAccessDenied />
  return <>{children}</>
}
