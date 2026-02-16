import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/* ------------------------------------------------------------------ */
/*  API response types (match GET /v1/library/categories)              */
/* ------------------------------------------------------------------ */
export interface LibrarySubcategoryApi {
  id: number
  name: string
  code: string
  category_id: number
  image_url: string | null
  sequence: number
  status?: string
}

export interface LibraryCategoryApi {
  id: number
  name: string
  code: string
  type?: string
  sequence: number
  status?: string
  image_url: string | null
  subcategories: LibrarySubcategoryApi[]
}

export interface LibraryCategoriesApiResponse {
  status: boolean
  message: string
  data: {
    data: LibraryCategoryApi[]
    pagination?: { total: number; per_page: number; current_page: number; last_page: number }
  }
}

/* ------------------------------------------------------------------ */
/*  UI shapes for wizard                                               */
/* ------------------------------------------------------------------ */
export interface WizardCategoryShape {
  id: number
  name: string
  img: string
}

export interface WizardSubcategoryShape {
  id: number
  name: string
  img: string
}

export const libraryCategoriesQueryKey = (customerId: number | undefined, lang: string) =>
  ["library-categories", customerId, lang] as const

const CATEGORY_IMG_FALLBACK = "/placeholder.svg"
const SUBCATEGORY_IMG_FALLBACK = "/placeholder.svg"

/** Category-specific fallback images when API image_url is null */
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Fixed Restoration": "/products/fixed-restoration.png",
  "Removable Restoration": "/products/removable-restoration.png",
  "Removables Restoration": "/products/removable-restoration.png",
  Orthodontics: "/products/orthodontics.png",
}

function getCategoryFallbackImg(name: string, code?: string): string {
  const byName = name && CATEGORY_FALLBACK_IMAGES[name]
  if (byName) return byName
  const byCode: Record<string, string> = {
    FS: "/products/fixed-restoration.png",
    RR: "/products/removable-restoration.png",
    OR: "/products/orthodontics.png",
  }
  return (code && byCode[code]) || CATEGORY_IMG_FALLBACK
}

/** Subcategory-specific fallback images when API image_url is null (by code and name) */
const SUBCATEGORY_FALLBACK_BY_CODE: Record<string, string> = {
  // Fixed Restoration
  SC: "/products/single-crown.jpg",
  MUB: "/products/multi-unit-bridge.jpg",
  IS: "/products/implant-supported.jpg",
  "I/O": "/products/inlays-onlays.jpg",
  VEN: "/products/emax.jpg",
  PC: "/products/post-core.jpg",
  SPC: "/products/specialized.jpg",
  // Orthodontics
  R: "/placeholder.svg?height=100&width=120&query=dental+retainer+clear",
  SM: "/placeholder.svg?height=100&width=120&query=space+maintainer",
  EA: "/placeholder.svg?height=100&width=120&query=expansion+appliance",
  FA: "/placeholder.svg?height=100&width=120&query=functional+appliance",
  CA: "/placeholder.svg?height=100&width=120&query=clear+dental+aligner",
  HA: "/placeholder.svg?height=100&width=120&query=habit+appliance",
  OS: "/placeholder.svg?height=100&width=120&query=occlusal+splint+dental",
  // Removables
  CD: "/placeholder.svg?height=100&width=120&query=full+denture",
  PD: "/placeholder.svg?height=100&width=120&query=partial+denture",
  DS: "/placeholder.svg?height=100&width=120&query=denture+service",
  OG: "/placeholder.svg?height=100&width=120&query=occlusal+guard",
  ORA: "/placeholder.svg?height=100&width=120&query=removable+appliance",
}

const SUBCATEGORY_FALLBACK_BY_NAME: Record<string, string> = {
  "Single Crowns": "/products/single-crown.jpg",
  "Multi-Unit Bridges": "/products/multi-unit-bridge.jpg",
  "Implant Supported": "/products/implant-supported.jpg",
  "Inlays/Onlays/Overlays": "/products/inlays-onlays.jpg",
  Veneers: "/products/emax.jpg",
  "Post & Core": "/products/post-core.jpg",
  "Specialized Restorations": "/products/specialized.jpg",
  Retainers: "/placeholder.svg?height=100&width=120&query=dental+retainer+clear",
  "Space Maintainers": "/placeholder.svg?height=100&width=120&query=space+maintainer",
  "Expansion Appliance": "/placeholder.svg?height=100&width=120&query=expansion+appliance",
  "Functional Appliance": "/placeholder.svg?height=100&width=120&query=functional+appliance",
  "Clear Aligners": "/placeholder.svg?height=100&width=120&query=clear+dental+aligner",
  "Habit Appliance": "/placeholder.svg?height=100&width=120&query=habit+appliance",
  "Orthodontic Splint": "/placeholder.svg?height=100&width=120&query=occlusal+splint+dental",
  "Complete Dentures": "/placeholder.svg?height=100&width=120&query=full+denture",
  "Partial Dentures": "/placeholder.svg?height=100&width=120&query=partial+denture",
  "Denture service": "/placeholder.svg?height=100&width=120&query=denture+service",
  "Occlusal Guards (Night guards)": "/placeholder.svg?height=100&width=120&query=occlusal+guard",
  "Other Removable appliance": "/placeholder.svg?height=100&width=120&query=removable+appliance",
}

function getSubcategoryFallbackImg(sub: LibrarySubcategoryApi): string {
  if (sub.name && SUBCATEGORY_FALLBACK_BY_NAME[sub.name]) return SUBCATEGORY_FALLBACK_BY_NAME[sub.name]
  if (sub.code && SUBCATEGORY_FALLBACK_BY_CODE[sub.code]) return SUBCATEGORY_FALLBACK_BY_CODE[sub.code]
  return SUBCATEGORY_IMG_FALLBACK
}

async function fetchLibraryCategories(
  customerId: number,
  lang: string
): Promise<LibraryCategoriesApiResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found")
  }

  const url = new URL("/v1/library/categories", API_BASE_URL)
  url.searchParams.set("lang", lang)
  url.searchParams.set("customer_id", String(customerId))

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
    throw new Error(`Failed to fetch categories: ${res.status}`)
  }

  const json = await res.json()
  if (!json.status || !Array.isArray(json.data?.data)) {
    throw new Error(json.message || "Invalid categories response")
  }
  return json as LibraryCategoriesApiResponse
}

/**
 * Fetches library categories (with subcategories) for a customer.
 * Use customer_id from selected lab (office_admin) or logged-in lab (lab_admin).
 */
export function useLibraryCategories(options: {
  customerId: number | undefined
  lang?: string
  enabled?: boolean
}) {
  const { customerId, lang = "en", enabled = true } = options
  const effectiveEnabled = enabled && typeof customerId === "number"

  const query = useQuery({
    queryKey: libraryCategoriesQueryKey(customerId, lang),
    queryFn: () => fetchLibraryCategories(customerId!, lang),
    enabled: effectiveEnabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const categoriesAsWizard: WizardCategoryShape[] = useMemo(
    () =>
      (query.data?.data?.data ?? []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        img: cat.image_url || getCategoryFallbackImg(cat.name, cat.code),
      })),
    [query.data]
  )

  const subcategoriesByCategoryId: Record<number, WizardSubcategoryShape[]> = useMemo(() => {
    const out: Record<number, WizardSubcategoryShape[]> = {}
    const list = query.data?.data?.data ?? []
    for (const cat of list) {
      out[cat.id] = (cat.subcategories ?? []).map((sub) => ({
        id: sub.id,
        name: sub.name,
        img: sub.image_url || getSubcategoryFallbackImg(sub),
      }))
    }
    return out
  }, [query.data])

  return {
    ...query,
    data: query.data,
    categoriesAsWizard,
    subcategoriesByCategoryId,
  }
}
