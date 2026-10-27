"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toSlipActivityRow } from "@/lib/slip-activity/rows"
import type { SlipActivityEvent, SlipActivityPagination } from "@/types/slip-activity"

interface SlipActivityTableProps {
  events: SlipActivityEvent[]
  pagination: SlipActivityPagination | undefined
  isFetching: boolean
  onPageChange: (page: number) => void
}

export function SlipActivityTable({ events, pagination, isFetching, onPageChange }: SlipActivityTableProps) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.DateTimeFormat(i18n.language || undefined, { dateStyle: "medium", timeStyle: "short" })
  const rows = events.map(toSlipActivityRow)

  if (!rows.length) {
    return (
      <div
        data-testid="slip-activity-empty"
        className="rounded-lg border-[1.5px] border-dashed border-[#E0E0E0] bg-white p-8 text-center text-sm text-gray-600"
      >
        {t("slipActivity.empty", "No status changes match these filters.")}
      </div>
    )
  }

  const page = pagination?.current_page ?? 1
  const lastPage = pagination?.last_page ?? 1

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border-[1.5px] border-[#E0E0E0] bg-white" aria-busy={isFetching}>
        <Table data-testid="slip-activity-table" className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("slipActivity.table.dateTime", "Date/time")}</TableHead>
              <TableHead>{t("slipActivity.table.slip", "Slip")}</TableHead>
              <TableHead>{t("slipActivity.table.statusChange", "From -> To")}</TableHead>
              <TableHead>{t("slipActivity.table.user", "User")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const date = new Date(row.actionAt)
              return (
                <TableRow key={row.id} data-testid="slip-activity-row">
                  <TableCell className="whitespace-nowrap">
                    <time dateTime={row.actionAt}>{Number.isNaN(date.getTime()) ? row.actionAt : formatter.format(date)}</time>
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
