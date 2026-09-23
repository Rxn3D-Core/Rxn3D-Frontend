"use client"

import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { resolveSlipRowActionVisibility } from "@/lib/slip-row-action-visibility"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"

const VS = "/icons/virtual-slip-center"
/** Colored slip-listing action icons (always visible on the row). */
const LI = "/icons/slip-listing/actions"

interface Props {
  row: V2CaseRowData
  actions: V2RowActions
  canPrintStatement: boolean
  canSendBack: boolean
  canEditSlip?: boolean
  canCancelCase?: boolean
  canDeleteCase?: boolean
  allowDriverActions?: boolean
  /** Office profiles may see rush status on the row but cannot submit rush from listing. */
  allowRush?: boolean
  /** Lab admin only — show Undo location in the ⋯ menu. */
  allowUndoLocation?: boolean
  onClose: () => void
  // Desktop renders a static, always-visible icon bar inline in the row.
  // Mobile renders the same actions as a tap-to-open bottom sheet. Each call
  // site renders only the half it owns.
  variant: "desktop" | "mobile"
}

export const V3RowActionsPopover = forwardRef<HTMLDivElement, Props>(function V3RowActionsPopover(
  { row, actions, canPrintStatement, canSendBack, canEditSlip = true, canCancelCase = true, canDeleteCase = true, allowDriverActions = true, allowRush = true, allowUndoLocation = false, onClose, variant },
  ref,
) {
  const visibility = useMemo(
    () =>
      resolveSlipRowActionVisibility({
        locationId: row.locationId,
        location: row.location,
        status: row.status,
        canPrintStatement,
        canEditSlip,
        canCancelCase,
        canDeleteCase,
        allowRush,
        allowDriverActions,
        allowUndoLocation,
      }),
    [row.locationId, row.location, row.status, canPrintStatement, canEditSlip, canCancelCase, canDeleteCase, allowRush, allowDriverActions, allowUndoLocation]
  )

  function act(fn: () => void) {
    return (e: React.MouseEvent) => { e.stopPropagation(); fn(); onClose() }
  }

  // Location (ready-to-send / pick up / drop off / add stage) and Schedule are
  // omitted here — they already live in the Location and Due Date columns.
  const btns: { label: string; icon: string; onClick: (e: React.MouseEvent) => void }[] = [
    visibility.print ? { label: "Print", icon: `${LI}/print.png`, onClick: act(() => actions.onPrintPaperSlip(row)) } : null,
    visibility.invoice ? { label: "Invoice", icon: `/icons/virtual-slip-actions/print-invoice.svg`, onClick: act(() => actions.onPrintStatement(row)) } : null,
    visibility.attach ? { label: "Attach", icon: `${LI}/attachment.png`, onClick: act(() => actions.onAttachment(row)) } : null,
    visibility.addOns ? { label: "Add", icon: `${LI}/add.png`, onClick: act(() => actions.onAddOns(row)) } : null,
    visibility.rush ? { label: "Rush", icon: `${VS}/rush.svg`, onClick: act(() => actions.onRush(row)) } : null,
  ].filter((btn): btn is { label: string; icon: string; onClick: (e: React.MouseEvent) => void } => btn != null)

  const visibleBtns = btns

  // Overflow actions live in the ⋯ kebab menu.
  const kebabItems = [
    visibility.callLog ? { label: "Call log", fn: () => actions.onCallLog(row) } : null,
    visibility.sendBack && canSendBack ? { label: "Send case back to office", fn: () => actions.onSendBack(row) } : null,
    visibility.undoLocation && actions.onUndoLocation
      ? { label: "Undo location", fn: () => actions.onUndoLocation?.(row) }
      : null,
    visibility.hold ? { label: "Hold", fn: () => actions.onHold(row) } : null,
    visibility.cancel ? { label: "Cancel", fn: () => actions.onCancel(row) } : null,
    visibility.restoreSlip ? { label: "Resume", fn: () => actions.onRestore(row) } : null,
    visibility.deleteSlip ? { label: "Delete slip", fn: () => actions.onDelete(row) } : null,
    visibility.printDriverLabel ? { label: "Print driver label", fn: () => actions.onPrintDriverLabel(row) } : null,
    visibility.printStatement ? { label: "Print statement", fn: () => actions.onPrintStatement(row) } : null,
  ].filter((item): item is { label: string; fn: () => void } => item != null)

  if (variant === "mobile") {
    return <MobileActionsSheet ref={ref} btns={visibleBtns} kebabItems={kebabItems} onClose={onClose} />
  }

  return (
    <div
      className="hidden md:flex"
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        width: "100%",
        height: "100%",
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
          data-row-interactive="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 25,
            height: 25,
            border: "none",
            background: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <img src={icon} alt={label} style={{ width: 25, height: 25, objectFit: "contain" }} />
        </button>
      ))}

      {kebabItems.length > 0 && <DesktopKebab items={kebabItems} />}
    </div>
  )
})

function DesktopKebab({ items }: { items: { label: string; fn: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocPointerDown() { setOpen(false) }
    document.addEventListener("pointerdown", onDocPointerDown)
    return () => document.removeEventListener("pointerdown", onDocPointerDown)
  }, [open])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setOpen((o) => !o)
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }} data-row-interactive="true">
      <button
        ref={btnRef}
        type="button"
        aria-label="More actions"
        title="More actions"
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 25, height: 25, border: "none",
          background: open ? "#F2F3F4" : "none", borderRadius: 6, cursor: "pointer",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", top: pos.top, right: pos.right, zIndex: 1000,
            background: "#FFFFFF", border: "1px solid #E2E4E8",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.15)", borderRadius: 8,
            minWidth: 200, padding: "4px 0",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map(({ label, fn }) => (
            <button
              key={label}
              type="button"
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none" }}
              onClick={(e) => { e.stopPropagation(); fn(); setOpen(false) }}
            >
              {label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

interface SheetBtn {
  label: string
  icon: string
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}

import React from "react"

const MobileActionsSheet = React.forwardRef<
  HTMLDivElement,
  { btns: SheetBtn[]; kebabItems: { label: string; fn: () => void }[]; onClose: () => void }
>(function MobileActionsSheet({ btns, kebabItems, onClose }, ref) {
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

        {/* Overflow actions (call log, send back, undo, delete, print label) */}
        {kebabItems.length > 0 && (
          <div className="border-t border-[#E2E4E8] px-2 py-2">
            {kebabItems.map(({ label, fn }) => (
              <button
                key={label}
                type="button"
                className="block w-full rounded-lg px-4 py-3 text-left text-[15px] text-[#374151] active:bg-[#F3F4F6]"
                onClick={(e) => { e.stopPropagation(); fn(); onClose() }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* safe-area spacer for iPhone home bar */}
        <div className="h-safe-bottom pb-4" />
      </div>
    </div>,
    document.body
  )
})
