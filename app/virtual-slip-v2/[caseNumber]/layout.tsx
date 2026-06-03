import type React from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ProtectedRoute } from "@/components/protected-route";

/**
 * App shell for the redesigned view-only virtual slip.
 * Mirrors app/office-case-management/layout.tsx but omits the top Header bar,
 * since the slip renders its own office/lab logo header.
 * Authenticated providers (incl. SlipCreationProvider) are supplied globally
 * by components/conditional-providers.tsx.
 */
export default function VirtualSlipV2Layout({
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
