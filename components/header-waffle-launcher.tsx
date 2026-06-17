"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { getPrimaryRole } from "@/lib/get-primary-role"
import { filterMenuByPermissions } from "@/lib/menu-permissions"
import { PROFILE_SCOPED_ROLES } from "@/lib/permissions"
import { type MenuItem, getMenuForProfile } from "@/config/sidebar-menu"

function flattenToNavigableItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => {
    if (item.children && item.children.length > 0) {
      return flattenToNavigableItems(item.children)
    }
    return item.path ? [item] : []
  })
}

export function HeaderWaffleLauncher() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() || ""
  const { t } = useTranslation()
  const { user, profilePermissions, isSuperadmin } = useAuth()

  const navItems = useMemo(() => {
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
    return flattenToNavigableItems(filtered)
  }, [user, profilePermissions, isSuperadmin])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open navigation"
          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <LayoutGrid className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[280px] max-h-[70vh] overflow-y-auto p-3"
      >
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">Navigation</p>
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path!)
            return (
              <Link
                key={item.id}
                href={item.path!}
                onClick={() => setOpen(false)}
              >
                <div
                  className={[
                    "w-full h-20 flex flex-col items-center justify-center gap-1 rounded-lg text-xs text-center cursor-pointer transition-colors",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "text-gray-700 dark:text-gray-200",
                    isActive ? "ring-2 ring-[#1162a8] bg-blue-50 dark:bg-blue-950" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="text-gray-500 dark:text-gray-400">{item.icon}</span>
                  <span className="leading-tight px-1">{t(`menu.${item.id}`)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
