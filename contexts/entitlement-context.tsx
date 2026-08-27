"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/contexts/auth-context"
import { getEntitlements } from "@/lib/api/entitlements"
import {
  entitlementsByKey,
  hasFeature as hasFeatureHelper,
  normalizeEntitlements,
  type EntitlementRow,
  type EntitlementUsage,
  type EntitlementsPayload,
  type TrialPayload,
} from "@/lib/entitlements"

type EntitlementContextValue = {
  payload: EntitlementsPayload | null
  features: Record<string, EntitlementRow>
  usage: Record<string, EntitlementUsage>
  trial: TrialPayload | null
  isLoading: boolean
  hasFeature: (key: string, required?: unknown) => boolean
  refetch: () => Promise<void>
}

const EntitlementContext = createContext<EntitlementContextValue | undefined>(undefined)

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user, selectedCustomerId, isSuperadmin, isActingAsLabAdmin } = useAuth()
  const [payload, setPayload] = useState<EntitlementsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!user) {
      setPayload(null)
      return
    }
    setIsLoading(true)
    try {
      const labId = selectedCustomerId ?? undefined
      const data = await getEntitlements(labId)
      setPayload(data)
    } catch {
      setPayload(null)
    } finally {
      setIsLoading(false)
    }
  }, [user, selectedCustomerId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    const onFocus = () => {
      void refetch()
    }
    const onPlanError = () => {
      void refetch()
    }
    window.addEventListener("focus", onFocus)
    window.addEventListener("plan-entitlement-changed", onPlanError)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("plan-entitlement-changed", onPlanError)
    }
  }, [refetch])

  const features = useMemo(
    () => entitlementsByKey(normalizeEntitlements(payload ?? {})),
    [payload],
  )

  const value = useMemo<EntitlementContextValue>(
    () => ({
      payload,
      features,
      usage: payload?.usage ?? {},
      trial: payload?.trial ?? null,
      isLoading,
      hasFeature: (key: string, required?: unknown) => {
        if (isSuperadmin && !isActingAsLabAdmin) return true
        return hasFeatureHelper(features, key, required)
      },
      refetch,
    }),
    [payload, features, isLoading, refetch, isSuperadmin, isActingAsLabAdmin],
  )

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export function useEntitlements(): EntitlementContextValue {
  const context = useContext(EntitlementContext)
  if (!context) {
    return {
      payload: null,
      features: {},
      usage: {},
      trial: null,
      isLoading: false,
      hasFeature: () => true,
      refetch: async () => undefined,
    }
  }
  return context
}
