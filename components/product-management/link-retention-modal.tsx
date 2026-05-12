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
  useBrowseRetentionLinkByRetentionType,
  useBrowseRetentionLinkByRetentionOption,
  useBrowseRetentionLinkByProduct,
  useRetentionLinkByRetentionOption,
  useRetentionLinkByProduct,
  useRetentionBulkLink,
  useRetentionLinkByRetention,
  useRetentionOptionsPage,
  useLibraryRetentionsList,
  getRetentionLinkCustomerIdParam,
  fetchLibraryProductDetailForRetentionLinks,
  parseLinkedRetentionOptionIdsFromProductPayload,
  type RetentionLinkBrowseByRetentionTypeRow,
  type RetentionLinkBrowseByRetentionOptionRow,
  type RetentionLinkBrowseByProductRow,
} from "@/lib/api/retention-link-query"
import { getRetentionOption } from "@/services/retention-options-api"
import { linkRetentionOptionsToProductsCategories } from "@/services/retention-option-product-link-api"
import type { RetentionOption } from "@/services/retention-options-api"

type MainTab = "browse" | "linkByProduct" | "linkByRetentionOption" | "bulk"
type BrowseSub = "retentionType" | "retentionOption" | "product"

export interface LinkRetentionModalProps {
  isOpen: boolean
  onClose: () => void
  context?: "global" | "lab"
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

  const rows: CatalogProductRow[] = productsData.map((item: Record<string, unknown>) => {
    const subName =
      (item.subcategory as { name?: string } | undefined)?.name ||
      (item.subcategory_name as string) ||
      ""
    const catName =
      (item.subcategory as { category?: { name?: string } } | undefined)?.category?.name ||
      (item.category_name as string) ||
      (item.category as { name?: string } | undefined)?.name ||
      "Uncategorized"
    return {
      id: item.id as number,
      name: String(item.name ?? ""),
      categoryLabel: catName,
      subcategoryName: subName || catName,
      categoryKey: String(catName),
      subcategoryKey: `${catName}::${subName}`,
    }
  })

  return { rows, pagination: { last_page: pagination.last_page || 1, total: pagination.total || 0 } }
}

function bodyCustomer(context: "global" | "lab"): { customer_id?: number } {
  const id = getRetentionLinkCustomerIdParam(context)
  return id != null ? { customer_id: id } : {}
}

function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (currentPage <= 3) return [1, 2, 3, 4, 5]
  if (currentPage >= totalPages - 2)
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
}

function parseLinkedProductIdsFromRetentionOptionDetail(
  data: Record<string, unknown> | null | undefined,
): number[] {
  if (!data) return []
  const raw = data.products
  if (!Array.isArray(raw)) return []
  const ids: number[] = []
  for (const p of raw) {
    if (!p || typeof p !== "object") continue
    const o = p as Record<string, unknown>
    const id = typeof o.id === "number" ? o.id : Number(o.id)
    if (Number.isFinite(id) && id > 0) ids.push(id)
  }
  return ids
}

function buildLinkedProductsMapFromRetentionOptionDetail(
  data: Record<string, unknown> | null | undefined,
): Map<number, { name: string; subcategoryName: string }> {
  const m = new Map<number, { name: string; subcategoryName: string }>()
  if (!data) return m
  const raw = data.products
  if (!Array.isArray(raw)) return m
  for (const p of raw) {
    if (!p || typeof p !== "object") continue
    const o = p as Record<string, unknown>
    const id = typeof o.id === "number" ? o.id : Number(o.id)
    if (!Number.isFinite(id) || id <= 0) continue
    const subObj = o.subcategory as { name?: string; category?: { name?: string } } | undefined
    const subcategoryName =
      (typeof o.subcategory_name === "string" ? o.subcategory_name : undefined) ||
      subObj?.name ||
      subObj?.category?.name ||
      (typeof o.category_name === "string" ? o.category_name : undefined) ||
      "—"
    m.set(id, {
      name:
        (typeof o.name === "string" ? o.name : undefined) ||
        (typeof o.product_name === "string" ? o.product_name : undefined) ||
        `Product #${id}`,
      subcategoryName,
    })
  }
  return m
}

export function LinkRetentionModal({ isOpen, onClose, context = "global" }: LinkRetentionModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const linkCustomerId = getRetentionLinkCustomerIdParam(context)

  const [mainTab, setMainTab] = useState<MainTab>("browse")
  const [browseSub, setBrowseSub] = useState<BrowseSub>("retentionType")
  const [browsePage, setBrowsePage] = useState(1)
  const [browsePerPage, setBrowsePerPage] = useState(10)
  const [linkModalExpanded, setLinkModalExpanded] = useState(false)
  const [browseQ, setBrowseQ] = useState("")
  const debouncedBrowseQ = useDebounce(browseQ, 350)
  const [browseOrderBy, setBrowseOrderBy] = useState("name")
  const [browseSort, setBrowseSort] = useState<"asc" | "desc">("asc")

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

  const browseTypeQuery = useBrowseRetentionLinkByRetentionType(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "retentionType",
  })
  const browseOptionQuery = useBrowseRetentionLinkByRetentionOption(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "retentionOption",
  })
  const browseProductQuery = useBrowseRetentionLinkByProduct(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "product",
  })

  const linkByRetentionOptionMutation = useRetentionLinkByRetentionOption()
  const linkByProductMutation = useRetentionLinkByProduct()
  const bulkLinkMutation = useRetentionBulkLink()
  const linkByRetentionMutation = useRetentionLinkByRetention()

  const { data: retentionTypesList = [] } = useLibraryRetentionsList(context, {
    enabled: isOpen && (mainTab === "linkByRetentionOption" || mainTab === "browse"),
  })

  const [lroRetentionTypeId, setLroRetentionTypeId] = useState<string>("")
  const [lroOptionId, setLroOptionId] = useState<number | null>(null)
  const [lroJump, setLroJump] = useState("")
  const [lroProductPage, setLroProductPage] = useState(1)
  const [lroProductQ, setLroProductQ] = useState("")
  const debouncedLroProductQ = useDebounce(lroProductQ, 300)
  const [lroPendingAdds, setLroPendingAdds] = useState<number[]>([])
  const [lroPendingRemoves, setLroPendingRemoves] = useState<number[]>([])

  const { data: allOptionsBundle } = useRetentionOptionsPage(
    context,
    { page: 1, per_page: 500, order_by: "name", sort_by: "asc" },
    { enabled: isOpen && mainTab === "linkByRetentionOption" },
  )
  const allRetentionOptions: RetentionOption[] = allOptionsBundle?.data ?? []

  const optionsForSelectedType = useMemo(() => {
    const tid = Number(lroRetentionTypeId)
    if (!Number.isFinite(tid) || tid <= 0) return [] as RetentionOption[]
    return allRetentionOptions.filter((opt) =>
      (opt.retentions ?? []).some((r: { id?: number }) => Number(r.id) === tid),
    )
  }, [allRetentionOptions, lroRetentionTypeId])

  const lroJumpLower = lroJump.trim().toLowerCase()
  const optionsFiltered = lroJumpLower
    ? optionsForSelectedType.filter((o) => o.name.toLowerCase().includes(lroJumpLower))
    : optionsForSelectedType

  const retentionOptionDetailQuery = useQuery({
    queryKey: ["retentionOptionLinkDetail", lroOptionId, linkCustomerId, context],
    enabled: isOpen && mainTab === "linkByRetentionOption" && !!lroOptionId,
    queryFn: async () => {
      const res = await getRetentionOption(
        lroOptionId!,
        linkCustomerId ?? undefined,
      )
      const d = res.data as Record<string, unknown> | undefined
      return d && typeof d === "object" ? d : null
    },
  })

  const lroBaselineProductIds = useMemo(
    () => parseLinkedProductIdsFromRetentionOptionDetail(retentionOptionDetailQuery.data ?? null),
    [retentionOptionDetailQuery.data],
  )

  const lroLinkedProductsById = useMemo(
    () => buildLinkedProductsMapFromRetentionOptionDetail(retentionOptionDetailQuery.data ?? null),
    [retentionOptionDetailQuery.data],
  )

  const lroProductsQuery = useQuery({
    queryKey: ["linkRetentionModalProducts", context, lroProductPage, debouncedLroProductQ],
    enabled: isOpen && mainTab === "linkByRetentionOption" && !!lroOptionId,
    queryFn: () => fetchLibraryProductsPage({ page: lroProductPage, per_page: 10 }),
  })

  const lroCatalogRows = lroProductsQuery.data?.rows ?? []
  const lroCatalogFiltered = debouncedLroProductQ.trim()
    ? lroCatalogRows.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedLroProductQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedLroProductQ.toLowerCase()),
      )
    : lroCatalogRows

  const lroMergedLinkedIds = useMemo(() => {
    const removes = new Set(lroPendingRemoves)
    const base = lroBaselineProductIds.filter((id) => !removes.has(id))
    const adds = lroPendingAdds.filter((id) => !base.includes(id))
    return Array.from(new Set([...base, ...adds]))
  }, [lroBaselineProductIds, lroPendingAdds, lroPendingRemoves])

  const lroCatalogIdToRow = useMemo(() => new Map(lroCatalogRows.map((r) => [r.id, r])), [lroCatalogRows])

  const [lpCategoryKey, setLpCategoryKey] = useState<string>("")
  const [lpSubKey, setLpSubKey] = useState<string>("")
  const [lpProductId, setLpProductId] = useState<number | null>(null)
  const [lpJump, setLpJump] = useState("")
  const [lpOptionPage, setLpOptionPage] = useState(1)
  const [lpOptionQ, setLpOptionQ] = useState("")
  const debouncedLpOptionQ = useDebounce(lpOptionQ, 300)
  const [lpPendingAdds, setLpPendingAdds] = useState<number[]>([])
  const [lpPendingRemoves, setLpPendingRemoves] = useState<number[]>([])

  const lpProductsAllQuery = useQuery({
    queryKey: ["linkRetentionModalProductsCatalogGrouped", context],
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
    queryKey: ["libraryProductRetentionLinkDetail", lpProductId, context],
    enabled: isOpen && mainTab === "linkByProduct" && !!lpProductId,
    queryFn: () => fetchLibraryProductDetailForRetentionLinks(lpProductId!, context),
  })

  const lpBaselineOptionIds = useMemo(
    () => parseLinkedRetentionOptionIdsFromProductPayload(lpProductDetailQuery.data ?? null),
    [lpProductDetailQuery.data],
  )

  const lpMergedOptionIds = useMemo(() => {
    const removes = new Set(lpPendingRemoves)
    const base = lpBaselineOptionIds.filter((id) => !removes.has(id))
    const adds = lpPendingAdds.filter((id) => !base.includes(id))
    return Array.from(new Set([...base, ...adds]))
  }, [lpBaselineOptionIds, lpPendingAdds, lpPendingRemoves])

  const lpOptionsPageQuery = useRetentionOptionsPage(
    context,
    {
      page: lpOptionPage,
      per_page: 10,
      q: debouncedLpOptionQ.trim() || undefined,
      order_by: "name",
      sort_by: "asc",
    },
    { enabled: isOpen && mainTab === "linkByProduct" && !!lpProductId },
  )

  const lpOptionsPageRows: RetentionOption[] = lpOptionsPageQuery.data?.data ?? []

  const lpOptionById = useMemo(() => {
    const m = new Map<number, RetentionOption>()
    for (const o of lpOptionsPageRows) m.set(o.id, o)
    for (const o of allRetentionOptions) m.set(o.id, o)
    return m
  }, [lpOptionsPageRows, allRetentionOptions])

  const [bulkOptionSelection, setBulkOptionSelection] = useState<number[]>([])
  const [bulkProductSelection, setBulkProductSelection] = useState<number[]>([])
  const [bulkOptionPage, setBulkOptionPage] = useState(1)
  const [bulkProductPage, setBulkProductPage] = useState(1)
  const [bulkOptionQ, setBulkOptionQ] = useState("")
  const [bulkProductQ, setBulkProductQ] = useState("")
  const debouncedBulkOptionQ = useDebounce(bulkOptionQ, 300)
  const debouncedBulkProductQ = useDebounce(bulkProductQ, 300)

  const bulkOptionsQuery = useRetentionOptionsPage(
    context,
    {
      page: bulkOptionPage,
      per_page: 10,
      q: debouncedBulkOptionQ.trim() || undefined,
      order_by: "name",
      sort_by: "asc",
    },
    { enabled: isOpen && mainTab === "bulk" },
  )

  const bulkProductsQuery = useQuery({
    queryKey: ["linkRetentionBulkProducts", context, bulkProductPage, debouncedBulkProductQ],
    enabled: isOpen && mainTab === "bulk",
    queryFn: () => fetchLibraryProductsPage({ page: bulkProductPage, per_page: 10 }),
  })

  const bulkOptionRows = bulkOptionsQuery.data?.data ?? []
  const bulkProductRowsRaw = bulkProductsQuery.data?.rows ?? []
  const bulkProductRowsFiltered = debouncedBulkProductQ.trim()
    ? bulkProductRowsRaw.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedBulkProductQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedBulkProductQ.toLowerCase()),
      )
    : bulkProductRowsRaw

  const bulkOptionTotal = bulkOptionsQuery.data?.pagination.total ?? 0
  const bulkOptionPerPage = bulkOptionsQuery.data?.pagination.per_page ?? 10
  const bulkOptionTotalPages = Math.max(1, bulkOptionsQuery.data?.pagination.last_page ?? 1)
  const bulkProductTotal = bulkProductsQuery.data?.pagination.total ?? 0
  const bulkProductPerPage = 10
  const bulkProductTotalPages = Math.max(1, bulkProductsQuery.data?.pagination.last_page ?? 1)

  const [typeQuickLinkId, setTypeQuickLinkId] = useState<number | null>(null)
  const [typeQuickProductSelection, setTypeQuickProductSelection] = useState<number[]>([])
  const [typeQuickPage, setTypeQuickPage] = useState(1)
  const [typeQuickQ, setTypeQuickQ] = useState("")
  const debouncedTypeQuickQ = useDebounce(typeQuickQ, 300)

  const typeQuickProductsQuery = useQuery({
    queryKey: ["linkRetentionTypeQuickProducts", context, typeQuickPage, debouncedTypeQuickQ],
    enabled: isOpen && typeQuickLinkId != null,
    queryFn: () => fetchLibraryProductsPage({ page: typeQuickPage, per_page: 10 }),
  })
  const typeQuickRowsRaw = typeQuickProductsQuery.data?.rows ?? []
  const typeQuickRowsFiltered = debouncedTypeQuickQ.trim()
    ? typeQuickRowsRaw.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedTypeQuickQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedTypeQuickQ.toLowerCase()),
      )
    : typeQuickRowsRaw
  const typeQuickTotal = typeQuickProductsQuery.data?.pagination.total ?? 0
  const typeQuickTotalPages = Math.max(1, typeQuickProductsQuery.data?.pagination.last_page ?? 1)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setMainTab("browse")
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setBrowsePage(1)
      setBrowseQ("")
      setLroPendingAdds([])
      setLroPendingRemoves([])
      setLpPendingAdds([])
      setLpPendingRemoves([])
      setBulkOptionSelection([])
      setBulkProductSelection([])
      setLroRetentionTypeId("")
      setLroOptionId(null)
      setLpProductId(null)
      setLpCategoryKey("")
      setLpSubKey("")
      setTypeQuickLinkId(null)
      setTypeQuickProductSelection([])
    }
  }, [isOpen])

  useEffect(() => {
    setBrowsePage(1)
  }, [debouncedBrowseQ, browseSub, mainTab])

  useEffect(() => {
    setLroProductPage(1)
  }, [debouncedLroProductQ])

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

  const replaceOptionProductsExcluding = async (
    retentionOptionId: number,
    excludeProductId: number,
  ) => {
    const res = await getRetentionOption(retentionOptionId, linkCustomerId ?? undefined)
    const d = res.data as Record<string, unknown> | undefined
    const current = parseLinkedProductIdsFromRetentionOptionDetail(d ?? null).filter(
      (id) => id !== excludeProductId,
    )
    const customer = bodyCustomer(context)
    await linkRetentionOptionsToProductsCategories({
      ...customer,
      retention_options: [
        {
          id: retentionOptionId,
          products: current.map((product_id, i) => ({
            product_id,
            status: "Active" as const,
            sequence: i + 1,
          })),
          categories: [],
        },
      ],
    })
  }

  const handleApplyLinkByRetentionOption = async () => {
    if (!lroOptionId) {
      toast({ title: "Select a retention option", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const customer = bodyCustomer(context)
      const baseline = new Set(lroBaselineProductIds)
      const merged = new Set(lroMergedLinkedIds)
      const toAdd = [...merged].filter((id) => !baseline.has(id))
      const toRemove = [...baseline].filter((id) => !merged.has(id))

      if (!toAdd.length && !toRemove.length) {
        toast({ title: "No changes to apply" })
        setIsSubmitting(false)
        return
      }

      if (toAdd.length) {
        await linkByRetentionOptionMutation.mutateAsync({
          retention_option_id: lroOptionId,
          product_ids: toAdd,
          ...customer,
        })
      }
      for (const pid of toRemove) {
        await replaceOptionProductsExcluding(lroOptionId, pid)
      }

      toast({ title: "Links updated" })
      await queryClient.invalidateQueries({ queryKey: ["retentionOptionLinkDetail", lroOptionId] })
      setLroPendingAdds([])
      setLroPendingRemoves([])
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed"
      toast({ title: "Error", description: msg, variant: "destructive" })
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
      const baseline = new Set(lpBaselineOptionIds)
      const merged = new Set(lpMergedOptionIds)
      const toAdd = [...merged].filter((id) => !baseline.has(id))
      const toRemove = [...baseline].filter((id) => !merged.has(id))

      if (!toAdd.length && !toRemove.length) {
        toast({ title: "No changes to apply" })
        setIsSubmitting(false)
        return
      }

      if (toAdd.length) {
        await linkByProductMutation.mutateAsync({
          product_id: lpProductId,
          retention_option_ids: toAdd,
          ...customer,
        })
      }
      for (const oid of toRemove) {
        await replaceOptionProductsExcluding(oid, lpProductId)
      }

      toast({ title: "Links updated" })
      await queryClient.invalidateQueries({
        queryKey: ["libraryProductRetentionLinkDetail", lpProductId, context],
      })
      setLpPendingAdds([])
      setLpPendingRemoves([])
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkApply = async () => {
    if (!bulkOptionSelection.length || !bulkProductSelection.length) {
      toast({ title: "Select retention options and products", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      await bulkLinkMutation.mutateAsync({
        retention_option_ids: bulkOptionSelection,
        product_ids: bulkProductSelection,
        ...bodyCustomer(context),
      })
      toast({ title: "Bulk links created successfully" })
      setBulkOptionSelection([])
      setBulkProductSelection([])
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTypeQuickApply = async () => {
    if (!typeQuickLinkId || !typeQuickProductSelection.length) {
      toast({ title: "Select products", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      await linkByRetentionMutation.mutateAsync({
        retention_id: typeQuickLinkId,
        product_ids: typeQuickProductSelection,
        ...bodyCustomer(context),
      })
      toast({ title: "Links updated" })
      setTypeQuickLinkId(null)
      setTypeQuickProductSelection([])
      void browseTypeQuery.refetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrimaryFooter = async () => {
    if (mainTab === "browse") {
      onClose()
      return
    }
    if (mainTab === "linkByRetentionOption") {
      await handleApplyLinkByRetentionOption()
      return
    }
    if (mainTab === "linkByProduct") {
      await handleApplyLinkByProduct()
      return
    }
    await handleBulkApply()
  }

  const openLinkByRetentionOptionFromBrowse = (optionId: number) => {
    setLroOptionId(optionId)
    setMainTab("linkByRetentionOption")
    setLroRetentionTypeId("")
    setLroPendingAdds([])
    setLroPendingRemoves([])
    const opt = allRetentionOptions.find((o) => o.id === optionId)
    const firstR = opt?.retentions?.[0]
    if (firstR?.id) setLroRetentionTypeId(String(firstR.id))
  }

  const openLinkByProductFromBrowse = (productId: number) => {
    setLpProductId(productId)
    setLpCategoryKey("")
    setLpSubKey("")
    setMainTab("linkByProduct")
    setLpPendingAdds([])
    setLpPendingRemoves([])
  }

  const browseRowsType = browseTypeQuery.data?.rows ?? []
  const browseRowsOption = browseOptionQuery.data?.rows ?? []
  const browseRowsByProduct = browseProductQuery.data?.rows ?? []
  const browsePagination =
    browseSub === "retentionType"
      ? browseTypeQuery.data?.pagination
      : browseSub === "retentionOption"
        ? browseOptionQuery.data?.pagination
        : browseProductQuery.data?.pagination
  const browseTotalPages = Math.max(1, browsePagination?.last_page ?? 1)
  const browseTotalEntries = browsePagination?.total ?? 0
  const browseLoading =
    browseSub === "retentionType"
      ? browseTypeQuery.isLoading
      : browseSub === "retentionOption"
        ? browseOptionQuery.isLoading
        : browseProductQuery.isLoading
  const browseHasPages = browseTotalEntries > 0
  const browseRowCount =
    browseSub === "retentionType"
      ? browseRowsType.length
      : browseSub === "retentionOption"
        ? browseRowsOption.length
        : browseRowsByProduct.length
  const browseEmptyLoaded = !browseLoading && browseRowCount === 0

  const bulkMaxPairs = bulkOptionSelection.length * bulkProductSelection.length

  return (
    <>
      <Dialog
        open={isOpen && typeQuickLinkId == null}
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
              <DialogTitle className="text-lg font-semibold">Link Retention</DialogTitle>
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
                    ["linkByRetentionOption", "Link by Retention Option"],
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
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="flex rounded-full border border-gray-200/90 bg-gray-100/90 p-0.5">
                      {(
                        [
                          ["retentionType", "Browse by Retention Type"],
                          ["retentionOption", "Browse by Retention Option"],
                          ["product", "Browse by Product"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            browseSub === id
                              ? "bg-white text-[#1162a8] shadow-sm"
                              : "text-gray-600 hover:text-gray-900",
                          )}
                          onClick={() => setBrowseSub(id)}
                        >
                          {label}
                        </button>
                      ))}
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
                        placeholder="Search"
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
                      No rows match your filters.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200">
                      <Table className="w-full table-fixed text-sm [&_tbody_tr:last-child_td]:border-b-0">
                        <TableHeader>
                          <TableRow className="border-b border-gray-200 bg-gray-50/95 hover:bg-gray-50/95 [&>th]:border-b-0">
                            {browseSub === "retentionType" ? (
                              <>
                                <TableHead
                                  className="sticky top-0 z-[1] w-[28%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                  onClick={() => toggleBrowseSort("name")}
                                >
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                    Retention type <ArrowUpDown className="h-3 w-3 shrink-0" />
                                  </span>
                                </TableHead>
                                <TableHead className="sticky top-0 z-[1] min-w-0 bg-gray-50/95 py-3 text-xs font-semibold">
                                  Retention option
                                </TableHead>
                              </>
                            ) : browseSub === "retentionOption" ? (
                              <>
                                <TableHead
                                  className="sticky top-0 z-[1] w-[22%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                  onClick={() => toggleBrowseSort("name")}
                                >
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                    Retention option <ArrowUpDown className="h-3 w-3 shrink-0" />
                                  </span>
                                </TableHead>
                                <TableHead className="sticky top-0 z-[1] min-w-0 bg-gray-50/95 py-3 text-xs font-semibold">
                                  Linked retentions / products
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
                                  Retention options
                                </TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {browseSub === "retentionType"
                            ? browseRowsType.map((row: RetentionLinkBrowseByRetentionTypeRow) => (
                                <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                  <TableCell className="min-w-0 break-words font-medium leading-snug">
                                    {row.name}
                                  </TableCell>
                                  <TableCell className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-start gap-1">
                                      {(row.linked_retention_options_preview ?? []).map((c) => (
                                        <Badge
                                          key={c.id}
                                          variant="secondary"
                                          className="max-w-[10rem] shrink truncate text-[10px] font-normal"
                                          title={c.name}
                                        >
                                          {c.name}
                                        </Badge>
                                      ))}
                                      {(row.linked_retention_options_more_count ?? 0) > 0 ? (
                                        <Badge variant="outline" className="shrink-0 text-[10px]">
                                          +{row.linked_retention_options_more_count} more
                                        </Badge>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="shrink-0 text-[#1162a8] hover:opacity-80"
                                        onClick={() => {
                                          setTypeQuickLinkId(row.id)
                                          setTypeQuickProductSelection([])
                                          setTypeQuickPage(1)
                                          setTypeQuickQ("")
                                        }}
                                        aria-label="Link products to retention type"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            : browseSub === "retentionOption"
                              ? browseRowsOption.map((row: RetentionLinkBrowseByRetentionOptionRow) => (
                                  <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                    <TableCell className="min-w-0 break-words font-medium leading-snug">
                                      {row.name}
                                    </TableCell>
                                    <TableCell className="min-w-0">
                                      <div className="flex min-w-0 flex-col gap-1">
                                        <div className="flex flex-wrap items-start gap-1">
                                          {(row.linked_retentions_preview ?? []).map((c) => (
                                            <Badge
                                              key={`rt-${c.id}`}
                                              variant="secondary"
                                              className="text-[10px] font-normal"
                                            >
                                              {c.name}
                                            </Badge>
                                          ))}
                                          {(row.linked_retentions_more_count ?? 0) > 0 ? (
                                            <Badge variant="outline" className="text-[10px]">
                                              +{row.linked_retentions_more_count} types
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <div className="flex flex-wrap items-start gap-1">
                                          {(row.linked_products_preview ?? []).map((c) => (
                                            <Badge
                                              key={`p-${c.id}`}
                                              variant="outline"
                                              className="text-[10px] font-normal"
                                            >
                                              {c.name}
                                            </Badge>
                                          ))}
                                          {(row.linked_products_more_count ?? 0) > 0 ? (
                                            <Badge variant="outline" className="text-[10px]">
                                              +{row.linked_products_more_count} products
                                            </Badge>
                                          ) : null}
                                          <button
                                            type="button"
                                            className="shrink-0 text-[#1162a8] hover:opacity-80"
                                            onClick={() => openLinkByRetentionOptionFromBrowse(row.id)}
                                            aria-label="Edit links for retention option"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              : browseRowsByProduct.map((row: RetentionLinkBrowseByProductRow) => (
                                  <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                    <TableCell className="min-w-0 break-words font-medium leading-snug">
                                      {row.name}
                                    </TableCell>
                                    <TableCell className="min-w-0 break-words text-gray-600 leading-snug">
                                      {row.subcategory_name ?? "—"}
                                    </TableCell>
                                    <TableCell className="min-w-0">
                                      <div className="flex min-w-0 flex-wrap items-start gap-1">
                                        {(row.linked_retention_options_preview ?? []).map((c) => (
                                          <Badge
                                            key={c.id}
                                            variant="secondary"
                                            className="max-w-[10rem] shrink truncate text-[10px] font-normal"
                                            title={c.name}
                                          >
                                            {c.name}
                                          </Badge>
                                        ))}
                                        {(row.linked_retention_options_more_count ?? 0) > 0 ? (
                                          <Badge variant="outline" className="shrink-0 text-[10px]">
                                            +{row.linked_retention_options_more_count} more
                                          </Badge>
                                        ) : null}
                                        <button
                                          type="button"
                                          className="shrink-0 text-[#1162a8] hover:opacity-80"
                                          onClick={() => openLinkByProductFromBrowse(row.id)}
                                          aria-label="Edit links for product"
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
                      {Math.min(browsePage * browsePerPage, browseTotalEntries)} of {browseTotalEntries} entries
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
                                  ? "bg-[#1162a8] text-white"
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
                ) : null}
              </div>
            </TabsContent>

            <TabsContent
              value="linkByRetentionOption"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
                <span className="text-xs text-gray-600">Editing:</span>
                <Select
                  value={lroRetentionTypeId}
                  onValueChange={(v) => {
                    setLroRetentionTypeId(v)
                    setLroOptionId(null)
                    setLroPendingAdds([])
                    setLroPendingRemoves([])
                  }}
                >
                  <SelectTrigger className="h-9 w-[170px] text-xs">
                    <SelectValue placeholder="Retention type" />
                  </SelectTrigger>
                  <SelectContent>
                    {retentionTypesList.map((r: { id: number; name: string }) => (
                      <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={lroOptionId ? String(lroOptionId) : ""}
                  disabled={!lroRetentionTypeId}
                  onValueChange={(v) => {
                    const n = Number(v)
                    setLroOptionId(Number.isFinite(n) ? n : null)
                    setLroPendingAdds([])
                    setLroPendingRemoves([])
                  }}
                >
                  <SelectTrigger className="h-9 w-[200px] text-xs">
                    <SelectValue placeholder="Retention option" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {optionsFiltered.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)} className="text-xs">
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-600">
                  {lroOptionId ? `${lroMergedLinkedIds.length} product(s) linked` : "Select an option"}
                </span>
                <div className="flex-1" />
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="h-9 pl-8 text-xs"
                    placeholder="Jump to option…"
                    value={lroJump}
                    onChange={(e) => setLroJump(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 border-t">
                <div className="flex w-1/2 min-h-0 flex-col border-r">
                  <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Available products</div>
                  <div className="flex gap-2 border-b px-3 py-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="h-8 pl-7 text-xs"
                        placeholder="Search product"
                        value={lroProductQ}
                        onChange={(e) => setLroProductQ(e.target.value)}
                      />
                    </div>
                    <button type="button" className="p-1 text-gray-400" aria-hidden>
                      <Filter className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    {!lroOptionId ? (
                      <p className="p-4 text-xs text-gray-500">Pick a retention option to load products.</p>
                    ) : lroProductsQuery.isLoading ? (
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
                          {lroCatalogFiltered.map((r) => {
                            const onLinked = lroMergedLinkedIds.includes(r.id)
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs font-medium">{r.name}</TableCell>
                                <TableCell className="text-xs text-gray-600">{r.subcategoryName}</TableCell>
                                <TableCell>
                                  {!onLinked ? (
                                    <button
                                      type="button"
                                      className="text-[#1162a8]"
                                      onClick={() =>
                                        setLroPendingAdds((prev) =>
                                          prev.includes(r.id) ? prev : [...prev, r.id],
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
                  <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-gray-600">
                    <span>Page {lroProductPage}</span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={lroProductPage <= 1}
                        onClick={() => setLroProductPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={lroProductPage >= (lroProductsQuery.data?.pagination.last_page || 1)}
                        onClick={() => setLroProductPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex w-1/2 min-h-0 flex-col">
                  <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Linked products</div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    {!lroOptionId ? (
                      <p className="p-4 text-xs text-gray-500">No option selected.</p>
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
                          {lroMergedLinkedIds.map((pid) => {
                            const linked = lroLinkedProductsById.get(pid)
                            const row = lroCatalogIdToRow.get(pid)
                            const name =
                              linked?.name ||
                              row?.name ||
                              browseRowsByProduct.find((x) => x.id === pid)?.name ||
                              `Product #${pid}`
                            const sub =
                              linked?.subcategoryName ||
                              row?.subcategoryName ||
                              browseRowsByProduct.find((x) => x.id === pid)?.subcategory_name ||
                              "—"
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
                                      if (lroBaselineProductIds.includes(pid)) {
                                        setLroPendingRemoves((prev) =>
                                          prev.includes(pid) ? prev : [...prev, pid],
                                        )
                                      }
                                      setLroPendingAdds((prev) => prev.filter((x) => x !== pid))
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

            <TabsContent
              value="linkByProduct"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
                <span className="text-xs text-gray-600">Editing:</span>
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
                    setLpPendingAdds([])
                    setLpPendingRemoves([])
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
                  {lpProductId ? `${lpMergedOptionIds.length} option(s) linked` : "Select a product"}
                </span>
                <div className="flex-1" />
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="h-9 pl-8 text-xs"
                    placeholder="Jump to product…"
                    value={lpJump}
                    onChange={(e) => setLpJump(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 border-t">
                <div className="flex w-1/2 min-h-0 flex-col border-r">
                  <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Available retention options</div>
                  <div className="flex gap-2 border-b px-3 py-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="h-8 pl-7 text-xs"
                        placeholder="Search options"
                        value={lpOptionQ}
                        onChange={(e) => setLpOptionQ(e.target.value)}
                      />
                    </div>
                    <button type="button" className="p-1 text-gray-400" aria-hidden>
                      <Filter className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    {!lpProductId ? (
                      <p className="p-4 text-xs text-gray-500">Pick a product first.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="text-xs">Retention option</TableHead>
                            <TableHead className="text-xs">Retention type</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lpOptionsPageRows
                            .filter((o) => {
                              if (!lpJump.trim()) return true
                              const q = lpJump.toLowerCase()
                              const tags = (o.retentions ?? [])
                                .map((r: { name?: string }) => (r.name ?? "").toLowerCase())
                                .join(" ")
                              return o.name.toLowerCase().includes(q) || tags.includes(q)
                            })
                            .map((o) => {
                              const onLinked = lpMergedOptionIds.includes(o.id)
                              return (
                                <TableRow key={o.id}>
                                  <TableCell className="text-xs font-medium">{o.name}</TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    <div className="flex flex-wrap gap-1">
                                      {(o.retentions ?? []).map((r: { id: number; name?: string }) => (
                                        <Badge key={r.id} variant="secondary" className="text-[10px] font-normal">
                                          {r.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {!onLinked ? (
                                      <button
                                        type="button"
                                        className="text-[#1162a8]"
                                        onClick={() =>
                                          setLpPendingAdds((prev) => (prev.includes(o.id) ? prev : [...prev, o.id]))
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
                  <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-gray-600">
                    <span>
                      Page {lpOptionPage} / {lpOptionsPageQuery.data?.pagination.last_page ?? 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={lpOptionPage <= 1}
                        onClick={() => setLpOptionPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={
                          lpOptionPage >= (lpOptionsPageQuery.data?.pagination.last_page ?? 1)
                        }
                        onClick={() => setLpOptionPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex w-1/2 min-h-0 flex-col">
                  <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Linked retention options</div>
                  <div className="min-h-0 flex-1 overflow-auto">
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
                            <TableHead className="text-xs">Retention option</TableHead>
                            <TableHead className="text-xs">Retention type</TableHead>
                            <TableHead className="w-16" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lpMergedOptionIds.map((oid) => {
                            const o = lpOptionById.get(oid)
                            return (
                              <TableRow key={oid}>
                                <TableCell className="text-xs font-medium">
                                  {o?.name ?? `Option #${oid}`}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  <div className="flex flex-wrap gap-1">
                                    {(o?.retentions ?? []).map((r: { id: number; name?: string }) => (
                                      <Badge key={r.id} variant="secondary" className="text-[10px] font-normal">
                                        {r.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="space-x-1 text-right">
                                  <button type="button" className="cursor-not-allowed p-1 text-gray-400 opacity-60">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1 text-gray-500 hover:text-red-600"
                                    onClick={() => {
                                      if (lpBaselineOptionIds.includes(oid)) {
                                        setLpPendingRemoves((prev) =>
                                          prev.includes(oid) ? prev : [...prev, oid],
                                        )
                                      }
                                      setLpPendingAdds((prev) => prev.filter((x) => x !== oid))
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

            <TabsContent
              value="bulk"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="border-b border-amber-100 bg-amber-50 px-6 py-2 text-xs text-amber-900">
                Bulk link only adds links between retention options and products. To remove links, use Link by
                Product or Link by Retention Option.
              </div>
              <div className="flex min-h-0 flex-1">
                <div className="flex w-1/2 min-h-0 flex-col border-r">
                  <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Pick retention option</div>
                  <div className="flex gap-2 border-b px-3 py-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="h-8 pl-7 text-xs"
                        placeholder="Search options"
                        value={bulkOptionQ}
                        onChange={(e) => setBulkOptionQ(e.target.value)}
                      />
                    </div>
                    <button type="button" className="p-1 text-gray-400" aria-hidden>
                      <Filter className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="w-10" />
                          <TableHead className="text-xs">Retention option</TableHead>
                          <TableHead className="text-xs">Retention type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkOptionRows.map((o: RetentionOption) => {
                          const checked = bulkOptionSelection.includes(o.id)
                          return (
                            <TableRow key={o.id}>
                              <TableCell>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) =>
                                    setBulkOptionSelection((prev) =>
                                      c === true ? [...prev, o.id] : prev.filter((x) => x !== o.id),
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-xs font-medium">{o.name}</TableCell>
                              <TableCell className="text-xs text-gray-600">
                                <div className="flex flex-wrap gap-1">
                                  {(o.retentions ?? []).map((r: { id: number; name?: string }) => (
                                    <Badge key={r.id} variant="secondary" className="text-[10px] font-normal">
                                      {r.name}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-col gap-2 border-t px-3 py-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Showing {bulkOptionTotal === 0 ? 0 : (bulkOptionPage - 1) * bulkOptionPerPage + 1} to{" "}
                      {Math.min(bulkOptionPage * bulkOptionPerPage, bulkOptionTotal)} of {bulkOptionTotal} entries
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={bulkOptionPage <= 1}
                        onClick={() => setBulkOptionPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous options page"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      {getPaginationPages(bulkOptionPage, bulkOptionTotalPages).map((pageNum) => (
                        <button
                          type="button"
                          key={`bulk-opt-${pageNum}`}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors",
                            bulkOptionPage === pageNum
                              ? "bg-[#1162a8] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          )}
                          onClick={() => setBulkOptionPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={bulkOptionPage >= bulkOptionTotalPages}
                        onClick={() => setBulkOptionPage((p) => Math.min(bulkOptionTotalPages, p + 1))}
                        aria-label="Next options page"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex w-1/2 min-h-0 flex-col">
                  <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Pick product</div>
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
                  <div className="min-h-0 flex-1 overflow-auto">
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
                      {Math.min(bulkProductPage * bulkProductPerPage, bulkProductTotal)} of {bulkProductTotal}{" "}
                      entries
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
                          type="button"
                          key={`bulk-prod-${pageNum}`}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors",
                            bulkProductPage === pageNum
                              ? "bg-[#1162a8] text-white"
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
                Link {bulkOptionSelection.length} option{bulkOptionSelection.length !== 1 ? "s" : ""} to{" "}
                {bulkProductSelection.length} product{bulkProductSelection.length !== 1 ? "s" : ""}
                {bulkMaxPairs ? ` · up to ${bulkMaxPairs} pair combinations` : ""}
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
                className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                disabled={
                  isSubmitting ||
                  (mainTab === "linkByRetentionOption" && !lroOptionId) ||
                  (mainTab === "linkByProduct" && !lpProductId) ||
                  (mainTab === "bulk" &&
                    (!bulkOptionSelection.length || !bulkProductSelection.length))
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

      <Dialog
        open={isOpen && typeQuickLinkId != null}
        onOpenChange={(open) => {
          if (!open) {
            setTypeQuickLinkId(null)
            setTypeQuickProductSelection([])
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link products to retention type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Select products to link to all retention options tagged with this type (additive on the server).
          </p>
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Sub category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeQuickRowsFiltered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={typeQuickProductSelection.includes(r.id)}
                        onCheckedChange={(c) =>
                          setTypeQuickProductSelection((prev) =>
                            c === true ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs">{r.name}</TableCell>
                    <TableCell className="text-xs text-gray-600">{r.subcategoryName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing {typeQuickTotal === 0 ? 0 : (typeQuickPage - 1) * 10 + 1} to{" "}
              {Math.min(typeQuickPage * 10, typeQuickTotal)} of {typeQuickTotal}
            </span>
            <div className="flex gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={typeQuickPage <= 1}
                onClick={() => setTypeQuickPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationPages(typeQuickPage, typeQuickTotalPages).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={typeQuickPage === p ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 min-w-0 p-0"
                  onClick={() => setTypeQuickPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={typeQuickPage >= typeQuickTotalPages}
                onClick={() => setTypeQuickPage((p) => Math.min(typeQuickTotalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-8"
              placeholder="Filter…"
              value={typeQuickQ}
              onChange={(e) => setTypeQuickQ(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTypeQuickLinkId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#1162a8] text-white"
              disabled={isSubmitting || !typeQuickProductSelection.length}
              onClick={() => void handleTypeQuickApply()}
            >
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
