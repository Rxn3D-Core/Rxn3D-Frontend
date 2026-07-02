"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"
import { SlipListingStatusBadge } from "@/components/slip-listing/SlipListingStatusBadge"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"
import { CalendarIcon, LabLocationIcon } from "@/app/lab-case-management/v2/components/V2CaseIcons"
import { V3RowActionsPopover } from "./V3RowActionsPopover"

const AMBER = "#FFE2A1"
const PAN_BG = "#FF5733"
const VS = "/icons/virtual-slip-center"
const monoFilter = ""

const COLUMNS = 8 // checkbox + 6 data cols + kebab

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
}

// Header column widths from Figma
const COL_WIDTHS = {
  checkbox: "w-[34px]",
  patient:  "w-[250px]",
  office:   "w-[200px]",
  pan:      "w-[180px]",
  status:   "w-[150px]",
  location: "w-[300px]",
  dueDate:  "w-[150px]",
  kebab:    "w-[40px]",
}

export function V3CaseTable(props: Props) {
  const [popoverRow, setPopoverRow] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto px-[15px] py-[5px]">
      <table className="w-full text-left" style={{ fontFamily: "Helvetica, Arial, sans-serif", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          {/* Figma: bg #F2F2F2, border #C8C8C8, border-radius 7px 7px 0 0, height 41px */}
          <tr style={{ background: "#F2F2F2", border: "1px solid #C8C8C8", borderRadius: "7px 7px 0 0" }}>
            <th className={`${COL_WIDTHS.checkbox} px-0 py-0`} style={{ height: 41 }}>
              <div className="flex items-center justify-center" style={{ width: 34, height: 41 }}>
                <Checkbox
                  aria-label="Select all cases on this page"
                  checked={props.selectAllChecked}
                  onCheckedChange={props.onSelectAll}
                  style={{ width: 24, height: 24 }}
                />
              </div>
            </th>
            {(["Patient / Slip", "Office", "Pan / Product", "Status", "Location", "Due Date"] as const).map((label, i) => (
              <th
                key={label}
                className={`px-[10px] py-0 text-left`}
                style={{
                  width: [250, 200, 180, 150, 300, 150][i],
                  height: 41,
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: "21px",
                  color: "#000000",
                }}
              >
                {label}
              </th>
            ))}
            <th className={`${COL_WIDTHS.kebab} px-[10px] py-0`} style={{ height: 41 }} aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {props.loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i} style={{ borderLeft: "1px solid #C8C8C8", borderRight: "1px solid #C8C8C8", height: 65 }}>
                <td colSpan={COLUMNS} className="px-5">
                  <Skeleton className="h-8 w-full bg-[#efefef]" />
                </td>
              </tr>
            ))
          ) : props.rows.length === 0 ? (
            <tr style={{ borderLeft: "1px solid #C8C8C8", borderRight: "1px solid #C8C8C8" }}>
              <td colSpan={COLUMNS} className="py-12 text-center" style={{ fontSize: 16, color: "#575757" }}>
                No cases found for the selected filters.
              </td>
            </tr>
          ) : (
            props.rows.map((row, idx) => {
              const isAmber = isOverdueOrToday(row.dueDate)
              const isEvenRow = idx % 2 === 1
              const defaultBg = isAmber ? AMBER : isEvenRow ? "#F2F3F4" : "#FFFFFF"
              const selectedBg = "#e8e5de"
              const rowBg = props.selected.includes(row.id) ? selectedBg : defaultBg
              const dueDateColor = dueDateTextColor(row.dueDate)

              return (
                <tr
                  key={row.id}
                  style={{
                    backgroundColor: rowBg,
                    borderLeft: "1px solid #C8C8C8",
                    borderRight: "1px solid #C8C8C8",
                    height: 65,
                  }}
                  onMouseEnter={(e) => {
                    if (!props.selected.includes(row.id)) {
                      e.currentTarget.querySelectorAll("td").forEach((td) => { (td as HTMLElement).style.backgroundColor = "#FFE2A1" })
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

                  {/* Patient / Slip */}
                  <td className="px-0 py-0 align-middle" style={{ width: 250, backgroundColor: rowBg }}>
                    <button
                      className="flex h-full w-full flex-col items-start justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
                      style={{ padding: "10px 15px", gap: 2, height: 65 }}
                      type="button"
                      onClick={() => props.rowActions.onOpen(row)}
                    >
                      <div className="flex items-center" style={{ gap: 5 }}>
                        <span style={{ fontSize: 18, lineHeight: "21px", color: "#000000", fontWeight: 400 }}>
                          {row.patient || "Unnamed patient"}
                        </span>
                        {row.rush && (
                          <svg width="10" height="17" viewBox="0 0 15 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Rush" style={{ flexShrink: 0 }}>
                            <polygon points="13,0 4,13 8,13 2,26 11,13 7,13" fill="url(#rushGrad)" />
                            <defs>
                              <linearGradient id="rushGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2AA6DE" />
                                <stop offset="50%" stopColor="#82298D" />
                                <stop offset="100%" stopColor="#C9539F" />
                              </linearGradient>
                            </defs>
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>
                        {row.slipNumber || row.caseNumber || `#${row.id}`}
                      </div>
                    </button>
                  </td>

                  {/* Office */}
                  <td className="px-0 py-0 align-middle" style={{ width: 200, backgroundColor: rowBg }}>
                    <div className="flex flex-col items-start justify-center" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
                      <div style={{ fontSize: 18, lineHeight: "21px", color: "#000000" }}>{row.officeCode || "—"}</div>
                      {row.doctor && <div style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>{row.doctor}</div>}
                    </div>
                  </td>

                  {/* Pan / Product */}
                  <td className="px-0 py-0 align-middle" style={{ width: 180, backgroundColor: rowBg }}>
                    <div className="flex flex-col items-start justify-center" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
                      <div
                        className="flex items-center justify-center"
                        style={{ background: PAN_BG, borderRadius: 6, width: 94, height: 24, gap: 10 }}
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

                  {/* Status */}
                  <td className="px-0 py-0 align-middle" style={{ width: 150, backgroundColor: rowBg }}>
                    <div className="flex flex-col items-start justify-center" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
                      <StatusPill status={row.status} />
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-0 py-0 align-middle" style={{ width: 300, backgroundColor: rowBg }}>
                    <div className="flex flex-row items-center" style={{ padding: "5px 15px", gap: 10, height: 65 }}>
                      {locationIcon(row.locationId)}
                      <button
                        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
                        style={{ fontSize: 18, lineHeight: "21px", color: "#000000", background: "none", border: "none", cursor: "pointer" }}
                        title={isReadyToSendLocation(row) ? "Mark ready to send" : "View driver history"}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          isReadyToSendLocation(row) ? props.rowActions.onReadyToSend(row) : props.rowActions.onDriverHistory(row)
                        }}
                      >
                        {row.location || "Unknown"}
                      </button>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-0 py-0 align-middle" style={{ width: 150, backgroundColor: rowBg }}>
                    <div className="flex flex-row items-center" style={{ padding: "5px 15px", gap: 10, height: 65 }}>
                      <CalendarIcon className="h-5 w-5 shrink-0" />
                      <button
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
                        style={{ fontSize: 18, lineHeight: "21px", color: dueDateColor, background: "none", border: "none", cursor: "pointer" }}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); props.rowActions.onChangeDueDate(row) }}
                      >
                        {formatDueDate(row.dueDate)}
                      </button>
                    </div>
                  </td>

                  {/* Kebab — opens V3 horizontal popover */}
                  <td className="px-0 py-0 align-middle" style={{ width: 40, backgroundColor: rowBg, position: "relative" }}>
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
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === "In Progress") return <SlipListingStatusBadge tone="in-progress">In Progress</SlipListingStatusBadge>
  if (status === "On hold" || status === "On Hold") return <SlipListingStatusBadge tone="on-hold">On Hold</SlipListingStatusBadge>
  if (isSlipCaseCancelled(status)) return <SlipListingStatusBadge tone="cancelled">Cancelled</SlipListingStatusBadge>
  if (isSlipCaseFinished(status)) return <SlipListingStatusBadge tone="finished">Done</SlipListingStatusBadge>
  return <SlipListingStatusBadge tone="draft">{status || "Unknown"}</SlipListingStatusBadge>
}

function locationIcon(locationId?: number) {
  const imgProps = { style: { width: 28, height: 28, filter: monoFilter, objectFit: "contain" as const }, "aria-hidden": true, alt: "" }
  if (locationId === 1 || locationId === 4) return <img src={`${VS}/pick-up.svg`} {...imgProps} />
  if (locationId === 2 || locationId === 5) return <img src={`${VS}/drop-off.svg`} {...imgProps} />
  if (locationId === 3) return <img src={`${VS}/ready-to-send.svg`} {...imgProps} />
  if (locationId === 6) return <img src={`${VS}/in-office.png`} {...imgProps} />
  return <LabLocationIcon className="h-4 w-4 shrink-0 opacity-60" />
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

function dueDateTextColor(dueDate: string): string {
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
