/** Maps listing roleFilter values to API role enum values. */
export function resolveLockedRole(roleFilter?: string | null): string | undefined {
  if (!roleFilter || roleFilter === "all") return undefined
  if (roleFilter === "other") return "office_user"
  return roleFilter
}

/** Button copy for the page / filter you are on. */
export function getAddUserButtonLabel(role?: string | null): string {
  switch (role) {
    case "lab_admin":
      return "Add Lab Admin"
    case "lab_user":
      return "Add Lab User"
    case "office_admin":
      return "Add Office Admin"
    case "office_user":
      return "Add Office User"
    case "doctor":
      return "Add Doctor"
    case "doctor_admin":
      return "Add Doctor Admin"
    default:
      return "Add User"
  }
}

/** Modal / form title when creating a user of a known role. */
export function getCreateUserTitle(role?: string | null): string {
  switch (role) {
    case "lab_admin":
      return "Create Lab Admin"
    case "lab_user":
      return "Create Lab User"
    case "office_admin":
      return "Create Office Admin"
    case "office_user":
      return "Create Office User"
    case "doctor":
      return "Create Doctor"
    case "doctor_admin":
      return "Create Doctor Admin"
    default:
      return "Create New User"
  }
}

/** Human-readable role label for display (not form submission). */
export function getRoleDisplayLabel(role?: string | null): string {
  switch (role) {
    case "lab_admin":
      return "Lab Admin"
    case "lab_user":
      return "Lab User"
    case "office_admin":
      return "Office Admin"
    case "office_user":
      return "Office User"
    case "doctor":
      return "Doctor"
    case "doctor_admin":
      return "Doctor Admin"
    default:
      return role
        ? role
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "User"
  }
}

/** Pure doctor role (not the mixed doctor_admin composite). */
export function isDoctorRole(role?: string | null): boolean {
  return role === "doctor"
}

/** Office admin role (not the mixed doctor_admin composite). */
export function isOfficeAdminRole(role?: string | null): boolean {
  return role === "office_admin"
}

/** Composite Dr + Admin role used on office profiles. */
export function isDoctorAdminRole(role?: string | null): boolean {
  return role === "doctor_admin"
}

/** Any role that carries doctor credentials (license + signature). */
export function requiresDoctorCredentials(role?: string | null): boolean {
  return role === "doctor" || role === "doctor_admin"
}

/**
 * Resolve the office role to submit from the primary role + mix checkboxes.
 * - Admin page + “also Doctor” → doctor_admin
 * - Doctor page + “also Admin” → doctor_admin
 */
export function resolveOfficeMixedRole(params: {
  baseRole?: string | null
  isAlsoDoctor?: boolean
  isAlsoAdmin?: boolean
}): string {
  const base = params.baseRole || ""
  if (base === "doctor_admin") {
    if (params.isAlsoDoctor === false && params.isAlsoAdmin !== false) return "office_admin"
    if (params.isAlsoAdmin === false && params.isAlsoDoctor !== false) return "doctor"
    return "doctor_admin"
  }
  if (base === "office_admin") {
    return params.isAlsoDoctor ? "doctor_admin" : "office_admin"
  }
  if (base === "doctor") {
    return params.isAlsoAdmin ? "doctor_admin" : "doctor"
  }
  return base
}
