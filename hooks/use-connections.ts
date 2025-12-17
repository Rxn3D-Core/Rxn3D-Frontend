import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Connection, ConnectionsResponse } from '@/contexts/connection-context'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query Keys for cache management
 */
export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (filters?: string) => [...connectionKeys.lists(), { filters }] as const,
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

  const params = new URLSearchParams()
  if (userId) {
    params.append('user_id', userId.toString())
  }

  const response = await fetch(`${API_BASE_URL}/connections`, {
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
  return useQuery({
    queryKey: connectionKeys.list(),
    queryFn: () => fetchConnections(userId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in cache
    select: (data) => {
      // Categorize connections into practices and labs
      const practices: Connection[] = []
      const labs: Connection[] = []

      data.data?.forEach((connection) => {
        if (connection.partner.name) {
          labs.push(connection)
        } else {
          practices.push(connection)
        }
      })

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
