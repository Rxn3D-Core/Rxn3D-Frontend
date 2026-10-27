"use client"

import { useEffect, useState } from "react"
import { ChevronsUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { validateSlipActivityRange } from "@/lib/slip-activity/query-params"
import type { SlipActivityFilters, SlipActivityStatus } from "@/types/slip-activity"

interface SlipActivityFiltersProps {
  value: SlipActivityFilters
  statuses: SlipActivityStatus[]
  statusesLoading: boolean
  onApply: (next: Pick<SlipActivityFilters, "fromDate" | "toDate" | "locationIds">) => void
}

export function SlipActivityFiltersBar({ value, statuses, statusesLoading, onApply }: SlipActivityFiltersProps) {
  const { t } = useTranslation()
  const [fromDate, setFromDate] = useState(value.fromDate)
  const [toDate, setToDate] = useState(value.toDate)
  const [locationIds, setLocationIds] = useState<number[]>(value.locationIds)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setFromDate(value.fromDate)
    setToDate(value.toDate)
    setLocationIds(value.locationIds)
  }, [value.fromDate, value.toDate, value.locationIds])

  const rangeError = validateSlipActivityRange(fromDate, toDate)
  const rangeMessage =
    rangeError === "fromAfterTo"
      ? t("slipActivity.filters.errorFromAfterTo", "The start date must be on or before the end date.")
      : rangeError === "rangeTooLong"
        ? t("slipActivity.filters.errorRangeTooLong", "Choose a range of 365 days or less.")
        : rangeError === "invalidDate"
          ? t("slipActivity.filters.errorInvalidDate", "Enter a valid start and end date.")
          : undefined

  const toggle = (id: number, checked: boolean) =>
    setLocationIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))

  const selectedNames = statuses.filter((s) => locationIds.includes(s.id)).map((s) => s.name)
  const statusLabel = !selectedNames.length
    ? t("slipActivity.filters.allStatuses", "All statuses")
    : selectedNames.length === 1
      ? selectedNames[0]
      : t("slipActivity.filters.statusesSelected", "{{count}} statuses selected", { count: selectedNames.length })

  return (
    <form
      data-testid="slip-activity-filters"
      className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start"
      onSubmit={(e) => {
        e.preventDefault()
        if (rangeError) return
        onApply({ fromDate, toDate, locationIds })
      }}
    >
      <div className="md:w-44">
        <Input
          id="slip-activity-date-from"
          data-testid="slip-activity-date-from"
          type="date"
          label={t("slipActivity.filters.from", "From")}
          value={fromDate}
          max={toDate || undefined}
          onChange={(e) => setFromDate(e.target.value)}
          validationState={rangeError ? "error" : "default"}
          showValidIcon={false}
        />
      </div>
      <div className="md:w-44">
        <Input
          id="slip-activity-date-to"
          data-testid="slip-activity-date-to"
          type="date"
          label={t("slipActivity.filters.to", "To")}
          value={toDate}
          min={fromDate || undefined}
          onChange={(e) => setToDate(e.target.value)}
          validationState={rangeError ? "error" : "default"}
          showValidIcon={false}
        />
      </div>
      <div className="md:w-64">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={t("slipActivity.filters.status", "Status")}
              data-testid="slip-activity-status-select"
              disabled={statusesLoading}
              className="h-10 w-full justify-between rounded-lg border-[1.5px] border-[#E0E0E0] bg-white px-4 font-normal"
            >
              <span className="truncate">
                {statusesLoading ? t("slipActivity.filters.loadingStatuses", "Loading statuses...") : statusLabel}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-2">
            <ul className="max-h-72 overflow-auto" data-testid="slip-activity-status-options">
              {statuses.map((status) => {
                const id = `slip-activity-status-${status.id}`
                return (
                  <li key={status.id}>
                    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50">
                      <Checkbox
                        id={id}
                        data-testid="slip-activity-status-option"
                        checked={locationIds.includes(status.id)}
                        onCheckedChange={(checked) => toggle(status.id, checked === true)}
                      />
                      <span>{status.name}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            {locationIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 w-full"
                data-testid="slip-activity-status-clear"
                onClick={() => setLocationIds([])}
              >
                {t("slipActivity.filters.clearStatuses", "Clear statuses")}
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <Button
        type="submit"
        data-testid="slip-activity-apply"
        disabled={!!rangeError}
        className="h-10 bg-[#1162A8] hover:bg-[#0f5594] disabled:opacity-40"
      >
        {t("slipActivity.filters.apply", "Apply")}
      </Button>
      {rangeMessage && (
        <p role="alert" data-testid="slip-activity-range-error" className="w-full text-sm text-[#CF0202]">
          {rangeMessage}
        </p>
      )}
    </form>
  )
}
