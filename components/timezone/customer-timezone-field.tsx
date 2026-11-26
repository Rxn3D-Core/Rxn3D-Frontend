"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/auth-context"
import { useBetaFeature } from "@/hooks/use-beta-feature"
import { useToast } from "@/hooks/use-toast"
import { BETA_FEATURE_KEYS } from "@/lib/api/beta-features"
import { matchesTimeZoneSearch, normalizeTimeZone, timeZoneChoices, timeZoneLabel } from "@/lib/timezone"
import { cn } from "@/lib/utils"
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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => setValue(stored), [stored])
  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  // Common zones first, then every zone the backend accepts; search covers both lists.
  const choices = useMemo(() => timeZoneChoices(value), [value])
  const filtered = useMemo(() => choices.filter((c) => matchesTimeZoneSearch(c, query)), [choices, query])
  const common = filtered.filter((c) => c.common)
  const others = filtered.filter((c) => !c.common)

  const handleChange = async (next: string) => {
    setOpen(false)
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
        <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              aria-label={t("timezone.label", "Time zone")}
              disabled={disabled}
              data-testid="customer-timezone-select"
              className={cn(
                "flex h-9 w-full max-w-sm items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-medium text-gray-900",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{timeZoneLabel(value)}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
            align="start"
            onWheel={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("timezone.search", "Search time zones")}
                value={query}
                onValueChange={setQuery}
                data-testid="customer-timezone-search"
              />
              <CommandList className="max-h-[300px] overflow-y-auto overscroll-contain">
                <CommandEmpty>{t("timezone.noResults", "No time zone found.")}</CommandEmpty>
                {[
                  { key: "common", heading: t("timezone.common", "Common time zones"), items: common },
                  { key: "all", heading: t("timezone.all", "All time zones"), items: others },
                ].map((group) =>
                  group.items.length ? (
                    <CommandGroup key={group.key} heading={group.heading}>
                      {group.items.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => handleChange(option.value)}
                          data-testid={`customer-timezone-option-${option.value}`}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                            aria-hidden
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null,
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {!canChoose && (
          <span className="text-xs text-gray-500" data-testid="customer-timezone-coming-soon">
            {t("timezone.comingSoon", "Timezone selection is coming soon")}
          </span>
        )}
      </div>
    </div>
  )
}
