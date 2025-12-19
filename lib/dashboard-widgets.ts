export interface DashboardWidget {
  id: string
  title: string
  enabled: boolean
  order: number
}

export interface DashboardSettings {
  role: string
  widgets: DashboardWidget[]
}

// Widget IDs for each role
export const WIDGET_IDS = {
  // Common widgets
  KPI_CARDS: "kpi-cards",
  STATUS_CARDS: "status-cards",
  COMING_SOON: "coming-soon",
  
  // Superadmin specific
  PLAN_STATISTICS: "plan-statistics",
  ALL_PRACTICES: "all-practices",
  ALL_LABS: "all-labs",
  MY_USERS: "my-users",
  
  // Lab Admin specific
  RUSH_CASES: "rush-cases",
  ON_HOLD_CASES: "on-hold-cases",
  DUE_TODAY: "due-today",
  NEW_STAGE_NOTES: "new-stage-notes",
  LATE_CASES: "late-cases",
  MY_PRACTICES: "my-practices",
  MY_USERS_LAB: "my-users-lab",
  
  // Office Admin specific
  MY_LABS: "my-labs",
  MY_USERS_OFFICE: "my-users-office",
  
  // Doctor specific
  MY_CASES: "my-cases",
  APPOINTMENTS: "appointments",
  
  // Global widget
  CHAT_SUPPORT: "chat-support",
} as const

// Default widgets for Superadmin
export function getDefaultSuperAdminWidgets(): DashboardWidget[] {
  return [
    { id: WIDGET_IDS.KPI_CARDS, title: "KPI Cards", enabled: true, order: 0 },
    { id: WIDGET_IDS.PLAN_STATISTICS, title: "Plan Statistics", enabled: true, order: 1 },
    { id: WIDGET_IDS.ALL_PRACTICES, title: "All Practices", enabled: true, order: 2 },
    { id: WIDGET_IDS.ALL_LABS, title: "All Labs", enabled: true, order: 3 },
    { id: WIDGET_IDS.MY_USERS, title: "My Users", enabled: true, order: 4 },
    { id: WIDGET_IDS.COMING_SOON, title: "More Features Coming Soon", enabled: true, order: 5 },
    { id: WIDGET_IDS.CHAT_SUPPORT, title: "Chat Support", enabled: true, order: 6 },
  ]
}

// Default widgets for Lab Admin
export function getDefaultLabAdminWidgets(): DashboardWidget[] {
  return [
    { id: WIDGET_IDS.KPI_CARDS, title: "KPI Cards", enabled: true, order: 0 },
    { id: WIDGET_IDS.STATUS_CARDS, title: "Status Cards", enabled: true, order: 1 },
    { id: WIDGET_IDS.MY_PRACTICES, title: "My Practices", enabled: true, order: 2 },
    { id: WIDGET_IDS.MY_USERS_LAB, title: "My Users", enabled: true, order: 3 },
    { id: WIDGET_IDS.COMING_SOON, title: "More Features Coming Soon", enabled: true, order: 4 },
    { id: WIDGET_IDS.CHAT_SUPPORT, title: "Chat Support", enabled: true, order: 5 },
  ]
}

// Default widgets for Office Admin
export function getDefaultOfficeAdminWidgets(): DashboardWidget[] {
  return [
    { id: WIDGET_IDS.KPI_CARDS, title: "KPI Cards", enabled: true, order: 0 },
    { id: WIDGET_IDS.STATUS_CARDS, title: "Status Cards", enabled: true, order: 1 },
    { id: WIDGET_IDS.MY_LABS, title: "My Labs", enabled: true, order: 2 },
    { id: WIDGET_IDS.MY_USERS_OFFICE, title: "My Users", enabled: true, order: 3 },
    { id: WIDGET_IDS.COMING_SOON, title: "More Features Coming Soon", enabled: true, order: 4 },
    { id: WIDGET_IDS.CHAT_SUPPORT, title: "Chat Support", enabled: true, order: 5 },
  ]
}

// Default widgets for Doctor
export function getDefaultDoctorWidgets(): DashboardWidget[] {
  return [
    { id: WIDGET_IDS.KPI_CARDS, title: "KPI Cards", enabled: true, order: 0 },
    { id: WIDGET_IDS.STATUS_CARDS, title: "Status Cards", enabled: true, order: 1 },
    { id: WIDGET_IDS.MY_CASES, title: "My Cases", enabled: true, order: 2 },
    { id: WIDGET_IDS.APPOINTMENTS, title: "Appointments", enabled: true, order: 3 },
    { id: WIDGET_IDS.COMING_SOON, title: "More Features Coming Soon", enabled: true, order: 4 },
    { id: WIDGET_IDS.CHAT_SUPPORT, title: "Chat Support", enabled: true, order: 5 },
  ]
}

// Default widgets for Lab User
export function getDefaultLabUserWidgets(): DashboardWidget[] {
  return [
    { id: WIDGET_IDS.KPI_CARDS, title: "KPI Cards", enabled: true, order: 0 },
    { id: WIDGET_IDS.STATUS_CARDS, title: "Status Cards", enabled: true, order: 1 },
    { id: WIDGET_IDS.COMING_SOON, title: "More Features Coming Soon", enabled: true, order: 2 },
    { id: WIDGET_IDS.CHAT_SUPPORT, title: "Chat Support", enabled: true, order: 3 },
  ]
}

// Default widgets for Office User
export function getDefaultOfficeUserWidgets(): DashboardWidget[] {
  return [
    { id: WIDGET_IDS.KPI_CARDS, title: "KPI Cards", enabled: true, order: 0 },
    { id: WIDGET_IDS.STATUS_CARDS, title: "Status Cards", enabled: true, order: 1 },
    { id: WIDGET_IDS.COMING_SOON, title: "More Features Coming Soon", enabled: true, order: 2 },
    { id: WIDGET_IDS.CHAT_SUPPORT, title: "Chat Support", enabled: true, order: 3 },
  ]
}

// Get default widgets for a role
export function getDefaultWidgetsForRole(role: string): DashboardWidget[] {
  switch (role) {
    case "superadmin":
      return getDefaultSuperAdminWidgets()
    case "lab_admin":
      return getDefaultLabAdminWidgets()
    case "office_admin":
      return getDefaultOfficeAdminWidgets()
    case "doctor":
    case "doctor_admin":
      return getDefaultDoctorWidgets()
    case "lab_user":
      return getDefaultLabUserWidgets()
    case "office_user":
      return getDefaultOfficeUserWidgets()
    default:
      return []
  }
}

// Helper function to get customer ID from various sources
export function getCustomerId(user?: any): number | null {
  if (typeof window === "undefined") return null
  
  // First try to get from localStorage (set during login/location selection)
  const storedCustomerId = localStorage.getItem("customerId")
  if (storedCustomerId) {
    return parseInt(storedCustomerId, 10)
  }

  // Try to get from selectedLocation in localStorage
  const selectedLocation = localStorage.getItem("selectedLocation")
  if (selectedLocation) {
    try {
      const location = JSON.parse(selectedLocation)
      if (location?.id) {
        return location.id
      }
    } catch (e) {
      // Ignore parse errors
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

// SessionStorage key generator
export function getDashboardSettingsKey(role: string, userId?: number, customerId?: number | null): string {
  const parts = [`dashboard-settings-${role}`]
  
  if (userId) {
    parts.push(`user-${userId}`)
  }
  
  if (customerId) {
    parts.push(`customer-${customerId}`)
  }
  
  return parts.join("-")
}

// Load settings from sessionStorage
export function loadDashboardSettings(role: string, userId?: number, customerId?: number | null): DashboardSettings | null {
  if (typeof window === "undefined") return null
  
  try {
    const key = getDashboardSettingsKey(role, userId, customerId)
    const stored = sessionStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored) as DashboardSettings
    }
  } catch (error) {
    console.error("Error loading dashboard settings:", error)
  }
  
  return null
}

// Save settings to sessionStorage
export function saveDashboardSettings(settings: DashboardSettings, userId?: number, customerId?: number | null): void {
  if (typeof window === "undefined") return
  
  try {
    const key = getDashboardSettingsKey(settings.role, userId, customerId)
    sessionStorage.setItem(key, JSON.stringify(settings))
  } catch (error) {
    console.error("Error saving dashboard settings:", error)
  }
}

// Get enabled widgets in order
export function getEnabledWidgets(settings: DashboardSettings): DashboardWidget[] {
  return settings.widgets
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.order - b.order)
}

// Check if a widget is enabled
export function isWidgetEnabled(settings: DashboardSettings, widgetId: string): boolean {
  const widget = settings.widgets.find((w) => w.id === widgetId)
  return widget?.enabled ?? false
}

