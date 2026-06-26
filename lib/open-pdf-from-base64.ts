/**
 * Decode base64-encoded PDF bytes (same pattern as paper slip: atob → binary).
 */
export function pdfBlobFromBase64(base64: string): Blob {
  const trimmed = base64.trim()
  if (!trimmed) {
    return new Blob([], { type: "application/pdf" })
  }
  const binary = atob(trimmed)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: "application/pdf" })
}

export function openBlobInNewTab(
  blob: Blob,
  options?: {
    features?: string
    revokeAfterMs?: number
  },
): boolean {
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank", options?.features ?? "noopener,noreferrer")
  window.setTimeout(() => URL.revokeObjectURL(url), options?.revokeAfterMs ?? 180_000)
  return !!win
}

/**
 * Decode base64-encoded PDF bytes and open in a new tab.
 * Returns whether a window was opened (false if popup blocked).
 */
export function openPdfInNewTabFromBase64(base64: string): boolean {
  const blob = pdfBlobFromBase64(base64)
  return openBlobInNewTab(blob)
}
