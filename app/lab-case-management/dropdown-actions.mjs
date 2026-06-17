/**
 * @typedef {{ key: string, label: string, onSelect?: (() => void) | null, disabled?: boolean }} LabCaseDropdownAction
 */

/**
 * Builds the row action list for the lab case management overflow menu.
 *
 * @param {{
 *   onEditCase?: (() => void) | null,
 *   onChangeDueDate?: (() => void) | null,
 *   onPrintDriverLabel?: (() => void) | null,
 *   onPrintPaperSlip?: (() => void) | null,
 *   onPrintStatement?: (() => void) | null,
 *   onSendBackToOffice?: (() => void) | null,
 *   onRushCase?: (() => void) | null,
 *   onCancelCase?: (() => void) | null,
 * }} handlers
 * @returns {LabCaseDropdownAction[]}
 */
export function buildLabCaseDropdownActions(handlers) {
  return [
    { key: "edit-case", label: "Edit Case", onSelect: handlers.onEditCase ?? null, disabled: !handlers.onEditCase },
    { key: "change-due-date", label: "Change due date", onSelect: handlers.onChangeDueDate ?? null, disabled: !handlers.onChangeDueDate },
    { key: "print-driver-label", label: "Print Driver label", onSelect: handlers.onPrintDriverLabel ?? null, disabled: !handlers.onPrintDriverLabel },
    { key: "print-paper-slip", label: "Print Paper slip", onSelect: handlers.onPrintPaperSlip ?? null, disabled: !handlers.onPrintPaperSlip },
    { key: "print-statement", label: "Print Statement", onSelect: handlers.onPrintStatement ?? null, disabled: !handlers.onPrintStatement },
    { key: "send-back-to-office", label: "Send back to office", onSelect: handlers.onSendBackToOffice ?? null, disabled: !handlers.onSendBackToOffice },
    { key: "rush-case", label: "Rush case", onSelect: handlers.onRushCase ?? null, disabled: !handlers.onRushCase },
    { key: "cancel-case", label: "Cancel", onSelect: handlers.onCancelCase ?? null, disabled: !handlers.onCancelCase },
  ];
}
