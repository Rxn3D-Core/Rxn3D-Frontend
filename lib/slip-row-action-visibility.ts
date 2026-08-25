import {
  slipCanHold,
  slipCanReadyToSend,
  slipCanSendBackToOffice,
  slipIsInLab,
  slipIsInOffice,
  slipShowsPickupDropoff,
  type SlipLocationRef,
} from "@/lib/slip-location";
import {
  isSlipCaseCancelled,
  isSlipCaseFinished,
  isSlipCaseOnHold,
} from "@/lib/slip-case-status";

export type SlipRowActionKey =
  | "location"
  | "readyToSend"
  | "rush"
  | "hold"
  | "cancel"
  | "sendBack"
  | "print"
  | "invoice"
  | "schedule"
  | "addOns"
  | "callLog"
  | "attach"
  | "editSlip"
  | "deleteSlip"
  | "restoreSlip"
  | "printDriverLabel"
  | "printStatement";

export type SlipRowActionVisibilityInput = SlipLocationRef & {
  status: string;
  canPrintStatement?: boolean;
  canEditSlip?: boolean;
  canCancelCase?: boolean;
  canDeleteCase?: boolean;
  /**
   * Submit/change rush from listing or virtual slip. Office profiles can still
   * see rush status indicators but must not get the rush action icon; rush is
   * submitted during slip creation only. Defaults true (lab).
   */
  allowRush?: boolean;
  /**
   * Lab-only listing actions (ready to send, pick up / drop off, send back to
   * office, change delivery date). Office profiles cannot run them. Defaults true.
   */
  allowDriverActions?: boolean;
};

export type SlipRowActionVisibility = Record<SlipRowActionKey, boolean>;

function slipLocationRef(input: SlipRowActionVisibilityInput): SlipLocationRef {
  return { locationId: input.locationId, location: input.location };
}

/**
 * Which row / toolbar actions to show for a slip — mirrors virtual-slip-v2 rules
 * (location helpers in slip-location + status gates on hold / cancelled / in office).
 */
export function resolveSlipRowActionVisibility(
  input: SlipRowActionVisibilityInput
): SlipRowActionVisibility {
  const ref = slipLocationRef(input);
  const caseOnHold = isSlipCaseOnHold(input.status);
  const caseCancelled = isSlipCaseCancelled(input.status);
  const caseFinished = isSlipCaseFinished(input.status);
  const caseDeleted = input.status.trim().toLowerCase() === "deleted";
  const caseBlocked = caseOnHold || caseCancelled || caseDeleted;
  const slipInOffice = slipIsInOffice(ref);
  const slipInLab = slipIsInLab(ref);
  const canPutOnHold = slipCanHold(ref);
  const canSendBack = slipCanSendBackToOffice(ref);
  const allowRush = input.allowRush !== false;
  const canEditSlip = input.canEditSlip !== false;
  const canCancelCase = input.canCancelCase !== false;
  const canDeleteCase = input.canDeleteCase !== false;
  const canPrintStatement = Boolean(input.canPrintStatement);

  const allowDriverActions = input.allowDriverActions !== false;
  const canReadyToSend = allowDriverActions && slipCanReadyToSend(ref);
  const showLocation =
    allowDriverActions && (canReadyToSend || slipShowsPickupDropoff(ref));

  return {
    location: showLocation && !caseDeleted,
    readyToSend: canReadyToSend && !caseDeleted,
    rush: allowRush && !caseOnHold && !caseFinished && !caseCancelled && !caseDeleted,
    hold: !caseBlocked && !slipInOffice && canPutOnHold,
    cancel: !caseBlocked && !slipInOffice && canCancelCase,
    sendBack: allowDriverActions && canSendBack && !caseCancelled && !caseFinished && !caseDeleted,
    print: !caseCancelled && !caseDeleted,
    invoice: canPrintStatement && !caseCancelled && !caseDeleted,
    schedule: allowDriverActions && !caseCancelled && !caseFinished && !caseDeleted,
    addOns: !caseOnHold && !caseFinished && !caseCancelled && !caseDeleted,
    callLog: !caseDeleted,
    attach: !caseDeleted,
    editSlip: slipInLab && !caseCancelled && !caseDeleted && canEditSlip,
    deleteSlip: !caseDeleted && canDeleteCase,
    restoreSlip: caseDeleted && canDeleteCase,
    printDriverLabel: !caseCancelled && !caseDeleted,
    printStatement: canPrintStatement && !caseCancelled && !caseDeleted,
  };
}
