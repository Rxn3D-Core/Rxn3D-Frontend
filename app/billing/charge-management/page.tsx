"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LabBillingPageHeader } from "@/components/billing/lab-billing-page-header"
import {
  Filter,
  Search,
  Calendar,
  Download,
  RefreshCw,
  Send,
  CheckCircle,
  Eye,
  Loader2,
  Printer,
  Pencil,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChargeManagementAdvancedFiltersPanel,
  type FilterChip,
} from "@/components/billing/charge-management-advanced-filters-panel"
import {
  useListBillingInvoicesQuery,
  useGetBillingStatisticsQuery,
  useAdvancedBillingSearchMutation,
  useBulkBillingActionMutation,
  useGenerateBillingPdfMutation,
  useLazyDownloadBillingPdfQuery,
  useSendStatementEmailMutation,
  useRegenerateSlipInvoiceMutation,
} from "@/lib/redux/api/billingApi"
import type {
  BillingInvoice,
  BillingListParams,
  BillingProduct,
  BillingListResult,
  AdvancedBillingSearchBody,
  BulkBillingActionBody,
} from "@/lib/redux/api/billingApi"
import { useAuth } from "@/contexts/auth-context"
import { useCustomer } from "@/contexts/customer-context"
import { useConnectedOffices } from "@/hooks/use-connected-offices"
import { pdfBlobFromBase64 } from "@/lib/open-pdf-from-base64"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { EditBillingInvoiceDialog } from "@/components/billing/edit-billing-invoice-dialog"

function resolveBillingAssetUrl(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  return new URL(href, base.endsWith("/") ? base : `${base}/`).toString()
}

/** Safe download name: patient, invoice #, office (no path chars). */
function buildInvoicePdfFilename(patient: string, invoiceNo: string, office: string): string {
  const seg = (s: string) =>
    s
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48) || "invoice"
  return `${seg(patient)}-${seg(invoiceNo)}-${seg(office)}`.slice(0, 180) + ".pdf"
}

type ChargeRow = {
  id: string
  billingInvoiceId: number
  /** `slips.id` — for `POST /slip/{slipId}/regenerate-invoice` */
  slipId: number
  billingProductId: number | null
  officeCode: string
  /** Full office name for PDF filename */
  officeName: string
  /** Invoice number / id label for PDF filename */
  invoiceNumber: string
  patient: string
  ul: string
  product: string
  grade: string
  stage: string
  baseTotal: string
  addOn: string
  qty: string
  subTotal: string
  rPercent: string
  gross: string
  dueDate: string
  status: string
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
}

function officeShortCode(name: string | null | undefined): string {
  if (!name?.trim()) return "—"
  const alpha = name.replace(/[^a-zA-Z]/g, "")
  if (alpha.length >= 3) return alpha.slice(0, 3).toUpperCase()
  return name.slice(0, 3).toUpperCase()
}

function mapProductType(ul: string | null | undefined): string {
  if (!ul) return "—"
  const t = ul.toLowerCase()
  if (t.includes("upper")) return "U"
  if (t.includes("lower")) return "L"
  return ul
}

function formatChipDateRange(from: string, to: string): string {
  const d1 = new Date(`${from}T12:00:00`)
  const d2 = new Date(`${to}T12:00:00`)
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return `${from} – ${to}`
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
  return `${d1.toLocaleDateString("en-US", opts)} – ${d2.toLocaleDateString("en-US", opts)}`
}

function mapInvoiceStatusToLabel(status: string | null | undefined): string {
  if (!status) return "—"
  const s = status.toLowerCase()
  if (s === "pending") return "Pending"
  if (s === "paid") return "Paid"
  if (s === "overdue") return "Overdue"
  if (s === "cancelled") return "Cancelled"
  return status
}

/** Apply preset to YYYY-MM-DD range for toolbar / advanced search */
function computeDateRangeFromPreset(preset: string): { from: string; to: string } | null {
  if (preset === "custom") return null
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const now = new Date()
  if (preset === "today") return { from: fmt(now), to: fmt(now) }
  if (preset === "yesterday") {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return { from: fmt(y), to: fmt(y) }
  }
  if (preset === "last_7_days") {
    const s = new Date(now)
    s.setDate(s.getDate() - 6)
    return { from: fmt(s), to: fmt(now) }
  }
  if (preset === "last_week") {
    const s = new Date(now)
    s.setDate(s.getDate() - 13)
    return { from: fmt(s), to: fmt(now) }
  }
  if (preset === "last_month") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const e = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: fmt(s), to: fmt(e) }
  }
  if (preset === "last_year") {
    const s = new Date(now.getFullYear() - 1, 0, 1)
    const e = new Date(now.getFullYear() - 1, 11, 31)
    return { from: fmt(s), to: fmt(e) }
  }
  return null
}

function billingInvoiceToRows(inv: BillingInvoice): ChargeRow[] {
  const patient = inv.slip?.case?.patient_name ?? "—"
  const officeName = inv.office?.name
  const officeNameLabel = officeName?.trim() || "—"
  const invoiceNumber = inv.invoice_number?.trim() || `INV-${inv.id}`
  const oc = officeShortCode(officeName ?? undefined)
  const due = formatShortDate(inv.created_at ?? inv.slip?.case?.created_at)
  const invStatus = mapInvoiceStatusToLabel(inv.status)

  const products = inv.products?.length ? inv.products : []

  if (products.length === 0) {
    return [
      {
        id: `${inv.id}-summary`,
        billingInvoiceId: inv.id,
        slipId: inv.slip_id,
        billingProductId: null,
        officeCode: oc,
        officeName: officeNameLabel,
        invoiceNumber,
        patient,
        ul: "—",
        product: "—",
        grade: "—",
        stage: "—",
        baseTotal: formatMoney(inv.total_amount),
        addOn: "—",
        qty: "—",
        subTotal: "—",
        rPercent: "—",
        gross: formatMoney(inv.total_amount),
        dueDate: due,
        status: invStatus,
      },
    ]
  }

  return products.map((p: BillingProduct, idx: number) => {
    const addons = p.addons?.length
      ? p.addons.map((a) => a.addon_name ?? "").filter(Boolean).join("\n")
      : "—"
    const addonQty =
      p.addons?.map((a) => (a.quantity != null ? String(a.quantity) : "—")).join("\n") || "—"
    const addonSub = p.addons?.map((a) => formatMoney(a.total)).join("\n") || "—"
    const rush =
      p.rush_percentage != null && p.rush_percentage !== ""
        ? `${Number(p.rush_percentage)}%`
        : "—"

    return {
      id: `${inv.id}-p-${p.id}-${idx}`,
      billingInvoiceId: inv.id,
      slipId: inv.slip_id,
      billingProductId: p.id,
      officeCode: oc,
      officeName: officeNameLabel,
      invoiceNumber,
      patient,
      ul: mapProductType(p.product_type),
      product: p.product_name ?? "—",
      grade: p.grade_name ?? "—",
      stage: p.stage_name ?? "—",
      baseTotal: formatMoney(p.base_price),
      addOn: addons || "—",
      qty: p.teeth_count != null ? String(p.teeth_count) : addonQty,
      subTotal: addonSub,
      rPercent: rush,
      gross: formatMoney(p.total_price),
      dueDate: due,
      status: invStatus,
    }
  })
}

export default function ChargeManagementPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { user } = useAuth()
  const { fetchCustomerProfile, customerProfile } = useCustomer()

  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [officeFilter, setOfficeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [activeSource, setActiveSource] = useState<"list" | "advanced">("list")
  const [advancedResult, setAdvancedResult] = useState<BillingListResult | null>(null)
  const [advancedPage, setAdvancedPage] = useState(1)
  const [advancedBody, setAdvancedBody] = useState<AdvancedBillingSearchBody | null>(null)

  const [advCategoryId, setAdvCategoryId] = useState<number | null>(null)
  const [advSubcategoryId, setAdvSubcategoryId] = useState<number | null>(null)
  const [advProductId, setAdvProductId] = useState<number | null>(null)
  const [advStageId, setAdvStageId] = useState<number | null>(null)
  const [advItemStatus, setAdvItemStatus] = useState<string>("all")
  const [advAttachment, setAdvAttachment] = useState<"all" | "yes" | "no">("all")
  const [showCasesWithAddon, setShowCasesWithAddon] = useState(false)
  const [showOnlyChecked, setShowOnlyChecked] = useState(false)
  const [advDateRange, setAdvDateRange] = useState<string>("custom")

  const [editInvoiceId, setEditInvoiceId] = useState<number | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [pdfViewerTitle, setPdfViewerTitle] = useState("")
  const [pdfViewerLoading, setPdfViewerLoading] = useState(false)
  const pdfViewerBlobUrlRef = useRef<string | null>(null)
  const pdfIframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (advDateRange === "custom") return
    const r = computeDateRangeFromPreset(advDateRange)
    if (r) {
      setDateFrom(r.from)
      setDateTo(r.to)
    }
  }, [advDateRange])

  const customerId = useMemo((): number | null => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem("customerId")
    if (stored) return parseInt(stored, 10)
    if (user?.customers?.length) return user.customers[0].id
    if (user?.customer_id) return user.customer_id
    if (user?.customer?.id) return user.customer.id
    return null
  }, [user])

  useEffect(() => {
    if (customerId && !customerProfile) {
      fetchCustomerProfile(customerId)
    }
  }, [customerId, customerProfile, fetchCustomerProfile])

  const scopeFilter = useMemo((): Pick<BillingListParams, "lab_id" | "office_id"> => {
    if (!customerId) return {}
    const roles = user?.roles?.length ? user.roles : user?.role ? [user.role] : []
    const r = roles[0] ?? ""
    if (r === "lab_admin" || r === "lab_user") return { lab_id: customerId }
    if (r === "office_admin" || r === "office_user") return { office_id: customerId }
    if (customerProfile?.type === "lab") return { lab_id: customerId }
    if (customerProfile?.type === "office") return { office_id: customerId }
    return { lab_id: customerId }
  }, [customerId, user, customerProfile])

  const isLabScope = scopeFilter.lab_id != null

  const { officesAsLabs, isLoading: officesLoading } = useConnectedOffices({
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token") && isLabScope,
  })
  const officesAsLabsRef = useRef(officesAsLabs)
  officesAsLabsRef.current = officesAsLabs

  const officeFilterOptions = useMemo(
    () => [
      { value: "all", label: t("chargeManagement.allOffices", { defaultValue: "All offices" }) },
      ...officesAsLabs.map((o) => ({ value: String(o.id), label: o.name })),
    ],
    [officesAsLabs, t]
  )

  const listParams = useMemo((): BillingListParams => {
    const params: BillingListParams = {
      ...scopeFilter,
      page,
      per_page: 15,
      sort_by: "created_at",
      sort_direction: "desc",
    }
    if (debouncedSearch) {
      params.patient_name = debouncedSearch
    }
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (isLabScope && officeFilter !== "all") {
      const oid = parseInt(officeFilter, 10)
      if (!Number.isNaN(oid)) params.office_id = oid
    }
    return params
  }, [
    scopeFilter,
    page,
    debouncedSearch,
    dateFrom,
    dateTo,
    officeFilter,
    isLabScope,
  ])

  const {
    data: listResult,
    isLoading: listLoading,
    isFetching: listFetching,
    isError: listError,
    error: listErr,
    refetch: refetchList,
  } = useListBillingInvoicesQuery(listParams, { skip: !customerId || activeSource === "advanced" })

  const { data: stats, isFetching: statsFetching } = useGetBillingStatisticsQuery(undefined, {
    skip: !customerId,
  })

  const [advancedSearch, { isLoading: advancedLoading }] = useAdvancedBillingSearchMutation()
  const [bulkAction, { isLoading: bulkLoading }] = useBulkBillingActionMutation()
  const [downloadPdf] = useLazyDownloadBillingPdfQuery()
  const [generatePdf] = useGenerateBillingPdfMutation()
  const [sendStatementEmail, { isLoading: sendEmailLoading }] = useSendStatementEmailMutation()
  const [regenerateSlipInvoice, { isLoading: regenerateInvoiceLoading }] = useRegenerateSlipInvoiceMutation()

  const [regeneratingSlipId, setRegeneratingSlipId] = useState<number | null>(null)

  const fetchInvoicePdfBlob = useCallback(
    async (billingId: number): Promise<Blob> => {
      try {
        const res = await generatePdf(billingId).unwrap()
        const b64 = res?.data?.invoice_pdf
        if (b64 && typeof b64 === "string" && b64.trim()) {
          return pdfBlobFromBase64(b64)
        }
        const href = res?.data?.pdf_url ?? res?.data?.download_url
        if (href && typeof href === "string") {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
          const r = await fetch(resolveBillingAssetUrl(href), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (!r.ok) throw new Error("pdf url fetch failed")
          return await r.blob()
        }
      } catch {
        // fall through to authenticated download endpoint
      }
      return downloadPdf(billingId).unwrap()
    },
    [generatePdf, downloadPdf],
  )

  const closePdfViewer = useCallback(() => {
    if (pdfViewerBlobUrlRef.current) {
      URL.revokeObjectURL(pdfViewerBlobUrlRef.current)
      pdfViewerBlobUrlRef.current = null
    }
    setPdfViewerUrl(null)
    setPdfViewerOpen(false)
    setPdfViewerTitle("")
  }, [])

  const displayResult = activeSource === "advanced" ? advancedResult : listResult
  const isLoading = activeSource === "advanced" ? advancedLoading : listLoading
  const isFetching = activeSource === "advanced" ? advancedLoading : listFetching
  const isError = activeSource === "advanced" ? false : listError
  const error = listErr

  const charges: ChargeRow[] = useMemo(() => {
    if (!displayResult?.data?.length) return []
    return displayResult.data.flatMap((inv) => billingInvoiceToRows(inv))
  }, [displayResult])

  const pagination = displayResult?.pagination

  const selectedBillingIds = useMemo(() => {
    const set = new Set<number>()
    charges.forEach((ch) => {
      if (selectedItems.includes(ch.id)) set.add(ch.billingInvoiceId)
    })
    return Array.from(set)
  }, [charges, selectedItems])

  const resetToList = useCallback(() => {
    setActiveSource("list")
    setAdvancedResult(null)
    setAdvancedBody(null)
    setAdvancedPage(1)
    setPage(1)
  }, [])

  const advancedSearchRequestBody = useMemo((): AdvancedBillingSearchBody => {
    let officeName: string | undefined
    if (officeFilter !== "all" && officesAsLabsRef.current.length) {
      const o = officesAsLabsRef.current.find((x) => String(x.id) === officeFilter)
      officeName = o?.name
    }
    const body: AdvancedBillingSearchBody = {
      page: 1,
      patient_name: debouncedSearch.trim() || searchInput.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      date_range: advDateRange === "custom" ? "custom" : (advDateRange as AdvancedBillingSearchBody["date_range"]),
      office_name: officeName,
    }
    if (advCategoryId != null) body.category_id = advCategoryId
    if (advSubcategoryId != null) body.subcategory_id = advSubcategoryId
    if (advProductId != null) body.product_id = advProductId
    if (advStageId != null) body.stage_id = advStageId
    if (advAttachment === "yes") body.has_attachment = true
    else if (advAttachment === "no") body.has_attachment = false
    if (showOnlyChecked) body.item_status = "checked"
    else if (advItemStatus !== "all") body.item_status = advItemStatus
    return body
  }, [
    officeFilter,
    officesLoading,
    officesAsLabs.length,
    debouncedSearch,
    searchInput,
    dateFrom,
    dateTo,
    advDateRange,
    advCategoryId,
    advSubcategoryId,
    advProductId,
    advStageId,
    advAttachment,
    showOnlyChecked,
    advItemStatus,
  ])

  const runAdvancedSearch = useCallback(
    async (body: AdvancedBillingSearchBody) => {
      try {
        const merged: AdvancedBillingSearchBody = {
          ...body,
          per_page: 15,
          sort_by: body.sort_by ?? "created_at",
          sort_direction: body.sort_direction ?? "desc",
        }
        if (customerProfile?.type === "lab" && customerProfile.name) {
          merged.lab_name = merged.lab_name ?? customerProfile.name
        }
        const result = await advancedSearch(merged).unwrap()
        setAdvancedResult(result)
        setAdvancedBody(merged)
        setActiveSource("advanced")
        setAdvancedPage(merged.page ?? 1)
        setPage(1)
      } catch (e: unknown) {
        toast({
          title: "Search failed",
          description: e instanceof Error ? e.message : "Request failed",
          variant: "destructive",
        })
      }
    },
    [advancedSearch, customerProfile, toast],
  )

  useEffect(() => {
    if (!customerId || activeSource !== "advanced") return
    const timer = setTimeout(() => {
      void runAdvancedSearch(advancedSearchRequestBody)
    }, 350)
    return () => clearTimeout(timer)
  }, [customerId, activeSource, advancedSearchRequestBody, runAdvancedSearch])

  const clearAllAdvancedFilters = useCallback(() => {
    setAdvCategoryId(null)
    setAdvSubcategoryId(null)
    setAdvProductId(null)
    setAdvStageId(null)
    setAdvItemStatus("all")
    setAdvAttachment("all")
    setShowCasesWithAddon(false)
    setShowOnlyChecked(false)
    setAdvDateRange("custom")
    setDateFrom("")
    setDateTo("")
    setOfficeFilter("all")
    setSearchInput("")
    setShowAdvancedFilters(false)
    setPage(1)
    resetToList()
  }, [resetToList])

  const filterChips = useMemo((): FilterChip[] => {
    if (activeSource !== "advanced" || !advancedBody) return []
    const b = advancedBody
    const chips: FilterChip[] = []
    if (b.date_from && b.date_to) {
      chips.push({
        id: "date",
        label: `Date: ${formatChipDateRange(b.date_from, b.date_to)}`,
        onRemove: () => {
          setAdvDateRange("custom")
          setDateFrom("")
          setDateTo("")
          void runAdvancedSearch({ ...b, date_from: undefined, date_to: undefined, date_range: undefined, page: 1 })
        },
      })
    }
    if (b.office_name) {
      chips.push({
        id: `office-${b.office_name}`,
        label: `Office: ${b.office_name}`,
        onRemove: () => {
          setOfficeFilter("all")
          void runAdvancedSearch({ ...b, office_name: undefined, page: 1 })
        },
      })
    }
    if (b.patient_name) {
      chips.push({
        id: "patient",
        label: `Patient: ${b.patient_name}`,
        onRemove: () => {
          setSearchInput("")
          void runAdvancedSearch({ ...b, patient_name: undefined, page: 1 })
        },
      })
    }
    if (b.subcategory_id != null) {
      chips.push({
        id: "subcategory",
        label: `Subcategory #${b.subcategory_id}`,
        onRemove: () => {
          setAdvSubcategoryId(null)
          void runAdvancedSearch({ ...b, subcategory_id: undefined, page: 1 })
        },
      })
    }
    if (b.category_id != null) {
      chips.push({
        id: "category",
        label: `Category #${b.category_id}`,
        onRemove: () => {
          setAdvCategoryId(null)
          void runAdvancedSearch({ ...b, category_id: undefined, page: 1 })
        },
      })
    }
    if (b.product_id != null) {
      chips.push({
        id: "product",
        label: `Product #${b.product_id}`,
        onRemove: () => {
          setAdvProductId(null)
          void runAdvancedSearch({ ...b, product_id: undefined, page: 1 })
        },
      })
    }
    if (b.stage_id != null) {
      chips.push({
        id: "stage",
        label: `Stage #${b.stage_id}`,
        onRemove: () => {
          setAdvStageId(null)
          void runAdvancedSearch({ ...b, stage_id: undefined, page: 1 })
        },
      })
    }
    if (b.has_attachment === true) {
      chips.push({
        id: "attach_yes",
        label: "Attachment: yes",
        onRemove: () => {
          setAdvAttachment("all")
          void runAdvancedSearch({ ...b, has_attachment: undefined, page: 1 })
        },
      })
    }
    if (b.has_attachment === false) {
      chips.push({
        id: "attach_no",
        label: "Attachment: no",
        onRemove: () => {
          setAdvAttachment("all")
          void runAdvancedSearch({ ...b, has_attachment: undefined, page: 1 })
        },
      })
    }
    if (b.item_status) {
      chips.push({
        id: "item_status",
        label: `Status: ${b.item_status}`,
        onRemove: () => {
          setAdvItemStatus("all")
          setShowOnlyChecked(false)
          void runAdvancedSearch({ ...b, item_status: undefined, page: 1 })
        },
      })
    }
    return chips
  }, [activeSource, advancedBody, runAdvancedSearch])

  const toggleSelectAll = () => {
    if (selectedItems.length === charges.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(charges.map((c) => c.id))
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Checked":
        return "bg-[#D4F4DD] text-[#14804A]"
      case "Billed":
        return "bg-[#CCE0FF] text-[#004FC4]"
      case "Paid":
      case "Pending":
        return "bg-[#D4F4DD] text-[#14804A]"
      case "Refunded":
        return "bg-[#FFD6D9] text-[#E12D39]"
      case "Disputed":
      case "Overdue":
        return "bg-[#FFECCC] text-[#CC6600]"
      case "Unbilled":
        return "bg-[#E5E7EB] text-[#4B5563]"
      case "Cancelled":
        return "bg-[#E5E7EB] text-[#4B5563]"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const onRefresh = useCallback(async () => {
    if (activeSource === "advanced" && advancedBody) {
      try {
        const result = await advancedSearch({ ...advancedBody, page: advancedPage }).unwrap()
        setAdvancedResult(result)
        toast({ title: "Refreshed" })
      } catch {
        toast({ title: "Refresh failed", variant: "destructive" })
      }
      return
    }
    await refetchList()
  }, [activeSource, advancedBody, advancedPage, advancedSearch, refetchList, toast])

  const handleBulk = async (action: BulkBillingActionBody["action"]) => {
    if (selectedBillingIds.length === 0) {
      toast({ title: "Select at least one row", variant: "destructive" })
      return
    }
    try {
      await bulkAction({ billing_ids: selectedBillingIds, action }).unwrap()
      toast({ title: "Bulk action completed" })
      setSelectedItems([])
      await onRefresh()
    } catch (e: unknown) {
      toast({
        title: "Bulk action failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      })
    }
  }

  const handleDownloadPdf = async (
    billingId: number,
    meta?: Pick<ChargeRow, "patient" | "invoiceNumber" | "officeName">,
  ) => {
    try {
      const blob = await fetchInvoicePdfBlob(billingId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = meta
        ? buildInvoicePdfFilename(meta.patient, meta.invoiceNumber, meta.officeName)
        : `billing-invoice-${billingId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Download started" })
    } catch {
      toast({ title: "Download failed", variant: "destructive" })
    }
  }

  /** Loads PDF via `fetchInvoicePdfBlob` (generate-pdf → base64) and shows it in a modal. */
  const handleRegenerateInvoice = async (charge: ChargeRow) => {
    if (!charge.slipId) {
      toast({ title: "Missing slip for this invoice", variant: "destructive" })
      return
    }
    const ok = window.confirm(
      "Regenerate this invoice from the slip? The current invoice will be replaced with a new number and recalculated totals. Manual pricing edits will not be kept.",
    )
    if (!ok) return
    setRegeneratingSlipId(charge.slipId)
    try {
      const res = await regenerateSlipInvoice(charge.slipId).unwrap()
      toast({
        title: "Invoice regenerated",
        description: res?.message ?? "The billing list will refresh with the new invoice.",
      })
      await onRefresh()
    } catch (e: unknown) {
      toast({
        title: "Regenerate failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setRegeneratingSlipId(null)
    }
  }

  const handleViewInvoicePdf = async (charge: ChargeRow) => {
    setPdfViewerTitle(`${charge.invoiceNumber} · ${charge.patient} · ${charge.officeName}`)
    if (pdfViewerBlobUrlRef.current) {
      URL.revokeObjectURL(pdfViewerBlobUrlRef.current)
      pdfViewerBlobUrlRef.current = null
    }
    setPdfViewerUrl(null)
    setPdfViewerLoading(true)
    setPdfViewerOpen(true)
    try {
      const blob = await fetchInvoicePdfBlob(charge.billingInvoiceId)
      const url = URL.createObjectURL(blob)
      pdfViewerBlobUrlRef.current = url
      setPdfViewerUrl(url)
    } catch {
      toast({ title: "Could not open invoice PDF", variant: "destructive" })
      closePdfViewer()
    } finally {
      setPdfViewerLoading(false)
    }
  }

  const handlePrintPdfViewer = () => {
    const win = pdfIframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  const handleSendEmail = async (billingId: number) => {
    const email = window.prompt("Recipient email address")
    if (!email?.trim()) return
    try {
      await sendStatementEmail({ billingId, body: { email: email.trim() } }).unwrap()
      toast({ title: "Email sent" })
    } catch {
      toast({ title: "Send failed", variant: "destructive" })
    }
  }

  const goAdvancedPage = async (next: number) => {
    if (activeSource !== "advanced" || !advancedBody) return
    setAdvancedPage(next)
    try {
      const result = await advancedSearch({ ...advancedBody, page: next }).unwrap()
      setAdvancedResult(result)
    } catch {
      toast({ title: "Could not load page", variant: "destructive" })
    }
  }

  const filterBarDisabled = !customerId
  const actionDisabled = !customerId || bulkLoading || sendEmailLoading

  return (
    <div className="w-full min-h-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <LabBillingPageHeader />

        {!customerId && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            {t("chargeManagement.selectAccount", {
              defaultValue: "Select a lab location or sign in again to load charges for your account.",
            })}
          </p>
        )}

        {customerId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {t("chargeManagement.statsTotalInvoices", { defaultValue: "Total invoices" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {statsFetching ? "—" : stats?.total_invoices ?? "—"}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {t("chargeManagement.statsTotalAmount", { defaultValue: "Total amount" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {statsFetching ? "—" : formatMoney(stats?.total_amount as number | string | undefined)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {t("chargeManagement.statsAverage", { defaultValue: "Average invoice" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {statsFetching ? "—" : formatMoney(stats?.average_invoice_amount as number | string | undefined)}
              </p>
            </div>
          </div>
        )}

        {activeSource === "advanced" && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
            {t("chargeManagement.advancedBanner", {
              defaultValue:
                "Showing advanced search results. Adjust filters in the toolbar or return to the standard list.",
            })}{" "}
            <button
              type="button"
              className="font-medium text-[#1162a8] underline underline-offset-2 hover:text-[#0d4d86]"
              onClick={() => resetToList()}
            >
              {t("chargeManagement.backToStandardList", { defaultValue: "Back to standard list" })}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-nowrap items-center gap-2 md:gap-3 min-w-0 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
              <div className="relative min-w-[200px] max-w-xl flex-1 shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t("chargeManagement.mainSearchPlaceholder", {
                    defaultValue: "Search by patient, office, doctor, case…",
                  })}
                  className="w-full min-w-0 pl-10 h-10 text-sm"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    setPage(1)
                  }}
                  disabled={filterBarDisabled}
                />
              </div>

              <Select
                value={advDateRange}
                onValueChange={(v) => {
                  setAdvDateRange(v)
                  setPage(1)
                }}
                disabled={filterBarDisabled}
              >
                <SelectTrigger className="w-[200px] shrink-0 h-10 text-sm bg-white">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                  <SelectValue
                    placeholder={t("chargeManagement.selectDateRange", { defaultValue: "Select date range" })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    {t("chargeManagement.dateCustom", { defaultValue: "Custom" })}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("chargeManagement.dateToday", { defaultValue: "Today" })}
                  </SelectItem>
                  <SelectItem value="last_7_days">
                    {t("chargeManagement.dateLast7", { defaultValue: "Last 7 days" })}
                  </SelectItem>
                  <SelectItem value="last_month">
                    {t("chargeManagement.dateLastMonth", { defaultValue: "Last month" })}
                  </SelectItem>
                  <SelectItem value="last_year">
                    {t("chargeManagement.dateLastYear", { defaultValue: "Last year" })}
                  </SelectItem>
                </SelectContent>
              </Select>
              {advDateRange === "custom" && (
                <>
                  <Input
                    type="date"
                    className="w-[140px] shrink-0 h-10 text-sm"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setAdvDateRange("custom")
                      setPage(1)
                    }}
                    disabled={filterBarDisabled}
                  />
                  <span className="text-sm text-gray-500 shrink-0">to</span>
                  <Input
                    type="date"
                    className="w-[140px] shrink-0 h-10 text-sm"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setAdvDateRange("custom")
                      setPage(1)
                    }}
                    disabled={filterBarDisabled}
                  />
                </>
              )}

              {isLabScope && (
                <SearchableSelect
                  className="w-[200px] shrink-0 h-10 text-sm bg-white font-normal"
                  value={officeFilter}
                  onValueChange={(v) => {
                    setOfficeFilter(v === "" ? "all" : v)
                    setPage(1)
                  }}
                  disabled={filterBarDisabled || officesLoading}
                  placeholder={
                    officesLoading
                      ? t("chargeManagement.loadingOffices", { defaultValue: "Loading offices…" })
                      : t("chargeManagement.selectOfficeLab", { defaultValue: "Select Office/Lab" })
                  }
                  options={officeFilterOptions}
                  emptyMessage={t("chargeManagement.noOfficesMatch", { defaultValue: "No offices found." })}
                  searchPlaceholder={t("chargeManagement.searchOffices", { defaultValue: "Search offices…" })}
                />
              )}

              <Button
                type="button"
                variant={showAdvancedFilters ? "secondary" : "outline"}
                className="h-10 shrink-0 text-sm gap-2 ml-auto border-gray-300"
                onClick={() =>
                  setShowAdvancedFilters((v) => {
                    const next = !v
                    if (next) setActiveSource("advanced")
                    return next
                  })
                }
                disabled={filterBarDisabled}
              >
                <Filter className="h-4 w-4" />
                {t("chargeManagement.advanceFilter", { defaultValue: "Advance Filter" })}
              </Button>
            </div>
          </div>

          <ChargeManagementAdvancedFiltersPanel
            open={showAdvancedFilters}
            customerId={customerId ?? undefined}
            onHide={() => setShowAdvancedFilters(false)}
            onClearAll={clearAllAdvancedFilters}
            applying={advancedLoading}
            chips={filterChips}
            advCategoryId={advCategoryId}
            onAdvCategoryIdChange={setAdvCategoryId}
            advSubcategoryId={advSubcategoryId}
            onAdvSubcategoryIdChange={setAdvSubcategoryId}
            advProductId={advProductId}
            onAdvProductIdChange={setAdvProductId}
            advStageId={advStageId}
            onAdvStageIdChange={setAdvStageId}
            advItemStatus={advItemStatus}
            onAdvItemStatusChange={setAdvItemStatus}
            advAttachment={advAttachment}
            onAdvAttachmentChange={setAdvAttachment}
            showCasesWithAddon={showCasesWithAddon}
            onShowCasesWithAddonChange={setShowCasesWithAddon}
            showOnlyChecked={showOnlyChecked}
            onShowOnlyCheckedChange={setShowOnlyChecked}
            t={t}
          />

          {selectedItems.length > 0 && (
            <div className="px-4 pb-4 pt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/50">
              <Button
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled || selectedBillingIds.length === 0}
                onClick={() => {
                  const id = selectedBillingIds[0]
                  const row = charges.find((c) => c.billingInvoiceId === id)
                  void handleDownloadPdf(id, row)
                }}
              >
                <Download className="h-4 w-4" />
                {t("chargeManagement.generateStatement", { defaultValue: "Generate Statement" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled || selectedBillingIds.length === 0}
                onClick={() => handleSendEmail(selectedBillingIds[0])}
              >
                <Send className="h-4 w-4" />
                {t("chargeManagement.sendToOffice", { defaultValue: "Send to Office" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled}
                onClick={() => void handleBulk("mark_checked")}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {t("chargeManagement.markChecked", { defaultValue: "Mark Checked" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled}
                onClick={() => void handleBulk("mark_billed")}
              >
                <CheckCircle className="h-4 w-4" />
                {t("chargeManagement.markBilled", { defaultValue: "Mark as Billed" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled}
                onClick={() => void handleBulk("mark_refund")}
              >
                <CheckCircle className="h-4 w-4" />
                {t("chargeManagement.markRefund", { defaultValue: "Mark as Refund" })}
              </Button>
            </div>
          )}
        </div>

        {isError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
            {error && "status" in error ? `Could not load billing data (${error.status}).` : "Could not load billing data."}
          </p>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {t("chargeManagement.tableTitle", { defaultValue: "Charges" })}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("chargeManagement.tableSubtitle", {
                  defaultValue: "Line items from billing invoices for your connected offices.",
                })}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-9 text-sm gap-2 shrink-0"
              type="button"
              onClick={() => void onRefresh()}
              disabled={!customerId || isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("chargeManagement.refreshCharges", { defaultValue: "Refresh Charges" })}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="w-12 py-3">
                  <Checkbox
                    checked={charges.length > 0 && selectedItems.length === charges.length}
                    onCheckedChange={toggleSelectAll}
                    disabled={charges.length === 0}
                  />
                </TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Office Code</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Patient</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">U/L</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Product</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Grade</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Stage</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Base total</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Add-on</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">QTY</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Sub Total</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">R%</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Gross</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Due Date</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Status</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={16} className="py-12 text-center text-sm text-gray-500">
                    Loading charges…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && charges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={16} className="py-12 text-center text-sm text-gray-500">
                    No charges match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                charges.map((charge, index) => (
                  <TableRow
                    key={charge.id}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                  >
                    <TableCell className="py-3">
                      <Checkbox
                        checked={selectedItems.includes(charge.id)}
                        onCheckedChange={() => toggleSelectItem(charge.id)}
                      />
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-900">{charge.officeCode}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.patient}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.ul}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.product}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.grade}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.stage}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.baseTotal}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">
                      {charge.addOn.split("\n").map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">
                      {charge.qty.split("\n").map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">
                      {charge.subTotal.split("\n").map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.rPercent}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-900">{charge.gross}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{charge.dueDate}</TableCell>
                    <TableCell className="py-3">
                      <Badge className={getStatusColor(charge.status)}>{charge.status}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-700 hover:text-gray-900"
                          type="button"
                          title={t("chargeManagement.editInvoice", { defaultValue: "Edit invoice pricing" })}
                          onClick={() => setEditInvoiceId(charge.billingInvoiceId)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:text-amber-900 disabled:opacity-50"
                          type="button"
                          disabled={
                            !charge.slipId ||
                            (regenerateInvoiceLoading && regeneratingSlipId === charge.slipId)
                          }
                          title={t("chargeManagement.regenerateInvoice", {
                            defaultValue: "Regenerate invoice from slip",
                          })}
                          onClick={() => void handleRegenerateInvoice(charge)}
                        >
                          {regenerateInvoiceLoading && regeneratingSlipId === charge.slipId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-800"
                          type="button"
                          title={t("chargeManagement.viewInvoicePdf", { defaultValue: "View invoice PDF" })}
                          onClick={() => void handleViewInvoicePdf(charge)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-800"
                          type="button"
                          title={t("chargeManagement.downloadInvoicePdf", { defaultValue: "Download invoice PDF" })}
                          onClick={() => void handleDownloadPdf(charge.billingInvoiceId, charge)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {pagination && pagination.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {pagination.from ?? 0}–{pagination.to ?? 0} of {pagination.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={
                  activeSource === "advanced"
                    ? advancedPage <= 1 || isFetching
                    : page <= 1 || isFetching
                }
                onClick={() => {
                  if (activeSource === "advanced") void goAdvancedPage(Math.max(1, advancedPage - 1))
                  else setPage((p) => Math.max(1, p - 1))
                }}
              >
                Previous
              </Button>
              <span className="py-1 px-2">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={
                  activeSource === "advanced"
                    ? advancedPage >= pagination.last_page || isFetching
                    : page >= pagination.last_page || isFetching
                }
                onClick={() => {
                  if (activeSource === "advanced") void goAdvancedPage(advancedPage + 1)
                  else setPage((p) => p + 1)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <EditBillingInvoiceDialog
          open={editInvoiceId != null}
          onOpenChange={(o) => {
            if (!o) setEditInvoiceId(null)
          }}
          billingInvoiceId={editInvoiceId}
          onSaved={() => void onRefresh()}
        />

        <Dialog open={pdfViewerOpen} onOpenChange={(open) => !open && closePdfViewer()}>
          <DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
            <DialogHeader className="border-b px-6 py-4 pr-14 text-left">
              <DialogTitle>
                {t("chargeManagement.invoicePdfPreview", { defaultValue: "Invoice PDF" })}
              </DialogTitle>
              {pdfViewerTitle ? (
                <p className="text-sm font-normal text-muted-foreground">{pdfViewerTitle}</p>
              ) : null}
            </DialogHeader>
            <div className="relative min-h-[50vh] w-full flex-1 bg-muted/20">
              {pdfViewerLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {pdfViewerUrl ? (
                <iframe
                  ref={pdfIframeRef}
                  title={pdfViewerTitle || "Invoice PDF"}
                  src={pdfViewerUrl}
                  className="h-[min(70vh,720px)] w-full border-0"
                />
              ) : null}
            </div>
            <DialogFooter className="flex-col gap-2 border-t px-6 py-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={closePdfViewer}>
                {t("chargeManagement.close", { defaultValue: "Close" })}
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={handlePrintPdfViewer}
                disabled={!pdfViewerUrl || pdfViewerLoading}
              >
                <Printer className="h-4 w-4" />
                {t("chargeManagement.printPdf", { defaultValue: "Print" })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
