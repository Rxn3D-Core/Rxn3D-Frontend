"use client"

import type { MouseEvent, ReactNode } from "react"
import { MoreVertical } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { buildLabCaseDropdownActions } from "../../dropdown-actions.mjs"

import { v2RowActionStripClass } from "../case-table-ui.mjs"
import type { V2CaseRowData, V2RowActions } from "../case-table-types"
import { CalendarIcon } from "./V2CaseIcons"

const SL = "/icons/slip-listing"
const VS = "/icons/virtual-slip-center"
const VA = "/icons/virtual-slip-actions"
const monoFilter = "grayscale(1) brightness(0.7) contrast(0.6) opacity(0.65)"

function MonoImg({ src, size = 24, alt = "", color = false }: { src: string; size?: number; alt?: string; color?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} aria-hidden src={src} style={{ width: size, height: size, filter: color ? undefined : monoFilter, objectFit: "contain" }} />
}

function locationImg(row: V2CaseRowData) {
  if (row.newStageEligible) return <MonoImg src={`${VS}/add-stage.svg`} color />
  const locationId = row.locationId
  if (locationId === 1 || locationId === 4) return <MonoImg src={`${VS}/pick-up.svg`} />
  if (locationId === 2 || locationId === 5) return <MonoImg src={`${VS}/drop-off.svg`} />
  if (locationId === 3) return <MonoImg src={`${VS}/ready-to-send.svg`} />
  if (locationId === 6) return <MonoImg src={`${VS}/in-office.png`} />
  return <MonoImg src={`${VS}/pick-up.svg`} />
}

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
  const stop = (e: MouseEvent) => e.stopPropagation()
  const btn = "grid h-10 w-10 place-items-center rounded text-gray-600 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-[#d6d2ca] bg-[#ece9e2] p-1 shadow-md", v2RowActionStripClass(printOpen || moreOpen))}>
      {showView && (
        <button aria-label="View case" className={btn} title="View case" type="button" onClick={(e) => { stop(e); actions.onOpen(row) }}>
          <MonoImg src={`${SL}/view-virtual-slip.svg`} />
        </button>
      )}
      <button aria-label="Location" className={btn} title={row.newStageEligible ? "Add stage" : row.location ?? "Location"} type="button" onClick={(e) => {
        stop(e)
        if (row.newStageEligible) {
          actions.onAddStage(row)
          return
        }
        row.locationId === 3 ? actions.onReadyToSend(row) : actions.onDriverHistory(row)
      }}>
        {locationImg(row)}
      </button>
      <Popover open={printOpen} onOpenChange={onPrintOpenChange}>
        <PopoverTrigger asChild>
          <button aria-label="Print" className={btn} title="Print" type="button" onClick={stop}>
            <MonoImg src={`${VA}/printer.svg`} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 border-gray-200 bg-white p-1" onClick={stop}>
          <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintPaperSlip(row) }}>Print paper slip</MenuButton>
          <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintDriverLabel(row) }}>Print driver label</MenuButton>
          {canPrintStatement && <MenuButton onClick={() => { onPrintOpenChange(false); return actions.onPrintStatement(row) }}>Print statement</MenuButton>}
        </PopoverContent>
      </Popover>
      <button aria-label="Add-ons" className={btn} title="Add-ons" type="button" onClick={(e) => { stop(e); actions.onAddOns(row) }}>
        <MonoImg src={`${VS}/add-general.svg`} />
      </button>
      <button aria-label="Call log" className={btn} title="Call log" type="button" onClick={(e) => { stop(e); actions.onCallLog(row) }}>
        <MonoImg src={`${VS}/call-log.svg`} />
      </button>
      <button aria-label="Attachments" className={btn} title="Attachments" type="button" onClick={(e) => { stop(e); actions.onAttachment(row) }}>
        <MonoImg color={!!row.attachment} src={`${VS}/attachments.svg`} />
      </button>
      <button aria-label="Change due date" className={btn} title="Change due date" type="button" onClick={(e) => { stop(e); actions.onChangeDueDate(row) }}>
        <CalendarIcon className="h-6 w-6" />
      </button>
      <Popover open={moreOpen} onOpenChange={onMoreOpenChange}>
        <PopoverTrigger asChild>
          <button aria-label="More actions" className={btn} title="More actions" type="button" onClick={stop}>
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
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
  return (
    <button className="block w-full rounded px-3 py-2 text-left text-xs text-gray-700 hover:bg-[#ece9e2] disabled:cursor-not-allowed disabled:text-gray-400" disabled={disabled} type="button" onClick={() => void onClick()}>
      {children}
    </button>
  )
}
