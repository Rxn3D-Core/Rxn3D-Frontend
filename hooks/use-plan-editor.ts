"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelPlanSchedule,
  createPlanWithMode,
  discardPlanVersion,
  getPlanFeatureGroups,
  getPlanVersion,
  listBillingConfigPlans,
  previewPlanVersion,
  savePlanVersion,
  type BillingConfigPlan,
  type PlanListStatus,
  type PlanVersion,
  type PlanPayload,
  type SaveOptions,
} from "@/lib/api/billing-config-plans"
import { FRESH_LIST_QUERY_OPTIONS } from "@/lib/cache/frontend-list-cache"

/** All keys start with "billing-config", which is listed in TRANSACTIONAL_QUERY_KEY_PREFIXES (not persisted). */
export const billingConfigKeys = {
  all: ["billing-config"] as const,
  plans: (status: PlanListStatus) => ["billing-config", "plans", status] as const,
  featureGroups: (planId: number | null, source: "live" | "draft") => ["billing-config", "feature-groups", planId, source] as const,
  version: (planId: number) => ["billing-config", "plan-version", planId] as const,
  preview: (planId: number, payloadJson: string) => ["billing-config", "plan-preview", planId, payloadJson] as const,
}

export function useBillingConfigPlans(status: PlanListStatus) {
  return useQuery({
    queryKey: billingConfigKeys.plans(status),
    queryFn: () => listBillingConfigPlans(status),
    ...FRESH_LIST_QUERY_OPTIONS,
  })
}

/** Open version + live payload for one plan. Disabled for new plans. */
export function usePlanVersion(planId: number | null, enabled = true) {
  return useQuery({
    queryKey: billingConfigKeys.version(planId ?? 0),
    queryFn: () => getPlanVersion(planId as number),
    enabled: enabled && planId !== null,
    ...FRESH_LIST_QUERY_OPTIONS,
    retry: false,
  })
}

export function usePlanFeatureGroups(planId: number | null, source: "live" | "draft", enabled = true) {
  return useQuery({
    queryKey: billingConfigKeys.featureGroups(planId, source),
    queryFn: () => getPlanFeatureGroups(planId === null ? {} : { plan_id: planId, source }),
    enabled,
    ...FRESH_LIST_QUERY_OPTIONS,
    retry: false,
  })
}

/** Server "What changed", recipients and email preview for unsaved edits. Writes nothing. */
export function usePlanVersionPreview(planId: number | null, payload: PlanPayload | null, enabled: boolean) {
  const payloadJson = payload ? JSON.stringify(payload) : ""
  return useQuery({
    queryKey: billingConfigKeys.preview(planId ?? 0, payloadJson),
    queryFn: () => previewPlanVersion(planId as number, payload as PlanPayload),
    enabled: enabled && planId !== null && payload !== null,
    ...FRESH_LIST_QUERY_OPTIONS,
    retry: false,
  })
}

export function useSavePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      planId: number | null
      payload: PlanPayload
      options: SaveOptions
    }): Promise<{ plan?: BillingConfigPlan; version: PlanVersion | null }> =>
      args.planId === null
        ? createPlanWithMode(args.payload, args.options)
        : savePlanVersion(args.planId, args.payload, args.options),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billingConfigKeys.all }),
  })
}

export function useCancelPlanSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: number) => cancelPlanSchedule(planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billingConfigKeys.all }),
  })
}

export function useDiscardPlanVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: number) => discardPlanVersion(planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billingConfigKeys.all }),
  })
}
