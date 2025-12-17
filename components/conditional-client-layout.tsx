"use client"

import type React from "react"
import { Suspense } from "react"
import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"

// Lazy load ClientLayout to avoid loading framer-motion on login page
const ClientLayout = dynamic(() => import("@/app/client-layout").then(mod => ({ default: mod.ClientLayout })), {
  ssr: false,
})

// Routes that don't need ClientLayout (and its framer-motion dependency)
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/setup-account", "/onboarding"]

/**
 * Internal component that uses usePathname
 */
function ConditionalClientLayoutInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname ? PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) : false

  // For public routes, skip ClientLayout to avoid loading framer-motion
  if (isPublicRoute) {
    return <>{children}</>
  }

  // For authenticated routes, use ClientLayout with animations
  return <ClientLayout>{children}</ClientLayout>
}

/**
 * Conditionally renders ClientLayout based on route.
 * Skips ClientLayout (and framer-motion) on public routes to reduce bundle size.
 */
export function ConditionalClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ConditionalClientLayoutInternal>{children}</ConditionalClientLayoutInternal>
    </Suspense>
  )
}

