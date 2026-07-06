"use client"

import { useEffect, useRef, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"
import { SlipListingStatusBadge } from "@/components/slip-listing/SlipListingStatusBadge"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"
import { LabLocationIcon } from "@/app/lab-case-management/v2/components/V2CaseIcons"
import { V3RowActionsPopover } from "./V3RowActionsPopover"
import type { ColumnKey } from "./V3FilterBar"

const AMBER = "#FFE2A1"
const PAN_BG = "#FF5733"
const VS = "/icons/virtual-slip-center"
const monoFilter = ""

const KEBAB_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
)

interface Props {
  rows: V2CaseRowData[]
  loading: boolean
  visibleColumns: Set<ColumnKey>
  selected: number[]
  selectAllChecked: boolean | "indeterminate"
  onSelectAll: () => void
  onSelectRow: (id: number) => void
  rowActions: V2RowActions
  canPrintStatement: (row: V2CaseRowData) => boolean
  canSendBack: (row: V2CaseRowData) => boolean
  // kept for API compatibility with V3CaseWidget; not used internally
  printMenuRow: number | null
  moreMenuRow: number | null
  onPrintMenuRowChange: (id: number | null) => void
  onMoreMenuRowChange: (id: number | null) => void
  // mobile header
  firstEntry: number
  lastEntry: number
  totalCount: number
  // mobile status filter
  statusFilter: string[]
  onStatusFilterChange: (status: string) => void
}

type DesktopColumn = {
  key: ColumnKey
  label: string
  width: number
}

const DESKTOP_COLUMN_DEFS: readonly DesktopColumn[] = [
  { key: "patient", label: "Patient", width: 220 },
  { key: "slip", label: "Slip #", width: 130 },
  { key: "panProduct", label: "Pan / Product", width: 180 },
  { key: "location", label: "Location", width: 300 },
  { key: "dueDate", label: "Due Date", width: 150 },
  { key: "status", label: "Status", width: 150 },
  { key: "office", label: "Office", width: 200 },
  { key: "caseNo", label: "Case #", width: 130 },
  { key: "timestamp", label: "Time stamp", width: 190 },
]

function buildDesktopColumns(visibleColumns: Set<ColumnKey>): DesktopColumn[] {
  return DESKTOP_COLUMN_DEFS.filter((column) => column.key === "panProduct" || column.key === "status" || visibleColumns.has(column.key))
}

export function V3CaseTable(props: Props) {
  const [popoverRow, setPopoverRow] = useState<number | null>(null)
  const popoverRef = useRef<HTMLTableRowElement>(null)
  const desktopColumns = buildDesktopColumns(props.visibleColumns)
  const columnCount = desktopColumns.length + 2

  useEffect(() => {
    if (popoverRow === null) return
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverRow(null)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [popoverRow])

  return (
    <>
      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden">
        {/* "Cases  1-50 of 209" header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E2E4E8] bg-[#f2f2f2]">
          <span className="text-[15px] font-bold text-black">Cases</span>
          <span className="text-[13px] text-[#9ca3af]">
            {props.firstEntry}–{props.lastEntry} of {props.totalCount}
          </span>
        </div>

        {props.loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="p-4 mx-3 mb-1">
                <Skeleton className="h-32 w-full rounded-xl bg-[#efefef]" />
              </div>
            ))
          : props.rows.length === 0
          ? (
              <div className="py-12 text-center text-sm text-[#575757]">
                No cases found for the selected filters.
              </div>
            )
          : props.rows.map((row) => {
              const isAmber = isOverdueOrToday(row.dueDate)
              const dueDateColor = dueDateTextColor(row.dueDate, row.rush)
              const mobileIsLocked = !!row.rush
              const cardBg = mobileIsLocked ? AMBER : isAmber ? AMBER : "#FFFFFF"

              return (
                <div
                  key={row.id}
                  style={{ backgroundColor: cardBg, border: "1px solid #C8C8C8", borderBottom: "3px solid #C8C8C8" }}
                  className="px-4 pt-3 pb-4 relative mb-2 rounded-lg"
                >
                  {/* Header: checkbox + patient name + rush + kebab */}
                  <div className="flex items-start gap-2">
                    <div
                      className="shrink-0 mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        aria-label={`Select ${row.patient || row.slipNumber || row.id}`}
                        checked={props.selected.includes(row.id)}
                        onCheckedChange={() => props.onSelectRow(row.id)}
                        style={{ width: 20, height: 20 }}
                      />
                    </div>

                    <button
                      type="button"
                      className="flex-1 text-left min-w-0"
                      onClick={() => props.rowActions.onOpen(row)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[15px] text-black leading-snug">
                          {row.patient || "Unnamed patient"}
                        </span>
                        {row.rush && (
                          <img src="/icons/rush-bolt.svg" alt="Rush" aria-label="Rush" style={{ width: 11, height: 19, flexShrink: 0 }} />
                        )}
                      </div>
                      <div className="text-[12px] text-[#575757] mt-0.5">
                        {row.slipNumber || row.caseNumber || `#${row.id}`}
                      </div>
                      <div className="text-[12px] text-[#575757]">
                        {row.createdAt ? formatCreatedAt(row.createdAt) : ""}
                      </div>
                    </button>

                    {/* Kebab */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        aria-label="Row actions"
                        className="p-1 rounded text-[#6b7280]"
                        onClick={(e) => { e.stopPropagation(); setPopoverRow(popoverRow === row.id ? null : row.id) }}
                      >
                        {KEBAB_SVG}
                      </button>
                      {popoverRow === row.id && (
                        <V3RowActionsPopover
                          row={row}
                          actions={props.rowActions}
                          canPrintStatement={props.canPrintStatement(row)}
                          canSendBack={props.canSendBack(row)}
                          onClose={() => setPopoverRow(null)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mt-3 mb-3 border-t border-[#E2E4E8]" />

                  {/* Body */}
                  <div className="space-y-3">
                    {/* OFFICE + DUE DATE */}
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-semibold text-[#9ca3af] tracking-wider mb-1">OFFICE</div>
                        <div className="text-[14px] font-bold text-black">{row.officeCode || "—"}</div>
                        {row.doctor && <div className="text-[12px] text-[#575757]">{row.doctor}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-[#9ca3af] tracking-wider mb-1">DUE DATE</div>
                        <button
                          type="button"
                          className="flex items-center gap-1 justify-end"
                          onClick={(e) => { e.stopPropagation(); props.rowActions.onChangeDueDate(row) }}
                        >
                          <img src="/icons/slip-listing/calendar.png" alt="" className="h-4 w-4 shrink-0" />
                          <span className="text-[14px] font-semibold" style={{ color: dueDateColor }}>
                            {formatDueDate(row.dueDate)}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* LOCATION */}
                    {row.location && (
                      <div
                        className="flex flex-row items-center gap-2 rounded-[10px] px-2 py-2"
                        style={{ background: "rgba(255,255,255,0.6)", border: "1.1px solid rgba(0,0,0,0.05)" }}
                      >
                        <img
                          src={mobileLocationIcon(row.locationId)}
                          alt=""
                          className="shrink-0"
                          style={{ width: 29, height: 22, objectFit: "contain" }}
                        />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span
                            className="tracking-[0.275px] uppercase"
                            style={{ fontSize: 11, lineHeight: "16px", color: "#968F8F", fontFamily: "Inter, sans-serif" }}
                          >
                            Location
                          </span>
                          <span
                            className="truncate w-full"
                            style={{ fontSize: 14, lineHeight: "21px", color: "#000000", fontFamily: "Helvetica, Arial, sans-serif" }}
                          >
                            {row.location}
                          </span>
                        </div>
                        {row.pan && (
                          <div
                            className="flex items-center justify-center shrink-0 rounded-[6px] px-3"
                            style={{ background: PAN_BG, height: 24 }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#F7F7F7", fontFamily: "Helvetica, Arial, sans-serif" }}>
                              {row.pan}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <div className="hidden md:block px-[15px] py-[5px]" style={{ overflowX: "auto", overflowY: "visible" }}>
      <table className="w-full text-left" style={{ fontFamily: "Helvetica, Arial, sans-serif", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          {/* Figma: bg #F2F2F2, border #C8C8C8, border-radius 7px 7px 0 0, height 41px */}
          <tr style={{ background: "#F2F2F2", border: "1px solid #C8C8C8", borderRadius: "7px 7px 0 0" }}>
            <th className="w-[34px] px-0 py-0" style={{ height: 41 }}>
              <div className="flex items-center justify-center" style={{ width: 34, height: 41 }}>
                <Checkbox
                  aria-label="Select all cases on this page"
                  checked={props.selectAllChecked}
                  onCheckedChange={props.onSelectAll}
                  style={{ width: 24, height: 24 }}
                />
              </div>
            </th>
            {desktopColumns.map((column) => (
              <th
                key={column.key}
                className={`px-[10px] py-0 text-left`}
                style={{
                  width: column.width,
                  height: 41,
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: "21px",
                  color: "#000000",
                }}
              >
                {column.label}
              </th>
            ))}
            <th className="w-[40px] px-[10px] py-0" style={{ height: 41 }} aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {props.loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i} style={{ borderLeft: "1px solid #C8C8C8", borderRight: "1px solid #C8C8C8", height: 65 }}>
                <td colSpan={columnCount} className="px-5">
                  <Skeleton className="h-8 w-full bg-[#efefef]" />
                </td>
              </tr>
            ))
          ) : props.rows.length === 0 ? (
            <tr style={{ borderLeft: "1px solid #C8C8C8", borderRight: "1px solid #C8C8C8" }}>
              <td colSpan={columnCount} className="py-12 text-center" style={{ fontSize: 16, color: "#575757" }}>
                No cases found for the selected filters.
              </td>
            </tr>
          ) : (
            props.rows.map((row, idx) => {
              const isAmber = isOverdueOrToday(row.dueDate)
              const isEvenRow = idx % 2 === 1
              const defaultBg = isAmber ? AMBER : isEvenRow ? "#F2F3F4" : "#FFFFFF"
              const isLocked = !!row.rush
              const rowBg = isLocked ? AMBER : defaultBg
              const dueDateColor = dueDateTextColor(row.dueDate, row.rush)

              return (
                <tr
                  key={row.id}
                  ref={popoverRow === row.id ? popoverRef : undefined}
                  style={{
                    backgroundColor: rowBg,
                    borderLeft: "1px solid #C8C8C8",
                    borderRight: "1px solid #C8C8C8",
                    height: 65,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLocked) {
                      e.currentTarget.querySelectorAll("td").forEach((td) => { (td as HTMLElement).style.backgroundColor = "#e8e8e8" })
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.querySelectorAll("td").forEach((td) => { (td as HTMLElement).style.backgroundColor = rowBg })
                  }}
                >
                  {/* Checkbox */}
                  <td className="px-0 py-0 align-middle" style={{ backgroundColor: rowBg }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center" style={{ width: 34, height: 65 }}>
                      <Checkbox
                        aria-label={`Select ${row.patient || row.slipNumber || row.id}`}
                        checked={props.selected.includes(row.id)}
                        onCheckedChange={() => props.onSelectRow(row.id)}
                        style={{ width: 24, height: 24 }}
                      />
                    </div>
                  </td>

                  {desktopColumns.map((column) => (
                    <DesktopCell
                      key={column.key}
                      column={column}
                      dueDateColor={dueDateColor}
                      row={row}
                      rowActions={props.rowActions}
                      rowBg={rowBg}
                    />
                  ))}

                  {/* Kebab — opens V3 horizontal popover */}
                  <td className="px-0 py-0 align-middle" style={{ width: 40, backgroundColor: rowBg, position: "relative", overflow: "visible" }}>
                    <div className="flex items-center justify-center" style={{ width: 40, height: 65 }}>
                      <button
                        aria-label="Row actions"
                        type="button"
                        style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4 }}
                        onClick={(e) => { e.stopPropagation(); setPopoverRow(popoverRow === row.id ? null : row.id) }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F2F3F4" }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none" }}
                      >
                        {KEBAB_SVG}
                      </button>
                    </div>
                    {popoverRow === row.id && (
                      <V3RowActionsPopover
                        row={row}
                        actions={props.rowActions}
                        canPrintStatement={props.canPrintStatement(row)}
                        canSendBack={props.canSendBack(row)}
                        onClose={() => setPopoverRow(null)}
                      />
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      </div>
    </>
  )
}

function DesktopCell({
  column,
  dueDateColor,
  row,
  rowActions,
  rowBg,
}: {
  column: DesktopColumn
  dueDateColor: string
  row: V2CaseRowData
  rowActions: V2RowActions
  rowBg: string
}) {
  if (column.key === "patient") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <button
          className="flex h-full w-full flex-col items-start justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
          style={{ padding: "10px 15px", gap: 2, height: 65 }}
          type="button"
          onClick={() => rowActions.onOpen(row)}
        >
          <div className="flex items-center min-w-0" style={{ gap: 5 }}>
            <span
              className="truncate"
              style={{ fontSize: 18, lineHeight: "21px", color: "#000000", fontWeight: 400, maxWidth: column.width - 40 }}
            >
              {row.patient || "Unnamed patient"}
            </span>
            {row.rush && (
              <img src="/icons/rush-bolt.svg" alt="Rush" aria-label="Rush" style={{ width: 14, height: 24, flexShrink: 0 }} />
            )}
          </div>
        </button>
      </td>
    )
  }

  if (column.key === "slip") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <button
          className="flex h-full w-full items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
          style={{ padding: "10px 15px" }}
          type="button"
          onClick={() => rowActions.onOpen(row)}
        >
          <span style={{ fontSize: 16, lineHeight: "18px", color: "#575757" }}>
            {row.slipNumber || `#${row.id}`}
          </span>
        </button>
      </td>
    )
  }

  if (column.key === "panProduct") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <div className="flex flex-col items-start justify-center" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
          <div
            className="flex items-center justify-center"
            style={{ background: PAN_BG, borderRadius: 6, width: 94, height: 24, gap: 10, ...row.panColorStyle }}
          >
            <span style={{ fontSize: 16, lineHeight: "18px", fontWeight: 700, color: "#F7F7F7" }}>
              {row.pan || "—"}
            </span>
          </div>
          <div style={{ fontSize: 14, lineHeight: "16px", color: "#575757", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.product || "—"}
          </div>
        </div>
      </td>
    )
  }

  if (column.key === "location") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <div className="flex flex-row items-center" style={{ padding: "5px 15px", gap: 10, height: 65 }}>
          {locationIcon(row.locationId)}
          <button
            className="truncate text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
            style={{ fontSize: 18, lineHeight: "21px", color: "#000000", background: "none", border: "none", cursor: "pointer", maxWidth: column.width - 70 }}
            title={isReadyToSendLocation(row) ? "Mark ready to send" : "View driver history"}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              isReadyToSendLocation(row) ? rowActions.onReadyToSend(row) : rowActions.onDriverHistory(row)
            }}
          >
            {row.location || "Unknown"}
          </button>
        </div>
      </td>
    )
  }

  if (column.key === "dueDate") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <div className="flex flex-row items-center" style={{ padding: "5px 15px", gap: 10, height: 65 }}>
          <img src="/icons/slip-listing/calendar.png" alt="" className="h-5 w-5 shrink-0" />
          <button
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
            style={{ fontSize: 18, lineHeight: "21px", color: dueDateColor, background: "none", border: "none", cursor: "pointer" }}
            type="button"
            onClick={(e) => { e.stopPropagation(); rowActions.onChangeDueDate(row) }}
          >
            {formatDueDate(row.dueDate)}
          </button>
        </div>
      </td>
    )
  }

  if (column.key === "status") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <div className="flex flex-col items-start justify-center" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
          <StatusPill status={row.status} />
        </div>
      </td>
    )
  }

  if (column.key === "office") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <div className="flex flex-col items-start justify-center" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
          <div style={{ fontSize: 18, lineHeight: "21px", color: "#000000" }}>{row.officeCode || "—"}</div>
          {row.doctor && <div style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>{row.doctor}</div>}
        </div>
      </td>
    )
  }

  if (column.key === "caseNo") {
    return (
      <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
        <div className="flex h-[65px] items-center" style={{ padding: "5px 15px" }}>
          <span style={{ fontSize: 16, lineHeight: "18px", color: "#575757" }}>{row.caseNumber || "—"}</span>
        </div>
      </td>
    )
  }

  return (
    <td className="px-0 py-0 align-middle" style={{ width: column.width, backgroundColor: rowBg }}>
      <div className="flex h-[65px] items-center" style={{ padding: "5px 15px" }}>
        <span style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>{row.createdAt || "—"}</span>
      </div>
    </td>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === "In Progress") return <SlipListingStatusBadge tone="in-progress">In Progress</SlipListingStatusBadge>
  if (status === "On hold" || status === "On Hold") return <SlipListingStatusBadge tone="on-hold">On Hold</SlipListingStatusBadge>
  if (isSlipCaseCancelled(status)) return <SlipListingStatusBadge tone="cancelled">Cancelled</SlipListingStatusBadge>
  if (isSlipCaseFinished(status)) return <SlipListingStatusBadge tone="finished">Done</SlipListingStatusBadge>
  return <SlipListingStatusBadge tone="draft">{status || "Unknown"}</SlipListingStatusBadge>
}

function mobileLocationIcon(locationId?: number): string {
  if (locationId === 1 || locationId === 4) return `${VS}/pick-up.svg`
  if (locationId === 2 || locationId === 5) return `${VS}/drop-off.svg`
  if (locationId === 3) return `${VS}/ready-to-send.svg`
  if (locationId === 6) return `${VS}/in-office.png`
  return `${VS}/pick-up.svg`
}

function locationIcon(locationId?: number) {
  const imgProps = { style: { width: 28, height: 28, filter: monoFilter, objectFit: "contain" as const }, "aria-hidden": true, alt: "" }
  if (locationId === 1 || locationId === 4) return <img src={`${VS}/pick-up.svg`} {...imgProps} />
  if (locationId === 2 || locationId === 5) return <img src={`${VS}/drop-off.svg`} {...imgProps} />
  if (locationId === 3) return <img src={`${VS}/ready-to-send.svg`} {...imgProps} />
  if (locationId === 6) return <img src={`${VS}/in-office.png`} {...imgProps} />
  return <LabLocationIcon className="h-4 w-4 shrink-0 opacity-60" />
}

function formatCreatedAt(createdAt: string): string {
  if (!createdAt) return ""
  const d = new Date(createdAt)
  if (isNaN(d.getTime())) return createdAt
  return d.toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", hour: "numeric", minute: "2-digit", hour12: true })
}

function isReadyToSendLocation(row: V2CaseRowData) {
  if (row.locationId === 3) return true
  return row.location === SLIP_LOCATION_FILTER_OPTIONS.find((o) => o.id === 3)?.label
}

function isOverdueOrToday(dueDate: string): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  if (isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due.getTime() <= today.getTime()
}

function dueDateTextColor(dueDate: string, rush?: boolean): string {
  if (rush) return "#347B4E"
  if (!dueDate) return "#575757"
  const due = new Date(dueDate)
  if (isNaN(due.getTime())) return "#575757"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due.getTime() <= today.getTime() ? "#347B4E" : "#2BA5DE"
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
