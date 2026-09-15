"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  X,
  Search,
  Loader2,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Pencil,
  Maximize2,
  Minimize2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/lib/performance-utils"
import { useToast } from "@/hooks/use-toast"
import {
  useImplants,
  useImplant,
  useLinkImplantProducts,
  type Implant,
} from "@/lib/api/advance-mode-query"
import {
  getImplantLinkCustomerIdParam,
  useBrowseImplantLinkByImplant,
  useBrowseImplantLinkByProduct,
  useImplantLinkByProduct,
  useImplantBulkLink,
  fetchLibraryProductDetailForImplantLinks,
  parseLinkedImplantsFromProductPayload,
  parseLinkedProductIdsFromImplantPayload,
  parseLinkedProductsMapFromImplantPayload,
  formatImplantDisplayName,
} from "@/lib/api/implant-link-query"

type MainTab = "browse" | "linkByProduct" | "linkByImplant" | "bulk"

export interface LinkImplantModalProps {
  isOpen: boolean
  onClose: () => void
  context?: "global" | "lab"
  implantId?: number | null
}

type CatalogProductRow = {
  id: number
  name: string
  categoryLabel: string
  subcategoryName: string
  categoryKey: string
  subcategoryKey: string
}

const getAuthToken = () =>
  typeof window === "undefined" ? "" : localStorage.getItem("token") || ""

async function fetchLibraryProductsPage(opts: {
  page: number
  per_page: number
}): Promise<{ rows: CatalogProductRow[]; pagination: { last_page: number; total: number } }> {
  const token = getAuthToken()
  if (!token) throw new Error("Authentication token not found")

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products`)
  url.searchParams.append("per_page", String(opts.per_page))
  url.searchParams.append("page", String(opts.page))
  url.searchParams.append("order_by", "name")
  url.searchParams.append("sort_by", "asc")

  if (role === "superadmin") {
    const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
    if (customerId) url.searchParams.append("customer_id", customerId)
  } else if (role === "office_admin" || role === "doctor") {
    const labId = typeof window !== "undefined" ? localStorage.getItem("selectedLabId") : null
    if (labId) url.searchParams.append("customer_id", labId)
    else throw new Error("Lab ID not found")
  } else {
    const labId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
    if (labId) url.searchParams.append("customer_id", labId)
    else throw new Error("Customer ID not found")
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }
  if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`)
  const json = await response.json()
  const productsData = json.data?.data || json.data || []
  const pagination = json.data?.pagination || json.pagination || {
    last_page: 1,
    total: productsData.length,
  }

  const rows: CatalogProductRow[] = productsData.map((item: any) => {
    const subName = item.subcategory?.name || item.subcategory_name || ""
    const catName =
      item.subcategory?.category?.name || item.category_name || item.category?.name || "Uncategorized"
    return {
      id: item.id,
      name: item.name,
      categoryLabel: catName,
      subcategoryName: subName || catName,
      categoryKey: String(catName),
      subcategoryKey: `${catName}::${subName}`,
    }
  })

  return { rows, pagination: { last_page: pagination.last_page || 1, total: pagination.total || 0 } }
}

function bodyCustomer(context: "global" | "lab"): { customer_id?: number } {
  const id = getImplantLinkCustomerIdParam(context)
  return id != null ? { customer_id: id } : {}
}

function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (currentPage <= 3) return [1, 2, 3, 4, 5]
  if (currentPage >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
}

export function LinkImplantModal({
  isOpen,
  onClose,
  context = "global",
  implantId: implantIdProp,
}: LinkImplantModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const linkCustomerId = getImplantLinkCustomerIdParam(context)

  const [mainTab, setMainTab] = useState<MainTab>("browse")
  const [browseSub, setBrowseSub] = useState<"implant" | "product">("implant")
  const [browsePage, setBrowsePage] = useState(1)
  const [browsePerPage, setBrowsePerPage] = useState(10)
  const [linkModalExpanded, setLinkModalExpanded] = useState(false)
  const [browseQ, setBrowseQ] = useState("")
  const debouncedBrowseQ = useDebounce(browseQ, 350)
  const [browseOrderBy, setBrowseOrderBy] = useState("brand_name")
  const [browseSort, setBrowseSort] = useState<"asc" | "desc">("asc")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const browseParams = useMemo(
    () => ({
      q: debouncedBrowseQ.trim() || undefined,
      page: browsePage,
      per_page: browsePerPage,
      order_by: browseOrderBy,
      sort_by: browseSort,
    }),
    [debouncedBrowseQ, browsePage, browsePerPage, browseOrderBy, browseSort],
  )

  const browseImplantQuery = useBrowseImplantLinkByImplant(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "implant",
  })
  const browseProductQuery = useBrowseImplantLinkByProduct(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "product",
  })

  const linkByProductMutation = useImplantLinkByProduct()
  const bulkLinkMutation = useImplantBulkLink()
  const linkImplantProductsMutation = useLinkImplantProducts()

  const { data: implantsBundle } = useImplants({
    per_page: 100,
    status: "Active",
    order_by: "brand_name",
    sort_by: "asc",
    ...(linkCustomerId != null ? { customer_id: linkCustomerId } : {}),
  })
  const implantCatalog: Implant[] = implantsBundle?.data ?? []

  const [liImplantId, setLiImplantId] = useState<number | null>(null)
  const [liJump, setLiJump] = useState("")
  const [liProductPage, setLiProductPage] = useState(1)
  const [liProductQ, setLiProductQ] = useState("")
  const debouncedLiProductQ = useDebounce(liProductQ, 300)
  const [liPendingProductAdds, setLiPendingProductAdds] = useState<number[]>([])
  const [liPendingProductRemoves, setLiPendingProductRemoves] = useState<number[]>([])

  const { data: singleImplantRes } = useImplant(
    liImplantId && liImplantId > 0 ? liImplantId : 0,
    linkCustomerId ?? undefined,
  )
  const selectedImplant = singleImplantRes?.data ?? null

  const liJumpLower = liJump.trim().toLowerCase()
  const implantChoices = liJumpLower
    ? implantCatalog.filter((imp) => {
        const label = formatImplantDisplayName(imp).toLowerCase()
        return (
          label.includes(liJumpLower) ||
          (imp.code || "").toLowerCase().includes(liJumpLower) ||
          (imp.brand_name || "").toLowerCase().includes(liJumpLower) ||
          (imp.system_name || "").toLowerCase().includes(liJumpLower)
        )
      })
    : implantCatalog

  const liBaselineProductIds = useMemo(
    () => parseLinkedProductIdsFromImplantPayload(selectedImplant as Record<string, unknown> | null),
    [selectedImplant],
  )
  const liLinkedProductsById = useMemo(
    () => parseLinkedProductsMapFromImplantPayload(selectedImplant as Record<string, unknown> | null),
    [selectedImplant],
  )

  const liProductsQuery = useQuery({
    queryKey: ["linkImplantModalProducts", context, liProductPage, debouncedLiProductQ],
    enabled: isOpen && mainTab === "linkByImplant" && !!liImplantId,
    queryFn: () => fetchLibraryProductsPage({ page: liProductPage, per_page: 10 }),
  })
  const liCatalogRows = liProductsQuery.data?.rows ?? []
  const liCatalogFiltered = debouncedLiProductQ.trim()
    ? liCatalogRows.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedLiProductQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedLiProductQ.toLowerCase()),
      )
    : liCatalogRows

  const liMergedLinkedIds = useMemo(() => {
    const removes = new Set(liPendingProductRemoves)
    const base = liBaselineProductIds.filter((id) => !removes.has(id))
    const adds = liPendingProductAdds.filter((id) => !base.includes(id))
    return Array.from(new Set([...base, ...adds]))
  }, [liBaselineProductIds, liPendingProductAdds, liPendingProductRemoves])

  const liCatalogIdToRow = useMemo(() => new Map(liCatalogRows.map((r) => [r.id, r])), [liCatalogRows])

  const [lpCategoryKey, setLpCategoryKey] = useState("")
  const [lpSubKey, setLpSubKey] = useState("")
  const [lpProductId, setLpProductId] = useState<number | null>(null)
  const [lpJump, setLpJump] = useState("")
  const [lpImplantQ, setLpImplantQ] = useState("")
  const debouncedLpImplantQ = useDebounce(lpImplantQ, 300)
  const [lpPendingImplantAdds, setLpPendingImplantAdds] = useState<number[]>([])
  const [lpPendingImplantRemoves, setLpPendingImplantRemoves] = useState<number[]>([])

  const lpProductsAllQuery = useQuery({
    queryKey: ["linkImplantModalProductsCatalogGrouped", context],
    enabled: isOpen && mainTab === "linkByProduct",
    staleTime: 60_000,
    queryFn: async () => {
      const aggregated: CatalogProductRow[] = []
      let page = 1
      let last = 1
      do {
        const chunk = await fetchLibraryProductsPage({ page, per_page: 100 })
        aggregated.push(...chunk.rows)
        last = chunk.pagination.last_page
        page += 1
      } while (page <= Math.min(last, 5))
      return aggregated
    },
  })

  const lpProductRows = lpProductsAllQuery.data ?? []
  const categoryKeys = useMemo(
    () => Array.from(new Set(lpProductRows.map((r) => r.categoryKey))).sort(),
    [lpProductRows],
  )
  const subKeysForCategory = useMemo(() => {
    if (!lpCategoryKey) return [] as string[]
    return Array.from(
      new Set(lpProductRows.filter((r) => r.categoryKey === lpCategoryKey).map((r) => r.subcategoryKey)),
    ).sort()
  }, [lpProductRows, lpCategoryKey])

  const productChoices = useMemo(() => {
    if (!lpCategoryKey || !lpSubKey) return [] as CatalogProductRow[]
    return lpProductRows
      .filter((r) => r.categoryKey === lpCategoryKey && r.subcategoryKey === lpSubKey)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [lpProductRows, lpCategoryKey, lpSubKey])

  const lpProductDetailQuery = useQuery({
    queryKey: ["libraryProductImplantLinkDetail", lpProductId, context],
    enabled: isOpen && mainTab === "linkByProduct" && !!lpProductId,
    queryFn: () => fetchLibraryProductDetailForImplantLinks(lpProductId!, context),
  })

  const lpLinkedImplants = parseLinkedImplantsFromProductPayload(lpProductDetailQuery.data ?? null)
  const lpBaselineImplantIds = useMemo(
    () => lpLinkedImplants.map((r) => r.id),
    [lpLinkedImplants],
  )
  const lpMergedImplantIds = useMemo(() => {
    const removes = new Set(lpPendingImplantRemoves)
    const base = lpBaselineImplantIds.filter((id) => !removes.has(id))
    const adds = lpPendingImplantAdds.filter((id) => !base.includes(id))
    return Array.from(new Set([...base, ...adds]))
  }, [lpBaselineImplantIds, lpPendingImplantAdds, lpPendingImplantRemoves])

  const lpJumpLower = lpJump.trim().toLowerCase()
  const lpImplantSearch = debouncedLpImplantQ.trim().toLowerCase()
  const lpAvailableImplants = implantCatalog.filter((imp) => {
    const label = formatImplantDisplayName(imp).toLowerCase()
    const hay = `${label} ${(imp.code || "").toLowerCase()}`
    if (lpJumpLower && !hay.includes(lpJumpLower)) return false
    if (lpImplantSearch && !hay.includes(lpImplantSearch)) return false
    return true
  })

  const [bulkImplantSelection, setBulkImplantSelection] = useState<number[]>([])
  const [bulkProductSelection, setBulkProductSelection] = useState<number[]>([])
  const [bulkImplantPage, setBulkImplantPage] = useState(1)
  const [bulkProductPage, setBulkProductPage] = useState(1)
  const [bulkImplantQ, setBulkImplantQ] = useState("")
  const [bulkProductQ, setBulkProductQ] = useState("")
  const debouncedBulkImplantQ = useDebounce(bulkImplantQ, 300)
  const debouncedBulkProductQ = useDebounce(bulkProductQ, 300)

  const bulkImplantsQuery = useImplants({
    page: bulkImplantPage,
    per_page: 10,
    q: debouncedBulkImplantQ.trim() || undefined,
    order_by: "brand_name",
    sort_by: "asc",
    ...(linkCustomerId != null ? { customer_id: linkCustomerId } : {}),
  })

  const bulkProductsQuery = useQuery({
    queryKey: ["linkImplantBulkProducts", context, bulkProductPage, debouncedBulkProductQ],
    enabled: isOpen && mainTab === "bulk",
    queryFn: () => fetchLibraryProductsPage({ page: bulkProductPage, per_page: 10 }),
  })

  const bulkImplantsRows = bulkImplantsQuery.data?.data ?? []
  const bulkProductRowsRaw = bulkProductsQuery.data?.rows ?? []
  const bulkProductRowsFiltered = debouncedBulkProductQ.trim()
    ? bulkProductRowsRaw.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedBulkProductQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedBulkProductQ.toLowerCase()),
      )
    : bulkProductRowsRaw
  const bulkImplantTotal = bulkImplantsQuery.data?.total ?? 0
  const bulkImplantPerPage = bulkImplantsQuery.data?.per_page ?? 10
  const bulkImplantTotalPages = Math.max(1, bulkImplantsQuery.data?.last_page ?? 1)
  const bulkProductTotal = bulkProductsQuery.data?.pagination.total ?? 0
  const bulkProductPerPage = 10
  const bulkProductTotalPages = Math.max(1, bulkProductsQuery.data?.pagination.last_page ?? 1)

  useEffect(() => {
    if (!isOpen) return
    if (implantIdProp) {
      setMainTab("linkByImplant")
      setLiImplantId(implantIdProp)
    } else {
      setMainTab("browse")
    }
  }, [isOpen, implantIdProp])

  useEffect(() => {
    if (!isOpen) {
      setBrowsePage(1)
      setBrowseQ("")
      setLiPendingProductAdds([])
      setLiPendingProductRemoves([])
      setLpPendingImplantAdds([])
      setLpPendingImplantRemoves([])
      setBulkImplantSelection([])
      setBulkProductSelection([])
      setLiImplantId(null)
      setLpProductId(null)
      setLpCategoryKey("")
      setLpSubKey("")
    }
  }, [isOpen])

  useEffect(() => {
    setBrowsePage(1)
  }, [debouncedBrowseQ, browseSub, mainTab])

  useEffect(() => {
    setLiProductPage(1)
  }, [debouncedLiProductQ])

  useEffect(() => {
    const p = lpProductDetailQuery.data
    if (!p || mainTab !== "linkByProduct" || !lpProductId) return
    const sub = p.subcategory as { name?: string; category?: { name?: string } } | undefined
    const catName = sub?.category?.name || "Uncategorized"
    const subName = sub?.name || catName
    setLpCategoryKey(catName)
    setLpSubKey(`${catName}::${subName}`)
  }, [lpProductDetailQuery.data, lpProductId, mainTab])

  const toggleBrowseSort = (col: string) => {
    if (browseOrderBy === col) setBrowseSort((s) => (s === "asc" ? "desc" : "asc"))
    else {
      setBrowseOrderBy(col)
      setBrowseSort("asc")
    }
    setBrowsePage(1)
  }

  const handleApplyLinkByImplant = async () => {
    if (!liImplantId) {
      toast({ title: "Select an implant", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const sortedBaseline = [...liBaselineProductIds].sort((a, b) => a - b)
      const sortedMerged = [...liMergedLinkedIds].sort((a, b) => a - b)
      const same =
        sortedBaseline.length === sortedMerged.length &&
        sortedBaseline.every((id, i) => id === sortedMerged[i])

      if (same) {
        toast({ title: "No changes to apply" })
        setIsSubmitting(false)
        return
      }

      await linkImplantProductsMutation.mutateAsync({
        id: liImplantId,
        product_ids: liMergedLinkedIds,
      })
      toast({ title: "Links updated" })
      setLiPendingProductAdds([])
      setLiPendingProductRemoves([])
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplyLinkByProduct = async () => {
    if (!lpProductId) {
      toast({ title: "Select a product", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const customer = bodyCustomer(context)
      const sortedBaseline = [...lpBaselineImplantIds].sort((a, b) => a - b)
      const sortedMerged = [...lpMergedImplantIds].sort((a, b) => a - b)
      const same =
        sortedBaseline.length === sortedMerged.length &&
        sortedBaseline.every((id, i) => id === sortedMerged[i])

      if (same) {
        toast({ title: "No changes to apply" })
        setIsSubmitting(false)
        return
      }

      const baseline = new Set(lpBaselineImplantIds)
      const merged = new Set(lpMergedImplantIds)
      const toAdd = [...merged].filter((id) => !baseline.has(id))
      const toRemove = [...baseline].filter((id) => !merged.has(id))

      if (toAdd.length) {
        await linkByProductMutation.mutateAsync({
          product_id: lpProductId,
          implant_ids: toAdd,
          ...customer,
        })
      }

      for (const implantId of toRemove) {
        const implantRes = await queryClient.fetchQuery({
          queryKey: ["implant", implantId, linkCustomerId ?? undefined],
          queryFn: async () => {
            const r = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/implants/${implantId}`,
              {
                headers: {
                  Authorization: `Bearer ${getAuthToken()}`,
                  "Content-Type": "application/json",
                },
              },
            )
            const j = await r.json()
            return j.data ? j : { data: j }
          },
        })
        const implant = (implantRes as { data?: Implant }).data
        const linked = parseLinkedProductIdsFromImplantPayload(
          (implant as unknown as Record<string, unknown>) ?? null,
        )
        const next = linked.filter((pid) => pid !== lpProductId)
        await linkImplantProductsMutation.mutateAsync({
          id: implantId,
          product_ids: next,
        })
      }

      toast({ title: "Links updated" })
      setLpPendingImplantAdds([])
      setLpPendingImplantRemoves([])
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkApply = async () => {
    if (!bulkImplantSelection.length || !bulkProductSelection.length) {
      toast({ title: "Select implants and products", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      await bulkLinkMutation.mutateAsync({
        implant_ids: bulkImplantSelection,
        product_ids: bulkProductSelection,
        ...bodyCustomer(context),
      })
      toast({ title: "Bulk links created successfully" })
      setBulkImplantSelection([])
      setBulkProductSelection([])
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrimaryFooter = async () => {
    if (mainTab === "browse") {
      onClose()
      return
    }
    if (mainTab === "linkByImplant") {
      await handleApplyLinkByImplant()
      return
    }
    if (mainTab === "linkByProduct") {
      await handleApplyLinkByProduct()
      return
    }
    await handleBulkApply()
  }

  const openLinkImplantFromBrowse = (id: number) => {
    setLiImplantId(id)
    setMainTab("linkByImplant")
    setLiPendingProductAdds([])
    setLiPendingProductRemoves([])
  }

  const openLinkProductFromBrowse = (id: number) => {
    setLpProductId(id)
    setLpCategoryKey("")
    setLpSubKey("")
    setMainTab("linkByProduct")
    setLpPendingImplantAdds([])
    setLpPendingImplantRemoves([])
  }

  const browseRowsImplant = browseImplantQuery.data?.rows ?? []
  const browseRowsProduct = browseProductQuery.data?.rows ?? []
  const browsePagination =
    browseSub === "implant"
      ? browseImplantQuery.data?.pagination
      : browseProductQuery.data?.pagination
  const browseTotalPages = Math.max(1, browsePagination?.last_page ?? 1)
  const browseTotalEntries = browsePagination?.total ?? 0
  const browseLoading =
    browseSub === "implant" ? browseImplantQuery.isLoading : browseProductQuery.isLoading
  const browseHasPages = browseTotalEntries > 0
  const browseRowCount =
    browseSub === "implant" ? browseRowsImplant.length : browseRowsProduct.length
  const browseEmptyLoaded = !browseLoading && browseRowCount === 0
  const bulkMaxPairs = bulkImplantSelection.length * bulkProductSelection.length

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setLinkModalExpanded(false)
          onClose()
        }
      }}
    >
      <DialogContent
        className={cn(
          "flex w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg",
          linkModalExpanded
            ? "fixed left-3 top-3 h-[calc(100dvh-24px)] max-h-none w-[calc(100vw-24px)] max-w-none translate-x-0 translate-y-0"
            : "h-[90vh] max-h-[90vh] translate-x-[-50%] translate-y-[-50%]",
        )}
      >
        <DialogHeader className="flex-shrink-0 space-y-0 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 pr-8 sm:pr-10">
            <DialogTitle className="text-lg font-semibold">Link Implant</DialogTitle>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setLinkModalExpanded((e) => !e)}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label={linkModalExpanded ? "Exit full screen" : "Expand dialog"}
              >
                {linkModalExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as MainTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-shrink-0 border-b px-4 pt-2 sm:px-6">
            <TabsList className="h-9 w-full justify-start gap-4 rounded-none bg-transparent p-0">
              {(
                [
                  ["browse", "Browse Linked"],
                  ["linkByProduct", "Link by Product"],
                  ["linkByImplant", "Link by Implant"],
                  ["bulk", "Bulk Link"],
                ] as const
              ).map(([id, label]) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="rounded-none border-b-2 border-transparent px-1 pb-2 text-sm data-[state=active]:border-[#1162a8] data-[state=active]:bg-transparent"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent
            value="browse"
            className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none ring-offset-0 focus-visible:ring-0 data-[state=inactive]:hidden"
          >
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
              <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <div className="flex rounded-full border border-gray-200/90 bg-gray-100/90 p-0.5">
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        browseSub === "implant"
                          ? "bg-white text-[#1162a8] shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                      onClick={() => {
                        setBrowseSub("implant")
                        setBrowseOrderBy("brand_name")
                        setBrowsePage(1)
                      }}
                    >
                      Browse by Implant
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        browseSub === "product"
                          ? "bg-white text-[#1162a8] shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                      onClick={() => {
                        setBrowseSub("product")
                        setBrowseOrderBy("name")
                        setBrowsePage(1)
                      }}
                    >
                      Browse by Product
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-sm text-gray-700">Show</span>
                    <Select
                      value={String(browsePerPage)}
                      onValueChange={(v) => {
                        setBrowsePerPage(Number(v))
                        setBrowsePage(1)
                      }}
                    >
                      <SelectTrigger className="h-9 w-[4.25rem] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {([10, 25, 50, 100] as const).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-700">entries</span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 sm:basis-auto sm:flex-initial">
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Filter"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                  <div className="relative min-w-0 flex-1 sm:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-9 min-w-0 pl-9 text-sm"
                      placeholder={browseSub === "implant" ? "Search Implant" : "Search Product"}
                      value={browseQ}
                      onChange={(e) => setBrowseQ(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="min-h-0 min-w-0 overflow-auto px-4 py-3 sm:px-6">
                {browseLoading ? (
                  <div className="flex min-h-[12rem] items-center justify-center">
                    <Loader2 className="h-9 w-9 animate-spin text-[#1162a8]" />
                  </div>
                ) : browseEmptyLoaded ? (
                  <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 text-center text-sm text-gray-500">
                    {browseSub === "implant"
                      ? "No implants match your filters."
                      : "No products match your filters."}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200">
                    <Table className="w-full table-fixed text-sm [&_tbody_tr:last-child_td]:border-b-0">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 bg-gray-50/95 hover:bg-gray-50/95 [&>th]:border-b-0">
                          {browseSub === "implant" ? (
                            <>
                              <TableHead
                                className="sticky top-0 z-[1] w-[32%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("brand_name")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Implant <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </span>
                              </TableHead>
                              <TableHead
                                className="sticky top-0 z-[1] w-[22%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("code")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Code <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </span>
                              </TableHead>
                              <TableHead className="sticky top-0 z-[1] min-w-0 bg-gray-50/95 py-3 text-xs font-semibold">
                                Linked products
                              </TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead
                                className="sticky top-0 z-[1] w-[26%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("name")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Product name <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </span>
                              </TableHead>
                              <TableHead
                                className="sticky top-0 z-[1] w-[22%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("subcategory_name")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Sub category <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </span>
                              </TableHead>
                              <TableHead className="sticky top-0 z-[1] min-w-0 bg-gray-50/95 py-3 text-xs font-semibold">
                                Linked implants
                              </TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {browseSub === "implant"
                          ? browseRowsImplant.map((row) => (
                              <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                <TableCell className="min-w-0 break-words font-medium leading-snug">
                                  {formatImplantDisplayName(row)}
                                </TableCell>
                                <TableCell className="min-w-0 break-words leading-snug text-gray-600">
                                  {row.code || "—"}
                                </TableCell>
                                <TableCell className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-start gap-1">
                                    {(row.linked_products_preview ?? []).map((p) => (
                                      <Badge
                                        key={p.id}
                                        variant="secondary"
                                        className="max-w-[10rem] shrink truncate rounded-md text-[10px] font-normal"
                                        title={p.name}
                                      >
                                        {p.name}
                                      </Badge>
                                    ))}
                                    {(row.linked_products_more_count ?? 0) > 0 ? (
                                      <Badge variant="outline" className="shrink-0 text-[10px]">
                                        +{row.linked_products_more_count} more
                                      </Badge>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="shrink-0 text-[#1162a8] hover:opacity-80"
                                      onClick={() => openLinkImplantFromBrowse(row.id)}
                                      aria-label="Add links for implant"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          : browseRowsProduct.map((row) => (
                              <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                <TableCell className="min-w-0 break-words font-medium leading-snug">
                                  {row.name}
                                </TableCell>
                                <TableCell className="min-w-0 break-words leading-snug text-gray-600">
                                  {row.subcategory_name}
                                </TableCell>
                                <TableCell className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-start gap-1">
                                    {(row.linked_implants_preview ?? []).map((imp) => (
                                      <Badge
                                        key={imp.id}
                                        variant="secondary"
                                        className="max-w-[10rem] shrink truncate rounded-md text-[10px] font-normal"
                                        title={imp.name}
                                      >
                                        {imp.name}
                                      </Badge>
                                    ))}
                                    {(row.linked_implants_more_count ?? 0) > 0 ? (
                                      <Badge variant="outline" className="shrink-0 text-[10px]">
                                        +{row.linked_implants_more_count} more
                                      </Badge>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="shrink-0 text-[#1162a8] hover:opacity-80"
                                      onClick={() => openLinkProductFromBrowse(row.id)}
                                      aria-label="Add links for product"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {!browseLoading ? (
                <div className="flex flex-shrink-0 flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
                  <div className="text-sm text-gray-600">
                    Showing{" "}
                    {browseTotalEntries === 0 ? 0 : (browsePage - 1) * browsePerPage + 1} to{" "}
                    {Math.min(browsePage * browsePerPage, browseTotalEntries)} of {browseTotalEntries}{" "}
                    entries
                  </div>
                  {browseHasPages ? (
                    <div className="flex items-center justify-center gap-0.5 sm:justify-end">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
                        disabled={browsePage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {Array.from({ length: Math.min(browseTotalPages, 5) }, (_, i) => {
                        let pageNum: number
                        if (browseTotalPages <= 5) pageNum = i + 1
                        else if (browsePage <= 3) pageNum = i + 1
                        else if (browsePage >= browseTotalPages - 2) pageNum = browseTotalPages - 4 + i
                        else pageNum = browsePage - 2 + i
                        return (
                          <button
                            type="button"
                            key={`browse-page-${i}-${pageNum}`}
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
                              browsePage === pageNum
                                ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                            )}
                            onClick={() => setBrowsePage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setBrowsePage((p) => Math.min(browseTotalPages, p + 1))}
                        disabled={browsePage === browseTotalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div />
              )}
            </div>
          </TabsContent>

          <TabsContent value="linkByImplant" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
              <Select
                value={liImplantId ? String(liImplantId) : ""}
                onValueChange={(v) => {
                  const n = Number(v)
                  setLiImplantId(Number.isFinite(n) ? n : null)
                  setLiPendingProductAdds([])
                  setLiPendingProductRemoves([])
                }}
              >
                <SelectTrigger className="h-9 w-[280px] text-xs">
                  <SelectValue placeholder="Select implant" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {implantChoices.map((imp) => (
                    <SelectItem key={imp.id} value={String(imp.id)} className="text-xs">
                      {formatImplantDisplayName(imp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-600">
                {liImplantId ? `${liMergedLinkedIds.length} product(s) linked` : "Select an implant"}
              </span>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Jump to implant…"
                  value={liJump}
                  onChange={(e) => setLiJump(e.target.value)}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 border-t">
              <div className="flex min-h-0 w-1/2 flex-col border-r">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Available products</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search products"
                      value={liProductQ}
                      onChange={(e) => setLiProductQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="p-1 text-gray-400" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {!liImplantId ? (
                    <p className="p-4 text-xs text-gray-500">Pick an implant first.</p>
                  ) : liProductsQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-[#1162a8]" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Product name</TableHead>
                          <TableHead className="text-xs">Sub category</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liCatalogFiltered.map((row) => {
                          const onLinked = liMergedLinkedIds.includes(row.id)
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="text-xs font-medium">{row.name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{row.subcategoryName}</TableCell>
                              <TableCell>
                                {!onLinked ? (
                                  <button
                                    type="button"
                                    className="text-[#1162a8]"
                                    onClick={() =>
                                      setLiPendingProductAdds((prev) =>
                                        prev.includes(row.id) ? prev : [...prev, row.id],
                                      )
                                    }
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div className="flex justify-between border-t px-3 py-2 text-[11px] text-gray-600">
                  <span>
                    Page {liProductPage} / {liProductsQuery.data?.pagination.last_page ?? 1}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={liProductPage <= 1}
                      onClick={() => setLiProductPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={liProductPage >= (liProductsQuery.data?.pagination.last_page ?? 1)}
                      onClick={() => setLiProductPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 w-1/2 flex-col">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Linked products</div>
                <div className="flex-1 overflow-auto">
                  {!liImplantId ? (
                    <p className="p-4 text-xs text-gray-500">No implant selected.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Product name</TableHead>
                          <TableHead className="text-xs">Sub category</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liMergedLinkedIds.map((pid) => {
                          const linkedProduct = liLinkedProductsById.get(pid)
                          const row = liCatalogIdToRow.get(pid)
                          const name = linkedProduct?.name || row?.name || `Product #${pid}`
                          const sub = linkedProduct?.subcategoryName || row?.subcategoryName || "—"
                          return (
                            <TableRow key={pid}>
                              <TableCell className="text-xs font-medium">{name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{sub}</TableCell>
                              <TableCell className="space-x-1 text-right">
                                <button type="button" className="cursor-not-allowed p-1 text-gray-400 opacity-60">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  onClick={() => {
                                    if (liBaselineProductIds.includes(pid)) {
                                      setLiPendingProductRemoves((prev) =>
                                        prev.includes(pid) ? prev : [...prev, pid],
                                      )
                                    }
                                    setLiPendingProductAdds((prev) => prev.filter((x) => x !== pid))
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="linkByProduct" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
              <Select
                value={lpCategoryKey}
                onValueChange={(v) => {
                  setLpCategoryKey(v)
                  setLpSubKey("")
                  setLpProductId(null)
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryKeys.map((ck) => (
                    <SelectItem key={ck} value={ck} className="text-xs">
                      {ck}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lpSubKey} disabled={!lpCategoryKey} onValueChange={setLpSubKey}>
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="Sub category" />
                </SelectTrigger>
                <SelectContent>
                  {subKeysForCategory.map((sk) => (
                    <SelectItem key={sk} value={sk} className="text-xs">
                      {sk.includes("::") ? sk.split("::")[1] || sk : sk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={lpProductId ? String(lpProductId) : ""}
                disabled={!lpSubKey}
                onValueChange={(v) => {
                  const n = Number(v)
                  setLpProductId(Number.isFinite(n) ? n : null)
                  setLpPendingImplantAdds([])
                  setLpPendingImplantRemoves([])
                }}
              >
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {productChoices.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-600">
                {lpProductId ? `${lpMergedImplantIds.length} implant(s) linked` : "Select a product"}
              </span>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Jump to implant…"
                  value={lpJump}
                  onChange={(e) => setLpJump(e.target.value)}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 border-t">
              <div className="flex min-h-0 w-1/2 flex-col border-r">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Available implants</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search implants"
                      value={lpImplantQ}
                      onChange={(e) => setLpImplantQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="p-1 text-gray-400" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {!lpProductId ? (
                    <p className="p-4 text-xs text-gray-500">Pick a product first.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Implant</TableHead>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lpAvailableImplants.map((imp) => {
                          const onLinked = lpMergedImplantIds.includes(imp.id)
                          return (
                            <TableRow key={imp.id}>
                              <TableCell className="text-xs font-medium">
                                {formatImplantDisplayName(imp)}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">{imp.code || "—"}</TableCell>
                              <TableCell>
                                {!onLinked ? (
                                  <button
                                    type="button"
                                    className="text-[#1162a8]"
                                    onClick={() =>
                                      setLpPendingImplantAdds((prev) =>
                                        prev.includes(imp.id) ? prev : [...prev, imp.id],
                                      )
                                    }
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 w-1/2 flex-col">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Linked implants</div>
                <div className="flex-1 overflow-auto">
                  {!lpProductId ? (
                    <p className="p-4 text-xs text-gray-500">No product selected.</p>
                  ) : lpProductDetailQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-[#1162a8]" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Implant</TableHead>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lpMergedImplantIds.map((id) => {
                          const fromProduct = lpLinkedImplants.find((r) => r.id === id)
                          const fromCatalog = implantCatalog.find((imp) => imp.id === id)
                          const name =
                            fromProduct?.name ||
                            (fromCatalog ? formatImplantDisplayName(fromCatalog) : `Implant #${id}`)
                          const code = fromCatalog?.code || "—"
                          return (
                            <TableRow key={id}>
                              <TableCell className="text-xs font-medium">{name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{code}</TableCell>
                              <TableCell className="space-x-1 text-right">
                                <button type="button" className="cursor-not-allowed p-1 text-gray-400 opacity-60">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  onClick={() => {
                                    if (lpBaselineImplantIds.includes(id)) {
                                      setLpPendingImplantRemoves((prev) =>
                                        prev.includes(id) ? prev : [...prev, id],
                                      )
                                    }
                                    setLpPendingImplantAdds((prev) => prev.filter((x) => x !== id))
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-2 text-xs text-amber-900">
              Bulk link only adds links between implants and products. To remove links, use Link by Product or Link by
              Implant.
            </div>
            <div className="flex min-h-0 flex-1">
              <div className="flex min-h-0 w-1/2 flex-col border-r">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Pick implants</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search implants"
                      value={bulkImplantQ}
                      onChange={(e) => setBulkImplantQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="p-1 text-gray-400" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="w-10" />
                        <TableHead className="text-xs">Implant</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkImplantsRows.map((imp: Implant) => {
                        const checked = bulkImplantSelection.includes(imp.id)
                        return (
                          <TableRow key={imp.id}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) =>
                                  setBulkImplantSelection((prev) =>
                                    c === true ? [...prev, imp.id] : prev.filter((x) => x !== imp.id),
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {formatImplantDisplayName(imp)}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">{imp.code || "—"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-2 border-t px-3 py-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing {bulkImplantTotal === 0 ? 0 : (bulkImplantPage - 1) * bulkImplantPerPage + 1} to{" "}
                    {Math.min(bulkImplantPage * bulkImplantPerPage, bulkImplantTotal)} of {bulkImplantTotal} entries
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bulkImplantPage <= 1}
                      onClick={() => setBulkImplantPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous implants page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {getPaginationPages(bulkImplantPage, bulkImplantTotalPages).map((pageNum) => (
                      <button
                        key={`bulk-implant-page-${pageNum}`}
                        type="button"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors",
                          bulkImplantPage === pageNum
                            ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                        onClick={() => setBulkImplantPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bulkImplantPage >= bulkImplantTotalPages}
                      onClick={() => setBulkImplantPage((p) => Math.min(bulkImplantTotalPages, p + 1))}
                      aria-label="Next implants page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 w-1/2 flex-col">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Pick products</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search products"
                      value={bulkProductQ}
                      onChange={(e) => setBulkProductQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="p-1 text-gray-400" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="w-10" />
                        <TableHead className="text-xs">Product name</TableHead>
                        <TableHead className="text-xs">Sub category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkProductRowsFiltered.map((r) => {
                        const checked = bulkProductSelection.includes(r.id)
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) =>
                                  setBulkProductSelection((prev) =>
                                    c === true ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-xs font-medium">{r.name}</TableCell>
                            <TableCell className="text-xs text-gray-600">{r.subcategoryName}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-2 border-t px-3 py-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing {bulkProductTotal === 0 ? 0 : (bulkProductPage - 1) * bulkProductPerPage + 1} to{" "}
                    {Math.min(bulkProductPage * bulkProductPerPage, bulkProductTotal)} of {bulkProductTotal} entries
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bulkProductPage <= 1}
                      onClick={() => setBulkProductPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous products page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {getPaginationPages(bulkProductPage, bulkProductTotalPages).map((pageNum) => (
                      <button
                        key={`bulk-product-page-${pageNum}`}
                        type="button"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors",
                          bulkProductPage === pageNum
                            ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                        onClick={() => setBulkProductPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bulkProductPage >= bulkProductTotalPages}
                      onClick={() => setBulkProductPage((p) => Math.min(bulkProductTotalPages, p + 1))}
                      aria-label="Next products page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t bg-amber-50/90 px-6 py-2 text-center text-xs text-amber-950">
              Link {bulkImplantSelection.length} implant{bulkImplantSelection.length !== 1 ? "s" : ""} to{" "}
              {bulkProductSelection.length} product
              {bulkProductSelection.length !== 1 ? "s" : ""}
              {bulkMaxPairs ? ` · up to ${bulkMaxPairs} pair combinations (existing links skipped on server)` : ""}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 border-t px-4 py-4 sm:px-6">
          <div className="flex w-full justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white hover:brightness-110"
              disabled={
                isSubmitting ||
                (mainTab === "linkByImplant" && !liImplantId) ||
                (mainTab === "linkByProduct" && !lpProductId) ||
                (mainTab === "bulk" && (!bulkImplantSelection.length || !bulkProductSelection.length))
              }
              onClick={() => void handlePrimaryFooter()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Applying…
                </>
              ) : mainTab === "browse" ? (
                "Done"
              ) : (
                "Apply link"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
