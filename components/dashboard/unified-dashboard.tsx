"use client"

import { useAuth } from "@/contexts/auth-context"
import { LabAdminDashboard } from "./lab-admin-dashboard"
import { LabUserDashboard } from "./lab-user-dashboard"
import { OfficeAdminDashboard } from "./office-admin-dashboard"
import { SuperAdminDashboard } from "./superadmin-dashboard"
import { DoctorDashboard } from "./doctor-dashboard"
import { ConnectionProvider } from "@/contexts/connection-context"

export function UnifiedDashboard() {
  const { user } = useAuth()

  const getPrimaryRole = (): string => {
    if (user?.roles && Array.isArray(user.roles)) {
      if (user.roles.includes("superadmin")) return "superadmin"
      if (user.roles.includes("lab_admin")) return "lab_admin"
      if (user.roles.includes("lab_user")) return "lab_user"
      if (user.roles.includes("office_admin")) return "office_admin"
      if (user.roles.includes("doctor") || user.roles.includes("doctor_admin")) return "doctor"
      return user.roles[0] || "user"
    }
    if (Array.isArray(user?.roles)) {
      return user.roles[0] || "user"
    }
    return typeof user?.roles === "string" ? user.roles : "user"
  }

  const primaryRole = getPrimaryRole()

  return (
    <ConnectionProvider>
      {primaryRole === "superadmin" && <SuperAdminDashboard />}
      {primaryRole === "lab_admin" && <LabAdminDashboard />}
      {primaryRole === "lab_user" && <LabUserDashboard />}
      {primaryRole === "office_admin" && <OfficeAdminDashboard />}
      {primaryRole === "doctor" && <DoctorDashboard />}
      {!["superadmin", "lab_admin", "lab_user", "office_admin", "doctor"].includes(primaryRole) && (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6 capitalize">{primaryRole.replaceAll("_", " ")} Dashboard</h1>
          <p>
            {`Welcome to your ${primaryRole.replaceAll("_", " ")} dashboard. `}
            Please contact your administrator for more information.
          </p>
        </div>
      )}
    </ConnectionProvider>
  )
}
