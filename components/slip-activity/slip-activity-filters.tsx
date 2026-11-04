"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronsUpDown, Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  normalizeSlipActivitySearch,
  SLIP_ACTIVITY_SEARCH_MAX_LENGTH,
  validateSlipActivityRange,
} from "@/lib/slip-activity/query-params"
import type { SlipActivityFilters, SlipActivityStatus } from "@/types/slip-activity"

/** Wait this long after the last keystroke before the search is applied. */
const SEARCH_DEBOUNCE_MS = 400

type AppliedFilters = Pick<SlipActivityFilters, "fromDate" | "toDate" | "locationIds" | "officeIds" | "search">

interface SlipActivityFiltersProps {
  value: SlipActivityFilters
  statuses: SlipActivityStatus[]
  statusesLoading: boolean
  /** Connected offices for the Office filter (RXN-46). */
  offices: Array<{ id: number; name: string }>
  officesLoading: boolean
  onApply: (next: AppliedFilters) => void
}

const controlClass =
  "h-8 rounded-md border border-[#e5e7eb] bg-white px-2 text-[13px] text-gray-900 shadow-none focus-visible:border-[#9ca3af] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9ca3af]"

/** Filters apply as soon as they change (RXN-46): no Apply button. Search waits briefly after typing. */
export function SlipActivityFiltersBar({ value, statuses, statusesLoading, offices, officesLoading, onApply }: SlipActivityFiltersProps) {
  const { t } = useTranslation()
  // Dates are drafts only so a half-typed or invalid range is shown, not sent.
  const [fromDate, setFromDate] = useState(value.fromDate)
  const [toDate, setToDate] = useState(value.toDate)
  const [search, setSearch] = useState(value.search)
  const [open, setOpen] = useState(false)
  const [officeOpen, setOfficeOpen] = useState(false)
  const [officeQuery, setOfficeQuery] = useState("")
  const latest = useRef(value)
  latest.current = value

  useEffect(() => {
    setFromDate(value.fromDate)
    setToDate(value.toDate)
    setSearch(value.search)
  }, [value.fromDate, value.toDate, value.search])

  const apply = (patch: Partial<AppliedFilters>) => {
    const v = latest.current
    onApply({ fromDate: v.fromDate, toDate: v.toDate, locationIds: v.locationIds, officeIds: v.officeIds, search: v.search, ...patch })
  }

  // Debounced search.
  useEffect(() => {
    const next = normalizeSlipActivitySearch(search)
    if (next === latest.current.search) return
    const timer = setTimeout(() => apply({ search: next }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const rangeError = validateSlipActivityRange(fromDate, toDate)
  const rangeMessage =
    rangeError === "fromAfterTo"
      ? t("slipActivity.filters.errorFromAfterTo", "The start date must be on or before the end date.")
      : rangeError === "rangeTooLong"
        ? t("slipActivity.filters.errorRangeTooLong", "Choose a range of 365 days or less.")
        : rangeError === "invalidDate"
          ? t("slipActivity.filters.errorInvalidDate", "Enter a valid start and end date.")
          : undefined

  const changeDates = (from: string, to: string) => {
    setFromDate(from)
    setToDate(to)
    if (!validateSlipActivityRange(from, to)) apply({ fromDate: from, toDate: to })
  }

  const toggle = (id: number, checked: boolean) => {
    const ids = latest.current.locationIds
    apply({ locationIds: checked ? [...new Set([...ids, id])] : ids.filter((x) => x !== id) })
  }

  const toggleOffice = (id: number, checked: boolean) => {
    const ids = latest.current.officeIds
    apply({ officeIds: checked ? [...new Set([...ids, id])] : ids.filter((x) => x !== id) })
  }

  const selectedOfficeNames = offices.filter((o) => value.officeIds.includes(o.id)).map((o) => o.name)
  const officeLabel = !value.officeIds.length
    ? t("slipActivity.filters.allOffices", "All offices")
    : selectedOfficeNames.length === 1
      ? selectedOfficeNames[0]
      : t("slipActivity.filters.officesSelected", "{{count}} offices selected", { count: value.officeIds.length })
  const visibleOffices = offices.filter((o) => o.name.toLowerCase().includes(officeQuery.trim().toLowerCase()))

  const selectedNames = statuses.filter((s) => value.locationIds.includes(s.id)).map((s) => s.name)
  const statusLabel = !selectedNames.length
    ? t("slipActivity.filters.allStatuses", "All statuses")
    : selectedNames.length === 1
      ? selectedNames[0]
      : t("slipActivity.filters.statusesSelected", "{{count}} statuses selected", { count: selectedNames.length })

  return (
    <div
      data-testid="slip-activity-filters"
      role="search"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2"
    >
      <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" aria-hidden="true" />
        <Input
          id="slip-activity-search"
          data-testid="slip-activity-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label={t("slipActivity.filters.search", "Search")}
          placeholder={t("slipActivity.filters.searchPlaceholder", "Search slip, patient, office or user")}
          value={search}
          maxLength={SLIP_ACTIVITY_SEARCH_MAX_LENGTH}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply({ search: normalizeSlipActivitySearch(search) })
          }}
          showValidIcon={false}
          className={`${controlClass} pl-9 pr-8 placeholder:text-[#9ca3af] [&::-webkit-search-cancel-button]:appearance-none`}
        />
        {search && (
          <button
            type="button"
            data-testid="slip-activity-search-clear"
            aria-label={t("slipActivity.filters.clearSearch", "Clear search")}
            title={t("slipActivity.filters.clearSearch", "Clear search")}
            onClick={() => {
              setSearch("")
              apply({ search: "" })
              document.getElementById("slip-activity-search")?.focus()
            }}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca3af]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

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
            className={`${controlClass} w-48 justify-between font-normal`}
          >
            <span className="truncate">
              {statusesLoading ? t("slipActivity.filters.loadingStatuses", "Loading statuses...") : statusLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
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
                      checked={value.locationIds.includes(status.id)}
                      onCheckedChange={(checked) => toggle(status.id, checked === true)}
                    />
                    <span>{status.name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          {value.locationIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              data-testid="slip-activity-status-clear"
              onClick={() => apply({ locationIds: [] })}
            >
              {t("slipActivity.filters.clearStatuses", "Clear statuses")}
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <Popover open={officeOpen} onOpenChange={(next) => { setOfficeOpen(next); if (!next) setOfficeQuery("") }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={officeOpen}
            aria-label={t("slipActivity.filters.office", "Office")}
            data-testid="slip-activity-office-select"
            disabled={officesLoading}
            className={`${controlClass} w-48 justify-between font-normal`}
          >
            <span className="truncate">
              {officesLoading ? t("slipActivity.filters.loadingOffices", "Loading offices...") : officeLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-2">
          <Input
            data-testid="slip-activity-office-search"
            type="search"
            autoComplete="off"
            aria-label={t("slipActivity.filters.searchOffices", "Search offices")}
            placeholder={t("slipActivity.filters.searchOffices", "Search offices")}
            value={officeQuery}
            onChange={(e) => setOfficeQuery(e.target.value)}
            showValidIcon={false}
            className={`${controlClass} mb-1 w-full`}
          />
          <ul className="max-h-72 overflow-auto" data-testid="slip-activity-office-options">
            {visibleOffices.map((office) => {
              const id = `slip-activity-office-${office.id}`
              return (
                <li key={office.id}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50">
                    <Checkbox
                      id={id}
                      data-testid="slip-activity-office-option"
                      checked={value.officeIds.includes(office.id)}
                      onCheckedChange={(checked) => toggleOffice(office.id, checked === true)}
                    />
                    <span>{office.name}</span>
                  </label>
                </li>
              )
            })}
            {!visibleOffices.length && (
              <li className="px-2 py-2 text-sm text-gray-500">{t("slipActivity.filters.noOffices", "No offices found")}</li>
            )}
          </ul>
          {value.officeIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              data-testid="slip-activity-office-clear"
              onClick={() => apply({ officeIds: [] })}
            >
              {t("slipActivity.filters.clearOffices", "Clear offices")}
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <label className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
        {t("slipActivity.filters.from", "From")}
        <input
          id="slip-activity-date-from"
          data-testid="slip-activity-date-from"
          type="date"
          value={fromDate}
          max={toDate || undefined}
          aria-invalid={rangeError ? true : undefined}
          onChange={(e) => changeDates(e.target.value, toDate)}
          className={`${controlClass} ${rangeError ? "border-[#CF0202]" : ""}`}
        />
      </label>
      <label className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
        {t("slipActivity.filters.to", "To")}
        <input
          id="slip-activity-date-to"
          data-testid="slip-activity-date-to"
          type="date"
          value={toDate}
          min={fromDate || undefined}
          aria-invalid={rangeError ? true : undefined}
          onChange={(e) => changeDates(fromDate, e.target.value)}
          className={`${controlClass} ${rangeError ? "border-[#CF0202]" : ""}`}
        />
      </label>

      {rangeMessage && (
        <p role="alert" data-testid="slip-activity-range-error" className="w-full text-sm text-[#CF0202]">
          {rangeMessage}
        </p>
      )}
    </div>
  )
}
