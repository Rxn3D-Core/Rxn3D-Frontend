import {
  slipCanReadyToSend,
  slipPickupDropoffAction,
  type SlipLocationRef,
} from "@/lib/slip-location";

export type QrScanAudience = "lab" | "driver" | "office";

export type QrScanChooserActionId =
  | "view_vslip"
  | "ready_to_send"
  | "pickup"
  | "dropoff";

export type QrScanChooserAction = {
  id: QrScanChooserActionId;
  label: string;
  /** Primary CTA styling for the main movement action. */
  primary?: boolean;
};

/** Map primary role → QR chooser audience. */
export function resolveQrScanAudience(role: string | null | undefined): QrScanAudience {
  const r = (role || "").trim().toLowerCase();
  if (r === "lab_driver") return "driver";
  if (r === "lab_admin" || r === "lab_user") return "lab";
  return "office";
}

/** Location-based movement action for the chooser (does not change location). */
export function resolveQrMovementAction(
  ref: SlipLocationRef,
): { id: "ready_to_send" | "pickup" | "dropoff"; label: string } | null {
  if (slipCanReadyToSend(ref)) {
    return { id: "ready_to_send", label: "Mark Ready to Pick Up" };
  }
  const action = slipPickupDropoffAction(ref);
  if (action === "pickup") return { id: "pickup", label: "Pick Up" };
  if (action === "dropoff") return { id: "dropoff", label: "Drop Off" };
  return null;
}

/**
 * Build chooser buttons for the audience.
 * - Lab: V-Slip + applicable movement (ready-to-send / pick up / drop off)
 * - Driver: pick up / drop off only (no V-Slip)
 * - Office: V-Slip only
 */
export function buildQrScanChooserActions(params: {
  audience: QrScanAudience;
  locationRef: SlipLocationRef;
  /** Lab staff with pickup_drop_off may run pick up / drop off. Drivers always may when location allows. */
  canPickupDropoff?: boolean;
}): QrScanChooserAction[] {
  const { audience, locationRef } = params;
  const canPickupDropoff = params.canPickupDropoff !== false;
  const movement = resolveQrMovementAction(locationRef);
  const actions: QrScanChooserAction[] = [];

  if (audience === "office") {
    actions.push({ id: "view_vslip", label: "Open Virtual Slip", primary: true });
    return actions;
  }

  if (audience === "lab") {
    actions.push({ id: "view_vslip", label: "View V-Slip" });
    if (movement?.id === "ready_to_send") {
      actions.push({ id: "ready_to_send", label: movement.label, primary: true });
    } else if (
      movement &&
      (movement.id === "pickup" || movement.id === "dropoff") &&
      canPickupDropoff
    ) {
      actions.push({ id: movement.id, label: movement.label, primary: true });
    }
    if (actions.length === 1) {
      actions[0].primary = true;
    }
    return actions;
  }

  // Driver
  if (
    movement &&
    (movement.id === "pickup" || movement.id === "dropoff") &&
    canPickupDropoff
  ) {
    actions.push({ id: movement.id, label: movement.label, primary: true });
  }
  return actions;
}
