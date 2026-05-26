"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Download, Eye, Loader2, Mail, Search, Send } from "lucide-react"
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useGenerateStatementPdfMutation,
  useGetStatementSummaryQuery,
  useLazyPreviewStatementEmailQuery,
  useListStatementsQuery,
  useSendStatementMutation,
  type StatementListParams,
  type StatementRecord,
} from "@/lib/redux/api/billingApi"
import { useToast } from "@/hooks/use-toast"

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

function toTitleCase(value: string | null | undefined): string {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

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
  const { toast } = useToast()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRangeInput, setDateRangeInput] = useState("")
  const [directionFilter, setDirectionFilter] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("")
  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewDialogTitle, setPreviewDialogTitle] = useState("")
  const [previewDialogRecipient, setPreviewDialogRecipient] = useState("")
  const [previewDialogHtml, setPreviewDialogHtml] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const listParams = useMemo((): StatementListParams => {
    const params: StatementListParams = {
      per_page: 15,
      page: 1,
      sort_by: "created_at",
      sort_direction: "desc",
    }

    if (debouncedSearch) {
      params.search = debouncedSearch
    }

    if (directionFilter) {
      params.direction = directionFilter as StatementListParams["direction"]
    }

    if (paymentStatusFilter) {
      params.payment_status = paymentStatusFilter as StatementListParams["payment_status"]
    }

    return {
      ...params,
      ...parseDateRangeInput(dateRangeInput),
    }
  }, [dateRangeInput, debouncedSearch, directionFilter, paymentStatusFilter])

  const {
    data: listResult,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useListStatementsQuery(listParams)

  const { data: summary, isFetching: summaryFetching } = useGetStatementSummaryQuery()
  const [previewStatementEmail] = useLazyPreviewStatementEmailQuery()
  const [sendStatement] = useSendStatementMutation()
  const [generateStatementPdf] = useGenerateStatementPdfMutation()

  const statements = listResult?.data ?? EMPTY_STATEMENTS

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

  const handlePreview = async (statement: StatementRecord) => {
    setPreviewingId(statement.id)
    try {
      const preview = await previewStatementEmail(statement.id).unwrap()
      setPreviewDialogTitle(
        preview.subject || statement.subject || statement.statement_id || `Statement #${statement.id}`,
      )
      setPreviewDialogRecipient(preview.recipient_email || getRecipient(statement))
      setPreviewDialogHtml(preview.preview_html || "<p style=\"padding:24px;font-family:Arial,sans-serif;\">No preview available.</p>")
      setPreviewDialogOpen(true)
    } catch (previewError) {
      toast({
        title: "Unable to preview statement",
        description:
          previewError instanceof Error ? previewError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setPreviewingId(null)
    }
  }

  const handleSend = async (statement: StatementRecord) => {
    if (!statement.recipient_email || !statement.subject) {
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
          recipient_email: statement.recipient_email,
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

  const handleDownload = async (statement: StatementRecord) => {
    setDownloadingId(statement.id)
    try {
      const result = await generateStatementPdf(statement.id).unwrap()
      const candidatePaths = [
        result?.data?.pdf_url,
        result?.data?.download_url,
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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Generate Statements</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <div className="text-blue-600 text-xl">↙</div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Incoming</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryFetching ? "..." : summary?.incoming ?? 0}
              </p>
              <p className="text-xs text-gray-500">From vendors</p>
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

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg mr-4">
              <div className="text-yellow-600 text-xl">⚡</div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Disputed</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryFetching ? "..." : summary?.disputed ?? 0}
              </p>
              <p className="text-xs text-gray-500">Needs attention</p>
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
                value={paymentStatusFilter}
                onChange={(event) => setPaymentStatusFilter(event.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Payment Status</option>
                <option value="sent">Sent</option>
                <option value="billed">Billed</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="disputed">Disputed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="flex h-[min(90vh,56rem)] w-[min(96vw,72rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4 text-left">
            <DialogTitle className="truncate">{previewDialogTitle || "Statement preview"}</DialogTitle>
            <DialogDescription className="truncate">
              Previewing email content for {previewDialogRecipient || "the selected recipient"}.
            </DialogDescription>
          </DialogHeader>
          <DialogClose className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <span className="text-xl leading-none" aria-hidden>×</span>
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="flex-1 bg-muted/20">
            <iframe
              title="Statement email preview"
              srcDoc={previewDialogHtml}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-same-origin"
            />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statement ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading statements...
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading && statements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-500">
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
                            (paymentStatus ?? "").toLowerCase() === "overdue"
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {formatShortDate(statement.due_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatMoney(statement.amount_due)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="mr-2">{getDirectionIcon(statement.direction)}</span>
                          {getDirectionLabel(statement.direction)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(paymentStatus)}`}
                        >
                          {toTitleCase(paymentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="View"
                            onClick={() => handlePreview(statement)}
                            disabled={previewingId === statement.id}
                          >
                            {previewingId === statement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Send"
                            onClick={() => handleSend(statement)}
                            disabled={sendingId === statement.id}
                          >
                            {sendingId === statement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Email"
                            onClick={() => handleSend(statement)}
                            disabled={sendingId === statement.id}
                          >
                            <Mail className="h-4 w-4" />
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

        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Showing {statements.length} of {listResult?.pagination.total ?? statements.length} statements
          </span>
          {isFetching && !isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Refreshing...
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
