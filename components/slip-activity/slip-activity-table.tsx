"use client"

import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toSlipActivityRow } from "@/lib/slip-activity/rows"
import { slipActivityAriaSort } from "@/lib/slip-activity/sort"
import { formatSlipActivityDateTime } from "@/lib/slip-activity/time-zone"
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
        <Table data-testid="slip-activity-table" className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              {sortableHead("action_at", t("slipActivity.table.dateTime", "Date/time"))}
              {sortableHead("slip_number", t("slipActivity.table.slip", "Slip"))}
              {sortableHead("patient_name", t("slipActivity.table.patient", "Patient"))}
              {sortableHead("office_name", t("slipActivity.table.office", "Office"))}
              {sortableHead("status", t("slipActivity.table.statusChange", "From -> To"))}
              {sortableHead("user_name", t("slipActivity.table.user", "User"))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              return (
                <TableRow key={row.id} data-testid="slip-activity-row">
                  <TableCell className="whitespace-nowrap">
                    <time dateTime={row.actionAt}>{formatSlipActivityDateTime(row.actionAt, i18n.language)}</time>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={row.slipHref}
                      data-testid="slip-activity-slip-link"
                      className="font-medium text-[#1162A8] underline-offset-2 hover:underline"
                    >
                      {row.slipNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-[120px]" data-testid="slip-activity-patient">{row.patientName}</TableCell>
                  <TableCell className="min-w-[140px]" data-testid="slip-activity-office">{row.officeName}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{row.fromStatus}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-label={t("slipActivity.table.to", "to")} />
                      <span>{row.toStatus}</span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.userName}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <nav
          data-testid="slip-activity-pagination"
          aria-label={t("slipActivity.pagination.label", "Pagination")}
          className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between"
        >
          <span data-testid="slip-activity-pagination-summary">
            {t("slipActivity.pagination.summary", "Showing {{from}}-{{to}} of {{total}}", {
              from: pagination.from ?? 0,
              to: pagination.to ?? 0,
              total: pagination.total,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="slip-activity-prev"
              disabled={page <= 1 || isFetching}
              onClick={() => onPageChange(page - 1)}
            >
              {t("slipActivity.pagination.previous", "Previous")}
            </Button>
            <span>{t("slipActivity.pagination.page", "Page {{page}} of {{lastPage}}", { page, lastPage })}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="slip-activity-next"
              disabled={page >= lastPage || isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              {t("slipActivity.pagination.next", "Next")}
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}
