import type React from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ProtectedRoute } from "@/components/protected-route";

/**
 * Shell for legacy `/virtual-slip-v2/{slipId}` while it redirects to the
 * canonical `/virtual-slip/{caseId}/{slipId}` route.
 */
export default function LegacyVirtualSlipV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-[100dvh] overflow-hidden bg-[#F9F9F9]">
        <DashboardSidebar />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ProtectedRoute>
  );
}
