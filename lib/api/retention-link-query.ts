import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { hydrateRetentionOptionsFromProduct } from '@/lib/product-retention-links-form'
import { getAdvanceLinkFieldsCustomerIdParam } from '@/lib/api/advance-mode-query'
import { getRetentionOptions } from '@/services/retention-options-api'
import { getRetentions } from '@/services/retentions-api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

const ensureAbsoluteUrl = (url: string): string => {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured')
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${path}`
}

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

/** Same scope rules as advance link-fields (`customer_id` / lab filter). */
export function getRetentionLinkCustomerIdParam(context: 'global' | 'lab'): number | null {
  return getAdvanceLinkFieldsCustomerIdParam(context)
}

export type RetentionLinkPreviewChip = { id: number; name: string }

export type RetentionLinkBrowseByRetentionTypeRow = {
  id: number
  name: string
  code?: string
  status?: string
  sequence?: number
  linked_retention_options_count?: number
  linked_retention_options_preview?: RetentionLinkPreviewChip[]
  linked_retention_options_more_count?: number
}

export type RetentionLinkBrowseByRetentionOptionRow = {
  id: number
  name: string
  code?: string
  status?: string
  sequence?: number
  linked_retentions_count?: number
  linked_retentions_preview?: RetentionLinkPreviewChip[]
  linked_retentions_more_count?: number
  linked_products_count?: number
  linked_products_preview?: RetentionLinkPreviewChip[]
  linked_products_more_count?: number
}

export type RetentionLinkBrowseByProductRow = {
  id: number
  name: string
  subcategory_id?: number
  subcategory_name?: string
  status?: string
  sequence?: number
  linked_retention_options_count?: number
  linked_retention_options_preview?: RetentionLinkPreviewChip[]
  linked_retention_options_more_count?: number
}

export type RetentionLinkBrowseParams = {
  q?: string
  page: number
  per_page: number
  order_by?: string
  sort_by?: 'asc' | 'desc'
}

type RetentionLinkBrowsePagination = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

function normalizePagination(
  raw: unknown,
  fallback: RetentionLinkBrowsePagination,
): RetentionLinkBrowsePagination {
  if (!raw || typeof raw !== 'object') return fallback
  const p = raw as Record<string, unknown>
  return {
    total: typeof p.total === 'number' ? p.total : fallback.total,
    per_page: typeof p.per_page === 'number' ? p.per_page : fallback.per_page,
    current_page:
      typeof p.current_page === 'number' ? p.current_page : fallback.current_page,
    last_page: typeof p.last_page === 'number' ? p.last_page : fallback.last_page,
  }
}

function extractRetentionLinkBrowseRows<T>(
  json: unknown,
  fallbackPaging: RetentionLinkBrowsePagination,
): { rows: T[]; pagination: RetentionLinkBrowsePagination } {
  if (!json || typeof json !== 'object') {
    return { rows: [], pagination: fallbackPaging }
  }

  let node: unknown = (json as Record<string, unknown>).data ?? json

  if (Array.isArray(node)) {
    return { rows: node as T[], pagination: fallbackPaging }
  }

  for (
    let depth = 0;
    depth < 10 && node && typeof node === 'object' && !Array.isArray(node);
    depth++
  ) {
    const obj = node as Record<string, unknown>

    if (Array.isArray(obj.data)) {
      return {
        rows: obj.data as T[],
        pagination: normalizePagination(obj.pagination, fallbackPaging),
      }
    }
    if (Array.isArray(obj.items)) {
      return {
        rows: obj.items as T[],
        pagination: normalizePagination(obj.pagination, fallbackPaging),
      }
    }

    if (obj.data != null && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      node = obj.data
      continue
    }
    break
  }

  return { rows: [], pagination: fallbackPaging }
}

function appendCustomerId(sp: URLSearchParams, context: 'global' | 'lab') {
  const cid = getRetentionLinkCustomerIdParam(context)
  if (cid != null) sp.set('customer_id', String(cid))
}

const invalidateRetentionLinkBrowse = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['retentionLinkBrowseByType'] })
  qc.invalidateQueries({ queryKey: ['retentionLinkBrowseByOption'] })
  qc.invalidateQueries({ queryKey: ['retentionLinkBrowseByProduct'] })
  qc.invalidateQueries({ queryKey: ['retentionOptionsPageForLinkModal'] })
  qc.invalidateQueries({ queryKey: ['libraryRetentionsForLinkModal'] })
}

export const useBrowseRetentionLinkByRetentionType = (
  context: 'global' | 'lab',
  params: RetentionLinkBrowseParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['retentionLinkBrowseByType', context, params] as const,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (params.q) sp.set('q', params.q)
      sp.set('page', String(params.page))
      sp.set('per_page', String(params.per_page))
      if (params.order_by) sp.set('order_by', params.order_by)
      if (params.sort_by) sp.set('sort_by', params.sort_by)
      appendCustomerId(sp, context)

      const response = await fetch(
        `${ensureAbsoluteUrl('/library/retentions/link-retentions/browse-by-retention-type')}?${sp.toString()}`,
        { headers: getAuthHeaders() },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to browse retention links by type',
        )
      }
      const result = await response.json()
      const fallbackPaging = {
        total: 0,
        per_page: params.per_page,
        current_page: params.page,
        last_page: 1,
      }
      return extractRetentionLinkBrowseRows<RetentionLinkBrowseByRetentionTypeRow>(
        result,
        fallbackPaging,
      )
    },
  })
}

export const useBrowseRetentionLinkByRetentionOption = (
  context: 'global' | 'lab',
  params: RetentionLinkBrowseParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['retentionLinkBrowseByOption', context, params] as const,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (params.q) sp.set('q', params.q)
      sp.set('page', String(params.page))
      sp.set('per_page', String(params.per_page))
      if (params.order_by) sp.set('order_by', params.order_by)
      if (params.sort_by) sp.set('sort_by', params.sort_by)
      appendCustomerId(sp, context)

      const response = await fetch(
        `${ensureAbsoluteUrl('/library/retentions/link-retentions/browse-by-retention-option')}?${sp.toString()}`,
        { headers: getAuthHeaders() },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to browse retention links by option',
        )
      }
      const result = await response.json()
      const fallbackPaging = {
        total: 0,
        per_page: params.per_page,
        current_page: params.page,
        last_page: 1,
      }
      return extractRetentionLinkBrowseRows<RetentionLinkBrowseByRetentionOptionRow>(
        result,
        fallbackPaging,
      )
    },
  })
}

export const useBrowseRetentionLinkByProduct = (
  context: 'global' | 'lab',
  params: RetentionLinkBrowseParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['retentionLinkBrowseByProduct', context, params] as const,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (params.q) sp.set('q', params.q)
      sp.set('page', String(params.page))
      sp.set('per_page', String(params.per_page))
      if (params.order_by) sp.set('order_by', params.order_by)
      if (params.sort_by) sp.set('sort_by', params.sort_by)
      appendCustomerId(sp, context)

      const response = await fetch(
        `${ensureAbsoluteUrl('/library/retentions/link-retentions/browse-by-product')}?${sp.toString()}`,
        { headers: getAuthHeaders() },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to browse retention links by product',
        )
      }
      const result = await response.json()
      const fallbackPaging = {
        total: 0,
        per_page: params.per_page,
        current_page: params.page,
        last_page: 1,
      }
      return extractRetentionLinkBrowseRows<RetentionLinkBrowseByProductRow>(result, fallbackPaging)
    },
  })
}

export const useRetentionLinkByRetentionOption = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      retention_option_id: number
      product_ids: number[]
      customer_id?: number
    }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/retentions/link-retentions/link-by-retention-option'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to link products to retention option',
        )
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateRetentionLinkBrowse(qc)
    },
  })
}

export const useRetentionLinkByProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      product_id: number
      retention_option_ids: number[]
      customer_id?: number
    }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/retentions/link-retentions/link-by-product'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to link retention options to product',
        )
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateRetentionLinkBrowse(qc)
    },
  })
}

export const useRetentionLinkByRetention = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { retention_id: number; product_ids: number[]; customer_id?: number }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/retentions/link-retentions/link-by-retention'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to link products to retention type',
        )
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateRetentionLinkBrowse(qc)
    },
  })
}

export const useRetentionBulkLink = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      retention_option_ids: number[]
      product_ids: number[]
      customer_id?: number
    }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/retentions/link-retentions/bulk-link'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error((error as { message?: string }).message || 'Failed to bulk link retentions')
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateRetentionLinkBrowse(qc)
    },
  })
}

/** GET /library/products/{id} — same customer_id query rules as advance link-fields product detail. */
export async function fetchLibraryProductDetailForRetentionLinks(
  productId: number,
  _context: 'global' | 'lab',
): Promise<Record<string, unknown> | null> {
  const url = new URL(ensureAbsoluteUrl(`/library/products/${productId}`))
  url.searchParams.set('lang', 'en')

  if (typeof window !== 'undefined') {
    const role = localStorage.getItem('role')
    if (role === 'superadmin') {
      const customerId = localStorage.getItem('customerId')
      if (customerId) url.searchParams.set('customer_id', customerId)
    } else if (role === 'office_admin' || role === 'doctor') {
      const labId = localStorage.getItem('selectedLabId')
      if (labId) url.searchParams.set('customer_id', labId)
    } else {
      const labId = localStorage.getItem('customerId')
      if (labId) url.searchParams.set('customer_id', labId)
    }
  }

  const response = await fetch(url.toString(), { headers: getAuthHeaders() })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { message?: string }).message || 'Failed to load product')
  }
  const json = await response.json()
  const data = json.data
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null
}

export function parseLinkedRetentionOptionIdsFromProductPayload(
  product: Record<string, unknown> | null | undefined,
): number[] {
  return hydrateRetentionOptionsFromProduct(product ?? null).map((r) => r.retention_option_id)
}

export function useRetentionOptionsPage(
  context: 'global' | 'lab',
  params: {
    page: number
    per_page: number
    q?: string
    order_by?: string
    sort_by?: 'asc' | 'desc'
  },
  options?: { enabled?: boolean },
) {
  const cid = getRetentionLinkCustomerIdParam(context)
  return useQuery({
    queryKey: ['retentionOptionsPageForLinkModal', context, cid, params] as const,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await getRetentionOptions({
        page: params.page,
        per_page: params.per_page,
        q: params.q,
        order_by: params.order_by ?? 'name',
        sort_by: params.sort_by ?? 'asc',
        status: 'Active',
        ...(cid != null ? { customer_id: cid } : {}),
      })
      const data = res.data?.data ?? []
      const pagination = res.data?.pagination ?? {
        total: 0,
        per_page: params.per_page,
        current_page: params.page,
        last_page: 1,
      }
      return { data, pagination }
    },
  })
}

export function useLibraryRetentionsList(
  context: 'global' | 'lab',
  options?: { enabled?: boolean },
) {
  const cid = getRetentionLinkCustomerIdParam(context)
  return useQuery({
    queryKey: ['libraryRetentionsForLinkModal', context, cid] as const,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await getRetentions({
        per_page: 500,
        page: 1,
        status: 'Active',
        order_by: 'sequence',
        sort_by: 'asc',
        ...(cid != null ? { customer_id: cid } : {}),
      })
      return res.data?.data ?? []
    },
  })
}
