"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useWatch, type Control } from "react-hook-form"
import { getRetentionOptions } from "@/services/retention-options-api"
import type { RetentionOption } from "@/services/retention-options-api"
import {
  remapRetentionOptionsToCatalog,
  retentionOptionLinkIdsEqual,
  type ProductRetentionOptionLinkFormRow,
} from "@/lib/product-retention-links-form"

/** Server list for product modal (global vs lab scoped by customer id). */
export type RetentionOptionsCatalogState = {
  items: RetentionOption[]
  isLoading: boolean
  error: string | null
}

export function retentionOptionsCatalogQueryKey(catalogCustomerId: number | null) {
  return ["library", "retention-options", "product-modal", catalogCustomerId ?? "global"] as const
}

const CATALOG_PAGE_SIZE = 100

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
      const base = {
        status: "Active" as const,
        per_page: CATALOG_PAGE_SIZE,
        ...(customerIdForApi !== undefined ? { customer_id: customerIdForApi } : {}),
      }
      const first = await getRetentionOptions({ ...base, page: 1 })
      const list = (Array.isArray(first?.data?.data) ? [...first.data.data] : []) as RetentionOption[]
      const lastPage = first?.data?.pagination?.last_page ?? 1
      for (let page = 2; page <= lastPage; page += 1) {
        const next = await getRetentionOptions({ ...base, page })
        const chunk = next?.data?.data
        if (Array.isArray(chunk)) list.push(...(chunk as RetentionOption[]))
      }
      return list
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

/**
 * Write catalog IDs onto the product form as soon as the modal catalog loads —
 * not only after the Tooth Chart Configurations tab mounts.
 */
export function useSyncProductFormRetentionOptionsToCatalog(args: {
  enabled: boolean
  productKey: string | number | null | undefined
  catalog: RetentionOptionsCatalogState
  control: Control<any>
  setValue: (
    name: "retention_options",
    value: ProductRetentionOptionLinkFormRow[],
    options?: { shouldDirty?: boolean; shouldValidate?: boolean },
  ) => void
  onSynced?: (rows: ProductRetentionOptionLinkFormRow[]) => void
}) {
  const { enabled, productKey, catalog, control, setValue, onSynced } = args
  const formRetentionOptions = useWatch({ control, name: "retention_options" }) as
    | ProductRetentionOptionLinkFormRow[]
    | undefined
  const syncedKeyRef = useRef<string>("")

  useEffect(() => {
    if (!enabled) {
      syncedKeyRef.current = ""
      return
    }
    if (catalog.isLoading || catalog.items.length === 0) return

    const current = Array.isArray(formRetentionOptions) ? formRetentionOptions : []
    if (current.length === 0) return

    const remapped = remapRetentionOptionsToCatalog(current, catalog.items)
    const syncKey = `${productKey ?? "new"}:${remapped.map((row) => row.retention_option_id).join(",")}`
    if (syncedKeyRef.current === syncKey) return
    syncedKeyRef.current = syncKey

    if (retentionOptionLinkIdsEqual(current, remapped)) {
      return
    }

    setValue("retention_options", remapped, { shouldDirty: false, shouldValidate: false })
    onSynced?.(remapped)
  }, [
    enabled,
    productKey,
    catalog.isLoading,
    catalog.items,
    formRetentionOptions,
    setValue,
    onSynced,
  ])
}
