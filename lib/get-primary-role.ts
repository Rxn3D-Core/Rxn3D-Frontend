type UserWithRoles = {
  roles?: string[] | string
  role?: string
} | null | undefined

/**
 * Resolve the effective primary role using the same priority order as the dashboard router.
 * Ensures widget settings match the dashboard UI when a user has multiple roles.
 */
export function getPrimaryRole(user?: UserWithRoles): string {
  if (user?.roles && Array.isArray(user.roles)) {
    if (user.roles.includes("superadmin")) return "superadmin"
    if (user.roles.includes("lab_admin")) return "lab_admin"
    if (user.roles.includes("lab_user")) return "lab_user"
    if (user.roles.includes("office_admin")) return "office_admin"
    if (user.roles.includes("office_user")) return "office_user"
    if (user.roles.includes("doctor_admin")) return "doctor_admin"
    if (user.roles.includes("doctor")) return "doctor"
    return user.roles[0] || "user"
  }

  if (Array.isArray(user?.roles)) {
    return user.roles[0] || "user"
  }

  if (typeof user?.roles === "string") {
    return user.roles
  }

  if (user?.role) {
    return user.role
  }

  return "user"
}
