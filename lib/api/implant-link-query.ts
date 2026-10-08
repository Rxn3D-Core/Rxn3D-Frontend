import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getAdvanceLinkFieldsCustomerIdParam } from '@/lib/api/advance-mode-query'

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
export function getImplantLinkCustomerIdParam(context: 'global' | 'lab'): number | null {
  return getAdvanceLinkFieldsCustomerIdParam(context)
}

export type ImplantLinkPreviewChip = { id: number; name: string }

export type ImplantLinkBrowseByImplantRow = {
  id: number
  name: string
  brand_name?: string
  system_name?: string
  code?: string
  status?: string
  sequence?: number
  linked_products_count?: number
  linked_products_preview?: ImplantLinkPreviewChip[]
  linked_products_more_count?: number
}

export type ImplantLinkBrowseByProductRow = {
  id: number
  name: string
  subcategory_id?: number
  subcategory_name?: string
  status?: string
  sequence?: number
  linked_implants_count?: number
  linked_implants_preview?: ImplantLinkPreviewChip[]
  linked_implants_more_count?: number
}

export type ImplantLinkBrowseParams = {
  q?: string
  page: number
  per_page: number
  order_by?: string
  sort_by?: 'asc' | 'desc'
}

type ImplantLinkBrowsePagination = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

function normalizePagination(
  raw: unknown,
  fallback: ImplantLinkBrowsePagination,
): ImplantLinkBrowsePagination {
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

function extractImplantLinkBrowseRows<T>(
  json: unknown,
  fallbackPaging: ImplantLinkBrowsePagination,
): { rows: T[]; pagination: ImplantLinkBrowsePagination } {
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
  const cid = getImplantLinkCustomerIdParam(context)
  if (cid != null) sp.set('customer_id', String(cid))
}

const invalidateImplantLinkBrowse = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['implantLinkBrowseByImplant'] })
  qc.invalidateQueries({ queryKey: ['implantLinkBrowseByProduct'] })
  qc.invalidateQueries({ queryKey: ['implants'] })
  qc.invalidateQueries({ queryKey: ['implant'] })
  qc.invalidateQueries({ queryKey: ['libraryProductImplantLinkDetail'] })
}

export function formatImplantDisplayName(input: {
  id?: number
  name?: string | null
  brand_name?: string | null
  system_name?: string | null
}): string {
  const fromBrowse = typeof input.name === 'string' ? input.name.trim() : ''
  if (fromBrowse) return fromBrowse
  const brand = typeof input.brand_name === 'string' ? input.brand_name.trim() : ''
  const system = typeof input.system_name === 'string' ? input.system_name.trim() : ''
  const joined = [brand, system].filter(Boolean).join(' - ')
  if (joined) return joined
  return input.id != null ? `Implant #${input.id}` : 'Implant'
}

export const useBrowseImplantLinkByImplant = (
  context: 'global' | 'lab',
  params: ImplantLinkBrowseParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['implantLinkBrowseByImplant', context, params] as const,
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
        `${ensureAbsoluteUrl('/library/implants/link-implants/browse-by-implant')}?${sp.toString()}`,
        { headers: getAuthHeaders() },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to browse implant links by implant',
        )
      }
      const result = await response.json()
      const fallbackPaging = {
        total: 0,
        per_page: params.per_page,
        current_page: params.page,
        last_page: 1,
      }
      return extractImplantLinkBrowseRows<ImplantLinkBrowseByImplantRow>(result, fallbackPaging)
    },
  })
}

export const useBrowseImplantLinkByProduct = (
  context: 'global' | 'lab',
  params: ImplantLinkBrowseParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['implantLinkBrowseByProduct', context, params] as const,
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
        `${ensureAbsoluteUrl('/library/implants/link-implants/browse-by-product')}?${sp.toString()}`,
        { headers: getAuthHeaders() },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to browse implant links by product',
        )
      }
      const result = await response.json()
      const fallbackPaging = {
        total: 0,
        per_page: params.per_page,
        current_page: params.page,
        last_page: 1,
      }
      return extractImplantLinkBrowseRows<ImplantLinkBrowseByProductRow>(result, fallbackPaging)
    },
  })
}

export const useImplantLinkByImplant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      implant_id: number
      product_ids: number[]
      customer_id?: number
    }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/implants/link-implants/link-by-implant'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to link products to implant',
        )
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateImplantLinkBrowse(qc)
    },
  })
}

export const useImplantLinkByProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      product_id: number
      implant_ids: number[]
      customer_id?: number
    }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/implants/link-implants/link-by-product'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          (error as { message?: string }).message || 'Failed to link implants to product',
        )
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateImplantLinkBrowse(qc)
    },
  })
}

export const useImplantBulkLink = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      implant_ids: number[]
      product_ids: number[]
      customer_id?: number
    }) => {
      const response = await fetch(
        ensureAbsoluteUrl('/library/implants/link-implants/bulk-link'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error((error as { message?: string }).message || 'Failed to bulk link implants')
      }
      return response.json()
    },
    onSuccess: () => {
      invalidateImplantLinkBrowse(qc)
    },
  })
}

/** GET /library/products/{id} — same customer_id query rules as advance link-fields product detail. */
export async function fetchLibraryProductDetailForImplantLinks(
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

export type LinkedImplantFromProduct = {
  id: number
  name: string
  brand_name?: string
  system_name?: string
}

/** Parse linked implants from product show payload (`implants` array). */
export function parseLinkedImplantsFromProductPayload(
  product: Record<string, unknown> | null | undefined,
): LinkedImplantFromProduct[] {
  if (!product || typeof product !== 'object') return []
  const raw = product.implants
  if (!Array.isArray(raw)) return []

  const out: LinkedImplantFromProduct[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const rawId = row.id
    const id =
      typeof rawId === 'number'
        ? rawId
        : typeof rawId === 'string' && rawId.trim() !== ''
          ? Number(rawId)
          : NaN
    if (!Number.isFinite(id) || id <= 0) continue
    out.push({
      id,
      name: formatImplantDisplayName({
        id,
        name: typeof row.name === 'string' ? row.name : undefined,
        brand_name: typeof row.brand_name === 'string' ? row.brand_name : undefined,
        system_name: typeof row.system_name === 'string' ? row.system_name : undefined,
      }),
      brand_name: typeof row.brand_name === 'string' ? row.brand_name : undefined,
      system_name: typeof row.system_name === 'string' ? row.system_name : undefined,
    })
  }
  return out
}

export function parseLinkedImplantIdsFromProductPayload(
  product: Record<string, unknown> | null | undefined,
): number[] {
  return parseLinkedImplantsFromProductPayload(product).map((r) => r.id)
}

export function parseLinkedProductIdsFromImplantPayload(
  implant: Record<string, unknown> | null | undefined,
): number[] {
  if (!implant || typeof implant !== 'object') return []
  const raw = implant.products
  if (!Array.isArray(raw)) return []
  const ids: number[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rawId = (item as Record<string, unknown>).id
    const id =
      typeof rawId === 'number'
        ? rawId
        : typeof rawId === 'string' && rawId.trim() !== ''
          ? Number(rawId)
          : NaN
    if (Number.isFinite(id) && id > 0) ids.push(id)
  }
  return ids
}

export function parseLinkedProductsMapFromImplantPayload(
  implant: Record<string, unknown> | null | undefined,
): Map<number, { name: string; subcategoryName: string }> {
  const map = new Map<number, { name: string; subcategoryName: string }>()
  if (!implant || typeof implant !== 'object') return map
  const raw = implant.products
  if (!Array.isArray(raw)) return map

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    const rawId = p.id
    const id =
      typeof rawId === 'number'
        ? rawId
        : typeof rawId === 'string' && rawId.trim() !== ''
          ? Number(rawId)
          : NaN
    if (!Number.isFinite(id) || id <= 0) continue

    const subObj =
      (p.subcategory as { name?: string; category?: { name?: string } } | undefined) ?? undefined
    const subcategoryName =
      (typeof p.subcategory_name === 'string' ? p.subcategory_name : undefined) ||
      subObj?.name ||
      subObj?.category?.name ||
      (typeof p.category_name === 'string' ? p.category_name : undefined) ||
      '—'

    map.set(id, {
      name:
        (typeof p.name === 'string' ? p.name : undefined) ||
        (typeof p.product_name === 'string' ? p.product_name : undefined) ||
        `Product #${id}`,
      subcategoryName,
    })
  }
  return map
}

/** Locate an implant browse row (paginated) to derive linked product preview when show omits products. */
export async function findImplantBrowseRowForLinks(
  implantId: number,
  context: 'global' | 'lab',
  hintQ?: string,
): Promise<ImplantLinkBrowseByImplantRow | null> {
  const perPage = 100
  let page = 1
  let last = 1

  do {
    const sp = new URLSearchParams()
    if (hintQ) sp.set('q', hintQ)
    sp.set('page', String(page))
    sp.set('per_page', String(perPage))
    sp.set('order_by', 'brand_name')
    sp.set('sort_by', 'asc')
    appendCustomerId(sp, context)

    const response = await fetch(
      `${ensureAbsoluteUrl('/library/implants/link-implants/browse-by-implant')}?${sp.toString()}`,
      { headers: getAuthHeaders() },
    )
    if (!response.ok) break
    const result = await response.json()
    const { rows, pagination } = extractImplantLinkBrowseRows<ImplantLinkBrowseByImplantRow>(
      result,
      { total: 0, per_page: perPage, current_page: page, last_page: 1 },
    )
    const hit = rows.find((r) => r.id === implantId)
    if (hit) return hit
    last = pagination.last_page
    page += 1
  } while (page <= Math.min(last, 20))

  if (hintQ) {
    return findImplantBrowseRowForLinks(implantId, context)
  }
  return null
}

export function linkedProductIdsFromBrowseImplantRow(
  row: ImplantLinkBrowseByImplantRow | null | undefined,
): { ids: number[]; complete: boolean } {
  if (!row) return { ids: [], complete: false }
  const ids = (row.linked_products_preview ?? [])
    .map((p) => p.id)
    .filter((id) => typeof id === 'number' && id > 0)
  const more = row.linked_products_more_count ?? 0
  const count = row.linked_products_count ?? ids.length
  const complete = more === 0 && ids.length >= count
  return { ids, complete }
}
