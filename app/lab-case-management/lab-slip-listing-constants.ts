/** Default page size for lab and office slip listing tables */
export const SLIP_LISTING_DEFAULT_PER_PAGE = 50

/** Matches `slip_locations` IDs used by GET /v1/slip/listing/lab?location_id= */
export const SLIP_LOCATION_FILTER_OPTIONS = [
  { id: 1, label: "In office ready to pickup" },
  { id: 2, label: "On route to the lab" },
  { id: 3, label: "In lab" },
  { id: 4, label: "In lab ready to pickup" },
  { id: 5, label: "On route to the office" },
  { id: 6, label: "In office" },
] as const

/** Lab slip listing API `status` filter values (see API docs) */
export const LAB_SLIP_STATUS_OPTIONS = [
  "Draft",
  "In Progress",
  "On hold",
  "cancelled",
  "Finished",
  "Deleted",
] as const

export function parseLocationFilterFromUrl(param: string | null): string {
  if (!param || param === "All") return "All"
  if (/^\d+$/.test(param)) {
    const id = Number(param)
    if (SLIP_LOCATION_FILTER_OPTIONS.some((o) => o.id === id)) return String(id)
  }
  const lower = param.toLowerCase().replace(/\s+/g, " ").trim()
  const found = SLIP_LOCATION_FILTER_OPTIONS.find((o) => o.label.toLowerCase() === lower)
  return found ? String(found.id) : "All"
}
