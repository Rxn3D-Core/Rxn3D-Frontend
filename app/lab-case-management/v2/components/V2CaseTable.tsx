"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"

import { countVisibleV2Columns } from "../case-table-ui.mjs"
import type { V2CaseRowData, V2RowActions, V2VisibleColumns } from "../case-table-types"
import { CalendarIcon, LabLocationIcon } from "./V2CaseIcons"
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
      <table className="w-full min-w-[980px] border-collapse text-left text-[12px] text-[#4d4a45]">
        <thead>
          <tr className="border-b border-[#d8d4cb] bg-[#ebe8e1] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6e6a63]">
            <th className="w-10 px-3 py-2">
              <Checkbox aria-label="Select all cases on this page" checked={props.selectAllChecked} onCheckedChange={props.onSelectAll} />
            </th>
            {(props.visibleColumns.patient || props.visibleColumns.slipNumber) && <th className="min-w-[220px] px-3 py-2">Patient / Slip</th>}
            {props.visibleColumns.office && <th className="min-w-[120px] px-3 py-2">Office</th>}
            {(props.visibleColumns.pan || props.visibleColumns.product) && <th className="min-w-[170px] px-3 py-2">Pan / Product</th>}
            {props.visibleColumns.status && <th className="min-w-[125px] px-3 py-2">Status</th>}
            {props.visibleColumns.location && <th className="min-w-[145px] px-3 py-2">Location</th>}
            {props.visibleColumns.due && <th className="min-w-[120px] px-3 py-2">Due date</th>}
            {props.visibleColumns.actions && <th className="w-0 p-0" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody>
          {props.loading ? (
            Array.from({ length: 7 }, (_, index) => (
              <tr className="border-b border-[#e5e2db]" key={index}>
                <td className="px-3 py-2.5" colSpan={columnCount}><Skeleton className="h-8 w-full bg-[#e5e2dc]" /></td>
              </tr>
            ))
          ) : props.rows.length === 0 ? (
            <tr><td className="px-4 py-12 text-center text-sm text-[#858178]" colSpan={columnCount}>No cases found for the selected filters.</td></tr>
          ) : props.rows.map((row) => (
            <tr
              className={`group relative cursor-pointer border-b border-[#e3e0d9] transition-colors last:border-b-0 hover:bg-[#f1eee7] focus-within:bg-[#f1eee7] ${props.selected.includes(row.id) ? "bg-[#ebe8e0]" : "bg-[#faf9f6]"}`}
              key={row.id}
              onClick={() => props.rowActions.onOpen(row)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.target === event.currentTarget) props.rowActions.onOpen(row)
              }}
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
                  {props.visibleColumns.patient && <div className="truncate text-[13px] font-semibold text-[#34322f]">{row.patient || "Unnamed patient"}</div>}
                  <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11px] text-[#7c786f]">
                    {props.visibleColumns.slipNumber && <span>{row.slipNumber || row.caseNumber || `#${row.id}`}</span>}
                    {props.visibleColumns.timestamp && row.createdAt && <span>· {row.createdAt}</span>}
                  </div>
                </td>
              )}
              {props.visibleColumns.office && (
                <td className="px-3 py-2.5 align-top">
                  <div className="font-medium text-[#44413c]">{row.officeCode || "—"}</div>
                  {row.doctor && <div className="mt-0.5 truncate text-[11px] text-[#858178]">{row.doctor}</div>}
                </td>
              )}
              {(props.visibleColumns.pan || props.visibleColumns.product) && (
                <td className="px-3 py-2.5 align-top">
                  {props.visibleColumns.pan && <span className="inline-flex min-w-10 justify-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white" style={row.panColorStyle}>{row.pan || "—"}</span>}
                  {props.visibleColumns.product && <div className="mt-1 max-w-[190px] truncate text-[11px] text-[#706c65]">{row.product || "—"}</div>}
                </td>
              )}
              {props.visibleColumns.status && (
                <td className="px-3 py-2.5 align-top">
                  <StatusPill status={row.status} />
                  {row.rush && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#a94337]">Rush</div>}
                </td>
              )}
              {props.visibleColumns.location && (
                <td className="px-3 py-2.5 align-top">
                  <button
                    className="inline-flex items-center gap-1.5 rounded text-left text-[11px] text-[#5f5b55] hover:text-[#292724] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#918d84]"
                    title={isReadyToSendLocation(row) ? "Mark ready to send" : "View driver history"}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); isReadyToSendLocation(row) ? props.rowActions.onReadyToSend(row) : props.rowActions.onDriverHistory(row) }}
                  >
                    <LabLocationIcon className="h-4 w-4 shrink-0" />
                    <span>{row.location || "Unknown"}</span>
                  </button>
                </td>
              )}
              {props.visibleColumns.due && (
                <td className="px-3 py-2.5 align-top">
                  <button className="inline-flex items-center gap-1.5 rounded text-[11px] font-medium text-[#4f4c47] hover:text-[#1f1e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#918d84]" type="button" onClick={(event) => { event.stopPropagation(); props.rowActions.onChangeDueDate(row) }}>
                    <CalendarIcon className="h-4 w-4 text-[#77736b]" />
                    {row.dueDate || "—"}
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
                      showAttachment={props.visibleColumns.attachment}
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
  let label = status || "Unknown"
  let className = "border-[#d2cec5] bg-[#efede7] text-[#615e57]"
  if (status === "In Progress") className = "border-[#c7d5df] bg-[#e7eff4] text-[#426174]"
  else if (status === "On hold") { label = "On Hold"; className = "border-[#dbd1b7] bg-[#f4eedc] text-[#756432]" }
  else if (isSlipCaseCancelled(status)) { label = "Cancelled"; className = "border-[#dfc7c2] bg-[#f4e7e4] text-[#8c4940]" }
  else if (isSlipCaseFinished(status)) { label = "Done"; className = "border-[#c5d8ca] bg-[#e5f0e8] text-[#466a50]" }

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}>{label}</span>
}

function isReadyToSendLocation(row: V2CaseRowData) {
  if (row.locationId === 3) return true
  return row.location === SLIP_LOCATION_FILTER_OPTIONS.find((option) => option.id === 3)?.label
}
