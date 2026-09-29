// Determines the default "home" page (after login, onboarding, profile switch,
// or leaving a flow). The dashboard is only opened explicitly from the menu.
// - Superadmin -> Global Case List
// - Lab profile / lab roles -> Lab Case Management (case list)
// - Office profile / office & doctor roles -> Office Case Management (case list)
// - Everyone else -> Dashboard (no case list available)
const LAB_ROLES = ["lab_admin", "lab_user", "lab_driver"]
const OFFICE_ROLES = ["office_admin", "office_user", "doctor_admin", "doctor"]

type UserWithRoles = { roles?: string[] | string; role?: string } | null | undefined

export function getPostLoginLandingPath(roles: string[], customerType?: string | null): string {
  if (roles.includes("superadmin")) return "/case-management"

  const type = (customerType ?? "").toLowerCase()
  if (type === "lab") return "/lab-case-management"
  if (type === "office") return "/office-case-management"

  if (roles.some((role) => LAB_ROLES.includes(role))) return "/lab-case-management"
  if (roles.some((role) => OFFICE_ROLES.includes(role))) return "/office-case-management"

  return "/dashboard"
}

function rolesOf(user: UserWithRoles): string[] {
  if (Array.isArray(user?.roles)) return user.roles
  if (typeof user?.roles === "string") return [user.roles]
  return user?.role ? [user.role] : []
}

/** Landing page for the active session: stored user, selected profile type, and superadmin lab context. */
export function getActiveLandingPath(user?: UserWithRoles): string {
  if (typeof window === "undefined") return getPostLoginLandingPath(rolesOf(user))

  let sessionUser = user
  if (!sessionUser) {
    try {
      sessionUser = JSON.parse(localStorage.getItem("user") || "null")
    } catch {
      sessionUser = null
    }
  }

  const roles = localStorage.getItem("superadmin_lab_context") ? ["lab_admin"] : rolesOf(sessionUser)
  return getPostLoginLandingPath(roles, localStorage.getItem("customerType"))
}
