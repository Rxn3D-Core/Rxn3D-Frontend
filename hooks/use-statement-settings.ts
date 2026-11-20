"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getStatementSettings, saveStatementSettings } from "@/lib/api/statement-settings"
import { getActiveCustomerId } from "@/lib/customer-scope"
import type { LabStatementSettings } from "@/lib/statement-settings"

const queryKey = (customerId: string | null) => ["statement-settings", customerId]

/** RXN-100: the active lab's statement settings. A non-lab profile or an older API makes this query fail; callers fall back to defaults. */
export function useStatementSettings(enabled = true) {
  const customerId = getActiveCustomerId()
  return useQuery({
    queryKey: queryKey(customerId),
    queryFn: getStatementSettings,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useSaveStatementSettings() {
  const queryClient = useQueryClient()
  const customerId = getActiveCustomerId()
  return useMutation({
    mutationFn: (settings: LabStatementSettings) => saveStatementSettings(settings),
    onSuccess: (result) => queryClient.setQueryData(queryKey(customerId), result),
  })
}
