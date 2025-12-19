import {
  BarChart,
  Box,
  Briefcase,
  Building,
  Calendar,
  Cog,
  CreditCard,
  Factory,
  FileText,
  Folder,
  Link,
  MessageSquare,
  Monitor,
  Settings,
  Star,
  Store,
  User,
  Users,
  FlaskConical,
  Layers,
  Settings2,
  ListPlusIcon,
  LayoutDashboard,
} from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
export interface MenuItem {
  id: string
  title: string
  icon?: ReactNode
  path?: string
  children?: MenuItem[]
  permission?: string[]
}

export function useTranslatedMenu(menu: MenuItem[]): MenuItem[] {
  const { t } = useTranslation()

  return menu.map((item) => ({
    ...item,
    title: t(`menu.${item.id}`), 
    children: item.children ? useTranslatedMenu(item.children) : undefined, 
  }))
}

/**
 * Menu definitions for different user roles.
 * Consider splitting this file or lazy-loading icons if performance is an issue.
 */
// Superadmin Menu
export const superadminMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
  {
    id: "lab-office-management",
    title: "Lab & Office Management",
    icon: <Building className="h-5 w-5" />,
    children: [
      {
        id: "all-labs",
        title: "All Labs",
        path: "/lab-office-management/all-labs",
        icon: <Factory className="h-5 w-5" />,
      },
      {
        id: "all-offices",
        title: "All Offices",
        path: "/lab-office-management/all-offices",
        icon: <Briefcase className="h-5 w-5" />,
      },
      {
        id: "all-users",
        title: "All Users",
        path: "/lab-office-management/all-users",
        icon: <Users className="h-5 w-5" />,
      },
      {
        id: "invite-entity",
        title: "Invite New Entity",
        path: "/lab-office-management/invite",
        icon: <Users className="h-5 w-5" />,
      },
    ],
  },
  {
    id: "user-role-management",
    title: "User & Role Management",
    icon: <Users className="h-5 w-5" />,
    path: "/permission",
  },
  {
    id: "performance-management",
    title: "Performance Management",
    icon: <Star className="h-5 w-5" />,
    path: "/performance-management",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    icon: <Store className="h-5 w-5" />,
    path: "/marketplace",
  },
  {
    id: "billing-subscription",
    title: "Billing & Subscription Control",
    icon: <CreditCard className="h-5 w-5" />,
    path: "/billing-subscription",
  },
  {
    id: "platform-configuration",
    title: "Platform Configuration",
    icon: <Settings className="h-5 w-5" />,
    children: [
      {
        id: "global-product-library",
        title: "Global Product Library",
        path: "/global-product-library",
      },
      {
        id: "global-advance-mode",
        title: "Global Advance Mode",
        icon: <ListPlusIcon className="h-5 w-5" />,
        path: "/global-advance-mode",
      },
      {
        id: "global-workflow",
        title: "Global Workflow",
        path: "/global-workflow",
      },
      {
        id: "global-pricing",
        title: "Global Pricing",
        path: "/global-pricing",
      },
      {
        id: "global-clinical-option",
        title: "Global Clinical Option",
        path: "/global-clinical-option",
      },
      {
        id: "api-webhook",
        title: "Api & Webhook",
        path: "/api-webhook",
      },
    ],
  },
  {
    id: "case-management",
    title: "Case Management",
    icon: <Folder className="h-5 w-5" />,
    children: [
      {
        id: "global-case-list",
        title: "Global Case List",
        path: "/case-management",
      },
      {
        id: "global-call-logs",
        title: "Global Call Logs",
        path: "/case-management/call-logs",
      },
      {
        id: "global-slip-notes",
        title: "Global Slip Notes",
        path: "/case-management/slip-notes",
      },
    ],
  },
  {
    id: "feedback-system",
    title: "Feedback System",
    icon: <MessageSquare className="h-5 w-5" />,
    path: "/feedback-system",
  },
  {
    id: "system-setting",
    title: "System Setting",
    icon: <Cog className="h-5 w-5" />,
    children: [
      {
        id: "dashboard-settings",
        title: "Dashboard Settings",
        icon: <LayoutDashboard className="h-5 w-5" />,
        path: "/dashboard/settings",
      },
      {
        id: "system-setting-main",
        title: "System Setting",
    path: "/system-setting",
      },
    ],
  },
]

// Lab Admin Menu
export const labAdminMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
  {
    id: "lab-profile",
    title: "Lab Profile",
    icon: <Building className="h-5 w-5" />,
    path: "/lab-profile",
  },
  {
    id: "lab-management",
    title: "Lab Management",
    icon: <FlaskConical className="h-5 w-5" />,
    children: [
      {
        id: "staff-management",
        title: "Staff Management",
        path: "/lab-administrator/staff-management",
      },
      {
        id: "lab-schedule",
        title: "Lab Schedule",
        path: "/lab-administrator/lab-schedule",
      },
      {
        id: "all-connections",
        title: "All Connections",
        path: "/lab-administrator/all-connections",
      },
    ],
  },
  {
    id: "product-management",
    title: "Product Management",
    icon: <Box className="h-5 w-5" />,
    path: "/lab-product-library/products",
  },
  {
    id: "advance-mode",
    title: "Advance Mode",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-plus-icon lucide-list-plus"><path d="M16 5H3"/><path d="M11 12H3"/><path d="M16 19H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>,
    path: "/lab-advance-mode",
  },
  {
    id: "case-management",
    title: "Case Management",
    icon: <Folder className="h-5 w-5" />,
    children: [
      {
        id: "case-list",
        title: "Case List",
        path: "/lab-case-management/",
      },
      {
        id: "call-logs",
        title: "Call logs",
        path: "/lab-case-management/call-logs",
      },
      {
        id: "slip-notes",
        title: "Slip notes",
        path: "/lab-case-management/slip-notes",
      },
    ],
  },
  {
    id: "user-management",
    title: "User Management",
    icon: <Users className="h-5 w-5" />,
    path: "/lab-administrator/user-management",
  },
  {
    id: "production",
    title: "Production",
    icon: <Factory className="h-5 w-5" />,
    path: "/lab-administrator/production",
  },
  {
    id: "billing",
    title: "Billing & Subscription",
    icon: <CreditCard className="h-5 w-5" />,
    children: [
      {
        id: "subscriptions",
        title: "Subscriptions",
        path: "/billing/subscriptions",
      },
      {
        id: "charge-management",
        title: "Charge Management",
        path: "/billing/charge-management",
      },
      {
        id: "generate-statements",
        title: "Generate Statements",
        path: "/billing/generate-statements",
      },
      {
        id: "integrations",
        title: "Integrations",
        path: "/billing/integrations",
      },
    ],
  },
  {
    id: "system-setting",
    title: "System Setting",
    icon: <Cog className="h-5 w-5" />,
    children: [
      {
        id: "dashboard-settings",
        title: "Dashboard Settings",
        icon: <LayoutDashboard className="h-5 w-5" />,
        path: "/dashboard/settings",
      },
      {
        id: "system-setting-main",
        title: "System Setting",
    path: "/lab-administrator/system-settings",
      },
    ],
  },
]

// Office Admin Menu
export const officeAdminMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
  {
    id: "office-profile",
    title: "Office Profile",
    icon: <Building className="h-5 w-5" />,
    path: "/office-profile",
  },
  {
    id: "user-management",
    title: "User Management",
    icon: <Users className="h-5 w-5" />,
    path: "#",
    children: [
      {
        id: "all-users",
        title: "All Users",
        path: "/office-administrator/user-management",
      },
      {
        id: "office-admin",
        title: "Office Admin",
        path: "/office-administrator/office-admin",
      },
      {
        id: "doctors",
        title: "Doctors",
        path: "/office-administrator/doctors",
      },
      {
        id: "users",
        title: "Users",
        path: "/office-administrator/users",
      },
    ],
  },
  {
    id: "case-management",
    title: "Case Management",
    icon: <Folder className="h-5 w-5" />,
    children: [
      {
        id: "case-list",
        title: "Case List",
        path: "/office-case-management/",
      },
      {
        id: "call-logs",
        title: "Call logs",
        path: "/office-case-management/call-logs",
      },
      {
        id: "slip-notes",
        title: "Slip notes",
        path: "/office-case-management/slip-notes",
      },
    ],
  },
  {
    id: "office-connections",
    title: "Connections",
    icon: <Link className="h-5 w-5" />,
    path: "/office-administrator/connections",
  },
  {
    id: "billing",
    title: "Billing",
    icon: <CreditCard className="h-5 w-5" />,
    path: "/office-administrator/billing",
  },
  {
    id: "settings",
    title: "System Settings",
    icon: <Cog className="h-5 w-5" />,
    children: [
      {
        id: "dashboard-settings",
        title: "Dashboard Settings",
        icon: <LayoutDashboard className="h-5 w-5" />,
        path: "/dashboard/settings",
      },
      {
        id: "system-settings-main",
        title: "System Settings",
    path: "/office-administrator/system-settings",
      },
    ],
  },
]

// Doctor Admin Menu
export const doctorAdminMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
 
 
  {
    id: "case-management",
    title: "Case Management",
    icon: <Folder className="h-5 w-5" />,
    path: "/slips",
  },
  
  
  {
    id: "billing",
    title: "Billing",
    icon: <CreditCard className="h-5 w-5" />,
    path: "/billing",
  },
  {
    id: "system-setting",
    title: "System Setting",
    icon: <Cog className="h-5 w-5" />,
    children: [
      {
        id: "dashboard-settings",
        title: "Dashboard Settings",
        icon: <LayoutDashboard className="h-5 w-5" />,
        path: "/dashboard/settings",
      },
      {
        id: "system-setting-main",
        title: "System Setting",
    path: "/doctor/system-settings",
      },
    ],
  },
]

// Lab User Menu
export const labUserMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
  {
    id: "user-profile",
    title: "User Profile",
    icon: <User className="h-5 w-5" />,
    path: "#",
  },
  {
    id: "case-management",
    title: "Case Management",
    icon: <Folder className="h-5 w-5" />,
    path: "/slips",
  },
]

// Office User Menu
export const officeUserMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
  {
    id: "user-profile",
    title: "User Profile",
    icon: <User className="h-5 w-5" />,
    path: "#",
  },
  {
    id: "case-management",
    title: "Case Management",
    icon: <Folder className="h-5 w-5" />,
    path: "/slips",
  },
  {
    id: "system-setting",
    title: "System Setting",
    icon: <Cog className="h-5 w-5" />,
    children: [
      {
        id: "dashboard-settings",
        title: "Dashboard Settings",
        icon: <LayoutDashboard className="h-5 w-5" />,
        path: "/dashboard/settings",
      },
      {
        id: "system-setting-main",
        title: "System Setting",
    path: "/settings",
      },
    ],
  },
  {
    id: "connections",
    title: "Connections",
    icon: <Link className="h-5 w-5" />,
    path: "#",
  },
]

export const defaultMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
  },
  {
    id: "settings",
    title: "Settings",
    icon: <Cog className="h-5 w-5" />,
    path: "/settings",
  },
]

export function getMenuByRole(role: string): MenuItem[] {
  switch (role) {
    case "superadmin":
      return superadminMenu
    case "lab_admin":
      return labAdminMenu
    case "office_admin":
      return officeAdminMenu
    case "doctor_admin":
      return doctorAdminMenu
    case "doctor":
      return doctorAdminMenu
    case "lab_user":
      return labUserMenu
    case "office_user":
      return officeUserMenu
    default:
      return defaultMenu
  }
}
