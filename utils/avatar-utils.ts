type UserProfileImageSource = {
  image?: string | null
  avatar?: string | null
}

export type DoctorImageSource = {
  image?: string | null
  profile_image?: string | null
  /** Legacy: some office-doctor payloads put the only photo here. Prefer avatar/image fields. */
  signature_url?: string | null
  avatar?: string | null
  avatar_url?: string | null
  image_url?: string | null
  photo_url?: string | null
  photo?: string | null
  user?: DoctorImageSource | null
}

const INVALID_IMAGE_VALUES = new Set(["", "null", "undefined", "none", "n/a", "-"])

/**
 * Normalize a candidate image path/URL. Rejects empty and placeholder strings.
 */
function normalizeImageCandidate(value?: string | null): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (INVALID_IMAGE_VALUES.has(trimmed.toLowerCase())) return ""
  return trimmed
}

/**
 * Media/storage files are served from the API host root, not under `/v1`.
 * NEXT_PUBLIC_API_BASE_URL is often `https://host/v1` — strip that suffix for assets.
 */
function resolveMediaBaseUrl(): string {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim()
  if (!apiBase) return ""
  return apiBase.replace(/\/v1\/?$/i, "").replace(/\/$/, "")
}

/**
 * Resolve a profile photo URL from API/session user fields (`image` or `avatar`).
 * Relative paths are prefixed with the media host (API base without trailing `/v1`).
 */
export function getUserProfileImageUrl(user?: UserProfileImageSource | null): string {
  const raw =
    normalizeImageCandidate(user?.image) || normalizeImageCandidate(user?.avatar)
  if (!raw) return ""

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw
  }

  const mediaBase = resolveMediaBaseUrl()
  if (!mediaBase) return raw

  const path = raw.startsWith("/") ? raw : `/${raw}`
  return `${mediaBase}${path}`
}

/**
 * Get user avatar URL from API/session fields only (no placeholder fallback).
 */
export function getUserAvatar(userImage?: string | null): string {
  return getUserProfileImageUrl({ image: userImage })
}

/**
 * Pick the best doctor photo field from a single payload object.
 * Profile photo fields win over `signature_url` (signatures are not avatars;
 * using them first caused broken loads → stock `/doctors/doctor-*.jpg` placeholders).
 */
function pickDoctorImageRaw(doctor: DoctorImageSource): string {
  return (
    normalizeImageCandidate(doctor.image) ||
    normalizeImageCandidate(doctor.profile_image) ||
    normalizeImageCandidate(doctor.avatar) ||
    normalizeImageCandidate(doctor.avatar_url) ||
    normalizeImageCandidate(doctor.image_url) ||
    normalizeImageCandidate(doctor.photo_url) ||
    normalizeImageCandidate(doctor.photo) ||
    // Last resort for older office-doctor APIs that only exposed a photo here
    normalizeImageCandidate(doctor.signature_url) ||
    ""
  )
}

/**
 * Compute up-to-two-letter initials from a full name (or first/last parts).
 * Used as the ONLY fallback for doctor/user avatars — no placeholder images.
 */
export function getInitials(...parts: Array<string | null | undefined>): string {
  const source = parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim()
  if (!source) return ""
  return source
    .replace(/,?\s*(dds|dmd|md)$/i, "")
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/**
 * Resolve a doctor photo from slip/office doctor API fields.
 * Checks profile photo fields first, then nested `user`, then legacy `signature_url`.
 */
export function resolveDoctorImageUrl(doctor?: DoctorImageSource | null): string {
  if (!doctor) return ""

  const raw =
    pickDoctorImageRaw(doctor) ||
    (doctor.user ? pickDoctorImageRaw(doctor.user) : "") ||
    ""

  if (!raw) return ""
  return getUserProfileImageUrl({ image: raw })
}
