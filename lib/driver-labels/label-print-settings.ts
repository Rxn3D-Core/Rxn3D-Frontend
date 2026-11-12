/**
 * Driver-label print field visibility / display options.
 * Locked fields (lab name, patient, office) always print; optional ones and display toggles are user-controlled.
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
  /** RXN-66: these five always printed before; default on so printed labels do not change. */
  showCaseNumber: boolean;
  showSlipNumber: boolean;
  showQrCode: boolean;
  showPickup: boolean;
  showDelivery: boolean;
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
  showCaseNumber: true,
  showSlipNumber: true,
  showQrCode: true,
  showPickup: true,
  showDelivery: true,
  compactAbbreviations: true,
  showDividers: true,
  uppercaseStatus: true,
};

export const DRIVER_LABEL_LOCKED_FIELDS = [
  "Lab name",
  "Patient",
  "Office",
] as const;

export const DRIVER_LABEL_OPTIONAL_FIELDS = [
  { key: "showDoctor", label: "Doctor" },
  { key: "showStage", label: "Stage" },
  { key: "showPan", label: "Pan #" },
  { key: "showProduct", label: "Product" },
  { key: "showStatus", label: "Status / location" },
  { key: "showCaseNumber", label: "Case #" },
  { key: "showSlipNumber", label: "Slip #" },
  { key: "showQrCode", label: "QR code", hint: "Drivers scan the QR code to find the slip." },
  { key: "showPickup", label: "Pickup" },
  { key: "showDelivery", label: "Delivery" },
] as const;

export type DriverLabelOptionalKey =
  (typeof DRIVER_LABEL_OPTIONAL_FIELDS)[number]["key"];

/** Shape of `settings` in GET/PUT /v1/slip-settings/driver-label (RXN-63). */
export interface DriverLabelSettingsApiValues {
  show_doctor: boolean
  show_stage: boolean
  show_pan: boolean
  show_product: boolean
  show_status: boolean
  /** Added in RXN-66; an older API does not send them. */
  show_case_number: boolean
  show_slip_number: boolean
  show_qr_code: boolean
  show_pickup: boolean
  show_delivery: boolean
  compact_abbreviations: boolean
  show_dividers: boolean
  uppercase_status: boolean
}

/** Fresh copy of the defaults (used while loading, after a failed load, and for Reset). */
export function defaultDriverLabelPrintSettings(): DriverLabelPrintSettings {
  return { ...DEFAULT_DRIVER_LABEL_PRINT_SETTINGS }
}

/** API values to print settings. Anything missing or not a boolean falls back to the default. */
export function driverLabelSettingsFromApi(
  values: Partial<Record<keyof DriverLabelSettingsApiValues, unknown>> | null | undefined,
): DriverLabelPrintSettings {
  const d = DEFAULT_DRIVER_LABEL_PRINT_SETTINGS
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback)
  return {
    scope: "all",
    showDoctor: bool(values?.show_doctor, d.showDoctor),
    showStage: bool(values?.show_stage, d.showStage),
    showPan: bool(values?.show_pan, d.showPan),
    showProduct: bool(values?.show_product, d.showProduct),
    showStatus: bool(values?.show_status, d.showStatus),
    showCaseNumber: bool(values?.show_case_number, d.showCaseNumber),
    showSlipNumber: bool(values?.show_slip_number, d.showSlipNumber),
    showQrCode: bool(values?.show_qr_code, d.showQrCode),
    showPickup: bool(values?.show_pickup, d.showPickup),
    showDelivery: bool(values?.show_delivery, d.showDelivery),
    compactAbbreviations: bool(values?.compact_abbreviations, d.compactAbbreviations),
    showDividers: bool(values?.show_dividers, d.showDividers),
    uppercaseStatus: bool(values?.uppercase_status, d.uppercaseStatus),
  }
}

/** Print settings to the PUT body. `scope` is not stored (it only has one value). */
export function driverLabelSettingsToApi(settings: DriverLabelPrintSettings): DriverLabelSettingsApiValues {
  return {
    show_doctor: settings.showDoctor,
    show_stage: settings.showStage,
    show_pan: settings.showPan,
    show_product: settings.showProduct,
    show_status: settings.showStatus,
    show_case_number: settings.showCaseNumber,
    show_slip_number: settings.showSlipNumber,
    show_qr_code: settings.showQrCode,
    show_pickup: settings.showPickup,
    show_delivery: settings.showDelivery,
    compact_abbreviations: settings.compactAbbreviations,
    show_dividers: settings.showDividers,
    uppercase_status: settings.uppercaseStatus,
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
    pt: "Pt:",
    ofc: "Ofc:",
    dr: "Dr:",
    case: "Case #",
    slip: "Slip #",
    stage: "Stg:",
    pan: "Pan #",
    prod: "Prod:",
    status: "Sts:",
    pickup: "Pku:",
    deliver: "Del:",
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
