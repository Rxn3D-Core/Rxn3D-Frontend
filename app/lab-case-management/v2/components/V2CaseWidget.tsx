"use client"

import type { ReactNode } from "react"

import { getV2PaginationPages } from "../case-table-ui.mjs"
import { V2BulkActionBar } from "./V2BulkActionBar"
import { V2CaseControlsMenu, type V2CaseControlsMenuProps } from "./V2CaseControlsMenu"
import { V2CaseTable, type V2CaseTableProps } from "./V2CaseTable"

type Props = V2CaseControlsMenuProps & V2CaseTableProps & {
  currentPage: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
  bulkCanPrintStatement: boolean
  onBulkPrintDriverLabels: () => void
  onBulkPrintPaperSlips: () => void
  onBulkPrintStatement: () => void
  onBulkArchive: () => void
}

export function V2CaseWidget(props: Props) {
  const pages = getV2PaginationPages(props.currentPage, props.totalPages)
  const firstEntry = props.totalCount === 0 ? 0 : (props.currentPage - 1) * props.itemsPerPage + 1
  const lastEntry = Math.min(props.currentPage * props.itemsPerPage, props.totalCount)

  return (
    <section className="overflow-hidden rounded-lg border border-[#d6d2c9] bg-[#faf9f6] shadow-[0_8px_30px_rgba(50,47,42,0.08)]">
      <V2CaseControlsMenu {...props} />
      <V2BulkActionBar
        canPrintStatement={props.bulkCanPrintStatement}
        onArchive={props.onBulkArchive}
        onPrintDriverLabels={props.onBulkPrintDriverLabels}
        onPrintPaperSlips={props.onBulkPrintPaperSlips}
        onPrintStatement={props.onBulkPrintStatement}
        selectedCount={props.selected.length}
      />
      <V2CaseTable {...props} />
      <div className="border-t border-[#d8d4cb] bg-[#f3f1eb] px-4 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-[#77736b]">ⓘ Hover or focus a row to reveal actions · Blue paperclip means attachments · Click a row to open</p>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="whitespace-nowrap text-[11px] text-[#77736b]">{firstEntry}–{lastEntry} of {props.totalCount}</span>
            <nav aria-label="Case table pagination" className="flex items-center gap-1">
              <PageButton disabled={props.currentPage === 1} label="Previous page" onClick={() => props.onPageChange(Math.max(1, props.currentPage - 1))}>‹</PageButton>
              {pages.map((page: number) => <PageButton active={page === props.currentPage} key={page} label={`Page ${page}`} onClick={() => props.onPageChange(page)}>{page}</PageButton>)}
              <PageButton disabled={props.currentPage === props.totalPages} label="Next page" onClick={() => props.onPageChange(Math.min(props.totalPages, props.currentPage + 1))}>›</PageButton>
            </nav>
          </div>
        </div>
      </div>
    </section>
  )
}

function PageButton({ active, children, disabled, label, onClick }: { active?: boolean; children: ReactNode; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} aria-current={active ? "page" : undefined} className={`grid h-7 min-w-7 place-items-center rounded px-1.5 text-[11px] transition-colors disabled:opacity-35 ${active ? "bg-[#514e48] text-white" : "bg-[#e7e4dd] text-[#625f59] hover:bg-[#dcd8cf]"}`} disabled={disabled} type="button" onClick={onClick}>{children}</button>
  )
}
