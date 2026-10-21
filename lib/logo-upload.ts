/**
 * Rules for lab and office logo uploads (registration, profile pages, Super Admin edit customer).
 * Mirrors the backend rule (`mimes:png,jpg,jpeg|mimetypes:image/png,image/jpeg|max:1024`): PNG or JPG only, max 1 MB.
 * SVG is not allowed: mail apps cannot display it and it can carry scripts.
 */

export const LOGO_ACCEPT = "image/png,image/jpeg"
export const LOGO_MAX_BYTES = 1024 * 1024

export const LOGO_TYPE_ERROR = "Logos must be a PNG or JPG image. SVG files are not allowed."
export const LOGO_SIZE_ERROR = "Logo file size must be less than 1 MB (1024 KB)"

/** Short wording for hints next to an upload button. */
export const LOGO_FORMAT_HINT = "PNG or JPG"

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"]
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg"]

/**
 * Returns an error message, or null when the file is an acceptable logo.
 * Both the extension and the browser-reported type must be PNG/JPG, so `logo.svg` is rejected, and so is an SVG
 * saved under a .png name when the browser reports its real type. The server re-checks the actual file content.
 */
export function validateLogoFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  // Some systems report an empty type; the extension check still applies and the server checks the content.
  const typeAllowed = file.type === "" || ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())

  if (!ALLOWED_EXTENSIONS.includes(extension) || !typeAllowed) {
    return LOGO_TYPE_ERROR
  }

  if (file.size > LOGO_MAX_BYTES) {
    return LOGO_SIZE_ERROR
  }

  return null
}
