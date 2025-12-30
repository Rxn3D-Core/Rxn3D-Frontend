"use client"

import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ChevronDown, ChevronRight } from "lucide-react"

type SideTabItem = {
  id: string
  label: string
  href: string
  children?: SideTabItem[]
}

type SidebarGroup = {
  id: string
  label: string
  items: SideTabItem[]
}

interface AdvanceSidebarProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

export function AdvanceSidebar({ activeTab = "advance-fields", onTabChange }: AdvanceSidebarProps) {
  const pathname = usePathname() || "";
  const { t } = useTranslation()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Get user role from auth context
  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  const isLabAdmin = userRoles.includes("lab_admin")
  const isSuperAdmin = userRoles.includes("superadmin")

  // Set route prefix based on user role
  const routePrefix = isLabAdmin ? "/lab-advance-mode" : "/global-advance-mode"

  const sidebarGroups: SidebarGroup[] = useMemo(() => {
    const allItems = [
      ...(isSuperAdmin ? [
        { id: "category", label: t("advanceMode.sidebar.Category", "Category"), href: `${routePrefix}/category` },
        { id: "sub-category", label: t("advanceMode.sidebar.SubCategory", "Sub Category"), href: `${routePrefix}/sub-category` },
      ] : []),
      { id: "fields", label: t("advanceMode.sidebar.Fields", "Fields"), href: `${routePrefix}/fields` },
    ]

    return [
      {
        id: "advance-fields",
        label: t("advanceMode.sidebar.AdvanceFields", "Advance fields"),
        items: allItems
      },
    ]
  }, [t, routePrefix, isSuperAdmin])

  // Flat items (single tabs, not in accordion)
  const flatItems: SideTabItem[] = useMemo(() => [
    { id: "implant-library", label: t("advanceMode.sidebar.ImplantLibrary", "Implant Library"), href: `${routePrefix}/implant-library` },
    // { id: "abutment-library", label: t("advanceMode.sidebar.AbutmentLibrary", "Abutment Library"), href: `${routePrefix}/abutment-library` },
  ], [t, routePrefix])

  // Flatten all items to find active tab
  const allItems = useMemo(() =>
    [...sidebarGroups.flatMap(group => group.items), ...flatItems],
    [sidebarGroups, flatItems]
  )

  // Find the active tab only once
  const activeTabHref = useMemo(
    () => allItems.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href,
    [pathname, allItems]
  )

  // Automatically expand parent groups when a child is active
  useEffect(() => {
    const currentPath = pathname || "";
    const shouldBeExpanded: string[] = []

    const checkGroup = (group: SidebarGroup) => {
      const hasActiveChild = group.items.some(item =>
        currentPath === item.href || currentPath.startsWith(`${item.href}/`)
      )
      if (hasActiveChild) {
        shouldBeExpanded.push(group.id)
      }
    }

    sidebarGroups.forEach((group) => checkGroup(group))
    setExpandedItems([...new Set(shouldBeExpanded)])
  }, [pathname, sidebarGroups])

  const toggleMenuItem = (groupId: string) => {
    setExpandedItems((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  }

  const isExpanded = (groupId: string) => {
    return expandedItems.includes(groupId)
  }

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  return (
    <div className="w-72 bg-white border-r border-[#d9d9d9]">
      <div className="px-6 py-4 font-bold text-lg border-b border-[#d9d9d9]">
        {t("advanceMode.title", "Advance Mode")}
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-120px)] advance-sidebar-scroll">
        {sidebarGroups.map((group) => {
          const hasActiveItem = group.items.some(item => isActive(item.href))
          const groupExpanded = isExpanded(group.id)

          return (
            <SidebarGroupItem
              key={group.id}
              group={group}
              isExpanded={groupExpanded}
              hasActiveItem={hasActiveItem}
              isActive={isActive}
              toggleExpand={toggleMenuItem}
              handleTabClick={handleTabClick}
            />
          )
        })}
        {/* Flat items (single tabs) */}
        {flatItems.map((item) => {
          const itemActive = isActive(item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              className={cn(
                "block px-6 py-4 text-base transition-colors font-medium",
                itemActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <style jsx>{`
        .advance-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #1162a8 #e5e7eb;
        }
        .advance-sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .advance-sidebar-scroll::-webkit-scrollbar-track {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .advance-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #1162a8;
          border-radius: 4px;
        }
        .advance-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #0f5490;
        }
      `}</style>
    </div>
  )
}

interface SidebarGroupItemProps {
  group: SidebarGroup
  isExpanded: boolean
  hasActiveItem: boolean
  isActive: (href?: string) => boolean
  toggleExpand: (groupId: string) => void
  handleTabClick: (tabId: string) => void
}

function SidebarGroupItem({ group, isExpanded, hasActiveItem, isActive, toggleExpand, handleTabClick }: SidebarGroupItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleExpand(group.id)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center justify-between w-full px-6 py-4 text-base font-medium transition-colors text-left",
          hasActiveItem ? "bg-[#dfeefb] text-[#1162a8]" : "text-[#000000] hover:bg-gray-100"
        )}
      >
        <span>{group.label}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="flex flex-col">
          {group.items.map((item) => {
            const itemActive = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                className={cn(
                  "block pl-12 pr-6 py-3 text-base transition-colors font-medium",
                  itemActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
                )}
                onClick={() => handleTabClick(item.id)}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
