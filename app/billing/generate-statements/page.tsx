"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Calendar, Check, Download, Eye, Loader2, Mail, Pencil, Printer, Search, Send } from "lucide-react"
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useUpdateBillingInvoicePricingMutation,
  useGenerateStatementPdfMutation,
  useGetStatementByIdQuery,
  useGetStatementSummaryQuery,
  useListBillingInvoicesQuery,
  useListStatementsQuery,
  useSendStatementMutation,
  useUpdateStatementDueDateMutation,
  useUpdateStatementStatusMutation,
  type BillingProduct,
  type StatementListParams,
  type StatementBillingItem,
  type StatementPaymentStatus,
  type StatementRecord,
} from "@/lib/redux/api/billingApi"
import { useToast } from "@/hooks/use-toast"
import {
  buildStatementHeaderDraft,
  computeBasePriceFromTargetGross,
  findMatchingBillingTarget,
  findMatchingBillingInvoiceId,
  formatStatementPartyAddress,
  resolveStatementTotals,
  summarizeStatementPreviewTotals,
  type StatementHeaderDraft,
} from "@/lib/statement-edit-utils"
import { useEnrichedStatementParties } from "@/hooks/use-enriched-statement-parties"
import { useConnectedOffices } from "@/hooks/use-connected-offices"
import { parseSlipListingDueDate } from "@/lib/slip-listing-due-date"
import { buildStatementPreviewRoute } from "./preview-route.mjs"

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "$0.00"
  const amount = typeof value === "string" ? Number.parseFloat(value) : value
  if (Number.isNaN(amount)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}

/**
 * Mirrors lab case-listing overdue styling (`V3CaseTable.dueDateTextColor`):
 * due date before local today, excluding settled/paid rows (analogue of delivered).
 * Uses the same local-day parser as slip listing (`parseSlipListingDueDate`).
 */
function isStatementDueDateOverdue(
  dueDate: string | null | undefined,
  paymentStatus: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if ((paymentStatus ?? "").toLowerCase() === "paid") return false
  const due = dueDate ? parseSlipListingDueDate(dueDate) : null
  if (!due) return false
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return due.getTime() < today.getTime()
}

function toTitleCase(value: string | null | undefined): string {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Normalize a stored due date (ISO or YYYY-MM-DD) to the YYYY-MM-DD value a <input type="date"> expects. */
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  if (match) return match[1]
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/** Payment statuses selectable in the PAYMENT column (matches `PUT /statements/{id}/status`). */
const STATEMENT_PAYMENT_STATUS_OPTIONS: StatementPaymentStatus[] = [
  "sent",
  "billed",
  "paid",
  "overdue",
  "disputed",
  "refunded",
]

function getStatusColor(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "overdue":
      return "bg-red-100 text-red-800"
    case "billed":
      return "bg-blue-100 text-blue-800"
    case "paid":
      return "bg-green-100 text-green-800"
    case "sent":
      return "bg-gray-100 text-gray-800"
    case "disputed":
      return "bg-yellow-100 text-yellow-800"
    case "refunded":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function normalizePaymentStatus(status: string | null | undefined): StatementPaymentStatus | "" {
  const normalized = (status ?? "").toLowerCase()
  return STATEMENT_PAYMENT_STATUS_OPTIONS.includes(normalized as StatementPaymentStatus)
    ? (normalized as StatementPaymentStatus)
    : ""
}

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}

function getDirectionLabel(direction: string | null | undefined): string {
  if ((direction ?? "").toLowerCase() === "outgoing") return "Outgoing"
  if ((direction ?? "").toLowerCase() === "incoming") return "Incoming"
  return "—"
}

function getDirectionIcon(direction: string | null | undefined): string {
  if ((direction ?? "").toLowerCase() === "outgoing") return "↗"
  if ((direction ?? "").toLowerCase() === "incoming") return "↙"
  return ""
}

function getStatementCode(statement: StatementRecord): string {
  const directCode = statement.office?.code || statement.lab?.code
  if (directCode) return directCode

  const name = statement.office?.name || statement.lab?.name
  if (!name) return "—"

  const lettersOnly = name.replace(/[^a-zA-Z]/g, "")
  if (lettersOnly.length >= 3) return lettersOnly.slice(0, 3).toUpperCase()
  return name.slice(0, 3).toUpperCase()
}

function getRecipient(statement: StatementRecord): string {
  return statement.recipient_email || statement.office?.email || statement.lab?.email || "—"
}

type StatementPreviewBillingItem = StatementBillingItem & {
  billing_invoice_id?: number | null
  invoice_id?: number | null
  product_type?: string | null
  grade_name?: string | null
  stage_name?: string | null
  base_total?: number | string | null
  addon_total?: number | string | null
  quantity?: number | string | null
  sub_total?: number | string | null
  rush_percentage?: number | string | null
  gross_amount?: number | string | null
}

type InlineAmountDraft = {
  grossAmount: string
  saving: boolean
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : 0
}

function isRefundStatus(value: string | null | undefined): boolean {
  const normalized = (value ?? "").toLowerCase()
  return normalized === "refund" || normalized === "refunded"
}

function getBillingItemGross(item: StatementPreviewBillingItem): number {
  const amount = toNumber(item.gross_amount ?? item.amount)
  if (amount < 0) return amount
  return isRefundStatus(item.status) ? -amount : amount
}

function StatementPreviewIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8" />
      <path
        d="M26.2373 22.2998V20.3311C26.2373 19.6597 25.9706 19.0159 25.4959 18.5412C25.0212 18.0665 24.3774 17.7998 23.7061 17.7998H22.5811C22.3573 17.7998 22.1427 17.7109 21.9844 17.5527C21.8262 17.3944 21.7373 17.1798 21.7373 16.9561V15.8311C21.7373 15.1597 21.4706 14.5159 20.9959 14.0412C20.5212 13.5665 19.8774 13.2998 19.2061 13.2998H17.7998M20.6123 20.0498V25.6748M22.2998 20.8253C21.4526 20.6071 20.571 20.5554 19.7041 20.6731C19.3021 20.7271 18.9736 21.0316 18.9383 21.4358C18.9294 21.5361 18.9249 21.6367 18.9248 21.7373C18.9248 22.0853 19.1768 22.3703 19.5061 22.4828L21.7186 23.2418C22.0486 23.3543 22.2998 23.6393 22.2998 23.9873C22.2998 24.0893 22.2953 24.1898 22.2863 24.2888C22.2511 24.6931 21.9226 24.9976 21.5206 25.0516C20.6536 25.1681 19.7722 25.1164 18.9248 24.8993M19.4873 13.2998H15.8311C15.3653 13.2998 14.9873 13.6778 14.9873 14.1436V27.0811C14.9873 27.5468 15.3653 27.9248 15.8311 27.9248H25.3936C25.8593 27.9248 26.2373 27.5468 26.2373 27.0811V20.0498C26.2373 18.2596 25.5261 16.5427 24.2603 15.2768C22.9944 14.011 21.2775 13.2998 19.4873 13.2998Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function parseDateRangeInput(value: string): { date_from?: string; date_to?: string } {
  const trimmed = value.trim()
  if (!trimmed) return {}

  const rangeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})$/i,
  )
  if (rangeMatch) {
    return { date_from: rangeMatch[1], date_to: rangeMatch[2] }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date_from: trimmed, date_to: trimmed }
  }

  return {}
}

function buildApiUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""

    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      const parsedUrl = new URL(pathOrUrl)
      if (parsedUrl.protocol === "http:" && parsedUrl.hostname === window.location.hostname) {
        parsedUrl.protocol = "https:"
        return parsedUrl.toString()
      }
    }

    if (apiBase) {
      const parsedUrl = new URL(pathOrUrl)
      const parsedBase = new URL(apiBase)

      if (parsedUrl.protocol === "http:" && parsedBase.protocol === "https:" && parsedUrl.hostname === parsedBase.hostname) {
        parsedUrl.protocol = "https:"
        return parsedUrl.toString()
      }
    }

    return pathOrUrl
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  if (!base && typeof window !== "undefined") {
    return new URL(pathOrUrl, window.location.origin).toString()
  }
  return new URL(pathOrUrl, base.endsWith("/") ? base : `${base}/`).toString()
}

const EMPTY_STATEMENTS: StatementRecord[] = []

type SortKey = NonNullable<StatementListParams["sort_by"]>
type SortDirection = NonNullable<StatementListParams["sort_direction"]>

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
}) {
  const isActive = activeKey === sortKey
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-700"
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

async function fetchAuthorizedBlob(pathOrUrl: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const response = await fetch(buildApiUrl(pathOrUrl), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.blob()
}

export default function GenerateStatementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRangeInput, setDateRangeInput] = useState("")
  const [directionFilter, setDirectionFilter] = useState("")
  const [officeFilter, setOfficeFilter] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDirection>("desc")
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewStatement, setPreviewStatement] = useState<StatementRecord | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [headerDraft, setHeaderDraft] = useState<StatementHeaderDraft | null>(null)
  const [inlineAmountDrafts, setInlineAmountDrafts] = useState<Record<string, InlineAmountDraft>>({})
  const [dueDateStatement, setDueDateStatement] = useState<StatementRecord | null>(null)
  const [dueDateValue, setDueDateValue] = useState("")
  const [dueDateNotes, setDueDateNotes] = useState("")
  const previewContentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { officesAsLabs, isLoading: officesLoading } = useConnectedOffices({
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  })

  // Reset to the first page whenever the active filters or sort change.
  useEffect(() => {
    setPage(1)
  }, [dateRangeInput, debouncedSearch, directionFilter, officeFilter, paymentStatusFilter, sortBy, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortDir("asc")
    }
  }

  const listParams = useMemo((): StatementListParams => {
    const params: StatementListParams = {
      per_page: 15,
      page,
      sort_by: sortBy,
      sort_direction: sortDir,
    }

    if (debouncedSearch) {
      params.search = debouncedSearch
    }

    if (directionFilter) {
      params.direction = directionFilter as StatementListParams["direction"]
    }

    if (officeFilter) {
      const officeId = Number.parseInt(officeFilter, 10)
      if (!Number.isNaN(officeId)) params.office_id = officeId
    }

    if (paymentStatusFilter) {
      params.payment_status = paymentStatusFilter as StatementListParams["payment_status"]
    }

    return {
      ...params,
      ...parseDateRangeInput(dateRangeInput),
    }
  }, [dateRangeInput, debouncedSearch, directionFilter, officeFilter, paymentStatusFilter, page, sortBy, sortDir])

  const {
    data: listResult,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useListStatementsQuery(listParams)

  const {
    data: previewStatementDetail,
    refetch: refetchPreviewStatement,
  } = useGetStatementByIdQuery(previewStatement?.id ?? 0, {
    skip: !previewDialogOpen || previewStatement == null,
  })

  const activePreviewStatementBase = previewStatementDetail ?? previewStatement
  const { office: enrichedOffice, lab: enrichedLab } = useEnrichedStatementParties(
    previewDialogOpen ? activePreviewStatementBase : null,
  )

  const { data: summary, isFetching: summaryFetching } = useGetStatementSummaryQuery()
  const [sendStatement] = useSendStatementMutation()
  const [generateStatementPdf] = useGenerateStatementPdfMutation()
  const [updateBillingInvoicePricing] = useUpdateBillingInvoicePricingMutation()
  const [updateStatementDueDate, { isLoading: savingDueDate }] = useUpdateStatementDueDateMutation()
  const [updateStatementStatus] = useUpdateStatementStatusMutation()

  const officeInvoiceParams = useMemo(
    () => ({
      office_id: previewStatementDetail?.office?.id ?? previewStatement?.office?.id ?? undefined,
      per_page: 200,
      page: 1,
      sort_by: "created_at",
      sort_direction: "desc" as const,
    }),
    [previewStatement, previewStatementDetail],
  )

  const {
    data: officeInvoiceResult,
    isFetching: officeInvoicesFetching,
    refetch: refetchOfficeInvoices,
  } = useListBillingInvoicesQuery(officeInvoiceParams, {
    skip:
      !previewDialogOpen ||
      !isEditMode ||
      (previewStatementDetail?.office?.id ?? previewStatement?.office?.id) == null,
  })

  const statements = listResult?.data ?? EMPTY_STATEMENTS
  const activePreviewStatement = useMemo(() => {
    if (!activePreviewStatementBase) return null
    return {
      ...activePreviewStatementBase,
      office: enrichedOffice,
      lab: enrichedLab,
    } satisfies StatementRecord
  }, [activePreviewStatementBase, enrichedOffice, enrichedLab])

  const statementIds = useMemo(
    () => statements.map((statement) => String(statement.id)),
    [statements],
  )

  useEffect(() => {
    setSelectedItems((current) => {
      if (current.length === 0) return current

      const validIds = new Set(statementIds)
      const next = current.filter((id) => validIds.has(id))
      return next.length === current.length ? current : next
    })
  }, [statementIds])

  const toggleSelectAll = () => {
    if (selectedItems.length === statements.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(statements.map((statement) => String(statement.id)))
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handlePreview = (statement: StatementRecord) => {
    const previewRoute = buildStatementPreviewRoute(statement.id)
    if (!previewRoute) {
      toast({
        title: "Unable to open statement preview",
        description: "This statement does not have a valid preview route.",
        variant: "destructive",
      })
      return
    }

    router.push(previewRoute)
  }

  useEffect(() => {
    if (!previewDialogOpen) {
      setIsEditMode(false)
      setHeaderDraft(null)
      setInlineAmountDrafts({})
    }
  }, [previewDialogOpen])

  const effectivePreviewStatement = useMemo(() => {
    if (!activePreviewStatement) return null
    if (!headerDraft) return activePreviewStatement

    return {
      ...activePreviewStatement,
      statement_id: headerDraft.statementId || activePreviewStatement.statement_id,
      recipient_email: headerDraft.recipientEmail || activePreviewStatement.recipient_email,
      created_at: headerDraft.statementDate || activePreviewStatement.created_at,
      due_date: headerDraft.dueDate || activePreviewStatement.due_date,
    } satisfies StatementRecord
  }, [activePreviewStatement, headerDraft])

  const handlePrintPreview = () => {
    if (!previewContentRef.current || !effectivePreviewStatement) return
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900")
    if (!printWindow) {
      toast({
        title: "Unable to print statement",
        description: "Please allow pop-ups and try again.",
        variant: "destructive",
      })
      return
    }

    const markup = previewContentRef.current.innerHTML
    printWindow.document.write(`
      <html>
        <head>
          <title>${effectivePreviewStatement.statement_id || `Statement #${effectivePreviewStatement.id}`}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px 12px; font-size: 13px; vertical-align: top; }
            thead th { border-bottom: 1px solid #d1d5db; text-align: left; }
            tbody tr:nth-child(odd) { background: #eaf4ff; }
          </style>
        </head>
        <body>${markup}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => printWindow.print(), 250)
  }

  const previewItems = useMemo<StatementPreviewBillingItem[]>(
    () => ((activePreviewStatement?.billing_items as StatementPreviewBillingItem[] | undefined) ?? []),
    [activePreviewStatement],
  )

  const previewSubtotal = useMemo(
    () => previewItems.filter((item) => getBillingItemGross(item) > 0).reduce((sum, item) => sum + getBillingItemGross(item), 0),
    [previewItems],
  )

  const previewRefundSummary = useMemo(() => {
    const lineItemRefund = Math.abs(
      previewItems
        .filter((item) => getBillingItemGross(item) < 0)
        .reduce((sum, item) => sum + getBillingItemGross(item), 0),
    )
    return summarizeStatementPreviewTotals(previewSubtotal, lineItemRefund, {
      statementRefundAmount: activePreviewStatement?.refund_amount,
      refundReason: activePreviewStatement?.refund_reason,
    })
  }, [
    activePreviewStatement?.refund_amount,
    activePreviewStatement?.refund_reason,
    previewItems,
    previewSubtotal,
  ])

  const previewTotal = previewRefundSummary.grandTotal

  const previewCode = effectivePreviewStatement ? getStatementCode(effectivePreviewStatement) : "—"
  const previewRecipient = effectivePreviewStatement ? getRecipient(effectivePreviewStatement) : "—"
  const officeInvoices = officeInvoiceResult?.data ?? []
  const officeInvoiceMap = useMemo(
    () => new Map(officeInvoices.map((invoice) => [invoice.id, invoice])),
    [officeInvoices],
  )
  const matchedInvoiceIds = useMemo(
    () =>
      previewItems.map((item) => {
        const directInvoiceId = item.billing_invoice_id ?? item.invoice_id
        if (typeof directInvoiceId === "number" && directInvoiceId > 0) return directInvoiceId
        return findMatchingBillingInvoiceId(item, officeInvoices)
      }),
    [officeInvoices, previewItems],
  )
  const matchedBillingTargets = useMemo(
    () =>
      previewItems.map((item) => {
        const directInvoiceId = item.billing_invoice_id ?? item.invoice_id
        if (typeof directInvoiceId === "number" && directInvoiceId > 0) {
          const invoice = officeInvoiceMap.get(directInvoiceId)
          const product = (invoice?.products ?? []).find((candidate) => {
            return (
              candidate.product_name === item.product_name &&
              candidate.grade_name === item.grade_name &&
              candidate.stage_name === item.stage_name
            )
          })
          return product ? { invoiceId: directInvoiceId, productId: product.id } : null
        }
        return findMatchingBillingTarget(item, officeInvoices)
      }),
    [officeInvoiceMap, officeInvoices, previewItems],
  )

  const enterEditMode = () => {
    if (!activePreviewStatement) return
    setHeaderDraft(buildStatementHeaderDraft(activePreviewStatement))
    setIsEditMode(true)
  }

  const startInlineAmountEdit = (itemKey: string, currentGross: number) => {
    setInlineAmountDrafts((current) => ({
      ...current,
      [itemKey]: {
        grossAmount: currentGross.toFixed(2),
        saving: false,
      },
    }))
  }

  const cancelInlineAmountEdit = (itemKey: string) => {
    setInlineAmountDrafts((current) => {
      const next = { ...current }
      delete next[itemKey]
      return next
    })
  }

  const updateInlineAmountDraft = (itemKey: string, value: string) => {
    setInlineAmountDrafts((current) => ({
      ...current,
      [itemKey]: {
        ...(current[itemKey] ?? { saving: false }),
        grossAmount: value,
      },
    }))
  }

  const handleSend = async (statement: StatementRecord, overrides?: Partial<StatementHeaderDraft>) => {
    const recipientEmail = overrides?.recipientEmail?.trim() || statement.recipient_email || ""
    if (!recipientEmail || !statement.subject) {
      toast({
        title: "Statement is missing email details",
        description: "Recipient email and subject are required before sending.",
        variant: "destructive",
      })
      return
    }

    setSendingId(statement.id)
    try {
      await sendStatement({
        id: statement.id,
        body: {
          recipient_email: recipientEmail,
          cc_emails: statement.cc_emails ?? [],
          bcc_emails: statement.bcc_emails ?? [],
          subject: statement.subject,
          message: statement.message ?? "",
          template: statement.template_used ?? undefined,
          include_pdf: true,
        },
      }).unwrap()

      toast({
        title: "Statement sent",
        description: `${statement.statement_id ?? `Statement #${statement.id}`} was sent successfully.`,
      })
      refetch()
    } catch (sendError) {
      toast({
        title: "Unable to send statement",
        description: sendError instanceof Error ? sendError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingId(null)
    }
  }

  const handleSaveInlineAmount = async (
    itemKey: string,
    target: { invoiceId: number; productId: number } | null,
  ) => {
    if (!target) {
      toast({
        title: "Invoice match not available",
        description: "We could not confidently match this statement row to a billing invoice.",
        variant: "destructive",
      })
      return
    }

    const draft = inlineAmountDrafts[itemKey]
    const invoice = officeInvoiceMap.get(target.invoiceId)
    const product = (invoice?.products ?? []).find((candidate) => candidate.id === target.productId)

    if (!draft || !invoice || !product) {
      toast({
        title: "Unable to save inline amount",
        description: "The linked billing product could not be loaded.",
        variant: "destructive",
      })
      return
    }

    const nextGross = Number.parseFloat(draft.grossAmount)
    const nextBasePrice = computeBasePriceFromTargetGross(nextGross, product as BillingProduct)

    if (!Number.isFinite(nextGross) || nextGross < 0 || nextBasePrice == null) {
      toast({
        title: "Invalid gross amount",
        description: "Enter a positive amount that can be converted back into invoice pricing.",
        variant: "destructive",
      })
      return
    }

    setInlineAmountDrafts((current) => ({
      ...current,
      [itemKey]: {
        ...current[itemKey],
        saving: true,
      },
    }))

    try {
      await updateBillingInvoicePricing({
        invoiceId: target.invoiceId,
        body: {
          products: [
            {
              id: target.productId,
              base_price: nextBasePrice,
            },
          ],
        },
      }).unwrap()

      await Promise.all([refetchPreviewStatement(), refetchOfficeInvoices(), refetch()])
      cancelInlineAmountEdit(itemKey)
      toast({ title: "Statement amount updated" })
    } catch (saveError) {
      setInlineAmountDrafts((current) => ({
        ...current,
        [itemKey]: {
          ...current[itemKey],
          saving: false,
        },
      }))
      toast({
        title: "Unable to save inline amount",
        description: saveError instanceof Error ? saveError.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (statement: StatementRecord) => {
    setDownloadingId(statement.id)
    try {
      const result = await generateStatementPdf(statement.id).unwrap()
      const candidatePaths = [
        result?.data?.download_url,
        result?.data?.pdf_url,
        statement.pdf_path,
      ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)

      if (candidatePaths.length === 0) {
        throw new Error(result?.message || "No PDF URL returned by the server")
      }

      let blob: Blob | null = null
      let lastError: Error | null = null
      for (const path of candidatePaths) {
        try {
          blob = await fetchAuthorizedBlob(path)
          break
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unable to fetch statement PDF")
        }
      }

      if (!blob) throw lastError || new Error("Unable to fetch statement PDF")

      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = blobUrl
      anchor.download = `statement-${statement.statement_id || statement.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(blobUrl)
    } catch (downloadError) {
      toast({
        title: "Unable to download statement",
        description:
          downloadError instanceof Error ? downloadError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const openDueDateDialog = (statement: StatementRecord) => {
    setDueDateStatement(statement)
    setDueDateValue(toDateInputValue(statement.due_date))
    setDueDateNotes("")
  }

  const closeDueDateDialog = () => {
    setDueDateStatement(null)
    setDueDateValue("")
    setDueDateNotes("")
  }

  const handleSaveDueDate = async () => {
    if (!dueDateStatement || !dueDateValue) return
    try {
      const body: { due_date: string; notes?: string } = { due_date: dueDateValue }
      const trimmedNotes = dueDateNotes.trim()
      if (trimmedNotes) body.notes = trimmedNotes
      await updateStatementDueDate({ id: dueDateStatement.id, body }).unwrap()
      toast({ title: "Due date updated" })
      closeDueDateDialog()
    } catch (dueDateError) {
      toast({
        title: "Unable to update due date",
        description:
          dueDateError instanceof Error ? dueDateError.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePaymentStatusChange = async (
    statement: StatementRecord,
    nextStatus: string,
  ) => {
    const status = nextStatus as StatementPaymentStatus
    if (!STATEMENT_PAYMENT_STATUS_OPTIONS.includes(status)) return

    const current = normalizePaymentStatus(statement.payment_status ?? statement.status)
    if (current === status) return

    setUpdatingPaymentId(statement.id)
    try {
      await updateStatementStatus({
        id: statement.id,
        body: { status },
      }).unwrap()
      // Dashboard outstanding balance uses React Query (`dashboard-stats`), not RTK tags.
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({
        title: "Payment status updated",
        description: `Marked as ${toTitleCase(status)}.`,
      })
    } catch (statusError) {
      toast({
        title: "Unable to update payment status",
        description: getMutationErrorMessage(statusError, "Please try again."),
        variant: "destructive",
      })
    } finally {
      setUpdatingPaymentId(null)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Generate Statements</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <div className="text-green-600 text-xl">↗</div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Outgoing</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryFetching ? "..." : summary?.outgoing ?? 0}
              </p>
              <p className="text-xs text-gray-500">Sent to offices</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg mr-4">
              <div className="text-red-600 text-xl">⚠</div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryFetching ? "..." : summary?.overdue ?? 0}
              </p>
              <p className="text-xs text-gray-500">Pending payment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by office code, email, statement ID..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="YYYY-MM-DD or YYYY-MM-DD to YYYY-MM-DD"
                  value={dateRangeInput}
                  onChange={(event) => setDateRangeInput(event.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full sm:w-72"
                />
              </div>

              <select
                value={directionFilter}
                onChange={(event) => setDirectionFilter(event.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Direction</option>
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>

              <select
                value={officeFilter}
                onChange={(event) => setOfficeFilter(event.target.value)}
                disabled={officesLoading}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
              >
                <option value="">
                  {officesLoading ? "Loading offices…" : "Select Office"}
                </option>
                {officesAsLabs.map((office) => (
                  <option key={office.id} value={String(office.id)}>
                    {office.name}
                  </option>
                ))}
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(event) => setPaymentStatusFilter(event.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Payment Status</option>
                <option value="sent">Sent</option>
                <option value="billed">Billed</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={previewDialogOpen}
        onOpenChange={(open) => {
          setPreviewDialogOpen(open)
          if (!open) setPreviewStatement(null)
        }}
      >
        <DialogContent className="flex h-[min(94vh,70rem)] w-[min(98vw,86rem)] max-w-7xl flex-col gap-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-6 text-left sm:px-8 sm:py-8">
              <div className="flex items-start gap-5 pr-12">
                <StatementPreviewIcon />
              <div>
                <DialogTitle className="text-3xl font-bold text-black sm:text-4xl">
                  {isEditMode ? "Virtual Statement - [EDIT MODE]" : "Virtual Statement"}
                </DialogTitle>
                {isEditMode ? (
                  <p className="mt-2 text-sm text-amber-700">
                    Recipient email will be used when resending. Statement number, date, and due date are preview-only until the backend supports statement header updates.
                  </p>
                ) : null}
              </div>
            </div>
          </DialogHeader>
          <DialogClose className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <span className="text-xl leading-none" aria-hidden>×</span>
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-5 sm:px-8 sm:py-8">
            <div ref={previewContentRef} className="mx-auto max-w-[78rem]">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <img src="/images/hmc.svg" alt="RXN3D logo" className="h-20 w-auto object-contain" />
                  <div className="mt-4 space-y-1 text-[15px] text-slate-700 sm:text-[17px]">
                    <p className="whitespace-pre-line">{formatStatementPartyAddress(activePreviewStatement?.lab)}</p>
                    <p>
                      Phone: {activePreviewStatement?.lab?.phone || "—"} | Email {activePreviewStatement?.lab?.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <h3 className="text-[22px] font-bold text-black sm:text-[26px]">Statement</h3>
                  {isEditMode && headerDraft ? (
                    <div className="mt-3 space-y-3 text-[18px] text-slate-900 sm:text-[20px]">
                      <label className="block">
                        <span className="mr-2 font-bold">NO:</span>
                        <input
                          type="text"
                          value={headerDraft.statementId}
                          onChange={(event) => setHeaderDraft((current) => current ? { ...current, statementId: event.target.value } : current)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 lg:ml-auto lg:max-w-[18rem]"
                        />
                      </label>
                      <label className="block">
                        <span className="mr-2 font-bold">Date:</span>
                        <input
                          type="date"
                          value={headerDraft.statementDate}
                          onChange={(event) => setHeaderDraft((current) => current ? { ...current, statementDate: event.target.value } : current)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 lg:ml-auto lg:max-w-[18rem]"
                        />
                      </label>
                      <label className="block">
                        <span className="mr-2 font-bold">Due date:</span>
                        <input
                          type="date"
                          value={headerDraft.dueDate}
                          onChange={(event) => setHeaderDraft((current) => current ? { ...current, dueDate: event.target.value } : current)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 lg:ml-auto lg:max-w-[18rem]"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1 text-[18px] text-slate-900 sm:text-[20px]">
                      <p><span className="font-bold">NO:</span> {effectivePreviewStatement?.statement_id || `Statement #${effectivePreviewStatement?.id ?? ""}`}</p>
                      <p><span className="font-bold">Date:</span> {formatShortDate(effectivePreviewStatement?.created_at)}</p>
                      <p><span className="font-bold">Due date:</span> {formatShortDate(effectivePreviewStatement?.due_date)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10">
                <p className="text-[20px] text-slate-800">Billed to:</p>
                <h3 className="mt-3 text-3xl font-bold text-black sm:text-4xl">
                  {activePreviewStatement?.office?.name || previewRecipient}
                </h3>
                <p className="mt-2 whitespace-pre-line text-[16px] text-slate-700 sm:text-[18px]">
                  {formatStatementPartyAddress(activePreviewStatement?.office)}
                </p>
                {isEditMode && headerDraft ? (
                  <div className="mt-3 max-w-xl">
                    <label className="block text-[15px] text-slate-500 sm:text-[17px]">
                      <span>Code: {previewCode} | Recipient</span>
                      <input
                        type="email"
                        value={headerDraft.recipientEmail}
                        onChange={(event) => setHeaderDraft((current) => current ? { ...current, recipientEmail: event.target.value } : current)}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
                        placeholder="recipient@example.com"
                      />
                    </label>
                  </div>
                ) : (
                  <p className="mt-2 text-[15px] text-slate-500 sm:text-[17px]">
                    Code: {previewCode} | Recipient: {previewRecipient}
                  </p>
                )}
              </div>

              <div className="mt-10 overflow-x-auto border-t border-slate-200 pt-6">
                <table className="min-w-full border-separate border-spacing-y-0">
                  <thead>
                    <tr className="text-left text-[14px] font-bold uppercase tracking-[0.02em] text-slate-900">
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">U/L</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Base total</th>
                      <th className="px-4 py-3">Add-on</th>
                      <th className="px-4 py-3">Sub Total</th>
                      <th className="px-4 py-3">R%</th>
                      <th className="px-4 py-3">Gross</th>
                      {isEditMode ? <th className="px-4 py-3 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.length === 0 ? (
                      <tr>
                        <td colSpan={isEditMode ? 11 : 10} className="px-4 py-10 text-center text-sm text-slate-500">
                          No billing items available for this statement.
                        </td>
                      </tr>
                    ) : (
                      previewItems.map((item, index) => {
                        const matchedInvoiceId = matchedInvoiceIds[index] ?? null
                        const matchedTarget = matchedBillingTargets[index] ?? null
                        const itemKey = String(item.id ?? `${item.patient_name}-${index}`)
                        const inlineDraft = inlineAmountDrafts[itemKey]
                        const isRefundRow = getBillingItemGross(item) < 0
                        const canInlineEdit = matchedTarget != null && !isRefundRow
                        return (
                          <tr key={item.id ?? `${item.patient_name}-${index}`} className={index % 2 === 0 ? "bg-[#eaf4ff]" : "bg-white"}>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{item.patient_name || "—"}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{item.product_type || "—"}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{item.product_name || "—"}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{item.grade_name || "—"}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{item.stage_name || "—"}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{formatMoney(item.base_total)}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{toNumber(item.addon_total) === 0 ? "-" : formatMoney(item.addon_total)}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{toNumber(item.sub_total) === 0 ? "-" : formatMoney(item.sub_total)}</td>
                            <td className="px-4 py-4 text-[15px] text-slate-900">{toNumber(item.rush_percentage) === 0 ? "-" : `${toNumber(item.rush_percentage)}%`}</td>
                            <td className={`px-4 py-4 text-[15px] font-semibold ${getBillingItemGross(item) < 0 ? "text-red-600" : "text-slate-900"}`}>
                              {inlineDraft ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={inlineDraft.grossAmount}
                                  onChange={(event) => updateInlineAmountDraft(itemKey, event.target.value)}
                                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-[15px] font-semibold text-slate-900"
                                />
                              ) : (
                                formatMoney(getBillingItemGross(item))
                              )}
                            </td>
                            {isEditMode ? (
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  {inlineDraft ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handleSaveInlineAmount(itemKey, matchedTarget)}
                                        disabled={inlineDraft.saving}
                                        className="rounded-lg bg-[#1565b3] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {inlineDraft.saving ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => cancelInlineAmountEdit(itemKey)}
                                        disabled={inlineDraft.saving}
                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startInlineAmountEdit(itemKey, getBillingItemGross(item))}
                                      disabled={!canInlineEdit}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-[#1565b3] transition hover:border-[#1565b3] hover:bg-white disabled:cursor-not-allowed disabled:text-slate-300"
                                      title={
                                        canInlineEdit
                                          ? "Edit gross amount inline"
                                          : isRefundRow
                                            ? "Refund rows cannot be edited inline yet"
                                            : matchedInvoiceId
                                              ? "This row needs the invoice editor"
                                              : "Matching invoice not found"
                                      }
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canInlineEdit ? (
                                    <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                                  )}
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-10 flex justify-end">
                <div className="w-full max-w-sm space-y-5 text-right">
                  <div className="flex items-center justify-between text-[18px] font-semibold text-slate-900">
                    <span>Sub Total</span>
                    <span>{formatMoney(previewSubtotal)}</span>
                  </div>
                  {previewRefundSummary.showRefundLine ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[18px] font-semibold text-red-600">
                        <span>Refund</span>
                        <span>{formatMoney(previewRefundSummary.totalRefund)}</span>
                      </div>
                      {previewRefundSummary.refundReason ? (
                        <p className="text-left text-sm text-slate-600">{previewRefundSummary.refundReason}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-[22px] font-bold text-black">
                    <span>Total</span>
                    <span>{formatMoney(previewTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  disabled={!activePreviewStatement || isEditMode || downloadingId === activePreviewStatement.id}
                  onClick={() => activePreviewStatement && handleDownload(activePreviewStatement)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 transition hover:border-[#1565b3] hover:text-[#1565b3] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activePreviewStatement && downloadingId === activePreviewStatement.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintPreview}
                  disabled={!effectivePreviewStatement}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 transition hover:border-[#1565b3] hover:text-[#1565b3] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="h-5 w-5" />
                  Print
                </button>
                <button
                  type="button"
                  disabled={!activePreviewStatement}
                  onClick={enterEditMode}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 transition hover:border-[#1565b3] hover:text-[#1565b3] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                  {isEditMode ? "Editing Statement" : "Edit Statement"}
                </button>
              </div>
              <button
                type="button"
                disabled={!activePreviewStatement || sendingId === activePreviewStatement.id}
                onClick={() => activePreviewStatement && handleSend(activePreviewStatement, headerDraft ?? undefined)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1565b3] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#0f4d8b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activePreviewStatement && sendingId === activePreviewStatement.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                {isEditMode ? "Resend Statement" : "Email Statement"}
              </button>
            </div>
            {isEditMode ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>{officeInvoicesFetching ? "Matching invoices..." : "Line-item edits open the saved invoice editor for the matched billing invoice."}</span>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dueDateStatement !== null}
        onOpenChange={(open) => {
          if (!open) closeDueDateDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change due date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {dueDateStatement
                ? `${dueDateStatement.statement_id || `ST-${dueDateStatement.id}`} · currently ${formatShortDate(dueDateStatement.due_date)}`
                : ""}
            </p>
            <div className="space-y-1.5">
              <label htmlFor="statement-due-date" className="text-sm font-medium text-gray-700">
                Due date
              </label>
              <input
                id="statement-due-date"
                type="date"
                value={dueDateValue}
                onChange={(event) => setDueDateValue(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1565b3] focus:outline-none focus:ring-1 focus:ring-[#1565b3]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="statement-due-date-notes" className="text-sm font-medium text-gray-700">
                Notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="statement-due-date-notes"
                value={dueDateNotes}
                onChange={(event) => setDueDateNotes(event.target.value)}
                rows={3}
                placeholder="e.g. Extended payment terms"
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1565b3] focus:outline-none focus:ring-1 focus:ring-[#1565b3]"
              />
            </div>
            <p className="text-xs text-gray-400">
              This also updates the line-item due dates and records the change in history.
            </p>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDueDateDialog}
              disabled={savingDueDate}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDueDate}
              disabled={savingDueDate || !dueDateValue}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1565b3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4d8b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingDueDate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={statements.length > 0 && selectedItems.length === statements.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortableHeader label="Statement ID" sortKey="statement_id" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Code" sortKey="office_name" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Receipient" sortKey="recipient_email" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Date Sent" sortKey="date_sent" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Due Date" sortKey="due_date" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refund
                </th>
                <SortableHeader label="Amount due" sortKey="amount_due" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Direction" sortKey="direction" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Payment" sortKey="payment_status" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading statements...
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading && statements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-sm text-gray-500">
                    {isError
                      ? `Unable to load statements${error ? "." : "."}`
                      : "No statements found for the current filters."}
                  </td>
                </tr>
              ) : null}

              {!isLoading &&
                statements.map((statement) => {
                  const statementId = String(statement.id)
                  const paymentStatus = statement.payment_status ?? statement.status
                  const totals = resolveStatementTotals(statement)
                  const dueDateOverdue = isStatementDueDateOverdue(
                    statement.due_date,
                    paymentStatus,
                  )
                  return (
                    <tr key={statement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(statementId)}
                          onChange={() => toggleSelectItem(statementId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {statement.statement_id || `ST-${statement.id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStatementCode(statement)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getRecipient(statement)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatShortDate(statement.date_sent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={
                            dueDateOverdue ? "text-red-600 font-medium" : undefined
                          }
                        >
                          {formatShortDate(statement.due_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={totals.refund > 0 ? "text-red-600" : "text-gray-400"}>
                          {totals.refund > 0 ? formatMoney(totals.refund) : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatMoney(totals.netTotal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="mr-2">{getDirectionIcon(statement.direction)}</span>
                          {getDirectionLabel(statement.direction)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative inline-flex items-center gap-1.5">
                          <select
                            value={normalizePaymentStatus(paymentStatus)}
                            onChange={(event) =>
                              void handlePaymentStatusChange(statement, event.target.value)
                            }
                            disabled={updatingPaymentId === statement.id}
                            aria-label={`Payment status for ${statement.statement_id || statement.id}`}
                            className={`px-2 py-1 text-xs font-medium rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-wait ${getStatusColor(paymentStatus)}`}
                          >
                            {!normalizePaymentStatus(paymentStatus) ? (
                              <option value="">—</option>
                            ) : null}
                            {STATEMENT_PAYMENT_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {toTitleCase(option)}
                              </option>
                            ))}
                          </select>
                          {updatingPaymentId === statement.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="View"
                            onClick={() => handlePreview(statement)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Send email"
                            onClick={() => handleSend(statement)}
                            disabled={sendingId === statement.id}
                          >
                            {sendingId === statement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Download"
                            onClick={() => handleDownload(statement)}
                            disabled={downloadingId === statement.id}
                          >
                            {downloadingId === statement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="Change due date"
                            onClick={() => openDueDateDialog(statement)}
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          {(statement.is_overdue ||
                            (paymentStatus ?? "").toLowerCase() === "overdue") && (
                            <button className="text-yellow-600 hover:text-yellow-800" title="Alert">
                              ⚠
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span>
              Showing {statements.length === 0 ? 0 : (listResult ? (listResult.pagination.current_page - 1) * listResult.pagination.per_page + 1 : 1)}
              –{listResult ? (listResult.pagination.current_page - 1) * listResult.pagination.per_page + statements.length : statements.length} of{" "}
              {listResult?.pagination.total ?? statements.length} statements
            </span>
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </span>
            ) : null}
          </div>

          {listResult && listResult.pagination.last_page > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:border-[#1565b3] hover:text-[#1565b3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">
                Page {listResult.pagination.current_page} of {listResult.pagination.last_page}
              </span>
              <button
                type="button"
                disabled={page >= listResult.pagination.last_page || isFetching}
                onClick={() =>
                  setPage((current) => Math.min(listResult.pagination.last_page, current + 1))
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:border-[#1565b3] hover:text-[#1565b3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
