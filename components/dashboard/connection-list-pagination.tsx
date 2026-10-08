"use client"

import type { ConnectionsPagination } from "@/lib/connection-api"

interface ConnectionListPaginationProps {
  pagination: ConnectionsPagination
  onPageChange: (page: number) => void
  itemLabel?: string
}

export function ConnectionListPagination({
  pagination,
  onPageChange,
  itemLabel = "items",
}: ConnectionListPaginationProps) {
  const { current_page, last_page, total, from, to } = pagination

  if (last_page <= 1) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 bg-slate-50 border-t border-[#e4e6ef] flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <span className="text-xs sm:text-sm text-[#a19d9d] text-center sm:text-left">
          Showing {total} {itemLabel}
        </span>
      </div>
    )
  }

  const pageNumbers = Array.from({ length: Math.min(5, last_page) }, (_, i) => {
    if (last_page <= 5) return i + 1
    if (current_page <= 3) return i + 1
    if (current_page >= last_page - 2) return last_page - 4 + i
    return current_page - 2 + i
  })

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-slate-50 border-t border-[#e4e6ef] flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
      <span className="text-xs sm:text-sm text-[#a19d9d] text-center sm:text-left">
        Showing {from ?? 0} to {to ?? 0} of {total} {itemLabel}
      </span>
      <div className="flex items-center justify-center sm:justify-end space-x-1">
        <button
          type="button"
          className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#a19d9d] disabled:opacity-50"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
          aria-label="Previous page"
        >
          «
        </button>
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs ${
              pageNum === current_page ? "bg-[#1162a8] text-white" : "bg-[#f0f0f0] text-[#a19d9d]"
            }`}
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </button>
        ))}
        <button
          type="button"
          className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#a19d9d] disabled:opacity-50"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
          aria-label="Next page"
        >
          »
        </button>
      </div>
    </div>
  )
}
