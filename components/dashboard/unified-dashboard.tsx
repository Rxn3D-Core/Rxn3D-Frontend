"use client"

import { useAuth } from "@/contexts/auth-context"
import { getPrimaryRole } from "@/lib/get-primary-role"
import { getActiveCustomerType } from "@/lib/role-utils"
import { LabAdminDashboard } from "./lab-admin-dashboard"
import { LabUserDashboard } from "./lab-user-dashboard"
import { OfficeAdminDashboard } from "./office-admin-dashboard"
import { SuperAdminDashboard } from "./superadmin-dashboard"
import { DoctorDashboard } from "./doctor-dashboard"
import { ConnectionProvider } from "@/contexts/connection-context"

export function UnifiedDashboard() {
  const { user } = useAuth()
  const primaryRole = getPrimaryRole(user)
  const customerType = getActiveCustomerType()

  const isLabProfile =
    customerType === "lab" ||
    ["lab_admin", "lab_user", "lab_driver"].includes(primaryRole)
  const isOfficeProfile =
    customerType === "office" ||
    ["office_admin", "office_user", "doctor_admin", "doctor"].includes(primaryRole)

  let content = null

  if (primaryRole === "superadmin") {
    content = <SuperAdminDashboard />
  } else if (isLabProfile) {
    content =
      primaryRole === "lab_user" || primaryRole === "lab_driver" ? (
        <LabUserDashboard />
      ) : (
        <LabAdminDashboard />
      )
  } else if (isOfficeProfile) {
    content = primaryRole === "doctor" ? <DoctorDashboard /> : <OfficeAdminDashboard />
  } else {
    content = (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 capitalize">
          {primaryRole.replaceAll("_", " ")} Dashboard
        </h1>
        <p>
          {`Welcome to your ${primaryRole.replaceAll("_", " ")} dashboard. `}
          Please contact your administrator for more information.
        </p>
      </div>
    )
  }

  return <ConnectionProvider>{content}</ConnectionProvider>
}
