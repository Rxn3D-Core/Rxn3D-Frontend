"use client"

import { useEffect, useRef } from "react"
import type { V2CaseRowData, V2RowActions } from "@/app/lab-case-management/v2/case-table-types"

const VS = "/icons/virtual-slip-center"

interface Props {
  row: V2CaseRowData
  actions: V2RowActions
  canPrintStatement: boolean
  canSendBack: boolean
  onClose: () => void
}

export function V3RowActionsPopover({ row, actions, canPrintStatement, canSendBack, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [onClose])

  function act(fn: () => void) {
    return (e: React.MouseEvent) => { e.stopPropagation(); fn(); onClose() }
  }

  const btns: { label: string; icon: string; onClick: (e: React.MouseEvent) => void; disabled?: boolean }[] = [
    { label: "Pickup / Driver", icon: `${VS}/pick-up.svg`, onClick: act(() => actions.onDriverHistory(row)) },
    { label: "Rush", icon: `${VS}/rush.svg`, onClick: act(() => actions.onRush(row)) },
    { label: "On Hold", icon: `${VS}/on-hold.svg`, onClick: act(() => actions.onEdit(row)) },
    { label: "Cancel", icon: `${VS}/cancel.svg`, onClick: act(() => actions.onCancel(row)) },
    { label: "Send Back", icon: `${VS}/send-back-to-office.svg`, onClick: act(() => actions.onSendBack(row)), disabled: !canSendBack },
    { label: "Print Slip", icon: `${VS}/driver-history.svg`, onClick: act(() => actions.onPrintPaperSlip(row)) },
    { label: "Invoice", icon: `${VS}/edit-general.svg`, onClick: act(() => actions.onPrintStatement(row)), disabled: !canPrintStatement },
    { label: "Change Date", icon: `${VS}/add-stage.svg`, onClick: act(() => actions.onChangeDueDate(row)) },
    { label: "Add-ons", icon: `${VS}/add-general.svg`, onClick: act(() => actions.onAddOns(row)) },
    { label: "Call Log", icon: `${VS}/call-log.svg`, onClick: act(() => actions.onCallLog(row)) },
    { label: "Attachments", icon: `${VS}/attachments.svg`, onClick: act(() => actions.onAttachment(row)) },
    { label: "More", icon: `${VS}/ellipsis.svg`, onClick: act(() => actions.onCopy(row)) },
  ]

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        width: 551,
        height: 56,
        background: "#FFFFFF",
        border: "1px solid #E2E4E8",
        boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
        borderRadius: 7,
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: "10px 15px",
        gap: 18,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {btns.map(({ label, icon, onClick, disabled }) => (
        <button
          key={label}
          aria-label={label}
          title={label}
          disabled={disabled}
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
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.35 : 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = "#F2F3F4" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none" }}
        >
          <img src={icon} alt={label} style={{ width: 28, height: 28, objectFit: "contain" }} />
        </button>
      ))}
    </div>
  )
}
