"use client"

import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { SlipListingVsIcon } from "@/components/slip-listing/SlipListingVsIcon"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SLIP_ACTIVITY_PER_PAGE_OPTIONS } from "@/lib/slip-activity/query-params"
import { toSlipActivityRow } from "@/lib/slip-activity/rows"
import { slipActivityAriaSort } from "@/lib/slip-activity/sort"
import { formatSlipActivityCompactDateTime, formatSlipActivityDateTime } from "@/lib/slip-activity/time-zone"
import type {
  SlipActivityEvent,
  SlipActivityPagination,
  SlipActivitySort,
  SlipActivitySortColumn,
} from "@/types/slip-activity"

interface SlipActivityTableProps {
  events: SlipActivityEvent[]
  pagination: SlipActivityPagination | undefined
  isFetching: boolean
  onPageChange: (page: number) => void
  perPage: number
  onPerPageChange: (perPage: number) => void
  sort: SlipActivitySort
  onSortChange: (column: SlipActivitySortColumn) => void
  /** Applied search, shown in the empty state. */
  search?: string
}

export function SlipActivityTable({
  events,
  pagination,
  isFetching,
  onPageChange,
  perPage,
  onPerPageChange,
  sort,
  onSortChange,
  search = "",
}: SlipActivityTableProps) {
  const { t, i18n } = useTranslation()
  const rows = events.map(toSlipActivityRow)

  if (!rows.length) {
    return (
      <div
        data-testid="slip-activity-empty"
        className="rounded-lg border-[1.5px] border-dashed border-[#E0E0E0] bg-white p-8 text-center text-sm text-gray-600"
      >
        {search
          ? t("slipActivity.emptySearch", "No status changes match \"{{search}}\" with these filters.", { search })
          : t("slipActivity.empty", "No status changes match these filters.")}
      </div>
    )
  }

  const page = pagination?.current_page ?? 1
  const lastPage = pagination?.last_page ?? 1

  const sortableHead = (column: SlipActivitySortColumn, label: string) => {
    const ariaSort = slipActivityAriaSort(sort, column)
    const hint =
      ariaSort === "ascending"
        ? t("slipActivity.table.sort.ascending", "Sorted by {{column}}, ascending. Select to sort descending.", { column: label })
        : ariaSort === "descending"
          ? t("slipActivity.table.sort.descending", "Sorted by {{column}}, descending. Select to sort ascending.", { column: label })
          : t("slipActivity.table.sort.none", "Sort by {{column}}", { column: label })
    const Icon = ariaSort === "ascending" ? ArrowUp : ariaSort === "descending" ? ArrowDown : ArrowUpDown
    return (
      <TableHead aria-sort={ariaSort} data-testid={`slip-activity-head-${column}`} className="whitespace-nowrap">
        <button
          type="button"
          data-testid={`slip-activity-sort-${column}`}
          title={hint}
          onClick={() => onSortChange(column)}
          className={`-mx-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 font-medium hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8] focus-visible:ring-offset-1 ${
            ariaSort === "none" ? "" : "text-gray-900"
          }`}
        >
          <span>{label}</span>
          <Icon
            className={`h-4 w-4 shrink-0 ${ariaSort === "none" ? "text-gray-300" : "text-[#1162A8]"}`}
            aria-hidden="true"
            data-testid={`slip-activity-sort-icon-${ariaSort}`}
          />
        </button>
      </TableHead>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border-[1.5px] border-[#E0E0E0] bg-white" aria-busy={isFetching}>
        <TooltipProvider delayDuration={0}>
        <Table data-testid="slip-activity-table" className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              {sortableHead("action_at", t("slipActivity.table.timestamp", "Timestamp"))}
              {sortableHead("office_name", t("slipActivity.table.office", "Office"))}
              {sortableHead("slip_number", t("slipActivity.table.slip", "Slip"))}
              {sortableHead("patient_name", t("slipActivity.table.patient", "Patient"))}
              <TableHead
                data-testid="slip-activity-head-digital_impression"
                aria-label={t("slipActivity.table.digitalImpression", "Digital impression")}
                className="w-[90px] text-center"
              >
                <InstantTip label={t("slipActivity.table.digitalImpression", "Digital impression")}>
                  <span className="inline-block">
                    <SlipListingVsIcon src="/icons/virtual-slip-center/attachments.svg" hover={false} className="mx-auto h-[25px] w-[25px]" />
                  </span>
                </InstantTip>
              </TableHead>
              {sortableHead("user_name", t("slipActivity.table.user", "User"))}
              {sortableHead("status", t("slipActivity.table.statusChange", "From -> To"))}
              {sortableHead("slip_created_at", t("slipActivity.table.slipCreated", "Slip created"))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              return (
                <TableRow key={row.id} data-testid="slip-activity-row">
                  <TableCell className="whitespace-nowrap">
                    <InstantTip label={formatSlipActivityDateTime(row.actionAt, i18n.language)}>
                      <time dateTime={row.actionAt}>{formatSlipActivityCompactDateTime(row.actionAt)}</time>
                    </InstantTip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid="slip-activity-office">
                    {row.officeCode && row.officeName && row.officeCode !== row.officeName ? (
                      <InstantTip label={row.officeName}>{row.officeCode}</InstantTip>
                    ) : (
                      row.officeCode || row.officeName
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={row.slipHref}
                      data-testid="slip-activity-slip-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#1162A8] underline-offset-2 hover:underline"
                    >
                      {row.slipNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-[120px]" data-testid="slip-activity-patient">
                    {row.patientName ? (
                      <Link
                        href={row.slipHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="slip-activity-patient-link"
                        className="text-[#1162A8] underline-offset-2 hover:underline"
                      >
                        {row.patientName}
                      </Link>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center" data-testid="slip-activity-digital-impression">
                    <div className="flex flex-col items-center gap-0.5">
                      {row.digitalImpressionTags.map((tag, i) => (
                        <InstantTip key={`${tag}-${i}`} label={row.digitalImpressionNames[i] ?? tag}>
                          <span className="text-sm font-medium leading-[18px] text-[#1162A8]">{tag}</span>
                        </InstantTip>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid="slip-activity-user">{row.userName}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span>{row.fromStatus}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-label={t("slipActivity.table.to", "to")} />
                      <span>{row.toStatus}</span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid="slip-activity-slip-created">
                    {row.slipCreatedAt ? (
                      <InstantTip label={formatSlipActivityDateTime(row.slipCreatedAt, i18n.language)}>
                        <time dateTime={row.slipCreatedAt}>{formatSlipActivityCompactDateTime(row.slipCreatedAt)}</time>
                      </InstantTip>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </TooltipProvider>
      </div>
      {pagination && (
        <div
          data-testid="slip-activity-pagination"
          className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#77736b]">{t("slipActivity.pagination.show", "Show")}</span>
              <Select value={String(perPage)} onValueChange={(value) => onPerPageChange(Number.parseInt(value))} disabled={isFetching}>
                <SelectTrigger data-testid="slip-activity-per-page" className="h-9 w-20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLIP_ACTIVITY_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-[#77736b]">{t("slipActivity.pagination.entries", "entries")}</span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span data-testid="slip-activity-pagination-summary" className="whitespace-nowrap text-[11px] text-[#77736b]">
                {pagination.from ?? 0}–{pagination.to ?? 0} {t("slipActivity.pagination.of", "of")} {pagination.total}
              </span>
              <nav aria-label={t("slipActivity.pagination.label", "Pagination")} className="flex items-center gap-1">
                <PageButton
                  testId="slip-activity-prev"
                  disabled={page <= 1 || isFetching}
                  label={t("slipActivity.pagination.previous", "Previous")}
                  onClick={() => onPageChange(page - 1)}
                >
                  ‹
                </PageButton>
                {slipActivityPageNumbers(page, lastPage).map((n) => (
                  <PageButton
                    key={n}
                    active={n === page}
                    disabled={isFetching}
                    label={t("slipActivity.pagination.goToPage", "Page {{page}}", { page: n })}
                    onClick={() => onPageChange(n)}
                  >
                    {n}
                  </PageButton>
                ))}
                <PageButton
                  testId="slip-activity-next"
                  disabled={page >= lastPage || isFetching}
                  label={t("slipActivity.pagination.next", "Next")}
                  onClick={() => onPageChange(page + 1)}
                >
                  ›
                </PageButton>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Same page-number window as the Case Management list. */
function slipActivityPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, total]
  if (current >= total - 3) return [1, total - 4, total - 3, total - 2, total - 1, total]
  return [1, current - 1, current, current + 1, total]
}

function PageButton({
  active,
  children,
  disabled,
  label,
  onClick,
  testId,
}: {
  active?: boolean
  children: React.ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-testid={testId}
      className={`grid h-7 min-w-7 place-items-center rounded px-1.5 text-[11px] transition-colors disabled:opacity-35 ${
        active ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Custom hover label that shows at once (the browser's `title` waits about a second). Needs a TooltipProvider above. */
function InstantTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-default">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
