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
    default:
      return role
        ? role
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "User"
  }
}

export function isDoctorRole(role?: string | null): boolean {
  return role === "doctor"
}
