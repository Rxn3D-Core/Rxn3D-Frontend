"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, LogOut, Menu, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
// Add the import for useTranslation at the top of the file
import { useTranslation } from "react-i18next"

interface MenuItem {
  name: string
  icon: React.ReactNode
  href: string
  expanded?: boolean
  active?: boolean
  children?: MenuItem[]
  onClick?: (e: React.MouseEvent) => void
}

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  const { logout } = useAuth()
  const pathname = usePathname() || "";
  const { t } = useTranslation()

  const menuItems = React.useMemo(
    () => [
      {
        name: t("sidebar.dashboard"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        ),
        href: "/dashboard",
        active: false,
      },
      {
        name: t("sidebar.banner"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        href: "#",
      },
      {
        name: t("sidebar.labProfile"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ),
        href: "/lab-profile",
      },
      {
        name: t("sidebar.lab"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        ),
        href: "/lab-administrator/lab-admins",
      },
      {
        name: t("sidebar.slips"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        href: "/slips",
      },
      {
        name: t("sidebar.labAdministrator"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        href: "/lab-administrator",
        expanded: true,
        children: [
          {
            name: t("sidebar.products"),
            href: "/lab-administrator?tab=products",
            icon: <ChevronRight className="h-4 w-4" />,
          },
          {
            name: t("sidebar.stage"),
            href: "/lab-administrator?tab=stages",
            icon: <ChevronRight className="h-4 w-4" />,
          },
          {
            name: t("sidebar.casePan"),
            href: "/lab-administrator?tab=category-addons",
            icon: <ChevronRight className="h-4 w-4" />,
          },
          {
            name: t("sidebar.departments"),
            href: "/lab-administrator/departments",
            icon: <ChevronRight className="h-4 w-4" />,
          },
          { name: t("sidebar.staff"), href: "/lab-administrator/staff", icon: <ChevronRight className="h-4 w-4" /> },
          { name: t("sidebar.grade"), href: "/lab-administrator/grades", icon: <ChevronRight className="h-4 w-4" /> },
          {
            name: t("sidebar.labSchedule"),
            href: "/lab-administrator/lab-schedule",
            icon: <ChevronRight className="h-4 w-4" />,
          },
          {
            name: t("sidebar.callLog"),
            href: "/lab-administrator/call-log",
            icon: <ChevronRight className="h-4 w-4" />,
          },
          { name: t("sidebar.historyLog"), href: "/history-log", icon: <ChevronRight className="h-4 w-4" /> },
        ],
      },
      {
        name: t("sidebar.production"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        ),
        href: "#",
      },
      {
        name: t("sidebar.billing"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
        href: "/billing",
        active: false,
        expanded: false,
        children: [
          { name: t("sidebar.slipCredits"), href: "/billing-system", icon: <ChevronRight className="h-4 w-4" /> },
          {
            name: t("sidebar.technicianBilling"),
            href: "/technician-billing",
            icon: <ChevronRight className="h-4 w-4" />,
          },
        ],
      },
      {
        name: t("sidebar.calendarMeeting"),
        icon: <Calendar className="h-5 w-5" />,
        href: "/calendar-meetings",
        active: false,
      },
      {
        name: t("sidebar.permission"),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
        href: "/permission",
      },
      {
        name: t("sidebar.signOut"),
        icon: <LogOut className="h-5 w-5" />,
        href: "#",
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          logout()
        },
      },
    ],
    [logout, pathname, t],
  )

  const menuItemsWithActive = React.useMemo(() => {
    return menuItems.map((item) => ({
      ...item,
      active: item.href === pathname,
      children: item.children?.map((child) => ({
        ...child,
        active: child.href === pathname,
      })),
    }))
  }, [menuItems, pathname])

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({
    6: true, // Lab Administrator is initially expanded
  })

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  // Remove dark mode classes
  const sidebarClasses = cn(
    "border-r flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out",
    "bg-white border-gray-200",
    isOpen ? "w-64" : "w-20",
  )

  return (
    <div className={sidebarClasses}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-center">
        <div className={`${isOpen ? "w-10 h-10 mr-3" : "w-12 h-12"} relative transition-all duration-300`}></div>
        {isOpen && <span className="font-semibold text-gray-800"></span>}
      </div>
      <nav className="mt-2">
        <ul>
          {menuItemsWithActive.map((item, index) => (
            <li key={item.name} className="mb-1">
              <Link
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm ${
                  item.active ? "bg-blue-800 text-white" : "text-gray-700 hover:bg-gray-100"
                } transition-colors duration-150 ease-in-out`}
                onClick={(e) => {
                  if (item.children) {
                    e.preventDefault()
                    toggleExpand(index)
                  } else if (item.onClick) {
                    item.onClick(e)
                  }
                }}
              >
                <span className="mr-3">{item.icon}</span>
                {isOpen && (
                  <>
                    <span className="truncate">{item.name}</span>
                    {item.children && (
                      <span className="ml-auto">
                        {expandedItems[index] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </>
                )}
              </Link>
              {item.children && expandedItems[index] && isOpen && (
                <ul className="ml-8 mt-1">
                  {item.children.map((child) => (
                    <li key={child.name}>
                      <Link
                        href={child.href}
                        className={`flex items-center px-4 py-2 text-sm ${
                          child.active ? "bg-blue-800 text-white" : "text-gray-700 hover:bg-gray-100"
                        } transition-colors duration-150 ease-in-out`}
                      >
                        <span className="mr-3">{child.icon}</span>
                        <span className="truncate">{child.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function SidebarTrigger({ ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      {...props}
    >
      <Menu className="h-6 w-6" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
}

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main>{children}</main>
      </div>
    </div>
  )
}
