"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FRESH_LIST_QUERY_OPTIONS } from "@/lib/cache/frontend-list-cache"
import { getInvoicingSettings, saveInvoicingSettings } from "@/lib/api/invoicing-settings"
import type { InvoicingMode, InvoicingSettings } from "@/types/product-invoicing"

/** RXN-90 lab invoicing mode. `customerId` only scopes the cache; the API uses the active lab profile. */
export function invoicingSettingsQueryKey(customerId: number | null) {
  return ["invoicing-settings", customerId] as const
}

export function useInvoicingSettings(customerId: number | null) {
  return useQuery<InvoicingSettings>({
    queryKey: invoicingSettingsQueryKey(customerId),
    queryFn: getInvoicingSettings,
    enabled: customerId != null,
    ...FRESH_LIST_QUERY_OPTIONS,
  })
}

export function useSaveInvoicingSettings(customerId: number | null) {
  const queryClient = useQueryClient()
  return useMutation<InvoicingSettings, Error, InvoicingMode>({
    mutationFn: saveInvoicingSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(invoicingSettingsQueryKey(customerId), data)
    },
  })
}
