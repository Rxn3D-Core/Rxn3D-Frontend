"use client"

import { useQuery } from "@tanstack/react-query"
import { getRetentionOptions } from "@/services/retention-options-api"
import type { RetentionOption } from "@/services/retention-options-api"

/** Server list for product modal (global vs lab scoped by customer id). */
export type RetentionOptionsCatalogState = {
  items: RetentionOption[]
  isLoading: boolean
  error: string | null
}

export function retentionOptionsCatalogQueryKey(catalogCustomerId: number | null) {
  return ["library", "retention-options", "product-modal", catalogCustomerId ?? "global"] as const
}

/**
 * Load retention options while the product modal is open (edit or create).
 * Keeps the Retention tab instant because data is ready before the tab mounts.
 */
export function useRetentionOptionsCatalogForProductModal(
  modalOpen: boolean,
  catalogCustomerId: number | null,
): RetentionOptionsCatalogState {
  const customerIdForApi =
    typeof catalogCustomerId === "number" && catalogCustomerId > 0 ? catalogCustomerId : undefined

  const query = useQuery({
    queryKey: retentionOptionsCatalogQueryKey(customerIdForApi !== undefined ? customerIdForApi : null),
    enabled: modalOpen,
    queryFn: async () => {
      const res = await getRetentionOptions({
        status: "Active",
        ...(customerIdForApi !== undefined ? { customer_id: customerIdForApi } : {}),
      })
      const list = res?.data?.data
      return (Array.isArray(list) ? list : []) as RetentionOption[]
    },
    staleTime: 60_000,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isPending,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error != null
          ? String(query.error)
          : null,
  }
}
