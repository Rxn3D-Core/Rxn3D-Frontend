"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { V3FilterBar, DEFAULT_VISIBLE, type ColumnKey } from "./V3FilterBar"
import { V3CaseTable } from "./V3CaseTable"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"

interface Props {
  // filter bar
  search: string
  onSearchChange: (value: string) => void
  onSearchEnter: () => void
  onAdvancedFilterClick: () => void
  advancedFilterContent?: ReactNode
  locations: string[]
  onLocationChange: (value: string) => void
  statuses: string[]
  onStatusChange: (status: string) => void
  onClearQuickFilters: () => void
  // table
  rows: V2CaseRowData[]
  loading: boolean
  selected: number[]
  selectAllChecked: boolean | "indeterminate"
  onSelectAll: () => void
  onSelectRow: (id: number) => void
  rowActions: V2RowActions
  canPrintStatement: (row: V2CaseRowData) => boolean
  canSendBack: (row: V2CaseRowData) => boolean
  printMenuRow: number | null
  moreMenuRow: number | null
  onPrintMenuRowChange: (id: number | null) => void
  onMoreMenuRowChange: (id: number | null) => void
  // pagination
  currentPage: number
  totalPages: number
  totalCount: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export function V3CaseWidget(props: Props) {
  const pages = getPaginationPages(props.currentPage, props.totalPages)
  const firstEntry = props.totalCount === 0 ? 0 : (props.currentPage - 1) * props.itemsPerPage + 1
  const lastEntry = Math.min(props.currentPage * props.itemsPerPage, props.totalCount)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(DEFAULT_VISIBLE)

  return (
    <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
      <V3FilterBar
        search={props.search}
        onSearchChange={props.onSearchChange}
        onSearchEnter={props.onSearchEnter}
        onAdvancedFilterClick={props.onAdvancedFilterClick}
        locations={props.locations}
        onLocationChange={props.onLocationChange}
        statuses={props.statuses}
        onStatusChange={props.onStatusChange}
        onClearQuickFilters={props.onClearQuickFilters}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
      />
      {props.advancedFilterContent}
      <V3CaseTable
        rows={props.rows}
        loading={props.loading}
        visibleColumns={visibleColumns}
        selected={props.selected}
        selectAllChecked={props.selectAllChecked}
        onSelectAll={props.onSelectAll}
        onSelectRow={props.onSelectRow}
        rowActions={props.rowActions}
        canPrintStatement={props.canPrintStatement}
        canSendBack={props.canSendBack}
        printMenuRow={props.printMenuRow}
        moreMenuRow={props.moreMenuRow}
        onPrintMenuRowChange={props.onPrintMenuRowChange}
        onMoreMenuRowChange={props.onMoreMenuRowChange}
        firstEntry={firstEntry}
        lastEntry={lastEntry}
        totalCount={props.totalCount}
        statusFilter={props.statuses}
        onStatusFilterChange={props.onStatusChange}
      />
      <div className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-[#77736b]">Click a row to open</p>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="whitespace-nowrap text-[11px] text-[#77736b]">
              {firstEntry}–{lastEntry} of {props.totalCount}
            </span>
            <nav aria-label="Case table pagination" className="flex items-center gap-1">
              <PageButton
                disabled={props.currentPage === 1}
                label="Previous page"
                onClick={() => props.onPageChange(Math.max(1, props.currentPage - 1))}
              >
                ‹
              </PageButton>
              {pages.map((page) => (
                <PageButton
                  active={page === props.currentPage}
                  key={page}
                  label={`Page ${page}`}
                  onClick={() => props.onPageChange(page)}
                >
                  {page}
                </PageButton>
              ))}
              <PageButton
                disabled={props.currentPage === props.totalPages}
                label="Next page"
                onClick={() => props.onPageChange(Math.min(props.totalPages, props.currentPage + 1))}
              >
                ›
              </PageButton>
            </nav>
          </div>
        </div>
      </div>
    </section>
  )
}

function PageButton({
  active,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      aria-current={active ? "page" : undefined}
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

function getPaginationPages(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, total]
  if (current >= total - 3) return [1, total - 4, total - 3, total - 2, total - 1, total]
  return [1, current - 1, current, current + 1, total]
}
