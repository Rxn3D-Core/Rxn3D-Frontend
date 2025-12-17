// This module provides a factory for creating a QueryClient.
// Previously it exported a singleton `QueryClient` instance which caused
// server -> client serialization issues in Next.js when imported from server
// components. Exporting a factory lets client code call it to get a client
// without passing instances through server components.

import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes - increased for better caching
      },
      mutations: {
        retry: false,
      },
    },
  })
}
