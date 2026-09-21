import type React from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { VirtualSlipDesktopViewport } from "@/components/virtual-slip/VirtualSlipDesktopViewport";

/**
 * App shell for the view-only virtual slip
 * (`/virtual-slip/{caseId}/{slipId}`).
 * Mirrors app/office-case-management/layout.tsx but omits the top Header bar,
 * since the slip renders its own office/lab logo header.
 * Authenticated providers (incl. SlipCreationProvider) are supplied globally
 * by components/conditional-providers.tsx.
 *
 * Main slip canvas stays desktop-width (scaled on phone). Viewport stays
 * device-width so modals remain responsive.
 */
export default function VirtualSlipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-[100dvh] overflow-hidden bg-[#F9F9F9]">
        <DashboardSidebar />
        <div className="flex-1 overflow-auto">
          <VirtualSlipDesktopViewport>{children}</VirtualSlipDesktopViewport>
        </div>
      </div>
    </ProtectedRoute>
  );
}
