"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { chargeRowClass, chargeStatusBadgeClass, formatChargeMoney } from "@/lib/billing/charge-row-format"
import {
  productInvoiceDateRange,
  productInvoiceToRows,
  type ProductChargeRow,
  type ProductInvoiceDatePreset,
} from "@/lib/billing/product-invoice-rows"
import {
  isProductInvoiceDeletable,
  isProductInvoiceEditable,
  PRODUCT_INVOICE_STATUSES,
  resolveStatementSelection,
} from "@/lib/product-invoicing"
import { openBlobInNewTab } from "@/lib/open-pdf-from-base64"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { useGenerateStatementMutation } from "@/lib/redux/api/billingApi"
import {
  productInvoiceErrorMessage,
  useDeleteProductInvoiceMutation,
  useDownloadProductInvoicePdfMutation,
  useListProductInvoicesQuery,
  useRegenerateProductInvoiceMutation,
  useUpdateProductInvoiceStatusMutation,
} from "@/lib/redux/api/productInvoiceApi"
import type { ArchType, ProductInvoiceListItem } from "@/types/product-invoicing"
import { ProductInvoiceDetailDialog } from "./product-invoice-detail-dialog"

const PER_PAGE = 15
const DATE_PRESETS: ProductInvoiceDatePreset[] = ["all", "today", "this_week", "this_month", "last_month", "this_year"]

/** Same header cell style as the slip listing. */
const TH = "h-9 px-1.5 py-2 text-center text-[11px] font-semibold text-gray-700 whitespace-nowrap"
const TD = "px-1.5 py-1.5 text-xs text-gray-900"

interface Props {
  /** `{ lab_id }` for lab users, `{ office_id }` for office users (same scope as the stage invoice list). */
  scope: { lab_id?: number; office_id?: number }
}

/**
 * RXN-90: Charge Management list of product invoices (one per case and arch), laid out like the slip listing:
 * same columns, row tint, status badges and row actions, plus product-invoice actions (delete, line prices in the
 * invoice view). One row per product when the API sends product blocks.
 */
export function ProductInvoicesPanel({ scope }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isLab = scope.lab_id != null
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [arch, setArch] = useState<string>("all")
  const [datePreset, setDatePreset] = useState<ProductInvoiceDatePreset>("all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Record<number, ProductInvoiceListItem>>({})
  const [openId, setOpenId] = useState<number | null>(null)
  const [busy, setBusy] = useState<{ id: number; action: string } | null>(null)
  const [lastStatementId, setLastStatementId] = useState<number | null>(null)
  const [generateStatement, generateState] = useGenerateStatementMutation()
  const [updateStatus] = useUpdateProductInvoiceStatusMutation()
  const [regenerate] = useRegenerateProductInvoiceMutation()
  const [deleteInvoice] = useDeleteProductInvoiceMutation()
  const [downloadPdf] = useDownloadProductInvoicePdfMutation()

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const params = useMemo(
    () => ({
      ...scope,
      ...productInvoiceDateRange(datePreset),
      search: search || undefined,
      status: status === "all" ? undefined : status,
      arch: arch === "all" ? undefined : (arch as ArchType),
      per_page: PER_PAGE,
      page,
    }),
    [scope, datePreset, search, status, arch, page],
  )
  const { data, isFetching, isError, refetch } = useListProductInvoicesQuery(params, {
    skip: scope.lab_id == null && scope.office_id == null,
    refetchOnMountOrArgChange: true,
  })
  const invoices = data?.data ?? []
  const pagination = data?.pagination
  const invoicesById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv])), [invoices])
  const rows = useMemo(() => invoices.flatMap(productInvoiceToRows), [invoices])
  const selectedInvoices = Object.values(selected)
  const selectable = invoices.filter((inv) => !inv.on_statement)
  const allSelected = selectable.length > 0 && selectable.every((inv) => selected[inv.id])
  const selectedGross = rows.filter((r) => selected[r.invoiceId]).reduce((sum, r) => sum + r.grossValue, 0)

  const toggleInvoice = (inv: ProductInvoiceListItem | undefined, checked: boolean) => {
    if (!inv) return
    setSelected((prev) => {
      const next = { ...prev }
      if (checked) next[inv.id] = inv
      else delete next[inv.id]
      return next
    })
  }

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? Object.fromEntries(selectable.map((inv) => [inv.id, inv])) : {})

  const fail = (error: unknown, key: string) =>
    toast({ title: t(key), description: productInvoiceErrorMessage(error, ""), variant: "destructive" })

  const run = async (row: ProductChargeRow, action: string, fn: () => Promise<unknown>) => {
    setBusy({ id: row.invoiceId, action })
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  const handleToggleChecked = (row: ProductChargeRow) =>
    run(row, "check", async () => {
      const next = row.rawStatus.toLowerCase() === "checked" ? "pending" : "checked"
      try {
        await updateStatus({ id: row.invoiceId, status: next }).unwrap()
      } catch (error) {
        fail(error, "productInvoicing.detail.statusFailed")
      }
    })

  const handleRegenerate = (row: ProductChargeRow) => {
    if (!window.confirm(t("productInvoicing.detail.regenerateConfirmBody"))) return
    void run(row, "regenerate", async () => {
      try {
        await regenerate(row.invoiceId).unwrap()
        toast({ title: t("productInvoicing.detail.regenerated") })
      } catch (error) {
        fail(error, "productInvoicing.detail.regenerateFailed")
      }
    })
  }

  const handleDelete = (row: ProductChargeRow) => {
    if (!window.confirm(t("productInvoicing.detail.deleteConfirmBody"))) return
    void run(row, "delete", async () => {
      try {
        await deleteInvoice(row.invoiceId).unwrap()
        toast({ title: t("productInvoicing.detail.deleted") })
        toggleInvoice(invoicesById.get(row.invoiceId), false)
      } catch (error) {
        fail(error, "productInvoicing.detail.deleteFailed")
      }
    })
  }

  /** View opens the PDF in a tab (opened synchronously so it is not blocked as a popup); download saves it. */
  const handlePdf = (row: ProductChargeRow, mode: "view" | "download") => {
    const win = mode === "view" ? window.open("", "_blank") : null
    void run(row, mode, async () => {
      try {
        const blob = await downloadPdf(row.invoiceId).unwrap()
        if (mode === "view" && !win && openBlobInNewTab(blob)) return
        const url = URL.createObjectURL(blob)
        if (win) {
          win.location.href = url
        } else {
          const a = document.createElement("a")
          a.href = url
          a.download = `${row.invoiceNumber}.pdf`
          a.click()
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 180_000)
      } catch (error) {
        win?.close()
        fail(error, "productInvoicing.detail.pdfFailed")
      }
    })
  }

  const handleGenerateStatement = async () => {
    const result = resolveStatementSelection(selectedInvoices)
    if ("error" in result) {
      toast({ title: t(`productInvoicing.list.selection.${result.error}`), variant: "destructive" })
      return
    }
    try {
      const response = await generateStatement({
        product_invoice_ids: selectedInvoices.map((r) => r.id),
        office_id: result.officeId,
        direction: "outgoing",
      }).unwrap()
      setSelected({})
      setLastStatementId(response?.data?.id ?? null)
      toast({ title: t("productInvoicing.list.statementCreated") })
      void refetch()
    } catch (error) {
      fail(error, "productInvoicing.list.statementFailed")
    }
  }

  const archLabel = (value: string) => t(`productInvoicing.arch.${value}`, { defaultValue: value })
  const isBusy = (row: ProductChargeRow, action: string) => busy?.id === row.invoiceId && busy.action === action

  const renderActions = (row: ProductChargeRow) => {
    const inv = invoicesById.get(row.invoiceId)
    const editable = !!inv && isLab && isProductInvoiceEditable(inv)
    const deletable = !!inv && isLab && isProductInvoiceDeletable(inv)
    const checked = row.rawStatus.toLowerCase() === "checked"
    const canToggleCheck = isLab && !row.onStatement && (checked || row.rawStatus.toLowerCase() === "pending")
    const icon = (action: string, Icon: typeof Pencil) =>
      isBusy(row, action) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />
    return (
      <div className="flex items-center gap-0" data-testid={`product-invoices-row-${row.invoiceId}-actions`}>
        <Button
          variant="ghost" size="icon" type="button"
          className="h-7 w-7 text-gray-700 hover:text-gray-900"
          title={t("productInvoicing.table.actions.edit")}
          aria-label={t("productInvoicing.table.actions.edit")}
          onClick={() => setOpenId(row.invoiceId)}
          data-testid={`product-invoices-row-${row.invoiceId}-edit`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {isLab && (
          <Button
            variant="ghost" size="icon" type="button"
            className={`h-7 w-7 disabled:opacity-50 ${checked ? "text-green-600 hover:text-green-700" : "text-gray-400 hover:text-gray-500"}`}
            disabled={!canToggleCheck || !!busy}
            title={checked ? t("productInvoicing.table.actions.uncheck") : t("productInvoicing.table.actions.check")}
            aria-label={checked ? t("productInvoicing.table.actions.uncheck") : t("productInvoicing.table.actions.check")}
            onClick={() => void handleToggleChecked(row)}
            data-testid={`product-invoices-row-${row.invoiceId}-check`}
          >
            {icon("check", Check)}
          </Button>
        )}
        {isLab && (
          <Button
            variant="ghost" size="icon" type="button"
            className="h-7 w-7 text-amber-700 hover:text-amber-900 disabled:opacity-50"
            disabled={!editable || !!busy}
            title={t("productInvoicing.detail.regenerate")}
            aria-label={t("productInvoicing.detail.regenerate")}
            onClick={() => handleRegenerate(row)}
            data-testid={`product-invoices-row-${row.invoiceId}-regenerate`}
          >
            {icon("regenerate", RotateCcw)}
          </Button>
        )}
        <Button
          variant="ghost" size="icon" type="button"
          className="h-7 w-7 text-blue-600 hover:text-blue-800 disabled:opacity-50"
          disabled={!row.slipId}
          title={t("productInvoicing.table.actions.viewSlip")}
          aria-label={t("productInvoicing.table.actions.viewSlip")}
          onClick={() => row.slipId && window.open(buildVirtualSlipV2Path(row.caseId, row.slipId), "_blank", "noopener,noreferrer")}
          data-testid={`product-invoices-row-${row.invoiceId}-slip`}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" type="button"
          className="h-7 w-7 text-amber-600 hover:text-amber-800"
          disabled={!!busy}
          title={t("productInvoicing.table.actions.viewInvoice")}
          aria-label={t("productInvoicing.table.actions.viewInvoice")}
          onClick={() => handlePdf(row, "view")}
          data-testid={`product-invoices-row-${row.invoiceId}-view`}
        >
          {icon("view", FileText)}
        </Button>
        <Button
          variant="ghost" size="icon" type="button"
          className="h-7 w-7 text-blue-600 hover:text-blue-800"
          disabled={!!busy}
          title={t("productInvoicing.detail.pdf")}
          aria-label={t("productInvoicing.detail.pdf")}
          onClick={() => handlePdf(row, "download")}
          data-testid={`product-invoices-row-${row.invoiceId}-pdf`}
        >
          {icon("download", Download)}
        </Button>
        {deletable && (
          <Button
            variant="ghost" size="icon" type="button"
            className="h-7 w-7 text-[#CF0202] hover:text-red-800 disabled:opacity-50"
            disabled={!!busy}
            title={t("productInvoicing.detail.delete")}
            aria-label={t("productInvoicing.detail.delete")}
            onClick={() => handleDelete(row)}
            data-testid={`product-invoices-row-${row.invoiceId}-delete`}
          >
            {icon("delete", Trash2)}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div data-testid="product-invoices-panel">
      <p className="mb-3 text-sm text-gray-600">{t("productInvoicing.list.intro")}</p>

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("productInvoicing.list.searchPlaceholder")}
            className="h-10 pl-10 text-sm"
            data-testid="product-invoices-search"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <Select value={datePreset} onValueChange={(v) => { setDatePreset(v as ProductInvoiceDatePreset); setPage(1) }}>
            <SelectTrigger className="h-10 lg:w-40" data-testid="product-invoices-date-filter" aria-label={t("productInvoicing.table.dateRange")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p} value={p}>{t(`productInvoicing.table.datePreset.${p}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="h-10 lg:w-40" data-testid="product-invoices-status-filter" aria-label={t("productInvoicing.list.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("productInvoicing.list.allStatuses")}</SelectItem>
              {PRODUCT_INVOICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`productInvoicing.status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={arch} onValueChange={(v) => { setArch(v); setPage(1) }}>
            <SelectTrigger className="h-10 lg:w-36" data-testid="product-invoices-arch-filter" aria-label={t("productInvoicing.list.arch")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("productInvoicing.list.allArches")}</SelectItem>
              <SelectItem value="Upper">{archLabel("Upper")}</SelectItem>
              <SelectItem value="Lower">{archLabel("Lower")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLab && (
          <Button
            className="lg:ml-auto"
            onClick={() => void handleGenerateStatement()}
            disabled={selectedInvoices.length === 0 || generateState.isLoading}
            data-testid="product-invoices-generate-statement"
          >
            {generateState.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {t("productInvoicing.list.generateStatement", { count: selectedInvoices.length })}
          </Button>
        )}
      </div>

      {lastStatementId != null && (
        <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-[#119933]" data-testid="product-invoices-statement-link">
          {t("productInvoicing.list.statementReady")}{" "}
          <Link href={`/statement-preview/${lastStatementId}`} className="font-medium underline underline-offset-2">
            {t("productInvoicing.list.openStatement")}
          </Link>
        </p>
      )}

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-[#CF0202]" data-testid="product-invoices-error">
          <p className="text-sm">{t("productInvoicing.list.loadFailed")}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {t("productInvoicing.common.retry")}
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: same table as the slip listing */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="w-8 px-1.5 py-2">
                    {isLab && (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(c) => toggleAll(c === true)}
                        disabled={selectable.length === 0}
                        aria-label={t("productInvoicing.table.selectAll")}
                        data-testid="product-invoices-select-all"
                      />
                    )}
                  </TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.officeCode")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.patient")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.ul")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.product")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.grade")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.stage")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.baseTotal")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.addOn")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.subTotal")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.rush")}</TableHead>
                  <TableHead className={TH}>
                    {t("productInvoicing.table.gross")}
                    {selectedInvoices.length > 0 && (
                      <div className="mt-0.5 text-[11px] font-bold text-black tabular-nums" data-testid="product-invoices-selected-gross">
                        {formatChargeMoney(selectedGross)}
                      </div>
                    )}
                  </TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.dueDate")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.status")}</TableHead>
                  <TableHead className={TH}>{t("productInvoicing.table.actionsHeader")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="px-1.5 py-8 text-center text-xs text-gray-500" data-testid="product-invoices-loading">
                      {t("productInvoicing.common.loading")}
                    </TableCell>
                  </TableRow>
                )}
                {!isFetching && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="px-1.5 py-8 text-center text-xs text-gray-500" data-testid="product-invoices-empty">
                      {t("productInvoicing.list.empty")}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row, index) => {
                  const inv = invoicesById.get(row.invoiceId)
                  return (
                    <TableRow
                      key={row.id}
                      className={`border-b border-gray-100 ${chargeRowClass(row.status, index)}`}
                      data-testid={`product-invoices-row-${row.invoiceId}`}
                    >
                      <TableCell className="px-1.5 py-1.5">
                        {isLab && (
                          <Checkbox
                            checked={!!selected[row.invoiceId]}
                            disabled={row.onStatement}
                            onCheckedChange={(c) => toggleInvoice(inv, c === true)}
                            aria-label={t("productInvoicing.list.select", { number: row.invoiceNumber })}
                            data-testid={`product-invoices-row-${row.invoiceId}-select`}
                          />
                        )}
                      </TableCell>
                      <TableCell className={`${TD} font-medium whitespace-nowrap`} title={row.officeName}>{row.officeCode}</TableCell>
                      <TableCell className={`${TD} whitespace-nowrap`}>{row.patient}</TableCell>
                      <TableCell className={`${TD} text-center whitespace-nowrap`}>{row.ul}</TableCell>
                      <TableCell className={`${TD} leading-snug max-w-[9rem]`}>
                        {row.product}
                        {row.variation !== "—" && <div className="text-[10px] leading-snug text-gray-500">{row.variation}</div>}
                        <div className="text-[10px] leading-snug text-gray-500">{row.invoiceNumber}</div>
                      </TableCell>
                      <TableCell className={`${TD} whitespace-nowrap`}>{row.grade}</TableCell>
                      <TableCell className={`${TD} whitespace-nowrap`}>{t("productInvoicing.table.allStages")}</TableCell>
                      <TableCell className={`${TD} tabular-nums whitespace-nowrap`}>{row.baseTotal}</TableCell>
                      <TableCell className={`${TD} leading-snug whitespace-pre-line max-w-[7rem]`} data-testid={`product-invoices-row-${row.invoiceId}-addons`}>
                        {row.addOn}
                      </TableCell>
                      <TableCell className={`${TD} tabular-nums whitespace-pre-line`}>{row.subTotal}</TableCell>
                      <TableCell className={`${TD} text-center whitespace-nowrap`}>{row.rPercent}</TableCell>
                      <TableCell className={`${TD} font-medium tabular-nums whitespace-nowrap`} data-testid={`product-invoices-row-${row.invoiceId}-gross`}>
                        {row.gross}
                      </TableCell>
                      <TableCell className={`${TD} whitespace-nowrap`}>{row.dueDate}</TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <div className="flex flex-col items-start gap-0.5">
                          <Badge className={`text-[10px] px-1.5 py-0 ${chargeStatusBadgeClass(row.status)}`} data-testid="product-invoice-status">
                            {t(`productInvoicing.status.${row.rawStatus.toLowerCase()}`, { defaultValue: row.status })}
                          </Badge>
                          {row.onStatement && <span className="text-[10px] text-gray-500">{t("productInvoicing.list.onStatement")}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">{renderActions(row)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Phone cards */}
          <div className="space-y-2 md:hidden">
            {isFetching && rows.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">{t("productInvoicing.common.loading")}</p>
            )}
            {!isFetching && rows.length === 0 && (
              <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-gray-500">{t("productInvoicing.list.empty")}</p>
            )}
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border-[1.5px] border-gray-200 p-3" data-testid={`product-invoices-card-${row.invoiceId}`}>
                <div className="flex items-start gap-3">
                  {isLab && (
                    <Checkbox
                      className="mt-1"
                      checked={!!selected[row.invoiceId]}
                      disabled={row.onStatement}
                      onCheckedChange={(c) => toggleInvoice(invoicesById.get(row.invoiceId), c === true)}
                      aria-label={t("productInvoicing.list.select", { number: row.invoiceNumber })}
                    />
                  )}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(row.invoiceId)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {row.product !== "—" ? row.product : row.invoiceNumber}
                      </span>
                      <span className="shrink-0 text-base font-semibold tabular-nums">{row.gross}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-700">
                      {[row.patient, row.ul, row.grade !== "—" ? row.grade : null].filter(Boolean).join(" · ")}
                    </p>
                    {row.addOn !== "—" && (
                      <p className="mt-0.5 whitespace-pre-line text-xs text-gray-600">
                        {row.addOn.split("\n").map((a, i) => `${a}  ${row.subTotal.split("\n")[i] ?? ""}`).join("\n")}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge className={`text-[10px] px-1.5 py-0 ${chargeStatusBadgeClass(row.status)}`}>
                        {t(`productInvoicing.status.${row.rawStatus.toLowerCase()}`, { defaultValue: row.status })}
                      </Badge>
                      {row.rPercent !== "—" && <span className="text-xs">{t("productInvoicing.table.rush")} {row.rPercent}</span>}
                      <span className="text-xs">{row.dueDate}</span>
                      <span className="truncate text-xs">{row.officeCode !== "—" ? row.officeCode : row.officeName}</span>
                      {row.onStatement && <span className="text-xs">{t("productInvoicing.list.onStatement")}</span>}
                    </div>
                  </button>
                </div>
                <div className="mt-2 flex justify-end border-t pt-1">{renderActions(row)}</div>
              </div>
            ))}
          </div>

          {pagination && pagination.last_page > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600" data-testid="product-invoices-pagination">
              <span className="text-sm">
                {t("productInvoicing.list.pageOf", { page: pagination.current_page, total: pagination.last_page })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page <= 1 || isFetching} aria-label={t("productInvoicing.list.previous")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.current_page >= pagination.last_page || isFetching} aria-label={t("productInvoicing.list.next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductInvoiceDetailDialog invoiceId={openId} canManage={isLab} onClose={() => setOpenId(null)} />
    </div>
  )
}
