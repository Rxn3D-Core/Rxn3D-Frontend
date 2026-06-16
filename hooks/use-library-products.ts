import { useQuery, useQueries } from "@tanstack/react-query"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/* ------------------------------------------------------------------ */
/*  API response types (GET /v1/library/products) – matches API        */
/* ------------------------------------------------------------------ */
export interface LibraryProductCategoryApi {
  id: number
  name: string
  code: string
  type?: string
  sequence: number
  status?: string
  image_url?: string | null
}

export interface LibraryProductCasePanApi {
  id: number
  name: string
  code: string
  description?: string
  type?: string
  status?: string
  sequence?: number
  quantity?: number
}

export interface LibraryProductSubcategoryApi {
  id: number
  name: string
  code: string
  category_id: number
  case_pan_id?: number
  status?: string
  sequence?: number
  image_url?: string | null
  category?: LibraryProductCategoryApi
  case_pan?: LibraryProductCasePanApi
}

export interface LibraryProductApi {
  id: number
  name: string
  code: string
  status: string
  sequence: number
  is_single_stage?: string
  has_multiple_grades?: string
  is_teeth_based_price?: string
  customer_id: number | null
  is_custom: string
  price: string
  image_url: string | null
  /** Per-arch images — populated by API when available, otherwise null */
  arch_image_maxillary?: string | null
  arch_image_both?: string | null
  arch_image_mandibular?: string | null
  /** Jaw reference photos uploaded via product management */
  show_jaw_photo?: string | null
  jaw_photos?: { upper?: string | null; lower?: string | null; both?: string | null } | null
  min_days_to_process: number | null
  max_days_to_process: number | null
  created_at: string
  updated_at: string
  subcategory?: LibraryProductSubcategoryApi
  customer?: Record<string, unknown> | null
}

export interface LibraryProductsApiResponse {
  status: boolean
  message: string
  data: {
    data: LibraryProductApi[]
    pagination?: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

/* ------------------------------------------------------------------ */
/*  UI shape for wizard (material/product step)                        */
/* ------------------------------------------------------------------ */
export interface ArchImages {
  maxillary?: string | null
  both?: string | null
  mandibular?: string | null
}

export interface WizardProductShape {
  id: number
  name: string
  img: string
  /** Per-arch images for removable restoration hover popover. Populated from API when available. */
  arch_images: ArchImages
  /** Whether to use jaw_photos as arch popover images instead of arch_images */
  show_jaw_photo: boolean
  /** Jaw reference photos — used in arch popover when show_jaw_photo is true */
  jaw_photos: { upper?: string | null; lower?: string | null; both?: string | null }
}

export const libraryProductsQueryKey = (
  customerId: number | undefined,
  subcategoryId: number | undefined,
  page: number
) => ["library-products", customerId, subcategoryId, page] as const

export const libraryProductSearchQueryKey = (
  customerId: number | undefined,
  search: string,
  page: number
) => ["library-product-search", customerId, search, page] as const

const PRODUCT_IMG_FALLBACK = "/placeholder.svg"

/** Product fallback images when API image_url is null (by code and name) */
const PRODUCT_FALLBACK_BY_CODE: Record<string, string> = {
  ZIR: "/products/full-contour-zirconia.jpg",
  EMAX: "/products/emax.jpg",
  CPFM: "/products/pfm.jpg",
  PFM: "/products/pfm.jpg",
  FCAST: "/products/full-cast.jpg",
  PFZ: "/products/pfz.jpg",
  SCS: "/products/full-contour-zirconia.jpg",
}

const PRODUCT_FALLBACK_BY_NAME: Record<string, string> = {
  "Full Contour Zirconia Crown": "/products/full-contour-zirconia.jpg",
  "Lithium Disilicate Crown (e.max)": "/products/emax.jpg",
  "PFM Crown": "/products/pfm.jpg",
  "Full Cast Crown": "/products/full-cast.jpg",
  "Single Crown special": "/products/full-contour-zirconia.jpg",
}

function getProductFallbackImg(p: LibraryProductApi): string {
  if (p.name && PRODUCT_FALLBACK_BY_NAME[p.name]) return PRODUCT_FALLBACK_BY_NAME[p.name]
  if (p.code && PRODUCT_FALLBACK_BY_CODE[p.code]) return PRODUCT_FALLBACK_BY_CODE[p.code]
  return PRODUCT_IMG_FALLBACK
}

async function fetchLibraryProductsSearch(
  customerId: number,
  search: string,
  page: number,
  perPage: number
): Promise<LibraryProductsApiResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found")
  }

  const url = new URL("/v1/library/products", API_BASE_URL)
  url.searchParams.set("customer_id", String(customerId))
  url.searchParams.set("search", search)
  url.searchParams.set("per_page", String(perPage))
  url.searchParams.set("page", String(page))
  url.searchParams.set("lang", "en")

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    throw new Error(`Failed to search products: ${res.status}`)
  }

  const json = await res.json()
  const data = json.data?.data ?? json.data
  if (!Array.isArray(data)) {
    throw new Error(json.message || "Invalid products response")
  }
  return {
    status: json.status,
    message: json.message,
    data: { data, pagination: json.data?.pagination ?? json.pagination },
  }
}

async function fetchLibraryProducts(
  customerId: number,
  subcategoryId: number,
  page: number,
  perPage: number
): Promise<LibraryProductsApiResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found")
  }

  const url = new URL("/v1/library/products", API_BASE_URL)
  url.searchParams.set("customer_id", String(customerId))
  url.searchParams.set("subcategory_id", String(subcategoryId))
  url.searchParams.set("per_page", String(perPage))
  url.searchParams.set("page", String(page))
  url.searchParams.set("lang", "en")

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`)
  }

  const json = await res.json()
  const data = json.data?.data ?? json.data
  if (!Array.isArray(data)) {
    throw new Error(json.message || "Invalid products response")
  }
  return {
    status: json.status,
    message: json.message,
    data: { data, pagination: json.data?.pagination ?? json.pagination },
  }
}

/**
 * Fetches library products (materials) for a subcategory.
 * Uses customer_id (same as categories) and subcategory_id from the selected subcategory.
 */
export function useLibraryProducts(options: {
  customerId: number | undefined
  subcategoryId: number | undefined
  page?: number
  perPage?: number
  enabled?: boolean
}) {
  const {
    customerId,
    subcategoryId,
    page = 1,
    perPage = 50,
    enabled = true,
  } = options
  const effectiveEnabled =
    enabled &&
    typeof customerId === "number" &&
    typeof subcategoryId === "number"

  const query = useQuery({
    queryKey: libraryProductsQueryKey(customerId, subcategoryId, page),
    queryFn: () =>
      fetchLibraryProducts(customerId!, subcategoryId!, page, perPage),
    enabled: effectiveEnabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const productsAsWizard: WizardProductShape[] =
    (query.data?.data?.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      img: p.image_url || getProductFallbackImg(p),
      arch_images: {
        maxillary: p.arch_image_maxillary ?? null,
        both: p.arch_image_both ?? null,
        mandibular: p.arch_image_mandibular ?? null,
      },
      show_jaw_photo: p.show_jaw_photo === "Yes" || !!(p.jaw_photos?.upper || p.jaw_photos?.lower || p.jaw_photos?.both),
      jaw_photos: {
        upper: p.jaw_photos?.upper ?? null,
        lower: p.jaw_photos?.lower ?? null,
        both: p.jaw_photos?.both ?? null,
      },
    }))

  return {
    ...query,
    data: query.data,
    productsAsWizard,
    pagination: query.data?.data?.pagination,
  }
}

/**
 * Lab-wide product name search (no subcategory filter).
 * Used by the case wizard search bar on the category / product steps.
 */
export function useLibraryProductSearch(options: {
  customerId: number | undefined
  search: string
  page?: number
  perPage?: number
  enabled?: boolean
}) {
  const {
    customerId,
    search,
    page = 1,
    perPage = 50,
    enabled = true,
  } = options
  const trimmedSearch = search.trim()
  const effectiveEnabled =
    enabled && typeof customerId === "number" && trimmedSearch.length > 0

  const query = useQuery({
    queryKey: libraryProductSearchQueryKey(customerId, trimmedSearch, page),
    queryFn: () =>
      fetchLibraryProductsSearch(customerId!, trimmedSearch, page, perPage),
    enabled: effectiveEnabled,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const products: LibraryProductApi[] = query.data?.data?.data ?? []

  return {
    ...query,
    products,
    pagination: query.data?.data?.pagination,
  }
}

/**
 * For each subcategory ID in the list, fetches product count (per_page=1 to keep it cheap).
 * Returns a map of subcategoryId → product count (undefined while loading).
 * Used to determine which subcategory cards should show the arch hover popover.
 */
export function useSubcategoryProductCounts(options: {
  customerId: number | undefined
  subcategoryIds: number[]
  enabled?: boolean
}): { counts: Record<number, number | undefined>; products: Record<number, LibraryProductApi[] | undefined> } {
  const { customerId, subcategoryIds, enabled = true } = options

  const results = useQueries({
    queries: subcategoryIds.map((subcategoryId) => ({
      queryKey: libraryProductsQueryKey(customerId, subcategoryId, 1),
      queryFn: () => fetchLibraryProducts(customerId!, subcategoryId, 1, 50),
      enabled: enabled && typeof customerId === "number",
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  })

  const counts: Record<number, number | undefined> = {}
  const products: Record<number, LibraryProductApi[] | undefined> = {}
  subcategoryIds.forEach((id, i) => {
    const result = results[i]
    const pagination = result.data?.data?.pagination
    const data = result.data?.data?.data
    if (pagination) {
      counts[id] = pagination.total
    } else if (data) {
      counts[id] = data.length
    } else {
      counts[id] = undefined
    }
    products[id] = data
  })
  return { counts, products }
}
