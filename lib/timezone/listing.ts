/**
 * Slip and case listings in the viewer's zone (RXN-123 S3, contract §4).
 * `created_at_iso` and `delivery_at` are instants; without them (older backend) the listing keeps
 * the lab clock values it shows today. A null `delivery_at` means a date-only due date.
 */

import { formatSlipListingTimestamp } from "@/lib/slip-listing-timestamp"
import { clockOfInstant, dayOfInstant } from "./index"

type ListingTimes = {
  created_at_iso?: string | null
  timestamp?: string | null
  created_at?: string | null
  delivery_at?: string | null
}

/** "MM/DD/YY @ h:mm am": `created_at_iso` in the viewer's zone, else the API's own text. */
export function listingCreatedAt(record: ListingTimes | null | undefined, viewerTz: string): string {
  if (record?.created_at_iso) return formatSlipListingTimestamp(record.created_at_iso, viewerTz)
  return formatSlipListingTimestamp(record?.timestamp ?? record?.created_at ?? "")
}

/** Due day (`YYYY-MM-DD`) of `delivery_at` in the viewer's zone, else the lab's date as given. */
export function listingDueDay(
  record: ListingTimes | null | undefined,
  fallback: string | null | undefined,
  viewerTz: string,
): string {
  const fromInstant = record?.delivery_at ? dayOfInstant(record.delivery_at, viewerTz) : null
  return fromInstant ?? fallback ?? ""
}

/** Due clock (`HH:mm:ss`) of `delivery_at` in the viewer's zone, else the lab's time as given. */
export function listingDueClock(
  record: ListingTimes | null | undefined,
  fallback: string | null | undefined,
  viewerTz: string,
): string | undefined {
  const fromInstant = record?.delivery_at ? clockOfInstant(record.delivery_at, viewerTz) : null
  return fromInstant ?? fallback ?? undefined
}
