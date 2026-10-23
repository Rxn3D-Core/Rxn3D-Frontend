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

const LAB_ROLE_SLUGS = new Set(["lab_admin", "lab_user", "lab_driver"])

/**
 * Pull a role name out of whatever the API sent: a slug string, a `{ id, name }`
 * object (UserProfileResource / UserResource), or an array of either (first usable wins).
 * Returns "" for anything else so callers can safely run string operations on it.
 */
export function extractRoleName(role: unknown): string {
  if (typeof role === "string") return role
  if (Array.isArray(role)) {
    for (const item of role) {
      const name = extractRoleName(item)
      if (name.trim()) return name
    }
    return ""
  }
  if (role && typeof role === "object") {
    const { name, slug } = role as { name?: unknown; slug?: unknown }
    if (typeof name === "string") return name
    if (typeof slug === "string") return slug
  }
  return ""
}

/** Normalize role from API objects, labels, or snake_case strings. */
export function normalizeRoleSlug(role?: unknown): string {
  const trimmed = extractRoleName(role).trim()
  if (!trimmed) return ""
  if (trimmed.includes("_")) return trimmed.toLowerCase()
  const labelKey = trimmed.toLowerCase()
  if (ROLE_LABEL_TO_SLUG[labelKey]) return ROLE_LABEL_TO_SLUG[labelKey]
  return trimmed.toLowerCase().replace(/\s+/g, "_")
}

/** Role for auth state: a normalized slug, or null when the value is missing or unusable. */
export function toProfileRole(role: unknown): string | null {
  return normalizeRoleSlug(role) || null
}

/**
 * Read back a role persisted in localStorage. Earlier builds could persist an object
 * as "[object Object]"; treat that (and other placeholder strings) as no role.
 */
export function sanitizeStoredRole(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  if (trimmed === "[object Object]" || trimmed === "undefined" || trimmed === "null") return null
  return trimmed
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

/** Parse localStorage `role` when it is a single slug or a JSON array of roles. */
export function parseStoredRoleSlugs(role?: string | null): string[] {
  if (!role) return []
  const trimmed = role.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeRoleSlug(typeof item === "string" ? item : null))
          .filter(Boolean)
      }
    } catch {
      // fall through to single-slug parse
    }
  }
  const slug = normalizeRoleSlug(trimmed)
  return slug ? [slug] : []
}

/**
 * Whether create-slip should treat the active profile as a lab
 * (lab_id = active customer, office_id = wizard selection).
 * Prefer customerType (same as the new-case wizard); fall back to stored role(s).
 */
export function isLabSlipCreateContext(role?: string | null): boolean {
  const customerType = getActiveCustomerType()
  if (customerType === "lab") return true
  if (customerType === "office") return false
  return parseStoredRoleSlugs(role).some((slug) => LAB_ROLE_SLUGS.has(slug))
}
