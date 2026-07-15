"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

type PermissionRouteProps = {
  permissions: string[]
  children: React.ReactNode
  redirectTo?: string
}

export function PermissionRoute({
  permissions,
  children,
  redirectTo = "/dashboard",
}: PermissionRouteProps) {
  const { user, isLoading, hasAnyPermission, isSuperadmin, isActingAsLabAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirectedRef = useRef(false)

  const allowed =
    isSuperadmin || isActingAsLabAdmin || !permissions.length || hasAnyPermission(permissions)

  useEffect(() => {
    if (isLoading || !user) return
    if (allowed) {
      hasRedirectedRef.current = false
      return
    }
    if (hasRedirectedRef.current) return
    hasRedirectedRef.current = true
    router.replace(redirectTo)
  }, [allowed, isLoading, user, router, redirectTo, pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  if (!user || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-muted-foreground">
        You don&apos;t have permission to access this page.
      </div>
    )
  }

  return <>{children}</>
}
