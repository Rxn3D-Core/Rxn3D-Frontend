"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Download, FileEdit, Loader2, Mail, Pencil, Printer, X } from "lucide-react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import {
  useGenerateStatementPdfMutation,
  useGetStatementByIdQuery,
  useListBillingInvoicesQuery,
  useSendStatementMutation,
  useUpdateBillingProductPricingMutation,
  type StatementBillingItem,
  type StatementRecord,
} from "@/lib/redux/api/billingApi"
import {
  buildStatementHeaderDraft,
  computeBasePriceFromTargetGross,
  findMatchingBillingTarget,
  type StatementHeaderDraft,
} from "@/lib/statement-edit-utils"

type StatementPreviewBillingItem = StatementBillingItem & {
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

function formatStatementDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
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

function billingItemKey(item: StatementPreviewBillingItem, index: number): string {
  return item.id != null ? String(item.id) : `${item.patient_name ?? "item"}-${index}`
}

// Parses a `yyyy-MM-dd` draft string into a local Date (no timezone shift).
function parseDateInputValue(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// Formats a Date back to the `yyyy-MM-dd` draft string the header model uses.
function toDraftDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function StatementDatePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (next: string) => void
  ariaLabel: string
}) {
  const selected = parseDateInputValue(value)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex min-w-[10rem] items-center justify-between gap-2 rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-black hover:border-slate-400"
        >
          <span>{selected ? format(selected, "MM/dd/yyyy") : "Select date"}</span>
          <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) onChange(toDraftDateValue(date))
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function StatementPreviewContent({
  statement,
  isEditMode,
  headerDraft,
  onHeaderDraftChange,
  amountDrafts = {},
  onAmountChange = () => {},
}: {
  statement: StatementRecord
  isEditMode: boolean
  headerDraft: StatementHeaderDraft | null
  onHeaderDraftChange: (next: StatementHeaderDraft | null) => void
  amountDrafts?: Record<string, number>
  onAmountChange?: (key: string, value: number) => void
}) {
  const previewItems = useMemo(
    () => ((statement.billing_items as StatementPreviewBillingItem[] | undefined) ?? []),
    [statement.billing_items],
  )
  const previewRecipient = statement.recipient_email || statement.office?.email || statement.lab?.email || "—"
  const previewCode = statement.office?.code || statement.lab?.code || "—"

  // Effective gross honours an in-flight edit draft (keyed per row) and falls
  // back to the stored value. Totals recompute from this so the on-screen
  // Sub Total / Total update live as amounts are edited.
  const effectiveGross = (item: StatementPreviewBillingItem, index: number): number => {
    const draft = amountDrafts[billingItemKey(item, index)]
    if (draft !== undefined && Number.isFinite(draft)) return draft
    return getBillingItemGross(item)
  }

  const previewSubtotal = useMemo(
    () =>
      previewItems.reduce((sum, item, index) => {
        const gross = effectiveGross(item, index)
        return gross > 0 ? sum + gross : sum
      }, 0),
    [previewItems, amountDrafts],
  )
  const previewRefundTotal = useMemo(
    () =>
      Math.abs(
        previewItems.reduce((sum, item, index) => {
          const gross = effectiveGross(item, index)
          return gross < 0 ? sum + gross : sum
        }, 0),
      ),
    [previewItems, amountDrafts],
  )
  const previewTotal = useMemo(
    () => previewItems.reduce((sum, item, index) => sum + effectiveGross(item, index), 0),
    [previewItems, amountDrafts],
  )

  return (
    <div
      className="mx-auto w-full max-w-[860px] bg-white text-slate-900"
      style={{ fontFamily: "Verdana, sans-serif" }}
    >
      <div className="grid gap-6 sm:grid-cols-[1fr_200px] sm:items-start">
        <div className="min-w-0">
          <img src="/images/hmc.svg" alt="RXN3D logo" className="mb-3 h-auto w-[120px] object-contain" />
          <div className="space-y-0.5 text-[13px] leading-5 text-slate-800">
            <p>{statement.lab?.address || "—"}</p>
            <p>
              Phone: {statement.lab?.phone || "—"} | Email {statement.lab?.email || "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <div className="text-left">
          <h3 className="mb-2 text-xl font-bold leading-none text-black">Statement</h3>
          {isEditMode && headerDraft ? (
            <div className="space-y-2 text-[13px] leading-6">
              <label className="block">
                <span className="font-bold text-black">NO:</span>{" "}
                <input
                  type="text"
                  value={headerDraft.statementId}
                  onChange={(event) =>
                    onHeaderDraftChange({
                      ...headerDraft,
                      statementId: event.target.value,
                    })
                  }
                  className="inline-block min-w-[10rem] rounded border border-slate-300 px-2 py-1 text-[13px] text-black"
                />
              </label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-black">Date:</span>
                <StatementDatePicker
                  value={headerDraft.statementDate}
                  ariaLabel="Statement date"
                  onChange={(next) =>
                    onHeaderDraftChange({
                      ...headerDraft,
                      statementDate: next,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-black">Due date:</span>
                <StatementDatePicker
                  value={headerDraft.dueDate}
                  ariaLabel="Due date"
                  onChange={(next) =>
                    onHeaderDraftChange({
                      ...headerDraft,
                      dueDate: next,
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <div className="text-[13px] leading-6"><span className="font-bold text-black">NO:</span> {statement.statement_id || `Statement #${statement.id}`}</div>
              <div className="text-[13px] leading-6"><span className="font-bold text-black">Date:</span> {formatStatementDate(statement.created_at)}</div>
              <div className="text-[13px] leading-6"><span className="font-bold text-black">Due date:</span> {formatStatementDate(statement.due_date)}</div>
            </>
          )}
          </div>
        </div>
      </div>

      <div className="mb-6 mt-8">
        <p className="mb-2 text-[15px] text-slate-800">Billed to:</p>
        <h3 className="mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-3xl font-bold leading-tight text-black">
          {statement.office?.name || previewRecipient}
        </h3>
        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-6 text-slate-700">{statement.office?.address || "—"}</p>
        {isEditMode && headerDraft ? (
          <label className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-6 text-slate-500">
            <span>Code: {previewCode} | Recipient: </span>
            <input
              type="email"
              value={headerDraft.recipientEmail}
              onChange={(event) =>
                onHeaderDraftChange({
                  ...headerDraft,
                  recipientEmail: event.target.value,
                })
              }
              className="inline-block min-w-[18rem] rounded border border-slate-300 px-2 py-1 text-[13px] text-black"
            />
          </label>
        ) : (
          <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-6 text-slate-500">
            Code: {previewCode} | Recipient: {previewRecipient}
          </p>
        )}
      </div>

      {/* Desktop / print: full tabular layout */}
      <div className="hidden border-t border-slate-200 pt-6 sm:block print:block">
        <div className="overflow-x-auto">
          <table className="statement-table w-full min-w-[760px] border-collapse">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[6%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[5%]" />
              <col className="w-[8%]" />
              <col className="w-[5%]" />
              <col className="w-[8%]" />
              {isEditMode ? <col className="w-[40px]" /> : null}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold tracking-[-0.01em] text-slate-600">
                <th className="whitespace-nowrap px-2 py-2.5">Patient</th>
                <th className="whitespace-nowrap px-1.5 py-2.5">U/L</th>
                <th className="whitespace-nowrap px-1.5 py-2.5">Product</th>
                <th className="whitespace-nowrap px-1.5 py-2.5">Grade</th>
                <th className="whitespace-nowrap px-1.5 py-2.5">Stage</th>
                <th className="whitespace-nowrap px-1.5 py-2.5 text-right">Base total</th>
                <th className="whitespace-nowrap px-1.5 py-2.5 text-right">Add-on</th>
                <th className="whitespace-nowrap px-1.5 py-2.5 text-right">QTY</th>
                <th className="whitespace-nowrap px-1.5 py-2.5 text-right">Sub Total</th>
                <th className="whitespace-nowrap px-1.5 py-2.5 text-right">R%</th>
                <th className="whitespace-nowrap px-1.5 py-2.5 text-right">Gross</th>
                {isEditMode ? <th className="px-1 py-2.5 print:hidden" aria-label="Edit" /> : null}
              </tr>
            </thead>
            <tbody>
              {previewItems.length === 0 ? (
                <tr>
                  <td colSpan={isEditMode ? 12 : 11} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No billing items available for this statement.
                  </td>
                </tr>
              ) : (
                previewItems.map((item, index) => {
                  const rowKey = billingItemKey(item, index)
                  const rowGross = effectiveGross(item, index)
                  return (
                  <tr
                    key={item.id ?? `${item.patient_name}-${index}`}
                    className={index % 2 === 0 ? "bg-[#DFEEFB]" : "bg-white"}
                  >
                    <td className="break-words px-2 py-2.5 align-middle text-[12px] leading-4 text-black">{item.patient_name || "—"}</td>
                    <td className="px-1.5 py-2.5 align-middle text-[12px] leading-4 text-black">{item.product_type || "—"}</td>
                    <td className="break-words px-1.5 py-2.5 align-middle text-[12px] leading-4 text-black">{item.product_name || "—"}</td>
                    <td className="break-words px-1.5 py-2.5 align-middle text-[12px] leading-4 text-black">{item.grade_name || "—"}</td>
                    <td className="break-words px-1.5 py-2.5 align-middle text-[12px] leading-4 text-black">{item.stage_name || "—"}</td>
                    <td className="px-1.5 py-2.5 text-right align-middle text-[12px] leading-4 text-black">{formatMoney(item.base_total)}</td>
                    <td className="px-1.5 py-2.5 text-right align-middle text-[12px] leading-4 text-black">{toNumber(item.addon_total) === 0 ? "-" : formatMoney(item.addon_total)}</td>
                    <td className="px-1.5 py-2.5 text-right align-middle text-[12px] leading-4 text-black">{item.quantity ?? "-"}</td>
                    <td className="px-1.5 py-2.5 text-right align-middle text-[12px] leading-4 text-black">{toNumber(item.sub_total) === 0 ? "-" : formatMoney(item.sub_total)}</td>
                    <td className="px-1.5 py-2.5 text-right align-middle text-[12px] leading-4 text-black">{toNumber(item.rush_percentage) === 0 ? "-" : `${toNumber(item.rush_percentage)}%`}</td>
                    {isEditMode ? (
                      <td className="px-1.5 py-2 text-right align-middle">
                        <div className="flex items-center justify-end">
                          <span className="text-[12px] text-slate-500">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={Number.isFinite(rowGross) ? rowGross : 0}
                            onChange={(event) => onAmountChange(rowKey, Number.parseFloat(event.target.value))}
                            className={`w-[68px] rounded border border-slate-300 bg-white px-1.5 py-1 text-right text-[12px] leading-4 ${rowGross < 0 ? "font-bold text-[#CF0202]" : "text-black"}`}
                            aria-label={`Gross amount for ${item.patient_name || "item"}`}
                          />
                        </div>
                      </td>
                    ) : (
                      <td className={`px-1.5 py-2.5 text-right align-middle text-[12px] font-medium leading-4 ${rowGross < 0 ? "font-bold text-[#CF0202]" : "text-black"}`}>
                        {formatMoney(rowGross)}
                      </td>
                    )}
                    {isEditMode ? (
                      <td className="px-1 py-2.5 text-center align-middle print:hidden">
                        <FileEdit className="mx-auto h-4 w-4 text-[#1162A8]" aria-hidden="true" />
                      </td>
                    ) : null}
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked card layout (hidden in print) */}
      <div className="space-y-3 border-t border-slate-200 pt-6 sm:hidden print:hidden">
        {previewItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No billing items available for this statement.
          </p>
        ) : (
          previewItems.map((item, index) => {
            const rowKey = billingItemKey(item, index)
            const gross = effectiveGross(item, index)
            return (
              <div
                key={item.id ?? `${item.patient_name}-mobile-${index}`}
                className="rounded-xl border border-slate-200 bg-[#DFEEFB] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-black">{item.patient_name || "—"}</p>
                    <p className="truncate text-sm text-slate-700">{item.product_name || "—"}</p>
                  </div>
                  {isEditMode ? (
                    <div className="flex shrink-0 items-center">
                      <span className="text-sm text-slate-500">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={Number.isFinite(gross) ? gross : 0}
                        onChange={(event) => onAmountChange(rowKey, Number.parseFloat(event.target.value))}
                        className={`w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm font-bold ${gross < 0 ? "text-[#CF0202]" : "text-black"}`}
                        aria-label={`Gross amount for ${item.patient_name || "item"}`}
                      />
                    </div>
                  ) : (
                    <span className={`shrink-0 text-base font-bold ${gross < 0 ? "text-[#CF0202]" : "text-black"}`}>
                      {formatMoney(gross)}
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-700">
                  <div className="flex justify-between"><dt className="text-slate-500">U/L</dt><dd>{item.product_type || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Grade</dt><dd className="truncate">{item.grade_name || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Stage</dt><dd className="truncate">{item.stage_name || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">QTY</dt><dd>{item.quantity ?? "-"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Base</dt><dd>{formatMoney(item.base_total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Add-on</dt><dd>{toNumber(item.addon_total) === 0 ? "-" : formatMoney(item.addon_total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Sub Total</dt><dd>{toNumber(item.sub_total) === 0 ? "-" : formatMoney(item.sub_total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">R%</dt><dd>{toNumber(item.rush_percentage) === 0 ? "-" : `${toNumber(item.rush_percentage)}%`}</dd></div>
                </dl>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-[280px] rounded-xl bg-slate-50 p-4 print:bg-transparent print:p-0">
          <div className="mb-1.5 flex items-center justify-between text-[15px] font-bold tracking-[-0.02em] text-black">
            <span>Sub Total</span>
            <span className="tabular-nums">{formatMoney(previewSubtotal)}</span>
          </div>
          <div className="mb-2.5 flex items-center justify-between text-[15px] font-bold tracking-[-0.02em] text-[#CF0202]">
            <span>Refund</span>
            <span className="tabular-nums">{formatMoney(previewRefundTotal)}</span>
          </div>
          <div className="border-t-2 border-slate-300 pt-2.5">
            <div className="flex items-center justify-between text-xl font-bold tracking-[-0.02em] text-black">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(previewTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StatementPreviewPage() {
  const { toast } = useToast()
  const params = useParams<{ statementId: string }>()
  const statementId = Number(params?.statementId)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [headerDraft, setHeaderDraft] = useState<StatementHeaderDraft | null>(null)
  // Per-row Gross edits, keyed by billingItemKey(). Used to recompute totals
  // live and to persist matched billing products on Email/Resend.
  const [amountDrafts, setAmountDrafts] = useState<Record<string, number>>({})
  const { data: statement, isLoading, isError, error } = useGetStatementByIdQuery(statementId, {
    skip: !Number.isInteger(statementId) || statementId <= 0,
  })
  // Invoices are only needed in edit mode, to match statement items back to a
  // billing product so an edited Gross can be persisted.
  const { data: invoiceList } = useListBillingInvoicesQuery(
    { per_page: 200 },
    { skip: !isEditMode },
  )
  const [generateStatementPdf] = useGenerateStatementPdfMutation()
  const [sendStatement] = useSendStatementMutation()
  const [updateBillingProductPricing] = useUpdateBillingProductPricingMutation()

  useEffect(() => {
    if (!statement) return
    setHeaderDraft(buildStatementHeaderDraft(statement))
    setAmountDrafts({})
  }, [statement])

  const handleAmountChange = (key: string, value: number) => {
    setAmountDrafts((current) => ({
      ...current,
      [key]: Number.isFinite(value) ? value : 0,
    }))
  }

  const effectiveStatement = useMemo(() => {
    if (!statement) return null
    if (!headerDraft) return statement
    return {
      ...statement,
      statement_id: headerDraft.statementId || statement.statement_id,
      recipient_email: headerDraft.recipientEmail || statement.recipient_email,
      created_at: headerDraft.statementDate || statement.created_at,
      due_date: headerDraft.dueDate || statement.due_date,
    } satisfies StatementRecord
  }, [statement, headerDraft])

  const pageTitle = effectiveStatement?.statement_id || (Number.isInteger(statementId) && statementId > 0 ? `Statement #${statementId}` : "Statement Preview")

  const handleCloseTab = () => {
    window.close()
    window.setTimeout(() => {
      if (!window.closed) {
        window.history.back()
      }
    }, 150)
  }

  // Generates the server-side (Blade/dompdf) statement PDF and returns its
  // blob. Shared by Download and Print so both use the same pixel-controlled
  // PDF the backend produces, rather than the browser print of this page.
  const fetchStatementPdfBlob = async (): Promise<Blob> => {
    if (!statement) throw new Error("Statement is not loaded")

    const result = await generateStatementPdf(statement.id).unwrap()
    const candidatePaths = [
      result?.data?.download_url,
      result?.data?.pdf_url,
      statement.pdf_path,
    ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)

    if (candidatePaths.length === 0) {
      throw new Error(result?.message || "No PDF URL returned by the server")
    }

    let lastError: Error | null = null
    for (const path of candidatePaths) {
      try {
        return await fetchAuthorizedBlob(path)
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error("Unable to fetch statement PDF")
      }
    }

    throw lastError || new Error("Unable to fetch statement PDF")
  }

  const handleDownload = async () => {
    if (!statement) return
    setIsDownloading(true)
    try {
      const blob = await fetchStatementPdfBlob()
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
        description: downloadError instanceof Error ? downloadError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = async () => {
    if (!statement) return
    setIsPrinting(true)
    let blobUrl: string | null = null
    try {
      const blob = await fetchStatementPdfBlob()
      blobUrl = URL.createObjectURL(blob)

      // Open the server PDF in a hidden iframe and trigger its print dialog.
      // This prints the API/Blade output (aligned with Figma) instead of the
      // browser printing this React page.
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.right = "0"
      iframe.style.bottom = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      iframe.style.border = "0"
      iframe.src = blobUrl

      const cleanup = () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }

      iframe.onload = () => {
        try {
          const frameWindow = iframe.contentWindow
          if (!frameWindow) throw new Error("Unable to open the print preview")
          frameWindow.focus()
          frameWindow.print()
          // Revoke after the print dialog has had time to read the document.
          window.setTimeout(cleanup, 60_000)
        } catch (printError) {
          cleanup()
          toast({
            title: "Unable to print statement",
            description: printError instanceof Error ? printError.message : "Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsPrinting(false)
        }
      }

      document.body.appendChild(iframe)
    } catch (printError) {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setIsPrinting(false)
      toast({
        title: "Unable to print statement",
        description: printError instanceof Error ? printError.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  // Persists any edited Gross amounts back to billing before sending. For each
  // draft that differs from the stored value, matches the statement item to a
  // billing product, solves the new base_price, and PUTs it. Unmatched items
  // are skipped (per product decision). Returns counts for user feedback.
  const persistAmountEdits = async (): Promise<{ saved: number; skipped: number }> => {
    if (!statement) return { saved: 0, skipped: 0 }

    const items = (statement.billing_items as StatementPreviewBillingItem[] | undefined) ?? []
    const invoices = invoiceList?.data ?? []
    let saved = 0
    let skipped = 0

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const key = billingItemKey(item, index)
      const draftGross = amountDrafts[key]
      if (draftGross === undefined || !Number.isFinite(draftGross)) continue

      const storedGross = getBillingItemGross(item)
      if (Math.abs(draftGross - storedGross) < 0.005) continue // unchanged

      const target = findMatchingBillingTarget(item, invoices)
      if (!target) {
        skipped += 1
        continue
      }

      const invoice = invoices.find((candidate) => candidate.id === target.invoiceId)
      const product = invoice?.products?.find((candidate) => candidate.id === target.productId)
      if (!product) {
        skipped += 1
        continue
      }

      const newBasePrice = computeBasePriceFromTargetGross(Math.abs(draftGross), product)
      if (newBasePrice === null) {
        skipped += 1
        continue
      }

      try {
        await updateBillingProductPricing({
          productId: target.productId,
          invoiceId: target.invoiceId,
          body: { base_price: newBasePrice },
        }).unwrap()
        saved += 1
      } catch {
        skipped += 1
      }
    }

    return { saved, skipped }
  }

  const handleEmail = async () => {
    if (!statement) return

    const recipientEmail = headerDraft?.recipientEmail?.trim() || statement.recipient_email || ""
    if (!recipientEmail || !statement.subject) {
      toast({
        title: "Statement is missing email details",
        description: "Recipient email and subject are required before sending.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      // Persist edited amounts first so the regenerated PDF/email reflects them.
      if (isEditMode && Object.keys(amountDrafts).length > 0) {
        const { saved, skipped } = await persistAmountEdits()
        if (saved > 0) {
          toast({
            title: "Amounts updated",
            description: `${saved} line item${saved === 1 ? "" : "s"} saved${skipped > 0 ? `, ${skipped} skipped (no matching invoice)` : ""}.`,
          })
        } else if (skipped > 0) {
          toast({
            title: "Amounts not saved",
            description: `${skipped} edited line item${skipped === 1 ? "" : "s"} could not be matched to an invoice.`,
            variant: "destructive",
          })
        }
      }

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
    } catch (sendError) {
      toast({
        title: "Unable to send statement",
        description: sendError instanceof Error ? sendError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .statement-preview-shell {
            min-height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Borderless white A4 sheet (per design screenshots). The @page
             margin supplies the surrounding whitespace; the card stays clean
             with no frame, shadow, or radius. */
          .statement-preview-card {
            box-sizing: border-box !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Modest inner padding so content isn't flush against the @page
             margin edge. */
          .statement-preview-card > div {
            padding: 8px 4px !important;
          }

          /* Let the table use the full printable width instead of forcing a
             1000px min-width that overflows / clips on A4 portrait. Use auto
             layout so columns size to their content like the reference design
             (headers stay on one line, money columns get room). */
          .statement-table {
            min-width: 0 !important;
            width: 100% !important;
            table-layout: auto !important;
            font-size: 10px !important;
          }

          /* Drop the on-screen percentage column widths so auto layout can
             size each column to its content in print. */
          .statement-table colgroup col {
            width: auto !important;
          }

          .statement-table th,
          .statement-table td {
            padding: 6px 7px !important;
            line-height: 1.35 !important;
            overflow-wrap: break-word;
          }

          /* Match the reference design: Title-Case header labels (not the
             on-screen uppercase), readable size, normal letter-spacing. */
          .statement-table thead tr th {
            font-size: 10px !important;
            font-weight: 700 !important;
            text-transform: none !important;
            letter-spacing: 0 !important;
            color: #0f172a !important;
            white-space: nowrap !important;
          }

          /* Borders so rows stay legible even when the user prints with
             "Background graphics" turned off (stripes won't render then). */
          .statement-table thead tr {
            border-bottom: 1px solid #94a3b8 !important;
          }

          .statement-table tbody tr {
            border-bottom: 1px solid #e2e8f0 !important;
          }

          /* Keep striped row backgrounds when "Background graphics" is on */
          .statement-table tr {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Repeat the table header on every printed page */
          .statement-table thead {
            display: table-header-group;
          }
        }
      `}</style>

      <div className="statement-preview-shell min-h-screen bg-[#f4f7fb] px-4 py-6 sm:px-6 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[960px] print:max-w-none">
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-[28px] border border-[#F6F6F6] bg-white print:min-h-0 print:border-0">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparing statement preview...
              </div>
            </div>
          ) : null}

          {!isLoading && (isError || !statement) ? (
            <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center print:border-0 print:p-0">
              <h2 className="text-xl font-semibold text-slate-950">Unable to load statement preview</h2>
              <p className="mt-2 text-sm text-slate-500">
                {error instanceof Error ? error.message : "The statement could not be loaded."}
              </p>
            </div>
          ) : null}

          {!isLoading && effectiveStatement ? (
            <div className="statement-preview-card rounded-[28px] border border-[#F6F6F6] bg-white shadow-[9px_7px_21.5px_rgba(0,0,0,0.18)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
              <div className="relative px-8 pb-8 pt-8 sm:px-12 sm:pb-10 sm:pt-10 print:px-4 print:pb-4 print:pt-4">
                <button
                  type="button"
                  onClick={handleCloseTab}
                  className="absolute right-6 top-6 text-black transition hover:text-slate-600 print:hidden"
                  aria-label="Close preview"
                >
                  <X className="h-8 w-8" />
                </button>
                <div className="mb-10 flex items-center gap-5 pr-12 print:hidden">
                  <StatementPreviewIcon />
                  <div>
                    <h1
                      className="text-[22px] font-bold leading-[22px] tracking-[-0.02em] text-black"
                      style={{ fontFamily: "Verdana, sans-serif" }}
                    >
                      {isEditMode ? "Virtual Statement - [EDIT MODE]" : "Virtual Statement"}
                    </h1>
                  </div>
                </div>
                <StatementPreviewContent
                  statement={effectiveStatement}
                  isEditMode={isEditMode}
                  headerDraft={headerDraft}
                  onHeaderDraftChange={setHeaderDraft}
                  amountDrafts={amountDrafts}
                  onAmountChange={handleAmountChange}
                />
              </div>
              <div className="bg-white px-8 pb-8 print:hidden sm:px-12">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 justify-center gap-2 rounded-2xl border-[#B4B0B0] px-6 text-base font-medium text-[#999999]"
                      style={{ fontFamily: "Verdana, sans-serif" }}
                      onClick={() => void handleDownload()}
                      disabled={isDownloading || !statement}
                    >
                      {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                      Download PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 justify-center gap-2 rounded-2xl border-[#B4B0B0] px-6 text-base font-medium text-[#999999]"
                      style={{ fontFamily: "Verdana, sans-serif" }}
                      onClick={() => void handlePrint()}
                      disabled={isPrinting || !statement}
                    >
                      {isPrinting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                      Print
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 justify-center gap-2 rounded-2xl border-[#B4B0B0] px-6 text-base font-medium text-[#999999]"
                      style={{ fontFamily: "Verdana, sans-serif" }}
                      onClick={() => setIsEditMode((current) => !current)}
                      disabled={!statement}
                    >
                      <Pencil className="h-5 w-5" />
                      {isEditMode ? "Editing Statement" : "Edit Statement"}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    className="h-14 justify-center gap-2 rounded-2xl bg-[#1162A8] px-8 text-base font-semibold text-white hover:bg-[#0f4d8b]"
                      style={{ fontFamily: "Verdana, sans-serif" }}
                    onClick={() => void handleEmail()}
                    disabled={isSending || !statement}
                  >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                    {isEditMode ? "Resend Statement" : "Email Statement"}
                  </Button>
                </div>
                {isEditMode ? (
                  <div className="mt-3 text-sm text-slate-500">
                    Edit mode supports statement header fields and gross amount adjustments on this standalone page.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
