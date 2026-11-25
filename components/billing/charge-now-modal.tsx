"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { chargeNow } from "@/lib/api/product-invoice-charge-now"
import { apiErrorMessage, formatMoney } from "@/lib/product-invoicing"
import {
  buildChargeNowPayload,
  chargeNowBasePrice,
  chargeNowStagePrices,
  chargeNowStagePrompts,
  chargeNowTotal,
  hasInvalidStageInput,
  parseMoneyInput,
  type ChargeNowArchCandidate,
  type ChargeNowLibraryProduct,
} from "@/lib/charge-now"
import type { ArchType, ProductInvoice } from "@/types/product-invoicing"

export interface ChargeNowModalProps {
  open: boolean
  slipId: number
  /** Lab id for the library price lookup (`customer_id`). */
  labId: number | null
  /** Chargeable arches of this slip (see `chargeNowCandidates`). */
  candidates: ChargeNowArchCandidate[]
  onClose: () => void
  /** Called after a 201 so the page can reload the slip and its invoice state. */
  onCharged?: (invoice: ProductInvoice) => void
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { body?: unknown; message?: unknown } | null
  if (e?.body) {
    const message = apiErrorMessage(e.body, "")
    if (message) return message
  }
  return typeof e?.message === "string" && e.message ? e.message : fallback
}

/**
 * RXN-127: lab admin charges an abandoned multi-stage arch now, at the library price plus add-ons, with prices for
 * $0/unset stages and a final total the user may override. The backend marks the arch finished.
 */
export function ChargeNowModal({ open, slipId, labId, candidates, onClose, onCharged }: ChargeNowModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { fetchProductDetails } = useSlipCreation()
  const [arch, setArch] = useState<ArchType | null>(null)
  const [library, setLibrary] = useState<ChargeNowLibraryProduct | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [stageInputs, setStageInputs] = useState<Record<number, string>>({})
  const [totalOverride, setTotalOverride] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidate = candidates.find((c) => c.arch === arch) ?? candidates[0] ?? null

  useEffect(() => {
    if (!open) return
    setArch(candidates[0]?.arch ?? null)
    setError(null)
    // Only reset when the modal opens; candidates change identity on every slip reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setStageInputs({})
    setTotalOverride(null)
    setError(null)
    setLibrary(null)
    if (!open || !candidate?.productId) return
    let cancelled = false
    setLibraryLoading(true)
    Promise.resolve(fetchProductDetails(candidate.productId, labId ?? undefined))
      .then((data) => {
        if (!cancelled) setLibrary((data as ChargeNowLibraryProduct | null) ?? null)
      })
      .catch(() => {
        // No library details: fall back to the slip's product price; the total stays editable.
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, candidate?.arch, candidate?.productId, labId, fetchProductDetails])

  const basePrice = candidate ? chargeNowBasePrice(candidate, library) : 0
  const stagePrompts = useMemo(
    () => (candidate ? chargeNowStagePrompts(candidate, library) : []),
    [candidate, library],
  )
  const stagePrices = chargeNowStagePrices(stageInputs)
  const calculatedTotal = candidate ? chargeNowTotal(basePrice, candidate.addons, stagePrices) : 0
  const totalText = totalOverride ?? calculatedTotal.toFixed(2)
  const totalValue = parseMoneyInput(totalText)
  const totalInvalid = totalValue == null || Number.isNaN(totalValue)
  const stagesInvalid = hasInvalidStageInput(stageInputs)
  const canSubmit = Boolean(candidate) && !submitting && !libraryLoading && !totalInvalid && !stagesInvalid

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!candidate || totalInvalid || stagesInvalid || totalValue == null) return
    setSubmitting(true)
    setError(null)
    try {
      const invoice = await chargeNow(
        buildChargeNowPayload({ slipId, arch: candidate.arch, amount: totalValue, stagePrices }),
      )
      toast({
        title: t("productInvoicing.chargeNow.done"),
        description: invoice?.invoice_number
          ? t("productInvoicing.chargeNow.doneInvoice", {
              number: invoice.invoice_number,
              total: formatMoney(invoice.total_amount),
            })
          : undefined,
      })
      onCharged?.(invoice)
      onClose()
    } catch (err) {
      setError(errorMessage(err, t("productInvoicing.chargeNow.failed")))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto"
        data-testid="charge-now-modal"
      >
        <DialogHeader className="text-left">
          <DialogTitle>{t("productInvoicing.chargeNow.title")}</DialogTitle>
          <DialogDescription data-testid="charge-now-product">
            {candidate
              ? [candidate.productName, candidate.gradeName].filter(Boolean).join(" · ")
              : t("productInvoicing.chargeNow.nothingToCharge")}
          </DialogDescription>
        </DialogHeader>

        {candidates.length > 1 && (
          <RadioGroup
            value={candidate?.arch ?? ""}
            onValueChange={(v) => setArch(v as ArchType)}
            className="flex gap-6"
            aria-label={t("productInvoicing.list.arch")}
            disabled={submitting}
          >
            {candidates.map((c) => (
              <label key={c.arch} htmlFor={`charge-now-arch-${c.arch}`} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={c.arch} id={`charge-now-arch-${c.arch}`} data-testid={`charge-now-arch-${c.arch}`} />
                {t(`productInvoicing.arch.${c.arch}`)}
              </label>
            ))}
          </RadioGroup>
        )}

        {candidate && (
          <div className="space-y-4">
            <table className="w-full text-sm" data-testid="charge-now-lines">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-gray-500">
                  <th className="py-1 font-medium">{t("productInvoicing.chargeNow.item")}</th>
                  <th className="py-1 text-right font-medium">{t("productInvoicing.chargeNow.price")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b" data-testid="charge-now-line-base">
                  <td className="py-2 pr-2">
                    {[candidate.productName, candidate.gradeName].filter(Boolean).join(" · ")}
                    {libraryLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-gray-400" />}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(basePrice)}</td>
                </tr>
                {candidate.addons.map((addon, index) => (
                  <tr key={`${addon.name}-${index}`} className="border-b" data-testid="charge-now-line-addon">
                    <td className="py-2 pr-2">
                      {addon.quantity > 1 ? `${addon.quantity}x ` : ""}
                      {addon.name}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(addon.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {stagePrompts.length > 0 && (
              <div className="space-y-3" data-testid="charge-now-stage-prices">
                {stagePrompts.map((stage) => {
                  const raw = stageInputs[stage.stageId] ?? ""
                  const invalid = Number.isNaN(parseMoneyInput(raw))
                  const id = `charge-now-stage-${stage.stageId}`
                  return (
                    <div key={stage.stageId} className="flex items-center justify-between gap-3">
                      <Label htmlFor={id} className="text-sm font-normal text-gray-700">
                        {t("productInvoicing.chargeNow.stagePrice", { stage: stage.stageName })}
                      </Label>
                      <Input
                        id={id}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={raw}
                        onChange={(e) => setStageInputs((prev) => ({ ...prev, [stage.stageId]: e.target.value }))}
                        disabled={submitting}
                        aria-invalid={invalid || undefined}
                        className="w-28 text-right tabular-nums"
                        data-testid={id}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <Label htmlFor="charge-now-total" className="text-sm font-semibold">
                {t("productInvoicing.chargeNow.total")}
              </Label>
              <div className="flex items-center gap-2">
                {totalOverride != null && (
                  <button
                    type="button"
                    className="text-xs text-[#1162A8] underline"
                    onClick={() => setTotalOverride(null)}
                    disabled={submitting}
                    data-testid="charge-now-total-reset"
                  >
                    {t("productInvoicing.chargeNow.resetTotal", { total: formatMoney(calculatedTotal) })}
                  </button>
                )}
                <Input
                  id="charge-now-total"
                  inputMode="decimal"
                  value={totalText}
                  onChange={(e) => setTotalOverride(e.target.value)}
                  disabled={submitting}
                  aria-invalid={totalInvalid || undefined}
                  className="w-32 text-right font-semibold tabular-nums"
                  data-testid="charge-now-total"
                />
              </div>
            </div>
            {(totalInvalid || stagesInvalid) && (
              <p className="text-xs text-[#CF0202]">{t("productInvoicing.chargeNow.invalidAmount")}</p>
            )}

            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              data-testid="charge-now-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{t("productInvoicing.chargeNow.warning")}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#CF0202]" data-testid="charge-now-error">
            {error}
          </p>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} disabled={submitting} data-testid="charge-now-cancel">
            {t("productInvoicing.common.cancel")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit} data-testid="charge-now-submit">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("productInvoicing.chargeNow.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
