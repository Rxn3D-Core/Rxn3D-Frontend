"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, token: authToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirectedRef = useRef(false)
  const logoutRef = useRef(logout)
  const routerRef = useRef(router)

  // Keep refs updated
  useEffect(() => {
    logoutRef.current = logout
    routerRef.current = router
  }, [logout, router])

  useEffect(() => {
    // Prevent multiple redirects and loops
    if (hasRedirectedRef.current) {
      return
    }

    // Only redirect if we're not already on the login page and not loading
    if (!isLoading && !user && !authToken && pathname !== "/login") {
      hasRedirectedRef.current = true
      
      // Call logout (it already handles router.replace("/login"))
      logoutRef.current()
    }
  }, [user, isLoading, authToken, pathname]) // Removed logout and router from deps to prevent loops

  // Reset redirect flag when user becomes authenticated
  useEffect(() => {
    if (user && hasRedirectedRef.current) {
      hasRedirectedRef.current = false
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // If not authenticated, don't render children
  if (!user) {
    return null
  }

  // If authenticated, render children
  return <>{children}</>
}
