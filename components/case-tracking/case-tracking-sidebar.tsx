"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useCasePanTrackingLabelStore } from "@/stores/case-pan-tracking-label-store"

type SideTabItem = {
  id: string
  label: string
  href: string
}

interface CaseTrackingSidebarProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

export function CaseTrackingSidebar({ activeTab = "case-tracking", onTabChange }: CaseTrackingSidebarProps) {
  const pathname = usePathname() || ""
  const { t } = useTranslation()
  const { user } = useAuth()

  // Get user role from auth context
  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  const isLabAdmin = userRoles.includes("lab_admin")

  // Set route prefix based on user role
  const routePrefix = isLabAdmin ? "/lab-case-tracking" : "/case-tracking"

  // Use Zustand store for real-time label synchronization
  const { label: sidebarLabel } = useCasePanTrackingLabelStore()

  // Sidebar items for Case Tracking
  const sidebarItems: SideTabItem[] = useMemo(() => [
    { id: "case-pans", label: t("caseTracking.sidebar.casePans", "Case Pan Tracking"), href: `${routePrefix}/case-pans` },
    { id: "active-cases", label: t("caseTracking.sidebar.activeCases", "Active Cases"), href: `${routePrefix}/active-cases` },
    { id: "history", label: t("caseTracking.sidebar.history", "Case History"), href: `${routePrefix}/history` },
  ], [t, routePrefix])

  // Find the active tab
  const activeTabHref = useMemo(
    () => sidebarItems.find(item => pathname === item.href)?.href,
    [pathname, sidebarItems]
  )

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  return (
    <div className="w-72 bg-white border-r border-[#d9d9d9]">
      <div className="px-6 py-4 font-bold text-lg border-b border-[#d9d9d9]">
        {sidebarLabel}
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-120px)] case-tracking-sidebar-scroll">
        {sidebarItems.map((item) => {
          const isActive = activeTabHref === item.href
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              className={cn(
                "block px-6 py-4 text-base transition-colors font-medium",
                isActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <style jsx>{`
        .case-tracking-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #1162a8 #e5e7eb;
        }
        .case-tracking-sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .case-tracking-sidebar-scroll::-webkit-scrollbar-track {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .case-tracking-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #1162a8;
          border-radius: 4px;
        }
        .case-tracking-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #0f5490;
        }
      `}</style>
    </div>
  )
}
