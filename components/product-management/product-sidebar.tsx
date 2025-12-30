"use client"

import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useCasePanTrackingLabelStore } from "@/stores/case-pan-tracking-label-store"

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

interface ProductSidebarProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

export function ProductSidebar({ activeTab = "products", onTabChange }: ProductSidebarProps) {
  const pathname = usePathname() || "";
  const { t } = useTranslation()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Get user role from auth context
  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  const isLabAdmin = userRoles.includes("lab_admin")

  // Set route prefix based on user role
  const routePrefix = isLabAdmin ? "/lab-product-library" : "/global-product-library"

  // Use Zustand store for real-time label synchronization
  const defaultCaseTrackingLabel = t("productLibrary.sideBar.CaseTracking", "Case Tracking")
  const { label: caseTrackingLabel } = useCasePanTrackingLabelStore()

  const sidebarGroups: SidebarGroup[] = useMemo(() => [
    {
      id: "products",
      label: t("productLibrary.sideBar.Products", "Products"),
      items: [
        { id: "products", label: t("productLibrary.sideBar.Products", "Products"), href: `${routePrefix}/products` },
        { id: "product-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/product-category` },
        { id: "product-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub Category"), href: `${routePrefix}/product-sub-category` },
      ]
    },
    {
      id: "addons",
      label: t("productLibrary.sideBar.AddOns", "Add-ons"),
      items: [
        { id: "add-ons-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/add-ons-category` },
        { id: "add-ons-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub category"), href: `${routePrefix}/add-ons-sub-category` },
        { id: "add-ons", label: t("productLibrary.sideBar.AddOns", "Add-ons"), href: `${routePrefix}/add-ons` },
      ]
    },
  ], [t, routePrefix])

  const retentionGroup: SidebarGroup = useMemo(() => ({
    id: "retention",
    label: t("productLibrary.sideBar.Retention", "Retention"),
    items: [
      { id: "retention-type", label: t("productLibrary.sideBar.RetentionType", "Retention Type"), href: `${routePrefix}/retention` },
      { id: "retention-option", label: t("productLibrary.sideBar.RetentionOption", "Retention Option"), href: `${routePrefix}/retention-option` },
    ]
  }), [t, routePrefix])

  // Flat items (single tabs, not in accordion)
  const flatItems: SideTabItem[] = useMemo(() => [
    // { id: "case-pans", label: t("productLibrary.sideBar.CasePans", "Case Pans"), href: `${routePrefix}/case-pans` },
    { id: "case-tracking", label: caseTrackingLabel, href: `${routePrefix}/case-tracking` },
    { id: "stages", label: t("productLibrary.sideBar.Stages", "Stages"), href: `${routePrefix}/stages` },
    { id: "grades", label: t("productLibrary.sideBar.Grades", "Grades"), href: `${routePrefix}/grades` },
    { id: "tooth-mapping", label: t("productLibrary.sideBar.ToothMapping", "Tooth Mapping"), href: `${routePrefix}/tooth-mapping` },
    { id: "impression", label: t("productLibrary.sideBar.Impressions", "Impression"), href: `${routePrefix}/impression` },
    { id: "teeth-shade", label: t("productLibrary.sideBar.TeethShades", "Teeth Shade"), href: `${routePrefix}/teeth-shade` },
    { id: "gum-shade", label: t("productLibrary.sideBar.GumShades", "Gum Shade"), href: `${routePrefix}/gum-shade` },
    { id: "material", label: t("productLibrary.sideBar.Materials", "Material"), href: `${routePrefix}/material` },
  ], [t, routePrefix, caseTrackingLabel])

  // Flatten all items to find active tab
  const allItems = useMemo(() => 
    [...sidebarGroups.flatMap(group => group.items), ...retentionGroup.items, ...flatItems],
    [sidebarGroups, retentionGroup, flatItems]
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
    checkGroup(retentionGroup)
    setExpandedItems([...new Set(shouldBeExpanded)])
  }, [pathname, sidebarGroups, retentionGroup])

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
    <div className="w-72 bg-white border-r border-[#d9d9d9] flex flex-col h-full">
      <div className="px-6 py-4 font-bold text-lg border-b border-[#d9d9d9] flex-shrink-0">{t("productLibrary.productManagementLabel")}</div>
      <div className="overflow-y-auto flex-1 product-sidebar-scroll">
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
        {/* Flat items before Retention */}
        {flatItems.filter(item => item.id !== "material").map((item) => {
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
        {/* Retention group */}
        {(() => {
          const hasActiveItem = retentionGroup.items.some(item => isActive(item.href))
          const groupExpanded = isExpanded(retentionGroup.id)
          
          return (
            <SidebarGroupItem
              key={retentionGroup.id}
              group={retentionGroup}
              isExpanded={groupExpanded}
              hasActiveItem={hasActiveItem}
              isActive={isActive}
              toggleExpand={toggleMenuItem}
              handleTabClick={handleTabClick}
            />
          )
        })()}
        {/* Material (after Retention) */}
        {flatItems.filter(item => item.id === "material").map((item) => {
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
        .product-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #1162a8 #e5e7eb;
        }
        .product-sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .product-sidebar-scroll::-webkit-scrollbar-track {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .product-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #1162a8;
          border-radius: 4px;
        }
        .product-sidebar-scroll::-webkit-scrollbar-thumb:hover {
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
