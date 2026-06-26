/** Lab roles that may run driver / due-date / ready-to-send slip actions. */
export function isLabSlipUserRole(role: string | null | undefined): boolean {
  return role === "lab_admin" || role === "lab_user"
}

/** Only lab users may change slip due / delivery dates after submission. */
export function canChangeSlipDueDate(role: string | null | undefined): boolean {
  return isLabSlipUserRole(role)
}

export function getStoredSlipUserRole(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("role")
}
