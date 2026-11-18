"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  CancellationBillingError,
  getCancellationBilling,
  isNotProductModeError,
  saveCancellationBilling,
} from "@/lib/api/cancellation-billing"
import { computeCancellationCharge, formatMoney, toMoney, validateCancellationInput } from "@/lib/product-invoicing"
import type {
  CancellationBillingData,
  CancellationBillingProduct,
  CancellationChoice,
  CancellationDecisionInput,
  PartialType,
} from "@/types/product-invoicing"

interface DecisionDraft {
  choice: CancellationChoice
  partialType: PartialType
  partialValue: string
  notes: string
}

const productKey = (p: Pick<CancellationBillingProduct, "arch" | "product_id">) => `${p.arch}-${p.product_id}`

function draftFromProduct(p: CancellationBillingProduct): DecisionDraft {
  const d = p.decision
  return {
    choice: d?.choice ?? "full",
    partialType: d?.partial_type === "amount" ? "amount" : "percent",
    partialValue: d?.partial_value != null ? String(toMoney(d.partial_value)) : "",
    notes: d?.notes ?? "",
  }
}

interface Props {
  slipId: number | null
  data: CancellationBillingData | null
  onClose: () => void
}

/**
 * RXN-90: after a product-mode case or arch is cancelled, the lab chooses how to bill each cancelled product:
 * Full (completed stages + the stage that was in the lab), Partial (amount or %) or No charge.
 * Completed stages are listed for reference only.
 */
export function CancellationBillingDialog({ slipId, data, onClose }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const products = data?.products ?? []
  const open = slipId != null && products.length > 0

  useEffect(() => {
    const next: Record<string, DecisionDraft> = {}
    for (const p of data?.products ?? []) next[productKey(p)] = draftFromProduct(p)
    setDrafts(next)
    setServerError(null)
  }, [data])

  const update = (key: string, patch: Partial<DecisionDraft>) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const errors = products.map((p) => {
    const d = drafts[productKey(p)]
    if (!d) return null
    return validateCancellationInput({
      choice: d.choice,
      partialType: d.partialType,
      partialValue: d.partialValue,
      fullAmount: p.full_amount,
    })
  })
  const hasErrors = errors.some(Boolean)

  const handleSave = async () => {
    if (slipId == null || hasErrors) return
    const decisions: CancellationDecisionInput[] = products.map((p) => {
      const d = drafts[productKey(p)]
      const decision: CancellationDecisionInput = { arch: p.arch, product_id: p.product_id, choice: d.choice }
      if (d.choice === "partial") {
        decision.partial_type = d.partialType
        decision.partial_value = Number.parseFloat(d.partialValue)
      }
      if (d.notes.trim()) decision.notes = d.notes.trim()
      return decision
    })
    setSaving(true)
    setServerError(null)
    try {
      const result = await saveCancellationBilling(slipId, decisions)
      const invoices = result?.invoices ?? []
      toast({
        title: t("productInvoicing.cancel.savedTitle"),
        description:
          invoices.length > 0
            ? t("productInvoicing.cancel.savedInvoices", { numbers: invoices.map((i) => i.invoice_number).join(", ") })
            : t("productInvoicing.cancel.savedNoInvoice"),
      })
      onClose()
    } catch (error) {
      setServerError(
        error instanceof CancellationBillingError && error.code === "decision_locked"
          ? t("productInvoicing.cancel.locked")
          : error instanceof Error
            ? error.message
            : t("productInvoicing.cancel.saveFailed"),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        data-testid="cancellation-billing-dialog"
      >
        <DialogHeader className="border-b px-4 py-4 sm:px-6 text-left">
          <DialogTitle>{t("productInvoicing.cancel.title")}</DialogTitle>
          <DialogDescription>{t("productInvoicing.cancel.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {products.map((p, index) => {
            const key = productKey(p)
            const d = drafts[key]
            if (!d) return null
            const error = errors[index]
            const charge = computeCancellationCharge({
              choice: d.choice,
              partialType: d.partialType,
              partialValue: d.partialValue,
              fullAmount: p.full_amount,
            })
            return (
              <section key={key} className="rounded-lg border-[1.5px] border-gray-200 p-3 sm:p-4" data-testid={`cancellation-billing-product-${key}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-base">{p.product_name}</p>
                  <span className="text-sm text-gray-600">{t(`productInvoicing.arch.${p.arch}`)}</span>
                </div>

                <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("productInvoicing.cancel.reference")}</p>
                  {p.completed_stages.length === 0 ? (
                    <p className="mt-1 text-sm">{t("productInvoicing.cancel.noCompletedStages")}</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {p.completed_stages.map((s) => (
                        <li key={s.section_id} className="flex justify-between gap-2 text-sm">
                          <span className="text-sm">{s.stage_name || t("productInvoicing.detail.stage")}</span>
                          <span className="tabular-nums text-sm">{formatMoney(s.section_total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.current_stage && (
                    <p className="mt-1 flex justify-between gap-2 text-sm">
                      <span className="text-sm">{t("productInvoicing.cancel.currentStage", { stage: p.current_stage.stage_name ?? "" })}</span>
                      <span className="tabular-nums text-sm">{formatMoney(p.current_stage.estimated_total)}</span>
                    </p>
                  )}
                  <p className="mt-1 flex justify-between gap-2 border-t border-gray-200 pt-1 font-medium text-gray-800 text-sm">
                    <span className="text-sm">{t("productInvoicing.cancel.fullAmount")}</span>
                    <span className="tabular-nums text-sm" data-testid={`cancellation-billing-full-${key}`}>{formatMoney(p.full_amount)}</span>
                  </p>
                </div>

                <RadioGroup
                  value={d.choice}
                  onValueChange={(v) => update(key, { choice: v as CancellationChoice })}
                  className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
                  disabled={saving}
                  aria-label={t("productInvoicing.cancel.choiceLabel")}
                >
                  {(["full", "partial", "none"] as CancellationChoice[]).map((choice) => (
                    <label
                      key={choice}
                      htmlFor={`cancel-${key}-${choice}`}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] px-3 py-2 text-sm transition-colors duration-200 ${
                        d.choice === choice ? "border-[#1162A8] bg-blue-50/40" : "border-gray-200 hover:border-[#1162A8]"
                      }`}
                      data-testid={`cancellation-billing-choice-${key}-${choice}`}
                    >
                      <RadioGroupItem value={choice} id={`cancel-${key}-${choice}`} />
                      {t(`productInvoicing.cancel.choice.${choice}`)}
                    </label>
                  ))}
                </RadioGroup>

                {d.choice === "partial" && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr] sm:items-end">
                    <RadioGroup
                      value={d.partialType}
                      onValueChange={(v) => update(key, { partialType: v as PartialType })}
                      className="flex gap-4"
                      disabled={saving}
                      aria-label={t("productInvoicing.cancel.partialType")}
                    >
                      {(["percent", "amount"] as PartialType[]).map((type) => (
                        <label key={type} htmlFor={`cancel-${key}-type-${type}`} className="flex cursor-pointer items-center gap-2 text-sm">
                          <RadioGroupItem value={type} id={`cancel-${key}-type-${type}`} data-testid={`cancellation-billing-type-${key}-${type}`} />
                          {t(`productInvoicing.cancel.type.${type}`)}
                        </label>
                      ))}
                    </RadioGroup>
                    <div>
                      <Label htmlFor={`cancel-${key}-value`} className="sr-only">
                        {t(`productInvoicing.cancel.type.${d.partialType}`)}
                      </Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          {d.partialType === "amount" ? "$" : "%"}
                        </span>
                        <Input
                          id={`cancel-${key}-value`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={d.partialValue}
                          onChange={(e) => update(key, { partialValue: e.target.value })}
                          className="h-10 pl-7"
                          disabled={saving}
                          data-testid={`cancellation-billing-value-${key}`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && d.choice === "partial" && (
                  <p className="mt-2 text-xs text-[#CF0202]" data-testid={`cancellation-billing-error-${key}`}>
                    {t(`productInvoicing.cancel.errors.${error}`, { max: formatMoney(p.full_amount) })}
                  </p>
                )}

                <Textarea
                  value={d.notes}
                  onChange={(e) => update(key, { notes: e.target.value.slice(0, 1000) })}
                  placeholder={t("productInvoicing.cancel.notesPlaceholder")}
                  className="mt-3 min-h-[60px] text-sm"
                  disabled={saving}
                  aria-label={t("productInvoicing.cancel.notesPlaceholder")}
                />

                <p className="mt-2 flex justify-between text-sm font-semibold" data-testid={`cancellation-billing-charge-${key}`}>
                  <span className="text-sm">{t("productInvoicing.cancel.charge")}</span>
                  <span className="tabular-nums text-sm">{charge == null ? "—" : formatMoney(charge)}</span>
                </p>
              </section>
            )
          })}
          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#CF0202]" data-testid="cancellation-billing-server-error">
              {serverError}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={saving} data-testid="cancellation-billing-later">
            {t("productInvoicing.cancel.decideLater")}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || hasErrors} data-testid="cancellation-billing-save">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("productInvoicing.cancel.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Opens the cancellation billing dialog after a successful cancel when the case is billed per product.
 * Stage-mode cases (422 `not_product_mode`) and APIs without RXN-90 (404) are ignored silently.
 */
export function useCancellationBillingPrompt() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [slipId, setSlipId] = useState<number | null>(null)
  const [data, setData] = useState<CancellationBillingData | null>(null)

  const promptForSlip = useCallback(
    async (id: number) => {
      try {
        const result = await getCancellationBilling(id)
        if (result?.invoicing_mode === "product" && (result.products?.length ?? 0) > 0) {
          setData(result)
          setSlipId(id)
        }
      } catch (error) {
        if (isNotProductModeError(error)) return
        toast({
          title: t("productInvoicing.cancel.loadFailed"),
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        })
      }
    },
    [t, toast],
  )

  const close = useCallback(() => {
    setSlipId(null)
    setData(null)
  }, [])

  const dialog = <CancellationBillingDialog slipId={slipId} data={data} onClose={close} />
  return { promptForSlip, dialog }
}
