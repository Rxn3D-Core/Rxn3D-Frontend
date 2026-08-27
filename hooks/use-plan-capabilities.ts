"use client"

import { useEntitlements } from "@/contexts/entitlement-context"
import { FEATURE_KEYS } from "@/lib/entitlements"

export function usePlanCapabilities() {
  const { hasFeature, payload, trial, usage, isLoading, refetch } = useEntitlements()

  return {
    isLoading,
    refetch,
    payload,
    trial,
    usage,
    onTrial: Boolean(payload?.on_trial),
    canPurchaseAddons: Boolean(payload?.can_purchase_addons),
    continuousChargingEnabled: Boolean(payload?.continuous_charging_enabled),
    canChargeManagement: hasFeature(FEATURE_KEYS.billingChargeManagement),
    canStatements: hasFeature(FEATURE_KEYS.billingStatements),
    canAdvanceMode: hasFeature(FEATURE_KEYS.productAdvanceMode),
    can3dViewer: hasFeature(FEATURE_KEYS.tools3dViewer),
    canAdvancedAttachments: hasFeature(FEATURE_KEYS.attachmentsAdvanced),
    canDriverScanning: hasFeature(FEATURE_KEYS.trackingDriverScanning),
    canCustomRoles: hasFeature(FEATURE_KEYS.accessCustomRoles),
    canGlobalLibraryImport: hasFeature(FEATURE_KEYS.productGlobalLibraryImport),
    hasFullDashboard: hasFeature(FEATURE_KEYS.reportsDashboard, "full"),
    hasRushBilling: hasFeature(FEATURE_KEYS.slipDueRushDate, "flag_and_billing"),
    libraryCloneScope: payload?.features?.find((row) => row.key === FEATURE_KEYS.productLibraryCloneScope)?.value,
    hasFeature,
  }
}
