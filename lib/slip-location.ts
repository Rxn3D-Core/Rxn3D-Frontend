import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants";

/** Slip location id for "In lab" — ready-to-send action applies here (listing parity). */
export const SLIP_LOCATION_IN_LAB = 3;

/** Slip location id for "On route to the lab" — driver lab drop-off starts here. */
export const SLIP_LOCATION_ON_ROUTE_TO_LAB = 2;

/** Slip location id for "On route to the office" — driver office drop-off starts here. */
export const SLIP_LOCATION_ON_ROUTE_TO_OFFICE = 5;

/** Slip location id for "In office" (delivered to office) — add-stage FAB on virtual slip. */
export const SLIP_LOCATION_IN_OFFICE = 6;

export type SlipLocationRef = {
  locationId?: number | string;
  location: string;
};

/** Prefer `locationId` from API; fall back to label match for older payloads. */
export function slipAtLocation(ref: SlipLocationRef, id: number): boolean {
  const locationId =
    typeof ref.locationId === "number"
      ? ref.locationId
      : typeof ref.locationId === "string" && ref.locationId.trim() !== ""
        ? Number(ref.locationId)
        : NaN;
  if (Number.isFinite(locationId) && locationId === id) return true;
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
 * True when the next driver action delivers to the office (location 5 → 6).
 * Office drop-off requires a proof photo on change-location / submit-scanned-slips.
 */
export function slipIsOfficeDropoff(ref: SlipLocationRef): boolean {
  if (slipAtLocation(ref, SLIP_LOCATION_ON_ROUTE_TO_OFFICE)) return true;
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  return label === "on route to the office";
}

/**
 * True when the next driver action delivers to the lab (location 2 → 3).
 * Lab drop-off requires a photo only when the slip has a physical impression.
 */
export function slipIsLabDropoff(ref: SlipLocationRef): boolean {
  if (slipAtLocation(ref, SLIP_LOCATION_ON_ROUTE_TO_LAB)) return true;
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  return label === "on route to the lab";
}

/**
 * True when lab drop-off should require a photo.
 * False only when every selected impression is digital and at least one exists.
 * Prefers `has_physical_impression` from QR scan; unknown slips default to true.
 */
export function slipHasPhysicalImpression(slip: unknown): boolean {
  if (slip == null || typeof slip !== "object") return true;
  const raw = slip as Record<string, unknown>;

  if (typeof raw.has_physical_impression === "boolean") {
    return raw.has_physical_impression;
  }

  const products = Array.isArray(raw.products) ? raw.products : null;
  if (!products) return true;

  const isPhysicalRow = (row: unknown): boolean => {
    if (row == null || typeof row !== "object") return true;
    const r = row as Record<string, unknown>;
    const impression =
      r.impression && typeof r.impression === "object"
        ? (r.impression as Record<string, unknown>)
        : r;
    const flag = impression.is_digital_impression;
    if (flag == null) return true;
    return String(flag).toLowerCase() !== "yes";
  };

  let foundAny = false;
  for (const product of products) {
    if (product == null || typeof product !== "object") continue;
    const p = product as Record<string, unknown>;
    for (const key of ["impressions", "opposite_impressions", "oppositeImpressions"] as const) {
      const rows = p[key];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        foundAny = true;
        if (isPhysicalRow(row)) return true;
      }
    }
  }

  // No impression rows at all → treat as needing photo (not fully digital).
  return !foundAny;
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

/** Location id constants used by undo location step. */
export const SLIP_LOCATION_IN_OFFICE_READY = 1;
export const SLIP_LOCATION_IN_LAB_READY = 4;

/**
 * Previous location after a one-step undo (lab admin).
 * 1 (start) and unknown ids return null.
 */
export function slipPreviousLocationIdForUndo(
  currentLocationId: number | null | undefined
): number | null {
  if (currentLocationId == null || !Number.isFinite(currentLocationId)) return null;
  switch (currentLocationId) {
    case 2:
      return 1;
    case 3:
      return 2;
    case 4:
      return 3;
    case 5:
      return 4;
    case 6:
      return 5;
    default:
      return null;
  }
}

export function slipCanUndoLocation(ref: SlipLocationRef): boolean {
  const id =
    typeof ref.locationId === "number"
      ? ref.locationId
      : typeof ref.locationId === "string" && ref.locationId.trim() !== ""
        ? Number(ref.locationId)
        : NaN;
  if (Number.isFinite(id)) {
    return slipPreviousLocationIdForUndo(id) != null;
  }
  // Label fallback for older payloads without locationId
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!label || label === "in office ready to pickup") return false;
  return (
    label.includes("on route") ||
    label === "in lab" ||
    label.includes("ready to pickup") ||
    label === "in office"
  );
}

const LOCATION_LABELS: Record<number, string> = {
  1: "In office ready to pickup",
  2: "On route to the lab",
  3: "In lab",
  4: "In lab ready to pickup",
  5: "On route to the office",
  6: "In office",
};

export function slipLocationLabel(locationId: number | null | undefined): string {
  if (locationId == null) return "Unknown";
  return LOCATION_LABELS[locationId] ?? `Location ${locationId}`;
}

export type SlipUndoLocationPreview = {
  fromLocationId: number;
  toLocationId: number;
  fromLabel: string;
  toLabel: string;
  effects: string[];
};

/**
 * Client-side preview of undo side effects (mirrors backend undoLocationStep).
 * Used in the confirmation dialog before calling the API.
 */
export function buildSlipUndoLocationPreview(
  ref: SlipLocationRef & { status?: string }
): SlipUndoLocationPreview | null {
  const fromLocationId =
    typeof ref.locationId === "number"
      ? ref.locationId
      : typeof ref.locationId === "string" && ref.locationId.trim() !== ""
        ? Number(ref.locationId)
        : NaN;
  if (!Number.isFinite(fromLocationId)) return null;
  const toLocationId = slipPreviousLocationIdForUndo(fromLocationId);
  if (toLocationId == null) return null;

  const fromLabel = ref.location?.trim() || slipLocationLabel(fromLocationId);
  const toLabel = slipLocationLabel(toLocationId);
  const effects: string[] = [
    `Location will move from ${fromLabel} back to ${toLabel}.`,
  ];

  if (fromLocationId === 4) {
    const status = (ref.status || "").toLowerCase();
    if (status === "finished") {
      effects.push("Slip status will be restored to In Progress (send-back undo).");
      effects.push("Product statuses will be restored to In Progress.");
    } else {
      effects.push("Product statuses will be restored to In Progress.");
      effects.push(
        "The pending invoice created by Ready to Send will be removed (blocked if already billed/paid)."
      );
    }
  }

  if (fromLocationId === 6) {
    effects.push(
      "If this slip was finished on office delivery, slip status will be restored."
    );
    effects.push(
      "If the case was finished by this delivery, case status will return to In Progress."
    );
    effects.push("Invoice from Ready to Send is kept.");
  }

  effects.push("A driver-history entry will record this undo for audit.");

  return { fromLocationId, toLocationId, fromLabel, toLabel, effects };
}
