"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/auth-context"
import { canAccessPanel, type Panel } from "@/lib/panel-access"

export function PanelAccessDenied() {
  const { t } = useTranslation()
  return (
    <div
      data-testid="panel-access-denied"
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F9F9F9] p-6 text-center"
    >
      <ShieldAlert className="h-10 w-10 text-[#CF0202]" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-gray-900">
        {t("panelAccess.title", "No permission")}
      </h1>
      <p className="max-w-md text-sm text-gray-600">
        {t("panelAccess.body", "You don't have permission to access this page.")}
      </p>
      <Link
        href="/dashboard"
        data-testid="panel-access-denied-home"
        className="mt-2 rounded-lg bg-[#1162A8] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#0e5190]"
      >
        {t("panelAccess.goToDashboard", "Go to dashboard")}
      </Link>
    </div>
  )
}

/**
 * Renders children only when the active profile owns this panel (RXN-85); otherwise a
 * "no permission" page, so no page or provider of the panel mounts and no panel data loads.
 * Use inside ProtectedRoute, outside any data provider.
 */
export function PanelRoute({ panel, children }: { panel: Panel; children: React.ReactNode }) {
  const { user, isLoading, isActingAsLabAdmin, profileRole } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    if (isLoading) return
    setAllowed(
      canAccessPanel(panel, {
        user,
        isActingAsLabAdmin,
        profileRole,
        activeCustomerType: localStorage.getItem("customerType"),
      }),
    )
  }, [panel, user, isLoading, isActingAsLabAdmin, profileRole])

  if (allowed === null) return null
  if (!allowed) return <PanelAccessDenied />
  return <>{children}</>
}
