"use client"

import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CHARGE_FREQUENCIES } from "@/lib/product-invoicing"
import type { ChargeFrequency } from "@/types/product-invoicing"

interface ChargeFrequencySelectProps {
  value: ChargeFrequency
  onChange: (value: ChargeFrequency) => void
  /** Prefix for ids and test ids, e.g. "addon" or "abutment". */
  idPrefix: string
  disabled?: boolean
}

/** RXN-90: "Charge per case | per stage/slip" for add-ons and abutment types (`charge_frequency`). */
export function ChargeFrequencySelect({ value, onChange, idPrefix, disabled }: ChargeFrequencySelectProps) {
  const { t } = useTranslation()
  const id = `${idPrefix}-charge-frequency`
  return (
    <div className="space-y-1" data-testid={`${idPrefix}-charge-frequency`}>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {t("productInvoicing.frequency.label")}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as ChargeFrequency)} disabled={disabled}>
        <SelectTrigger id={id} className="h-10 w-full" data-testid={`${idPrefix}-charge-frequency-trigger`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHARGE_FREQUENCIES.map((frequency) => (
            <SelectItem key={frequency} value={frequency} data-testid={`${idPrefix}-charge-frequency-${frequency}`}>
              {t(`productInvoicing.frequency.${frequency}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500">{t(`productInvoicing.frequency.${value}Help`)}</p>
    </div>
  )
}
