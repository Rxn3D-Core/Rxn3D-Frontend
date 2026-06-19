"use client"

import type { MouseEvent, ReactNode } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { buildLabCaseDropdownActions } from "../../dropdown-actions.mjs"

import { v2RowActionStripClass } from "../case-table-ui.mjs"
import type { V2CaseRowData, V2RowActions } from "../case-table-types"
import { CopyIcon, MoreIcon, PaperclipIcon, PhoneIcon, PrintIcon, ViewIcon } from "./V2CaseIcons"

type Props = {
  row: V2CaseRowData
  actions: V2RowActions
  canPrintStatement: boolean
  canSendBack: boolean
  printOpen: boolean
  moreOpen: boolean
  showAttachment: boolean
  showView: boolean
  onPrintOpenChange: (open: boolean) => void
  onMoreOpenChange: (open: boolean) => void
}

export function V2CaseRowActions({ row, actions, canPrintStatement, canSendBack, printOpen, moreOpen, showAttachment, showView, onPrintOpenChange, onMoreOpenChange }: Props) {
  const stop = (event: MouseEvent) => event.stopPropagation()
  const iconButton = "grid h-7 w-7 place-items-center rounded text-[#69655e] transition-colors hover:bg-[#eeebe4] hover:text-[#34322e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#918d84]"

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-[#d7d3ca] bg-[#fbfaf7] p-1 shadow-md", v2RowActionStripClass())}>
      {showView && <button aria-label="View case" className={iconButton} title="View case" type="button" onClick={(event) => { stop(event); actions.onOpen(row) }}><ViewIcon /></button>}
      <Popover open={printOpen} onOpenChange={onPrintOpenChange}>
        <PopoverTrigger asChild>
          <button aria-label="Print" className={iconButton} title="Print" type="button" onClick={stop}><PrintIcon /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 border-[#d7d3ca] bg-[#fbfaf7] p-1" onClick={stop}>
          <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintPaperSlip(row) }}>Print paper slip</MenuButton>
          <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintDriverLabel(row) }}>Print driver label</MenuButton>
          {canPrintStatement && <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintStatement(row) }}>Print statement</MenuButton>}
        </PopoverContent>
      </Popover>
      <button aria-label="Call log" className={iconButton} title="Call log" type="button" onClick={(event) => { stop(event); actions.onCallLog(row) }}><PhoneIcon /></button>
      {showAttachment && <button aria-label="Attachments" className={cn(iconButton, row.attachment && "text-[#1769aa]")} title="Attachments" type="button" onClick={(event) => { stop(event); actions.onAttachment(row) }}><PaperclipIcon /></button>}
      <button aria-label="Copy case identifier" className={iconButton} title="Copy" type="button" onClick={(event) => { stop(event); actions.onCopy(row) }}><CopyIcon /></button>
      <Popover open={moreOpen} onOpenChange={onMoreOpenChange}>
        <PopoverTrigger asChild>
          <button aria-label="More actions" className={iconButton} title="More actions" type="button" onClick={stop}><MoreIcon /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 border-[#d7d3ca] bg-[#fbfaf7] p-1" onClick={stop}>
          {buildLabCaseDropdownActions({
            onEditCase: () => actions.onEdit(row),
            onChangeDueDate: () => actions.onChangeDueDate(row),
            onPrintDriverLabel: () => actions.onPrintDriverLabel(row),
            onPrintPaperSlip: () => void actions.onPrintPaperSlip(row),
            onPrintStatement: canPrintStatement ? () => actions.onPrintStatement(row) : null,
            onSendBackToOffice: canSendBack ? () => actions.onSendBack(row) : null,
            onRushCase: () => actions.onRush(row),
            onCancelCase: () => actions.onCancel(row),
          }).filter((action) => action.key !== "print-statement" || canPrintStatement).map((action) => (
            <MenuButton disabled={action.disabled} key={action.key} onClick={() => { if (!action.disabled && action.onSelect) { onMoreOpenChange(false); action.onSelect() } }}>{action.label}</MenuButton>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function MenuButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void | Promise<void> }) {
  return <button className="block w-full rounded px-3 py-2 text-left text-xs text-[#4f4c47] hover:bg-[#ece9e2] disabled:cursor-not-allowed disabled:text-[#aaa69e]" disabled={disabled} type="button" onClick={() => void onClick()}>{children}</button>
}
