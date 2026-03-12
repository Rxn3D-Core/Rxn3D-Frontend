"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { X, Search, Plus, Minus, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { useCaseDesignStore } from "@/stores/caseDesignStore"

/** A product available in the case for add-on selection */
export interface AddOnsProduct {
  id: number
  name: string
}

interface AddOnsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddAddOns: (addOns: { addon_id: number; qty: number; category: string; subcategory: string; name: string; price: number }[], arch: "maxillary" | "mandibular") => void
  labId: number
  productId: string
  arch: "maxillary" | "mandibular"
  /** All products available in the case — shown as tabs */
  products?: AddOnsProduct[]
  /** Which arch columns to display. Defaults to both. */
  visibleArches?: ("maxillary" | "mandibular")[]
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

export default function AddOnsModal({ isOpen, onClose, onAddAddOns, labId, productId, arch, products = [], visibleArches = ["maxillary", "mandibular"] }: AddOnsModalProps) {
  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  const [maxSearch, setMaxSearch] = useState("")
  const [mandSearch, setMandSearch] = useState("")
  const [maxPage, setMaxPage] = useState(1)
  const [mandPage, setMandPage] = useState(1)
  // Key: `${productId}_${arch}_${addonId}`, Value: qty
  const [selectedQtys, setSelectedQtys] = useState<Record<string, number>>({})

  const { token } = useAuth()

  const {
    removeAddOn,
    setProductAddOns,
    productAddOns: storeProductAddOns
  } = useCaseDesignStore()

  // Reset state when modal opens — pre-populate quantities from store
  useEffect(() => {
    if (isOpen) {
      setMaxSearch("")
      setMandSearch("")
      setMaxPage(1)
      setMandPage(1)
      // Set active product: prefer matching productId, fallback to first product
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
        // Pre-populate selectedQtys from store so existing add-ons show their quantities
        const existing = storeProductAddOns[pid.toString()] || { maxillary: [], mandibular: [] }
        const restored: Record<string, number> = {}
        for (const archVal of ["maxillary", "mandibular"] as const) {
          for (const a of (existing[archVal] || [])) {
            const addonId = (a as Record<string, unknown>).addon_id as number
            const qty = ((a as Record<string, unknown>).qty as number) || ((a as Record<string, unknown>).quantity as number) || 1
            if (addonId && qty > 0) {
              restored[`${pid}_${archVal}_${addonId}`] = qty
            }
          }
        }
        setSelectedQtys(restored)
      } else {
        setSelectedQtys({})
      }
    }
  }, [isOpen, productId, products, storeProductAddOns])

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

  // Fetch addons for the active product
  const fetchAddons = useCallback(async () => {
    if (!activeProductId || !effectiveLabId) return []

    const url = new URL(`/v1/slip/lab/${effectiveLabId}/products/${activeProductId}/addons`, process.env.NEXT_PUBLIC_API_BASE_URL)

    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (res.status === 401) {
      window.location.href = "/login"
      return []
    }

    const json = await res.json()
    return json.data || []
  }, [activeProductId, effectiveLabId, token])

  const { data: addOnCategories = [], isLoading: loading } = useQuery<ApiCategory[]>({
    queryKey: ['product-addons', activeProductId, effectiveLabId],
    queryFn: fetchAddons,
    enabled: isOpen && !!activeProductId && !!effectiveLabId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Flatten all addons from categories for the table view
  const allAddons = useMemo(() => {
    const flat: { addon: ApiAddon; category: string; subcategory: string }[] = []
    for (const cat of addOnCategories) {
      for (const subcat of cat.subcategories) {
        for (const addon of subcat.addons) {
          flat.push({ addon, category: cat.name, subcategory: subcat.name })
        }
      }
    }
    return flat
  }, [addOnCategories])

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

  const maxFiltered = useMemo(() => getFilteredAddons(debouncedMaxSearch), [getFilteredAddons, debouncedMaxSearch])
  const mandFiltered = useMemo(() => getFilteredAddons(debouncedMandSearch), [getFilteredAddons, debouncedMandSearch])

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

  const getQty = (archVal: string, addonId: number) => selectedQtys[qtyKey(archVal, addonId)] || 0

  const setQty = (archVal: string, addonId: number, qty: number) => {
    const key = qtyKey(archVal, addonId)
    setSelectedQtys(prev => {
      if (qty <= 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: qty }
    })
  }

  const handleConfirm = () => {
    if (!activeProductId) return
    const pid = activeProductId.toString()

    // Build the full add-ons list per arch from selectedQtys (includes existing + new)
    const archAddons: Record<string, { addon_id: number; qty: number; quantity: number; category: string; subcategory: string; name: string; addOn: string; label: string; price: number }[]> = {
      maxillary: [],
      mandibular: [],
    }

    for (const [key, qty] of Object.entries(selectedQtys)) {
      if (qty <= 0) continue
      const [keyPid, keyArch, keyAddonId] = key.split("_")
      if (keyPid !== pid) continue
      const addonId = parseInt(keyAddonId, 10)
      // Find addon info from flattened list
      const found = allAddons.find(a => a.addon.id === addonId)
      if (!found) continue
      const price = Number(typeof found.addon.price === "string" ? parseFloat(found.addon.price as unknown as string) : found.addon.price)
      const entry = {
        addon_id: addonId,
        qty,
        quantity: qty,
        category: found.category,
        subcategory: found.subcategory,
        name: found.addon.name,
        addOn: found.addon.name,
        label: found.addon.name,
        price,
      }
      if (keyArch === "maxillary") archAddons.maxillary.push(entry)
      if (keyArch === "mandibular") archAddons.mandibular.push(entry)
    }

    // Save to store — selectedQtys already contains existing + modified quantities
    setProductAddOns(pid, {
      maxillary: archAddons.maxillary,
      mandibular: archAddons.mandibular,
    })

    // Callback with all current add-ons
    const allForCallback = [...archAddons.maxillary, ...archAddons.mandibular]
    if (allForCallback.length > 0) {
      onAddAddOns(allForCallback, arch)
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
    totalPages: number
  ) => {
    const SortIcon = () => (
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="shrink-0">
        <path d="M4 0L7.5 4H0.5L4 0Z" fill="#9CA3AF"/>
        <path d="M4 12L0.5 8H7.5L4 12Z" fill="#9CA3AF"/>
      </svg>
    )

    return (
      <div className="flex-1 flex flex-col min-w-0">
        {/* Column header */}
        <h3 className="text-center font-bold text-[15px] mb-3">{label}</h3>

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
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
          ) : pagedAddons.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No add-ons found</div>
          ) : (
            pagedAddons.map(({ addon }) => {
              const qty = getQty(archVal, addon.id)
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
                      onClick={() => setQty(archVal, addon.id, qty + 1)}
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
                      onClick={() => setQty(archVal, addon.id, qty - 1)}
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${visibleArches.length === 1 ? "max-w-[520px]" : "max-w-[960px]"} p-0 rounded-xl shadow-2xl flex flex-col max-h-[85vh] gap-0`}>
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

        {/* Product tabs */}
        {productTabs.length > 1 && (
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

        {/* Arch columns layout: show one or both based on visibleArches */}
        <div className="flex gap-6 flex-1 min-h-0 px-6">
          {visibleArches.includes("maxillary") && renderArchColumn(
            "maxillary",
            "Maxillary Add on",
            maxSearch,
            setMaxSearch,
            maxPagedAddons,
            maxFiltered,
            maxPage,
            setMaxPage,
            maxTotalPages
          )}

          {/* Vertical divider — only when both columns are visible */}
          {visibleArches.includes("maxillary") && visibleArches.includes("mandibular") && (
            <div className="w-px bg-gray-300 flex-shrink-0" />
          )}

          {visibleArches.includes("mandibular") && renderArchColumn(
            "mandibular",
            "Mandibular Add on",
            mandSearch,
            setMandSearch,
            mandPagedAddons,
            mandFiltered,
            mandPage,
            setMandPage,
            mandTotalPages
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-center gap-4 py-5 flex-shrink-0 border-t border-gray-200 mt-4 px-6">
          <Button variant="outline" className="min-w-[120px] rounded-md cursor-pointer" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white min-w-[120px] rounded-md cursor-pointer" onClick={handleConfirm}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
