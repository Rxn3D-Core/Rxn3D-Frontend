"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"
import { slipIsInOffice, slipShowsPickupDropoff } from "@/lib/slip-location"
import { isOfficeCustomerContext } from "@/lib/role-utils"
import { SlipListingStatusBadge } from "@/components/slip-listing/SlipListingStatusBadge"
import { SlipListingVsIcon } from "@/components/slip-listing/SlipListingVsIcon"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"
import { LabLocationIcon } from "@/app/lab-case-management/v2/components/V2CaseIcons"
import { V3RowActionsPopover } from "./V3RowActionsPopover"
import type { ColumnKey } from "./V3FilterBar"

const AMBER = "#FFE2A1"
const OVERDUE_RED = "#DC2626"
const PAN_BG = "#FF5733"
const VS = "/icons/virtual-slip-center"
const monoFilter = ""
/** Fallback width while the hover action strip mounts / is measured. */
const ROW_ACTIONS_SHIFT_FALLBACK_PX = 360
const ROW_ACTIONS_RESERVE_TRANSITION =
  "width 350ms cubic-bezier(0.16, 1, 0.3, 1), max-width 350ms cubic-bezier(0.16, 1, 0.3, 1)"

const KEBAB_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
)

export type SortDirection = "asc" | "desc"

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
  canCancelCase?: boolean
  canDeleteCase?: boolean
  /**
   * Office profile listing: the counterparty column reads "Lab", driver
   * actions are withheld, and rush rows lose the amber highlight (a
   * lab-visibility cue). Defaults false.
   */
  officeProfile?: boolean
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
  // whole-table sorting
  sortKey: ColumnKey | null
  sortDirection: SortDirection
  onSortChange: (key: ColumnKey) => void
  // Case Pan Tracking's designated rush-group pan color, applied to rush rows' pan chip
  rushCasePanColor: string | null
}

type DesktopColumn = {
  key: ColumnKey
  label: string
  width: number
}

const DESKTOP_COLUMN_DEFS: readonly DesktopColumn[] = [
  { key: "office", label: "Office", width: 100 },
  { key: "patient", label: "Patient / Slip", width: 180 },
  { key: "panProduct", label: "Pan / Product", width: 125 },
  { key: "location", label: "Location", width: 230 },
  { key: "attachments", label: "Attachments", width: 55 },
  { key: "status", label: "Status", width: 100 },
  { key: "caseNo", label: "Case #", width: 70 },
  { key: "dueDate", label: "Due Date", width: 160 },
]

function buildDesktopColumns(visibleColumns: Set<ColumnKey>, officeProfile: boolean): DesktopColumn[] {
  return DESKTOP_COLUMN_DEFS.filter(
    (column) => column.key === "panProduct" || column.key === "status" || visibleColumns.has(column.key)
  ).map((column) =>
    // The counterparty column names the other side of the case: an office user
    // is looking at labs, a lab user at offices.
    column.key === "office" && officeProfile ? { ...column, label: "Lab" } : column
  )
}

/** Safari can mis-hit absolute overlays / pointer-events-none table cells — ignore real controls. */
function isRowInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'a,button,input,textarea,select,label,[role="checkbox"],[role="menuitem"],[data-row-interactive="true"]'
    )
  )
}

function openVirtualSlipFromRow(
  row: V2CaseRowData,
  onOpen: V2RowActions["onOpen"],
  event?: { metaKey?: boolean; ctrlKey?: boolean; button?: number }
) {
  const href = buildVirtualSlipV2Path(row.id)
  if (event && (event.metaKey || event.ctrlKey || event.button === 1)) {
    window.open(href, "_blank", "noopener,noreferrer")
    return
  }
  onOpen(row)
}

export function V3CaseTable(props: Props) {
  const [popoverRow, setPopoverRow] = useState<number | null>(null)
  // Measured width of the hover action strip; applied to Due Date on hover.
  const [actionsShiftPx, setActionsShiftPx] = useState(0)
  // Separate refs: the mobile card list and desktop table both render for
  // every row (one hidden via CSS per breakpoint), so both a mobile and a
  // desktop V3RowActionsPopover mount at once for the same popoverRow. A
  // single shared ref gets overwritten by whichever mounts last, making the
  // outside-click check test the wrong (hidden) node and close the visible
  // one on every tap inside it.
  const mobilePopoverRef = useRef<HTMLDivElement>(null)
  const desktopPopoverRef = useRef<HTMLDivElement>(null)
  const officeProfile =
    props.officeProfile === true || isOfficeCustomerContext()
  // Lab listings tint rush rows amber; office profiles (admin / doctor / user)
  // keep the rush bolt only — no yellow row adaptation.
  const highlightRushRows = !officeProfile
  const desktopColumns = buildDesktopColumns(props.visibleColumns, officeProfile)
  // checkbox + data columns + kebab
  const columnCount = desktopColumns.length + 2
  // When any row is hovered, widen Due Date so values stay visible under the action strip.
  const dueDateReservePx = popoverRow !== null ? actionsShiftPx : 0

  useEffect(() => {
    if (popoverRow === null) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      const insideMobile = mobilePopoverRef.current?.contains(target) ?? false
      const insideDesktop = desktopPopoverRef.current?.contains(target) ?? false
      if (!insideMobile && !insideDesktop) {
        setPopoverRow(null)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [popoverRow])

  useLayoutEffect(() => {
    if (popoverRow === null) {
      setActionsShiftPx(0)
      return
    }
    setActionsShiftPx(ROW_ACTIONS_SHIFT_FALLBACK_PX)
    const frame = requestAnimationFrame(() => {
      const width = desktopPopoverRef.current?.offsetWidth ?? 0
      if (width > 0) setActionsShiftPx(width)
    })
    return () => cancelAnimationFrame(frame)
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
              const dueDateColor = dueDateTextColor(row)
              // The amber rush highlight is a lab-visibility cue — office
              // profiles keep the rush bolt icon but not the tinted row.
              const cardBg = row.rush && highlightRushRows ? AMBER : "#FFFFFF"
              const virtualSlipHref = buildVirtualSlipV2Path(row.id)
              const openSlipLabel = `Open virtual slip for ${row.patient || row.slipNumber || row.id}`

              return (
                <div
                  key={row.id}
                  style={{ backgroundColor: cardBg, border: "1px solid #C8C8C8", borderBottom: "3px solid #C8C8C8" }}
                  className="relative px-4 pt-3 pb-4 mb-2 rounded-lg cursor-pointer"
                  onClick={(e) => {
                    if (isRowInteractiveTarget(e.target)) return
                    openVirtualSlipFromRow(row, props.rowActions.onOpen, e)
                  }}
                >
                  {/* Header: checkbox + patient name + rush + kebab */}
                  <div className="relative z-[2] flex items-start gap-2">
                    <div
                      className="shrink-0 mt-0.5"
                      data-row-interactive="true"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        aria-label={`Select ${row.patient || row.slipNumber || row.id}`}
                        checked={props.selected.includes(row.id)}
                        onCheckedChange={() => props.onSelectRow(row.id)}
                        style={{ width: 20, height: 20 }}
                      />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={virtualSlipHref}
                          aria-label={openSlipLabel}
                          className="font-semibold text-[15px] text-black leading-snug truncate hover:text-[#1162A8] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.patient || "Unnamed patient"}
                        </Link>
                        {row.rush && (
                          <img src="/icons/rush-bolt.svg" alt="Rush" aria-label="Rush" style={{ width: 11, height: 19, flexShrink: 0 }} />
                        )}
                      </div>
                      <div className="text-[12px] text-[#575757] mt-0.5">
                        {row.slipNumber || row.caseNumber || `#${row.id}`}
                      </div>
                      {props.visibleColumns.has("timestamp") && row.createdAt && (
                        <div className="text-[12px] text-[#575757]">
                          {formatCreatedAt(row.createdAt)}
                        </div>
                      )}
                    </div>

                    {/* Kebab */}
                    <div className="relative shrink-0" data-row-interactive="true">
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
                          ref={mobilePopoverRef}
                          variant="mobile"
                          row={row}
                          actions={props.rowActions}
                          canPrintStatement={props.canPrintStatement(row)}
                          canSendBack={!officeProfile && props.canSendBack(row)}
                          canCancelCase={props.canCancelCase}
                          canDeleteCase={props.canDeleteCase}
                          allowDriverActions={!officeProfile}
                          allowRush={!officeProfile}
                          onClose={() => setPopoverRow(null)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative z-[2] mt-3 mb-3 border-t border-[#E2E4E8]" />

                  {/* Body */}
                  <div className="relative z-[2] space-y-3">
                    {/* OFFICE + DUE DATE */}
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-semibold text-[#9ca3af] tracking-wider mb-1">{officeProfile ? "LAB" : "OFFICE"}</div>
                        <div className="text-[14px] font-bold text-black">{row.officeCode || "—"}</div>
                        {row.doctor && <div className="text-[12px] text-[#575757]">{row.doctor}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-[#9ca3af] tracking-wider mb-1">DUE DATE</div>
                        {officeProfile ? (
                          <span className="text-[14px] font-semibold" style={{ color: dueDateColor }}>
                            {formatDueDate(row)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="flex items-center gap-1 justify-end"
                            data-row-interactive="true"
                            onClick={(e) => { e.stopPropagation(); props.rowActions.onChangeDueDate(row) }}
                          >
                            <img src="/icons/slip-listing/calendar.png" alt="" className="h-4 w-4 shrink-0" />
                            <span className="text-[14px] font-semibold" style={{ color: dueDateColor }}>
                              {formatDueDate(row)}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DIGITAL IMPRESSIONS (Attachments) */}
                    {props.visibleColumns.has("attachments") && !!row.digitalImpressions?.length && (
                      <div>
                        <div className="mb-1 flex items-center">
                          <SlipListingVsIcon src={`${VS}/attachments.svg`} hover={false} />
                        </div>
                        <DigitalImpressionLabels impressions={row.digitalImpressions} />
                      </div>
                    )}

                    {/* LOCATION */}
                    {row.location && (() => {
                      const mobileLocationAction = row.newStageEligible
                        ? "addStage"
                        : !officeProfile
                        ? isReadyToSendLocation(row)
                          ? "readyToSend"
                          : isPickupDropoffLocation(row)
                            ? "driverHistory"
                            : null
                        : null
                      const locationInner = (
                        <>
                          <img
                            src={mobileLocationIcon(row)}
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
                              className="truncate w-full text-left"
                              style={{ fontSize: 14, lineHeight: "21px", color: "#000000", fontFamily: "Inter, sans-serif" }}
                            >
                              {row.location}
                            </span>
                          </div>
                          {row.pan && (
                            <div
                              className="flex items-center justify-center shrink-0 rounded-[6px] px-3"
                              style={{
                                background: PAN_BG,
                                height: 24,
                                ...row.panColorStyle,
                                ...(row.rush && highlightRushRows && props.rushCasePanColor
                                  ? { backgroundColor: props.rushCasePanColor }
                                  : null),
                              }}
                            >
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#F7F7F7", fontFamily: "Inter, sans-serif" }}>
                                {row.pan}
                              </span>
                            </div>
                          )}
                        </>
                      )
                      return mobileLocationAction ? (
                        <button
                          type="button"
                          className="flex w-full flex-row items-center gap-2 rounded-[10px] px-2 py-2 text-left"
                          style={{ background: "rgba(255,255,255,0.6)", border: "1.1px solid rgba(0,0,0,0.05)", cursor: "pointer" }}
                          title={mobileLocationAction === "addStage" ? "Add stage" : mobileLocationAction === "readyToSend" ? "Mark ready to send" : "View driver history"}
                          onClick={(e) => {
                            e.stopPropagation()
                            mobileLocationAction === "addStage"
                              ? props.rowActions.onAddStage(row)
                              : mobileLocationAction === "readyToSend"
                              ? props.rowActions.onReadyToSend(row)
                              : props.rowActions.onDriverHistory(row)
                          }}
                        >
                          {locationInner}
                        </button>
                      ) : (
                        <div
                          className="flex flex-row items-center gap-2 rounded-[10px] px-2 py-2"
                          style={{ background: "rgba(255,255,255,0.6)", border: "1.1px solid rgba(0,0,0,0.05)" }}
                        >
                          {locationInner}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <div className="hidden md:block" style={{ overflowX: "auto", overflowY: "visible" }}>
      <table
        className="w-full text-left"
        style={{
          fontFamily: "Inter, sans-serif",
          borderCollapse: "separate",
          borderSpacing: 0,
          // Fixed layout so the hover actions spacer steals width from data
          // columns (Due Date stays under its header instead of sliding away).
          tableLayout: "fixed",
        }}
      >
        <thead>
          {/* Figma: bg #F2F2F2, border #C8C8C8, border-radius 7px 7px 0 0, height 41px */}
          <tr style={{ background: "#F2F2F2", border: "1px solid #C8C8C8", borderRadius: "7px 7px 0 0" }}>
            <th className="w-[25px] px-2 py-0" style={{ height: 25, width: 25 }}>
              <div className="flex items-center justify-center" style={{ width: 20, height: 20 }}>
                <Checkbox
                  aria-label="Select all cases on this page"
                  checked={props.selectAllChecked}
                  onCheckedChange={props.onSelectAll}
                  style={{ width: 20, height: 20 }}
                />
              </div>
            </th>
            {desktopColumns.map((column) => {
              const extraWidth = column.key === "dueDate" ? dueDateReservePx : 0
              return (
              <th
                key={column.key}
                className={`px-[10px] py-0 select-none cursor-pointer overflow-hidden ${column.key === "attachments" ? "text-center" : "text-left"}`}
                style={{
                  width: column.width + extraWidth,
                  maxWidth: column.width + extraWidth,
                  height: 41,
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: "21px",
                  color: "#000000",
                  transition: column.key === "dueDate" ? ROW_ACTIONS_RESERVE_TRANSITION : undefined,
                }}
                onClick={() => props.onSortChange(column.key)}
                aria-sort={props.sortKey === column.key ? (props.sortDirection === "asc" ? "ascending" : "descending") : "none"}
                aria-label={column.key === "attachments" ? "Attachments" : undefined}
              >
                <span className={`inline-flex max-w-full items-center gap-1 min-w-0 ${column.key === "attachments" ? "justify-center w-full" : ""}`}>
                  {column.key === "attachments" ? (
                    <SlipListingVsIcon src={`${VS}/attachments.svg`} hover={false} />
                  ) : (
                    <span className="truncate">{column.label}</span>
                  )}
                  <span className="shrink-0" style={{ fontSize: 12, color: props.sortKey === column.key ? "#000" : "#9ca3af" }}>
                    {props.sortKey === column.key ? (props.sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </span>
              </th>
            )})}
            <th className="px-0 py-0" style={{ height: 41, width: 40 }} aria-hidden="true" />
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
              const isEvenRow = idx % 2 === 1
              const rowBg = row.rush && highlightRushRows ? AMBER : isEvenRow ? "#F2F3F4" : "#FFFFFF"
              const dueDateColor = dueDateTextColor(row)
              // Only lab rush rows lock hover (amber stays put). Office rush rows
              // use normal zebra + hover like every other row.
              const isLocked = !!row.rush && highlightRushRows
              const virtualSlipHref = buildVirtualSlipV2Path(row.id)
              const openSlipLabel = `Open virtual slip for ${row.patient || row.slipNumber || row.id}`

              return (
                <tr
                  key={row.id}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: rowBg,
                    borderLeft: "1px solid #C8C8C8",
                    borderRight: "1px solid #C8C8C8",
                    height: 65,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLocked) {
                      e.currentTarget.querySelectorAll("td").forEach((td) => { (td as HTMLElement).style.backgroundColor = "#e8e8e8" })
                    }
                    setPopoverRow(row.id)
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.querySelectorAll("td").forEach((td) => { (td as HTMLElement).style.backgroundColor = rowBg })
                    setPopoverRow((cur) => (cur === row.id ? null : cur))
                  }}
                  onClick={(e) => {
                    // Safari: do not use absolute Link overlays on <tr> — hit targets misalign.
                    if (isRowInteractiveTarget(e.target)) return
                    openVirtualSlipFromRow(row, props.rowActions.onOpen, e)
                  }}
                  onAuxClick={(e) => {
                    if (e.button !== 1) return
                    if (isRowInteractiveTarget(e.target)) return
                    e.preventDefault()
                    openVirtualSlipFromRow(row, props.rowActions.onOpen, { button: 1 })
                  }}
                >
                  <td
                    className="px-2 py-0 align-middle"
                    style={{ backgroundColor: rowBg, width: 25 }}
                    data-row-interactive="true"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center" style={{ width: 20, height: 65 }}>
                      <Checkbox
                        aria-label={`Select ${row.patient || row.slipNumber || row.id}`}
                        checked={props.selected.includes(row.id)}
                        onCheckedChange={() => props.onSelectRow(row.id)}
                        style={{ width: 20, height: 20 }}
                      />
                    </div>
                  </td>

                  {desktopColumns.map((column) => (
                    <DesktopCell
                      key={column.key}
                      column={column}
                      dueDateColor={dueDateColor}
                      dueDateExtraWidth={column.key === "dueDate" ? dueDateReservePx : 0}
                      row={row}
                      rowActions={props.rowActions}
                      rowBg={rowBg}
                      rushCasePanColor={props.rushCasePanColor}
                      showTimestamp={props.visibleColumns.has("timestamp")}
                      allowDriverActions={!officeProfile}
                      highlightRushRows={highlightRushRows}
                      virtualSlipHref={virtualSlipHref}
                      openSlipLabel={openSlipLabel}
                    />
                  ))}

                  {/* Kebab + hover action strip */}
                  <td
                    className="relative px-0 py-0 align-middle"
                    style={{ width: 40, backgroundColor: rowBg, overflow: "visible" }}
                    data-row-interactive="true"
                  >
                    {popoverRow === row.id && (
                      <V3RowActionsPopover
                        ref={desktopPopoverRef}
                        variant="desktop"
                        row={row}
                        actions={props.rowActions}
                        canPrintStatement={props.canPrintStatement(row)}
                        canSendBack={!officeProfile && props.canSendBack(row)}
                        canCancelCase={props.canCancelCase}
                        canDeleteCase={props.canDeleteCase}
                        allowDriverActions={!officeProfile}
                        allowRush={!officeProfile}
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
  dueDateExtraWidth = 0,
  row,
  rowActions,
  rowBg,
  rushCasePanColor,
  showTimestamp,
  allowDriverActions,
  highlightRushRows,
  virtualSlipHref,
  openSlipLabel,
}: {
  column: DesktopColumn
  dueDateColor: string
  dueDateExtraWidth?: number
  showTimestamp: boolean
  allowDriverActions: boolean
  highlightRushRows: boolean
  row: V2CaseRowData
  rowActions: V2RowActions
  rowBg: string
  rushCasePanColor: string | null
  virtualSlipHref: string
  openSlipLabel: string
}) {
  const cellWidth = column.width + dueDateExtraWidth
  // Avoid pointer-events-none on <td> — Safari can send those clicks to the wrong row.
  if (column.key === "patient") {
    return (
      <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
        <div className="flex h-full w-full min-w-0 flex-col items-start justify-center overflow-hidden" style={{ padding: "10px 15px", gap: 2, height: 65 }}>
          <div className="flex items-center min-w-0 w-full" style={{ gap: 5 }}>
            <Link
              href={virtualSlipHref}
              aria-label={openSlipLabel}
              className="truncate min-w-0 hover:text-[#1162A8] hover:underline"
              style={{ fontSize: 18, lineHeight: "21px", color: "#000000", fontWeight: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              {row.patient || "Unnamed patient"}
            </Link>
            {row.rush && (
              <img src="/icons/rush-bolt.svg" alt="Rush" aria-label="Rush" style={{ width: 14, height: 24, flexShrink: 0 }} />
            )}
          </div>
          <span className="truncate w-full" style={{ fontSize: 12, lineHeight: "14px", color: "#9ca3af" }}>
            {row.slipNumber || `#${row.id}`}
            {showTimestamp && row.createdAt ? ` · ${formatCreatedAt(row.createdAt)}` : ""}
          </span>
        </div>
      </td>
    )
  }

  if (column.key === "panProduct") {
    return (
      <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
        <div className="flex min-w-0 flex-col items-start justify-center overflow-hidden" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
          <div
            className="flex items-center justify-center"
            style={{
              background: PAN_BG,
              borderRadius: 6,
              width: 94,
              maxWidth: "100%",
              height: 24,
              gap: 10,
              ...row.panColorStyle,
              ...(row.rush && highlightRushRows && rushCasePanColor
                ? { backgroundColor: rushCasePanColor }
                : null),
            }}
          >
            <span style={{ fontSize: 16, lineHeight: "18px", fontWeight: 700, color: "#F7F7F7" }}>
              {row.pan || "—"}
            </span>
          </div>
          <div className="w-full truncate" style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>
            {row.product || "—"}
          </div>
        </div>
      </td>
    )
  }

  if (column.key === "location") {
    const locationAction = row.newStageEligible
      ? "addStage"
      : allowDriverActions
        ? isReadyToSendLocation(row)
          ? "readyToSend"
          : isPickupDropoffLocation(row)
            ? "driverHistory"
            : null
        : null

    const locationLabel = row.location || "Unknown"

    if (!locationAction) {
      return (
        <td
          className="px-0 py-0 align-middle overflow-hidden"
          style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}
        >
          <div className="flex w-full min-w-0 flex-row items-center overflow-hidden" style={{ padding: "5px 10px", gap: 8, height: 65 }}>
            <span className="shrink-0">{locationIcon(row)}</span>
            <span className="min-w-0 truncate" style={{ fontSize: 18, lineHeight: "21px", color: "#000000" }} title={locationLabel}>
              {locationLabel}
            </span>
          </div>
        </td>
      )
    }

    return (
      <td
        className="px-0 py-0 align-middle overflow-hidden"
        style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}
      >
        <div className="flex w-full min-w-0 flex-row items-center overflow-hidden" style={{ padding: "5px 10px", gap: 8, height: 65 }}>
          <button
            className="flex w-full min-w-0 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8] transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-95"
            style={{ fontSize: 18, lineHeight: "21px", color: "#000000", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            title={locationAction === "addStage" ? "Add stage" : locationAction === "readyToSend" ? "Mark ready to send" : "View driver history"}
            type="button"
            data-row-interactive="true"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              locationAction === "addStage"
                ? rowActions.onAddStage(row)
                : locationAction === "readyToSend"
                ? rowActions.onReadyToSend(row)
                : rowActions.onDriverHistory(row)
            }}
          >
            <span className="shrink-0">{locationIcon(row)}</span>
            <span className="min-w-0 truncate">{locationLabel}</span>
          </button>
        </div>
      </td>
    )
  }

  if (column.key === "dueDate") {
    return (
      <td
        className="px-0 py-0 align-middle overflow-hidden"
        style={{
          width: cellWidth,
          maxWidth: cellWidth,
          backgroundColor: rowBg,
          transition: ROW_ACTIONS_RESERVE_TRANSITION,
        }}
      >
        <div className="flex w-full min-w-0 flex-row items-center overflow-hidden" style={{ padding: "5px 10px", gap: 8, height: 65 }}>
          {allowDriverActions ? (
            <button
              className="flex w-full min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8] transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-95"
              style={{ fontSize: 18, lineHeight: "21px", color: dueDateColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              type="button"
              title="Change due date"
              data-row-interactive="true"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); rowActions.onChangeDueDate(row) }}
            >
              <img src="/icons/slip-listing/calendar.png" alt="" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate">{formatDueDate(row)}</span>
            </button>
          ) : (
            <span className="min-w-0 truncate" style={{ fontSize: 18, lineHeight: "21px", color: dueDateColor }}>
              {formatDueDate(row)}
            </span>
          )}
        </div>
      </td>
    )
  }

  if (column.key === "status") {
    return (
      <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
        <div className="flex flex-col items-start justify-center overflow-hidden" style={{ padding: "5px 10px", gap: 3, height: 65 }}>
          <StatusPill status={row.status} />
        </div>
      </td>
    )
  }

  if (column.key === "office") {
    return (
      <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
        <div className="flex min-w-0 flex-col items-start justify-center overflow-hidden" style={{ padding: "5px 15px", gap: 3, height: 65 }}>
          <div className="truncate w-full" style={{ fontSize: 18, lineHeight: "21px", color: "#000000" }}>{row.officeCode || "—"}</div>
          {row.doctor && <div className="truncate w-full" style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>{row.doctor}</div>}
        </div>
      </td>
    )
  }

  if (column.key === "caseNo") {
    return (
      <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
        <div className="flex h-[65px] min-w-0 items-center overflow-hidden" style={{ padding: "5px 15px" }}>
          <span className="truncate" style={{ fontSize: 16, lineHeight: "18px", color: "#575757" }}>{row.caseNumber || "—"}</span>
        </div>
      </td>
    )
  }

  if (column.key === "attachments") {
    return (
      <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
        <div className="flex h-[65px] items-center justify-center overflow-hidden" style={{ padding: "5px 4px" }} data-row-interactive="true">
          <DigitalImpressionLabels impressions={row.digitalImpressions} />
        </div>
      </td>
    )
  }

  return (
    <td className="px-0 py-0 align-middle overflow-hidden" style={{ width: cellWidth, maxWidth: cellWidth, backgroundColor: rowBg }}>
      <div className="flex h-[65px] min-w-0 items-center overflow-hidden" style={{ padding: "5px 15px" }}>
        <span className="truncate" style={{ fontSize: 14, lineHeight: "16px", color: "#575757" }}>{row.createdAt || "—"}</span>
      </div>
    </td>
  )
}


function DigitalImpressionLabels({
  impressions,
}: {
  impressions?: Array<{ id: number; name: string; code?: string; url?: string | null }>
}) {
  if (!impressions?.length) return null

  return (
    <div className="flex flex-col items-center justify-center gap-0.5">
      {impressions.map((impression) => {
        const label = impression.code || impression.name
        const title = impression.name && impression.code && impression.name !== impression.code
          ? impression.name
          : label
        return impression.url ? (
          <a
            key={impression.id}
            href={impression.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto relative z-[2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]"
            style={{ fontSize: 16, lineHeight: "18px", fontWeight: 600, color: "#1162A8" }}
            title={`Open ${title}`}
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </a>
        ) : (
          <span
            key={impression.id}
            title={title}
            style={{ fontSize: 16, lineHeight: "18px", fontWeight: 600, color: "#1162A8" }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === "In Progress") return <SlipListingStatusBadge tone="in-progress">In Progress</SlipListingStatusBadge>
  if (status === "On hold" || status === "On Hold") return <SlipListingStatusBadge tone="on-hold">On Hold</SlipListingStatusBadge>
  if (isSlipCaseCancelled(status)) return <SlipListingStatusBadge tone="cancelled">Cancelled</SlipListingStatusBadge>
  if (isSlipCaseFinished(status)) return <SlipListingStatusBadge tone="finished">Done</SlipListingStatusBadge>
  if (status.trim().toLowerCase() === "deleted") return <SlipListingStatusBadge tone="deleted">Deleted</SlipListingStatusBadge>
  return <SlipListingStatusBadge tone="draft">{status || "Unknown"}</SlipListingStatusBadge>
}

function mobileLocationIcon(row: V2CaseRowData): string {
  if (row.newStageEligible) return `${VS}/add-stage.svg`
  const locationId = row.locationId
  if (locationId === 1 || locationId === 4) return `${VS}/pick-up.svg`
  if (locationId === 2 || locationId === 5) return `${VS}/drop-off.svg`
  if (locationId === 3) return `/images/paper-airplane.svg`
  if (locationId === 6) return `${VS}/in-office.png`
  return `${VS}/pick-up.svg`
}

function locationIcon(row: V2CaseRowData) {
  if (row.newStageEligible) return <img src={`${VS}/add-stage.svg`} style={{ width: 28, height: 28, objectFit: "contain" as const }} aria-hidden alt="" />
  const locationId = row.locationId
  const imgProps = { style: { width: 28, height: 28, filter: monoFilter, objectFit: "contain" as const }, "aria-hidden": true, alt: "" }
  if (locationId === 1 || locationId === 4) return <img src={`${VS}/pick-up.svg`} {...imgProps} />
  if (locationId === 2 || locationId === 5) return <img src={`${VS}/drop-off.svg`} {...imgProps} />
  if (locationId === 3) return <img src={`/images/paper-airplane.svg`} {...imgProps} />
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

function isPickupDropoffLocation(row: V2CaseRowData) {
  return slipShowsPickupDropoff({ locationId: row.locationId, location: row.location || "" })
}

/** Delivered = physically in office (id 6) or workflow finished — either way it's done. */
function isDeliveredRow(row: V2CaseRowData): boolean {
  return slipIsInOffice({ locationId: row.locationId, location: row.location }) || isSlipCaseFinished(row.status)
}

function dueDateTextColor(row: V2CaseRowData): string {
  // A delivered case can't be late, so it keeps the settled green even when its
  // due date has passed.
  if (isDeliveredRow(row)) return "#347B4E"
  const { dueDate, rush } = row
  if (!dueDate) return "#575757"
  const due = new Date(dueDate)
  if (isNaN(due.getTime())) return "#575757"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  // Overdue outranks rush — a late rush case is the one that most needs flagging.
  if (due.getTime() < today.getTime()) return OVERDUE_RED
  if (rush) return "#347B4E"
  return due.getTime() === today.getTime() ? "#347B4E" : "#2BA5DE"
}

function formatDueDate(row: V2CaseRowData): string {
  const { dueDate } = row
  const due = dueDate ? new Date(dueDate) : null
  const dueValid = due && !isNaN(due.getTime())
  // A delivered case (in office / finished) shows the delivery date instead of a
  // countdown: "Delivered 04/30".
  if (isDeliveredRow(row)) {
    if (!dueValid) return "Delivered"
    return `Delivered ${due!.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })}`
  }
  if (!dueDate) return "—"
  if (!dueValid) return dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due!.setHours(0, 0, 0, 0)
  const days = Math.round((due!.getTime() - today.getTime()) / 86_400_000)
  const mmdd = due!.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })
  const label = days === 0 ? "Today" : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`
  return `${label} · ${mmdd}`
}
