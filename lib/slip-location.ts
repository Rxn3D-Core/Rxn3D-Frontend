import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants";

/** Slip location id for "In lab" — ready-to-send action applies here (listing parity). */
export const SLIP_LOCATION_IN_LAB = 3;

export type SlipLocationRef = {
  locationId?: number;
  location: string;
};

/** Prefer `locationId` from API; fall back to label match for older payloads. */
export function slipAtLocation(ref: SlipLocationRef, id: number): boolean {
  if (typeof ref.locationId === "number" && ref.locationId === id) return true;
  const expected = SLIP_LOCATION_FILTER_OPTIONS.find((o) => o.id === id)?.label;
  return !!(expected && ref.location === expected);
}

export function slipCanReadyToSend(ref: SlipLocationRef): boolean {
  if (slipAtLocation(ref, SLIP_LOCATION_IN_LAB)) return true;
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  return label === "in lab";
}

/** API requires slip at "In lab" before hold. */
export const SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE =
  "Slip must be in lab location to be put on hold.";

export function slipCanHold(ref: SlipLocationRef): boolean {
  return slipCanReadyToSend(ref);
}

/** Lab listing: green truck = pick up (1, 4, 6); red truck = drop off (2, 5). */
export type SlipPickupDropoffAction = "pickup" | "dropoff";

export function slipPickupDropoffAction(
  ref: SlipLocationRef
): SlipPickupDropoffAction | null {
  if (slipCanReadyToSend(ref)) return null;

  if (slipAtLocation(ref, 2) || slipAtLocation(ref, 5)) return "dropoff";
  if (slipAtLocation(ref, 1) || slipAtLocation(ref, 4) || slipAtLocation(ref, 6)) {
    return "pickup";
  }

  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (
    label.includes("route to the lab") ||
    label.includes("route to the office") ||
    (label.includes("route") && label.includes("to"))
  ) {
    return "dropoff";
  }
  if (
    label.includes("pickup") ||
    label.includes("pick up") ||
    label.includes("ready to pick")
  ) {
    return "pickup";
  }
  if (label === "in office" || label.startsWith("in office ")) return "pickup";

  return null;
}

export function slipPickupDropoffLabel(
  action: SlipPickupDropoffAction | null
): string {
  if (action === "pickup") return "Pick up";
  if (action === "dropoff") return "Drop off";
  return "Pick up/Drop off";
}

/** False when slip is in lab (use Ready to send) or location has no pick up / drop off action. */
export function slipShowsPickupDropoff(ref: SlipLocationRef): boolean {
  return slipPickupDropoffAction(ref) != null;
}

/**
 * Next location after a driver pick up / drop off (change-location API).
 * 3→4 is handled by ready-to-send, not driver history.
 */
export function slipNextLocationId(currentLocationId: number): number | null {
  switch (currentLocationId) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 4:
      return 5;
    case 5:
      return 6;
    default:
      return null;
  }
}

export function slipNextLocationIdFromRef(ref: SlipLocationRef): number | null {
  if (typeof ref.locationId === "number") {
    return slipNextLocationId(ref.locationId);
  }
  const action = slipPickupDropoffAction(ref);
  if (action === "pickup") {
    if (slipAtLocation(ref, 4) || slipAtLocation(ref, 6)) return 5;
    return 2;
  }
  if (action === "dropoff") {
    if (slipAtLocation(ref, 5)) return 6;
    return 3;
  }
  return null;
}
