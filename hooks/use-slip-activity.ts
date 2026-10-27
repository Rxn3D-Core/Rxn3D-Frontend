"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { FRESH_LIST_QUERY_OPTIONS } from "@/lib/cache/frontend-list-cache"
import { getActiveCustomerId } from "@/lib/customer-scope"
import {
  fetchSlipActivityEvents,
  fetchSlipActivityStatuses,
  SlipActivityApiError,
} from "@/services/slip-activity-service"
import type { SlipActivityFilters } from "@/types/slip-activity"

/** Retry once on network/5xx, never on 4xx (403 must show access denied at once). */
function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof SlipActivityApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

export function useSlipActivityStatuses() {
  const customerId = getActiveCustomerId()
  return useQuery({
    queryKey: ["slip-activity-statuses", customerId],
    queryFn: async () => (await fetchSlipActivityStatuses()).data ?? [],
    staleTime: 10 * 60 * 1000,
    retry: retryUnlessClientError,
  })
}

export function useSlipActivityEvents(filters: SlipActivityFilters, enabled = true) {
  const customerId = getActiveCustomerId()
  return useQuery({
    queryKey: ["slip-activity-events", customerId, filters],
    queryFn: () => fetchSlipActivityEvents(filters),
    ...FRESH_LIST_QUERY_OPTIONS,
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
    enabled,
  })
}
