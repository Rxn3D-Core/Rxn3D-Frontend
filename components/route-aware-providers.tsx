"use client"

import type React from "react"
import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { MinimalProviders } from "./minimal-providers"
import { Providers } from "./providers"

// Routes that should use minimal providers (no authenticated features)
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/setup-account", "/onboarding"]

/**
 * Internal component that uses usePathname
 */
function RouteAwareProvidersInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname ? PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) : false

  if (isPublicRoute) {
    return <MinimalProviders>{children}</MinimalProviders>
  }

  return <Providers>{children}</Providers>
}

/**
 * Route-aware provider wrapper that uses minimal providers for public routes
 * and full providers for authenticated routes
 */
export function RouteAwareProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Providers>{children}</Providers>}>
      <RouteAwareProvidersInternal>{children}</RouteAwareProvidersInternal>
    </Suspense>
  )
}

