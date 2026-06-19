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

  const actionClass = "rounded px-2 py-1 text-[11px] font-medium text-[#57534d] transition-colors hover:bg-[#e5e1d9] disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#d8d4cb] bg-[#ece9e2] px-4 py-2">
      <span className="mr-2 text-xs font-semibold text-[#45423d]">{selectedCount} selected</span>
      <button className={actionClass} type="button">Pick up</button>
      <button className={actionClass} type="button" onClick={onPrintDriverLabels}><PrintIcon className="mr-1 inline h-3.5 w-3.5" />Driver label</button>
      <button className={actionClass} type="button" onClick={onPrintPaperSlips}><PrintIcon className="mr-1 inline h-3.5 w-3.5" />Paper slip</button>
      <button className={actionClass} disabled={!canPrintStatement} type="button" onClick={onPrintStatement}>Statement</button>
      <button className={actionClass} type="button">Send back</button>
      <button className={actionClass} type="button">Rush case</button>
      <button className={`${actionClass} text-[#9a4038] hover:bg-[#f0deda]`} type="button" onClick={onArchive}>Archive</button>
    </div>
  )
}
