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
import { useProductLibraryWarningsStore } from "@/stores/product-library-warnings-store"
import { usePreferredShadeGuideStore } from "@/stores/preferred-shade-guide-store"
import { shadeApiService } from "@/services/shade-api-service"
import { getCustomerId } from "@/lib/dashboard-widgets"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  const customerId = useMemo(() => getCustomerId(user), [user])
  const teethExplicit = usePreferredShadeGuideStore((s) => s.teethExplicit)
  const gumExplicit = usePreferredShadeGuideStore((s) => s.gumExplicit)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Get user role from auth context
  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  const isLabAdmin = userRoles.includes("lab_admin")

  // Set route prefix based on user role
  const routePrefix = isLabAdmin ? "/lab-product-library" : "/global-product-library"

  // Use Zustand store for real-time label synchronization
  const defaultCaseTrackingLabel = t("productLibrary.sideBar.CaseTracking", "Case Tracking")
  const { label: caseTrackingLabel } = useCasePanTrackingLabelStore()

  // Product library warnings (incomplete products due to disabled/deleted items)
  const { warnings } = useProductLibraryWarningsStore()
  const itemHasWarning = (itemId: string) => warnings.has(itemId)
  // "Products" parent shows warning if any warnable item has one
  const productsHasWarning = warnings.size > 0

  useEffect(() => {
    if (!customerId) {
      usePreferredShadeGuideStore.getState().setTeethExplicit(null)
      usePreferredShadeGuideStore.getState().setGumExplicit(null)
      return
    }
    let cancelled = false
    Promise.all([
      shadeApiService.getPreferredTeethShades({ customer_id: customerId }),
      shadeApiService.getPreferredGumShades({ customer_id: customerId }),
    ])
      .then(([teethRes, gumRes]) => {
        if (cancelled) return
        const t = teethRes.data?.has_explicit_preference
        const g = gumRes.data?.has_explicit_preference
        usePreferredShadeGuideStore.getState().setTeethExplicit(typeof t === "boolean" ? t : null)
        usePreferredShadeGuideStore.getState().setGumExplicit(typeof g === "boolean" ? g : null)
      })
      .catch(() => {
        if (cancelled) return
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const sidebarGroups: SidebarGroup[] = useMemo(() => [
    {
      id: "products",
      label: t("productLibrary.sideBar.Products", "Products"),
      items: [
        { id: "product-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/product-category` },
        { id: "product-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub Category"), href: `${routePrefix}/product-sub-category` },
        { id: "products", label: t("productLibrary.sideBar.Products", "Products"), href: `${routePrefix}/products` },
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
    <TooltipProvider>
      <div className="w-72 bg-white border-r border-[#d9d9d9] flex flex-col h-full">
      <div className="px-6 py-4 font-bold text-lg border-b border-[#d9d9d9] flex-shrink-0">{t("productLibrary.productManagementLabel")}</div>
      <div className="overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:#1162a8_#e5e7eb]">
        {sidebarGroups.map((group) => {
          const hasActiveItem = group.items.some(item => isActive(item.href))
          const groupExpanded = isExpanded(group.id)
          // "products" group shows warning if any warnable item has a warning
          const groupWarning = group.id === "products" && productsHasWarning

          return (
            <SidebarGroupItem
              key={group.id}
              group={group}
              isExpanded={groupExpanded}
              hasActiveItem={hasActiveItem}
              isActive={isActive}
              toggleExpand={toggleMenuItem}
              handleTabClick={handleTabClick}
              hasWarning={groupWarning}
              itemHasWarning={itemHasWarning}
            />
          )
        })}
        {/* Flat items before Retention */}
        {flatItems.filter(item => item.id !== "material").map((item) => {
          const itemActive = isActive(item.href)
          const showWarning = itemHasWarning(item.id)
          const showPreferredShadeGuideWarning =
            !!customerId &&
            ((item.id === "teeth-shade" && teethExplicit === false) ||
              (item.id === "gum-shade" && gumExplicit === false))
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-base transition-colors font-medium",
                itemActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.label}
              {showWarning && <SidebarWarningIcon itemType={item.label} />}
              {showPreferredShadeGuideWarning && <SidebarPreferredShadeGuideWarningIcon />}
            </Link>
          )
        })}
        {/* Retention group */}
        {(() => {
          const hasActiveItem = retentionGroup.items.some(item => isActive(item.href))
          const groupExpanded = isExpanded(retentionGroup.id)
          const retentionWarning = retentionGroup.items.some(item => itemHasWarning(item.id))

          return (
            <SidebarGroupItem
              key={retentionGroup.id}
              group={retentionGroup}
              isExpanded={groupExpanded}
              hasActiveItem={hasActiveItem}
              isActive={isActive}
              toggleExpand={toggleMenuItem}
              handleTabClick={handleTabClick}
              hasWarning={retentionWarning}
              itemHasWarning={itemHasWarning}
            />
          )
        })()}
        {/* Material (after Retention) */}
        {flatItems.filter(item => item.id === "material").map((item) => {
          const itemActive = isActive(item.href)
          const showWarning = itemHasWarning(item.id)
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-base transition-colors font-medium",
                itemActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.label}
              {showWarning && <SidebarWarningIcon itemType={item.label} />}
            </Link>
          )
        })}
      </div>
      </div>
    </TooltipProvider>
  )
}

interface SidebarGroupItemProps {
  group: SidebarGroup
  isExpanded: boolean
  hasActiveItem: boolean
  isActive: (href?: string) => boolean
  toggleExpand: (groupId: string) => void
  handleTabClick: (tabId: string) => void
  hasWarning?: boolean
  itemHasWarning?: (itemId: string) => boolean
}

function SidebarGroupItem({ group, isExpanded, hasActiveItem, isActive, toggleExpand, handleTabClick, hasWarning, itemHasWarning }: SidebarGroupItemProps) {
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
        <span className="flex items-center gap-2">
          {group.label}
          {hasWarning && <SidebarWarningIcon itemType={group.label} />}
        </span>
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
            const showItemWarning = itemHasWarning?.(item.id) ?? false
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-2 pl-12 pr-6 py-3 text-base transition-colors font-medium",
                  itemActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
                )}
                onClick={() => handleTabClick(item.id)}
              >
                {item.label}
                {showItemWarning && <SidebarWarningIcon itemType={item.label} />}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Warning icon when no default preferred shade guide has been saved for this customer */
function SidebarPreferredShadeGuideWarningIcon() {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex-shrink-0 cursor-help" aria-label={t("Select default shade guide.", "Select default shade guide.")}>
          <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 0L18 16H0L9 0Z" fill="#EDBA29" />
            <rect x="8" y="4" width="2" height="7" rx="1" fill="#000" />
            <circle cx="9" cy="13" r="1.2" fill="#000" />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px] text-sm">
        {t("Select default shade guide.", "Select default shade guide.")}
      </TooltipContent>
    </Tooltip>
  )
}

/** Warning triangle icon for sidebar items with tooltip */
function SidebarWarningIcon({ itemType }: { itemType: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex-shrink-0 cursor-help">
          <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 0L18 16H0L9 0Z" fill="#EDBA29" />
            <rect x="8" y="4" width="2" height="7" rx="1" fill="#000" />
            <circle cx="9" cy="13" r="1.2" fill="#000" />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px] text-sm">
        One or more products are missing (Disabled {itemType}).
      </TooltipContent>
    </Tooltip>
  )
}
