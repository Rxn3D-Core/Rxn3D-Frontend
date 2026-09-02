import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Connection, ConnectionsResponse } from '@/contexts/connection-context'
import { useAuth } from '@/contexts/auth-context'
import { categorizeConnectionsForUser } from '@/lib/connection-utils'
import { buildConnectionsUrl, getActiveCustomerId } from '@/lib/connection-api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query Keys for cache management
 */
export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (customerId?: number | null) => [...connectionKeys.lists(), { customerId }] as const,
  details: () => [...connectionKeys.all, 'detail'] as const,
  detail: (id: number) => [...connectionKeys.details(), id] as const,
}

/**
 * Fetch connections from API
 */
async function fetchConnections(userId?: number): Promise<ConnectionsResponse> {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(buildConnectionsUrl(userId), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 401) {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.status}`)
  }

  return response.json()
}

/**
 * Hook to fetch and cache connections
 *
 * Features:
 * - Automatic caching with 10-minute stale time
 * - Persists to localStorage for instant load on refresh
 * - Categorizes connections into practices and labs
 * - Handles authentication errors
 */
export function useConnections(userId?: number) {
  const { user } = useAuth()
  const customerId = getActiveCustomerId()

  return useQuery({
    queryKey: connectionKeys.list(customerId),
    queryFn: () => fetchConnections(userId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in cache
    select: (data) => {
      const { practices, labs } = categorizeConnectionsForUser(data.data || [], user)

      return {
        ...data,
        practices,
        labs,
      }
    },
  })
}

/**
 * Hook to filter connections by status
 */
export function useFilteredConnections(status?: string) {
  const { data } = useConnections()

  if (!status || !data) return data?.data || []

  return data.data.filter((connection) =>
    connection.status.toLowerCase() === status.toLowerCase()
  )
}

/**
 * Hook to manually refetch connections (for pull-to-refresh scenarios)
 */
export function useRefetchConnections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: connectionKeys.all })
    },
  })
}
