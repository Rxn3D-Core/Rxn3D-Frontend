"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Download, Loader2, Pencil, RefreshCw, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { openBlobInNewTab } from "@/lib/open-pdf-from-base64"
import {
  formatMoney,
  isProductInvoiceDeletable,
  isProductInvoiceEditable,
  orderSections,
  PRODUCT_INVOICE_STATUSES,
  toMoney,
} from "@/lib/product-invoicing"
import {
  productInvoiceErrorMessage,
  useDeleteProductInvoiceMutation,
  useDownloadProductInvoicePdfMutation,
  useGetProductInvoiceQuery,
  useRegenerateProductInvoiceMutation,
  useUpdateProductInvoiceLinePriceMutation,
  useUpdateProductInvoiceStatusMutation,
} from "@/lib/redux/api/productInvoiceApi"
import type {
  ProductInvoiceLine,
  ProductInvoiceProduct,
  ProductInvoiceSection,
  ProductInvoiceStatus,
} from "@/types/product-invoicing"
import { ProductInvoiceStatusBadge } from "./product-invoice-status-badge"

/** Line types the lab may re-price; rush and cancellation charges are derived. */
const NON_EDITABLE_LINE_TYPES = new Set(["rush", "cancellation_charge"])

interface Props {
  invoiceId: number | null
  /** Lab users manage invoices; office users only view and download. */
  canManage: boolean
  onClose: () => void
}

export function ProductInvoiceDetailDialog({ invoiceId, canManage, onClose }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const open = invoiceId != null
  // currentData: never show the previously opened invoice while the next one loads.
  const { currentData: invoice, isFetching, isError, refetch } = useGetProductInvoiceQuery(invoiceId ?? 0, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  })
  const [updateStatus, statusState] = useUpdateProductInvoiceStatusMutation()
  const [regenerate, regenerateState] = useRegenerateProductInvoiceMutation()
  const [deleteInvoice, deleteState] = useDeleteProductInvoiceMutation()
  const [downloadPdf, pdfState] = useDownloadProductInvoicePdfMutation()
  const [statusDraft, setStatusDraft] = useState<string>("")
  const [confirm, setConfirm] = useState<"regenerate" | "delete" | null>(null)

  useEffect(() => {
    setStatusDraft(invoice?.status ?? "")
  }, [invoice?.status])

  const editable = !!invoice && canManage && isProductInvoiceEditable(invoice)
  const deletable = !!invoice && canManage && isProductInvoiceDeletable(invoice)
  const busy = statusState.isLoading || regenerateState.isLoading || deleteState.isLoading

  const fail = (error: unknown, fallbackKey: string) =>
    toast({ title: t(fallbackKey), description: productInvoiceErrorMessage(error, ""), variant: "destructive" })

  const handleStatusSave = async () => {
    if (!invoice || !statusDraft || statusDraft === invoice.status) return
    try {
      await updateStatus({ id: invoice.id, status: statusDraft as ProductInvoiceStatus }).unwrap()
      toast({ title: t("productInvoicing.detail.statusSaved") })
    } catch (error) {
      setStatusDraft(invoice.status)
      fail(error, "productInvoicing.detail.statusFailed")
    }
  }

  const handleConfirm = async () => {
    if (!invoice || !confirm) return
    const action = confirm
    setConfirm(null)
    try {
      if (action === "regenerate") {
        await regenerate(invoice.id).unwrap()
        toast({ title: t("productInvoicing.detail.regenerated") })
      } else {
        await deleteInvoice(invoice.id).unwrap()
        toast({ title: t("productInvoicing.detail.deleted") })
        onClose()
      }
    } catch (error) {
      fail(error, action === "regenerate" ? "productInvoicing.detail.regenerateFailed" : "productInvoicing.detail.deleteFailed")
    }
  }

  const handlePdf = async () => {
    if (!invoice) return
    try {
      const blob = await downloadPdf(invoice.id).unwrap()
      if (!openBlobInNewTab(blob)) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${invoice.invoice_number}.pdf`
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch (error) {
      fail(error, "productInvoicing.detail.pdfFailed")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0"
          data-testid="product-invoice-detail"
        >
          <DialogHeader className="border-b px-4 py-4 sm:px-6 text-left">
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              <span className="text-lg">{invoice?.invoice_number ?? t("productInvoicing.detail.title")}</span>
              {invoice && <ProductInvoiceStatusBadge status={invoice.status} />}
              {invoice?.on_statement && (
                <Badge variant="outline" data-testid="product-invoice-detail-on-statement">
                  {t("productInvoicing.list.onStatement")}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-gray-600">
                {invoice ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-sm">{t("productInvoicing.detail.case", { number: invoice.case?.case_number ?? invoice.case?.id })}</span>
                    {invoice.case?.patient_name && <span className="text-sm">{invoice.case.patient_name}</span>}
                    {invoice.office?.name && <span className="text-sm">{invoice.office.name}</span>}
                    <span className="text-sm">{t(`productInvoicing.arch.${invoice.arch}`)}</span>
                    {invoice.finalized_reason && (
                      <span className="text-sm">{t(`productInvoicing.finalizedReason.${invoice.finalized_reason}`, { defaultValue: invoice.finalized_reason })}</span>
                    )}
                    {invoice.finalized_at && <span className="text-sm">{new Date(invoice.finalized_at).toLocaleDateString()}</span>}
                  </div>
                ) : (
                  t("productInvoicing.detail.subtitle")
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {isFetching && !invoice ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-500" data-testid="product-invoice-detail-loading">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("productInvoicing.common.loading")}
              </div>
            ) : isError || !invoice ? (
              <div className="py-12 text-center text-sm text-[#CF0202]" data-testid="product-invoice-detail-error">
                <p className="text-sm">{t("productInvoicing.detail.loadFailed")}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
                  {t("productInvoicing.common.retry")}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {canManage && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="w-full sm:w-56">
                      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="product-invoice-status">
                        {t("productInvoicing.detail.status")}
                      </label>
                      <Select value={statusDraft} onValueChange={setStatusDraft} disabled={busy}>
                        <SelectTrigger id="product-invoice-status" className="h-10" data-testid="product-invoice-detail-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_INVOICE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`productInvoicing.status.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void handleStatusSave()}
                      disabled={busy || statusDraft === invoice.status}
                      data-testid="product-invoice-detail-status-save"
                    >
                      {statusState.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("productInvoicing.detail.updateStatus")}
                    </Button>
                  </div>
                )}
                {canManage && !editable && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="product-invoice-detail-locked">
                    {t("productInvoicing.detail.locked")}
                  </p>
                )}

                {invoice.products.map((product) => (
                  <ProductBlock key={`${product.product_id}`} invoiceId={invoice.id} product={product} editable={editable} />
                ))}

                <div className="flex items-center justify-between border-t pt-4 text-base font-semibold" data-testid="product-invoice-detail-total">
                  <span className="text-base">{t("productInvoicing.detail.invoiceTotal")}</span>
                  <span className="tabular-nums text-base">{formatMoney(invoice.total_amount)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
            <Button variant="outline" onClick={onClose}>
              {t("productInvoicing.common.close")}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              {deletable && (
                <Button
                  variant="outline"
                  className="border-[#CF0202] text-[#CF0202] hover:bg-red-50"
                  onClick={() => setConfirm("delete")}
                  disabled={busy}
                  data-testid="product-invoice-detail-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("productInvoicing.detail.delete")}
                </Button>
              )}
              {editable && (
                <Button
                  variant="outline"
                  onClick={() => setConfirm("regenerate")}
                  disabled={busy}
                  data-testid="product-invoice-detail-regenerate"
                >
                  {regenerateState.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {t("productInvoicing.detail.regenerate")}
                </Button>
              )}
              <Button onClick={() => void handlePdf()} disabled={!invoice || pdfState.isLoading} data-testid="product-invoice-detail-pdf">
                {pdfState.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {t("productInvoicing.detail.pdf")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm != null} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent data-testid="product-invoice-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? t("productInvoicing.detail.deleteConfirmTitle") : t("productInvoicing.detail.regenerateConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete" ? t("productInvoicing.detail.deleteConfirmBody") : t("productInvoicing.detail.regenerateConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("productInvoicing.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirm()} data-testid="product-invoice-confirm-action">
              {confirm === "delete" ? t("productInvoicing.detail.delete") : t("productInvoicing.detail.regenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ProductBlock({ invoiceId, product, editable }: { invoiceId: number; product: ProductInvoiceProduct; editable: boolean }) {
  const { t } = useTranslation()
  const sections = orderSections(product.sections ?? [])
  const cancellation = product.cancellation
  return (
    <section className="rounded-lg border-[1.5px] border-gray-200" data-testid={`product-invoice-product-${product.product_id}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-base">
            {product.product_name}
            {product.product_code ? <span className="ml-2 text-xs font-normal text-gray-500">{product.product_code}</span> : null}
          </p>
          <p className="text-xs text-gray-600">{t(`productInvoicing.productStatus.${product.status}`, { defaultValue: product.status })}</p>
        </div>
        <span className="font-semibold tabular-nums text-base">{formatMoney(product.product_total)}</span>
      </header>
      {cancellation && (
        <p className="border-b px-3 py-2 text-sm text-gray-700 sm:px-4" data-testid={`product-invoice-cancellation-${product.product_id}`}>
          {t("productInvoicing.detail.cancellationSummary", {
            choice:
              cancellation.choice === "partial" && cancellation.partial_type === "percent"
                ? `${t("productInvoicing.cancel.choice.partial")} ${toMoney(cancellation.partial_value)}%`
                : t(`productInvoicing.cancel.choice.${cancellation.choice}`),
            amount: formatMoney(cancellation.charge_amount),
            reference: formatMoney(cancellation.reference_total),
          })}
        </p>
      )}
      <div className="divide-y">
        {sections.map((section) => (
          <SectionBlock key={section.id} invoiceId={invoiceId} section={section} editable={editable} />
        ))}
      </div>
    </section>
  )
}

function SectionBlock({ invoiceId, section, editable }: { invoiceId: number; section: ProductInvoiceSection; editable: boolean }) {
  const { t } = useTranslation()
  const rushFee = toMoney(section.rush_fee)
  const title =
    section.kind === "cancellation"
      ? t("productInvoicing.detail.cancellationSection")
      : section.stage_name || t("productInvoicing.detail.stage")
  return (
    <div
      className={`px-3 py-3 sm:px-4 ${section.is_reference ? "bg-gray-50 text-gray-500" : ""}`}
      data-testid={`product-invoice-section-${section.id}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">{title}</span>
        {section.slip_number && <span className="text-xs text-gray-500">{section.slip_number}</span>}
        {section.is_remake && <Badge variant="outline">{t("productInvoicing.detail.remake")}</Badge>}
        {section.is_reference && (
          <Badge variant="outline" data-testid={`product-invoice-section-${section.id}-reference`}>
            {t("productInvoicing.detail.reference")}
          </Badge>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1 pr-2 font-medium text-xs">{t("productInvoicing.detail.charge")}</th>
              <th className="py-1 px-2 text-right font-medium text-xs">{t("productInvoicing.detail.qty")}</th>
              <th className="py-1 px-2 text-right font-medium text-xs">{t("productInvoicing.detail.price")}</th>
              <th className="py-1 pl-2 text-right font-medium text-xs">{t("productInvoicing.detail.total")}</th>
              {editable && <th className="w-8" aria-label={t("productInvoicing.detail.editPrice")} />}
            </tr>
          </thead>
          <tbody>
            {/* Rush is shown once, as the summary row below (rush_fee), not as a charge line. */}
            {(section.lines ?? []).filter((line) => line.line_type !== "rush").map((line) => (
              <LineRow
                key={line.id}
                invoiceId={invoiceId}
                line={line}
                editable={editable && !section.is_reference && !NON_EDITABLE_LINE_TYPES.has(line.line_type)}
                showEditColumn={editable}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 space-y-0.5 text-sm">
        {rushFee > 0 && (
          <div className="flex justify-between text-gray-600">
            <span className="text-sm">{t("productInvoicing.detail.rush", { percent: toMoney(section.rush_percentage) })}</span>
            <span className="tabular-nums text-sm">{formatMoney(rushFee)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium" data-testid={`product-invoice-section-${section.id}-total`}>
          <span className="text-sm">
            {section.is_reference
              ? t("productInvoicing.detail.referenceTotal")
              : section.kind === "cancellation"
                ? t("productInvoicing.detail.cancellationSection")
                : t("productInvoicing.detail.sectionTotal")}
          </span>
          <span className="tabular-nums text-sm">{formatMoney(section.section_total)}</span>
        </div>
      </div>
    </div>
  )
}

function LineRow({
  invoiceId,
  line,
  editable,
  showEditColumn,
}: {
  invoiceId: number
  line: ProductInvoiceLine
  editable: boolean
  showEditColumn: boolean
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [savePrice, saveState] = useUpdateProductInvoiceLinePriceMutation()
  const label = [line.name || t(`productInvoicing.lineType.${line.line_type}`, { defaultValue: line.line_type }), line.option_name, line.teeth_number]
    .filter(Boolean)
    .join(" · ")

  const startEdit = () => {
    setDraft(String(toMoney(line.price)))
    setEditing(true)
  }

  const save = async () => {
    const price = Number.parseFloat(draft)
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: t("productInvoicing.detail.priceInvalid"), variant: "destructive" })
      return
    }
    try {
      await savePrice({ invoiceId, lineId: line.id, price }).unwrap()
      setEditing(false)
      toast({ title: t("productInvoicing.detail.priceSaved") })
    } catch (error) {
      toast({
        title: t("productInvoicing.detail.priceFailed"),
        description: productInvoiceErrorMessage(error, ""),
        variant: "destructive",
      })
    }
  }

  return (
    <tr className="border-t border-gray-100 align-middle" data-testid={`product-invoice-line-${line.id}`}>
      <td className="py-1.5 pr-2 text-sm">
        <span className="text-sm">{label}</span>
        {line.charge_frequency === "per_case" && (
          <span className="ml-2 text-xs text-gray-500">{t("productInvoicing.frequency.per_case")}</span>
        )}
        {line.frequency_waived && (
          <Badge variant="outline" className="ml-2" data-testid={`product-invoice-line-${line.id}-waived`}>
            {t("productInvoicing.detail.waived")}
          </Badge>
        )}
      </td>
      <td className="py-1.5 px-2 text-right tabular-nums text-sm">{line.quantity ?? 1}</td>
      <td className="py-1.5 px-2 text-right tabular-nums text-sm">
        {editing ? (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="ml-auto h-8 w-24 text-right"
            aria-label={t("productInvoicing.detail.editPrice")}
            data-testid={`product-invoice-line-${line.id}-price-input`}
            autoFocus
          />
        ) : (
          formatMoney(line.price)
        )}
      </td>
      <td className="py-1.5 pl-2 text-right tabular-nums text-sm">{formatMoney(line.total)}</td>
      {showEditColumn && (
        <td className="py-1.5 pl-1 text-right">
          {editable &&
            (editing ? (
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => void save()}
                  disabled={saveState.isLoading}
                  aria-label={t("productInvoicing.common.save")}
                  data-testid={`product-invoice-line-${line.id}-price-save`}
                >
                  {saveState.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditing(false)}
                  disabled={saveState.isLoading}
                  aria-label={t("productInvoicing.common.cancel")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={startEdit}
                aria-label={t("productInvoicing.detail.editPrice")}
                data-testid={`product-invoice-line-${line.id}-edit`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ))}
        </td>
      )}
    </tr>
  )
}
