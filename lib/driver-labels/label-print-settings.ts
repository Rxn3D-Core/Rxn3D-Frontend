/**
 * Driver-label print field visibility / display options.
 * Locked fields always print; optional ones and display toggles are user-controlled.
 */

export type DriverLabelSettingsScope = "all";

export interface DriverLabelPrintSettings {
  /** Currently only global; reserved for per-size later. */
  scope: DriverLabelSettingsScope;
  showDoctor: boolean;
  showStage: boolean;
  showPan: boolean;
  showProduct: boolean;
  showStatus: boolean;
  compactAbbreviations: boolean;
  showDividers: boolean;
  uppercaseStatus: boolean;
}

export const DEFAULT_DRIVER_LABEL_PRINT_SETTINGS: DriverLabelPrintSettings = {
  scope: "all",
  showDoctor: true,
  showStage: true,
  showPan: true,
  showProduct: true,
  showStatus: true,
  compactAbbreviations: true,
  showDividers: true,
  uppercaseStatus: true,
};

export const DRIVER_LABEL_LOCKED_FIELDS = [
  "Lab name",
  "Patient",
  "Office",
  "Case # + Slip #",
  "QR code",
  "Pickup + Delivery",
] as const;

export const DRIVER_LABEL_OPTIONAL_FIELDS = [
  { key: "showDoctor", label: "Doctor" },
  { key: "showStage", label: "Stage" },
  { key: "showPan", label: "Pan #" },
  { key: "showProduct", label: "Product" },
  { key: "showStatus", label: "Status / location" },
] as const;

export type DriverLabelOptionalKey =
  (typeof DRIVER_LABEL_OPTIONAL_FIELDS)[number]["key"];

const STORAGE_KEY = "rxn3d.driver-label-print-settings.v1";

export function loadDriverLabelPrintSettings(): DriverLabelPrintSettings {
  if (typeof window === "undefined") return { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DriverLabelPrintSettings>;
    return { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS, ...parsed, scope: "all" };
  } catch {
    return { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS };
  }
}

export function saveDriverLabelPrintSettings(settings: DriverLabelPrintSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Compact vs full field prefixes for sticker text. */
export function fieldLabel(
  key:
    | "pt"
    | "ofc"
    | "dr"
    | "case"
    | "slip"
    | "stage"
    | "pan"
    | "prod"
    | "status"
    | "pickup"
    | "deliver",
  compact: boolean,
): string {
  const compactMap = {
    pt: "PT",
    ofc: "OFC",
    dr: "DR",
    case: "CASE",
    slip: "SLIP",
    stage: "STAGE",
    pan: "PAN",
    prod: "PROD",
    status: "STATUS",
    pickup: "PICKUP",
    deliver: "DELIVER",
  } as const;
  const fullMap = {
    pt: "Patient",
    ofc: "Office",
    dr: "Doctor",
    case: "Case #",
    slip: "Slip #",
    stage: "Stage",
    pan: "Pan #",
    prod: "Product",
    status: "Status",
    pickup: "Pickup",
    deliver: "Deliver",
  } as const;
  return compact ? compactMap[key] : fullMap[key];
}
