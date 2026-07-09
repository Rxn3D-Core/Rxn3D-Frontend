"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LabBillingPageHeader } from "@/components/billing/lab-billing-page-header"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import {
  Filter,
  Search,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Send,
  CheckCircle,
  Eye,
  Loader2,
  Printer,
  Pencil,
  RotateCcw,
  Mail,
  X,
  ExternalLink,
  FileText,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  TableFooter,
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
  useGenerateStatementMutation,
  useGenerateStatementPdfMutation,
  useLazyPreviewStatementEmailQuery,
  useSendStatementMutation,
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
  StatementRecord,
  StatementEmailPreview,
} from "@/lib/redux/api/billingApi"
import { useAuth } from "@/contexts/auth-context"
import { useCustomer } from "@/contexts/customer-context"
import { useConnectedOffices } from "@/hooks/use-connected-offices"
import { openBlobInNewTab, pdfBlobFromBase64 } from "@/lib/open-pdf-from-base64"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { EditBillingInvoiceDialog } from "@/components/billing/edit-billing-invoice-dialog"
import { StatementEmailRichTextEditor } from "@/components/statement-email-rich-text-editor"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  applyStatementEmailMessageToPreviewHtml,
  normalizeStatementEmailMessageHtml,
} from "@/lib/statement-email-rich-text"

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

type StatementOfficeGroup = {
  officeId: number
  officeName: string
  officeCode: string
  recipientEmail: string
  billingIds: number[]
  chargeCount: number
  invoiceCount: number
  invoiceLabel: string
  totalAmount: number
}

type StatementJobStatus = {
  officeId: number
  status: "pending" | "generating" | "generated" | "opened" | "sending" | "sent" | "skipped" | "error"
  label: string
  statement?: StatementRecord | null
  pdfUrl?: string | null
  error?: string | null
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function isRefundLikeStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase()
  return normalized === "refund" || normalized === "refunded"
}

function parseMoneyValue(value: string | null | undefined): number {
  if (!value) return 0
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
  return Number.isNaN(n) ? 0 : n
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
  if (s === "unbilled") return "Unbilled"
  if (s === "checked") return "Checked"
  if (s === "billed") return "Billed"
  if (s === "paid") return "Paid"
  if (s === "refunded") return "Refunded"
  if (s === "disputed") return "Disputed"
  if (s === "sent") return "Sent"
  if (s === "overdue") return "Overdue"
  if (s === "cancelled") return "Cancelled"
  return status
}

function statementSignedAmount(charge: Pick<ChargeRow, "gross" | "status">): number {
  const amount = parseMoneyValue(charge.gross)
  return isRefundLikeStatus(charge.status) ? -amount : amount
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function formatToolbarDateRange(range: DateRange | undefined): string {
  if (!range?.from) return "Select date range"
  if (!range.to) return format(range.from, "MMM d, yyyy")
  return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`
}

function splitEmails(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

function joinEmails(values: string[] | null | undefined): string {
  return (values ?? []).filter(Boolean).join(", ")
}

function buildStatementPdfFilename(office: string, statementId: string | number): string {
  const seg = (s: string) =>
    s
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48) || "statement"
  return `${seg(office)}-${seg(String(statementId))}.pdf`
}

function normalizeStatementSubject(subject: string | null | undefined): string {
  const trimmed = subject?.trim()
  if (!trimmed) return ""
  return trimmed.replace(/RXn3D/gi, "HMC Innovs")
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
  if (preset === "this_week") {
    const s = new Date(now)
    const day = s.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    s.setDate(s.getDate() + diffToMonday)
    return { from: fmt(s), to: fmt(now) }
  }
  if (preset === "last_week") {
    const currentWeekStart = new Date(now)
    const day = currentWeekStart.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    currentWeekStart.setDate(currentWeekStart.getDate() + diffToMonday)
    const s = new Date(currentWeekStart)
    s.setDate(currentWeekStart.getDate() - 7)
    const e = new Date(currentWeekStart)
    e.setDate(currentWeekStart.getDate() - 1)
    return { from: fmt(s), to: fmt(e) }
  }
  if (preset === "this_month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: fmt(s), to: fmt(now) }
  }
  if (preset === "last_month") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const e = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: fmt(s), to: fmt(e) }
  }
  if (preset === "this_year") {
    const s = new Date(now.getFullYear(), 0, 1)
    return { from: fmt(s), to: fmt(now) }
  }
  if (preset === "last_year") {
    const s = new Date(now.getFullYear() - 1, 0, 1)
    const e = new Date(now.getFullYear() - 1, 11, 31)
    return { from: fmt(s), to: fmt(e) }
  }
  return null
}

function resolveAdvancedDateRangeValue(preset: string): AdvancedBillingSearchBody["date_range"] {
  switch (preset) {
    case "today":
    case "yesterday":
    case "this_week":
    case "last_week":
    case "this_month":
    case "last_month":
    case "this_year":
    case "last_year":
      return preset
    default:
      return "custom"
  }
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

    const rowStatus = mapInvoiceStatusToLabel(p.item_status ?? p.status ?? inv.status)

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
      status: rowStatus,
    }
  })
}

export default function ChargeManagementPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
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
  const [advDateRange, setAdvDateRange] = useState<string>("today")
  const [customDateRangeOpen, setCustomDateRangeOpen] = useState(false)
  const [statementModalOpen, setStatementModalOpen] = useState(false)
  const [statementModalStep, setStatementModalStep] = useState<"confirm" | "generating" | "sending">("confirm")
  const [statementAutoMarkBilled, setStatementAutoMarkBilled] = useState(false)
  const [statementAttachPdf, setStatementAttachPdf] = useState(true)
  const [statementPreviewOpen, setStatementPreviewOpen] = useState(false)
  const [statementPreviewLoading, setStatementPreviewLoading] = useState(false)
  const [statementPreviewOfficeId, setStatementPreviewOfficeId] = useState<number | null>(null)
  const [statementPreviewTitle, setStatementPreviewTitle] = useState("")
  const [statementPreviewRecipient, setStatementPreviewRecipient] = useState("")
  const [statementPreviewHtml, setStatementPreviewHtml] = useState("")
  const [statementJobStatuses, setStatementJobStatuses] = useState<StatementJobStatus[]>([])
  const [generatedStatements, setGeneratedStatements] = useState<StatementRecord[]>([])
  const [sendQueueIndex, setSendQueueIndex] = useState(0)
  const [sendToValue, setSendToValue] = useState("")
  const [sendCcValue, setSendCcValue] = useState("")
  const [sendBccValue, setSendBccValue] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [sendSubjectValue, setSendSubjectValue] = useState("")
  const [sendMessageValue, setSendMessageValue] = useState("")
  const [sendPreviewBaseHtml, setSendPreviewBaseHtml] = useState("")
  const [sendPreviewHtml, setSendPreviewHtml] = useState("")
  const [sendPreviewLoading, setSendPreviewLoading] = useState(false)
  const [statementActionLoading, setStatementActionLoading] = useState<"generate" | "send" | null>(null)

  const [editInvoiceId, setEditInvoiceId] = useState<number | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [pdfViewerTitle, setPdfViewerTitle] = useState("")
  const [pdfViewerLoading, setPdfViewerLoading] = useState(false)
  const [sendToOfficeOpen, setSendToOfficeOpen] = useState(false)
  const [sendToOfficeBillingId, setSendToOfficeBillingId] = useState<number | null>(null)
  const [sendToOfficeEmail, setSendToOfficeEmail] = useState("")
  const pdfViewerBlobUrlRef = useRef<string | null>(null)
  const statementPreviewCacheRef = useRef<Map<number, StatementRecord>>(new Map())
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

  const selectedCustomDateRange = useMemo<DateRange | undefined>(() => {
    const from = parseDateInput(dateFrom)
    const to = parseDateInput(dateTo)
    if (!from && !to) return undefined
    return { from, to: to ?? from }
  }, [dateFrom, dateTo])

  const handleCustomDateRangeSelect = useCallback((range: DateRange | undefined) => {
    setAdvDateRange("custom")
    setPage(1)
    if (!range?.from) {
      setDateFrom("")
      setDateTo("")
      return
    }
    setDateFrom(formatDateInput(range.from))
    setDateTo(range.to ? formatDateInput(range.to) : "")
    if (range.to) {
      setCustomDateRangeOpen(false)
    }
  }, [])

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
    params.client_date_preset = advDateRange
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
    advDateRange,
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
  const [generateStatement] = useGenerateStatementMutation()
  const [generateStatementPdf] = useGenerateStatementPdfMutation()
  const [previewStatementEmail] = useLazyPreviewStatementEmailQuery()
  const [sendStatement, { isLoading: sendingStatementNow }] = useSendStatementMutation()
  const [sendStatementEmail, { isLoading: sendEmailLoading }] = useSendStatementEmailMutation()
  const [regenerateSlipInvoice, { isLoading: regenerateInvoiceLoading }] = useRegenerateSlipInvoiceMutation()

  const [regeneratingSlipId, setRegeneratingSlipId] = useState<number | null>(null)
  const [markingCheckedChargeId, setMarkingCheckedChargeId] = useState<string | null>(null)
  const [generatingStatements, setGeneratingStatements] = useState(false)

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

  const fetchAuthorizedBlob = useCallback(async (pathOrUrl: string): Promise<Blob> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const response = await fetch(resolveBillingAssetUrl(pathOrUrl), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.blob()
  }, [])

  const createBlobUrl = useCallback((blob: Blob): string => {
    return URL.createObjectURL(blob)
  }, [])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

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

  // Billed items clutter the default view, so hide them unless the user is
  // actively searching or has explicitly asked to see billed items.
  const isSearchingOrFilteringBilled =
    debouncedSearch.trim().length > 0 || advItemStatus === "billed"

  const charges: ChargeRow[] = useMemo(() => {
    if (!displayResult?.data?.length) return []
    const rows = displayResult.data.flatMap((inv) => billingInvoiceToRows(inv))
    if (isSearchingOrFilteringBilled) return rows
    return rows.filter((row) => row.status !== "Billed")
  }, [displayResult, isSearchingOrFilteringBilled])
  const sendToOfficeCharge = useMemo(
    () => charges.find((charge) => charge.billingInvoiceId === sendToOfficeBillingId) ?? null,
    [charges, sendToOfficeBillingId],
  )
  const sendToOfficeEmailValid =
    sendToOfficeEmail.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendToOfficeEmail.trim())

  const pagination = displayResult?.pagination

  const selectedBillingIds = useMemo(() => {
    const set = new Set<number>()
    charges.forEach((ch) => {
      if (selectedItems.includes(ch.id)) set.add(ch.billingInvoiceId)
    })
    return Array.from(set)
  }, [charges, selectedItems])

  const selectedBillingInvoices = useMemo(() => {
    const invoices = displayResult?.data ?? []
    const selectedIdSet = new Set(selectedBillingIds)
    return invoices.filter((invoice) => selectedIdSet.has(invoice.id))
  }, [displayResult, selectedBillingIds])

  const selectedStatementOfficeSummary = useMemo(() => {
    const officeNames = Array.from(
      new Set(
        selectedBillingInvoices
          .map((invoice) => invoice.office?.name?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    )

    return {
      officeCount: officeNames.length,
      officeNames,
    }
  }, [selectedBillingInvoices])

  const selectedStatementGroups = useMemo<StatementOfficeGroup[]>(() => {
    const selectedChargeRows = charges.filter((charge) => selectedItems.includes(charge.id))
    const invoiceMap = new Map(selectedBillingInvoices.map((invoice) => [invoice.id, invoice] as const))
    const grouped = new Map<number, StatementOfficeGroup>()

    selectedChargeRows.forEach((charge) => {
      const invoice = invoiceMap.get(charge.billingInvoiceId)
      const officeId = invoice?.office?.id
      if (officeId == null) return

      const existing = grouped.get(officeId)
      if (existing) {
        if (!existing.billingIds.includes(charge.billingInvoiceId)) {
          existing.billingIds.push(charge.billingInvoiceId)
          existing.invoiceCount += 1
        }
        existing.chargeCount += 1
        existing.totalAmount += statementSignedAmount(charge)
        return
      }

      grouped.set(officeId, {
        officeId,
        officeName: invoice?.office?.name?.trim() || charge.officeName,
        officeCode: charge.officeCode,
        recipientEmail: invoice?.office?.email?.trim() || "",
        billingIds: [charge.billingInvoiceId],
        chargeCount: 1,
        invoiceCount: 1,
        invoiceLabel: charge.invoiceNumber,
        totalAmount: statementSignedAmount(charge),
      })
    })

    return Array.from(grouped.values())
  }, [charges, selectedBillingInvoices, selectedItems])

  const allChargesSelected = charges.length > 0 && selectedItems.length === charges.length

  const selectedChargesAllChecked = useMemo(() => {
    if (selectedItems.length === 0) return false
    const selectedChargeRows = charges.filter((charge) => selectedItems.includes(charge.id))
    return selectedChargeRows.length > 0 && selectedChargeRows.every((charge) => charge.status.toLowerCase() === "checked")
  }, [charges, selectedItems])

  const selectedGrossTotal = useMemo(() => {
    return charges.reduce((sum, charge) => sum + statementSignedAmount(charge), 0)
  }, [charges])

  const currentSendStatement = generatedStatements[sendQueueIndex] ?? null
  const currentSendGroup = useMemo(() => {
    if (!currentSendStatement) return null
    return (
      selectedStatementGroups.find((group) => group.officeId === currentSendStatement.office?.id) ?? null
    )
  }, [currentSendStatement, selectedStatementGroups])
  const sendQueueCircleItems = useMemo(() => {
    const total = generatedStatements.length
    if (total <= 4) {
      return generatedStatements.map((statement, index) => ({
        key: `statement-${statement.id}`,
        label: String(index + 1),
        active: index === sendQueueIndex,
        done: index < sendQueueIndex,
      }))
    }

    return [
      { key: "circle-1", label: "1", active: sendQueueIndex === 0, done: sendQueueIndex > 0 },
      { key: "circle-2", label: "2", active: sendQueueIndex === 1, done: sendQueueIndex > 1 },
      { key: "circle-3", label: "3", active: sendQueueIndex === 2, done: sendQueueIndex > 2 },
      { key: "circle-4", label: `${total - 2}+`, active: sendQueueIndex >= 3, done: sendQueueIndex >= total - 1 },
    ]
  }, [generatedStatements, sendQueueIndex])

  const statementProgressPercent = useMemo(() => {
    if (statementJobStatuses.length === 0) return 0
    const completeCount = statementJobStatuses.filter((item) =>
      ["generated", "opened", "sent", "skipped", "error"].includes(item.status),
    ).length
    return Math.round((completeCount / statementJobStatuses.length) * 100)
  }, [statementJobStatuses])

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
      date_range: resolveAdvancedDateRangeValue(advDateRange),
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
        return "bg-[#E5E7EB] text-[#6B7280]"
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

  // ponytail: this only flips local intent — auto_mark_billed is carried
  // through generate and only applied server-side once the statement is
  // actually sent, so flipping the switch never mutates data on its own.
  const handleStatementAutoMarkBilledToggle = useCallback(() => {
    setStatementAutoMarkBilled((value) => !value)
  }, [])

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

  const handleMarkCheckedForRow = async (charge: ChargeRow) => {
    if (charge.status.toLowerCase() !== "pending") return
    setMarkingCheckedChargeId(charge.id)
    try {
      await bulkAction({ billing_ids: [charge.billingInvoiceId], action: "mark_checked" }).unwrap()
      await onRefresh()
    } catch (e: unknown) {
      toast({
        title: "Could not mark as checked",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setMarkingCheckedChargeId(null)
    }
  }

  const handleViewInvoicePdf = async (charge: ChargeRow) => {
    // Open the tab synchronously on click so it counts as a direct user gesture —
    // opening it after the await below gets blocked as a popup by most browsers.
    // Must NOT pass noopener/noreferrer here: that severs the `win` reference we
    // need below to set its location once the PDF blob is ready.
    const win = window.open("", "_blank")
    try {
      const blob = await fetchInvoicePdfBlob(charge.billingInvoiceId)
      const url = URL.createObjectURL(blob)
      if (win) {
        win.location.href = url
        window.setTimeout(() => URL.revokeObjectURL(url), 180_000)
      } else {
        const opened = openBlobInNewTab(blob)
        if (!opened) {
          toast({
            title: "Pop-up blocked",
            description: "Please allow pop-ups for this site and try again.",
            variant: "destructive",
          })
        }
      }
    } catch {
      win?.close()
      toast({ title: "Could not open invoice PDF", variant: "destructive" })
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

  const handlePrintPdfViewer = () => {
    const win = pdfIframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  const closeSendToOfficeDialog = useCallback(() => {
    if (sendEmailLoading) return
    setSendToOfficeOpen(false)
    setSendToOfficeBillingId(null)
    setSendToOfficeEmail("")
  }, [sendEmailLoading])

  const openSendToOfficeDialog = (billingId: number) => {
    setSendToOfficeBillingId(billingId)
    setSendToOfficeEmail("")
    setSendToOfficeOpen(true)
  }

  const handleSendEmail = async () => {
    const billingId = sendToOfficeBillingId
    const email = sendToOfficeEmail.trim()
    if (!billingId || !email) return
    try {
      await sendStatementEmail({ billingId, body: { email } }).unwrap()
      toast({ title: "Email sent" })
      closeSendToOfficeDialog()
    } catch {
      toast({ title: "Send failed", variant: "destructive" })
    }
  }

  const handleGenerateStatements = async () => {
    if (selectedBillingInvoices.length === 0 || selectedStatementGroups.length === 0) {
      toast({ title: "Select at least one invoice", variant: "destructive" })
      return
    }

    setStatementAutoMarkBilled(false)
    setStatementAttachPdf(true)
    setStatementJobStatuses(
      selectedStatementGroups.map((group) => ({
        officeId: group.officeId,
        status: "pending",
        label: "Ready to generate",
      })),
    )
    setGeneratedStatements([])
    setSendQueueIndex(0)
    setSendPreviewBaseHtml("")
    setSendPreviewHtml("")
    setSendToValue("")
    setSendCcValue("")
    setSendBccValue("")
    setSendSubjectValue("")
    setSendMessageValue("")
    setStatementModalStep("confirm")
    setStatementModalOpen(true)
  }

  const updateStatementJobStatus = useCallback((officeId: number, patch: Partial<StatementJobStatus>) => {
    setStatementJobStatuses((current) =>
      current.map((item) => (item.officeId === officeId ? { ...item, ...patch } : item)),
    )
  }, [])

  const generateStatementForGroup = useCallback(
    async (group: StatementOfficeGroup): Promise<StatementRecord> => {
      return generateStatement({
        billing_ids: group.billingIds,
        office_id: group.officeId,
        direction: "outgoing",
        template: "default",
        auto_mark_billed: statementAutoMarkBilled,
      })
        .unwrap()
        .then((result) => {
          if (!result?.data) throw new Error("Statement generation returned no data")
          return result.data
        })
    },
    [generateStatement, statementAutoMarkBilled],
  )

  const downloadStatementPdfForStatement = useCallback(
    async (statement: StatementRecord, officeName: string): Promise<string> => {
      const result = await generateStatementPdf(statement.id).unwrap()
      const downloadPath = result?.data?.download_url || result?.data?.pdf_url
      if (!downloadPath) throw new Error("No statement PDF URL returned by the server")
      const blob = await fetchAuthorizedBlob(downloadPath)
      const filename = buildStatementPdfFilename(officeName, statement.statement_id || statement.id)
      downloadBlob(blob, filename)
      return createBlobUrl(blob)
    },
    [createBlobUrl, downloadBlob, fetchAuthorizedBlob, generateStatementPdf],
  )

  const handleGenerateOnlyStatements = useCallback(async () => {
    if (selectedStatementGroups.length === 0) return
    setStatementActionLoading("generate")
    setStatementModalStep("generating")
    setGeneratingStatements(true)
    setStatementJobStatuses(
      selectedStatementGroups.map((group) => ({
        officeId: group.officeId,
        status: "pending",
        label: "Queued",
      })),
    )

    try {
      const createdStatements: StatementRecord[] = []
      for (const group of selectedStatementGroups) {
        updateStatementJobStatus(group.officeId, { status: "generating", label: "Generating statement..." })
        try {
          const statement = await generateStatementForGroup(group)
          createdStatements.push(statement)
          updateStatementJobStatus(group.officeId, {
            status: "generated",
            label: "Statement created",
            statement,
          })

          const pdfUrl = await downloadStatementPdfForStatement(statement, group.officeName)
          updateStatementJobStatus(group.officeId, {
            status: "opened",
            label: "PDF downloaded",
            statement,
            pdfUrl,
          })

        } catch (error) {
          updateStatementJobStatus(group.officeId, {
            status: "error",
            label: "Generation failed",
            error: error instanceof Error ? error.message : "Request failed",
          })
        }
      }

      setGeneratedStatements(createdStatements)
      setSelectedItems([])
      await onRefresh()

      const successCount = createdStatements.length
      const failureCount = selectedStatementGroups.length - successCount

      toast({
        title: failureCount === 0 ? "Statements created" : "Statements partially created",
        description:
          failureCount === 0
            ? `Created ${successCount} statement${successCount === 1 ? "" : "s"} across ${selectedStatementGroups.length} office${selectedStatementGroups.length === 1 ? "" : "s"}.`
            : `Created ${successCount} statement${successCount === 1 ? "" : "s"} and ${failureCount} office group${failureCount === 1 ? "" : "s"} failed.`,
        variant: failureCount === 0 ? "default" : "destructive",
      })

      setStatementModalOpen(false)
    } finally {
      setGeneratingStatements(false)
      setStatementActionLoading(null)
    }
  }, [
    generateStatementForGroup,
    onRefresh,
    downloadStatementPdfForStatement,
    selectedStatementGroups,
    updateStatementJobStatus,
  ])

  const buildSendDraftFromPreview = useCallback((statement: StatementRecord, preview: StatementEmailPreview) => {
    setSendToValue(preview.recipient_email || statement.recipient_email || statement.office?.email || "")
    setSendCcValue(joinEmails(preview.cc_emails))
    setSendBccValue(joinEmails(preview.bcc_emails))
    setSendSubjectValue(
      normalizeStatementSubject(
        preview.subject || statement.subject || `Your statement from ${statement.lab?.name || statement.office?.name || ""} is ready`,
      ),
    )
    const nextMessage = normalizeStatementEmailMessageHtml(preview.message || statement.message || "")
    const nextPreview = preview.preview_html || ""
    setSendMessageValue(nextMessage)
    setSendPreviewBaseHtml(nextPreview)
    setSendPreviewHtml(applyStatementEmailMessageToPreviewHtml(nextPreview, nextMessage))
  }, [])

  const loadSendPreviewForStatement = useCallback(async (statement: StatementRecord) => {
    setSendPreviewLoading(true)
    try {
      const preview = await previewStatementEmail(statement.id).unwrap()
      buildSendDraftFromPreview(statement, preview)
    } catch {
      setSendPreviewBaseHtml("")
      setSendPreviewHtml("")
      buildSendDraftFromPreview(statement, {})
    } finally {
      setSendPreviewLoading(false)
    }
  }, [buildSendDraftFromPreview, previewStatementEmail])

  useEffect(() => {
    if (!sendPreviewBaseHtml) return
    setSendPreviewHtml(applyStatementEmailMessageToPreviewHtml(sendPreviewBaseHtml, sendMessageValue))
  }, [sendMessageValue, sendPreviewBaseHtml])

  const handleGenerateAndSendStatements = useCallback(async () => {
    if (selectedStatementGroups.length === 0) return
    setStatementActionLoading("send")
    setStatementModalStep("generating")
    setGeneratingStatements(true)
    setStatementJobStatuses(
      selectedStatementGroups.map((group) => ({
        officeId: group.officeId,
        status: "pending",
        label: "Queued",
      })),
    )

    const createdStatements: StatementRecord[] = []
    try {
      for (const group of selectedStatementGroups) {
        updateStatementJobStatus(group.officeId, { status: "generating", label: "Generating statement..." })
        try {
          const statement = await generateStatementForGroup(group)
          createdStatements.push(statement)
          const pdfUrl = await downloadStatementPdfForStatement(statement, group.officeName)
          updateStatementJobStatus(group.officeId, {
            status: "generated",
            label: "Downloaded and ready to send",
            statement,
            pdfUrl,
          })
        } catch (error) {
          updateStatementJobStatus(group.officeId, {
            status: "error",
            label: "Generation failed",
            error: error instanceof Error ? error.message : "Request failed",
          })
        }
      }

      if (createdStatements.length === 0) {
        toast({ title: "Statement generation failed", variant: "destructive" })
        return
      }

      setGeneratedStatements(createdStatements)
      setSendQueueIndex(0)
      setStatementModalStep("sending")
      await loadSendPreviewForStatement(createdStatements[0])
      await onRefresh()
    } finally {
      setGeneratingStatements(false)
      setStatementActionLoading(null)
    }
  }, [
    generateStatementForGroup,
    loadSendPreviewForStatement,
    onRefresh,
    downloadStatementPdfForStatement,
    selectedStatementGroups,
    updateStatementJobStatus,
  ])

  const handleSkipCurrentEmail = useCallback(async () => {
    if (!currentSendStatement) return
    updateStatementJobStatus(currentSendStatement.office?.id ?? currentSendStatement.id, {
      status: "skipped",
      label: "Skipped",
    })
    const nextIndex = sendQueueIndex + 1
    if (nextIndex >= generatedStatements.length) {
      setStatementModalOpen(false)
      toast({ title: "Email sending finished" })
      return
    }
    setSendQueueIndex(nextIndex)
    await loadSendPreviewForStatement(generatedStatements[nextIndex])
  }, [currentSendStatement, generatedStatements, loadSendPreviewForStatement, sendQueueIndex, updateStatementJobStatus, toast])

  const handleCancelAllEmails = useCallback(() => {
    setStatementModalOpen(false)
    toast({ title: "Remaining emails cancelled" })
  }, [toast])

  const handleSendAllRemaining = useCallback(async () => {
    for (let i = sendQueueIndex; i < generatedStatements.length; i++) {
      const stmt = generatedStatements[i]
      const officeId = stmt.office?.id ?? stmt.id
      const toEmails = i === sendQueueIndex ? splitEmails(sendToValue) : [stmt.office?.email ?? ""]
      if (toEmails.length === 0 || !toEmails[0]) continue
      updateStatementJobStatus(officeId, { status: "sending", label: "Sending..." })
      try {
        await sendStatement({
          id: stmt.id,
          body: {
            recipient_email: toEmails[0],
            cc_emails: i === sendQueueIndex ? splitEmails(sendCcValue) : [],
            bcc_emails: i === sendQueueIndex ? splitEmails(sendBccValue) : [],
            subject: sendSubjectValue,
            message: sendMessageValue,
            template: stmt.template_used ?? "default",
            include_pdf: statementAttachPdf,
          },
        }).unwrap()
        updateStatementJobStatus(officeId, { status: "sent", label: "Email sent" })
      } catch (error) {
        updateStatementJobStatus(officeId, {
          status: "error",
          label: "Send failed",
          error: error instanceof Error ? error.message : "Request failed",
        })
      }
    }
    setStatementModalOpen(false)
    setSelectedItems([])
    toast({ title: "All remaining statements sent" })
    await onRefresh()
  }, [
    generatedStatements,
    onRefresh,
    sendBccValue,
    sendCcValue,
    sendMessageValue,
    sendQueueIndex,
    sendStatement,
    sendSubjectValue,
    sendToValue,
    statementAttachPdf,
    toast,
    updateStatementJobStatus,
  ])

  const handlePreviewEmailInNewTab = useCallback(async () => {
    if (!currentSendStatement) return
    const previewWindow = window.open("", "_blank", "noopener,noreferrer")
    try {
      const html = sendPreviewHtml || "<p>No preview available.</p>"
      if (!previewWindow) throw new Error("Preview window was blocked")
      previewWindow.document.open()
      previewWindow.document.write(html)
      previewWindow.document.close()
    } catch (error) {
      previewWindow?.close()
      toast({
        title: "Unable to preview email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }, [currentSendStatement, sendPreviewHtml, toast])

  const handleSendCurrentEmail = useCallback(async () => {
    if (!currentSendStatement) return
    const toEmails = splitEmails(sendToValue)
    if (toEmails.length === 0) {
      toast({ title: "Add at least one recipient email", variant: "destructive" })
      return
    }
    const ccEmails = splitEmails(sendCcValue)
    const bccEmails = splitEmails(sendBccValue)

    const officeId = currentSendStatement.office?.id ?? currentSendStatement.id
    updateStatementJobStatus(officeId, { status: "sending", label: "Sending..." })
    try {
      await sendStatement({
        id: currentSendStatement.id,
        body: {
          recipient_email: toEmails[0],
          cc_emails: [...toEmails.slice(1), ...ccEmails],
          bcc_emails: bccEmails,
          subject: sendSubjectValue,
          message: sendMessageValue,
          template: currentSendStatement.template_used ?? "default",
          include_pdf: statementAttachPdf,
        },
      }).unwrap()

      updateStatementJobStatus(officeId, { status: "sent", label: "Email sent" })
      const nextIndex = sendQueueIndex + 1
      if (nextIndex >= generatedStatements.length) {
        setStatementModalOpen(false)
        setSelectedItems([])
        toast({ title: "All statement emails sent" })
        await onRefresh()
        return
      }
      setSendQueueIndex(nextIndex)
      await loadSendPreviewForStatement(generatedStatements[nextIndex])
    } catch (error) {
      updateStatementJobStatus(officeId, {
        status: "error",
        label: "Send failed",
        error: error instanceof Error ? error.message : "Request failed",
      })
      toast({
        title: "Unable to send statement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }, [
    currentSendStatement,
    generatedStatements,
    loadSendPreviewForStatement,
    onRefresh,
    sendBccValue,
    sendCcValue,
    sendMessageValue,
    sendQueueIndex,
    sendStatement,
    sendSubjectValue,
    sendToValue,
    statementAttachPdf,
    toast,
    updateStatementJobStatus,
  ])

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
  const actionDisabled = !customerId || bulkLoading || sendEmailLoading || generatingStatements

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

        <div className="bg-white rounded-lg mb-4">
          <div className="px-4 py-2">
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
                <SelectTrigger className="w-[200px] shrink-0 h-10 text-sm bg-white focus:ring-0 focus:ring-offset-0 focus:border-input">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                  <SelectValue
                    placeholder={t("chargeManagement.selectDateRange", { defaultValue: "Select date range" })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">
                    {t("chargeManagement.dateToday", { defaultValue: "Today" })}
                  </SelectItem>
                  <SelectItem value="yesterday">
                    {t("chargeManagement.dateYesterday", { defaultValue: "Yesterday" })}
                  </SelectItem>
                  <SelectItem value="this_week">
                    {t("chargeManagement.dateThisWeek", { defaultValue: "This Week" })}
                  </SelectItem>
                  <SelectItem value="last_week">
                    {t("chargeManagement.dateLastWeek", { defaultValue: "Last Week" })}
                  </SelectItem>
                  <SelectItem value="this_month">
                    {t("chargeManagement.dateThisMonth", { defaultValue: "This Month" })}
                  </SelectItem>
                  <SelectItem value="last_month">
                    {t("chargeManagement.dateLastMonth", { defaultValue: "Last month" })}
                  </SelectItem>
                  <SelectItem value="this_year">
                    {t("chargeManagement.dateThisYear", { defaultValue: "This Year" })}
                  </SelectItem>
                  <SelectItem value="last_year">
                    {t("chargeManagement.dateLastYear", { defaultValue: "Last year" })}
                  </SelectItem>
                  <SelectItem value="custom">
                    {t("chargeManagement.dateCustom", { defaultValue: "Custom" })}
                  </SelectItem>
                </SelectContent>
              </Select>
              {advDateRange === "custom" && (
                <Popover open={customDateRangeOpen} onOpenChange={setCustomDateRangeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-[280px] shrink-0 h-10 justify-start text-sm font-normal"
                      disabled={filterBarDisabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
                      <span className="truncate">
                        {selectedCustomDateRange?.from
                          ? formatToolbarDateRange(selectedCustomDateRange)
                          : t("chargeManagement.selectDateRange", { defaultValue: "Select date range" })}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      defaultMonth={selectedCustomDateRange?.from}
                      selected={selectedCustomDateRange}
                      onSelect={handleCustomDateRangeSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                title="Open advanced search and filter options. Narrow by date, office, product, and more."
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
                title="Generate a billing statement per office. Even if multiple lines are selected, each office gets a separate statement."
                onClick={() => void handleGenerateStatements()}
              >
                {statementActionLoading != null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t("chargeManagement.generateStatement", { defaultValue: "Generate Statement" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled || selectedBillingIds.length === 0}
                title="Send selected case(s) or statement to the connected office + automatically generate statement"
                onClick={() => void handleGenerateStatements()}
              >
                <Send className="h-4 w-4" />
                {t("chargeManagement.sendToOffice", { defaultValue: "Send to Office" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled}
                title={
                  selectedChargesAllChecked
                    ? "Move selected lines back to “Pending” status."
                    : "Mark selected lines as “Checked”. The review icon will disappear. No changes to billing."
                }
                onClick={() => void handleBulk(selectedChargesAllChecked ? "mark_pending" : "mark_checked")}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {selectedChargesAllChecked
                  ? t("chargeManagement.uncheck", { defaultValue: "Uncheck" })
                  : t("chargeManagement.markChecked", { defaultValue: "Mark Checked" })}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm gap-2"
                type="button"
                disabled={actionDisabled}
                title="Update selected lines to “Billed” status without generating a statement."
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
                title="Mark selected line(s) as refunded. These amounts will be deducted from future statements."
                onClick={() => void handleBulk("mark_refund")}
              >
                <CheckCircle className="h-4 w-4" />
                {t("chargeManagement.markRefund", { defaultValue: "Mark as Refund" })}
              </Button>
              <p className="w-full text-xs text-gray-500">
                {selectedStatementOfficeSummary.officeCount <= 1
                  ? t("chargeManagement.statementGroupingHintSingle", {
                      defaultValue: "This action creates 1 combined statement for {{office}}.",
                      office: selectedStatementOfficeSummary.officeNames[0] ?? "the selected office",
                    })
                  : t("chargeManagement.statementGroupingHintMulti", {
                      defaultValue: "This action creates {{count}} statements, grouped by office.",
                      count: selectedStatementOfficeSummary.officeCount,
                    })}
              </p>
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
              title="Revert charges to default system settings. Manual edits will be undone. Due date will not be affected."
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
                <TableHead className="py-3 text-xs font-semibold text-gray-700" title="Edit the base price for this product. Changes will override system defaults.">Base total</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700" title="Edit add on fees.">Add-on</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700" title="Quantity of selected add-on(s).">QTY</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700" title="Calculated subtotal before rush fees. Editable.">Sub Total</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700" title="Rush fee percentage.">R%</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700" title="Final calculated charge. Editing this does not auto-update other values.">Gross</TableHead>
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
                    className={`border-b border-gray-100 ${
                      charge.status.toLowerCase() === "billed"
                        ? "bg-green-100/70 hover:bg-green-100/70"
                        : charge.status.toLowerCase() === "checked"
                        ? "bg-blue-100/70 hover:bg-blue-100/70"
                        : index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
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
                          className={`h-8 w-8 disabled:opacity-50 ${
                            charge.status.toLowerCase() === "checked"
                              ? "text-green-600 hover:text-green-700"
                              : "text-gray-400 hover:text-gray-500"
                          }`}
                          type="button"
                          disabled={charge.status.toLowerCase() !== "pending" || markingCheckedChargeId === charge.id}
                          title={
                            charge.status.toLowerCase() === "checked"
                              ? "Already marked as checked"
                              : t("chargeManagement.markChecked", { defaultValue: "Mark Checked" })
                          }
                          onClick={() => void handleMarkCheckedForRow(charge)}
                        >
                          {markingCheckedChargeId === charge.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
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
                          disabled={!charge.slipId}
                          title={t("chargeManagement.viewVirtualSlip", { defaultValue: "View virtual slip" })}
                          onClick={() => router.push(buildVirtualSlipV2Path(charge.slipId))}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-800"
                          type="button"
                          title={t("chargeManagement.viewInvoice", { defaultValue: "View invoice" })}
                          onClick={() => void handleViewInvoicePdf(charge)}
                        >
                          <FileText className="h-4 w-4" />
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
            {allChargesSelected && (
              <TableFooter>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableCell colSpan={12} className="py-3 text-right text-sm font-semibold text-gray-700">
                    Total:
                  </TableCell>
                  <TableCell className="py-3 text-sm font-semibold text-purple-700">
                    {formatMoney(selectedGrossTotal)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            )}
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

        <Dialog
          open={statementModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setStatementModalOpen(false)
              setStatementActionLoading(null)
            }
          }}
        >
          <DialogContent
            className="flex max-h-[90vh] w-[min(96vw,68rem)] flex-col gap-0 overflow-hidden rounded-[16px] p-0 sm:rounded-[20px]"
            showCloseButton={false}
          >
            <DialogClose className="absolute right-5 top-5 z-10 rounded-sm p-1 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-6 w-6 stroke-[1.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>

            {statementModalStep === "confirm" ? (
              <>
                <DialogHeader className="shrink-0 border-b px-5 py-5 text-left sm:px-6 sm:py-6 lg:px-7">
                  <div className="flex items-start gap-4 pr-14">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1565b3] text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="space-y-3">
                      <DialogTitle className="text-[24px] font-bold tracking-tight text-black sm:text-[28px]">
                        Confirm Statement Generation
                      </DialogTitle>
                      <DialogDescription className="text-[14px] text-black">
                        {selectedStatementGroups.length <= 1
                          ? `You are generating 1 statement for ${selectedStatementGroups[0]?.officeName ?? "the selected office"}.`
                          : `You are generating ${selectedStatementGroups.length} statements for the following offices.`}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                    {selectedStatementGroups.map((group) => (
                      <div
                        key={group.officeId}
                        className="flex flex-col gap-4 rounded-[18px] border border-gray-100 bg-gray-50/70 px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"
                      >
                        <div className="min-w-0">
                          <h3 className="text-[22px] font-bold text-black sm:text-[24px]">{group.officeName}</h3>
                          <p className="mt-2 text-[14px] leading-6 text-gray-400">
                            {group.invoiceLabel} • {group.officeCode} • {group.chargeCount} charge{group.chargeCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
                          <div className="text-[15px] text-black sm:text-right">
                            <span className="mr-2.5">Total:</span>
                            <span className="text-[17px]">{formatMoney(group.totalAmount)}</span>
                          </div>
                          <Eye className="h-4.5 w-4.5 shrink-0 text-black/80" />
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-4 px-2 pt-1">
                      <button
                        type="button"
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          statementAutoMarkBilled ? "bg-[#1565b3]" : "bg-slate-300"
                        }`}
                        onClick={handleStatementAutoMarkBilledToggle}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            statementAutoMarkBilled ? "translate-x-8" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-[15px] text-black">
                        Auto mark as billed
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="shrink-0 border-t bg-white px-4 py-4 sm:px-6 sm:py-5 sm:justify-center sm:space-x-4 lg:px-8">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-gray-300 text-base text-gray-600 sm:min-w-[170px] sm:w-auto sm:text-lg"
                    onClick={() => setStatementModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full gap-2.5 text-base sm:min-w-[215px] sm:w-auto sm:text-lg"
                    onClick={() => void handleGenerateOnlyStatements()}
                    disabled={statementActionLoading != null}
                  >
                    <FileText className="h-4.5 w-4.5" />
                    Generate only
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full gap-2.5 text-base sm:min-w-[235px] sm:w-auto sm:text-lg"
                    onClick={() => void handleGenerateAndSendStatements()}
                    disabled={statementActionLoading != null}
                  >
                    <Send className="h-4.5 w-4.5" />
                    Generate & send
                  </Button>
                </DialogFooter>
              </>
            ) : null}

            {statementModalStep === "generating" ? (
              <>
                <DialogHeader className="shrink-0 px-5 py-5 text-left sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                  <div className="flex items-start gap-4 pr-12 sm:gap-5 sm:pr-16">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1565b3] text-white sm:h-14 sm:w-14 sm:rounded-2xl">
                      <FileText className="h-5 w-5 sm:h-7 sm:w-7" />
                    </div>
                    <div className="space-y-2 sm:space-y-4">
                      <DialogTitle className="text-2xl font-bold tracking-tight text-black sm:text-3xl lg:text-4xl">
                        Generating statements
                      </DialogTitle>
                      <DialogDescription className="text-sm text-black sm:text-base lg:text-[19px]">
                        {statementActionLoading === "send"
                          ? "Creating statements before sending them to each office."
                          : "Creating and opening PDF Statements for each office."}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="shrink-0 px-5 pb-5 sm:px-6 lg:px-10 lg:pb-8">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 sm:h-2.5">
                    <div className="h-full rounded-full bg-[#1565b3] transition-all" style={{ width: `${statementProgressPercent}%` }} />
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6 sm:space-y-4 sm:px-6 lg:space-y-5 lg:px-10 lg:pb-10">
                  {selectedStatementGroups.map((group) => {
                    const job = statementJobStatuses.find((item) => item.officeId === group.officeId)
                    const isDone = job?.status === "opened" || job?.status === "sent"
                    const isWorking = job?.status === "generating" || job?.status === "sending"
                    return (
                      <div key={group.officeId} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 sm:rounded-2xl sm:px-6 sm:py-5 lg:px-10 lg:py-7">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <h3 className="text-lg font-bold text-black sm:text-xl lg:text-2xl">{group.officeName}</h3>
                            {isDone ? (
                              <CheckCircle className="h-5 w-5 shrink-0 text-green-500 sm:h-6 sm:w-6" />
                            ) : null}
                            {isWorking ? (
                              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#1565b3] sm:h-6 sm:w-6" />
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-sm text-gray-400 sm:mt-2 sm:text-base">
                            {group.invoiceLabel} • {group.officeCode} • {group.chargeCount} charge{group.chargeCount === 1 ? "" : "s"}
                          </p>
                          {job?.error ? <p className="mt-1 text-xs text-red-600 sm:text-sm">{job.error}</p> : null}
                        </div>
                        <div className="ml-4 shrink-0 text-right">
                          {job?.pdfUrl ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-black hover:text-[#1565b3] sm:gap-2 sm:text-base"
                              onClick={() => window.open(job.pdfUrl ?? "", "_blank", "noopener,noreferrer")}
                            >
                              PDF opened
                              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          ) : (
                            <span className="text-sm text-gray-500 sm:text-base">
                              {job?.status === "error" ? "Failed" : job?.label ?? "Queued"}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}

            {statementModalStep === "sending" && currentSendStatement ? (
              <>
                <DialogHeader className="shrink-0 px-5 py-5 text-left sm:px-6 lg:px-8">
                  <div className="flex items-start gap-3 pr-10 sm:gap-4 sm:pr-14">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1565b3] text-white sm:h-12 sm:w-12">
                      <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <DialogTitle className="text-[28px] font-bold text-black sm:text-[32px] lg:text-[40px]">
                        Send Statement {sendQueueIndex + 1} of {generatedStatements.length}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-black sm:text-base lg:text-[18px]">
                        Configure and send statement via email to {currentSendGroup?.officeName ?? currentSendStatement.office?.name ?? "the selected office"}.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
                  <div className="rounded-2xl bg-gray-50 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {sendQueueCircleItems.map((item) => (
                          <div
                            key={item.key}
                            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold sm:h-8 sm:min-w-8 sm:text-sm ${
                              item.active || item.done ? "bg-[#1565b3] text-white" : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                      {generatedStatements.length > 1 && sendQueueIndex < generatedStatements.length - 1 ? (
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                          disabled={sendingStatementNow}
                          onClick={() => void handleSendAllRemaining()}
                        >
                          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Send all remaining
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 sm:mt-5">
                      <h3 className="text-lg font-bold text-black sm:text-xl lg:text-2xl">
                        {currentSendGroup?.officeName ?? currentSendStatement.office?.name ?? "Selected office"}
                      </h3>
                      <p className="mt-1.5 text-sm text-gray-400 sm:mt-2 sm:text-base">
                        {currentSendGroup?.invoiceLabel ?? currentSendStatement.statement_id ?? `ST-${currentSendStatement.id}`} • {currentSendGroup?.officeCode ?? currentSendStatement.office?.code ?? "—"} • {currentSendGroup?.chargeCount ?? currentSendStatement.billing_items?.length ?? 0} charge{(currentSendGroup?.chargeCount ?? currentSendStatement.billing_items?.length ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 sm:mt-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-sm font-semibold text-black">To:</label>
                          <button
                            type="button"
                            className="text-xs font-medium text-[#1565b3] hover:underline"
                            onClick={() => setShowCcBcc((v) => !v)}
                          >
                            CC/BCC
                          </button>
                        </div>
                        <Input value={sendToValue} onChange={(e) => setSendToValue(e.target.value)} placeholder="office@example.com, another@example.com" />
                      </div>
                      <div className="hidden sm:block" />
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-black">Subject:</label>
                        <Input value={sendSubjectValue} onChange={(e) => setSendSubjectValue(e.target.value)} placeholder="Your monthly statement is ready" />
                      </div>
                    </div>

                    {showCcBcc ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-black">CC:</label>
                          <Input value={sendCcValue} onChange={(e) => setSendCcValue(e.target.value)} placeholder="cc@example.com" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-black">BCC:</label>
                          <Input value={sendBccValue} onChange={(e) => setSendBccValue(e.target.value)} placeholder="bcc@example.com" />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 sm:mt-5">
                    <StatementEmailRichTextEditor
                      label="Body"
                      value={sendMessageValue}
                      onChange={setSendMessageValue}
                    />
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border bg-white sm:mt-5">
                    {sendPreviewLoading ? (
                      <div className="flex h-[14rem] items-center justify-center sm:h-[16rem] lg:h-[20rem]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : sendPreviewHtml ? (
                      <iframe title="Statement email preview" srcDoc={sendPreviewHtml} className="h-[14rem] w-full border-0 sm:h-[16rem] lg:h-[20rem]" />
                    ) : (
                      <div className="flex h-[14rem] items-center justify-center text-sm text-gray-500 sm:h-[16rem] lg:h-[20rem]">
                        No preview available.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        type="button"
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-7 sm:w-14 ${
                          statementAttachPdf ? "bg-[#1565b3]" : "bg-slate-300"
                        }`}
                        onClick={() => setStatementAttachPdf((value) => !value)}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform sm:h-5 sm:w-5 ${statementAttachPdf ? "translate-x-7 sm:translate-x-8" : "translate-x-1"}`} />
                      </button>
                      <span className="text-sm text-black sm:text-[15px] lg:text-[18px]">Attach PDF Statement</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        type="button"
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-7 sm:w-14 ${
                          statementAutoMarkBilled ? "bg-[#1565b3]" : "bg-slate-300"
                        }`}
                        onClick={handleStatementAutoMarkBilledToggle}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform sm:h-5 sm:w-5 ${statementAutoMarkBilled ? "translate-x-7 sm:translate-x-8" : "translate-x-1"}`} />
                      </button>
                      <span className="text-sm text-black sm:text-[15px] lg:text-[18px]">
                        Auto mark as billed
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="shrink-0 border-t bg-white px-4 py-3 sm:px-5 sm:py-4 lg:px-8">
                  <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleCancelAllEmails}>
                    Cancel All
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void handleSkipCurrentEmail()}>
                    Skip this email
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => void handlePreviewEmailInNewTab()}>
                    <Eye className="h-4 w-4" />
                    Preview Email
                  </Button>
                  <Button type="button" size="sm" className="w-full gap-2 sm:w-auto" disabled={sendingStatementNow || sendPreviewLoading} onClick={() => void handleSendCurrentEmail()}>
                    {sendingStatementNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send email
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={sendToOfficeOpen} onOpenChange={(open) => !open && closeSendToOfficeDialog()}>
          <DialogContent className="w-[min(92vw,32rem)] gap-0 overflow-hidden rounded-2xl p-0">
            <DialogHeader className="border-b px-6 py-5 text-left">
              <DialogTitle>{t("chargeManagement.sendToOffice", { defaultValue: "Send to Office" })}</DialogTitle>
              <DialogDescription className="pt-1">
                {sendToOfficeCharge
                  ? `Enter the recipient email for ${sendToOfficeCharge.invoiceNumber} · ${sendToOfficeCharge.officeName}.`
                  : "Enter the recipient email address for this statement."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 px-6 py-5">
              <label htmlFor="send-to-office-email" className="text-sm font-medium text-gray-700">
                Recipient email address
              </label>
              <Input
                id="send-to-office-email"
                type="email"
                autoFocus
                value={sendToOfficeEmail}
                onChange={(e) => setSendToOfficeEmail(e.target.value)}
                placeholder="name@office.com"
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sendToOfficeEmailValid && !sendEmailLoading) {
                    e.preventDefault()
                    void handleSendEmail()
                  }
                }}
              />
              {sendToOfficeEmail.trim().length > 0 && !sendToOfficeEmailValid ? (
                <p className="text-sm text-red-600">Enter a valid email address.</p>
              ) : null}
            </div>
            <DialogFooter className="border-t px-6 py-4 sm:justify-end">
              <Button type="button" variant="outline" onClick={closeSendToOfficeDialog} disabled={sendEmailLoading}>
                {t("chargeManagement.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSendEmail()}
                disabled={!sendToOfficeEmailValid || sendEmailLoading}
                className="gap-2"
              >
                {sendEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendEmailLoading
                  ? t("chargeManagement.sending", { defaultValue: "Sending..." })
                  : t("chargeManagement.send", { defaultValue: "Send" })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
