"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatMoney } from "@/lib/product-invoicing"
import { productInvoiceErrorMessage, useFinalizeArchInvoiceMutation } from "@/lib/redux/api/productInvoiceApi"
import type { ArchType } from "@/types/product-invoicing"

export interface FinalizeArchTarget {
  caseId: number
  caseNumber?: string
  patient?: string
  /** Pre-selected arch (the slip's product type when it is Upper or Lower). */
  arch?: ArchType
}

/**
 * RXN-90 (Q2): lab admin closes an arch that will never reach its releasing stage (e.g. accepted at try-in)
 * and creates its product invoice from the stages accrued so far.
 */
export function FinalizeArchInvoiceDialog({ target, onClose }: { target: FinalizeArchTarget | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [arch, setArch] = useState<ArchType>("Upper")
  const [error, setError] = useState<string | null>(null)
  const [finalize, state] = useFinalizeArchInvoiceMutation()

  useEffect(() => {
    setArch(target?.arch ?? "Upper")
    setError(null)
  }, [target])

  const handleSubmit = async () => {
    if (!target) return
    setError(null)
    try {
      const res = await finalize({ case_id: target.caseId, arch }).unwrap()
      toast({
        title: t("productInvoicing.finalize.done"),
        description: res?.data
          ? t("productInvoicing.finalize.doneInvoice", { number: res.data.invoice_number, total: formatMoney(res.data.total_amount) })
          : undefined,
      })
      onClose()
    } catch (err) {
      setError(productInvoiceErrorMessage(err, t("productInvoicing.finalize.failed")))
    }
  }

  return (
    <Dialog open={target != null} onOpenChange={(next) => !next && !state.isLoading && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md" data-testid="finalize-arch-invoice-dialog">
        <DialogHeader className="text-left">
          <DialogTitle>{t("productInvoicing.finalize.title")}</DialogTitle>
          <DialogDescription>{t("productInvoicing.finalize.body")}</DialogDescription>
        </DialogHeader>
        {target && (
          <p className="text-sm text-gray-700">
            {[target.caseNumber ?? target.caseId, target.patient].filter(Boolean).join(" · ")}
          </p>
        )}
        <RadioGroup
          value={arch}
          onValueChange={(v) => setArch(v as ArchType)}
          className="flex gap-6"
          aria-label={t("productInvoicing.list.arch")}
          disabled={state.isLoading}
        >
          {(["Upper", "Lower"] as ArchType[]).map((value) => (
            <label key={value} htmlFor={`finalize-arch-${value}`} className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value={value} id={`finalize-arch-${value}`} data-testid={`finalize-arch-invoice-${value}`} />
              {t(`productInvoicing.arch.${value}`)}
            </label>
          ))}
        </RadioGroup>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#CF0202]" data-testid="finalize-arch-invoice-error">
            {error}
          </p>
        )}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={state.isLoading}>
            {t("productInvoicing.common.cancel")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={state.isLoading} data-testid="finalize-arch-invoice-submit">
            {state.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("productInvoicing.finalize.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
