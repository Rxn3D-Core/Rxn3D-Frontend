import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query Keys for invitation cache management
 */
export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (invitedBy?: number) => [...invitationKeys.lists(), { invitedBy }] as const,
}

export type EntityType = "Office" | "Lab" | "Supplier" | "Doctor"

export interface Entity {
  id: number
  name: string
  address?: string
  email?: string
  type?: EntityType
  status?: string
  invited_by?: number
  created_at?: string
  updated_at?: string
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

interface InvitationsResponse {
  sent: {
    data: Entity[]
    pagination: PaginationInfo
  }
  received: {
    data: Entity[]
    pagination: PaginationInfo
  }
}

/**
 * Fetch all invitations
 */
async function fetchInvitations(invitedBy?: number): Promise<InvitationsResponse> {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No authentication token found')
  }

  const params = new URLSearchParams()
  if (invitedBy) {
    params.append('invited_by', invitedBy.toString())
  }

  const response = await fetch(
    `${API_BASE_URL}/invitations${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (response.status === 401) {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch invitations: ${response.status}`)
  }

  return response.json()
}

/**
 * Send invitation
 */
async function sendInvitation(data: { receiver_id: number; invited_by: number }) {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/invitations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send invitation')
  }

  return response.json()
}

/**
 * Accept invitation
 */
async function acceptInvitation(invitationId: number) {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}/accept`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to accept invitation')
  }

  return response.json()
}

/**
 * Delete/Cancel invitation
 */
async function deleteInvitation(invitationId: number) {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete invitation')
  }

  return response.json()
}

/**
 * Resend invitation
 */
async function resendInvitation(invitationId: number) {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}/resend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to resend invitation')
  }

  return response.json()
}

/**
 * Hook to fetch and cache invitations
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Persists to localStorage
 * - Separates sent and received invitations
 */
export function useInvitations(invitedBy?: number) {
  return useQuery({
    queryKey: invitationKeys.list(invitedBy),
    queryFn: () => fetchInvitations(invitedBy),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled: !!invitedBy, // Only fetch if invitedBy is provided
  })
}

/**
 * Hook to send invitation
 */
export function useSendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendInvitation,
    onSuccess: () => {
      // Invalidate and refetch invitations
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}

/**
 * Hook to accept invitation
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      // Invalidate invitations and connections (new connection created)
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

/**
 * Hook to delete/cancel invitation
 */
export function useDeleteInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}

/**
 * Hook to resend invitation
 */
export function useResendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}
