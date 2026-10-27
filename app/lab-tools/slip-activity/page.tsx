"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { SlipActivityAccessDenied } from "@/components/slip-activity/lab-side-route"
import { SlipActivityExportButtons } from "@/components/slip-activity/slip-activity-export-button"
import { SlipActivityFiltersBar } from "@/components/slip-activity/slip-activity-filters"
import { SlipActivityTable } from "@/components/slip-activity/slip-activity-table"
import { useSlipActivityEvents, useSlipActivityStatuses } from "@/hooks/use-slip-activity"
import { defaultSlipActivityFilters } from "@/lib/slip-activity/query-params"
import { nextSlipActivitySort } from "@/lib/slip-activity/sort"
import { isSlipActivityForbidden } from "@/services/slip-activity-service"
import type { SlipActivityFilters } from "@/types/slip-activity"

export default function SlipActivityPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<SlipActivityFilters>(() => defaultSlipActivityFilters())
  const statusesQuery = useSlipActivityStatuses()
  const eventsQuery = useSlipActivityEvents(filters)

  if (isSlipActivityForbidden(statusesQuery.error) || isSlipActivityForbidden(eventsQuery.error)) {
    return <SlipActivityAccessDenied />
  }

  const events = eventsQuery.data?.data ?? []
  const pagination = eventsQuery.data?.pagination

  return (
    <main data-testid="slip-activity-page" className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t("slipActivity.title", "Slip Activity Monitor")}</h1>
          <p className="text-sm text-gray-600">
            {t("slipActivity.subtitle", "Slip pickup and delivery status changes for your lab, newest first.")}
          </p>
        </div>
        <SlipActivityExportButtons filters={filters} disabled={eventsQuery.isLoading || !pagination?.total} />
      </header>

      <SlipActivityFiltersBar
        value={filters}
        statuses={statusesQuery.data ?? []}
        statusesLoading={statusesQuery.isLoading}
        onApply={(next) => setFilters((prev) => ({ ...prev, ...next, page: 1 }))}
      />
      {statusesQuery.isError && (
        <p role="alert" data-testid="slip-activity-statuses-error" className="text-sm text-[#CF0202]">
          {t("slipActivity.statusesError", "Could not load the status list.")}
        </p>
      )}

      {eventsQuery.isLoading ? (
        <div data-testid="slip-activity-loading" className="flex items-center justify-center gap-2 py-12 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          {t("slipActivity.loading", "Loading slip activity...")}
        </div>
      ) : eventsQuery.isError ? (
        <div
          data-testid="slip-activity-error"
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border-[1.5px] border-[#E0E0E0] bg-white p-8 text-center text-sm"
        >
          <p className="text-[#CF0202]">
            {eventsQuery.error instanceof Error && eventsQuery.error.message
              ? eventsQuery.error.message
              : t("slipActivity.error", "Could not load slip activity.")}
          </p>
          <Button type="button" variant="outline" data-testid="slip-activity-retry" onClick={() => eventsQuery.refetch()}>
            {t("slipActivity.retry", "Try again")}
          </Button>
        </div>
      ) : (
        <SlipActivityTable
          events={events}
          pagination={pagination}
          isFetching={eventsQuery.isFetching}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          search={filters.search}
          sort={{ sort: filters.sort, direction: filters.direction }}
          // A new sort starts again at page 1; it is kept in state only, not in the URL.
          onSortChange={(column) => setFilters((prev) => ({ ...prev, ...nextSlipActivitySort(prev, column), page: 1 }))}
        />
      )}
    </main>
  )
}
