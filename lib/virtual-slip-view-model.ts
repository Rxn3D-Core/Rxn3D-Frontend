import { resolveDoctorImageUrl } from "@/utils/avatar-utils";
import { formatToothNumbersLabel } from "@/lib/virtual-slip-display";

/**
 * Display-oriented view model for the redesigned (view-only) virtual slip page.
 *
 * Maps the GET /v1/slip/slip/{id}/details response into a flat, render-ready
 * shape consumed by the components under components/virtual-slip/.
 *
 * Unlike lib/virtual-slip-transformer.ts (which fakes the editable
 * CaseDesignCenter's internal state), this produces plain data for display —
 * no progressive-disclosure gating, no editor types.
 */

export type ToothStatus = "in_mouth" | "missing" | "will_extract" | "implant";

export interface ToothVM {
  number: number;
  status: ToothStatus;
}

export interface ImplantVM {
  toothNumber: number;
  brand: string;
  platform: string;
  size: string;
  abutmentType: string;
  abutmentOption: string;
  retentionMechanism: string;
}

export interface ProductVM {
  /** Raw slip product row (catalog icons for extraction status boxes). */
  apiProduct: any;
  arch: "maxillary" | "mandibular";
  extractionDisplay: ExtractionDisplayVM;
  image: string | null;
  /** Product display name, e.g. "Stay plate 4 teeth to replace". */
  title: string;
  /** "#7,8,9,10" or "All teeth missing". */
  teethLabel: string;
  missingTeeth: number[];
  willExtractTeeth: number[];
  claspTeeth: number[];
  restoration: string;
  productName: string;
  grade: string;
  stage: string;
  teethShade: string;
  gumShade: string;
  stumpShade: string;
  /** "1x Clean impression, 1x STL" */
  impression: string;
  /** "1x Light body, 1x Heavy body" from `opposite_impressions` when configured. */
  opposingImpression: string;
  /** ["3x Gold tooth"] */
  addOns: string[];
  isFixed: boolean;
  isImplant: boolean;
  /** Per-tooth implant + abutment details (one entry per implant tooth). */
  implants: ImplantVM[];
  /** Advance Mode configuration fields. */
  advanceFields: Array<{ label: string; value: string }>;
}

import { formatFieldValueForNote } from "@/components/case-design-center/utils/caseNoteBuilder";
import type { ExtractionDisplayVM } from "./virtual-slip-extraction-display";
import {
  buildExtractionDisplayFromSlipProduct,
  buildGroupedExtractionsChartDisplay,
  buildOpposingArchVM,
  extractionChipTeethFromSlipProduct,
  formatOpposingImpressions,
  hasExtractionChartOverlay,
  isGroupedSlipExtractions,
  mergeArchExtractionDisplays,
  mergePreloadExtractionDisplaysForArch,
  overlayPreloadExtractionsOnChartDisplay,
  productHasOpposingImpression,
} from "./virtual-slip-extraction-display";
import { hasDisplayValue } from "./virtual-slip-display";
import { resolveSlipDeliveryDates } from "./virtual-slip-rush-dates";

export type { ExtractionDisplayVM, OpposingArchVM } from "./virtual-slip-extraction-display";

export interface ArchVM {
  arch: "maxillary" | "mandibular";
  teeth: ToothVM[];
  selectedTeeth: number[];
  toothChartSelectionsByTooth: Record<
    number,
    { chartType: "Implant" | "Prep" | "Pontic" | null; imageUrl: string | null }
  >;
  /** visibility_type / overlay / clasp image state for removable tooth charts. */
  extractionDisplay: ExtractionDisplayVM;
  products: ProductVM[];
  /**
   * Impressions contributed by products on the OPPOSITE arch that have
   * `opposite_impression: "Yes"`. Displayed below the tooth chart on this side.
   * @deprecated Prefer `opposing.impression` when `opposing` is set.
   */
  opposingImpression: string;
  /** Opposing-arch chart + impressions (CDC opposing accordion), when configured. */
  opposing: import("./virtual-slip-extraction-display").OpposingArchVM | null;
}

export interface VirtualSlipHeaderVM {
  officeName: string;
  officeLogo: string | null;
  labName: string;
  labLogo: string | null;
  doctorName: string;
  doctorImage: string | null;
  createdByName: string;
  createdByImage: string | null;
  patientName: string;
  gender: string;
  age: string;
  slipNumber: string;
  caseNumber: string;
  panNumber: string;
  /** Case-level status (hold, in progress, etc.). */
  caseStatus: string;
  /** Current slip status. */
  slipStatus: string;
  /** @deprecated Prefer `caseStatus` for case-level checks. */
  status: string;
  location: string;
  /** `slip_locations` id when API provides it (listing / FAB actions). */
  locationId?: number;
  deliveryTime: string;
  dueDate: string;
  pickupDate: string;
  /** Slip or any product is on rush. */
  isRush: boolean;
  /** Standard (non-rush) due date when rushed; same as dueDate when not rushed. */
  standardDueDate: string;
  /** Rush target due date when rushed. */
  rushDueDate: string;
}

export type SlipProductArchKey = "maxillary" | "mandibular";

export interface SlipProductArchVisibility {
  hasMaxillary: boolean;
  hasMandibular: boolean;
  /** Arches that have at least one slip product (Upper/Lower). Same rule as slip creation. */
  visibleArches: SlipProductArchKey[];
}

export interface VirtualSlipVM {
  header: VirtualSlipHeaderVM;
  arches: { maxillary: ArchVM | null; mandibular: ArchVM | null };
  productArchVisibility: SlipProductArchVisibility;
  notes: string;
  relatedSlips: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAXILLARY_TEETH = Array.from({ length: 16 }, (_, i) => i + 1); // 1..16
const MANDIBULAR_TEETH = Array.from({ length: 16 }, (_, i) => 32 - i); // 32..17

/** "Upper" → maxillary, "Lower" → mandibular. */
function archFromType(type: string | null | undefined): SlipProductArchKey {
  const t = String(type ?? "").trim().toLowerCase();
  if (t === "lower" || t === "mandibular") return "mandibular";
  return "maxillary";
}

/** Which arches have rendered products (same source as rush arch slots). */
export function getProductArchVisibilityFromArches(
  arches: VirtualSlipVM["arches"]
): SlipProductArchVisibility {
  const hasMaxillary = (arches.maxillary?.products?.length ?? 0) > 0;
  const hasMandibular = (arches.mandibular?.products?.length ?? 0) > 0;
  const visibleArches: SlipProductArchKey[] = [];
  if (hasMaxillary) visibleArches.push("maxillary");
  if (hasMandibular) visibleArches.push("mandibular");
  if (visibleArches.length === 0) {
    return {
      hasMaxillary: true,
      hasMandibular: true,
      visibleArches: ["maxillary", "mandibular"],
    };
  }
  return { hasMaxillary, hasMandibular, visibleArches };
}

/** Which arches have products on this slip (raw API `type` field). */
export function getSlipProductArchVisibility(products: unknown[]): SlipProductArchVisibility {
  let hasMaxillary = false;
  let hasMandibular = false;
  for (const p of products) {
    if (!p || typeof p !== "object") continue;
    const arch = archFromType((p as { type?: string }).type);
    if (arch === "maxillary") hasMaxillary = true;
    else hasMandibular = true;
  }
  const visibleArches: SlipProductArchKey[] = [];
  if (hasMaxillary) visibleArches.push("maxillary");
  if (hasMandibular) visibleArches.push("mandibular");
  if (visibleArches.length === 0) {
    return {
      hasMaxillary: true,
      hasMandibular: true,
      visibleArches: ["maxillary", "mandibular"],
    };
  }
  return { hasMaxillary, hasMandibular, visibleArches };
}

/** Parse a teeth value that may be a comma string, an array of numbers, or an array of objects. */
function parseTeeth(value: unknown): number[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  if (Array.isArray(value)) {
    return value
      .map((v: any) =>
        typeof v === "number"
          ? v
          : parseInt(String(v?.tooth_number ?? v?.tooth_num ?? v?.number ?? v), 10),
      )
      .filter((n) => !isNaN(n));
  }
  return [];
}

/** Read the first non-empty string from a list of candidate values. */
function firstStr(...vals: Array<unknown>): string {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/**
 * Format an ISO date string to MM/DD/YY. Parses the date components directly
 * from the string (rather than via `new Date()`) so the calendar day is not
 * shifted by the viewer's timezone, and so 6-digit microsecond fractions
 * (e.g. "2026-06-11T07:00:00.000000Z") parse reliably.
 */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  const [, year, month, day] = m;
  return `${month}/${day}/${year.slice(2)}`;
}

/** `yyyy-MM-dd` prefix for APIs/modals (rush modal, date pickers). */
export function isoDateFromApiTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : "";
}

/**
 * Format a time to "h:mm AM/PM". Reads the hour/minute directly from the ISO
 * string's time portion (the stored UTC value, not the viewer's local time).
 * Accepts full ISO datetimes ("...T13:30:00.000000Z") or bare "HH:mm[:ss]".
 */
function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /T(\d{2}):(\d{2})/.exec(iso) ?? /^(\d{1,2}):(\d{2})/.exec(iso);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(min)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, "0")} ${ampm}`;
}

/** Format an impressions array into "1x Clean impression, 1x STL". */
function formatImpressions(impressions: unknown): string {
  return formatOpposingImpressions(impressions);
}

/** Format an addons array into ["3x Gold tooth", ...]. */
function formatAddOns(addons: unknown): string[] {
  if (!Array.isArray(addons)) return [];
  return addons
    .map((a: any) => {
      const qty = a?.quantity ?? a?.qty ?? 1;
      const name = firstStr(a?.addon?.name, a?.add_on?.name, a?.name);
      return name ? `${qty}x ${name}` : "";
    })
    .filter(Boolean);
}

/**
 * Build the per-product implant VM from the dedicated implant_details /
 * abutment_details arrays returned by GET /v1/slip/slip/{id}/details.
 * The exact expanded shape of these rows isn't fully documented, so each field
 * is read across a few likely key names.
 */
function buildImplantRow(
  impRow: any,
  abRow: any,
  toothNumber: number,
  retentionMechanism: string,
): ImplantVM {
  const sizeObj =
    typeof impRow?.size === "object" && impRow.size !== null
      ? impRow.size
      : (impRow?.implant_platform_size ?? impRow?.platform_size ?? {});

  const size =
    firstStr(
      sizeObj.label,
      sizeObj.name,
      typeof impRow?.size === "string" ? impRow.size : null,
      impRow?.custom_size,
      impRow?.size_label,
    ) ||
    (() => {
      const d = firstStr(impRow?.diameter, impRow?.implant_diameter, sizeObj.diameter_mm, sizeObj.diameter);
      const l = firstStr(impRow?.length, impRow?.implant_length, sizeObj.length_mm, sizeObj.length);
      return d && l ? `Ø ${d} mm × ${l} mm` : "";
    })();

  return {
    toothNumber,
    brand: firstStr(
      impRow?.implant?.brand_name,
      impRow?.implant?.name,
      impRow?.brand,
      impRow?.brand_name,
    ),
    platform: firstStr(
      impRow?.platform?.name,
      impRow?.implant_platform?.name,
      impRow?.platform_name,
      impRow?.system_name,
    ),
    size,
    abutmentType: firstStr(
      abRow?.abutment_type?.type,
      abRow?.abutment_type?.name,
      abRow?.abutmentType,
    ),
    abutmentOption: firstStr(
      abRow?.abutment_option?.name,
      abRow?.abutmentOption,
    ),
    retentionMechanism,
  };
}

/** Build per-tooth implant VMs from implant_details + abutment_details arrays. */
function buildImplants(apiProduct: any): ImplantVM[] {
  const implantDetails: any[] = Array.isArray(apiProduct?.implant_details)
    ? apiProduct.implant_details
    : [];

  // Build abutment lookup keyed by tooth_number.
  const abutmentByTooth: Record<number, any> = {};
  if (Array.isArray(apiProduct?.abutment_details)) {
    for (const ab of apiProduct.abutment_details) {
      const tn = Number(ab?.tooth_number);
      if (Number.isFinite(tn)) abutmentByTooth[tn] = ab;
    }
  }

  // Build retention mechanism lookup keyed by tooth_number.
  const retentionByTooth: Record<number, string> = {};
  if (Array.isArray(apiProduct?.retentions)) {
    for (const r of apiProduct.retentions) {
      const tn = Number(r?.teeth_number ?? r?.tooth_number);
      if (Number.isFinite(tn)) retentionByTooth[tn] = firstStr(r?.name, r?.retention_name);
    }
  }

  if (implantDetails.length > 0) {
    return implantDetails
      .map((imp) => {
        const tn = Number(imp?.tooth_number);
        if (!Number.isFinite(tn)) return null;
        return buildImplantRow(imp, abutmentByTooth[tn] ?? {}, tn, retentionByTooth[tn] ?? "");
      })
      .filter((v): v is ImplantVM => v !== null);
  }

  // Legacy single-implant shape (older API responses).
  const legacy = apiProduct?.implant ?? apiProduct?.implant_detail ?? null;
  const abLegacy = Array.isArray(apiProduct?.abutment_details) ? (apiProduct.abutment_details[0] ?? {}) : {};
  if (legacy || apiProduct?.implant_brand) {
    const vm = buildImplantRow(legacy ?? {}, abLegacy, 0, firstStr(apiProduct?.retention_type));
    if (vm.brand || vm.platform || vm.size) return [vm];
  }

  return [];
}

/**
 * Substitute the teeth count into a variation name_template.
 * e.g. "[x tooth/teeth] crown" + 3 → "3 teeth crown"
 * e.g. "[x tooth/teeth] crown" + 1 → "1 tooth crown"
 */
function applyNameTemplate(template: string, count: number): string {
  return template.replace(/\[x ([^/\]]+)\/([^\]]+)\]/gi, (_, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`
  );
}

/** Map a single API product into a ProductVM. */
function buildProduct(apiProduct: any): ProductVM {
  const product = apiProduct?.product ?? {};
  const variation = apiProduct?.variation ?? null;
  const categoryName = firstStr(
    apiProduct?.category?.name,
    product?.subcategory?.category?.name,
    product?.category_name,
  );
  const isRemovable = categoryName.toLowerCase().includes("removable");
  const implants = buildImplants(apiProduct);
  const isImplant = !isRemovable && implants.length > 0;
  const isFixed = !isRemovable;

  const teeth = parseTeeth(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  const extractionDisplay = buildExtractionDisplayFromSlipProduct(apiProduct);
  const productArch = archFromType(apiProduct?.type);
  const chipTeeth = hasExtractionChartOverlay(extractionDisplay)
    ? extractionChipTeethFromSlipProduct(apiProduct, extractionDisplay, productArch)
    : null;
  const missingTeeth =
    chipTeeth?.missingTeeth ??
    parseTeeth(apiProduct?.missing_teeth ?? apiProduct?.missing);
  const willExtractTeeth =
    chipTeeth?.willExtractTeeth ??
    parseTeeth(apiProduct?.extraction_teeth ?? apiProduct?.will_extract);

  const teethLabel = formatToothNumbersLabel(teeth);

  const variationImage = firstStr(variation?.image_url, variation?.image) || null;
  const productImage = firstStr(product?.image_url, product?.image, apiProduct?.image) || null;

  const variationTitle = variation?.name_template
    ? applyNameTemplate(variation.name_template, teeth.length)
    : "";
  const productTitle = firstStr(product?.name, apiProduct?.name, "Product");

  // Advance field saved values for the "Advance Mode configuration" expander.
  // Each entry in apiProduct.advance_fields carries its own label via the nested
  // `advance_field.name` — no separate definitions array from product is needed.
  const advanceFields: Array<{ label: string; value: string }> = [];
  if (Array.isArray(apiProduct?.advance_fields)) {
    // Optional product-level defs map (older API shape where product carries its own advance_fields array).
    const defs: Record<number, string> = {};
    if (Array.isArray(product?.advance_fields)) {
      for (const def of product.advance_fields) {
        if (def?.id) defs[def.id] = def?.name ?? "";
      }
    }
    const productAdvanceDefs = Array.isArray(product?.advance_fields)
      ? product.advance_fields
      : undefined;
    for (const saved of apiProduct.advance_fields) {
      const id = saved?.advance_field_id ?? saved?.id;
      const rawValue = firstStr(
        saved?.advance_field_value,
        saved?.value,
        saved?.teeth_shade?.name,
        saved?.file?.name,
      );
      const value =
        formatFieldValueForNote(rawValue, productAdvanceDefs) ||
        (rawValue.startsWith("{") || rawValue.startsWith("[") ? "" : rawValue);
      // Prefer the nested advance_field.name (present in v2 response); fall back to defs map.
      const label = firstStr(saved?.advance_field?.name, defs[id], saved?.name);
      if (label && hasDisplayValue(value)) advanceFields.push({ label, value });
    }
  }

  // Teeth shade: direct field first; fall back to the first shade_guide advance_field
  // (e.g. "Base Shade") when the product stores all shades as advance fields.
  const teethShadeFromAdvance = (() => {
    if (!Array.isArray(apiProduct?.advance_fields)) return "";
    for (const saved of apiProduct.advance_fields) {
      if (saved?.advance_field?.field_type === "shade_guide") {
        return firstStr(saved?.teeth_shade?.name, saved?.advance_field_value);
      }
    }
    return "";
  })();

  const stumpShadeFromAdvance = (() => {
    if (!Array.isArray(apiProduct?.advance_fields)) return "";
    for (const saved of apiProduct.advance_fields) {
      const name: string = (saved?.advance_field?.name ?? "").toLowerCase();
      if (name.includes("stump") && saved?.advance_field?.field_type === "shade_guide") {
        return firstStr(saved?.teeth_shade?.name, saved?.advance_field_value);
      }
    }
    return "";
  })();

  return {
    apiProduct,
    arch: productArch,
    extractionDisplay,
    image: variationImage ?? productImage,
    title: variationTitle || productTitle,
    teethLabel,
    missingTeeth,
    willExtractTeeth,
    claspTeeth: chipTeeth?.claspTeeth ?? [],
    restoration: categoryName,
    productName: firstStr(product?.name, apiProduct?.name),
    grade: firstStr(apiProduct?.grade?.name, apiProduct?.grade_name),
    stage: firstStr(apiProduct?.stage?.name, apiProduct?.stage_name),
    teethShade: firstStr(apiProduct?.teeth_shade?.name, apiProduct?.teeth_shade_name, teethShadeFromAdvance),
    gumShade: firstStr(apiProduct?.gum_shade?.name, apiProduct?.gum_shade_name),
    stumpShade: firstStr(apiProduct?.stump_shade?.name, apiProduct?.stump_shade_name, stumpShadeFromAdvance),
    impression: formatImpressions(apiProduct?.impressions),
    opposingImpression: productHasOpposingImpression(apiProduct)
      ? formatOpposingImpressions(apiProduct?.opposite_impressions)
      : "",
    addOns: formatAddOns(apiProduct?.addons ?? apiProduct?.add_ons),
    isFixed,
    isImplant,
    implants: isImplant ? implants : [],
    advanceFields,
  };
}

/** Join slip-level notes ({ note }[]); fall back to per-product notes. */
function collectNotes(slipNotes: unknown, products: any[]): string {
  if (Array.isArray(slipNotes) && slipNotes.length > 0) {
    const joined = slipNotes
      .map((n: any) => firstStr(typeof n === "string" ? n : n?.note))
      .filter(Boolean)
      .join("\n");
    if (joined) return joined;
  }
  return products
    .map((p: any) => firstStr(p?.notes))
    .filter(Boolean)
    .join("\n");
}

/** Build a single arch's tooth chart + products.
 *  `allProducts` is the full list; the function filters by arch internally.
 *  It also collects opposing tooth-chart images and impressions contributed
 *  by products on the OTHER arch so they appear on the correct side. */
function buildArch(arch: "maxillary" | "mandibular", allProducts: any[]): ArchVM | null {
  const archProducts = allProducts.filter((p) => archFromType(p?.type) === arch);
  /** Opposite_* fields live on the other arch's products; render on this column (CDC layout). */
  let opposing = buildOpposingArchVM(
    arch === "mandibular" ? "maxillary" : "mandibular",
    allProducts,
  );
  // When this column has its own product(s), opposing impressions belong on the
  // product summary — not in the cross-arch "Opposing" block (CDC dual-arch slip).
  if (opposing && archProducts.length > 0) {
    opposing = { ...opposing, showImpression: false, impression: "" };
  }
  const hasOpposingData = opposing != null;

  // Return null only when there are no direct products AND no opposing data for this arch.
  if (archProducts.length === 0 && !hasOpposingData) return null;

  const productVMs = archProducts.map(buildProduct);

  // Top arch chart: grouped extractions only (MT / WEOD / clasps), not product teeth_selection.
  let extractionDisplay = mergeArchExtractionDisplays(
    archProducts.map(buildGroupedExtractionsChartDisplay),
  );

  const preloadDisplay = mergePreloadExtractionDisplaysForArch(archProducts, arch);
  if (preloadDisplay) {
    extractionDisplay = overlayPreloadExtractionsOnChartDisplay(
      extractionDisplay,
      preloadDisplay,
      archProducts,
    );
  }
  const useExtractionOverlay = hasExtractionChartOverlay(extractionDisplay);

  // Aggregate per-tooth statuses across all products in this arch.
  const missing = new Set<number>();
  const willExtract = new Set<number>();
  const implant = new Set<number>();
  const selected = new Set<number>();
  const toothChartSelectionsByTooth: Record<
    number,
    { chartType: "Implant" | "Prep" | "Pontic" | null; imageUrl: string | null }
  > = {};

  const normalizeChartType = (raw: unknown): "Implant" | "Prep" | "Pontic" | null => {
    const value = firstStr(raw).toLowerCase();
    if (!value) return null;
    if (value === "i") return "Implant";
    if (value === "p") return "Prep";
    if (value.includes("implant")) return "Implant";
    if (value.includes("prep")) return "Prep";
    if (value.includes("pontic")) return "Pontic";
    return null;
  };

  const isFixedSlipProduct = (product: any): boolean => {
    const categoryName = firstStr(
      product?.category?.name,
      product?.product?.subcategory?.category?.name,
      product?.product?.category_name,
    );
    return !categoryName.toLowerCase().includes("removable");
  };

  const isRemovableSlipProduct = (product: any): boolean => !isFixedSlipProduct(product);

  const applyRetentionOptionsToChart = (product: any) => {
    if (!isFixedSlipProduct(product) || !Array.isArray(product?.retention_options)) return;

    for (const opt of product.retention_options) {
      const toothNumber = Number(opt?.teeth_number ?? opt?.tooth_number);
      if (!Number.isFinite(toothNumber)) continue;

      const chartType = normalizeChartType(
        opt?.tooth_chart_type ?? opt?.name ?? opt?.code ?? opt?.retention_option?.name,
      );
      const imageUrl =
        firstStr(
          opt?.selected_tooth_image_url,
          opt?.selected_image_url,
          opt?.image_url,
          opt?.retention_option?.selected_tooth_image_url,
          opt?.retention_option?.image_url,
        ) || null;

      if (!chartType && !imageUrl) continue;

      const existing = toothChartSelectionsByTooth[toothNumber];
      toothChartSelectionsByTooth[toothNumber] = {
        chartType: chartType ?? existing?.chartType ?? null,
        imageUrl: imageUrl ?? existing?.imageUrl ?? null,
      };
    }
  };

  const getToothChartRows = (product: any): any[] => {
    const candidates = [
      product?.slip_product_teeth_selections,
      product?.selected_teeth,
      product?.selected_teeth_map,
      product?.tooth_chart,
      product?.tooth_chart_entries,
      product?.tooth_chart_details,
      product?.tooth_selections,
      product?.teeth_selection,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  };

  for (const p of archProducts) {
    parseTeeth(p?.teeth_selection ?? p?.teeth).forEach((t) => selected.add(t));
    if (!useExtractionOverlay) {
      parseTeeth(p?.missing_teeth ?? p?.missing).forEach((t) => missing.add(t));
      parseTeeth(p?.extraction_teeth ?? p?.will_extract).forEach((t) => willExtract.add(t));
      if (!isGroupedSlipExtractions(p?.extractions)) {
        parseTeeth(p?.extractions).forEach((t) => willExtract.add(t));
      }
    }
    if (Array.isArray(p?.retentions)) {
      for (const r of p.retentions) {
        const name = (r?.retention?.name ?? r?.retention_name ?? "").toLowerCase();
        const tn = r?.tooth_number ?? r?.tooth_num;
        if (name === "implant" && tn) implant.add(tn);
      }
    }

    // Fixed products only: retention / prep images on the arch chart.
    // Removable arch chart is extractions-only; product teeth live in the summary below.
    if (!isRemovableSlipProduct(p)) {
      for (const row of getToothChartRows(p)) {
        const toothNumber = Number(row?.tooth_number ?? row?.tooth_chart_entry?.tooth_number);
        if (!Number.isFinite(toothNumber)) continue;
        const entry = row?.tooth_chart_entry ?? {};
        const chartType = normalizeChartType(
          entry?.chart_type ??
            row?.chart_type ??
            entry?.retention_option?.name ??
            row?.retention_option?.name
        );
        const imageUrl =
          firstStr(
            row?.selected_tooth_image_url,
            entry?.selected_tooth_image_url,
            entry?.selected_image_url,
            row?.image_url,
            entry?.retention_option_image_url,
            row?.selected_image_url
          ) || null;

        toothChartSelectionsByTooth[toothNumber] = { chartType, imageUrl };
      }

      applyRetentionOptionsToChart(p);

      const productDisplay = buildExtractionDisplayFromSlipProduct(p);
      for (const toothNumber of parseTeeth(p?.teeth_selection ?? p?.teeth)) {
        const code = productDisplay.toothExtractionMap[toothNumber];
        const extractionImageUrl = code
          ? productDisplay.extractionImagesByCode[code]?.[toothNumber] ?? null
          : null;
        if (!extractionImageUrl) continue;
        const existing = toothChartSelectionsByTooth[toothNumber];
        toothChartSelectionsByTooth[toothNumber] = {
          chartType: existing?.chartType ?? "Prep",
          imageUrl: existing?.imageUrl ?? extractionImageUrl,
        };
      }
    }
  }

  const order = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  const teeth: ToothVM[] = order.map((number) => {
    let status: ToothStatus = "in_mouth";
    if (willExtract.has(number)) status = "will_extract";
    else if (missing.has(number)) status = "missing";
    else if (implant.has(number)) status = "implant";
    return { number, status };
  });

  const opposingOnly = archProducts.length === 0 && opposing != null;
  const opposingColumn = opposingOnly ? opposing : null;

  return {
    arch: opposingColumn?.arch ?? arch,
    teeth: opposingColumn?.teeth ?? teeth,
    selectedTeeth: opposingColumn ? [] : Array.from(selected),
    toothChartSelectionsByTooth: opposingColumn ? {} : toothChartSelectionsByTooth,
    extractionDisplay: opposingColumn?.extractionDisplay ?? extractionDisplay,
    products: productVMs,
    opposingImpression: opposing?.impression ?? "",
    opposing,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function buildVirtualSlipVM(d: any): VirtualSlipVM {
  const safe = d ?? {};
  const caseObj = safe.case ?? {};
  const products: any[] = Array.isArray(safe.products)
    ? safe.products
    : Array.isArray(safe.slips?.[0]?.products)
      ? safe.slips[0].products
      : [];

  const relatedSlipsRaw = safe.related_slips ?? safe.relatedSlips ?? [];
  const relatedSlips: string[] = Array.isArray(relatedSlipsRaw)
    ? relatedSlipsRaw
        .map((r: any) => firstStr(typeof r === "string" ? r : r?.slip_number, r?.number))
        .filter(Boolean)
    : [];

  // created_by appears both top-level (slip / paper-slip responses) and nested
  // under `case` (case-details response); read name/image across both so the
  // avatar resolves from whichever source carries it.
  const deliveryDates = resolveSlipDeliveryDates(safe, products);

  const header: VirtualSlipHeaderVM = {
    officeName: firstStr(caseObj.office?.name, safe.office?.name),
    officeLogo: firstStr(caseObj.office?.logo_url, caseObj.office?.image) || null,
    labName: firstStr(caseObj.lab?.name, safe.lab?.name) || "Lab",
    labLogo: firstStr(caseObj.lab?.logo_url, caseObj.lab?.image) || null,
    doctorName: firstStr(caseObj.doctor?.name, safe.doctor?.name),
    doctorImage: resolveDoctorImageUrl(caseObj.doctor) || null,
    createdByName: firstStr(safe.created_by?.name, caseObj.created_by?.name),
    createdByImage: firstStr(safe.created_by?.image, caseObj.created_by?.image) || null,
    patientName: firstStr(caseObj.patient_name),
    gender: firstStr(caseObj.gender),
    age: firstStr(caseObj.age),
    slipNumber: firstStr(safe.slip_number),
    caseNumber: firstStr(caseObj.case_number),
    panNumber: firstStr(safe.casepan?.number, caseObj.casepan?.number),
    caseStatus: firstStr(caseObj.case_status, safe.status),
    slipStatus: firstStr(safe.status, caseObj.case_status),
    status: firstStr(caseObj.case_status, safe.status),
    location: firstStr(safe.location?.current?.name, safe.location?.name),
    locationId:
      typeof safe.location?.current?.id === "number"
        ? safe.location.current.id
        : typeof safe.location?.id === "number"
          ? safe.location.id
          : typeof safe.location_id === "number"
            ? safe.location_id
            : undefined,
    deliveryTime: formatTime(safe.delivery?.delivery_time),
    dueDate: deliveryDates.dueDate,
    pickupDate: formatDate(safe.delivery?.pickup_date),
    isRush: deliveryDates.isRush,
    standardDueDate: deliveryDates.standardDueDate,
    rushDueDate: deliveryDates.rushDueDate,
  };

  // Slip notes are an array ({ note }), one per added note. Join them; fall back
  // to per-product notes if the slip-level notes array is empty.
  const notes = collectNotes(safe.notes, products);

  const arches = {
    maxillary: buildArch("maxillary", products),
    mandibular: buildArch("mandibular", products),
  };

  return {
    header,
    arches,
    productArchVisibility: getProductArchVisibilityFromArches(arches),
    notes,
    relatedSlips,
  };
}
