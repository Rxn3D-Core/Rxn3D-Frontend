"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FRESH_LIST_QUERY_OPTIONS, invalidateFrontendListQueries } from "@/lib/cache/frontend-list-cache"
import {
  getMemberOffboardingPreview,
  getSelfOffboardingPreview,
  leaveWithTransfer,
  offboardMember,
} from "@/services/offboarding-service"
import type { OffboardPayload } from "@/types/offboarding"

export const OFFBOARDING_PREVIEW_KEY = "offboarding-preview"

/** `userId` null = the signed-in user leaving. Always fresh on open, never persisted. */
export function offboardingPreviewKey(customerId: number | null, userId: number | null) {
  return [OFFBOARDING_PREVIEW_KEY, customerId, userId ?? "self"] as const
}

export function useOffboardingPreview(customerId: number | null, userId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: offboardingPreviewKey(customerId, userId),
    queryFn: () =>
      userId === null ? getSelfOffboardingPreview(customerId as number) : getMemberOffboardingPreview(customerId as number, userId),
    enabled: enabled && customerId !== null,
    retry: false,
    ...FRESH_LIST_QUERY_OPTIONS,
  })
}

export function useOffboardMember(customerId: number | null, userId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OffboardPayload) =>
      userId === null ? leaveWithTransfer(customerId as number, payload) : offboardMember(customerId as number, userId, payload),
    onSuccess: () => {
      // The membership is gone: drop the preview instead of refetching it (it would 404).
      queryClient.removeQueries({ queryKey: offboardingPreviewKey(customerId, userId) })
      invalidateFrontendListQueries(queryClient)
    },
  })
}
