"use client"

import { useAuth } from "@/contexts/auth-context"

/** Whether the logged-in user has the given beta feature key enabled. */
export function useBetaFeature(key: string): boolean {
  const { user } = useAuth()
  const features = user?.beta_features
  if (!Array.isArray(features)) return false
  return features.includes(key)
}
