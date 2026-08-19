"use client"

import { useQuery } from "@tanstack/react-query"
import {
  getBusinessSettings,
  unwrapBusinessSettingsPayload,
  type UnwrappedBusinessSettings,
} from "@/lib/api-business-settings"

/**
 * GET `/business-settings?customer_id=` for a lab (or office-selected lab).
 */
export function useBusinessSettingsQuery(customerId: number | null | undefined) {
  return useQuery({
    queryKey: ["business-settings", customerId],
    queryFn: async (): Promise<UnwrappedBusinessSettings> => {
      const raw = await getBusinessSettings(customerId as number)
      return unwrapBusinessSettingsPayload(raw)
    },
    enabled: typeof customerId === "number" && customerId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
