import { getBusinessSettings, defaultDeliveryTimeFromBusinessSettings } from "@/lib/api-business-settings"
import { resolveLabIdFromSlipDetails } from "@/lib/add-stage/preload-state"
import { resolveLibraryCustomerId } from "@/components/case-design-center/utils/libraryCustomerId"

/**
 * Load each unique lab's `case_schedule.default_delivery_time` for a list of
 * slip-details payloads (paper-slip print).
 */
export async function fetchDefaultDeliveryTimeByLabId(
  detailsList: unknown[]
): Promise<Map<number, string>> {
  const ids = new Set<number>()
  for (const details of detailsList) {
    const customerId = resolveLibraryCustomerId(resolveLabIdFromSlipDetails(details))
    if (typeof customerId === "number" && customerId > 0) ids.add(customerId)
  }

  const entries = await Promise.all(
    [...ids].map(async (id) => {
      try {
        const settings = await getBusinessSettings(id)
        return [id, defaultDeliveryTimeFromBusinessSettings(settings)] as const
      } catch {
        return [id, ""] as const
      }
    })
  )

  return new Map(entries)
}

export function defaultDeliveryTimeForSlipDetails(
  details: unknown,
  byLabId: Map<number, string>
): string {
  const customerId = resolveLibraryCustomerId(resolveLabIdFromSlipDetails(details))
  if (typeof customerId !== "number") return ""
  return byLabId.get(customerId) ?? ""
}
