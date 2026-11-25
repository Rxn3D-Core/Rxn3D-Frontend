"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { useBetaFeature } from "@/hooks/use-beta-feature"
import { useToast } from "@/hooks/use-toast"
import { BETA_FEATURE_KEYS } from "@/lib/api/beta-features"
import { TIME_ZONE_OPTIONS, normalizeTimeZone, timeZoneLabel } from "@/lib/timezone"
import { updateCustomerTimezone } from "@/services/customer-timezone-service"

interface CustomerTimezoneFieldProps {
  /** Lab or office whose zone is shown. */
  customerId: number | null
  /** Its stored IANA zone; missing means America/Los_Angeles. */
  timezone?: string | null
  onSaved?: (timezone: string) => void
}

/**
 * The lab's or office's own time zone with a dropdown (RXN-123). The dropdown stays disabled
 * until the user has the `customer_timezone` beta key; the backend enforces the same gate.
 */
export function CustomerTimezoneField({ customerId, timezone, onSaved }: CustomerTimezoneFieldProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user, updateSessionUser } = useAuth()
  const canChoose = useBetaFeature(BETA_FEATURE_KEYS.customerTimezone)
  const stored = normalizeTimeZone(timezone)
  const [value, setValue] = useState(stored)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => setValue(stored), [stored])

  // Keep a stored zone outside the curated list selectable and visible.
  const options = TIME_ZONE_OPTIONS.some((o) => o.value === value)
    ? TIME_ZONE_OPTIONS
    : [{ value, label: timeZoneLabel(value) }, ...TIME_ZONE_OPTIONS]

  const handleChange = async (next: string) => {
    if (!customerId || next === value) return
    const previous = value
    setValue(next)
    setIsSaving(true)
    try {
      const saved = normalizeTimeZone(await updateCustomerTimezone(customerId, next))
      setValue(saved)
      // The viewer's zone comes from the login customers[]; keep it in step without a new login.
      if (user?.customers?.some((c) => c.id === customerId)) {
        updateSessionUser({
          customers: user.customers.map((c) => (c.id === customerId ? { ...c, timezone: saved } : c)),
        })
      }
      toast({ title: t("timezone.savedTitle", "Time zone updated"), description: timeZoneLabel(saved) })
      onSaved?.(saved)
    } catch (error: unknown) {
      setValue(previous)
      toast({
        title: t("timezone.saveFailed", "Could not update the time zone"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const disabled = !canChoose || !customerId || isSaving

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="customer-timezone-field">
      <span className="text-gray-500 w-24 shrink-0">{t("timezone.label", "Time zone")}:</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Select value={value} onValueChange={handleChange} disabled={disabled}>
          <SelectTrigger
            className="h-9 w-full max-w-sm font-medium text-gray-900"
            aria-label={t("timezone.label", "Time zone")}
            data-testid="customer-timezone-select"
          >
            <SelectValue>{timeZoneLabel(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} data-testid={`customer-timezone-option-${option.value}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!canChoose && (
          <span className="text-xs text-gray-500" data-testid="customer-timezone-coming-soon">
            {t("timezone.comingSoon", "Timezone selection is coming soon")}
          </span>
        )}
      </div>
    </div>
  )
}
