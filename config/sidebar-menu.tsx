import {
  BarChart,
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
    children: [
      {
        id: "billing-global-configurations",
        title: "Global Configurations",
        path: "/billing-subscription/billing-configuration",
      },
      {
        id: "billing-tenant-management",
        title: "Tenant Management",
        path: "/billing-subscription/tenant-management",
      },
      {
        id: "billing-settings",
        title: "Settings",
        path: "/billing-subscription/settings",
      },
      {
        id: "billing-invoicing",
        title: "Invoicing",
        path: "/billing-subscription/invoicing",
      },
    ],
  },
  {
    id: "platform-configuration",
    title: "Platform Configuration",
    icon: <Settings className="h-5 w-5" />,
    children: [
      {
        id: "global-product-library",
        title: "Global Product Library",
        path: "/global-product-library/products",
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
        id: "slip-settings",
        title: "Slip Settings",
        icon: <FileText className="h-5 w-5" />,
        path: "/dashboard/slip-settings",
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
    permission: ["view_dashboard"],
  },
  {
    id: "lab-profile",
    title: "Lab Profile",
    icon: <Building className="h-5 w-5" />,
    path: "/lab-profile",
    permission: ["view_lab", "edit_lab", "manage_lab"],
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
        permission: ["manage_users", "create_user", "edit_user", "view_users"],
      },
      {
        id: "lab-schedule",
        title: "Lab Schedule",
        path: "/lab-administrator/lab-schedule",
        permission: ["view_business_setting", "update_business_setting"],
      },
      {
        id: "all-connections",
        title: "All Connections",
        path: "/lab-administrator/all-connections",
        permission: ["get_connections"],
      },
      {
        id: "permission-management",
        title: "User Permissions",
        path: "/permission",
        permission: ["manage_users", "view_users"],
      },
    ],
  },
  {
    id: "product-management",
    title: "Product Management",
    icon: <Layers className="h-5 w-5" />,
    path: "/lab-product-library/products",
    permission: ["view_product", "create_product", "update_product", "delete_product"],
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
        permission: ["view_case_details_status", "submit_new_case", "edit_slip"],
      },
      {
        id: "call-logs",
        title: "Call logs",
        path: "/lab-case-management/call-logs",
        permission: ["view_call_logs", "edit_call_logs"],
      },
      {
        id: "slip-notes",
        title: "Slip notes",
        path: "/lab-case-management/slip-notes",
        permission: ["view_case_details_status"],
      },
    ],
  },
  // {
  //   id: "user-management",
  //   title: "User Management",
  //   icon: <Users className="h-5 w-5" />,
  //   path: "/lab-administrator/user-management",
  // },
  // {
  //   id: "production",
  //   title: "Production",
  //   icon: <Factory className="h-5 w-5" />,
  //   path: "/lab-administrator/production",
  // },
  {
    id: "billing",
    title: "Billing & Subscription",
    icon: <CreditCard className="h-5 w-5" />,
    children: [
      {
        id: "subscriptions",
        title: "Subscriptions",
        path: "/billing/subscriptions",
        permission: ["view_billing", "manage_billing"],
      },
      {
        id: "charge-management",
        title: "Charge Management",
        path: "/billing/charge-management",
        permission: ["view_billing", "manage_billing"],
      },
      {
        id: "generate-statements",
        title: "Generate Statements",
        path: "/billing/generate-statements",
        permission: ["view_statements", "create_statements", "manage_statements"],
      },
      // {
      //   id: "integrations",
      //   title: "Integrations",
      //   path: "/billing/integrations",
      // },
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
        permission: ["manage_dashboard_settings"],
      },
      {
        id: "slip-settings",
        title: "Slip Settings",
        icon: <FileText className="h-5 w-5" />,
        path: "/dashboard/slip-settings",
        permission: ["manage_slip_settings"],
      },
      {
        id: "system-setting-main",
        title: "System Setting",
        path: "/lab-administrator/system-settings",
        permission: ["view_business_setting", "update_business_setting"],
      },
    ],
  },
]

/** Shared lab sidebar — filtered by profile permissions from the API. */
export const labMenu = labAdminMenu

// Office Admin Menu
export const officeAdminMenu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <Monitor className="h-5 w-5" />,
    path: "/dashboard",
    permission: ["view_dashboard"],
  },
  {
    id: "office-profile",
    title: "Office Profile",
    icon: <Building className="h-5 w-5" />,
    path: "/office-profile",
    permission: ["view_office", "edit_office", "manage_office"],
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
        permission: ["manage_users", "create_user", "edit_user", "view_users"],
      },
      {
        id: "office-admin",
        title: "Office Admin",
        path: "/office-administrator/office-admin",
        permission: ["manage_users", "create_user", "edit_user", "view_users"],
      },
      {
        id: "doctors",
        title: "Doctors",
        path: "/office-administrator/doctors",
        permission: ["manage_users", "create_user", "edit_user", "view_users"],
      },
      {
        id: "users",
        title: "Users",
        path: "/office-administrator/users",
        permission: ["manage_users", "create_user", "edit_user", "view_users"],
      },
      {
        id: "permission-management",
        title: "User Permissions",
        path: "/permission",
        permission: ["manage_users", "view_users"],
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
        permission: ["view_case_details_status", "submit_new_case", "edit_slip"],
      },
      {
        id: "call-logs",
        title: "Call logs",
        path: "/office-case-management/call-logs",
        permission: ["view_call_logs", "edit_call_logs"],
      },
      {
        id: "slip-notes",
        title: "Slip notes",
        path: "/office-case-management/slip-notes",
        permission: ["view_case_details_status"],
      },
    ],
  },
  {
    id: "office-connections",
    title: "Connections",
    icon: <Link className="h-5 w-5" />,
    path: "/office-administrator/connections",
    permission: ["get_connections"],
  },
  {
    id: "billing",
    title: "Billing",
    icon: <CreditCard className="h-5 w-5" />,
    path: "/office-administrator/billing",
    permission: ["view_billing", "manage_billing"],
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
        permission: ["manage_dashboard_settings"],
      },
      {
        id: "slip-settings",
        title: "Slip Settings",
        icon: <FileText className="h-5 w-5" />,
        path: "/dashboard/slip-settings",
        permission: ["manage_slip_settings"],
      },
      {
        id: "system-settings-main",
        title: "System Settings",
        path: "/office-administrator/system-settings",
        permission: ["view_business_setting", "update_business_setting"],
      },
    ],
  },
]

/** Shared office sidebar — filtered by profile permissions from the API. */
export const officeMenu = officeAdminMenu

// Legacy doctor admin menu — replaced by officeMenu + permission filtering in dashboard-sidebar.
// export const doctorAdminMenu: MenuItem[] = [
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
        id: "slip-settings",
        title: "Slip Settings",
        icon: <FileText className="h-5 w-5" />,
        path: "/dashboard/slip-settings",
      },
      {
        id: "system-setting-main",
        title: "System Setting",
    path: "/doctor/system-settings",
      },
    ],
  },
]

// Legacy lab user menu — replaced by labMenu + permission filtering in dashboard-sidebar.
// export const labUserMenu: MenuItem[] = [ ... ]

// Legacy office user menu — replaced by officeMenu + permission filtering in dashboard-sidebar.
// export const officeUserMenu: MenuItem[] = [
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
        id: "slip-settings",
        title: "Slip Settings",
        icon: <FileText className="h-5 w-5" />,
        path: "/dashboard/slip-settings",
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
    case "lab_user":
    case "lab_driver":
      return labMenu
    case "office_admin":
    case "office_user":
    case "doctor_admin":
    case "doctor":
      return officeMenu
    default:
      return defaultMenu
  }
}

/**
 * Pick lab vs office menu from active customer profile (not only primary role slug).
 * Superadmin keeps the global menu; profile-scoped users get the menu for their customer type.
 */
export function getMenuForProfile(role: string, customerType?: string | null): MenuItem[] {
  if (role === "superadmin") return superadminMenu
  const type = (customerType ?? "").toLowerCase()
  if (type === "lab") return labMenu
  if (type === "office") return officeMenu
  return getMenuByRole(role)
}
