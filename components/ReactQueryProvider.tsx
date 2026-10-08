"use client"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import React, { useState } from 'react'
import {
  DEFAULT_QUERY_GC_TIME_MS,
  DEFAULT_QUERY_STALE_TIME_MS,
  QUERY_CACHE_STORAGE_KEY,
  QUERY_PERSIST_MAX_AGE_MS,
  registerAppQueryClient,
  shouldPersistQuery,
} from '@/lib/cache/frontend-list-cache'

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          // Show cached data immediately, then refetch when a screen remounts after staleTime.
          staleTime: DEFAULT_QUERY_STALE_TIME_MS,
          gcTime: DEFAULT_QUERY_GC_TIME_MS,
          retry: 1,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: true,
        },
        mutations: {
          retry: 0,
        },
      },
    })
    registerAppQueryClient(client)
    return client
  })

  // Create persister for localStorage caching
  const [persister] = useState(() => {
    if (typeof window !== 'undefined') {
      return createSyncStoragePersister({
        storage: window.localStorage,
        key: QUERY_CACHE_STORAGE_KEY,
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
          maxAge: QUERY_PERSIST_MAX_AGE_MS,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              return query.state.status === 'success' && shouldPersistQuery(query.queryKey)
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
