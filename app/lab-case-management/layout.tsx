import type React from "react"
import { CaseManagementProfileRedirect } from "@/components/case-management-profile-redirect"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { LabProductLibrarySetupNotice } from "@/components/dashboard/lab-product-library-setup-notice"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"
import { DriverSlipProvider } from "@/contexts/DriverSlipContext"
import { Toaster } from "@/components/ui/toaster"

export default function LabProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute
        permissions={["view_case_details_status", "submit_new_case", "edit_slip"]}
      >
      <DriverSlipProvider>
        <CaseManagementProfileRedirect requiredProfile="lab" />
        <div className="flex h-[100dvh] bg-[#F9F9F9] overflow-hidden">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <LabProductLibrarySetupNotice />
            <div className="flex-1 overflow-auto">
              <Toaster /> 
              {children}
            </div>
          </div>
        </div>
      </DriverSlipProvider>
      </PermissionRoute>
    </ProtectedRoute>
  )
} 