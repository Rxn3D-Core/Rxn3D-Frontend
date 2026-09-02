import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Connection, ConnectionsResponse } from '@/contexts/connection-context'
import { useAuth } from '@/contexts/auth-context'
import { categorizeConnectionsForUser } from '@/lib/connection-utils'
import {
  fetchConnectionsApi,
  getActiveCustomerId,
  normalizeConnectionsPagination,
  type ConnectionsQueryParams,
  DEFAULT_CONNECTIONS_PER_PAGE,
} from '@/lib/connection-api'

/**
 * Query Keys for cache management
 */
export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (customerId?: number | null, params?: Partial<ConnectionsQueryParams>) =>
    [...connectionKeys.lists(), { customerId, ...params }] as const,
  details: () => [...connectionKeys.all, 'detail'] as const,
  detail: (id: number) => [...connectionKeys.details(), id] as const,
}

export interface UseConnectionsOptions extends ConnectionsQueryParams {
  enabled?: boolean
}

/**
 * Hook to fetch and cache connections
 */
export function useConnections(userId?: number, options?: UseConnectionsOptions) {
  const { user } = useAuth()
  const customerId = getActiveCustomerId()
  const page = options?.page ?? 1
  const perPage = options?.perPage ?? DEFAULT_CONNECTIONS_PER_PAGE
  const search = options?.search
  const enabled = options?.enabled ?? true

  return useQuery({
    queryKey: connectionKeys.list(customerId, { page, perPage, search, userId }),
    queryFn: () => fetchConnectionsApi({ userId, page, perPage, search }),
    enabled: enabled && !!localStorage.getItem('token'),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    select: (data) => {
      const { practices, labs } = categorizeConnectionsForUser(data.data || [], user)
      const pagination = normalizeConnectionsPagination(data, page, perPage)

      return {
        ...data,
        practices,
        labs,
        pagination,
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

export type { ConnectionsResponse, Connection }
