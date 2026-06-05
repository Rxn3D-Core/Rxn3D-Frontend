"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { X, Search, Plus, Minus, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery, useQueries } from "@tanstack/react-query"
import type { RushArchSlot } from "@/components/case-design-center/utils/rushModalContext"
import { useAuth } from "@/contexts/auth-context"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { useCaseDesignStore } from "@/stores/caseDesignStore"
import { useToast } from "@/components/ui/use-toast"
import {
  flattenSlipAddonCategories,
  getEligibleSlipAddons,
  getLinkedSlipAddons,
  slipProductTypeToArch,
  updateSlipAddons,
  type SlipAddonCategory,
} from "@/lib/api/slip-addons"
import {
  catalogAddonsFromProductPayload,
  flattenProductAddonsToCatalogRows,
  mergeLinkedAddonsIntoCatalog,
  type SlipAddonCatalogRow,
} from "@/lib/slip-product-addon-catalog"

/** A product available in the case for add-on selection */
export interface AddOnsProduct {
  id: number
  name: string
  /** Pre-loaded addons from the product API response */
  addons?: Array<{
    id: number
    addon_id?: number
    name: string
    code: string
    sequence?: number
    status?: string
    is_default?: string
    price?: string | number | null
    quantity?: number
    subcategory?: { id: number; name: string; code?: string } | null
    category?: { id: number; name: string; code?: string } | null
  }>
}

export type AddOnsConfirmMeta = {
  arch: "maxillary" | "mandibular"
  repTooth: number
  cardId: number
  apiProductId: number
  rushKey: string
  isFixed: boolean
}

type AddOnEntry = {
  addon_id: number
  qty: number
  category: string
  subcategory: string
  name: string
  price: number
}

interface AddOnsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddAddOns: (
    addOns: AddOnEntry[],
    arch: "maxillary" | "mandibular",
    meta?: AddOnsConfirmMeta
  ) => void
  labId: number
  productId: string
  arch: "maxillary" | "mandibular"
  /** All products available in the case — shown as tabs (legacy) or per-column catalog (slots) */
  products?: AddOnsProduct[]
  /** Which arch columns to display. Defaults to both. Legacy dual-arch layout only. */
  visibleArches?: ("maxillary" | "mandibular")[]
  /** One column per product card (same slots as rush modal). */
  archSlots?: RushArchSlot[]
  /** When set, loads/saves via POST /slip/eligible-addons, linked-addons, update-addons. */
  slipId?: number
  /** Called after slip add-ons are persisted (listing / virtual slip refresh). */
  onSlipAddonsSaved?: () => void
}

type ApiAddon = {
  id: number
  name: string
  code: string
  sequence: number
  price: number
  status: string
}

type ApiSubcategory = {
  id: number
  name: string
  code: string
  sequence: number
  addons: ApiAddon[]
}

type ApiCategory = {
  id: number
  name: string
  code: string
  sequence: number
  subcategories: ApiSubcategory[]
}

type SelectedAddOn = {
  addon_id: number
  qty: number
  category: string
  subcategory: string
  name: string
  price: number
  arch: "maxillary" | "mandibular"
}

const ITEMS_PER_PAGE = 10
const DEFAULT_PRODUCTS: AddOnsProduct[] = []
const DEFAULT_VISIBLE_ARCHES: ("maxillary" | "mandibular")[] = ["maxillary", "mandibular"]

/**
 * Default QTY when the modal opens with an empty store — follows lab product config
 * (`is_default` + `quantity`), with legacy support for addons that only set `quantity`.
 */
function getDefaultSeedQtyFromProductAddon(a: {
  id: number
  addon_id?: number
  status?: string
  is_default?: string
  quantity?: number
}): number | null {
  const addonId = a.addon_id ?? a.id
  if (!addonId) return null
  const status = String(a.status ?? "Active").trim().toLowerCase()
  if (status === "inactive") return null
  const isDef = String(a.is_default ?? "").trim().toLowerCase() === "yes"
  const qRaw = a.quantity
  const q =
    typeof qRaw === "number"
      ? qRaw
      : qRaw != null && String(qRaw).trim() !== ""
        ? Number(qRaw)
        : NaN
  if (isDef) {
    if (Number.isFinite(q) && q > 0) return Math.max(1, Math.floor(q))
    return 1
  }
  if (Number.isFinite(q) && q > 0) return Math.max(1, Math.floor(q))
  return null
}

function slotQtyKey(rushKey: string, addonId: number) {
  return `${rushKey}_${addonId}`
}

function legacyQtyKey(pid: number | string, archVal: string, addonId: number) {
  return `${pid}_${archVal}_${addonId}`
}

function slipQtyKey(slipId: number, archVal: "maxillary" | "mandibular", addonId: number) {
  return `slip_${slipId}_${archVal}_${addonId}`
}

function categoriesToModalRows(categories: SlipAddonCategory[] | undefined) {
  return flattenSlipAddonCategories(categories)
    .filter((row) => String(row.status).trim().toLowerCase() !== "inactive")
    .map((row) => ({
      addon: {
        id: row.addonId,
        name: row.name,
        code: row.code,
        sequence: 0,
        price: row.price,
        status: row.status,
      } as ApiAddon,
      category: row.category,
      subcategory: row.subcategory,
    }))
}

export default function AddOnsModal({
  isOpen,
  onClose,
  onAddAddOns,
  labId,
  productId,
  arch,
  products = DEFAULT_PRODUCTS,
  visibleArches = DEFAULT_VISIBLE_ARCHES,
  archSlots = [],
  slipId,
  onSlipAddonsSaved,
}: AddOnsModalProps) {
  const isSlipMode = slipId != null && slipId > 0
  const useSlotColumns = archSlots.length > 0
  const useSlipSlotColumns = isSlipMode && useSlotColumns
  const { toast } = useToast()
  const [savingSlipAddons, setSavingSlipAddons] = useState(false)
  const showBatchAddOnFooter = useSlotColumns && archSlots.length > 1
  const multipleSlotsOnOneArch =
    useSlotColumns &&
    new Set(archSlots.map((s) => s.arch)).size === 1 &&
    archSlots.length > 1

  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  const [maxSearch, setMaxSearch] = useState("")
  const [mandSearch, setMandSearch] = useState("")
  const [maxPage, setMaxPage] = useState(1)
  const [mandPage, setMandPage] = useState(1)
  const [searchBySlotKey, setSearchBySlotKey] = useState<Record<string, string>>({})
  const [pageBySlotKey, setPageBySlotKey] = useState<Record<string, number>>({})
  // Legacy: `${productId}_${arch}_${addonId}` · Slots: `${rushKey}_${addonId}`
  const [selectedQtys, setSelectedQtys] = useState<Record<string, number>>({})

  const visibleArchesKey = visibleArches.join("|")

  const { token } = useAuth()
  const { fetchProductDetails } = useSlipCreation()

  const {
    removeAddOn,
    setProductAddOns,
    productAddOns: storeProductAddOns
  } = useCaseDesignStore()

  /** Catalog product ids for slip mode — one fetch per selected product (library product details). */
  const slipProductIds = useMemo(() => {
    if (!isSlipMode) return [] as number[]
    const ids = new Set<number>()
    if (useSlotColumns) {
      for (const s of archSlots) {
        if (s.apiProductId > 0) ids.add(s.apiProductId)
      }
    } else {
      for (const p of products) {
        if (p.id > 0) ids.add(p.id)
      }
      const parsed = parseInt(productId, 10)
      if (!Number.isNaN(parsed) && parsed > 0) ids.add(parsed)
    }
    return [...ids]
  }, [isSlipMode, useSlotColumns, archSlots, products, productId])

  const { data: slipEligible, isLoading: slipEligibleLoading } = useQuery({
    queryKey: ["slip-eligible-addons", slipId],
    queryFn: () => getEligibleSlipAddons(slipId!),
    enabled: isOpen && isSlipMode && slipProductIds.length === 0,
    staleTime: 60 * 1000,
  })

  const { data: slipLinked, isLoading: slipLinkedLoading } = useQuery({
    queryKey: ["slip-linked-addons", slipId],
    queryFn: () => getLinkedSlipAddons(slipId!),
    enabled: isOpen && isSlipMode,
    staleTime: 30 * 1000,
  })

  const slipEligibleMaxillaryCatalog = useMemo(
    () => categoriesToModalRows(slipEligible?.upper_addons),
    [slipEligible?.upper_addons]
  )

  const slipEligibleMandibularCatalog = useMemo(
    () => categoriesToModalRows(slipEligible?.lower_addons),
    [slipEligible?.lower_addons]
  )


  const wasOpenRef = useRef(false)
  const slipQtyHydratedSigRef = useRef<string | null>(null)

  // Reset search/pagination once per open; hydrate qty from store or slip API without re-running on unrelated store updates
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      slipQtyHydratedSigRef.current = null
      return
    }

    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true

    if (justOpened) {
      setMaxSearch("")
      setMandSearch("")
      setMaxPage(1)
      setMandPage(1)
      setSearchBySlotKey({})
      setPageBySlotKey({})
    }

    if (isSlipMode && slipId) {
      const sig = `${slipId}:${(slipLinked?.linked_addons ?? [])
        .map((r) => `${r.slip_product_type}:${r.addon?.id}:${r.quantity}`)
        .join("|")}`
      if (!justOpened && sig === slipQtyHydratedSigRef.current) return
      slipQtyHydratedSigRef.current = sig

      const restored: Record<string, number> = {}
      for (const row of slipLinked?.linked_addons ?? []) {
        const archVal = slipProductTypeToArch(row.slip_product_type)
        const addonId = row.addon?.id
        const qty = row.quantity ?? 0
        if (archVal && addonId && qty > 0) {
          restored[slipQtyKey(slipId, archVal, addonId)] = qty
        }
      }
      setSelectedQtys(restored)
      return
    }

    if (!justOpened) return

    const restored: Record<string, number> = {}

    if (useSlotColumns) {
      for (const slot of archSlots) {
        const pid = slot.apiProductId
        const existing =
          storeProductAddOns[pid.toString()] || { maxillary: [], mandibular: [] }
        let slotHasQty = false
        for (const a of existing[slot.arch] || []) {
          const addonId = (a as Record<string, unknown>).addon_id as number
          const qty =
            ((a as Record<string, unknown>).qty as number) ||
            ((a as Record<string, unknown>).quantity as number) ||
            1
          if (addonId && qty > 0) {
            restored[slotQtyKey(slot.rushKey, addonId)] = qty
            slotHasQty = true
          }
        }
        if (!slotHasQty) {
          const productAddons =
            products.find((p) => p.id === pid)?.addons ?? []
          for (const a of productAddons) {
            const addonId = a.addon_id ?? a.id
            const qty = getDefaultSeedQtyFromProductAddon(a)
            if (addonId && qty != null && qty > 0) {
              restored[slotQtyKey(slot.rushKey, addonId)] = qty
            }
          }
        }
      }
      const firstSlot = archSlots[0]
      if (firstSlot) setActiveProductId(firstSlot.apiProductId)
      setSelectedQtys(restored)
      return
    }

    // Legacy: tabs + maxillary/mandibular columns for one active product
    let pid: number | null = null
    if (products.length === 1) {
      pid = products[0].id
    } else {
      const initialId = parseInt(productId, 10)
      if (!isNaN(initialId)) pid = initialId
      else if (products.length > 0) pid = products[0].id
    }
    if (pid !== null) {
      setActiveProductId(pid)
      const existing = storeProductAddOns[pid.toString()] || { maxillary: [], mandibular: [] }
      for (const archVal of ["maxillary", "mandibular"] as const) {
        for (const a of existing[archVal] || []) {
          const addonId = (a as Record<string, unknown>).addon_id as number
          const qty =
            ((a as Record<string, unknown>).qty as number) ||
            ((a as Record<string, unknown>).quantity as number) ||
            1
          if (addonId && qty > 0) {
            restored[legacyQtyKey(pid, archVal, addonId)] = qty
          }
        }
      }
      if (Object.keys(restored).length === 0) {
        const productAddons = products.find((p) => p.id === pid)?.addons ?? []
        const archesFromKey = visibleArchesKey
          .split("|")
          .filter((s): s is "maxillary" | "mandibular" => s === "maxillary" || s === "mandibular")
        const archesForDefaults = archesFromKey.length > 0 ? archesFromKey : [arch]
        for (const archVal of archesForDefaults) {
          for (const a of productAddons) {
            const addonId = a.addon_id ?? a.id
            const qty = getDefaultSeedQtyFromProductAddon(a)
            if (addonId && qty != null && qty > 0) {
              restored[legacyQtyKey(pid, archVal, addonId)] = qty
            }
          }
        }
      }
      setSelectedQtys(restored)
    } else {
      setSelectedQtys({})
    }
  }, [
    isOpen,
    productId,
    arch,
    visibleArchesKey,
    products,
    storeProductAddOns,
    useSlotColumns,
    archSlots,
    isSlipMode,
    slipId,
    slipLinked,
  ])

  // Debounced search terms
  const [debouncedMaxSearch, setDebouncedMaxSearch] = useState("")
  const [debouncedMandSearch, setDebouncedMandSearch] = useState("")
  const maxDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const mandDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (maxDebounceRef.current) clearTimeout(maxDebounceRef.current)
    maxDebounceRef.current = setTimeout(() => setDebouncedMaxSearch(maxSearch), 500)
    return () => { if (maxDebounceRef.current) clearTimeout(maxDebounceRef.current) }
  }, [maxSearch])

  useEffect(() => {
    if (mandDebounceRef.current) clearTimeout(mandDebounceRef.current)
    mandDebounceRef.current = setTimeout(() => setDebouncedMandSearch(mandSearch), 500)
    return () => { if (mandDebounceRef.current) clearTimeout(mandDebounceRef.current) }
  }, [mandSearch])

  // Get the correct lab ID based on user role
  const effectiveLabId = useMemo(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
    return role === "office_admin" || role === "doctor"
      ? localStorage.getItem("selectedLabId")
      : localStorage.getItem("customerId")
  }, [])

  const fetchAddonsForProduct = useCallback(
    async (pid: number) => {
      if (!pid || !effectiveLabId) return []

      const url = new URL(
        `/v1/slip/lab/${effectiveLabId}/products/${pid}/addons`,
        process.env.NEXT_PUBLIC_API_BASE_URL
      )

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.status === 401) {
        window.location.href = "/login"
        return []
      }

      const json = await res.json()
      return json.data || []
    },
    [effectiveLabId, token]
  )

  // Active product's pre-loaded addons (from product API response)
  const activeProductAddons = useMemo(() => {
    const found = products.find((p) => p.id === activeProductId)
    return found?.addons ?? null
  }, [products, activeProductId])

  const flattenAddonCatalog = useCallback(
    (
      productAddons: AddOnsProduct["addons"] | null | undefined,
      categories: ApiCategory[]
    ): SlipAddonCatalogRow[] => {
      const catalogOnly = catalogAddonsFromProductPayload(productAddons) ?? productAddons
      return flattenProductAddonsToCatalogRows(catalogOnly ?? undefined, categories)
    },
    []
  )

  const slotAddonQueries = useQueries({
    queries: archSlots.map((slot) => {
      const preloaded = products.find((p) => p.id === slot.apiProductId)?.addons
      const needsFetch = !preloaded || preloaded.length === 0
      return {
        queryKey: ["product-addons", slot.apiProductId, effectiveLabId],
        queryFn: () => fetchAddonsForProduct(slot.apiProductId),
        enabled: isOpen && !isSlipMode && useSlotColumns && needsFetch && !!effectiveLabId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      }
    }),
  })

  const slotAddonsByRushKey = useMemo(() => {
    if (!useSlotColumns) return {} as Record<string, ReturnType<typeof flattenAddonCatalog>>
    const map: Record<string, ReturnType<typeof flattenAddonCatalog>> = {}
    archSlots.forEach((slot, index) => {
      const preloaded = products.find((p) => p.id === slot.apiProductId)?.addons
      const categories = (slotAddonQueries[index]?.data as ApiCategory[] | undefined) ?? []
      map[slot.rushKey] = flattenAddonCatalog(preloaded, categories)
    })
    return map
  }, [useSlotColumns, archSlots, products, slotAddonQueries, flattenAddonCatalog])

  const fetchSlipProductAddonCatalog = useCallback(
    async (pid: number) => {
      const preloaded = catalogAddonsFromProductPayload(
        products.find((p) => p.id === pid)?.addons
      )
      if (preloaded) {
        return flattenProductAddonsToCatalogRows(preloaded, [])
      }
      const details = await fetchProductDetails(pid)
      const fromDetails = catalogAddonsFromProductPayload(details?.addons)
      if (fromDetails) {
        return flattenProductAddonsToCatalogRows(fromDetails, [])
      }
      const categories = await fetchAddonsForProduct(pid)
      return flattenProductAddonsToCatalogRows(undefined, categories ?? [])
    },
    [products, fetchProductDetails, fetchAddonsForProduct]
  )

  const slipProductCatalogQueries = useQueries({
    queries: slipProductIds.map((pid) => ({
      queryKey: ["slip-product-addon-catalog", pid, effectiveLabId],
      queryFn: () => fetchSlipProductAddonCatalog(pid),
      enabled: isOpen && isSlipMode && !!effectiveLabId,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  })

  const productCatalogById = useMemo(() => {
    const map: Record<number, SlipAddonCatalogRow[]> = {}
    slipProductIds.forEach((pid, index) => {
      map[pid] = slipProductCatalogQueries[index]?.data ?? []
    })
    return map
  }, [slipProductIds, slipProductCatalogQueries])

  const slipSlotAddonsByRushKey = useMemo(() => {
    if (!isSlipMode || !useSlipSlotColumns) return {} as Record<string, SlipAddonCatalogRow[]>
    const map: Record<string, SlipAddonCatalogRow[]> = {}
    for (const slot of archSlots) {
      const base = productCatalogById[slot.apiProductId] ?? []
      map[slot.rushKey] = mergeLinkedAddonsIntoCatalog(
        base,
        slipLinked?.linked_addons,
        slot.arch
      )
    }
    return map
  }, [
    isSlipMode,
    useSlipSlotColumns,
    archSlots,
    productCatalogById,
    slipLinked?.linked_addons,
  ])

  const getSlipArchCatalog = useCallback(
    (archVal: "maxillary" | "mandibular"): SlipAddonCatalogRow[] => {
      if (useSlipSlotColumns) {
        const rows: SlipAddonCatalogRow[] = []
        const seen = new Set<number>()
        for (const slot of archSlots) {
          if (slot.arch !== archVal) continue
          for (const row of slipSlotAddonsByRushKey[slot.rushKey] ?? []) {
            if (seen.has(row.addon.id)) continue
            seen.add(row.addon.id)
            rows.push(row)
          }
        }
        if (rows.length > 0) return rows
      } else if (slipProductIds.length > 0) {
        const catalog = productCatalogById[slipProductIds[0]] ?? []
        const merged = mergeLinkedAddonsIntoCatalog(
          catalog,
          slipLinked?.linked_addons,
          archVal
        )
        if (merged.length > 0) return merged
      }
      const eligible =
        archVal === "maxillary"
          ? slipEligibleMaxillaryCatalog
          : slipEligibleMandibularCatalog
      return mergeLinkedAddonsIntoCatalog(
        eligible,
        slipLinked?.linked_addons,
        archVal
      )
    },
    [
      useSlipSlotColumns,
      archSlots,
      slipSlotAddonsByRushKey,
      slipProductIds,
      productCatalogById,
      slipLinked?.linked_addons,
      slipEligibleMaxillaryCatalog,
      slipEligibleMandibularCatalog,
    ]
  )

  const slipMaxillaryCatalog = useMemo(
    () => (isSlipMode ? getSlipArchCatalog("maxillary") : []),
    [isSlipMode, getSlipArchCatalog]
  )

  const slipMandibularCatalog = useMemo(
    () => (isSlipMode ? getSlipArchCatalog("mandibular") : []),
    [isSlipMode, getSlipArchCatalog]
  )

  const slipVisibleArches = useMemo((): ("maxillary" | "mandibular")[] => {
    if (!isSlipMode) return visibleArches
    if (useSlipSlotColumns) {
      const fromSlots = [...new Set(archSlots.map((s) => s.arch))]
      if (fromSlots.length > 0) return fromSlots
    }
    const explicit = visibleArches.filter(
      (a): a is "maxillary" | "mandibular" => a === "maxillary" || a === "mandibular"
    )
    if (explicit.length === 1) return explicit
    if (explicit.includes("maxillary") && explicit.includes("mandibular")) {
      return explicit
    }
    const arches: ("maxillary" | "mandibular")[] = []
    if (slipMaxillaryCatalog.length > 0) arches.push("maxillary")
    if (slipMandibularCatalog.length > 0) arches.push("mandibular")
    if (arches.length > 0) return arches
    return DEFAULT_VISIBLE_ARCHES
  }, [
    isSlipMode,
    useSlipSlotColumns,
    archSlots,
    visibleArches,
    slipMaxillaryCatalog.length,
    slipMandibularCatalog.length,
  ])

  const slipProductCatalogLoading =
    isSlipMode &&
    slipProductIds.length > 0 &&
    slipProductCatalogQueries.some((q) => q.isLoading)

  const slipCatalogLoading =
    slipLinkedLoading ||
    slipProductCatalogLoading ||
    (slipProductIds.length === 0 && slipEligibleLoading)

  // Fetch addons for the active product only when not pre-loaded (legacy)
  const fetchAddons = useCallback(async () => {
    if (!activeProductId) return []
    return fetchAddonsForProduct(activeProductId)
  }, [activeProductId, fetchAddonsForProduct])

  const { data: addOnCategories = [], isLoading: loading } = useQuery<ApiCategory[]>({
    queryKey: ['product-addons', activeProductId, effectiveLabId],
    queryFn: fetchAddons,
    enabled:
      isOpen && !isSlipMode && !!activeProductId && !!effectiveLabId && activeProductAddons === null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Flatten all addons for the table view.
  // When the active product has pre-loaded addons, use them directly.
  // Otherwise fall back to the category-grouped fetch result.
  const allAddons = useMemo(() => {
    const flat: { addon: ApiAddon; category: string; subcategory: string }[] = []
    if (activeProductAddons !== null) {
      for (const a of activeProductAddons) {
        flat.push({
          addon: {
            id: a.addon_id ?? a.id,
            name: a.name,
            code: a.code,
            sequence: a.sequence ?? 0,
            price: typeof a.price === "string" ? parseFloat(a.price) : (a.price ?? 0),
            status: a.status ?? "Active",
          },
          category: a.category?.name ?? a.subcategory?.name ?? "",
          subcategory: a.subcategory?.name ?? "",
        })
      }
      return flat
    }
    for (const cat of addOnCategories) {
      for (const subcat of cat.subcategories) {
        for (const addon of subcat.addons) {
          flat.push({ addon, category: cat.name, subcategory: subcat.name })
        }
      }
    }
    return flat
  }, [activeProductAddons, addOnCategories])

  // Filter and paginate for each arch
  const getFilteredAddons = useCallback((search: string) => {
    if (!search.trim()) return allAddons
    const term = search.toLowerCase()
    return allAddons.filter(
      ({ addon }) =>
        addon.name.toLowerCase().includes(term) ||
        addon.code.toLowerCase().includes(term)
    )
  }, [allAddons])

  const filterCatalog = useCallback(
    (
      catalog: { addon: ApiAddon; category: string; subcategory: string }[],
      search: string
    ) => {
      if (!search.trim()) return catalog
      const term = search.toLowerCase()
      return catalog.filter(
        ({ addon }) =>
          addon.name.toLowerCase().includes(term) ||
          addon.code.toLowerCase().includes(term)
      )
    },
    []
  )

  const maxFiltered = useMemo(() => {
    if (isSlipMode) return filterCatalog(slipMaxillaryCatalog, debouncedMaxSearch)
    return getFilteredAddons(debouncedMaxSearch)
  }, [
    isSlipMode,
    slipMaxillaryCatalog,
    debouncedMaxSearch,
    getFilteredAddons,
    filterCatalog,
  ])

  const mandFiltered = useMemo(() => {
    if (isSlipMode) return filterCatalog(slipMandibularCatalog, debouncedMandSearch)
    return getFilteredAddons(debouncedMandSearch)
  }, [
    isSlipMode,
    slipMandibularCatalog,
    debouncedMandSearch,
    getFilteredAddons,
    filterCatalog,
  ])

  const maxTotalPages = Math.max(1, Math.ceil(maxFiltered.length / ITEMS_PER_PAGE))
  const mandTotalPages = Math.max(1, Math.ceil(mandFiltered.length / ITEMS_PER_PAGE))

  const maxPagedAddons = useMemo(() => {
    const start = (maxPage - 1) * ITEMS_PER_PAGE
    return maxFiltered.slice(start, start + ITEMS_PER_PAGE)
  }, [maxFiltered, maxPage])

  const mandPagedAddons = useMemo(() => {
    const start = (mandPage - 1) * ITEMS_PER_PAGE
    return mandFiltered.slice(start, start + ITEMS_PER_PAGE)
  }, [mandFiltered, mandPage])

  // Qty helpers
  const qtyKey = (archVal: string, addonId: number) => `${activeProductId}_${archVal}_${addonId}`

  const getQty = (archVal: string, addonId: number) => {
    if (isSlipMode && slipId) {
      return selectedQtys[slipQtyKey(slipId, archVal as "maxillary" | "mandibular", addonId)] || 0
    }
    return selectedQtys[qtyKey(archVal, addonId)] || 0
  }

  const setQty = (archVal: string, addonId: number, qty: number) => {
    const key =
      isSlipMode && slipId
        ? slipQtyKey(slipId, archVal as "maxillary" | "mandibular", addonId)
        : qtyKey(archVal, addonId)
    setSelectedQtys(prev => {
      if (qty <= 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: qty }
    })
  }

  const buildStoreEntries = (
    slotOrPidKey: string,
    archVal: "maxillary" | "mandibular",
    catalog: { addon: ApiAddon; category: string; subcategory: string }[],
    keyMatcher: (key: string) => boolean
  ) => {
    const entries: {
      addon_id: number
      qty: number
      quantity: number
      category: string
      subcategory: string
      name: string
      addOn: string
      label: string
      price: number
    }[] = []

    for (const [key, qty] of Object.entries(selectedQtys)) {
      if (qty <= 0 || !keyMatcher(key)) continue
      const addonId = parseInt(key.split("_").pop() ?? "", 10)
      if (!addonId) continue
      const found = catalog.find((a) => a.addon.id === addonId)
      if (!found) continue
      const price = Number(
        typeof found.addon.price === "string"
          ? parseFloat(found.addon.price as unknown as string)
          : found.addon.price
      )
      entries.push({
        addon_id: addonId,
        qty,
        quantity: qty,
        category: found.category,
        subcategory: found.subcategory,
        name: found.addon.name,
        addOn: found.addon.name,
        label: found.addon.name,
        price,
      })
    }
    return entries
  }

  const handleConfirmSlot = (slot: RushArchSlot) => {
    const pid = slot.apiProductId.toString()
    const catalog = slotAddonsByRushKey[slot.rushKey] ?? []
    const prefix = `${slot.rushKey}_`
    const archEntries = buildStoreEntries(
      slot.rushKey,
      slot.arch,
      catalog,
      (key) => key.startsWith(prefix)
    )

    const existing =
      storeProductAddOns[pid] || { maxillary: [], mandibular: [] }
    setProductAddOns(pid, {
      maxillary: slot.arch === "maxillary" ? archEntries : existing.maxillary,
      mandibular: slot.arch === "mandibular" ? archEntries : existing.mandibular,
    })

    onAddAddOns(
      archEntries.map(({ addon_id, qty, category, subcategory, name, price }) => ({
        addon_id,
        qty,
        category,
        subcategory,
        name,
        price,
      })),
      slot.arch,
      {
        arch: slot.arch,
        repTooth: slot.repTooth,
        cardId: slot.cardId,
        apiProductId: slot.apiProductId,
        rushKey: slot.rushKey,
        isFixed: slot.isFixed,
      }
    )
  }

  const handleConfirmSlipAddons = async () => {
    if (!slipId) return
    setSavingSlipAddons(true)
    try {
      const buildPayload = (archVal: "maxillary" | "mandibular") => {
        const catalog = getSlipArchCatalog(archVal)
        const prefix = `slip_${slipId}_${archVal}_`
        const items: { addon_id: number; quantity: number }[] = []
        for (const [key, qty] of Object.entries(selectedQtys)) {
          if (qty <= 0 || !key.startsWith(prefix)) continue
          const addonId = parseInt(key.slice(prefix.length), 10)
          if (!addonId || !catalog.some((c) => c.addon.id === addonId)) continue
          items.push({ addon_id: addonId, quantity: qty })
        }
        return items
      }

      await updateSlipAddons({
        slip_id: slipId,
        upper_addons: buildPayload("maxillary"),
        lower_addons: buildPayload("mandibular"),
      })

      toast({
        title: "Add-ons saved",
        description: "Slip add-ons were updated successfully.",
      })
      onSlipAddonsSaved?.()
      setSelectedQtys({})
      onClose()
    } catch (err) {
      toast({
        title: "Could not save add-ons",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingSlipAddons(false)
    }
  }

  const handleConfirm = () => {
    if (isSlipMode) {
      void handleConfirmSlipAddons()
      return
    }
    if (!activeProductId) return
    const pid = activeProductId.toString()

    const archAddons: Record<
      string,
      {
        addon_id: number
        qty: number
        quantity: number
        category: string
        subcategory: string
        name: string
        addOn: string
        label: string
        price: number
      }[]
    > = {
      maxillary: [],
      mandibular: [],
    }

    for (const archVal of ["maxillary", "mandibular"] as const) {
      archAddons[archVal] = buildStoreEntries(
        pid,
        archVal,
        allAddons,
        (key) => key.startsWith(`${pid}_${archVal}_`)
      )
    }

    setProductAddOns(pid, {
      maxillary: archAddons.maxillary,
      mandibular: archAddons.mandibular,
    })

    const targetArches = visibleArches.length > 0 ? visibleArches : [arch]
    for (const archVal of targetArches) {
      onAddAddOns(
        archAddons[archVal].map(({ addon_id, qty, category, subcategory, name, price }) => ({
          addon_id,
          qty,
          category,
          subcategory,
          name,
          price,
        })),
        archVal
      )
    }

    setSelectedQtys({})
    onClose()
  }

  const handleCancel = () => {
    setSelectedQtys({})
    onClose()
  }

  // Reset pages when search changes
  useEffect(() => { setMaxPage(1) }, [debouncedMaxSearch])
  useEffect(() => { setMandPage(1) }, [debouncedMandSearch])

  // Product tabs - use provided products or fallback to single product from productId
  const productTabs = useMemo(() => {
    if (products.length > 0) return products
    const parsed = parseInt(productId, 10)
    if (!isNaN(parsed)) return [{ id: parsed, name: productId }]
    return []
  }, [products, productId])

  /** Render a single arch column */
  const renderArchColumn = (
    archVal: "maxillary" | "mandibular",
    label: string,
    search: string,
    setSearch: (v: string) => void,
    pagedAddons: { addon: ApiAddon; category: string; subcategory: string }[],
    filtered: { addon: ApiAddon; category: string; subcategory: string }[],
    page: number,
    setPage: (p: number) => void,
    totalPages: number,
    overrides?: {
      getQty?: (addonId: number) => number
      setQty?: (addonId: number, qty: number) => void
      loading?: boolean
      hideTitle?: boolean
    }
  ) => {
    const resolveQty = overrides?.getQty ?? ((addonId: number) => getQty(archVal, addonId))
    const resolveSetQty =
      overrides?.setQty ?? ((addonId: number, qty: number) => setQty(archVal, addonId, qty))
    const columnLoading = overrides?.loading ?? (isSlipMode ? slipCatalogLoading : loading)
    const SortIcon = () => (
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="shrink-0">
        <path d="M4 0L7.5 4H0.5L4 0Z" fill="#9CA3AF"/>
        <path d="M4 12L0.5 8H7.5L4 12Z" fill="#9CA3AF"/>
      </svg>
    )

    return (
      <div className="flex-1 flex flex-col min-w-0">
        {!overrides?.hideTitle ? (
          <h3 className="text-center font-bold text-[15px] mb-3">{label}</h3>
        ) : null}

        {/* Search bar */}
        <div className="relative mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search Add ons"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-3 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-600">
            <Filter size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_90px] gap-x-3 mb-1 text-[13px] font-semibold text-gray-600 border-b border-gray-300 pb-2">
          <div className="flex items-center gap-1.5">
            <SortIcon />
            Add on
          </div>
          <div className="flex items-center gap-1.5">
            <SortIcon />
            Price
          </div>
          <div className="flex items-center gap-1.5">
            <SortIcon />
            QTY
          </div>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {columnLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
          ) : pagedAddons.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No add-ons found</div>
          ) : (
            pagedAddons.map(({ addon }) => {
              const qty = resolveQty(addon.id)
              return (
                <div key={addon.id} className="grid grid-cols-[1fr_80px_90px] gap-x-3 items-center py-[10px] border-b border-gray-100 text-[13px]">
                  <div className="truncate">{addon.name}</div>
                  <div>
                    $ {Number(typeof addon.price === "string" ? parseFloat(addon.price as unknown as string) : addon.price).toFixed(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="w-[22px] h-[22px] flex items-center justify-center rounded-sm border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                      onClick={() => resolveSetQty(addon.id, qty + 1)}
                      disabled={qty >= 10}
                    >
                      <Plus size={12} strokeWidth={2} />
                    </button>
                    <span className={`text-[13px] font-medium min-w-[16px] text-center ${qty > 0 ? 'text-[#1162A8]' : 'text-gray-400'}`}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="w-[22px] h-[22px] flex items-center justify-center rounded-sm border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                      onClick={() => resolveSetQty(addon.id, qty - 1)}
                      disabled={qty === 0}
                    >
                      <Minus size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 flex-shrink-0">
          <span className="text-[11px] text-[#6B8EC2]">
            Showing {filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 cursor-pointer text-gray-400"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-[24px] h-[24px] rounded-full text-[11px] cursor-pointer ${
                  p === page
                    ? "bg-[#1162A8] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 cursor-pointer text-gray-400"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSlotColumn = (slot: RushArchSlot, slotIndex: number) => {
    const catalog = useSlipSlotColumns
      ? (slipSlotAddonsByRushKey[slot.rushKey] ?? [])
      : (slotAddonsByRushKey[slot.rushKey] ?? [])
    const search = searchBySlotKey[slot.rushKey] ?? ""
    const setSearch = (v: string) =>
      setSearchBySlotKey((prev) => ({ ...prev, [slot.rushKey]: v }))
    const page = pageBySlotKey[slot.rushKey] ?? 1
    const setPage = (p: number) =>
      setPageBySlotKey((prev) => ({ ...prev, [slot.rushKey]: p }))
    const slipProductQueryIndex = useSlipSlotColumns
      ? slipProductIds.indexOf(slot.apiProductId)
      : -1
    const slotLoading = useSlipSlotColumns
      ? slipLinkedLoading ||
        (slipProductQueryIndex >= 0
          ? (slipProductCatalogQueries[slipProductQueryIndex]?.isLoading ?? false)
          : slipCatalogLoading)
      : (slotAddonQueries[slotIndex]?.isLoading ?? false)

    const term = search.trim().toLowerCase()
    const filtered = !term
      ? catalog
      : catalog.filter(
          ({ addon }) =>
            addon.name.toLowerCase().includes(term) ||
            addon.code.toLowerCase().includes(term)
        )
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const pagedAddons = filtered.slice(
      (page - 1) * ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE
    )

    const getSlotQty = (addonId: number) => {
      const key = useSlipSlotColumns
        ? slipQtyKey(slipId!, slot.arch, addonId)
        : slotQtyKey(slot.rushKey, addonId)
      return selectedQtys[key] || 0
    }
    const setSlotQty = (addonId: number, qty: number) => {
      const key = useSlipSlotColumns
        ? slipQtyKey(slipId!, slot.arch, addonId)
        : slotQtyKey(slot.rushKey, addonId)
      setSelectedQtys((prev) => {
        if (qty <= 0) {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: qty }
      })
    }

    return (
      <div className="flex-1 flex flex-col min-w-[260px] max-w-full">
        <div className="text-center mb-3">
          <h3 className="font-bold text-[15px]">{slot.archLabel}</h3>
          <p className="text-[12px] mt-1 text-[#545F71]">{slot.productName}</p>
          {slot.toothNumbersLabel ? (
            <p className="text-[11px] mt-0.5 text-[#9BA5B7]">{slot.toothNumbersLabel}</p>
          ) : null}
        </div>

        {renderArchColumn(
          slot.arch,
          `${slot.archLabel} Add on`,
          search,
          setSearch,
          pagedAddons,
          filtered,
          page,
          setPage,
          totalPages,
          {
            getQty: getSlotQty,
            setQty: setSlotQty,
            loading: slotLoading,
            hideTitle: true,
          }
        )}

        <div className="flex gap-3 justify-center flex-wrap mt-3 pt-2 border-t border-gray-100">
          {!showBatchAddOnFooter ? (
            <Button
              variant="outline"
              className="min-w-[100px] rounded-md cursor-pointer"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5490] text-white min-w-[100px] rounded-md cursor-pointer"
            onClick={() =>
              useSlipSlotColumns ? void handleConfirmSlipAddons() : handleConfirmSlot(slot)
            }
            disabled={useSlipSlotColumns ? savingSlipAddons : false}
          >
            {useSlipSlotColumns && savingSlipAddons ? "Saving…" : "Add"}
          </Button>
        </div>
      </div>
    )
  }

  const dialogWidthClass = useSlotColumns
    ? "max-w-[min(1100px,94vw)]"
    : slipVisibleArches.length === 1
      ? "max-w-[520px]"
      : "max-w-[960px]"

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className={`${dialogWidthClass} p-0 rounded-xl shadow-2xl flex flex-col max-h-[85vh] gap-0`}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" strokeWidth={2} />
            <h2 className="text-lg font-bold">Add ons</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="cursor-pointer">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {useSlotColumns && multipleSlotsOnOneArch ? (
          <p className="text-[12px] text-[#545F71] mb-3 px-6 leading-[18px]">
            Each product has its own add-ons. Use Add on each column when you are done with that
            product.
          </p>
        ) : null}

        {useSlotColumns && archSlots.length > 1 && !multipleSlotsOnOneArch ? (
          <p className="text-[12px] text-[#545F71] mb-3 px-6 leading-[18px]">
            Each product has its own add-ons. Configure upper and lower products separately.
          </p>
        ) : null}

        {/* Product tabs (legacy only — slot mode uses one column per product) */}
        {!useSlotColumns && productTabs.length > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-shrink-0 px-6">
            <span className="text-[14px] text-gray-700 mr-1">Select product for add on:</span>
            {productTabs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveProductId(p.id)
                  setMaxPage(1)
                  setMandPage(1)
                  setMaxSearch("")
                  setMandSearch("")
                }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                  activeProductId === p.id
                    ? "bg-[#1162A8] text-white border-[#1162A8]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {useSlotColumns ? (
          <div className="flex gap-6 flex-1 min-h-0 px-6 flex-col sm:flex-row sm:flex-wrap sm:items-start overflow-y-auto">
            {archSlots.map((slot, index) => (
              <div key={slot.rushKey} className="flex flex-1 min-w-[260px] gap-6 items-stretch">
                {index > 0 ? (
                  <div
                    className="w-px bg-gray-300 flex-shrink-0 hidden sm:block self-stretch min-h-[120px]"
                    aria-hidden
                  />
                ) : null}
                {renderSlotColumn(slot, index)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-6 flex-1 min-h-0 px-6">
            {slipVisibleArches.includes("maxillary") &&
              renderArchColumn(
                "maxillary",
                isSlipMode ? "Upper Add on" : "Maxillary Add on",
                maxSearch,
                setMaxSearch,
                maxPagedAddons,
                maxFiltered,
                maxPage,
                setMaxPage,
                maxTotalPages
              )}

            {slipVisibleArches.includes("maxillary") &&
              slipVisibleArches.includes("mandibular") && (
                <div className="w-px bg-gray-300 flex-shrink-0" />
              )}

            {slipVisibleArches.includes("mandibular") &&
              renderArchColumn(
                "mandibular",
                isSlipMode ? "Lower Add on" : "Mandibular Add on",
                mandSearch,
                setMandSearch,
                mandPagedAddons,
                mandFiltered,
                mandPage,
                setMandPage,
                mandTotalPages
              )}
          </div>
        )}

        {showBatchAddOnFooter ? (
          <div className="flex flex-col items-center gap-3 py-5 px-6 border-t border-gray-200 mt-4">
            <p className="text-center text-[11px] text-[#9BA5B7] max-w-[520px]">
              Use Add on each product when its quantities are set. You do not need to configure
              add-ons for every product.
            </p>
            <Button
              variant="outline"
              className="min-w-[120px] rounded-md cursor-pointer"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        ) : !useSlotColumns ? (
          <div className="flex justify-center gap-4 py-5 flex-shrink-0 border-t border-gray-200 mt-4 px-6">
            <Button
              variant="outline"
              className="min-w-[120px] rounded-md cursor-pointer"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#0f5490] text-white min-w-[120px] rounded-md cursor-pointer"
              onClick={handleConfirm}
              disabled={savingSlipAddons}
            >
              {savingSlipAddons ? "Saving…" : "Add"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
