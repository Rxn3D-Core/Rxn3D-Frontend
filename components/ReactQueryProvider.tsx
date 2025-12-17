"use client"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import React, { useState } from 'react'

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Cache configuration for dashboard data
        staleTime: 1000 * 60 * 10, // 10 minutes - data is considered fresh for 10 min
        gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache for 24 hours (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: false, // Don't refetch on component mount if data is fresh
        refetchOnReconnect: false, // Don't refetch on reconnect if data is fresh
      },
      mutations: {
        retry: 0,
      },
    },
  }))

  // Create persister for localStorage caching
  const [persister] = useState(() => {
    if (typeof window !== 'undefined') {
      return createSyncStoragePersister({
        storage: window.localStorage,
        key: 'rxn3d-query-cache', // Key for localStorage
      })
    }
    return undefined
  })

  // Use PersistQueryClientProvider if persister is available (client-side)
  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          dehydrateOptions: {
            // Only persist successful queries
            shouldDehydrateQuery: (query) => {
              return query.state.status === 'success'
            },
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    )
  }

  // Fallback for server-side rendering
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
