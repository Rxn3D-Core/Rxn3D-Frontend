// Determines where a user lands immediately after login.
// - Lab roles  -> Lab Case Management (case list)
// - Office roles -> Office Case Management (case list)
// - Everyone else (superadmin, doctor, etc.) -> Dashboard
export function getPostLoginLandingPath(roles: string[]): string {
  const isLab = roles.some((role) => role === "lab_admin" || role === "lab_user")
  if (isLab) return "/lab-case-management"

  const isOffice = roles.some((role) => role === "office_admin" || role === "office_user")
  if (isOffice) return "/office-case-management"

  return "/dashboard"
}
