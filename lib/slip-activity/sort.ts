/**
 * Slip Activity Monitor: table header sorting (RXN-12 / RXN-14). The backend sorts across
 * all pages (contract: RXN-13); the UI only keeps one column and a direction.
 */

import type { SlipActivitySort, SlipActivitySortColumn } from "@/types/slip-activity"

/** Default when no sort is chosen, and what the backend uses when the params are absent. */
export const SLIP_ACTIVITY_DEFAULT_SORT: SlipActivitySort = { sort: "action_at", direction: "desc" }

/**
 * Header click: the same column toggles asc/desc; a new column starts ascending, except
 * Date/time, which starts newest first (descending) like the default.
 */
export function nextSlipActivitySort(current: SlipActivitySort, column: SlipActivitySortColumn): SlipActivitySort {
  if (current.sort === column) {
    return { sort: column, direction: current.direction === "asc" ? "desc" : "asc" }
  }
  return { sort: column, direction: column === "action_at" ? "desc" : "asc" }
}

/** Value for the header cell's `aria-sort`. */
export function slipActivityAriaSort(
  current: SlipActivitySort,
  column: SlipActivitySortColumn,
): "ascending" | "descending" | "none" {
  if (current.sort !== column) return "none"
  return current.direction === "asc" ? "ascending" : "descending"
}
