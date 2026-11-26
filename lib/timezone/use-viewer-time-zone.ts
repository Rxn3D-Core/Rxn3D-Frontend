"use client"

import { useAuth } from "@/contexts/auth-context"
import { getActiveCustomerId } from "@/lib/customer-scope"
import { resolveViewerTimeZone } from "@/lib/timezone"

/** The selected lab or office profile's zone (RXN-123); America/Los_Angeles when unknown. */
export function useViewerTimeZone(): string {
  const { user } = useAuth()
  return resolveViewerTimeZone(user, getActiveCustomerId())
}
