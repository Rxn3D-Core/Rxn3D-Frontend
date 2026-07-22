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
  | "printDriverLabel"
  | "printStatement";

export type SlipRowActionVisibilityInput = SlipLocationRef & {
  status: string;
  canPrintStatement?: boolean;
  canEditSlip?: boolean;
  canDeleteCase?: boolean;
  /** Lab listing / virtual slip — rush is lab-only. Defaults true. */
  allowRush?: boolean;
  /**
   * Driver actions (ready to send, pick up, drop off) are lab-only — office
   * profiles cannot run them. Defaults true.
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
  const caseBlocked = caseOnHold || caseCancelled;
  const slipInOffice = slipIsInOffice(ref);
  const slipInLab = slipIsInLab(ref);
  const canPutOnHold = slipCanHold(ref);
  const canSendBack = slipCanSendBackToOffice(ref);
  const allowRush = input.allowRush !== false;
  const canEditSlip = input.canEditSlip !== false;
  const canDeleteCase = input.canDeleteCase !== false;
  const canPrintStatement = Boolean(input.canPrintStatement);

  const allowDriverActions = input.allowDriverActions !== false;
  const canReadyToSend = allowDriverActions && slipCanReadyToSend(ref);
  const showLocation =
    allowDriverActions && (canReadyToSend || slipShowsPickupDropoff(ref));

  return {
    location: showLocation,
    readyToSend: canReadyToSend,
    rush: allowRush && !caseOnHold && !caseFinished && !caseCancelled,
    hold: !caseBlocked && !slipInOffice && canPutOnHold,
    cancel: !caseBlocked && !slipInOffice && canDeleteCase,
    sendBack: canSendBack && !caseCancelled && !caseFinished,
    print: !caseCancelled,
    invoice: canPrintStatement && !caseCancelled,
    schedule: !caseCancelled && !caseFinished,
    addOns: !caseOnHold && !caseFinished && !caseCancelled,
    callLog: true,
    attach: true,
    editSlip: slipInLab && !caseCancelled && canEditSlip,
    printDriverLabel: !caseCancelled,
    printStatement: canPrintStatement && !caseCancelled,
  };
}
