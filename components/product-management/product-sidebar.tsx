"use client"

import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Box,
  PlusSquare,
  ClipboardList,
  Workflow,
  Award,
  Map,
  ScanLine,
  Palette,
  ShieldCheck,
  FlaskConical,
  Settings2,
  Layers3,
  Tags,
} from "lucide-react"
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
  icon?: React.ReactNode
  children?: SideTabItem[]
}

type SidebarGroup = {
  id: string
  label: string
  icon?: React.ReactNode
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

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
      icon: <Box className="h-4 w-4" />,
      items: [
        { id: "product-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/product-category`, icon: <Tags className="h-4 w-4" /> },
        { id: "product-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub Category"), href: `${routePrefix}/product-sub-category`, icon: <Tags className="h-4 w-4" /> },
        { id: "products", label: t("productLibrary.sideBar.Products", "Products"), href: `${routePrefix}/products`, icon: <Box className="h-4 w-4" /> },
      ]
    },
    {
      id: "addons",
      label: t("productLibrary.sideBar.AddOns", "Add-ons"),
      icon: <PlusSquare className="h-4 w-4" />,
      items: [
        { id: "add-ons-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/add-ons-category`, icon: <Tags className="h-4 w-4" /> },
        { id: "add-ons-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub category"), href: `${routePrefix}/add-ons-sub-category`, icon: <Tags className="h-4 w-4" /> },
        { id: "add-ons", label: t("productLibrary.sideBar.AddOns", "Add-ons"), href: `${routePrefix}/add-ons`, icon: <PlusSquare className="h-4 w-4" /> },
      ]
    },
  ], [t, routePrefix])

  const retentionGroup: SidebarGroup = useMemo(() => ({
    id: "retention",
    label: t("productLibrary.sideBar.Retention", "Retention"),
    icon: <ShieldCheck className="h-4 w-4" />,
    items: [
      { id: "retention-option", label: t("productLibrary.sideBar.RetentionOption", "Retention Option"), href: `${routePrefix}/retention-option`, icon: <ShieldCheck className="h-4 w-4" /> },
      { id: "retention-type", label: t("productLibrary.sideBar.RetentionType", "Retention Type"), href: `${routePrefix}/retention`, icon: <ShieldCheck className="h-4 w-4" /> },
      { id: "implant-library", label: t("advanceMode.sidebar.ImplantLibrary", "Implant Library"), href: `${routePrefix}/implant-library`, icon: <Layers3 className="h-4 w-4" /> },
      { id: "abutment-library", label: t("advanceMode.sidebar.AbutmentLibrary", "Abutment Library"), href: `${routePrefix}/abutment-library`, icon: <Layers3 className="h-4 w-4" /> },
    ]
  }), [t, routePrefix])

  const advanceConfigGroup: SidebarGroup = useMemo(() => ({
    id: "advance-configurations",
    label: t("advanceMode.sidebar.AdvanceFields", "Advance Configurations"),
    icon: <Settings2 className="h-4 w-4" />,
    items: [
      { id: "advance-config-category", label: t("advanceMode.sidebar.Category", "Category"), href: `${routePrefix}/advance-category`, icon: <Tags className="h-4 w-4" /> },
      { id: "advance-config-sub-category", label: t("advanceMode.sidebar.SubCategory", "Sub Category"), href: `${routePrefix}/advance-sub-category`, icon: <Tags className="h-4 w-4" /> },
      { id: "advance-config-fields", label: t("advanceMode.sidebar.Fields", "Fields"), href: `${routePrefix}/advance-fields`, icon: <Settings2 className="h-4 w-4" /> },
    ],
  }), [t, routePrefix])

  const groupIds = useMemo(
    () => [...sidebarGroups.map((group) => group.id), retentionGroup.id, advanceConfigGroup.id],
    [sidebarGroups, retentionGroup.id, advanceConfigGroup.id],
  )
  const expandedGroupsStorageKey = useMemo(
    () => `product-sidebar-expanded-groups:${routePrefix}`,
    [routePrefix],
  )
  const sidebarOpenStorageKey = useMemo(
    () => `product-sidebar-open:${routePrefix}`,
    [routePrefix],
  )
  const [hasHydratedExpandedItems, setHasHydratedExpandedItems] = useState(false)

  // Flat items (single tabs, not in accordion)
  const flatItems: SideTabItem[] = useMemo(() => [
    // { id: "case-pans", label: t("productLibrary.sideBar.CasePans", "Case Pans"), href: `${routePrefix}/case-pans` },
    { id: "case-tracking", label: caseTrackingLabel, href: `${routePrefix}/case-tracking`, icon: <ClipboardList className="h-4 w-4" /> },
    { id: "stages", label: t("productLibrary.sideBar.Stages", "Stages"), href: `${routePrefix}/stages`, icon: <Workflow className="h-4 w-4" /> },
    { id: "grades", label: t("productLibrary.sideBar.Grades", "Grades"), href: `${routePrefix}/grades`, icon: <Award className="h-4 w-4" /> },
    { id: "tooth-mapping", label: t("productLibrary.sideBar.ToothMapping", "Tooth Mapping"), href: `${routePrefix}/tooth-mapping`, icon: <Map className="h-4 w-4" /> },
    { id: "impression", label: t("productLibrary.sideBar.Impressions", "Impression"), href: `${routePrefix}/impression`, icon: <ScanLine className="h-4 w-4" /> },
    { id: "teeth-shade", label: t("productLibrary.sideBar.TeethShades", "Teeth Shade"), href: `${routePrefix}/teeth-shade`, icon: <Palette className="h-4 w-4" /> },
    { id: "gum-shade", label: t("productLibrary.sideBar.GumShades", "Gum Shade"), href: `${routePrefix}/gum-shade`, icon: <Palette className="h-4 w-4" /> },
    { id: "material", label: t("productLibrary.sideBar.Materials", "Material"), href: `${routePrefix}/material`, icon: <FlaskConical className="h-4 w-4" /> },
  ], [t, routePrefix, caseTrackingLabel])

  // Flatten all items to find active tab
  const allItems = useMemo(() => 
    [...sidebarGroups.flatMap(group => group.items), ...retentionGroup.items, ...advanceConfigGroup.items, ...flatItems],
    [sidebarGroups, retentionGroup, advanceConfigGroup, flatItems]
  )

  // Find the active tab only once
  const activeTabHref = useMemo(
    () => allItems.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href,
    [pathname, allItems]
  )

  // Restore saved group state; default all groups open if not found.
  useEffect(() => {
    if (typeof window === "undefined") return

    const savedExpandedGroups = window.localStorage.getItem(expandedGroupsStorageKey)
    if (!savedExpandedGroups) {
      setExpandedItems(groupIds)
      setHasHydratedExpandedItems(true)
      return
    }

    try {
      const parsedExpandedGroups = JSON.parse(savedExpandedGroups)
      if (!Array.isArray(parsedExpandedGroups)) {
        setExpandedItems(groupIds)
        setHasHydratedExpandedItems(true)
        return
      }

      const validExpandedGroups = parsedExpandedGroups.filter(
        (groupId): groupId is string => typeof groupId === "string" && groupIds.includes(groupId),
      )

      setExpandedItems(validExpandedGroups)
    } catch {
      setExpandedItems(groupIds)
    } finally {
      setHasHydratedExpandedItems(true)
    }
  }, [expandedGroupsStorageKey, groupIds])

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedExpandedItems) return
    window.localStorage.setItem(expandedGroupsStorageKey, JSON.stringify(expandedItems))
  }, [expandedItems, expandedGroupsStorageKey, hasHydratedExpandedItems])

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedSidebarOpenState = window.localStorage.getItem(sidebarOpenStorageKey)
    if (savedSidebarOpenState === null) {
      setIsSidebarExpanded(true)
      return
    }
    setIsSidebarExpanded(savedSidebarOpenState === "true")
  }, [sidebarOpenStorageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(sidebarOpenStorageKey, String(isSidebarExpanded))
  }, [isSidebarExpanded, sidebarOpenStorageKey])

  const toggleSidebarPanel = () => {
    setIsSidebarExpanded((prev) => !prev)
  }

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

  const collapsedMenuItems = useMemo(() => {
    const groupNavItems = sidebarGroups
      .map((group) => ({
        id: group.id,
        label: group.label,
        href: group.items[0]?.href,
        icon: group.icon,
      }))
      .filter((item) => !!item.href)

    const leadingFlatItems = flatItems.filter((item) => item.id !== "material")
    const materialItem = flatItems.filter((item) => item.id === "material")

    return [
      ...groupNavItems,
      ...leadingFlatItems,
      { id: retentionGroup.id, label: retentionGroup.label, href: retentionGroup.items[0]?.href, icon: retentionGroup.icon },
      ...materialItem,
      {
        id: advanceConfigGroup.id,
        label: advanceConfigGroup.label,
        href: advanceConfigGroup.items[0]?.href,
        icon: advanceConfigGroup.icon,
      },
    ].filter((item): item is { id: string; label: string; href: string; icon?: React.ReactNode } => Boolean(item.href))
  }, [sidebarGroups, flatItems, retentionGroup, advanceConfigGroup])

  return (
    <TooltipProvider>
      <div className={cn(
        "bg-white border-r border-[#d9d9d9] flex flex-col h-full transition-all duration-300",
        isSidebarExpanded ? "w-72" : "w-14",
      )}>
      <div className={cn(
        "py-4 border-b border-[#d9d9d9] flex-shrink-0 flex items-center sticky top-0 bg-white z-10",
        isSidebarExpanded ? "px-4 justify-between" : "px-2 justify-center",
      )}>
        {isSidebarExpanded && (
          <span className="font-bold text-lg truncate">{t("productLibrary.productManagementLabel")}</span>
        )}
        <button
          type="button"
          onClick={toggleSidebarPanel}
          className="p-2 rounded-md text-[#1162a8] hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8]/40 transition-colors"
          aria-label={isSidebarExpanded ? "Collapse Product Management sidebar" : "Expand Product Management sidebar"}
          title={isSidebarExpanded ? "Collapse" : "Expand"}
        >
          {isSidebarExpanded ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      </div>
      {isSidebarExpanded ? (
      <div className="overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:#1162a8_#e5e7eb] pb-2">
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
                "flex items-center gap-2 px-6 py-3.5 text-base transition-all duration-200 font-medium rounded-r-md",
                itemActive
                  ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8] shadow-[inset_0_0_0_1px_rgba(17,98,168,0.08)]"
                  : "text-[#000000] hover:bg-gray-100 hover:translate-x-[1px]",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.icon && <span className="text-[#1162a8]">{item.icon}</span>}
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
                "flex items-center gap-2 px-6 py-3.5 text-base transition-all duration-200 font-medium rounded-r-md",
                itemActive
                  ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8] shadow-[inset_0_0_0_1px_rgba(17,98,168,0.08)]"
                  : "text-[#000000] hover:bg-gray-100 hover:translate-x-[1px]",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.icon && <span className="text-[#1162a8]">{item.icon}</span>}
              {item.label}
              {showWarning && <SidebarWarningIcon itemType={item.label} />}
            </Link>
          )
        })}
        {/* Advance configurations group (last) */}
        {(() => {
          const hasActiveItem = advanceConfigGroup.items.some(item => isActive(item.href))
          const groupExpanded = isExpanded(advanceConfigGroup.id)
          const groupWarning = advanceConfigGroup.items.some(item => itemHasWarning(item.id))

          return (
            <SidebarGroupItem
              key={advanceConfigGroup.id}
              group={advanceConfigGroup}
              isExpanded={groupExpanded}
              hasActiveItem={hasActiveItem}
              isActive={isActive}
              toggleExpand={toggleMenuItem}
              handleTabClick={handleTabClick}
              hasWarning={groupWarning}
              itemHasWarning={itemHasWarning}
            />
          )
        })()}
      </div>
      ) : (
        <div className="overflow-y-auto flex-1 flex flex-col items-center gap-1 py-2">
          {collapsedMenuItems.map((item) => {
            const itemActive = isActive(item.href)
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    prefetch={true}
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8]/40",
                      itemActive
                        ? "bg-[#dfeefb] text-[#1162a8] border border-[#1162a8] shadow-sm"
                        : "text-[#1162a8] hover:bg-gray-100 hover:scale-[1.03]",
                    )}
                  >
                    {item.icon ?? <span className="text-sm font-semibold">{item.label.charAt(0)}</span>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      )}
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
          "flex items-center justify-between w-full px-6 py-3.5 text-base font-medium transition-all duration-200 text-left rounded-r-md",
          hasActiveItem
            ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8] shadow-[inset_0_0_0_1px_rgba(17,98,168,0.08)]"
            : "text-[#000000] hover:bg-gray-100 hover:translate-x-[1px]"
        )}
      >
        <span className="flex items-center gap-2">
          {group.icon && <span className="text-[#1162a8]">{group.icon}</span>}
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
                  "flex items-center gap-2 pl-12 pr-6 py-2.5 text-base transition-all duration-200 font-medium rounded-r-md",
                  itemActive
                    ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8] shadow-[inset_0_0_0_1px_rgba(17,98,168,0.08)]"
                    : "text-[#000000] hover:bg-gray-100 hover:translate-x-[1px]",
                )}
                onClick={() => handleTabClick(item.id)}
              >
                {item.icon && <span className="text-[#1162a8]">{item.icon}</span>}
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
