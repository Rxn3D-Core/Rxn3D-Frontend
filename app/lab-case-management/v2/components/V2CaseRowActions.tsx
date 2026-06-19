"use client"

import type { MouseEvent, ReactNode } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { buildLabCaseDropdownActions } from "../../dropdown-actions.mjs"

import { v2RowActionStripClass } from "../case-table-ui.mjs"
import type { V2CaseRowData, V2RowActions } from "../case-table-types"
import { CalendarIcon, CopyIcon, LabLocationIcon, MoreIcon, PaperclipIcon, PhoneIcon, PrintIcon, ViewIcon } from "./V2CaseIcons"

type Props = {
  row: V2CaseRowData
  actions: V2RowActions
  canPrintStatement: boolean
  canSendBack: boolean
  printOpen: boolean
  moreOpen: boolean
  showView: boolean
  onPrintOpenChange: (open: boolean) => void
  onMoreOpenChange: (open: boolean) => void
}

export function V2CaseRowActions({ row, actions, canPrintStatement, canSendBack, printOpen, moreOpen, showView, onPrintOpenChange, onMoreOpenChange }: Props) {
  const stop = (event: MouseEvent) => event.stopPropagation()
  const iconButton = "grid h-10 w-10 place-items-center rounded text-gray-600 transition-colors hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-[#d6d2ca] bg-[#ece9e2] p-1 shadow-md", v2RowActionStripClass(printOpen || moreOpen))}>
      {showView && <button aria-label="View case" className={iconButton} title="View case" type="button" onClick={(event) => { stop(event); actions.onOpen(row) }}><ViewIcon className="h-5 w-5" /></button>}
      <Popover open={printOpen} onOpenChange={onPrintOpenChange}>
        <PopoverTrigger asChild>
          <button aria-label="Print" className={iconButton} title="Print" type="button" onClick={stop}><PrintIcon className="h-5 w-5" /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 border-gray-200 bg-white p-1" onClick={stop}>
          <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintPaperSlip(row) }}>Print paper slip</MenuButton>
          <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintDriverLabel(row) }}>Print driver label</MenuButton>
          {canPrintStatement && <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintStatement(row) }}>Print statement</MenuButton>}
        </PopoverContent>
      </Popover>
      <button aria-label="Call log" className={iconButton} title="Call log" type="button" onClick={(event) => { stop(event); actions.onCallLog(row) }}><PhoneIcon className="h-5 w-5" /></button>
      {row.attachment && <button aria-label="Attachments" className={cn(iconButton, "text-[#1769aa]")} title="Attachments" type="button" onClick={(event) => { stop(event); actions.onAttachment(row) }}><PaperclipIcon className="h-5 w-5" /></button>}
      <button aria-label="Location" className={iconButton} title={row.locationId === 3 ? "Mark ready to send" : "Driver history"} type="button" onClick={(event) => { stop(event); row.locationId === 3 ? actions.onReadyToSend(row) : actions.onDriverHistory(row) }}><LabLocationIcon className="h-5 w-5" /></button>
      <button aria-label="Change due date" className={iconButton} title="Change due date" type="button" onClick={(event) => { stop(event); actions.onChangeDueDate(row) }}><CalendarIcon className="h-5 w-5" /></button>
      <button aria-label="Copy case identifier" className={iconButton} title="Copy" type="button" onClick={(event) => { stop(event); actions.onCopy(row) }}><CopyIcon className="h-5 w-5" /></button>
      <Popover open={moreOpen} onOpenChange={onMoreOpenChange}>
        <PopoverTrigger asChild>
          <button aria-label="More actions" className={iconButton} title="More actions" type="button" onClick={stop}><MoreIcon className="h-5 w-5" /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 border-gray-200 bg-white p-1" onClick={stop}>
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
  return <button className="block w-full rounded px-3 py-2 text-left text-xs text-gray-700 hover:bg-[#ece9e2] disabled:cursor-not-allowed disabled:text-gray-400" disabled={disabled} type="button" onClick={() => void onClick()}>{children}</button>
}
