/** Office roles allowed to upload a photo for any doctor in their office. */
const PHOTO_MANAGER_ROLES = ["office_admin", "doctor_admin"] as const

export interface DoctorPhotoActor {
  roles: string[]
  currentUserId: number | null
}

/**
 * The active role is stored as a plain string, or as a JSON array when the user
 * holds more than one role on the selected profile (see auth-context login).
 */
export function readActiveRoles(): string[] {
  if (typeof window === "undefined") return []

  const raw = localStorage.getItem("role")
  if (!raw) return []

  const trimmed = raw.trim()
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((role): role is string => typeof role === "string")
      }
    } catch {
      // Fall through and treat the raw value as a single role name.
    }
  }

  return trimmed ? [trimmed] : []
}

export function readCurrentUserId(): number | null {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem("user")
  if (!raw) return null

  try {
    const id = Number(JSON.parse(raw)?.id)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

export function readDoctorPhotoActor(): DoctorPhotoActor {
  return { roles: readActiveRoles(), currentUserId: readCurrentUserId() }
}

/**
 * A doctor may only upload their own photo; office admins and doctor admins may
 * upload for any doctor in the office. Every other role is read-only.
 */
export function canUploadDoctorPhoto(doctorId: number, actor: DoctorPhotoActor): boolean {
  if (actor.roles.some((role) => PHOTO_MANAGER_ROLES.includes(role as (typeof PHOTO_MANAGER_ROLES)[number]))) {
    return true
  }
  if (actor.roles.includes("doctor")) {
    return actor.currentUserId !== null && actor.currentUserId === doctorId
  }
  return false
}
