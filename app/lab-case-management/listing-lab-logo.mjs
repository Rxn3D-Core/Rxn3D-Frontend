/**
 * RXN-114: logo URL for the office listing's Lab column, from the office
 * listing API's `lab.logo_url`. Returns undefined when the lab has no logo,
 * so the column keeps its text display.
 *
 * @param {{ logo_url?: string | null } | null | undefined} lab
 * @returns {string | undefined}
 */
export function listingLabLogoUrl(lab) {
  const url = typeof lab?.logo_url === "string" ? lab.logo_url.trim() : ""
  return url || undefined
}
