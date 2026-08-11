"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"
import { SlipListingStatusBadge } from "@/components/slip-listing/SlipListingStatusBadge"

import { countVisibleV2Columns } from "../case-table-ui.mjs"
import type { V2CaseRowData, V2RowActions, V2VisibleColumns } from "../case-table-types"
import { CalendarIcon, LabLocationIcon } from "./V2CaseIcons"

const monoFilter = "grayscale(1) brightness(0.7) contrast(0.6) opacity(0.65)"
const VS = "/icons/virtual-slip-center"
import { V2CaseRowActions } from "./V2CaseRowActions"

export type V2CaseTableProps = {
  rows: V2CaseRowData[]
  loading: boolean
  visibleColumns: V2VisibleColumns
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
}

export function V2CaseTable(props: V2CaseTableProps) {
  const columnCount = countVisibleV2Columns(props.visibleColumns)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm text-[#374151]">
        <thead>
          <tr className="border-b border-[#e5e7eb] bg-[#f5f5f5] text-xs font-semibold text-[#6b7280]">
            <th className="w-10 px-3 py-2">
              <Checkbox aria-label="Select all cases on this page" checked={props.selectAllChecked} onCheckedChange={props.onSelectAll} />
            </th>
            {(props.visibleColumns.patient || props.visibleColumns.slipNumber) && <th className="min-w-[220px] px-3 py-2 text-left">Patient / Slip</th>}
            {props.visibleColumns.office && <th className="min-w-[120px] px-3 py-2 text-right">Office</th>}
            {(props.visibleColumns.pan || props.visibleColumns.product) && <th className="min-w-[170px] px-3 py-2 text-right">Pan / Product</th>}
            {props.visibleColumns.status && <th className="min-w-[125px] px-3 py-2 text-right">Status</th>}
            {props.visibleColumns.location && <th className="min-w-[145px] px-3 py-2 text-right">Location</th>}
            {props.visibleColumns.due && <th className="min-w-[120px] px-3 py-2 text-right">Due date</th>}
            {props.visibleColumns.actions && <th className="w-0 p-0" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody>
          {props.loading ? (
            Array.from({ length: 7 }, (_, index) => (
              <tr className="border-b border-[#f0f0f0]" key={index}>
                <td className="px-3 py-2.5" colSpan={columnCount}><Skeleton className="h-8 w-full bg-[#efefef]" /></td>
              </tr>
            ))
          ) : props.rows.length === 0 ? (
            <tr><td className="px-4 py-12 text-center text-sm text-[#858178]" colSpan={columnCount}>No cases found for the selected filters.</td></tr>
          ) : props.rows.map((row) => (
            <tr
              className={`group relative border-b border-[#efefef] transition-colors last:border-b-0 hover:bg-[#ece9e2] ${props.selected.includes(row.id) ? "bg-[#e8e5de]" : "bg-white"}`}
              key={row.id}
            >
              <td className="px-3 py-2.5 align-top" onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  aria-label={`Select ${row.patient || row.slipNumber || row.id}`}
                  checked={props.selected.includes(row.id)}
                  onCheckedChange={() => props.onSelectRow(row.id)}
                />
              </td>
              {(props.visibleColumns.patient || props.visibleColumns.slipNumber) && (
                <td className="px-3 py-2.5 align-top">
                  <button className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#918d84]" type="button" onClick={() => props.rowActions.onOpen(row)}>
                    {props.visibleColumns.patient && <div className="truncate text-sm font-semibold text-[#34322f] hover:underline">{row.patient || "Unnamed patient"}</div>}
                    <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-[#7c786f]">
                      {props.visibleColumns.slipNumber && <span>{row.slipNumber || row.caseNumber || `#${row.id}`}</span>}
                      {props.visibleColumns.timestamp && row.createdAt && <span>· {row.createdAt}</span>}
                    </div>
                  </button>
                </td>
              )}
              {props.visibleColumns.office && (
                <td className="px-3 py-2.5 align-top text-right">
                  <div className="font-medium text-[#44413c]">{row.officeCode || "—"}</div>
                  {row.doctor && <div className="mt-0.5 truncate text-xs text-[#858178]">{row.doctor}</div>}
                </td>
              )}
              {(props.visibleColumns.pan || props.visibleColumns.product) && (
                <td className="px-3 py-2.5 align-top text-right">
                  {props.visibleColumns.pan && <span className="inline-flex min-w-10 justify-center rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-white" style={row.panColorStyle}>{row.pan || "—"}</span>}
                  {props.visibleColumns.product && <div className="mt-1 max-w-[190px] truncate text-xs text-[#706c65]">{row.product || "—"}</div>}
                </td>
              )}
              {props.visibleColumns.status && (
                <td className="px-3 py-2.5 align-top text-right">
                  <StatusPill status={row.status} />
                  {row.rush && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#a94337]">Rush</div>}
                </td>
              )}
              {props.visibleColumns.location && (
                <td className="px-3 py-2.5 align-top text-right">
                  <button
                    className="inline-flex items-center gap-1.5 rounded text-left text-xs text-[#5f5b55] hover:text-[#292724] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#918d84]"
                    title={row.newStageEligible ? "Add stage" : isReadyToSendLocation(row) ? "Mark ready to send" : "View driver history"}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (row.newStageEligible) {
                        props.rowActions.onAddStage(row)
                        return
                      }
                      isReadyToSendLocation(row) ? props.rowActions.onReadyToSend(row) : props.rowActions.onDriverHistory(row)
                    }}
                  >
                    {locationIcon(row)}
                    <span>{row.location || "Unknown"}</span>
                  </button>
                </td>
              )}
              {props.visibleColumns.due && (
                <td className="px-3 py-2.5 align-top text-right">
                  <button className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-[#4f4c47] hover:text-[#1f1e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#918d84]" type="button" onClick={(event) => { event.stopPropagation(); props.rowActions.onChangeDueDate(row) }}>
                    <CalendarIcon className="h-5 w-5 opacity-60" />
                    {formatDueDate(row.dueDate)}
                  </button>
                </td>
              )}
              {props.visibleColumns.actions && (
                <td className="relative w-0 p-0 align-middle">
                  <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">
                    <V2CaseRowActions
                      actions={props.rowActions}
                      canPrintStatement={props.canPrintStatement(row)}
                      canSendBack={props.canSendBack(row)}
                      moreOpen={props.moreMenuRow === row.id}
                      onMoreOpenChange={(open) => props.onMoreMenuRowChange(open ? row.id : null)}
                      onPrintOpenChange={(open) => props.onPrintMenuRowChange(open ? row.id : null)}
                      printOpen={props.printMenuRow === row.id}
                      row={row}
                      showView={props.visibleColumns.viewSlip}
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === "In Progress") return <SlipListingStatusBadge tone="in-progress">In Progress</SlipListingStatusBadge>
  if (status === "On hold" || status === "On Hold") return <SlipListingStatusBadge tone="on-hold">On Hold</SlipListingStatusBadge>
  if (isSlipCaseCancelled(status)) return <SlipListingStatusBadge tone="cancelled">Cancelled</SlipListingStatusBadge>
  if (isSlipCaseFinished(status)) return <SlipListingStatusBadge tone="finished">Done</SlipListingStatusBadge>
  return <SlipListingStatusBadge tone="draft">{status || "Unknown"}</SlipListingStatusBadge>
}

function locationIcon(row: V2CaseRowData) {
  if (row.newStageEligible) {
    return <img src={`${VS}/add-stage.svg`} style={{ width: 20, height: 20, objectFit: "contain" }} aria-hidden alt="" />
  }
  const locationId = row.locationId
  const imgProps = { style: { width: 20, height: 20, filter: monoFilter, objectFit: "contain" as const }, "aria-hidden": true, alt: "" }
  if (locationId === 1 || locationId === 4) return <img src={`${VS}/pick-up.svg`} {...imgProps} />
  if (locationId === 2 || locationId === 5) return <img src={`${VS}/drop-off.svg`} {...imgProps} />
  if (locationId === 3) return <img src={`${VS}/ready-to-send.svg`} {...imgProps} />
  if (locationId === 6) return <img src={`${VS}/in-office.png`} {...imgProps} />
  return <LabLocationIcon className="h-5 w-5 shrink-0 opacity-60" />
}

function isReadyToSendLocation(row: V2CaseRowData) {
  if (row.locationId === 3) return true
  return row.location === SLIP_LOCATION_FILTER_OPTIONS.find((option) => option.id === 3)?.label
}

function formatDueDate(dueDate: string): string {
  if (!dueDate) return "—"
  const due = new Date(dueDate)
  if (isNaN(due.getTime())) return dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  const mmdd = due.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })
  const label = days === 0 ? "Today" : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`
  return `${label} · ${mmdd}`
}

