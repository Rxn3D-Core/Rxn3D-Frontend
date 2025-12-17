"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/contexts/theme-context"
import { ConnectionProvider } from "@/contexts/connection-context"
import { ReduxProvider } from "./redux-provider"
import { LocationProvider } from "@/contexts/location-context"
import { CustomerProvider } from "@/contexts/customer-context";
import { AuthProvider } from "@/contexts/auth-context"

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Full providers for authenticated pages
 * Includes all providers needed for the main application
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider>
        <AuthProvider>
          <CustomerProvider>
            <LocationProvider>
              <ThemeProvider>
                <ConnectionProvider>
                  {children}
                </ConnectionProvider>
              </ThemeProvider>
            </LocationProvider>
          </CustomerProvider>
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  )
}
