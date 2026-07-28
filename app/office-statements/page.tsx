"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, Loader2, Search } from "lucide-react"
import {
  useGenerateStatementPdfMutation,
  useListStatementsQuery,
  type StatementListParams,
  type StatementRecord,
} from "@/lib/redux/api/billingApi"
import { useToast } from "@/hooks/use-toast"
import { resolveStatementTotals } from "@/lib/statement-edit-utils"
import { buildStatementPreviewRoute } from "@/app/billing/generate-statements/preview-route.mjs"

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

/** The lab is the sender of a statement received by the office. */
function getLabName(statement: StatementRecord): string {
  return statement.lab?.name || statement.lab?.email || "—"
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

export default function OfficeStatementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDirection>("desc")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  // Reset to the first page whenever the active filters or sort change.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, paymentStatusFilter, sortBy, sortDir])

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

    if (paymentStatusFilter) {
      params.payment_status = paymentStatusFilter as StatementListParams["payment_status"]
    }

    return params
  }, [debouncedSearch, paymentStatusFilter, page, sortBy, sortDir])

  const {
    data: listResult,
    isLoading,
    isFetching,
    isError,
  } = useListStatementsQuery(listParams)

  const [generateStatementPdf] = useGenerateStatementPdfMutation()

  const statements = listResult?.data ?? EMPTY_STATEMENTS

  const handleView = (statement: StatementRecord) => {
    const previewRoute = buildStatementPreviewRoute(statement.id)
    if (!previewRoute) {
      toast({
        title: "Unable to open statement",
        description: "This statement does not have a valid preview route.",
        variant: "destructive",
      })
      return
    }

    router.push(previewRoute)
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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
        <p className="mt-1 text-sm text-gray-500">Statements received from your labs.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by lab, email, statement ID..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
              />
            </div>

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

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Statement ID" sortKey="statement_id" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Lab" sortKey="lab_name" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Date Received" sortKey="date_sent" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Due Date" sortKey="due_date" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refund
                </th>
                <SortableHeader label="Amount Due" sortKey="amount_due" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Payment" sortKey="payment_status" activeKey={sortBy} direction={sortDir} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading statements...
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading && statements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                    {isError
                      ? "Unable to load statements."
                      : "No statements received yet."}
                  </td>
                </tr>
              ) : null}

              {!isLoading &&
                statements.map((statement) => {
                  const paymentStatus = statement.payment_status ?? statement.status
                  const totals = resolveStatementTotals(statement)
                  return (
                    <tr key={statement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {statement.statement_id || `ST-${statement.id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLabName(statement)}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={totals.refund > 0 ? "text-red-600" : "text-gray-400"}>
                          {totals.refund > 0 ? formatMoney(totals.refund) : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatMoney(totals.netTotal)}
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
                            className="text-blue-600 hover:text-blue-800"
                            title="View"
                            onClick={() => handleView(statement)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Download PDF"
                            onClick={() => handleDownload(statement)}
                            disabled={downloadingId === statement.id}
                          >
                            {downloadingId === statement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
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
