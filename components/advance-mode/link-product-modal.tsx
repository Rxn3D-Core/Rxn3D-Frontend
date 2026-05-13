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
  useAdvanceCategories,
  useAdvanceField,
  useAdvanceFields,
  useAdvanceLinkByProduct,
  useAdvanceBulkLinkFields,
  useBrowseAdvanceLinkFieldsByField,
  useBrowseAdvanceLinkFieldsByProduct,
  useLinkFieldProducts,
  useAdvanceFieldHydrationQueries,
  getAdvanceLinkFieldsCustomerIdParam,
  fetchLibraryProductDetailForAdvanceLinks,
  parseLinkedAdvanceFieldsFromProductPayload,
  type AdvanceCategory,
  type AdvanceField,
} from "@/lib/api/advance-mode-query"

type MainTab = "browse" | "linkByProduct" | "linkByField" | "bulk"

export interface LinkProductModalProps {
  isOpen: boolean
  onClose: () => void
  context?: "global" | "lab"
  fieldId?: number | null
  onApply?: (selectedFields: number[], selectedProducts: number[]) => void
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
  const id = getAdvanceLinkFieldsCustomerIdParam(context)
  return id != null ? { customer_id: id } : {}
}

function linkProductsQueryCustomer(
  context: "global" | "lab",
): string | number | null | undefined {
  const id = getAdvanceLinkFieldsCustomerIdParam(context)
  return id != null ? id : undefined
}

export function LinkProductModal({
  isOpen,
  onClose,
  context = "global",
  fieldId: fieldIdProp,
  onApply,
}: LinkProductModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const linkFieldsCustomerId = getAdvanceLinkFieldsCustomerIdParam(context)

  const [mainTab, setMainTab] = useState<MainTab>("browse")
  const [browseSub, setBrowseSub] = useState<"field" | "product">("field")
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

  const browseFieldQuery = useBrowseAdvanceLinkFieldsByField(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "field",
  })
  const browseProductQuery = useBrowseAdvanceLinkFieldsByProduct(context, browseParams, {
    enabled: isOpen && mainTab === "browse" && browseSub === "product",
  })

  const linkByProductMutation = useAdvanceLinkByProduct()
  const bulkLinkMutation = useAdvanceBulkLinkFields()
  const linkFieldProductsMutation = useLinkFieldProducts()

  const [lfCategoryId, setLfCategoryId] = useState<string>("")
  const [lfSubcategoryId, setLfSubcategoryId] = useState<string>("")
  const [lfFieldId, setLfFieldId] = useState<number | null>(null)
  const [lfJump, setLfJump] = useState("")
  const [lfProductPage, setLfProductPage] = useState(1)
  const [lfProductQ, setLfProductQ] = useState("")
  const debouncedLfProductQ = useDebounce(lfProductQ, 300)
  const [lfPendingProductAdds, setLfPendingProductAdds] = useState<number[]>([])
  const [lfPendingProductRemoves, setLfPendingProductRemoves] = useState<number[]>([])

  const { data: categoriesBundle } = useAdvanceCategories(
    { per_page: 100, status: "Active" },
    { enabled: isOpen && mainTab === "linkByField" },
  )
  const categories = categoriesBundle?.data ?? []

  const selectedLfCategory = useMemo(
    () => categories.find((c: AdvanceCategory) => String(c.id) === lfCategoryId),
    [categories, lfCategoryId],
  )
  const lfSubcategories = selectedLfCategory?.subcategories ?? []

  const { data: lfFieldsBundle } = useAdvanceFields(
    lfSubcategoryId
      ? {
          per_page: 100,
          advance_subcategory_id: Number(lfSubcategoryId),
          ...(linkFieldsCustomerId != null ? { customer_id: linkFieldsCustomerId } : {}),
        }
      : undefined,
    { enabled: isOpen && mainTab === "linkByField" && !!lfSubcategoryId },
  )
  const lfFieldsList: AdvanceField[] = lfFieldsBundle?.data ?? []

  const { data: singleLfField } = useAdvanceField(
    lfFieldId && lfFieldId > 0 ? lfFieldId : 0,
    linkFieldsCustomerId ?? undefined,
  )

  const lfJumpLower = lfJump.trim().toLowerCase()
  const lfFieldsFiltered = lfJumpLower
    ? lfFieldsList.filter(
        (f) =>
          f.name.toLowerCase().includes(lfJumpLower) ||
          (f.advance_subcategory?.name || f.subcategory?.name || "")
            .toLowerCase()
            .includes(lfJumpLower),
      )
    : lfFieldsList

  const lfBaselineProductIds = useMemo(() => {
    const f = singleLfField?.data
    if (!f) return [] as number[]
    if (f.product_ids?.length) return f.product_ids.filter((x: unknown) => typeof x === "number")
    if (f.products?.length)
      return f.products
        .map((p: { id?: number }) => p.id)
        .filter((id): id is number => typeof id === "number")
    return []
  }, [singleLfField?.data])

  const lfLinkedProductsById = useMemo(() => {
    const map = new Map<number, { name: string; subcategoryName: string }>()
    const products = singleLfField?.data?.products
    if (!Array.isArray(products)) return map

    for (const p of products as Array<Record<string, unknown>>) {
      const rawId = p.id
      const id =
        typeof rawId === "number"
          ? rawId
          : typeof rawId === "string" && rawId.trim() !== ""
            ? Number(rawId)
            : NaN
      if (!Number.isFinite(id) || id <= 0) continue

      const subObj = (p.subcategory as { name?: string; category?: { name?: string } } | undefined) ?? undefined
      const subcategoryName =
        (typeof p.subcategory_name === "string" ? p.subcategory_name : undefined) ||
        subObj?.name ||
        subObj?.category?.name ||
        (typeof p.category_name === "string" ? p.category_name : undefined) ||
        "—"

      map.set(id, {
        name:
          (typeof p.name === "string" ? p.name : undefined) ||
          (typeof p.product_name === "string" ? p.product_name : undefined) ||
          `Product #${id}`,
        subcategoryName,
      })
    }
    return map
  }, [singleLfField?.data?.products])

  const lfProductsQuery = useQuery({
    queryKey: ["linkFieldsModalProducts", context, lfProductPage, debouncedLfProductQ],
    enabled: isOpen && mainTab === "linkByField" && !!lfFieldId,
    queryFn: () => fetchLibraryProductsPage({ page: lfProductPage, per_page: 10 }),
  })

  const lfCatalogRows = lfProductsQuery.data?.rows ?? []
  const lfCatalogFiltered = debouncedLfProductQ.trim()
    ? lfCatalogRows.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedLfProductQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedLfProductQ.toLowerCase()),
      )
    : lfCatalogRows

  const lfMergedLinkedIds = useMemo(() => {
    const removes = new Set(lfPendingProductRemoves)
    const base = lfBaselineProductIds.filter((id) => !removes.has(id))
    const adds = lfPendingProductAdds.filter((id) => !base.includes(id))
    return Array.from(new Set([...base, ...adds]))
  }, [lfBaselineProductIds, lfPendingProductAdds, lfPendingProductRemoves])

  const lfCatalogIdToRow = useMemo(() => new Map(lfCatalogRows.map((r) => [r.id, r])), [lfCatalogRows])

  const [lpCategoryKey, setLpCategoryKey] = useState<string>("")
  const [lpSubKey, setLpSubKey] = useState<string>("")
  const [lpProductId, setLpProductId] = useState<number | null>(null)
  const [lpJump, setLpJump] = useState("")
  const [lpFieldPage, setLpFieldPage] = useState(1)
  const [lpFieldQ, setLpFieldQ] = useState("")
  const debouncedLpFieldQ = useDebounce(lpFieldQ, 300)
  const [lpPendingFieldAdds, setLpPendingFieldAdds] = useState<number[]>([])
  const [lpPendingFieldRemoves, setLpPendingFieldRemoves] = useState<number[]>([])

  const lpProductsAllQuery = useQuery({
    queryKey: ["linkFieldsModalProductsCatalogGrouped", context],
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
    queryKey: ["libraryProductAdvanceLinkDetail", lpProductId, context],
    enabled: isOpen && mainTab === "linkByProduct" && !!lpProductId,
    queryFn: () => fetchLibraryProductDetailForAdvanceLinks(lpProductId!, context),
  })

  const lpLinkedFieldsRows = parseLinkedAdvanceFieldsFromProductPayload(
    lpProductDetailQuery.data ?? null,
  )

  const lpBaselineFieldIds = useMemo(
    () => lpLinkedFieldsRows.map((r) => r.advance_field_id),
    [lpLinkedFieldsRows],
  )

  const lpMergedFieldIds = useMemo(() => {
    const removes = new Set(lpPendingFieldRemoves)
    const base = lpBaselineFieldIds.filter((id) => !removes.has(id))
    const adds = lpPendingFieldAdds.filter((id) => !base.includes(id))
    return Array.from(new Set([...base, ...adds]))
  }, [lpBaselineFieldIds, lpPendingFieldAdds, lpPendingFieldRemoves])

  const { data: lpFieldsBundle } = useAdvanceFields(
    {
      page: lpFieldPage,
      per_page: 10,
      q: debouncedLpFieldQ.trim() || undefined,
      order_by: "name",
      sort_by: "asc",
      ...(linkFieldsCustomerId != null ? { customer_id: linkFieldsCustomerId } : {}),
    },
    { enabled: isOpen && mainTab === "linkByProduct" && !!lpProductId },
  )
  /** Catalog page for "Available fields" (Link by Product). Avoid a separate binding so dev bundles never reference a missing symbol. */
  const lpLinkByProductFieldsPage: AdvanceField[] = lpFieldsBundle?.data ?? []

  const lpAvailFieldById = useMemo(() => {
    const m = new Map<number, AdvanceField>()
    for (const f of lpLinkByProductFieldsPage) m.set(f.id, f)
    return m
  }, [lpLinkByProductFieldsPage])

  const lpHydrateAdvanceFieldIds = useMemo(() => {
    if (!lpProductId) return [] as number[]
    const uniq = [...new Set(lpMergedFieldIds)].filter((id) => id > 0 && Number.isFinite(id))
    return uniq.filter((fid) => {
      const fromProduct = lpLinkedFieldsRows.find((r) => r.advance_field_id === fid)
      return !fromProduct?.subcategory_name?.trim()
    })
  }, [lpProductId, lpMergedFieldIds, lpLinkedFieldsRows])

  const lpFieldHydrationQueries = useAdvanceFieldHydrationQueries(lpHydrateAdvanceFieldIds, {
    enabled:
      isOpen &&
      mainTab === "linkByProduct" &&
      !!lpProductId &&
      !lpProductDetailQuery.isLoading &&
      lpHydrateAdvanceFieldIds.length > 0,
  })

  const lpFieldHydrationById = useMemo(() => {
    const map = new Map<number, AdvanceField>()
    lpHydrateAdvanceFieldIds.forEach((requestedId, idx) => {
      const res = lpFieldHydrationQueries[idx]?.data
      const field = res?.data
      if (!field?.id || !Number.isFinite(field.id)) return
      map.set(Number(field.id), field)
      if (requestedId !== field.id) map.set(Number(requestedId), field)
    })
    return map
  }, [lpFieldHydrationQueries, lpHydrateAdvanceFieldIds])

  const [bulkFieldSelection, setBulkFieldSelection] = useState<number[]>([])
  const [bulkProductSelection, setBulkProductSelection] = useState<number[]>([])
  const [bulkFieldPage, setBulkFieldPage] = useState(1)
  const [bulkProductPage, setBulkProductPage] = useState(1)
  const [bulkFieldQ, setBulkFieldQ] = useState("")
  const [bulkProductQ, setBulkProductQ] = useState("")
  const debouncedBulkFieldQ = useDebounce(bulkFieldQ, 300)
  const debouncedBulkProductQ = useDebounce(bulkProductQ, 300)

  const bulkFieldsQuery = useAdvanceFields(
    {
      page: bulkFieldPage,
      per_page: 10,
      q: debouncedBulkFieldQ.trim() || undefined,
      order_by: "name",
      sort_by: "asc",
      ...(linkFieldsCustomerId != null ? { customer_id: linkFieldsCustomerId } : {}),
    },
    { enabled: isOpen && mainTab === "bulk" },
  )

  const bulkProductsQuery = useQuery({
    queryKey: ["linkFieldsBulkProducts", context, bulkProductPage, debouncedBulkProductQ],
    enabled: isOpen && mainTab === "bulk",
    queryFn: () => fetchLibraryProductsPage({ page: bulkProductPage, per_page: 10 }),
  })

  const bulkFieldsRows = bulkFieldsQuery.data?.data ?? []
  const bulkProductRowsRaw = bulkProductsQuery.data?.rows ?? []
  const bulkProductRowsFiltered = debouncedBulkProductQ.trim()
    ? bulkProductRowsRaw.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedBulkProductQ.toLowerCase()) ||
          r.subcategoryName.toLowerCase().includes(debouncedBulkProductQ.toLowerCase()),
      )
    : bulkProductRowsRaw
  const bulkFieldTotal = bulkFieldsQuery.data?.total ?? 0
  const bulkFieldPerPage = bulkFieldsQuery.data?.per_page ?? 10
  const bulkFieldTotalPages = Math.max(1, bulkFieldsQuery.data?.last_page ?? 1)
  const bulkProductTotal = bulkProductsQuery.data?.pagination.total ?? 0
  const bulkProductPerPage = 10
  const bulkProductTotalPages = Math.max(1, bulkProductsQuery.data?.pagination.last_page ?? 1)

  const getPaginationPages = (currentPage: number, totalPages: number) => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (fieldIdProp) {
      setMainTab("linkByField")
      setLfFieldId(fieldIdProp)
    } else {
      setMainTab("browse")
    }
  }, [isOpen, fieldIdProp])

  useEffect(() => {
    if (!isOpen || !fieldIdProp || !singleLfField?.data) return
    const f = singleLfField.data
    const catId = f.advance_category_id ?? f.category?.id
    const subId = f.advance_subcategory_id ?? f.advance_subcategory?.id ?? f.subcategory?.id
    if (catId) setLfCategoryId(String(catId))
    if (subId) setLfSubcategoryId(String(subId))
  }, [isOpen, fieldIdProp, singleLfField?.data])

  useEffect(() => {
    if (!isOpen) {
      setBrowsePage(1)
      setBrowseQ("")
      setLfPendingProductAdds([])
      setLfPendingProductRemoves([])
      setLpPendingFieldAdds([])
      setLpPendingFieldRemoves([])
      setBulkFieldSelection([])
      setBulkProductSelection([])
      setLfFieldId(null)
      setLfCategoryId("")
      setLfSubcategoryId("")
      setLpProductId(null)
      setLpCategoryKey("")
      setLpSubKey("")
    }
  }, [isOpen])

  useEffect(() => {
    setBrowsePage(1)
  }, [debouncedBrowseQ, browseSub, mainTab])

  useEffect(() => {
    setLfProductPage(1)
  }, [debouncedLfProductQ])

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

  const handleApplyLinkByField = async () => {
    if (!lfFieldId) {
      toast({ title: "Select a field", variant: "destructive" })
      return
    }
    if (onApply) {
      onApply([lfFieldId], lfMergedLinkedIds)
      onClose()
      return
    }
    setIsSubmitting(true)
    try {
      const sortedBaseline = [...lfBaselineProductIds].sort((a, b) => a - b)
      const sortedMerged = [...lfMergedLinkedIds].sort((a, b) => a - b)
      const same =
        sortedBaseline.length === sortedMerged.length &&
        sortedBaseline.every((id, i) => id === sortedMerged[i])

      if (same) {
        toast({ title: "No changes to apply" })
        setIsSubmitting(false)
        return
      }

      await linkFieldProductsMutation.mutateAsync({
        id: lfFieldId,
        product_ids: lfMergedLinkedIds,
        customer_id: linkProductsQueryCustomer(context),
      })
      toast({ title: "Links updated" })
      await queryClient.invalidateQueries({ queryKey: ["advanceField", lfFieldId] })
      setLfPendingProductAdds([])
      setLfPendingProductRemoves([])
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
    if (onApply) {
      onApply(lpMergedFieldIds, [lpProductId])
      onClose()
      return
    }
    setIsSubmitting(true)
    try {
      const customer = bodyCustomer(context)
      const sortedBaseline = [...lpBaselineFieldIds].sort((a, b) => a - b)
      const sortedMerged = [...lpMergedFieldIds].sort((a, b) => a - b)
      const same =
        sortedBaseline.length === sortedMerged.length &&
        sortedBaseline.every((id, i) => id === sortedMerged[i])

      if (same) {
        toast({ title: "No changes to apply" })
        setIsSubmitting(false)
        return
      }

      const baseline = new Set(lpBaselineFieldIds)
      const merged = new Set(lpMergedFieldIds)
      const toAddField = [...merged].filter((id) => !baseline.has(id))
      const toRemoveField = [...baseline].filter((id) => !merged.has(id))

      if (toAddField.length) {
        await linkByProductMutation.mutateAsync({
          product_id: lpProductId,
          field_ids: toAddField,
          ...customer,
        })
      }

      for (const fid of toRemoveField) {
        const fieldRes = await queryClient.fetchQuery({
          queryKey: ["advanceField", fid, undefined],
          queryFn: async () => {
            const r = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/advance/fields/${fid}`,
              { headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" } },
            )
            const j = await r.json()
            return j.data || j
          },
        })
        const f = fieldRes as AdvanceField
        const linked = (f.product_ids ||
          f.products?.map((p: { id: number }) => p.id) ||
          []) as number[]
        const next = linked.filter((pid: number) => pid !== lpProductId)
        await linkFieldProductsMutation.mutateAsync({
          id: fid,
          product_ids: next,
          customer_id: linkProductsQueryCustomer(context),
        })
      }

      toast({ title: "Links updated" })
      for (const fid of toRemoveField) {
        await queryClient.invalidateQueries({ queryKey: ["advanceField", fid] })
      }
      await queryClient.invalidateQueries({ queryKey: ["libraryProductAdvanceLinkDetail", lpProductId, context] })
      setLpPendingFieldAdds([])
      setLpPendingFieldRemoves([])
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkApply = async () => {
    if (!bulkFieldSelection.length || !bulkProductSelection.length) {
      toast({ title: "Select fields and products", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      await bulkLinkMutation.mutateAsync({
        field_ids: bulkFieldSelection,
        product_ids: bulkProductSelection,
        ...bodyCustomer(context),
      })
      toast({ title: "Bulk links created successfully" })
      setBulkFieldSelection([])
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
    if (mainTab === "linkByField") {
      await handleApplyLinkByField()
      return
    }
    if (mainTab === "linkByProduct") {
      await handleApplyLinkByProduct()
      return
    }
    await handleBulkApply()
  }

  const openLinkFieldFromBrowse = (id: number) => {
    setLfFieldId(id)
    setMainTab("linkByField")
    setLfPendingProductAdds([])
    setLfPendingProductRemoves([])
  }

  const openLinkProductFromBrowse = (id: number) => {
    setLpProductId(id)
    setLpCategoryKey("")
    setLpSubKey("")
    setMainTab("linkByProduct")
    setLpPendingFieldAdds([])
    setLpPendingFieldRemoves([])
  }

  const browseRowsField = browseFieldQuery.data?.rows ?? []
  const browseRowsProduct = browseProductQuery.data?.rows ?? []
  const browsePagination =
    browseSub === "field"
      ? browseFieldQuery.data?.pagination
      : browseProductQuery.data?.pagination
  const browseTotalPages = Math.max(1, browsePagination?.last_page ?? 1)
  const browseTotalEntries = browsePagination?.total ?? 0
  const browseLoading = browseSub === "field" ? browseFieldQuery.isLoading : browseProductQuery.isLoading
  const browseHasPages = browseTotalEntries > 0
  const browseRowCount =
    browseSub === "field" ? browseRowsField.length : browseRowsProduct.length
  const browseEmptyLoaded = !browseLoading && browseRowCount === 0

  const bulkMaxPairs = bulkFieldSelection.length * bulkProductSelection.length

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
            <DialogTitle className="text-lg font-semibold">Link Fields</DialogTitle>
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
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-shrink-0 border-b px-4 pt-2 sm:px-6">
            <TabsList className="h-9 bg-transparent p-0 gap-4 rounded-none w-full justify-start">
              {(
                [
                  ["browse", "Browse Linked"],
                  ["linkByProduct", "Link by Product"],
                  ["linkByField", "Link by Field"],
                  ["bulk", "Bulk Link"],
                ] as const
              ).map(([id, label]) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1162a8] data-[state=active]:bg-transparent px-1 pb-2 text-sm"
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
            {/* Grid avoids flex/min-h-0 collapse: toolbar | scroll region | pagination locked under the list */}
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
              <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <div className="flex rounded-full border border-gray-200/90 bg-gray-100/90 p-0.5">
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        browseSub === "field"
                          ? "bg-white text-[#1162a8] shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                      onClick={() => setBrowseSub("field")}
                    >
                      Browse by Field
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        browseSub === "product"
                          ? "bg-white text-[#1162a8] shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                      onClick={() => setBrowseSub("product")}
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
                      placeholder={browseSub === "field" ? "Search Field" : "Search Product"}
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
                    {browseSub === "field"
                      ? "No fields match your filters."
                      : "No products match your filters."}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200">
                    <Table className="w-full table-fixed text-sm [&_tbody_tr:last-child_td]:border-b-0">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 bg-gray-50/95 hover:bg-gray-50/95 [&>th]:border-b-0">
                          {browseSub === "field" ? (
                            <>
                              <TableHead
                                className="sticky top-0 z-[1] w-[26%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("name")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Field name <ArrowUpDown className="h-3 w-3 shrink-0" />
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
                                Linked fields
                              </TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {browseSub === "field"
                          ? browseRowsField.map((row) => (
                              <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                <TableCell className="min-w-0 break-words font-medium leading-snug">{row.name}</TableCell>
                                <TableCell className="min-w-0 break-words text-gray-600 leading-snug">
                                  {row.subcategory_name}
                                </TableCell>
                                <TableCell className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-start gap-1">
                                    {(row.linked_products_preview ?? []).map((p) => (
                                      <Badge
                                        key={p.id}
                                        variant="secondary"
                                        className="max-w-[10rem] shrink rounded-md truncate text-[10px] font-normal"
                                        title={p.name}
                                      >
                                        {p.name}
                                      </Badge>
                                    ))}
                                    {row.linked_products_more_count > 0 ? (
                                      <Badge variant="outline" className="shrink-0 text-[10px]">
                                        +{row.linked_products_more_count} more
                                      </Badge>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="shrink-0 text-[#1162a8] hover:opacity-80"
                                      onClick={() => openLinkFieldFromBrowse(row.id)}
                                      aria-label="Add links for field"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          : browseRowsProduct.map((row) => (
                              <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                <TableCell className="min-w-0 break-words font-medium leading-snug">{row.name}</TableCell>
                                <TableCell className="min-w-0 break-words text-gray-600 leading-snug">
                                  {row.subcategory_name}
                                </TableCell>
                                <TableCell className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-start gap-1">
                                    {(row.linked_fields_preview ?? []).map((f) => (
                                      <Badge
                                        key={f.id}
                                        variant="secondary"
                                        className="max-w-[10rem] shrink rounded-md truncate text-[10px] font-normal"
                                        title={f.name}
                                      >
                                        {f.name}
                                      </Badge>
                                    ))}
                                    {row.linked_fields_more_count > 0 ? (
                                      <Badge variant="outline" className="shrink-0 text-[10px]">
                                        +{row.linked_fields_more_count} more
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
                    {browseTotalEntries === 0
                      ? 0
                      : (browsePage - 1) * browsePerPage + 1}{" "}
                    to{" "}
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
                        if (browseTotalPages <= 5) {
                          pageNum = i + 1
                        } else if (browsePage <= 3) {
                          pageNum = i + 1
                        } else if (browsePage >= browseTotalPages - 2) {
                          pageNum = browseTotalPages - 4 + i
                        } else {
                          pageNum = browsePage - 2 + i
                        }

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

          <TabsContent value="linkByField" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
            <div className="px-6 py-3 border-b flex flex-wrap gap-3 items-center">
              <Select
                value={lfCategoryId}
                onValueChange={(v) => {
                  setLfCategoryId(v)
                  setLfSubcategoryId("")
                  setLfFieldId(null)
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: AdvanceCategory) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={lfSubcategoryId}
                disabled={!lfCategoryId}
                onValueChange={(v) => {
                  setLfSubcategoryId(v)
                  setLfFieldId(null)
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Sub category" />
                </SelectTrigger>
                <SelectContent>
                  {lfSubcategories.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={lfFieldId ? String(lfFieldId) : ""}
                disabled={!lfSubcategoryId}
                onValueChange={(v) => {
                  const id = Number(v)
                  setLfFieldId(Number.isFinite(id) ? id : null)
                  setLfPendingProductAdds([])
                  setLfPendingProductRemoves([])
                }}
              >
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {lfFieldsFiltered.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-600">
                {lfFieldId ? `${lfMergedLinkedIds.length} product(s) linked` : "Select a field"}
              </span>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 h-9 text-xs"
                  placeholder="Jump to field…"
                  value={lfJump}
                  onChange={(e) => setLfJump(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-1 min-h-0 border-t">
              <div className="w-1/2 flex flex-col border-r min-h-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium border-b">Available products</div>
                <div className="px-3 py-2 border-b flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-7 h-8 text-xs"
                      placeholder="Search product"
                      value={lfProductQ}
                      onChange={(e) => setLfProductQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="text-gray-400 p-1" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {!lfFieldId ? (
                    <p className="p-4 text-xs text-gray-500">Pick a field to load products.</p>
                  ) : lfProductsQuery.isLoading ? (
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
                        {lfCatalogFiltered.map((r) => {
                          const onLinked = lfMergedLinkedIds.includes(r.id)
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
                                      setLfPendingProductAdds((prev) =>
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
                <div className="px-3 py-2 border-t flex justify-between items-center text-[11px] text-gray-600">
                  <span>Page {lfProductPage}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={lfProductPage <= 1}
                      onClick={() => setLfProductPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={lfProductPage >= (lfProductsQuery.data?.pagination.last_page || 1)}
                      onClick={() => setLfProductPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-1/2 flex flex-col min-h-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium border-b">Linked products</div>
                <div className="flex-1 overflow-auto">
                  {!lfFieldId ? (
                    <p className="p-4 text-xs text-gray-500">No field selected.</p>
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
                        {lfMergedLinkedIds.map((pid) => {
                          const linkedProduct = lfLinkedProductsById.get(pid)
                          const row = lfCatalogIdToRow.get(pid)
                          const name =
                            linkedProduct?.name ||
                            row?.name ||
                            browseRowsProduct.find((x) => x.id === pid)?.name ||
                            `Product #${pid}`
                          const sub =
                            linkedProduct?.subcategoryName ||
                            row?.subcategoryName ||
                            browseRowsProduct.find((x) => x.id === pid)?.subcategory_name ||
                            "—"
                          return (
                            <TableRow key={pid}>
                              <TableCell className="text-xs font-medium">{name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{sub}</TableCell>
                              <TableCell className="text-right space-x-1">
                                <button type="button" className="text-gray-400 p-1 opacity-60 cursor-not-allowed">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-red-600 p-1"
                                  onClick={() => {
                                    if (lfBaselineProductIds.includes(pid)) {
                                      setLfPendingProductRemoves((prev) =>
                                        prev.includes(pid) ? prev : [...prev, pid],
                                      )
                                    }
                                    setLfPendingProductAdds((prev) => prev.filter((x) => x !== pid))
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

          <TabsContent value="linkByProduct" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
            <div className="px-6 py-3 border-b flex flex-wrap gap-3 items-center">
              <Select
                value={lpCategoryKey}
                onValueChange={(v) => {
                  setLpCategoryKey(v)
                  setLpSubKey("")
                  setLpProductId(null)
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
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
                <SelectTrigger className="w-[180px] h-9 text-xs">
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
                  setLpPendingFieldAdds([])
                  setLpPendingFieldRemoves([])
                }}
              >
                <SelectTrigger className="w-[200px] h-9 text-xs">
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
                {lpProductId ? `${lpMergedFieldIds.length} field(s) linked` : "Select a product"}
              </span>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 h-9 text-xs"
                  placeholder="Jump to product…"
                  value={lpJump}
                  onChange={(e) => setLpJump(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-1 min-h-0 border-t">
              <div className="w-1/2 flex flex-col border-r min-h-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium border-b">Available fields</div>
                <div className="px-3 py-2 border-b flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-7 h-8 text-xs"
                      placeholder="Search fields"
                      value={lpFieldQ}
                      onChange={(e) => setLpFieldQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="text-gray-400 p-1" aria-hidden>
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
                          <TableHead className="text-xs">Field name</TableHead>
                          <TableHead className="text-xs">Sub category</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lpLinkByProductFieldsPage
                          .filter((f) => {
                            if (!lpJump.trim()) return true
                            const q = lpJump.toLowerCase()
                            return (
                              f.name.toLowerCase().includes(q) ||
                              (f.advance_subcategory?.name || f.subcategory?.name || "")
                                .toLowerCase()
                                .includes(q)
                            )
                          })
                          .map((f) => {
                            const sub = f.advance_subcategory?.name || f.subcategory?.name || "—"
                            const onLinked = lpMergedFieldIds.includes(f.id)
                            return (
                              <TableRow key={f.id}>
                                <TableCell className="text-xs font-medium">{f.name}</TableCell>
                                <TableCell className="text-xs text-gray-600">{sub}</TableCell>
                                <TableCell>
                                  {!onLinked ? (
                                    <button
                                      type="button"
                                      className="text-[#1162a8]"
                                      onClick={() =>
                                        setLpPendingFieldAdds((prev) =>
                                          prev.includes(f.id) ? prev : [...prev, f.id],
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
                <div className="px-3 py-2 border-t flex justify-between text-[11px] text-gray-600">
                  <span>
                    Page {lpFieldPage} / {lpFieldsBundle?.last_page ?? 1}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={lpFieldPage <= 1}
                      onClick={() => setLpFieldPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={lpFieldPage >= (lpFieldsBundle?.last_page ?? 1)}
                      onClick={() => setLpFieldPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-1/2 flex flex-col min-h-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium border-b">Linked fields</div>
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
                          <TableHead className="text-xs">Field name</TableHead>
                          <TableHead className="text-xs">Sub category</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lpMergedFieldIds.map((fid) => {
                          const row = lpLinkedFieldsRows.find((r) => r.advance_field_id === fid)
                          const hydrated = lpFieldHydrationById.get(fid)
                          const avail = lpAvailFieldById.get(fid)

                          const name =
                            row?.field_name?.trim() ||
                            hydrated?.name?.trim() ||
                            avail?.name?.trim() ||
                            browseRowsField.find((x) => x.id === fid)?.name ||
                            `Field #${fid}`
                          const sub =
                            row?.subcategory_name?.trim() ||
                            hydrated?.advance_subcategory?.name?.trim() ||
                            hydrated?.subcategory?.name?.trim() ||
                            browseRowsField.find((x) => x.id === fid)?.subcategory_name?.trim() ||
                            avail?.advance_subcategory?.name?.trim() ||
                            avail?.subcategory?.name?.trim() ||
                            "—"
                          return (
                            <TableRow key={fid}>
                              <TableCell className="text-xs font-medium">{name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{sub}</TableCell>
                              <TableCell className="text-right space-x-1">
                                <button type="button" className="text-gray-400 p-1 opacity-60 cursor-not-allowed">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-red-600 p-1"
                                  onClick={() => {
                                    if (lpBaselineFieldIds.includes(fid)) {
                                      setLpPendingFieldRemoves((prev) =>
                                        prev.includes(fid) ? prev : [...prev, fid],
                                      )
                                    }
                                    setLpPendingFieldAdds((prev) => prev.filter((x) => x !== fid))
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

          <TabsContent value="bulk" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
            <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-900">
              Bulk link only adds links between fields and products. To remove links, use Link by Product or Link by
              Field.
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="w-1/2 flex flex-col border-r min-h-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium border-b">Pick fields</div>
                <div className="px-3 py-2 border-b flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-7 h-8 text-xs"
                      placeholder="Search fields"
                      value={bulkFieldQ}
                      onChange={(e) => setBulkFieldQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="text-gray-400 p-1" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="w-10" />
                        <TableHead className="text-xs">Field name</TableHead>
                        <TableHead className="text-xs">Sub category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkFieldsRows.map((f: AdvanceField) => {
                        const sub = f.advance_subcategory?.name || f.subcategory?.name || "—"
                        const checked = bulkFieldSelection.includes(f.id)
                        return (
                          <TableRow key={f.id}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) =>
                                  setBulkFieldSelection((prev) =>
                                    c === true ? [...prev, f.id] : prev.filter((x) => x !== f.id),
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-xs font-medium">{f.name}</TableCell>
                            <TableCell className="text-xs text-gray-600">{sub}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-3 py-2 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-600">
                  <span>
                    Showing {bulkFieldTotal === 0 ? 0 : (bulkFieldPage - 1) * bulkFieldPerPage + 1} to{" "}
                    {Math.min(bulkFieldPage * bulkFieldPerPage, bulkFieldTotal)} of {bulkFieldTotal} entries
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={bulkFieldPage <= 1}
                      onClick={() => setBulkFieldPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous fields page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {getPaginationPages(bulkFieldPage, bulkFieldTotalPages).map((pageNum) => (
                      <button
                        key={`bulk-field-page-${pageNum}`}
                        type="button"
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-[11px] transition-colors",
                          bulkFieldPage === pageNum
                            ? "bg-[#1162a8] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                        onClick={() => setBulkFieldPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={bulkFieldPage >= bulkFieldTotalPages}
                      onClick={() => setBulkFieldPage((p) => Math.min(bulkFieldTotalPages, p + 1))}
                      aria-label="Next fields page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-1/2 flex flex-col min-h-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium border-b">Pick products</div>
                <div className="px-3 py-2 border-b flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-7 h-8 text-xs"
                      placeholder="Search products"
                      value={bulkProductQ}
                      onChange={(e) => setBulkProductQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="text-gray-400 p-1" aria-hidden>
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
                <div className="px-3 py-2 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-600">
                  <span>
                    Showing {bulkProductTotal === 0 ? 0 : (bulkProductPage - 1) * bulkProductPerPage + 1} to{" "}
                    {Math.min(bulkProductPage * bulkProductPerPage, bulkProductTotal)} of {bulkProductTotal} entries
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          "h-7 w-7 rounded-full flex items-center justify-center text-[11px] transition-colors",
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
                      className="h-7 w-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="px-6 py-2 border-t bg-amber-50/90 text-center text-xs text-amber-950">
              Link {bulkFieldSelection.length} field{bulkFieldSelection.length !== 1 ? "s" : ""} to{" "}
              {bulkProductSelection.length} product
              {bulkProductSelection.length !== 1 ? "s" : ""}
              {bulkMaxPairs ? ` · up to ${bulkMaxPairs} pair combinations (existing links skipped on server)` : ""}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 border-t px-4 py-4 sm:px-6">
          <div className="flex justify-between w-full">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
              disabled={
                isSubmitting ||
                (mainTab === "browse" &&
                  false) /* always allow Done */ ||
                (mainTab === "linkByField" && !lfFieldId) ||
                (mainTab === "linkByProduct" && !lpProductId) ||
                (mainTab === "bulk" &&
                  (!bulkFieldSelection.length || !bulkProductSelection.length))
              }
              onClick={() => void handlePrimaryFooter()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
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
