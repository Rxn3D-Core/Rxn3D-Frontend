"use client"

import { forwardRef, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { resolveSlipRowActionVisibility } from "@/lib/slip-row-action-visibility"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"

const VS = "/icons/virtual-slip-center"

interface Props {
  row: V2CaseRowData
  actions: V2RowActions
  canPrintStatement: boolean
  canSendBack: boolean
  canEditSlip?: boolean
  canDeleteCase?: boolean
  allowDriverActions?: boolean
  /** Office profiles may see rush status on the row but cannot submit rush from listing. */
  allowRush?: boolean
  onClose: () => void
  // The mobile card list and desktop table both mount a popover instance for
  // the same row.id (one CSS-hidden per breakpoint, never unmounted), so
  // rendering both halves unconditionally would portal two stacked bottom
  // sheets into document.body for a single tap. Each call site renders only
  // the half it owns.
  variant: "desktop" | "mobile"
}

export const V3RowActionsPopover = forwardRef<HTMLDivElement, Props>(function V3RowActionsPopover(
  { row, actions, canPrintStatement, canSendBack, canEditSlip = true, canDeleteCase = true, allowDriverActions = true, allowRush = true, onClose, variant },
  ref,
) {
  const [kebabOpen, setKebabOpen] = useState(false)

  const visibility = useMemo(
    () =>
      resolveSlipRowActionVisibility({
        locationId: row.locationId,
        location: row.location,
        status: row.status,
        canPrintStatement,
        canEditSlip,
        canDeleteCase,
        allowRush,
        allowDriverActions,
      }),
    [row.locationId, row.location, row.status, canPrintStatement, canEditSlip, canDeleteCase, allowRush, allowDriverActions]
  )

  function act(fn: () => void) {
    return (e: React.MouseEvent) => { e.stopPropagation(); fn(); onClose() }
  }

  function locationBtn(): { label: string; icon: string; onClick: (e: React.MouseEvent) => void } | null {
    if (!visibility.location) return null
    if (row.newStageEligible) {
      return { label: "Add stage", icon: `${VS}/add-stage.svg`, onClick: act(() => actions.onAddStage(row)) }
    }
    const id = row.locationId
    if (id === 3) return visibility.readyToSend ? { label: "Ready to Send", icon: `/images/paper-airplane.svg`, onClick: act(() => actions.onReadyToSend(row)) } : null
    if (id === 2 || id === 5) return { label: "Drop Off", icon: `${VS}/drop-off.svg`, onClick: act(() => actions.onDriverHistory(row)) }
    return { label: "Pick Up", icon: `${VS}/pick-up.svg`, onClick: act(() => actions.onDriverHistory(row)) }
  }

  const btns: { label: string; icon: string; onClick: (e: React.MouseEvent) => void }[] = [
    locationBtn(),
    visibility.rush ? { label: "Rush", icon: `${VS}/rush.svg`, onClick: act(() => actions.onRush(row)) } : null,
    visibility.hold ? { label: "Pause", icon: `/icons/virtual-slip-actions/on-hold.png`, onClick: act(() => actions.onHold(row)) } : null,
    visibility.cancel ? { label: "Cancel", icon: `${VS}/cancel.svg`, onClick: act(() => actions.onCancel(row)) } : null,
    visibility.sendBack && canSendBack ? { label: "Send Back", icon: `${VS}/send-back-to-office.svg`, onClick: act(() => actions.onSendBack(row)) } : null,
    visibility.print ? { label: "Print", icon: `/icons/virtual-slip-actions/printer.svg`, onClick: act(() => actions.onPrintPaperSlip(row)) } : null,
    visibility.invoice ? { label: "Invoice", icon: `/icons/virtual-slip-actions/print-invoice.svg`, onClick: act(() => actions.onPrintStatement(row)) } : null,
    visibility.schedule ? { label: "Schedule", icon: `/icons/slip-listing/calendar.png`, onClick: act(() => actions.onChangeDueDate(row)) } : null,
    visibility.addOns ? { label: "Add", icon: `${VS}/add-general.svg`, onClick: act(() => actions.onAddOns(row)) } : null,
    visibility.callLog ? { label: "Call Log", icon: `${VS}/call-log.svg`, onClick: act(() => actions.onCallLog(row)) } : null,
    visibility.attach ? { label: "Attach", icon: `${VS}/attachments.svg`, onClick: act(() => actions.onAttachment(row)) } : null,
  ].filter((btn): btn is { label: string; icon: string; onClick: (e: React.MouseEvent) => void } => btn != null)

  const visibleBtns = btns

  const kebabItems = [
    visibility.editSlip ? { label: "Edit Slip", fn: () => actions.onOpen(row) } : null,
    visibility.printDriverLabel ? { label: "Print Driver Label", fn: () => actions.onPrintDriverLabel(row) } : null,
    visibility.printStatement ? { label: "Print Statement", fn: () => actions.onPrintStatement(row) } : null,
  ].filter((item): item is { label: string; fn: () => void } => item != null)

  if (variant === "mobile") {
    return <MobileActionsSheet ref={ref} btns={visibleBtns} onClose={onClose} />
  }

  return (
    <div
      ref={ref}
      className="hidden md:flex"
      style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          width: "fit-content",
          height: 56,
          background: "#FFFFFF",
          border: "1px solid #E2E4E8",
          boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
          borderRadius: 7,
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "10px 15px",
          gap: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {visibleBtns.map(({ label, icon, onClick }) => (
          <button
            key={label}
            aria-label={label}
            title={label}
            type="button"
            onClick={onClick}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F2F3F4" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none" }}
          >
            <img src={icon} alt={label} style={{ width: 28, height: 28, objectFit: "contain" }} />
          </button>
        ))}

        {kebabItems.length > 0 && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            aria-label="More actions"
            title="More actions"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6, border: "none",
              background: kebabOpen ? "#F2F3F4" : "none", cursor: "pointer",
            }}
            onClick={(e) => { e.stopPropagation(); setKebabOpen(o => !o) }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F2F3F4" }}
            onMouseLeave={(e) => { if (!kebabOpen) (e.currentTarget as HTMLElement).style.background = "none" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {kebabOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 51,
                background: "#FFFFFF", border: "1px solid #E2E4E8",
                boxShadow: "0px 4px 12px rgba(0,0,0,0.15)", borderRadius: 8,
                minWidth: 180, padding: "4px 0",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {kebabItems.map(({ label, fn }) => (
                <button
                  key={label}
                  type="button"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none" }}
                  onClick={(e) => { e.stopPropagation(); fn(); setKebabOpen(false); onClose() }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
  )
})

interface SheetBtn {
  label: string
  icon: string
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}

import React from "react"

const MobileActionsSheet = React.forwardRef<HTMLDivElement, { btns: SheetBtn[]; onClose: () => void }>(
  function MobileActionsSheet({ btns, onClose }, ref) {
    if (typeof document === "undefined") return null

    return createPortal(
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 z-[60]"
          onClick={(e) => { e.stopPropagation(); onClose() }}
        />
        {/* Sheet */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E4E8]">
            <span className="text-[18px] font-bold text-black">Actions</span>
            <button
              type="button"
              aria-label="Close actions"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#F3F4F6] text-[#6B7280]"
              onClick={(e) => { e.stopPropagation(); onClose() }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* 4-column icon grid */}
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 px-5 py-6">
            {btns.map(({ label, icon, onClick }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={onClick}
                className="flex flex-col items-center gap-2 focus-visible:outline-none"
              >
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[#F3F4F6]">
                  <img src={icon} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
                </div>
                <span className="text-[12px] text-[#374151] text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* safe-area spacer for iPhone home bar */}
          <div className="h-safe-bottom pb-4" />
        </div>
      </div>,
      document.body
    )
  }
)
