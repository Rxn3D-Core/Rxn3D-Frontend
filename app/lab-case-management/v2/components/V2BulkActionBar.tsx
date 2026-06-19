"use client"

import { PrintIcon } from "./V2CaseIcons"

type Props = {
  selectedCount: number
  canPrintStatement: boolean
  onPrintDriverLabels: () => void
  onPrintPaperSlips: () => void
  onPrintStatement: () => void
  onArchive: () => void
}

export function V2BulkActionBar({ selectedCount, canPrintStatement, onPrintDriverLabels, onPrintPaperSlips, onPrintStatement, onArchive }: Props) {
  if (!selectedCount) return null

  const actionClass = "rounded px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-4 py-2">
      <span className="mr-2 text-xs font-semibold text-gray-700">{selectedCount} selected</span>
      <button className={actionClass} type="button">Pick up</button>
      <button className={actionClass} type="button" onClick={onPrintDriverLabels}><PrintIcon className="mr-1 inline h-3.5 w-3.5" />Driver label</button>
      <button className={actionClass} type="button" onClick={onPrintPaperSlips}><PrintIcon className="mr-1 inline h-3.5 w-3.5" />Paper slip</button>
      <button className={actionClass} disabled={!canPrintStatement} type="button" onClick={onPrintStatement}>Statement</button>
      <button className={actionClass} type="button">Send back</button>
      <button className={actionClass} type="button">Rush case</button>
      <button className={`${actionClass} text-red-600 hover:bg-red-50`} type="button" onClick={onArchive}>Archive</button>
    </div>
  )
}
