type UserProfileImageSource = {
  image?: string | null
  avatar?: string | null
}

/**
 * Resolve a profile photo URL from API/session user fields (`image` or `avatar`).
 * Relative paths are prefixed with NEXT_PUBLIC_API_BASE_URL.
 */
export function getUserProfileImageUrl(user?: UserProfileImageSource | null): string {
  const raw = (user?.image?.trim() || user?.avatar?.trim() || "").trim()
  if (!raw) return ""

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  if (!apiBase) return raw

  const baseUrl = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase
  const path = raw.startsWith("/") ? raw : `/${raw}`
  return `${baseUrl}${path}`
}

/**
 * Get user avatar URL from API/session fields only (no placeholder fallback).
 */
export function getUserAvatar(userImage?: string | null): string {
  return getUserProfileImageUrl({ image: userImage })
}
