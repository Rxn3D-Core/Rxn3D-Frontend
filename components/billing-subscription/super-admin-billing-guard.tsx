"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

function userHasSuperAdmin(user: { roles?: string[]; role?: string } | null): boolean {
  if (!user) return false
  const roles = user.roles || (user.role ? [user.role] : [])
  return roles.includes("superadmin")
}

/**
 * Billing & Subscription Control is super-admin only (see config/sidebar-menu.tsx).
 */
export function SuperAdminBillingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const redirected = useRef(false)

  useEffect(() => {
    if (isLoading || !user || redirected.current) return
    if (!userHasSuperAdmin(user)) {
      redirected.current = true
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="flex space-x-2">
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#1162A8] [animation-delay:-0.3s]" />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#1162A8] [animation-delay:-0.15s]" />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#1162A8]" />
        </div>
      </div>
    )
  }

  if (!userHasSuperAdmin(user)) {
    return null
  }

  return <>{children}</>
}
