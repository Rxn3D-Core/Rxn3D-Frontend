import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants";

/** Slip location id for "In lab" — ready-to-send action applies here (listing parity). */
export const SLIP_LOCATION_IN_LAB = 3;

/** Slip location id for "In office" (delivered to office) — add-stage FAB on virtual slip. */
export const SLIP_LOCATION_IN_OFFICE = 6;

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

/** True when slip is at "In lab" (location id 3) — edit slip, hold, ready-to-send. */
export function slipIsInLab(ref: SlipLocationRef): boolean {
  return slipCanReadyToSend(ref);
}

export const SLIP_EDIT_REQUIRES_IN_LAB_MESSAGE =
  "Slip must be in lab location to edit.";

/** True when slip is at office delivery location "In office" (not "ready to pickup" variants). */
export function slipIsInOffice(ref: SlipLocationRef): boolean {
  if (slipAtLocation(ref, SLIP_LOCATION_IN_OFFICE)) return true;
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  return label === "in office";
}

/** API requires slip at "In lab" before hold. */
export const SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE =
  "Slip must be in lab location to be put on hold.";

export function slipCanHold(ref: SlipLocationRef): boolean {
  return slipCanReadyToSend(ref);
}

/** Lab returns slip to office — only when slip is at "In lab" (location id 3). */
export function slipCanSendBackToOffice(ref: SlipLocationRef): boolean {
  return slipIsInLab(ref);
}

/** Location names allowed for QR driver scan (matches backend validQrTransitionLocationNames). */
export const QR_SCAN_VALID_LOCATION_IDS = [1, 2, 4, 5] as const;

const QR_SCAN_VALID_LOCATION_NAMES = [
  "In office ready to pickup",
  "In lab ready to pickup",
  "On route to the lab",
  "On route to the office",
] as const;

/** True when a slip is in a valid pick-up or drop-off location for QR scanning. */
export function isValidQrScanSlipLocation(ref: SlipLocationRef): boolean {
  if (typeof ref.locationId === "number") {
    return (QR_SCAN_VALID_LOCATION_IDS as readonly number[]).includes(ref.locationId);
  }
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  return QR_SCAN_VALID_LOCATION_NAMES.some(
    (name) => name.toLowerCase().replace(/\s+/g, " ").trim() === label
  );
}

export type QrScanSlipLike = {
  slip_id?: number;
  location_id?: number;
  location?: string;
  current_driver_location?: string;
};

/** Keep only slips that are in a valid QR pick-up / drop-off location. */
export function filterValidQrScanSlips<T extends QrScanSlipLike>(slips: T[]): T[] {
  return slips.filter((item) =>
    isValidQrScanSlipLocation({
      locationId: item.location_id,
      location: item.location || item.current_driver_location || "",
    })
  );
}

/** Lab listing: green truck = pick up (1, 4); red truck = drop off (2, 5). Location 6 (In office) has no driver action. */
export type SlipPickupDropoffAction = "pickup" | "dropoff";

export function slipPickupDropoffAction(
  ref: SlipLocationRef
): SlipPickupDropoffAction | null {
  if (slipCanReadyToSend(ref)) return null;
  if (slipIsInOffice(ref)) return null;

  if (slipAtLocation(ref, 2) || slipAtLocation(ref, 5)) return "dropoff";
  if (slipAtLocation(ref, 1) || slipAtLocation(ref, 4)) {
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
    if (slipAtLocation(ref, 4)) return 5;
    return 2;
  }
  if (action === "dropoff") {
    if (slipAtLocation(ref, 5)) return 6;
    return 3;
  }
  return null;
}
