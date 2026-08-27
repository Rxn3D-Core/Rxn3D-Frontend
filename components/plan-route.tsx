"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEntitlements } from "@/contexts/entitlement-context"

type PlanRouteProps = {
  feature: string
  required?: unknown
  children: React.ReactNode
  redirectTo?: string
}

export function PlanRoute({
  feature,
  required,
  children,
  redirectTo = "/dashboard",
}: PlanRouteProps) {
  const { user, isLoading: authLoading, isSuperadmin, isActingAsLabAdmin } = useAuth()
  const { hasFeature, isLoading } = useEntitlements()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirectedRef = useRef(false)

  const allowed =
    (isSuperadmin && !isActingAsLabAdmin) || hasFeature(feature, required)

  useEffect(() => {
    if (authLoading || isLoading || !user) return
    if (allowed) {
      hasRedirectedRef.current = false
      return
    }
    if (hasRedirectedRef.current) return
    hasRedirectedRef.current = true
    router.replace(redirectTo)
  }, [allowed, authLoading, isLoading, user, router, redirectTo, pathname])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return <>{children}</>
}
