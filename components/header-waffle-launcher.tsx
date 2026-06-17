"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Grip, ChevronLeft, Users, CalendarDays, Network, ShieldCheck,
  ClipboardList, PhoneCall, StickyNote,
  BadgeDollarSign, Receipt, FileText,
  Settings,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { getPrimaryRole } from "@/lib/get-primary-role"
import { filterMenuByPermissions } from "@/lib/menu-permissions"
import { PROFILE_SCOPED_ROLES } from "@/lib/permissions"
import { type MenuItem, getMenuForProfile } from "@/config/sidebar-menu"

const FALLBACK_ICONS: Record<string, React.ReactNode> = {
  "staff-management":    <Users className="h-5 w-5" />,
  "lab-schedule":        <CalendarDays className="h-5 w-5" />,
  "all-connections":     <Network className="h-5 w-5" />,
  "permission-management": <ShieldCheck className="h-5 w-5" />,
  "case-list":           <ClipboardList className="h-5 w-5" />,
  "call-logs":           <PhoneCall className="h-5 w-5" />,
  "slip-notes":          <StickyNote className="h-5 w-5" />,
  "subscriptions":       <BadgeDollarSign className="h-5 w-5" />,
  "charge-management":   <Receipt className="h-5 w-5" />,
  "generate-statements": <FileText className="h-5 w-5" />,
  "system-setting-main": <Settings className="h-5 w-5" />,
}

function withFallbackIcon(item: MenuItem): MenuItem {
  if (item.icon) return item
  const icon = FALLBACK_ICONS[item.id]
  return icon ? { ...item, icon } : item
}

function getTopLevelItems(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => item.path || (item.children && item.children.length > 0)).slice(0, 9)
}

function tileHref(item: MenuItem): string {
  return item.path ?? item.children?.[0]?.path ?? "#"
}

interface TileProps {
  item: MenuItem
  isActive: boolean
  onClick: () => void
}

function NavTile({ item, isActive, onClick }: TileProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-xl p-3 h-[110px] text-center cursor-pointer transition-colors select-none",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "text-gray-700 dark:text-gray-200",
        isActive ? "ring-2 ring-[#1162a8] bg-blue-50 dark:bg-blue-950" : "",
      ].filter(Boolean).join(" ")}
    >
      <span className="text-gray-700 dark:text-gray-300 flex-shrink-0 [&>svg]:h-8 [&>svg]:w-8">{item.icon}</span>
      <span className="text-[12px] font-medium leading-tight line-clamp-2 w-full">{item.title}</span>
    </div>
  )
}

export function HeaderWaffleLauncher() {
  const [open, setOpen] = useState(false)
  const [drilldown, setDrilldown] = useState<MenuItem | null>(null)
  const pathname = usePathname() || ""
  const { user, profilePermissions, isSuperadmin } = useAuth()

  const topItems = useMemo(() => {
    const userRole = getPrimaryRole(user)
    const customerType =
      typeof window !== "undefined" ? localStorage.getItem("customerType") : null
    const baseMenu = getMenuForProfile(userRole || "", customerType)
    const usesProfilePermissions = PROFILE_SCOPED_ROLES.includes(
      userRole as (typeof PROFILE_SCOPED_ROLES)[number],
    )
    const filtered = usesProfilePermissions
      ? filterMenuByPermissions(baseMenu, profilePermissions, isSuperadmin)
      : baseMenu
    return getTopLevelItems(filtered)
  }, [user, profilePermissions, isSuperadmin])

  const displayItems = (drilldown ? (drilldown.children ?? []) : topItems).map(withFallbackIcon)

  function handleClose() {
    setOpen(false)
    setDrilldown(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setDrilldown(null)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Open navigation"
              className="h-12 w-12 p-0 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Grip className="h-8 w-8 text-gray-700 dark:text-gray-200" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Navigation</TooltipContent>
      </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" sideOffset={8} className="w-[380px] p-4">
        <div className="flex items-center gap-1 mb-3 px-1">
          {drilldown && (
            <button
              onClick={() => setDrilldown(null)}
              className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            {drilldown ? drilldown.title : "Navigation"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {displayItems.map((item) => {
            const hasChildren = (item.children?.length ?? 0) > 0
            const href = tileHref(item)
            const isActive = pathname.startsWith(href) && href !== "#"

            if (hasChildren && !item.path) {
              return (
                <NavTile
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  onClick={() => setDrilldown(item)}
                />
              )
            }

            return (
              <Link key={item.id} href={href} onClick={handleClose}>
                <NavTile item={item} isActive={isActive} onClick={() => {}} />
              </Link>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
