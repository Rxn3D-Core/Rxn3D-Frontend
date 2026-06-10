/** Map display labels and loose strings to backend role slugs. */
const ROLE_LABEL_TO_SLUG: Record<string, string> = {
  "lab admin": "lab_admin",
  "lab user": "lab_user",
  "lab driver": "lab_driver",
  "office admin": "office_admin",
  "office user": "office_user",
  "doctor admin": "doctor_admin",
  doctor: "doctor",
  superadmin: "superadmin",
}

/** Normalize role from API objects, labels, or snake_case strings. */
export function normalizeRoleSlug(role?: string | null): string {
  if (!role) return ""
  const trimmed = role.trim()
  if (!trimmed) return ""
  if (trimmed.includes("_")) return trimmed.toLowerCase()
  const labelKey = trimmed.toLowerCase()
  if (ROLE_LABEL_TO_SLUG[labelKey]) return ROLE_LABEL_TO_SLUG[labelKey]
  return trimmed.toLowerCase().replace(/\s+/g, "_")
}

export function getActiveCustomerType(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("customerType")?.toLowerCase() ?? null
}

export function isLabCustomerContext(): boolean {
  return getActiveCustomerType() === "lab"
}

export function isOfficeCustomerContext(): boolean {
  return getActiveCustomerType() === "office"
}
