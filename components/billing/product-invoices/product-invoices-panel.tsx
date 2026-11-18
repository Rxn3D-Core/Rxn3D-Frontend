"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight, FileText, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { formatMoney, PRODUCT_INVOICE_STATUSES, resolveStatementSelection } from "@/lib/product-invoicing"
import { useGenerateStatementMutation } from "@/lib/redux/api/billingApi"
import { productInvoiceErrorMessage, useListProductInvoicesQuery } from "@/lib/redux/api/productInvoiceApi"
import type { ArchType, ProductInvoiceListItem } from "@/types/product-invoicing"
import { ProductInvoiceDetailDialog } from "./product-invoice-detail-dialog"
import { ProductInvoiceStatusBadge } from "./product-invoice-status-badge"

const PER_PAGE = 15

interface Props {
  /** `{ lab_id }` for lab users, `{ office_id }` for office users (same scope as the stage invoice list). */
  scope: { lab_id?: number; office_id?: number }
}

/** RXN-90: Charge Management list of product invoices (one per case and arch). No bulk actions in v1. */
export function ProductInvoicesPanel({ scope }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isLab = scope.lab_id != null
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [arch, setArch] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Record<number, ProductInvoiceListItem>>({})
  const [openId, setOpenId] = useState<number | null>(null)
  const [generateStatement, generateState] = useGenerateStatementMutation()
  const [lastStatementId, setLastStatementId] = useState<number | null>(null)

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
      search: search || undefined,
      status: status === "all" ? undefined : status,
      arch: arch === "all" ? undefined : (arch as ArchType),
      per_page: PER_PAGE,
      page,
    }),
    [scope, search, status, arch, page],
  )
  const { data, isFetching, isError, refetch } = useListProductInvoicesQuery(params, {
    skip: scope.lab_id == null && scope.office_id == null,
    refetchOnMountOrArgChange: true,
  })
  const rows = data?.data ?? []
  const pagination = data?.pagination
  const selectedRows = Object.values(selected)

  const toggleRow = (row: ProductInvoiceListItem, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (checked) next[row.id] = row
      else delete next[row.id]
      return next
    })
  }

  const handleGenerateStatement = async () => {
    const result = resolveStatementSelection(selectedRows)
    if ("error" in result) {
      toast({ title: t(`productInvoicing.list.selection.${result.error}`), variant: "destructive" })
      return
    }
    try {
      const response = await generateStatement({
        product_invoice_ids: selectedRows.map((r) => r.id),
        office_id: result.officeId,
        direction: "outgoing",
      }).unwrap()
      setSelected({})
      setLastStatementId(response?.data?.id ?? null)
      toast({ title: t("productInvoicing.list.statementCreated") })
      void refetch()
    } catch (error) {
      toast({
        title: t("productInvoicing.list.statementFailed"),
        description: productInvoiceErrorMessage(error, ""),
        variant: "destructive",
      })
    }
  }

  const archLabel = (value: string) => t(`productInvoicing.arch.${value}`, { defaultValue: value })

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
        <div className="grid grid-cols-2 gap-2 lg:flex">
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
            disabled={selectedRows.length === 0 || generateState.isLoading}
            data-testid="product-invoices-generate-statement"
          >
            {generateState.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {t("productInvoicing.list.generateStatement", { count: selectedRows.length })}
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
      ) : isFetching && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500" data-testid="product-invoices-loading">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("productInvoicing.common.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-gray-500" data-testid="product-invoices-empty">
          {t("productInvoicing.list.empty")}
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {isLab && <TableHead className="w-10" />}
                  <TableHead>{t("productInvoicing.list.invoice")}</TableHead>
                  <TableHead>{t("productInvoicing.list.case")}</TableHead>
                  <TableHead>{t("productInvoicing.list.office")}</TableHead>
                  <TableHead>{t("productInvoicing.list.arch")}</TableHead>
                  <TableHead>{t("productInvoicing.list.status")}</TableHead>
                  <TableHead>{t("productInvoicing.list.finalized")}</TableHead>
                  <TableHead className="text-right">{t("productInvoicing.list.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setOpenId(row.id)}
                    data-testid={`product-invoices-row-${row.id}`}
                  >
                    {isLab && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={!!selected[row.id]}
                          disabled={!!row.on_statement}
                          onCheckedChange={(checked) => toggleRow(row, checked === true)}
                          aria-label={t("productInvoicing.list.select", { number: row.invoice_number })}
                          data-testid={`product-invoices-row-${row.id}-select`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-[#1162A8]">{row.invoice_number}</TableCell>
                    <TableCell>
                      <div className="text-sm">{row.case_number ?? row.case_id}</div>
                      {row.patient_name && <div className="text-xs text-gray-500">{row.patient_name}</div>}
                    </TableCell>
                    <TableCell>{row.office_name ?? "—"}</TableCell>
                    <TableCell>{archLabel(row.arch)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <ProductInvoiceStatusBadge status={row.status} />
                        {row.on_statement && <span className="text-xs text-gray-500">{t("productInvoicing.list.onStatement")}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{row.finalized_at ? new Date(row.finalized_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(row.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phone cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border-[1.5px] border-gray-200 p-3"
                data-testid={`product-invoices-card-${row.id}`}
              >
                <div className="flex items-start gap-3">
                  {isLab && (
                    <Checkbox
                      className="mt-1"
                      checked={!!selected[row.id]}
                      disabled={!!row.on_statement}
                      onCheckedChange={(checked) => toggleRow(row, checked === true)}
                      aria-label={t("productInvoicing.list.select", { number: row.invoice_number })}
                    />
                  )}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(row.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-medium text-[#1162A8]">{row.invoice_number}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-base">{formatMoney(row.total_amount)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-700">
                      {[row.case_number ?? row.case_id, row.patient_name, archLabel(row.arch)].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <ProductInvoiceStatusBadge status={row.status} />
                      {row.office_name && <span className="truncate text-xs">{row.office_name}</span>}
                      {row.on_statement && <span className="text-xs">{t("productInvoicing.list.onStatement")}</span>}
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.last_page > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600" data-testid="product-invoices-pagination">
              <span className="text-sm">
                {t("productInvoicing.list.pageOf", { page: pagination.current_page, total: pagination.last_page })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page <= 1 || isFetching}
                  aria-label={t("productInvoicing.list.previous")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.current_page >= pagination.last_page || isFetching}
                  aria-label={t("productInvoicing.list.next")}
                >
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
