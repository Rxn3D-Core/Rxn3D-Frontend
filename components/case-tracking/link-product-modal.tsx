"use client"

import { useEffect, useMemo, useState } from "react"
import {
  X,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Maximize2,
  Minimize2,
  Filter,
  ArrowUpDown,
  Pencil,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/lib/performance-utils"
import { cn } from "@/lib/utils"

interface LinkProductModalProps {
  isOpen: boolean
  onClose: () => void
  casePanId?: number
  casePanName?: string
}

interface CasePanRow {
  id: number
  name: string
  code: string
  color_code: string
  status: string
}

interface LinkedItem {
  id: number
  name: string
  code?: string
}

interface Subcategory {
  id: number
  name: string
  code: string
  category?: { id: number; name: string }
}

type MainTab = "browse" | "linkByCategory" | "linkByCasePan" | "bulk"
type BrowseSub = "casePan" | "category"
type AssignmentsMaps = {
  subcategories: Record<number, LinkedItem[]>
  products: Record<number, LinkedItem[]>
  stages: Record<number, LinkedItem[]>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

const getCustomerId = (user: any): number | null => {
  if (typeof window === "undefined") return null
  const storedCustomerId = localStorage.getItem("customerId")
  if (storedCustomerId) return parseInt(storedCustomerId, 10)
  if (user?.customers?.length) return user.customers[0].id
  if (user?.customer_id) return user.customer_id
  if (user?.customer?.id) return user.customer.id
  return null
}

const getAuthToken = () => {
  const token = localStorage.getItem("token")
  if (!token) throw new Error("Authentication token not found.")
  return token
}

function pageSelectChecked(pageIds: number[], selected: number[]): boolean | "indeterminate" {
  if (pageIds.length === 0) return false
  const selectedCount = pageIds.filter((id) => selected.includes(id)).length
  if (selectedCount === 0) return false
  if (selectedCount === pageIds.length) return true
  return "indeterminate"
}

function togglePageIds(prev: number[], pageIds: number[], select: boolean): number[] {
  if (select) return Array.from(new Set([...prev, ...pageIds]))
  const remove = new Set(pageIds)
  return prev.filter((id) => !remove.has(id))
}

function PaginationBar({
  page,
  perPage,
  total,
  onPageChange,
}: {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1)
  const hasPages = total > 0
  return (
    <div className="flex flex-shrink-0 flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
      <div className="text-sm text-gray-600">
        Showing {total === 0 ? 0 : (page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total}{" "}
        entries
      </div>
      {hasPages ? (
        <div className="flex items-center justify-center gap-0.5 sm:justify-end">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) pageNum = i + 1
            else if (page <= 3) pageNum = i + 1
            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
            else pageNum = page - 2 + i
            return (
              <button
                type="button"
                key={`page-${i}-${pageNum}`}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  page === pageNum
                    ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function LinkProductModal({ isOpen, onClose, casePanId, casePanName }: LinkProductModalProps) {
  const { t } = useTranslation()
  const { getAssignments, setAssignments } = useCaseTracking()
  const { user } = useAuth()
  const { toast } = useToast()

  const [mainTab, setMainTab] = useState<MainTab>("browse")
  const [browseSub, setBrowseSub] = useState<BrowseSub>("casePan")
  const [linkModalExpanded, setLinkModalExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const [casePans, setCasePans] = useState<CasePanRow[]>([])
  const [categories, setCategories] = useState<Subcategory[]>([])
  const [assignments, setAssignmentsState] = useState<AssignmentsMaps>({
    subcategories: {},
    products: {},
    stages: {},
  })

  const [browseQ, setBrowseQ] = useState("")
  const debouncedBrowseQ = useDebounce(browseQ, 300)
  const [browsePage, setBrowsePage] = useState(1)
  const [browsePerPage, setBrowsePerPage] = useState(10)
  const [browseOrderBy, setBrowseOrderBy] = useState<"name" | "code">("name")
  const [browseSort, setBrowseSort] = useState<"asc" | "desc">("asc")

  // Link by Case Pan
  const [lcCasePanId, setLcCasePanId] = useState<number | null>(null)
  const [lcJump, setLcJump] = useState("")
  const debouncedLcJump = useDebounce(lcJump, 300)
  const [lcCategoryQ, setLcCategoryQ] = useState("")
  const debouncedLcCategoryQ = useDebounce(lcCategoryQ, 300)
  const [lcBaselineIds, setLcBaselineIds] = useState<number[]>([])
  const [lcPendingAdds, setLcPendingAdds] = useState<number[]>([])
  const [lcPendingRemoves, setLcPendingRemoves] = useState<number[]>([])

  // Link by Category
  const [lbCategoryId, setLbCategoryId] = useState<number | null>(null)
  const [lbJump, setLbJump] = useState("")
  const debouncedLbJump = useDebounce(lbJump, 300)
  const [lbCasePanQ, setLbCasePanQ] = useState("")
  const debouncedLbCasePanQ = useDebounce(lbCasePanQ, 300)
  const [lbBaselineIds, setLbBaselineIds] = useState<number[]>([])
  const [lbPendingAdds, setLbPendingAdds] = useState<number[]>([])
  const [lbPendingRemoves, setLbPendingRemoves] = useState<number[]>([])

  // Bulk
  const [bulkCasePanSelection, setBulkCasePanSelection] = useState<number[]>([])
  const [bulkCategorySelection, setBulkCategorySelection] = useState<number[]>([])
  const [bulkCasePanQ, setBulkCasePanQ] = useState("")
  const [bulkCategoryQ, setBulkCategoryQ] = useState("")
  const debouncedBulkCasePanQ = useDebounce(bulkCasePanQ, 300)
  const debouncedBulkCategoryQ = useDebounce(bulkCategoryQ, 300)

  const resetTransient = () => {
    setMainTab(casePanId ? "linkByCasePan" : "browse")
    setBrowseSub("casePan")
    setLinkModalExpanded(false)
    setBrowseQ("")
    setBrowsePage(1)
    setBrowseOrderBy("name")
    setBrowseSort("asc")
    setLcCasePanId(casePanId ?? null)
    setLcJump("")
    setLcCategoryQ("")
    setLcBaselineIds([])
    setLcPendingAdds([])
    setLcPendingRemoves([])
    setLbCategoryId(null)
    setLbJump("")
    setLbCasePanQ("")
    setLbBaselineIds([])
    setLbPendingAdds([])
    setLbPendingRemoves([])
    setBulkCasePanSelection([])
    setBulkCategorySelection([])
    setBulkCasePanQ("")
    setBulkCategoryQ("")
  }

  const loadAll = async (customerId: number) => {
    const [assignmentsData, categoriesData] = await Promise.all([
      getAssignments(customerId),
      (async () => {
        const token = getAuthToken()
        const aggregated: Subcategory[] = []
        let page = 1
        let last = 1
        do {
          const response = await fetch(
            `${API_BASE_URL}/library/subcategories?customer_id=${customerId}&status=Active&per_page=100&page=${page}&order_by=name&sort_by=asc`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          )
          if (!response.ok) throw new Error("Failed to fetch categories")
          const json = await response.json()
          const rows = json.data?.data || []
          aggregated.push(...rows)
          last = json.data?.pagination?.last_page || 1
          page += 1
        } while (page <= last)
        return aggregated
      })(),
    ])

    const nextAssignments: AssignmentsMaps = {
      subcategories: assignmentsData.assignments?.subcategories || {},
      products: assignmentsData.assignments?.products || {},
      stages: assignmentsData.assignments?.stages || {},
    }
    const pans: CasePanRow[] = assignmentsData.case_pans || []
    setCasePans(pans)
    setAssignmentsState(nextAssignments)
    setCategories(categoriesData)
    return { pans, assignments: nextAssignments, categories: categoriesData }
  }

  useEffect(() => {
    if (!isOpen) {
      resetTransient()
      return
    }
    const customerId = getCustomerId(user)
    if (!customerId) {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.customerIdRequired", "Customer ID is required"),
        variant: "destructive",
      })
      return
    }

    setIsLoadingData(true)
    loadAll(customerId)
      .then(({ pans, assignments: next }) => {
        if (casePanId) {
          setMainTab("linkByCasePan")
          setLcCasePanId(casePanId)
          const linked = (next.subcategories[casePanId] || []).map((item) => item.id)
          setLcBaselineIds(linked)
          setLcPendingAdds([])
          setLcPendingRemoves([])
        }
        if (!pans.length) return
      })
      .catch((error: any) => {
        toast({
          title: t("error") || "Error",
          description: error.message || t("caseTracking.failedToFetchData", "Failed to fetch data"),
          variant: "destructive",
        })
      })
      .finally(() => setIsLoadingData(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, casePanId])

  /** categoryId -> case pans linked */
  const categoryToCasePans = useMemo(() => {
    const map = new Map<number, CasePanRow[]>()
    for (const pan of casePans) {
      for (const cat of assignments.subcategories[pan.id] || []) {
        const list = map.get(cat.id) || []
        if (!list.some((p) => p.id === pan.id)) list.push(pan)
        map.set(cat.id, list)
      }
    }
    return map
  }, [casePans, assignments])

  const browseCasePanRows = useMemo(() => {
    const q = debouncedBrowseQ.trim().toLowerCase()
    let rows = casePans.map((pan) => ({
      ...pan,
      linked: assignments.subcategories[pan.id] || [],
    }))
    if (q) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.code.toLowerCase().includes(q) ||
          row.linked.some((item) => item.name.toLowerCase().includes(q)),
      )
    }
    rows = [...rows].sort((a, b) => {
      const av = (browseOrderBy === "code" ? a.code : a.name).toLowerCase()
      const bv = (browseOrderBy === "code" ? b.code : b.name).toLowerCase()
      const cmp = av.localeCompare(bv)
      return browseSort === "asc" ? cmp : -cmp
    })
    return rows
  }, [casePans, assignments, debouncedBrowseQ, browseOrderBy, browseSort])

  const browseCategoryRows = useMemo(() => {
    const q = debouncedBrowseQ.trim().toLowerCase()
    let rows = categories.map((cat) => ({
      ...cat,
      linked: categoryToCasePans.get(cat.id) || [],
      parentName: cat.category?.name || "—",
    }))
    if (q) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.parentName.toLowerCase().includes(q) ||
          row.linked.some((item) => item.name.toLowerCase().includes(q)),
      )
    }
    rows = [...rows].sort((a, b) => {
      const av = (browseOrderBy === "code" ? a.parentName : a.name).toLowerCase()
      const bv = (browseOrderBy === "code" ? b.parentName : b.name).toLowerCase()
      const cmp = av.localeCompare(bv)
      return browseSort === "asc" ? cmp : -cmp
    })
    return rows
  }, [categories, categoryToCasePans, debouncedBrowseQ, browseOrderBy, browseSort])

  const browseSource = browseSub === "casePan" ? browseCasePanRows : browseCategoryRows
  const browseTotalEntries = browseSource.length
  const browseTotalPages = Math.max(1, Math.ceil(browseTotalEntries / browsePerPage) || 1)
  const browsePageRows = browseSource.slice((browsePage - 1) * browsePerPage, browsePage * browsePerPage)

  useEffect(() => {
    setBrowsePage(1)
  }, [debouncedBrowseQ, browsePerPage, browseSub])

  const toggleBrowseSort = (field: "name" | "code") => {
    if (browseOrderBy === field) setBrowseSort((s) => (s === "asc" ? "desc" : "asc"))
    else {
      setBrowseOrderBy(field)
      setBrowseSort("asc")
    }
  }

  const lcMergedLinkedIds = useMemo(() => {
    const set = new Set(lcBaselineIds.filter((id) => !lcPendingRemoves.includes(id)))
    lcPendingAdds.forEach((id) => set.add(id))
    return Array.from(set)
  }, [lcBaselineIds, lcPendingAdds, lcPendingRemoves])

  const lbMergedLinkedIds = useMemo(() => {
    const set = new Set(lbBaselineIds.filter((id) => !lbPendingRemoves.includes(id)))
    lbPendingAdds.forEach((id) => set.add(id))
    return Array.from(set)
  }, [lbBaselineIds, lbPendingAdds, lbPendingRemoves])

  useEffect(() => {
    if (!lcCasePanId) {
      setLcBaselineIds([])
      setLcPendingAdds([])
      setLcPendingRemoves([])
      return
    }
    const linked = (assignments.subcategories[lcCasePanId] || []).map((item) => item.id)
    setLcBaselineIds(linked)
    setLcPendingAdds([])
    setLcPendingRemoves([])
  }, [lcCasePanId, assignments])

  useEffect(() => {
    if (!lbCategoryId) {
      setLbBaselineIds([])
      setLbPendingAdds([])
      setLbPendingRemoves([])
      return
    }
    const linked = (categoryToCasePans.get(lbCategoryId) || []).map((item) => item.id)
    setLbBaselineIds(linked)
    setLbPendingAdds([])
    setLbPendingRemoves([])
  }, [lbCategoryId, categoryToCasePans])

  const casePanChoices = useMemo(() => {
    const q = debouncedLcJump.trim().toLowerCase()
    if (!q) return casePans
    return casePans.filter(
      (pan) => pan.name.toLowerCase().includes(q) || pan.code.toLowerCase().includes(q),
    )
  }, [casePans, debouncedLcJump])

  const categoryChoices = useMemo(() => {
    const q = debouncedLbJump.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.category?.name || "").toLowerCase().includes(q),
    )
  }, [categories, debouncedLbJump])

  const lcAvailableCategories = useMemo(() => {
    const q = debouncedLcCategoryQ.trim().toLowerCase()
    return categories.filter((cat) => {
      if (q && !cat.name.toLowerCase().includes(q) && !(cat.category?.name || "").toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [categories, debouncedLcCategoryQ])

  const lbAvailableCasePans = useMemo(() => {
    const q = debouncedLbCasePanQ.trim().toLowerCase()
    return casePans.filter((pan) => {
      if (q && !pan.name.toLowerCase().includes(q) && !pan.code.toLowerCase().includes(q)) return false
      return true
    })
  }, [casePans, debouncedLbCasePanQ])

  const bulkCasePanRows = useMemo(() => {
    const q = debouncedBulkCasePanQ.trim().toLowerCase()
    if (!q) return casePans
    return casePans.filter(
      (pan) => pan.name.toLowerCase().includes(q) || pan.code.toLowerCase().includes(q),
    )
  }, [casePans, debouncedBulkCasePanQ])

  const bulkCategoryRows = useMemo(() => {
    const q = debouncedBulkCategoryQ.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.category?.name || "").toLowerCase().includes(q),
    )
  }, [categories, debouncedBulkCategoryQ])

  const bulkCasePanVisibleIds = bulkCasePanRows.map((p) => p.id)
  const bulkCategoryVisibleIds = bulkCategoryRows.map((c) => c.id)
  const bulkMaxPairs = bulkCasePanSelection.length * bulkCategorySelection.length

  const openLinkCasePanFromBrowse = (id: number) => {
    setLcCasePanId(id)
    setMainTab("linkByCasePan")
  }

  const openLinkCategoryFromBrowse = (id: number) => {
    setLbCategoryId(id)
    setMainTab("linkByCategory")
  }

  const saveLinkByCasePan = async (customerId: number) => {
    if (!lcCasePanId) return false
    if (lcPendingRemoves.length) {
      const ok = await setAssignments(customerId, [], { subcategories: lcPendingRemoves }, { silent: true })
      if (!ok) return false
    }
    if (lcPendingAdds.length) {
      const ok = await setAssignments(customerId, [lcCasePanId], { subcategories: lcPendingAdds })
      if (!ok) return false
    } else if (lcPendingRemoves.length) {
      toast({
        title: t("success") || "Success",
        description: t("caseTracking.assignmentsUpdated", "Assignments updated successfully"),
      })
    } else {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.noAssignmentChanges", "No assignment changes to save"),
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const saveLinkByCategory = async (customerId: number) => {
    if (!lbCategoryId) return false

    const remainingAfterRemove = lbBaselineIds.filter((id) => !lbPendingRemoves.includes(id))
    const finalPanIds = Array.from(new Set([...remainingAfterRemove, ...lbPendingAdds]))
    // Subcategory.case_pan_id is singular — keep at most one case pan
    const finalPanId = finalPanIds.length ? finalPanIds[finalPanIds.length - 1] : null

    if (
      finalPanId === (lbBaselineIds[0] ?? null) &&
      lbPendingAdds.length === 0 &&
      lbPendingRemoves.length === 0
    ) {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.noAssignmentChanges", "No assignment changes to save"),
        variant: "destructive",
      })
      return false
    }

    const cleared = await setAssignments(customerId, [], { subcategories: [lbCategoryId] }, { silent: true })
    if (!cleared) return false

    if (finalPanId != null) {
      const ok = await setAssignments(customerId, [finalPanId], { subcategories: [lbCategoryId] })
      if (!ok) return false
    } else {
      toast({
        title: t("success") || "Success",
        description: t("caseTracking.assignmentsUpdated", "Assignments updated successfully"),
      })
    }
    return true
  }

  const saveBulk = async (customerId: number) => {
    // Each category can only belong to one case pan; assign all selected categories to each
    // selected pan in order so the last selected case pan keeps the links.
    for (const panId of bulkCasePanSelection) {
      const ok = await setAssignments(
        customerId,
        [panId],
        { subcategories: bulkCategorySelection },
        { silent: true },
      )
      if (!ok) return false
    }
    toast({
      title: t("success") || "Success",
      description: t("caseTracking.assignmentsUpdated", "Assignments updated successfully"),
    })
    return true
  }

  const handlePrimaryFooter = async () => {
    if (mainTab === "browse") {
      onClose()
      return
    }
    const customerId = getCustomerId(user)
    if (!customerId) {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.customerIdRequired", "Customer ID is required"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      let ok = false
      if (mainTab === "linkByCasePan") ok = await saveLinkByCasePan(customerId)
      else if (mainTab === "linkByCategory") ok = await saveLinkByCategory(customerId)
      else if (mainTab === "bulk") ok = await saveBulk(customerId)

      if (ok) {
        await loadAll(customerId)
        setLcPendingAdds([])
        setLcPendingRemoves([])
        setLbPendingAdds([])
        setLbPendingRemoves([])
        setBulkCasePanSelection([])
        setBulkCategorySelection([])
        setMainTab("browse")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const footerDisabled =
    isSubmitting ||
    (mainTab === "linkByCasePan" && !lcCasePanId) ||
    (mainTab === "linkByCategory" && !lbCategoryId) ||
    (mainTab === "bulk" && (!bulkCasePanSelection.length || !bulkCategorySelection.length))

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
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold">
                {t("caseTracking.linkCasePan", "Link Case Pan")}
              </DialogTitle>
              {casePanName ? (
                <p className="mt-0.5 truncate text-sm text-gray-500">{casePanName}</p>
              ) : null}
            </div>
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
                  ["linkByCategory", "Link by Category"],
                  ["linkByCasePan", "Link by Case Pan"],
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

          {/* Browse Linked */}
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
                        browseSub === "casePan"
                          ? "bg-white text-[#1162a8] shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                      onClick={() => {
                        setBrowseSub("casePan")
                        setBrowseOrderBy("name")
                        setBrowsePage(1)
                      }}
                    >
                      Browse by Case Pan
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        browseSub === "category"
                          ? "bg-white text-[#1162a8] shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                      onClick={() => {
                        setBrowseSub("category")
                        setBrowseOrderBy("name")
                        setBrowsePage(1)
                      }}
                    >
                      Browse by Category
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
                      placeholder={browseSub === "casePan" ? "Search Case Pan" : "Search Category"}
                      value={browseQ}
                      onChange={(e) => setBrowseQ(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="min-h-0 min-w-0 overflow-auto px-4 py-3 sm:px-6">
                {isLoadingData ? (
                  <div className="flex min-h-[12rem] items-center justify-center">
                    <Loader2 className="h-9 w-9 animate-spin text-[#1162a8]" />
                  </div>
                ) : browsePageRows.length === 0 ? (
                  <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 text-center text-sm text-gray-500">
                    {browseSub === "casePan"
                      ? "No case pans match your filters."
                      : "No categories match your filters."}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200">
                    <Table className="w-full table-fixed text-sm [&_tbody_tr:last-child_td]:border-b-0">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 bg-gray-50/95 hover:bg-gray-50/95 [&>th]:border-b-0">
                          {browseSub === "casePan" ? (
                            <>
                              <TableHead
                                className="sticky top-0 z-[1] w-[32%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("name")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Case Pan <ArrowUpDown className="h-3 w-3 shrink-0" />
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
                                Linked categories
                              </TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead
                                className="sticky top-0 z-[1] w-[26%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("name")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Category name <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </span>
                              </TableHead>
                              <TableHead
                                className="sticky top-0 z-[1] w-[22%] min-w-0 cursor-pointer bg-gray-50/95 py-3"
                                onClick={() => toggleBrowseSort("code")}
                              >
                                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                  Parent category <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </span>
                              </TableHead>
                              <TableHead className="sticky top-0 z-[1] min-w-0 bg-gray-50/95 py-3 text-xs font-semibold">
                                Linked case pans
                              </TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {browseSub === "casePan"
                          ? (browsePageRows as typeof browseCasePanRows).map((row) => {
                              const shown = row.linked.slice(0, 6)
                              const more = Math.max(row.linked.length - 6, 0)
                              return (
                                <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                  <TableCell className="min-w-0 break-words font-medium leading-snug">
                                    {row.name}
                                  </TableCell>
                                  <TableCell className="min-w-0 break-words leading-snug text-gray-600">
                                    {row.code || "—"}
                                  </TableCell>
                                  <TableCell className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-start gap-1">
                                      {shown.map((item) => (
                                        <Badge
                                          key={item.id}
                                          variant="secondary"
                                          className="max-w-[10rem] shrink truncate rounded-md text-[10px] font-normal"
                                          title={item.name}
                                        >
                                          {item.name}
                                        </Badge>
                                      ))}
                                      {more > 0 ? (
                                        <Badge variant="outline" className="shrink-0 text-[10px]">
                                          +{more} more
                                        </Badge>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="shrink-0 text-[#1162a8] hover:opacity-80"
                                        onClick={() => openLinkCasePanFromBrowse(row.id)}
                                        aria-label="Add links for case pan"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          : (browsePageRows as typeof browseCategoryRows).map((row) => {
                              const shown = row.linked.slice(0, 6)
                              const more = Math.max(row.linked.length - 6, 0)
                              return (
                                <TableRow key={row.id} className="align-top [&>td]:align-top [&>td]:py-3">
                                  <TableCell className="min-w-0 break-words font-medium leading-snug">
                                    {row.name}
                                  </TableCell>
                                  <TableCell className="min-w-0 break-words leading-snug text-gray-600">
                                    {row.parentName}
                                  </TableCell>
                                  <TableCell className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-start gap-1">
                                      {shown.map((item) => (
                                        <Badge
                                          key={item.id}
                                          variant="secondary"
                                          className="max-w-[10rem] shrink truncate rounded-md text-[10px] font-normal"
                                          title={item.name}
                                        >
                                          {item.name}
                                        </Badge>
                                      ))}
                                      {more > 0 ? (
                                        <Badge variant="outline" className="shrink-0 text-[10px]">
                                          +{more} more
                                        </Badge>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="shrink-0 text-[#1162a8] hover:opacity-80"
                                        onClick={() => openLinkCategoryFromBrowse(row.id)}
                                        aria-label="Add links for category"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {!isLoadingData ? (
                <PaginationBar
                  page={browsePage}
                  perPage={browsePerPage}
                  total={browseTotalEntries}
                  onPageChange={(p) => setBrowsePage(Math.min(browseTotalPages, Math.max(1, p)))}
                />
              ) : (
                <div />
              )}
            </div>
          </TabsContent>

          {/* Link by Case Pan */}
          <TabsContent value="linkByCasePan" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
              <Select
                value={lcCasePanId ? String(lcCasePanId) : ""}
                onValueChange={(v) => {
                  const n = Number(v)
                  setLcCasePanId(Number.isFinite(n) ? n : null)
                }}
              >
                <SelectTrigger className="h-9 w-[280px] text-xs">
                  <SelectValue placeholder="Select case pan" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {casePanChoices.map((pan) => (
                    <SelectItem key={pan.id} value={String(pan.id)} className="text-xs">
                      {pan.name} ({pan.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-600">
                {lcCasePanId ? `${lcMergedLinkedIds.length} categor${lcMergedLinkedIds.length === 1 ? "y" : "ies"} linked` : "Select a case pan"}
              </span>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Jump to case pan…"
                  value={lcJump}
                  onChange={(e) => setLcJump(e.target.value)}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 border-t">
              <div className="flex min-h-0 w-1/2 flex-col border-r">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Available categories</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search categories"
                      value={lcCategoryQ}
                      onChange={(e) => setLcCategoryQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="p-1 text-gray-400" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {!lcCasePanId ? (
                    <p className="p-4 text-xs text-gray-500">Pick a case pan first.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Category name</TableHead>
                          <TableHead className="text-xs">Parent</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lcAvailableCategories.map((row) => {
                          const onLinked = lcMergedLinkedIds.includes(row.id)
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="text-xs font-medium">{row.name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{row.category?.name || "—"}</TableCell>
                              <TableCell>
                                {!onLinked ? (
                                  <button
                                    type="button"
                                    className="text-[#1162a8]"
                                    onClick={() =>
                                      setLcPendingAdds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]))
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
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Linked categories</div>
                <div className="flex-1 overflow-auto">
                  {!lcCasePanId ? (
                    <p className="p-4 text-xs text-gray-500">No case pan selected.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Category name</TableHead>
                          <TableHead className="text-xs">Parent</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lcMergedLinkedIds.map((id) => {
                          const cat = categories.find((c) => c.id === id)
                          return (
                            <TableRow key={id}>
                              <TableCell className="text-xs font-medium">{cat?.name || `Category #${id}`}</TableCell>
                              <TableCell className="text-xs text-gray-600">{cat?.category?.name || "—"}</TableCell>
                              <TableCell className="space-x-1 text-right">
                                <button type="button" className="cursor-not-allowed p-1 text-gray-400 opacity-60">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  onClick={() => {
                                    if (lcBaselineIds.includes(id)) {
                                      setLcPendingRemoves((prev) => (prev.includes(id) ? prev : [...prev, id]))
                                    }
                                    setLcPendingAdds((prev) => prev.filter((x) => x !== id))
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

          {/* Link by Category */}
          <TabsContent value="linkByCategory" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
              <Select
                value={lbCategoryId ? String(lbCategoryId) : ""}
                onValueChange={(v) => {
                  const n = Number(v)
                  setLbCategoryId(Number.isFinite(n) ? n : null)
                }}
              >
                <SelectTrigger className="h-9 w-[280px] text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {categoryChoices.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)} className="text-xs">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-600">
                {lbCategoryId
                  ? `${lbMergedLinkedIds.length} case pan${lbMergedLinkedIds.length === 1 ? "" : "s"} linked`
                  : "Select a category"}
              </span>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Jump to category…"
                  value={lbJump}
                  onChange={(e) => setLbJump(e.target.value)}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 border-t">
              <div className="flex min-h-0 w-1/2 flex-col border-r">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Available case pans</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search case pans"
                      value={lbCasePanQ}
                      onChange={(e) => setLbCasePanQ(e.target.value)}
                    />
                  </div>
                  <button type="button" className="p-1 text-gray-400" aria-hidden>
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {!lbCategoryId ? (
                    <p className="p-4 text-xs text-gray-500">Pick a category first.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Case Pan</TableHead>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lbAvailableCasePans.map((pan) => {
                          const onLinked = lbMergedLinkedIds.includes(pan.id)
                          return (
                            <TableRow key={pan.id}>
                              <TableCell className="text-xs font-medium">{pan.name}</TableCell>
                              <TableCell className="text-xs text-gray-600">{pan.code || "—"}</TableCell>
                              <TableCell>
                                {!onLinked ? (
                                  <button
                                    type="button"
                                    className="text-[#1162a8]"
                                    onClick={() => {
                                      // One category → one case pan: replacing selects the new pan
                                      setLbPendingRemoves(lbBaselineIds.filter((id) => id !== pan.id))
                                      setLbPendingAdds([pan.id])
                                    }}
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
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Linked case pans</div>
                <div className="flex-1 overflow-auto">
                  {!lbCategoryId ? (
                    <p className="p-4 text-xs text-gray-500">No category selected.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Case Pan</TableHead>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lbMergedLinkedIds.map((id) => {
                          const pan = casePans.find((p) => p.id === id)
                          return (
                            <TableRow key={id}>
                              <TableCell className="text-xs font-medium">{pan?.name || `Case pan #${id}`}</TableCell>
                              <TableCell className="text-xs text-gray-600">{pan?.code || "—"}</TableCell>
                              <TableCell className="space-x-1 text-right">
                                <button type="button" className="cursor-not-allowed p-1 text-gray-400 opacity-60">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  onClick={() => {
                                    if (lbBaselineIds.includes(id)) {
                                      setLbPendingRemoves((prev) => (prev.includes(id) ? prev : [...prev, id]))
                                    }
                                    setLbPendingAdds((prev) => prev.filter((x) => x !== id))
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

          {/* Bulk Link */}
          <TabsContent value="bulk" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1">
              <div className="flex min-h-0 w-1/2 flex-col border-r">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Case pans</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search case pans"
                      value={bulkCasePanQ}
                      onChange={(e) => setBulkCasePanQ(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={pageSelectChecked(bulkCasePanVisibleIds, bulkCasePanSelection)}
                            onCheckedChange={(c) =>
                              setBulkCasePanSelection((prev) =>
                                togglePageIds(prev, bulkCasePanVisibleIds, c === true),
                              )
                            }
                          />
                        </TableHead>
                        <TableHead className="text-xs">Case Pan</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkCasePanRows.map((pan) => (
                        <TableRow key={pan.id}>
                          <TableCell>
                            <Checkbox
                              checked={bulkCasePanSelection.includes(pan.id)}
                              onCheckedChange={(c) =>
                                setBulkCasePanSelection((prev) =>
                                  c === true ? [...prev, pan.id] : prev.filter((x) => x !== pan.id),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium">{pan.name}</TableCell>
                          <TableCell className="text-xs text-gray-600">{pan.code}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t px-3 py-2 text-xs text-gray-600">
                  {bulkCasePanRows.length} case pan{bulkCasePanRows.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="flex min-h-0 w-1/2 flex-col">
                <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium">Categories</div>
                <div className="flex gap-2 border-b px-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="h-8 pl-7 text-xs"
                      placeholder="Search categories"
                      value={bulkCategoryQ}
                      onChange={(e) => setBulkCategoryQ(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={pageSelectChecked(bulkCategoryVisibleIds, bulkCategorySelection)}
                            onCheckedChange={(c) =>
                              setBulkCategorySelection((prev) =>
                                togglePageIds(prev, bulkCategoryVisibleIds, c === true),
                              )
                            }
                          />
                        </TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Parent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkCategoryRows.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell>
                            <Checkbox
                              checked={bulkCategorySelection.includes(cat.id)}
                              onCheckedChange={(c) =>
                                setBulkCategorySelection((prev) =>
                                  c === true ? [...prev, cat.id] : prev.filter((x) => x !== cat.id),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium">{cat.name}</TableCell>
                          <TableCell className="text-xs text-gray-600">{cat.category?.name || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t px-3 py-2 text-xs text-gray-600">
                  {bulkCategoryRows.length} categor{bulkCategoryRows.length !== 1 ? "ies" : "y"}
                </div>
              </div>
            </div>

            <div className="border-t bg-amber-50/90 px-6 py-2 text-center text-xs text-amber-950">
              Link {bulkCasePanSelection.length} case pan{bulkCasePanSelection.length !== 1 ? "s" : ""} to{" "}
              {bulkCategorySelection.length} categor{bulkCategorySelection.length !== 1 ? "ies" : "y"}
              {bulkMaxPairs ? ` · up to ${bulkMaxPairs} pair combinations` : ""}
              {bulkCasePanSelection.length > 1
                ? " · each category keeps one case pan (last selected pan wins)"
                : ""}
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
              disabled={footerDisabled}
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
