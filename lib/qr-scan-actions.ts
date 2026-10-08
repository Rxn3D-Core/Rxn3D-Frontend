import {
  slipCanReadyToSend,
  slipPickupDropoffAction,
  type SlipLocationRef,
} from "@/lib/slip-location";
import { getActiveCustomerType, normalizeRoleSlug } from "@/lib/role-utils";

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

/** Map a single role slug → QR chooser audience. */
export function resolveQrScanAudience(role: string | null | undefined): QrScanAudience {
  const r = normalizeRoleSlug(role);
  if (r === "lab_driver") return "driver";
  if (r === "lab_admin" || r === "lab_user") return "lab";
  return "office";
}

/**
 * Audience for the post-scan chooser using the active profile + customer type.
 * Prefer lab/driver when the user is acting on a lab profile — do not force
 * "office" just because the user also has an office role on another profile.
 */
export function resolveActiveQrScanAudience(params: {
  profileRole?: string | null;
  userRoles?: string[] | null;
  customerType?: string | null;
}): QrScanAudience {
  const type = (
    params.customerType ||
    getActiveCustomerType() ||
    ""
  ).toLowerCase();

  let role = normalizeRoleSlug(params.profileRole);
  if (!role && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("role");
      if (stored) {
        if (stored.startsWith("[")) {
          const parsed = JSON.parse(stored) as string[];
          role = normalizeRoleSlug(parsed[0]);
        } else {
          role = normalizeRoleSlug(stored);
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (type === "office") return "office";

  if (type === "lab") {
    if (role === "lab_driver") return "driver";
    return "lab";
  }

  if (role === "lab_driver") return "driver";
  if (role === "lab_admin" || role === "lab_user") return "lab";
  if (
    role === "office_admin" ||
    role === "office_user" ||
    role === "doctor" ||
    role === "doctor_admin"
  ) {
    return "office";
  }

  const roles = (params.userRoles || []).map((r) => normalizeRoleSlug(r));
  if (roles.includes("lab_driver")) return "driver";
  if (roles.includes("lab_admin") || roles.includes("lab_user")) return "lab";
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
 * - Driver: pick up / drop off; when slip is In lab → View V-Slip (no pickup/dropoff there)
 * - Office: V-Slip only
 */
export function buildQrScanChooserActions(params: {
  audience: QrScanAudience;
  locationRef: SlipLocationRef;
  /** When false, hide pick up / drop off. Lab/driver default true. */
  canPickupDropoff?: boolean;
}): QrScanChooserAction[] {
  const { audience, locationRef } = params;
  const canPickupDropoff =
    params.canPickupDropoff !== undefined
      ? params.canPickupDropoff
      : audience === "lab" || audience === "driver";
  const movement = resolveQrMovementAction(locationRef);
  const actions: QrScanChooserAction[] = [];
  const inLab = slipCanReadyToSend(locationRef);

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

  // Driver: pickup/dropoff when on route / ready to pickup.
  // In lab is not a driver move — still allow opening the virtual slip.
  if (
    movement &&
    (movement.id === "pickup" || movement.id === "dropoff") &&
    canPickupDropoff
  ) {
    actions.push({ id: movement.id, label: movement.label, primary: true });
  } else if (inLab) {
    actions.push({ id: "view_vslip", label: "View V-Slip", primary: true });
  }
  return actions;
}
