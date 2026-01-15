"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronsRight, ChevronDown, ChevronRight, LogOut, X } from "lucide-react"
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from "@/lib/utils"
import { type MenuItem, getMenuByRole } from "@/config/sidebar-menu"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { CompactPreloadStatus } from "@/components/3d-model-preload-status"
import { CustomerLogo } from "@/components/customer-logo"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { useTheme } from "@/contexts/theme-context"


interface DashboardSidebarProps {
  onClose?: () => void;
  isMobileOverlay?: boolean;
}

export function DashboardSidebar({ onClose, isMobileOverlay = false }: DashboardSidebarProps = {}) {
  const isMobile = useIsMobile();
  const pathname = usePathname() || "";
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isHovered, setIsHovered] = useState(false)
  const { user, logout } = useAuth()
  // Wrap the provided logout() in a TanStack mutation so we can disable UI and show errors
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // logout is async and already handles API call and client cleanup
      return logout()
    },
    onError(error: any) {
      console.error('Logout failed', error)
      toast({ title: 'Logout failed', description: error?.message || 'Please try again.', variant: 'destructive' })
    },
    onSuccess() {
      toast({ title: 'Signed out', description: 'You have been logged out.', variant: 'default' })
    },
  })
  const userRole = user?.roles?.[0]
  const menuItems = useMemo(() => getMenuByRole(userRole || ""), [userRole])
  const { currentLanguage } = useLanguage()
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  
  // Initialize logo store from localStorage on mount
  const initializeFromStorage = useCustomerLogoStore((state) => state.initializeFromStorage)
  useEffect(() => {
    initializeFromStorage()
  }, [initializeFromStorage])
  
  // Get customer ID for logo display
  const getCustomerId = (): number | null => {
    // First try to get from localStorage (set during login)
    if (typeof window !== "undefined") {
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        return parseInt(storedCustomerId, 10)
      }
    }

    // Then try to get from user's customers array
    if (user?.customers && user.customers.length > 0) {
      return user.customers[0].id
    }

    // If user has a customer_id property
    if (user?.customer_id) {
      return user.customer_id
    }

    // If user has a customer object
    if (user?.customer?.id) {
      return user.customer.id
    }

    return null
  }

  const customerId = getCustomerId()
  
  useEffect(() => {
    const currentPath = pathname || "";

    const shouldBeExpanded: string[] = []

    const checkItem = (item: MenuItem, parentIds: string[] = []) => {
      const currentIds = [...parentIds, item.id]

      if (item.path && (currentPath === item.path || currentPath.startsWith(`${item.path}/`))) {
        shouldBeExpanded.push(...currentIds)
        return true
      }

      if (item.children) {
        for (const child of item.children) {
          if (checkItem(child, currentIds)) {
            return true
          }
        }
      }

      return false
    }

    menuItems.forEach((item) => checkItem(item))

    setExpandedItems([...new Set(shouldBeExpanded)])
  }, [pathname, menuItems, currentLanguage])

  const toggleSidebar = () => {
    setExpanded(!expanded)
  }

  const toggleMenuItem = (itemId: string) => {
    setExpanded(true); // Automatically expand sidebar when a tab is clicked
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId && !isChildOf(id, itemId, menuItems))
        : [...prev, itemId],
    );
  }

  const isChildOf = (childId: string, parentId: string, items: MenuItem[]): boolean => {
    for (const item of items) {
      if (item.id === parentId) {
        return (
          item.children?.some(
            (child) => child.id === childId || (child.children && isChildOf(childId, child.id, [child])),
          ) || false
        )
      }
      if (item.children) {
        if (isChildOf(childId, parentId, item.children)) {
          return true
        }
      }
    }
    return false
  }

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  const isExpanded = (itemId: string) => {
    return expandedItems.includes(itemId)
  }

  // Handle mouse enter/leave for hover expansion
  const handleMouseEnter = () => {
    if (!expanded) {
      // setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  // Determine if sidebar should be expanded (either manually expanded or hovered)
  const shouldExpand = expanded || isHovered

  if (isMobile && !isMobileOverlay) {
    // Bottom navigation for mobile
    const visibleItems = menuItems.slice(0, 4);
    
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#d9d9d9] flex justify-around items-center min-h-[64px] h-[64px] sm:h-[72px] shadow-lg pb-safe">
        {visibleItems.map((item) => (
          <Link 
            key={item.id} 
            href={item.path || "#"} 
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 sm:py-2 px-0.5 sm:px-1 active:bg-gray-50 transition-colors rounded-lg mx-0.5 sm:mx-1 min-w-0",
              isActive(item.path) && "bg-blue-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center mb-0.5 sm:mb-1",
              isActive(item.path) ? "text-[#1162a8]" : "text-[#666666]"
            )}>
              <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                {item.icon}
              </div>
            </div>
            <span className={cn(
              "text-[14px] font-['Verdana'] font-normal leading-[100%] tracking-[0%] truncate w-full text-center px-0.5",
              isActive(item.path) ? "text-[#1162a8]" : "text-[#666666]"
            )}>
              {t(`menu.${item.title}`, item.title)}
            </span>
          </Link>
        ))}
        {/* Sign Out Button */}
        <button
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1.5 sm:py-2 px-0.5 sm:px-1 text-[#666666] active:bg-gray-50 transition-colors rounded-lg mx-0.5 sm:mx-1 min-w-0 disabled:opacity-50"
          )}
          onClick={() => {
            logoutMutation.mutate()
          }}
          disabled={logoutMutation.isPending}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mb-0.5 sm:mb-1">
            <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="text-[14px] font-['Verdana'] font-normal leading-[100%] tracking-[0%] truncate w-full text-center px-0.5">
            {t("menu.logout", "Sign Out")}
          </span>
        </button>
      </nav>
    );
  }
  // Desktop/Tablet sidebar or Mobile overlay
  const isDark = theme === "dark"
  const sidebarBg = isDark ? "bg-[#1162a8]" : "bg-white"
  const sidebarBorder = isDark ? "border-[#0f5497]" : "border-[#d9d9d9]"
  const textColor = isDark ? "text-white" : "text-[#000000]"
  const hoverBg = isDark ? "hover:bg-[#0f5497]" : "hover:bg-gray-100"
  const activeBg = isDark ? "bg-[#0f5497]" : "bg-[#e4e6ef]"
  
  return (
    <div
      className={cn(
        sidebarBg,
        "flex flex-col transition-all duration-300 relative",
        isMobileOverlay
          ? "h-full w-full"
          : `border-r ${sidebarBorder} h-screen`,
        !isMobileOverlay && (shouldExpand ? "w-48 md:w-56 lg:w-64" : "w-12 md:w-14 lg:w-16"),
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mobile overlay close button */}
      {isMobileOverlay && onClose && (
        <div className={cn("flex justify-end p-3 sm:p-4 border-b", isDark ? "border-[#0f5497]" : "border-[#d9d9d9]")}>
          <button
            onClick={onClose}
            className={cn("p-2 rounded-full transition-colors touch-manipulation", isDark ? "hover:bg-[#0f5497] active:bg-[#0d4a86]" : "hover:bg-gray-100 active:bg-gray-200")}
            aria-label="Close sidebar"
          >
            <X className={cn("h-5 w-5 sm:h-6 sm:w-6", textColor)} />
          </button>
        </div>
      )}

      {/* Logo */}
      <div className={cn(
        "flex items-center",
        isMobileOverlay ? "p-3 sm:p-4 justify-start" : "p-2 sm:p-3 md:p-4 justify-center"
      )}>
        {(shouldExpand || isMobileOverlay) ? (
          <div className="flex items-center space-x-2 w-full">
            <Link href="/" className="flex items-center justify-center w-full">
              {customerId ? (
                <CustomerLogo
                  customerId={customerId}
                  alt="Company Logo"
                  className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain"
                />
              ) : (
                <Image 
                  src="/images/rxn3d-logo.png" 
                  alt="RXN3D" 
                  width={160} 
                  height={48} 
                  className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain" 
                />
              )}
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            {customerId ? (
              <CustomerLogo
                customerId={customerId}
                alt="Company Logo"
                className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain rounded-full p-1"
              />
            ) : (
              <div className={cn("text-xl sm:text-2xl md:text-3xl font-bold rounded-full w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center", isDark ? "text-white" : "text-[#1162a8]")}>R</div>
            )}
          </div>
        )}
      </div>

      {/* Toggle button - hide on mobile overlay */}
      {!isMobileOverlay && (
        <button 
          onClick={toggleSidebar} 
          className={cn("flex justify-center items-center py-2 sm:py-3 md:py-4 transition-colors touch-manipulation", hoverBg, isDark ? "active:bg-[#0d4a86]" : "active:bg-gray-200")}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronsRight className={cn(
            "h-5 w-5 md:h-6 md:w-6 transition-transform",
            isDark ? "text-white" : "text-[#a19d9d]",
            expanded ? "rotate-180" : ""
          )} />
        </button>
      )}

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              expanded={shouldExpand || isMobileOverlay}
              isActive={isActive}
              isExpanded={isExpanded}
              toggleExpand={toggleMenuItem}
              level={0}
              onItemClick={isMobileOverlay ? onClose : undefined}
            />
          ))}
        </div>

        {/* Sign Out Button */}
        <button
          className={cn(
            "flex items-center px-3 sm:px-4 py-2.5 sm:py-3 transition-colors w-full text-left touch-manipulation",
            hoverBg,
            isDark ? "active:bg-[#0d4a86]" : "active:bg-gray-200",
            logoutMutation.isPending && 'opacity-60 cursor-wait'
          )}
          onClick={() => {
            logoutMutation.mutate()
            if (isMobileOverlay && onClose) onClose();
          }}
          disabled={logoutMutation.isPending}
        >
          <div className="flex items-center">
            <div className={cn("flex items-center justify-center", textColor)}>
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            {(shouldExpand || isMobileOverlay) && (
              <span className={cn("ml-2 sm:ml-3 text-[14px] font-['Verdana'] font-normal leading-[100%] tracking-[0%]", textColor)}>
                {t("menu.logout", "Sign Out")}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}

interface SidebarItemProps {
  item: MenuItem
  expanded: boolean
  isActive: (path?: string) => boolean
  isExpanded: (itemId: string) => boolean
  toggleExpand: (itemId: string) => void
  level: number
  onItemClick?: () => void
}

function SidebarItem({ item, expanded, isActive, isExpanded, toggleExpand, level, onItemClick }: SidebarItemProps) {
  const hasChildren = item.children && item.children.length > 0;
  const active = isActive(item.path);
  const itemExpanded = isExpanded(item.id);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      toggleExpand(item.id);
    } else if (onItemClick) {
      onItemClick();
    }
  };

  // Memoize the translated title
  const translatedTitle = useMemo(
    () => t(`menu.${item.title}`, item.title),
    [t, item.title]
  );

  return (
    <div>
      <Link
        href={item.path || "#"}
        className={cn(
          "flex items-center px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 transition-colors touch-manipulation",
          isDark ? "hover:bg-[#0f5497] active:bg-[#0d4a86]" : "hover:bg-gray-100 active:bg-gray-200",
          active && (isDark ? "bg-[#0f5497]" : "bg-[#e4e6ef]"),
          level > 0 && expanded && (level === 1 ? "pl-6 sm:pl-8" : level === 2 ? "pl-9 sm:pl-12" : `pl-${3 + level * 3} sm:pl-${4 + level * 4}`),
        )}
        onClick={handleClick}
      >
        <div className="flex items-center w-full min-w-0">
          <div className={cn(
            "flex items-center justify-center flex-shrink-0",
            isDark ? "text-white" : active ? "text-[#1162a8]" : "text-[#000000]"
          )}>
            <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
              {item.icon}
            </div>
          </div>

          {expanded && (
            <>
              <span className={cn(
                "ml-2 sm:ml-3 text-[14px] font-['Verdana'] font-normal leading-[100%] tracking-[0%] flex-1 truncate min-w-0",
                isDark ? "text-white" : active ? "text-[#1162a8]" : "text-[#000000]"
              )}>
                {translatedTitle}
              </span>

              {hasChildren &&
                (itemExpanded ? (
                  <ChevronDown className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 ml-auto flex-shrink-0", isDark ? "text-white" : "text-[#000000]")} />
                ) : (
                  <ChevronRight className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 ml-auto flex-shrink-0", isDark ? "text-white" : "text-[#000000]")} />
                ))}
            </>
          )}
        </div>
      </Link>

      {/* Render children if expanded and item is expanded */}
      {expanded && hasChildren && itemExpanded && (
        <div className={cn(
          "space-y-0.5 sm:space-y-1 py-0.5 sm:py-1",
          level === 0 ? "ml-4 sm:ml-5" : ""
        )}>
          {item.children?.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              expanded={expanded}
              isActive={isActive}
              isExpanded={isExpanded}
              toggleExpand={toggleExpand}
              level={level + 1}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
