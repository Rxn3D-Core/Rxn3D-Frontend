"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/contexts/theme-context"
import { AuthProvider } from "@/contexts/auth-context"

// Create a client with minimal config for login page
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: false, // Don't retry on login page
    },
  },
})

/**
 * Minimal providers for public pages (login, forgot-password, etc.)
 * Only includes essential providers needed for authentication
 * 
 * Excludes:
 * - ReduxProvider (75KB) - Not needed for login
 * - ConnectionProvider - Not needed for login
 * - LocationProvider - Not needed for login
 * - CustomerProvider - Not needed for login
 */
export function MinimalProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

