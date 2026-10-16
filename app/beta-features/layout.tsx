"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/auth-context"

function userHasSuperAdmin(user: { roles?: string[]; role?: string } | null): boolean {
  if (!user) return false
  const roles = user.roles || (user.role ? [user.role] : [])
  return roles.includes("superadmin")
}

export default function BetaFeaturesLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <ProtectedRoute>
      <div className="flex h-[100dvh] bg-[#F9F9F9] overflow-hidden">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            {isLoading || !user || !userHasSuperAdmin(user) ? (
              <div className="flex min-h-[40vh] items-center justify-center p-8">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 animate-bounce rounded-full bg-[#1162A8] [animation-delay:-0.3s]" />
                  <div className="h-3 w-3 animate-bounce rounded-full bg-[#1162A8] [animation-delay:-0.15s]" />
                  <div className="h-3 w-3 animate-bounce rounded-full bg-[#1162A8]" />
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
