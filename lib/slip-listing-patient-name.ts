/** Title-case each word for slip listing patient column display. */
export function formatSlipListingPatientName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed

  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
