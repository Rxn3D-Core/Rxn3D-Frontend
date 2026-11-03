"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEntitlements } from "@/contexts/entitlement-context"
import { FEATURE_KEYS } from "@/lib/entitlements"
import { canUseAdvanceMode } from "@/lib/advance-mode-access"

/** True only when the current lab's plan includes Advance Mode (or superadmin acting as superadmin). */
export function useAdvanceModeAccess(): boolean {
  const { isSuperadmin, isActingAsLabAdmin } = useAuth()
  const { hasFeature, isLoading } = useEntitlements()
  return canUseAdvanceMode({
    isSuperadmin: Boolean(isSuperadmin),
    isActingAsLabAdmin: Boolean(isActingAsLabAdmin),
    entitlementsLoading: isLoading,
    hasAdvanceModeFeature: hasFeature(FEATURE_KEYS.productAdvanceMode),
  })
}
