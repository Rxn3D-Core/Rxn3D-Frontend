"use client"

import type { ReactNode } from "react"
import { useEntitlements } from "@/contexts/entitlement-context"

type FeatureGateProps = {
  feature: string
  required?: unknown
  children: ReactNode
  fallback?: ReactNode
}

export function FeatureGate({ feature, required, children, fallback = null }: FeatureGateProps) {
  const { hasFeature } = useEntitlements()
  if (!hasFeature(feature, required)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
