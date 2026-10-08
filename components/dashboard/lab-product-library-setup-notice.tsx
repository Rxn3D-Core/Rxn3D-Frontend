"use client"

import { useAuth } from "@/contexts/auth-context"
import { LabProductLibrarySetupBanner } from "@/components/dashboard/lab-product-library-setup-banner"
import { getCustomerId } from "@/lib/dashboard-widgets"
import { getPrimaryRole } from "@/lib/get-primary-role"

export function LabProductLibrarySetupNotice() {
  const { user, isActingAsLabAdmin } = useAuth()
  const role = isActingAsLabAdmin ? "lab_admin" : getPrimaryRole(user)
  const customerId = getCustomerId(user)

  if (role !== "lab_admin" || !customerId) {
    return null
  }

  return (
    <div className="border-b border-slate-200/80 bg-white px-4 py-3">
      <LabProductLibrarySetupBanner customerId={customerId} />
    </div>
  )
}
