import { resolveLatestSlipNoteText } from "@/lib/paper-slip-notes-display";
import { resolveSlipDeliveryTimeDisplay } from "@/utils/time-utils";
import { buildOpposingArchVM } from "./virtual-slip-extraction-display.ts";
import { resolveSlipDeliveryDates } from "./virtual-slip-rush-dates.ts";
import {
  isSplintedSlipProduct,
  parseSplintedTeethToLinks,
} from "@/components/case-design-center/utils/splintHelpers";

export type PaperSlipArch = "maxillary" | "mandibular";
export type PaperSlipArchMode = "extraction" | "retention" | "default";
export type PaperSlipChartType = "Implant" | "Prep" | "Pontic" | null;
export type PaperSlipImageSource = "extraction" | "retention" | "default";
export type PaperSlipDetailRowKind =
  | "fixed"
  | "implant_retention"
  | "removable"
  | "mixed";
export type PaperSlipToothStatus = "in_mouth" | "missing" | "will_extract" | "implant";

export interface PaperSlipChartSelection {
  toothNumber: number;
  source: PaperSlipImageSource;
  imageUrl: string;
  chartType: PaperSlipChartType;
}

export interface PaperSlipCallout {
  label: string;
  teethNumbers: number[];
  source: Exclude<PaperSlipImageSource, "default"> | "missing" | "product";
  /** Extraction's own status image (greyed "missing" tooth / X-marked "extract"
   *  tooth) used as the chip icon, when available. */
  iconUrl?: string | null;
}

export interface PaperSlipDetailField {
  label: string;
  value: string;
}

export interface PaperSlipImplantGroupVM {
  toothNumbers: number[];
  retentionHeader: string;
  fields: PaperSlipDetailField[];
}

export interface PaperSlipDetailRow {
  kind: PaperSlipDetailRowKind;
  title: string;
  teethLabel: string;
  fields: PaperSlipDetailField[];
  /** One entry per unique implant spec group (teeth with identical brand/platform/
   *  size/abutment/retention share one block, matching virtual-slip-v2's grouping).
   *  Non-empty only when kind === "implant_retention". */
  implantGroups: PaperSlipImplantGroupVM[];
}

export interface PaperSlipToothVM {
  number: number;
  status: PaperSlipToothStatus;
}

export interface PaperSlipArchVM {
  arch: PaperSlipArch;
  mode: PaperSlipArchMode;
  allMissing: boolean;
  /** True when the arch has retention/implant products and no extraction visuals.
   *  Suppresses the status-chip row and shows the "Scan QR for implant details" note. */
  hasImplantNote: boolean;
  selectedTeeth: number[];
  teeth: PaperSlipToothVM[];
  toothChartSelectionsByTooth: Record<number, PaperSlipChartSelection>;
  /** Prominent product box(es): "{product} to replace #teeth", shown above the
   *  missing / will-extract status chips. */
  productCallouts: PaperSlipCallout[];
  callouts: PaperSlipCallout[];
  detailRows: PaperSlipDetailRow[];
  /** Lower tooth number per splinted adjacent pair (read-only chart connectors). */
  splintedLinks?: number[];
}

export interface PaperSlipPrintHeaderVM {
  labName: string;
  labAddress: string;
  labCode: string;
  labLogoUrl: string | null;
  qrCodeUrl: string | null;
  officeName: string;
  doctorName: string;
  doctorLicenseNumber: string;
  patientName: string;
  gender: string;
  age: string;
  caseNumber: string;
  slipNumber: string;
  locationName: string;
  pickupDate: string;
  dueDate: string;
  casePanNumber: string;
}

export interface PaperSlipPrintFooterVM {
  labPhone: string;
  labEmail: string;
  relatedSlips: string[];
}

/** Opposing-jaw work for an arch with no direct products: the formatted opposite
 *  impression and any opposite-extraction callouts, mirroring the virtual slip. */
export interface PaperSlipOpposingVM {
  impression: string;
  callouts: PaperSlipCallout[];
}

export interface PaperSlipPrintableSlipVM {
  slipId: number;
  slipNumber: string;
  caseNumber: string;
  title: string;
  isRush: boolean;
  header: PaperSlipPrintHeaderVM;
  arches: {
    maxillary: PaperSlipArchVM | null;
    mandibular: PaperSlipArchVM | null;
  };
  opposing: {
    maxillary: PaperSlipOpposingVM | null;
    mandibular: PaperSlipOpposingVM | null;
  };
  notes: string[];
  footer: PaperSlipPrintFooterVM;
}

export interface PaperSlipPrintVM {
  arches: {
    maxillary: PaperSlipArchVM | null;
    mandibular: PaperSlipArchVM | null;
  };
}

const MAXILLARY_TEETH = Array.from({ length: 16 }, (_, index) => index + 1);
const MANDIBULAR_TEETH = Array.from({ length: 16 }, (_, index) => index + 17);

function archFromType(type: unknown): PaperSlipArch {
  return String(type ?? "").trim().toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

function firstStr(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function parseTeeth(value: unknown): number[] {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((item) => Number.isFinite(item));
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) =>
      typeof item === "number"
        ? item
        : Number.parseInt(
            String(item?.tooth_number ?? item?.teeth_number ?? item?.tooth_num ?? item?.number ?? item),
            10,
          ),
    )
    .filter((item) => Number.isFinite(item));
}

function formatTeethLabel(selectedTeeth: number[], missingTeeth: Set<number>): string {
  if (selectedTeeth.length > 0 && selectedTeeth.every((tooth) => missingTeeth.has(tooth))) {
    return "All teeth missing";
  }
  return selectedTeeth.length > 0 ? `#${selectedTeeth.join(",")}` : "";
}

function defaultToothImage(arch: PaperSlipArch, toothNumber: number): string {
  return `/images/teeth/${arch}/tooth-${toothNumber}.png?v=2`;
}

function nonEmptyUrl(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function normalizeChartType(value: unknown): PaperSlipChartType {
  const normalized = firstStr(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("implant")) return "Implant";
  if (normalized.includes("prep")) return "Prep";
  if (normalized.includes("pontic")) return "Pontic";
  return null;
}

function getSelectedRows(product: any): any[] {
  const candidates = [
    product?.selected_teeth,
    product?.selected_teeth_map,
    product?.tooth_chart,
    product?.tooth_chart_entries,
    product?.tooth_chart_details,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function findRetentionOption(product: any, row: any): any | null {
  const options = Array.isArray(product?.retention_options) ? product.retention_options : [];
  if (!options.length) return null;

  const toothNumber = Number(
    row?.tooth_number ?? row?.teeth_number ?? row?.tooth_chart_entry?.tooth_number ?? 0,
  );
  const retentionOptionId = Number(
    row?.retention_option_id ?? row?.tooth_chart_entry?.retention_option_id ?? 0,
  );

  if (retentionOptionId > 0) {
    const byId = options.find(
      (option: any) =>
        Number(option?.retention_option_id ?? option?.id ?? 0) === retentionOptionId &&
        (Number(option?.teeth_number ?? toothNumber) === toothNumber || option?.teeth_number == null),
    );
    if (byId) return byId;
  }

  const chartType = normalizeChartType(
    row?.chart_type ??
      row?.tooth_chart_entry?.chart_type ??
      row?.retention_option?.name ??
      row?.tooth_chart_entry?.retention_option?.name,
  );

  if (!chartType) return null;

  return (
    options.find(
      (option: any) =>
        normalizeChartType(
          option?.tooth_chart_type ??
            option?.retention_option?.tooth_chart_type ??
            option?.lab_retention_option?.tooth_chart_type ??
            option?.name,
        ) === chartType &&
        (Number(option?.teeth_number ?? toothNumber) === toothNumber || option?.teeth_number == null),
    ) ?? null
  );
}

function resolveRetentionImage(option: any, toothNumber: number): string | null {
  if (!option) return null;

  const selectedImage =
    nonEmptyUrl(option?.selected_tooth_image_url) ??
    nonEmptyUrl(option?.selectedToothImageUrl);
  if (selectedImage) return selectedImage;

  const images = Array.isArray(option?.images) ? option.images : [];
  const toothImage = images.find(
    (image: any) => Number(image?.tooth_number ?? image?.tooth_num) === toothNumber,
  );

  return (
    nonEmptyUrl(toothImage?.image_url) ??
    nonEmptyUrl(toothImage?.image) ??
    nonEmptyUrl(option?.image_url) ??
    nonEmptyUrl(option?.retention_option?.image_url) ??
    nonEmptyUrl(option?.lab_retention_option?.image_url) ??
    nonEmptyUrl(option?.global_connection?.sample_image_url)
  );
}

function findExtraction(product: any, row: any): any | null {
  const extractions = Array.isArray(product?.extractions) ? product.extractions : [];
  const ids = [
    ...(Array.isArray(row?.extraction_ids) ? row.extraction_ids : []),
    row?.extraction_id,
    row?.tooth_chart_entry?.extraction_id,
  ]
    .map((value) => Number(value))
    .filter((value) => value > 0);

  for (const extractionId of ids) {
    const match = extractions.find(
      (extraction: any) =>
        Number(extraction?.extraction_id ?? extraction?.id ?? 0) === extractionId,
    );
    if (match) return match;
  }

  return null;
}

function resolveExtractionImage(extraction: any, toothNumber: number): string | null {
  if (!extraction) return null;

  const images = Array.isArray(extraction?.images) ? extraction.images : [];
  const toothImage = images.find(
    (image: any) => Number(image?.tooth_number ?? image?.tooth_num) === toothNumber,
  );

  return (
    nonEmptyUrl(toothImage?.image_url) ??
    nonEmptyUrl(toothImage?.image) ??
    nonEmptyUrl(extraction?.image_url) ??
    nonEmptyUrl(extraction?.sample_image_url) ??
    nonEmptyUrl(extraction?.url)
  );
}

function getRetentionNames(option: any): string[] {
  const links = Array.isArray(option?.retentions) ? option.retentions : [];
  const names: string[] = [];

  for (const link of links) {
    if (String(link?.status ?? "Active").trim() !== "Active") continue;
    const name = firstStr(link?.name, link?.retention?.name);
    if (name && !names.includes(name)) names.push(name);
  }

  return names;
}

function formatImpressions(impressions: unknown): string {
  if (!Array.isArray(impressions)) return "";
  return impressions
    .map((item: any) => {
      const quantity = item?.quantity ?? item?.qty ?? 1;
      const name = firstStr(item?.impression?.name, item?.name, item?.code);
      return name ? `${quantity}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function formatAddOns(addons: unknown): string {
  if (!Array.isArray(addons)) return "";
  return addons
    .map((item: any) => {
      const quantity = item?.quantity ?? item?.qty ?? 1;
      const name = firstStr(item?.addon?.name, item?.add_on?.name, item?.name);
      return name ? `${quantity}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function isRemovableProduct(product: any): boolean {
  return firstStr(product?.category?.name, product?.product?.subcategory?.category?.name)
    .toLowerCase()
    .includes("removable");
}

function classifyDetailRow(product: any): PaperSlipDetailRowKind {
  if (isRemovableProduct(product)) return "removable";

  const selectedRows = getSelectedRows(product);
  const hasRetentionSelection = selectedRows.some(
    (row) => Number(row?.retention_option_id ?? row?.tooth_chart_entry?.retention_option_id ?? 0) > 0,
  );
  const hasImplantRetention = Array.isArray(product?.retentions)
    ? product.retentions.some((entry: any) =>
        firstStr(entry?.retention?.name, entry?.name, entry?.retention_name).toLowerCase().includes("implant"),
      )
    : false;
  // retention_options with has_implant:"Yes" — the primary signal in the S123 data shape
  const hasImplantOption = Array.isArray(product?.retention_options)
    ? product.retention_options.some((opt: any) => opt?.has_implant === "Yes")
    : false;

  return hasRetentionSelection || hasImplantRetention || hasImplantOption
    ? "implant_retention"
    : "fixed";
}

function buildDetailFields(product: any, rowKind: PaperSlipDetailRowKind): PaperSlipDetailField[] {
  const fields: PaperSlipDetailField[] = [];
  const maybePush = (label: string, value: string) => {
    if (value) fields.push({ label, value });
  };

  maybePush(
    "Restoration",
    firstStr(product?.category?.name, product?.product?.subcategory?.category?.name),
  );
  maybePush("Product", firstStr(product?.product?.name, product?.name));
  maybePush("Grade", firstStr(product?.grade?.name, product?.grade_name));
  maybePush("Stage", firstStr(product?.stage?.name, product?.stage_name));
  maybePush("Teeth shade", firstStr(product?.teeth_shade?.name, product?.teeth_shade_name));
  maybePush("Gum shade", firstStr(product?.gum_shade?.name, product?.gum_shade_name));
  maybePush("Stump shade", firstStr(product?.stump_shade?.name, product?.stump_shade_name));
  maybePush("Impression", formatImpressions(product?.impressions));
  maybePush("Add ons", formatAddOns(product?.addons));

  return fields;
}

/** Alias for clarity inside this file. */
type PaperSlipImplantGroup = PaperSlipImplantGroupVM;

function formatImplantRetentionHeader(retention: string): string {
  const normalized = (retention ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return "Implant";
  if (normalized.includes("screw")) return "Screwed";
  if (normalized.includes("cement")) return "Cemented";
  return retention.trim();
}

/** Resolve the per-tooth abutment lookup keyed by tooth_number. */
function buildAbutmentByTooth(product: any): Record<number, any> {
  const map: Record<number, any> = {};
  if (!Array.isArray(product?.abutment_details)) return map;
  for (const ab of product.abutment_details) {
    const tn = Number(ab?.tooth_number);
    if (Number.isFinite(tn)) map[tn] = ab;
  }
  return map;
}

/** Resolve retention mechanism per tooth from retentions array. */
function buildRetentionByTooth(product: any): Record<number, string> {
  const map: Record<number, string> = {};
  if (!Array.isArray(product?.retentions)) return map;
  for (const r of product.retentions) {
    const tn = Number(r?.teeth_number ?? r?.tooth_number);
    if (Number.isFinite(tn)) map[tn] = firstStr(r?.name, r?.retention?.name, r?.retention_name);
  }
  return map;
}

/**
 * Build grouped implant entries matching virtual-slip-v2's groupVirtualSlipImplants logic:
 * group teeth with identical brand/platform/size/abutment/retention into one block.
 */
function buildImplantGroups(product: any): PaperSlipImplantGroup[] {
  const implantDetails: any[] = Array.isArray(product?.implant_details) ? product.implant_details : [];

  if (implantDetails.length === 0) {
    const legacy = product?.implant ?? product?.implant_detail ?? null;
    const retentionOptions: any[] = Array.isArray(product?.retention_options) ? product.retention_options : [];
    const retentions: any[] = Array.isArray(product?.retentions) ? product.retentions : [];

    // Build per-tooth retention name lookup from retentions array
    const retentionNameByTooth: Record<number, string> = {};
    for (const r of retentions) {
      const tn = Number(r?.teeth_number ?? r?.tooth_number);
      if (Number.isFinite(tn) && tn > 0) {
        retentionNameByTooth[tn] = firstStr(r?.name, r?.retention?.name) ?? "";
      }
    }

    // retention_options with has_implant:"Yes" — group implant teeth by retention type
    const implantOptions = retentionOptions.filter((opt: any) => opt?.has_implant === "Yes");
    if (implantOptions.length > 0) {
      // Build per-tooth abutment lookup (if abutment_details available)
      const abutmentByTooth = buildAbutmentByTooth(product);

      type GroupKey = string;
      const groups = new Map<GroupKey, { toothNumbers: number[]; impRow: any; abRow: any; retention: string }>();
      for (const opt of implantOptions) {
        const tn = Number(opt?.teeth_number ?? opt?.tooth_number);
        const abRow = Number.isFinite(tn) ? (abutmentByTooth[tn] ?? {}) : {};
        const retention = Number.isFinite(tn) && tn > 0 ? (retentionNameByTooth[tn] ?? "") : "";
        // Use retention option's own implant/abutment data if present
        const impRow = opt?.implant_detail ?? opt?.implant ?? {};
        const key = JSON.stringify({ retention });
        const existing = groups.get(key);
        if (existing) {
          if (Number.isFinite(tn) && tn > 0) existing.toothNumbers.push(tn);
        } else {
          groups.set(key, {
            toothNumbers: Number.isFinite(tn) && tn > 0 ? [tn] : [],
            impRow,
            abRow,
            retention,
          });
        }
      }
      return Array.from(groups.values()).map(({ toothNumbers, impRow, abRow, retention }) => ({
        toothNumbers: [...toothNumbers].sort((a, b) => a - b),
        retentionHeader: formatImplantRetentionHeader(retention),
        fields: buildImplantFieldsFromRows(impRow, abRow),
      }));
    }

    // Absolute legacy: single implant object on the product root
    const abLegacy = Array.isArray(product?.abutment_details) ? (product.abutment_details[0] ?? {}) : {};
    const retentionName = firstStr(
      retentions[0]?.retention?.name,
      retentions[0]?.name,
      retentionOptions[0]?.name,
      retentionOptions[0]?.retention_option?.name,
    );
    const fields = buildImplantFieldsFromRows(legacy ?? {}, abLegacy);
    if (fields.length === 0 && !legacy) return [];
    const selectedTeeth = parseTeeth(product?.teeth_selection ?? product?.teeth);
    return [{
      toothNumbers: selectedTeeth,
      retentionHeader: formatImplantRetentionHeader(retentionName),
      fields,
    }];
  }

  const abutmentByTooth = buildAbutmentByTooth(product);
  const retentionByTooth = buildRetentionByTooth(product);

  // Group by identical implant+abutment spec (mirrors implantDetailsKey)
  type GroupKey = string;
  const groups = new Map<GroupKey, { toothNumbers: number[]; impRow: any; abRow: any; retention: string }>();

  for (const imp of implantDetails) {
    const tn = Number(imp?.tooth_number);
    const abRow = Number.isFinite(tn) ? (abutmentByTooth[tn] ?? {}) : {};
    const retention = Number.isFinite(tn) ? (retentionByTooth[tn] ?? "") : "";

    const sizeObj = typeof imp?.size === "object" && imp.size !== null ? imp.size : (imp?.implant_platform_size ?? {});
    const size = firstStr(sizeObj?.label, sizeObj?.name, typeof imp?.size === "string" ? imp.size : null, imp?.custom_size);
    const key = JSON.stringify({
      brand: firstStr(imp?.implant?.brand_name, imp?.implant?.name, imp?.brand, imp?.brand_name),
      platform: firstStr(imp?.platform?.name, imp?.implant_platform?.name, imp?.platform_name),
      size,
      abutmentType: firstStr(abRow?.abutment_type?.type, abRow?.abutment_type?.name),
      abutmentOption: firstStr(abRow?.abutment_option?.name),
      retention,
    });

    const existing = groups.get(key);
    if (existing) {
      if (Number.isFinite(tn) && tn > 0) existing.toothNumbers.push(tn);
    } else {
      groups.set(key, {
        toothNumbers: Number.isFinite(tn) && tn > 0 ? [tn] : [],
        impRow: imp,
        abRow,
        retention,
      });
    }
  }

  return Array.from(groups.values()).map(({ toothNumbers, impRow, abRow, retention }) => ({
    toothNumbers: [...toothNumbers].sort((a, b) => a - b),
    retentionHeader: formatImplantRetentionHeader(retention),
    fields: buildImplantFieldsFromRows(impRow, abRow),
  }));
}

function buildImplantFieldsFromRows(impRow: any, abRow: any): PaperSlipDetailField[] {
  const fields: PaperSlipDetailField[] = [];
  const maybePush = (label: string, value: string) => {
    if (value) fields.push({ label, value });
  };

  const sizeObj = typeof impRow?.size === "object" && impRow.size !== null ? impRow.size : (impRow?.implant_platform_size ?? {});
  const size = firstStr(sizeObj?.label, sizeObj?.name, typeof impRow?.size === "string" ? impRow.size : null, impRow?.custom_size);

  maybePush("Implant Brand", firstStr(impRow?.implant?.brand_name, impRow?.implant?.name, impRow?.brand, impRow?.brand_name));
  maybePush("Implant Platform", firstStr(impRow?.platform?.name, impRow?.implant_platform?.name, impRow?.platform_name));
  maybePush("Implant Size", size);
  maybePush("Abutment Type", firstStr(abRow?.abutment_type?.type, abRow?.abutment_type?.name));
  maybePush("Abutment Option", firstStr(abRow?.abutment_option?.name));

  return fields;
}


function buildProductDetailRows(products: any[]): PaperSlipDetailRow[] {
  const rows = products.map((product) => {
    const selectedTeeth = parseTeeth(product?.teeth_selection ?? product?.teeth);
    const missingTeeth = new Set(parseTeeth(product?.missing_teeth ?? product?.missing));
    const kind = classifyDetailRow(product);

    return {
      kind,
      title: firstStr(product?.product?.name, product?.name, "Product"),
      teethLabel: formatTeethLabel(selectedTeeth, missingTeeth),
      fields: buildDetailFields(product, kind),
      implantGroups: kind === "implant_retention" ? buildImplantGroups(product) : [],
    } satisfies PaperSlipDetailRow;
  });

  const nonMixedKinds = Array.from(
    new Set(rows.map((row) => row.kind).filter((kind) => kind !== "mixed")),
  );

  if (nonMixedKinds.length > 1) {
    rows.unshift({
      kind: "mixed",
      title: "Mixed case",
      teethLabel: "",
      fields: [
        {
          label: "Contains",
          value: nonMixedKinds
            .map((kind) => kind.replace("_", " "))
            .join(", "),
        },
      ],
      implantGroups: [],
    });
  }

  return rows;
}

function buildCallouts(
  mode: PaperSlipArchMode,
  extractionVisuals: Map<number, { label: string; iconUrl?: string | null }>,
  retentionVisuals: Map<number, { label: string; iconUrl?: string | null }>,
  allMissing: boolean,
): PaperSlipCallout[] {
  // When all teeth are missing, the "All teeth missing" label is shown as a
  // subtitle inside the product box (like virtual-slip-v2), not as a separate pill.
  if (allMissing) {
    return [];
  }

  // Retention images show on the tooth chart and in the implant detail panel —
  // not as separate status chips below the chart.
  if (mode === "retention") {
    return [];
  }

  const sourceMap = mode === "extraction" ? extractionVisuals : null;
  if (!sourceMap) return [];

  const grouped = new Map<string, PaperSlipCallout>();
  for (const [toothNumber, item] of sourceMap.entries()) {
    const label = item.label || (mode === "extraction" ? "Extraction" : "Retention");
    // A "missing"-type extraction drives the chip's icon + source so the greyed
    // tooth image and label match the virtual slip.
    const source: PaperSlipCallout["source"] =
      mode === "extraction" && /missing/i.test(label) ? "missing" : mode;
    const key = `${source}:${label}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.teethNumbers.push(toothNumber);
      continue;
    }
    grouped.set(key, {
      label,
      teethNumbers: [toothNumber],
      source,
      iconUrl: item.iconUrl ?? null,
    });
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    teethNumbers: item.teethNumbers.sort((a, b) => a - b),
  }));
}

/** Label for the prominent product callout box, e.g. "1 tooth Flipper" or
 *  "Stay plate 4 teeth to replace". Resolves the variation `[x tooth/teeth]`
 *  token to the actual tooth count; falls back to the product name. */
function productCalloutLabel(product: any, toothCount: number): string {
  const template = firstStr(product?.variation?.name_template);
  if (template) {
    const teethWord = toothCount === 1 ? "tooth" : "teeth";
    return template
      .replace(/\[x\s*tooth\/teeth\]/gi, `${toothCount} ${teethWord}`)
      .replace(/\[x\s*teeth\]/gi, `${toothCount} ${teethWord}`)
      .replace(/\[x\]/gi, String(toothCount))
      .replace(/\s+/g, " ")
      .trim();
  }
  return firstStr(product?.product?.name, product?.name);
}

function extractionStatusFromLabel(label: string): PaperSlipToothStatus {
  const normalized = label.toLowerCase();
  if (normalized.includes("missing")) return "missing";
  if (normalized.includes("extract")) return "will_extract";
  return "in_mouth";
}

function buildArchVM(arch: PaperSlipArch, products: any[]): PaperSlipArchVM | null {
  const archProducts = products.filter((product) => archFromType(product?.type) === arch);
  if (archProducts.length === 0) return null;

  const order = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  const selectedTeeth = new Set<number>();
  const missingTeeth = new Set<number>();
  const extractionVisuals = new Map<
    number,
    { imageUrl: string; label: string; chartType: PaperSlipChartType; iconUrl: string | null }
  >();
  const retentionVisuals = new Map<number, { imageUrl: string; label: string; chartType: PaperSlipChartType }>();

  for (const product of archProducts) {
    parseTeeth(product?.teeth_selection ?? product?.teeth).forEach((tooth) => selectedTeeth.add(tooth));
    parseTeeth(product?.missing_teeth ?? product?.missing).forEach((tooth) => missingTeeth.add(tooth));

    // Grouped slip extractions ({ extraction:{name,code,images}, teeth_numbers })
    // are the authoritative source for Missing / Will-extract status and per-tooth
    // images (the slip-details payload stores them here, not in selected_teeth rows).
    for (const grouped of Array.isArray(product?.extractions) ? product.extractions : []) {
      const extraction = grouped?.extraction ?? grouped;
      const label = firstStr(extraction?.name, extraction?.code, "Extraction");
      const isMissing = /missing/i.test(label) || /^mt(_|$)/i.test(firstStr(extraction?.code));
      const extractionIconUrl = nonEmptyUrl(extraction?.image_url);
      for (const toothNumber of parseTeeth(grouped?.teeth_numbers)) {
        if (isMissing) missingTeeth.add(toothNumber);
        const extractionImage = resolveExtractionImage(extraction, toothNumber);
        if (extractionImage && !extractionVisuals.has(toothNumber)) {
          extractionVisuals.set(toothNumber, {
            imageUrl: extractionImage,
            label,
            chartType: null,
            iconUrl: extractionIconUrl ?? extractionImage,
          });
        }
      }
    }

    for (const row of getSelectedRows(product)) {
      const toothNumber = Number(row?.tooth_number ?? row?.teeth_number ?? row?.tooth_chart_entry?.tooth_number);
      if (!Number.isFinite(toothNumber)) continue;

      const extraction = findExtraction(product, row);
      const extractionImage = resolveExtractionImage(extraction, toothNumber);
      if (extractionImage && !extractionVisuals.has(toothNumber)) {
        extractionVisuals.set(toothNumber, {
          imageUrl: extractionImage,
          label: firstStr(extraction?.name, extraction?.code, "Extraction"),
          chartType: normalizeChartType(row?.chart_type ?? row?.tooth_chart_entry?.chart_type),
          iconUrl: nonEmptyUrl(extraction?.image_url) ?? extractionImage,
        });
      }

      const option = findRetentionOption(product, row);
      const retentionImage = resolveRetentionImage(option, toothNumber);
      if (retentionImage && !retentionVisuals.has(toothNumber)) {
        retentionVisuals.set(toothNumber, {
          imageUrl: retentionImage,
          label: firstStr(
            option?.name,
            option?.retention_option?.name,
            option?.lab_retention_option?.name,
            "Retention",
          ),
          chartType: normalizeChartType(
            option?.tooth_chart_type ??
              option?.retention_option?.tooth_chart_type ??
              option?.lab_retention_option?.tooth_chart_type ??
              row?.chart_type ??
              row?.tooth_chart_entry?.chart_type,
          ),
        });
      }
    }

    // Direct retention_options pass — catches options that carry teeth_number
    // directly on the option itself (not via tooth_chart_entries rows). Mirrors
    // applyRetentionOptionsToChart in virtual-slip-view-model.ts.
    for (const opt of Array.isArray(product?.retention_options) ? product.retention_options : []) {
      const toothNumber = Number(opt?.teeth_number ?? opt?.tooth_number);
      if (!Number.isFinite(toothNumber) || toothNumber <= 0) continue;
      if (retentionVisuals.has(toothNumber)) continue;

      const imageUrl =
        nonEmptyUrl(opt?.selected_tooth_image_url) ??
        nonEmptyUrl(opt?.selected_image_url) ??
        nonEmptyUrl(opt?.image_url) ??
        nonEmptyUrl(opt?.retention_option?.selected_tooth_image_url) ??
        nonEmptyUrl(opt?.retention_option?.image_url) ??
        null;
      if (!imageUrl) continue;

      retentionVisuals.set(toothNumber, {
        imageUrl,
        label: firstStr(opt?.name, opt?.retention_option?.name, "Retention"),
        chartType: normalizeChartType(
          opt?.tooth_chart_type ??
            opt?.name ??
            opt?.code ??
            opt?.retention_option?.tooth_chart_type,
        ),
      });
    }
  }

  const selectedTeethList = order.filter((tooth) => selectedTeeth.has(tooth));
  // "All teeth missing" is the full-denture case: every tooth in the 16-tooth
  // arch order is flagged missing AND at least one was selected. Requires the
  // non-empty guard so an arch with no tooth data (empty missingTeeth set) never
  // vacuously collapses; a partial like a 4-tooth flipper never matches all 16.
  const allMissing =
    missingTeeth.size > 0 && selectedTeethList.length > 0 && order.every((tooth) => missingTeeth.has(tooth));

  // Prominent product box(es): "{product label} #teeth", scoped to this arch.
  const productCallouts: PaperSlipCallout[] = [];
  for (const product of archProducts) {
    const productTeeth = parseTeeth(product?.teeth_selection ?? product?.teeth)
      .filter((tooth) => order.includes(tooth))
      .sort((a, b) => a - b);
    if (productTeeth.length === 0) continue;
    const label = productCalloutLabel(product, productTeeth.length);
    if (!label) continue;
    productCallouts.push({ label, teethNumbers: productTeeth, source: "product", iconUrl: null });
  }
  const mode: PaperSlipArchMode =
    extractionVisuals.size > 0 ? "extraction" : retentionVisuals.size > 0 ? "retention" : "default";

  const toothChartSelectionsByTooth: Record<number, PaperSlipChartSelection> = {};
  const teeth: PaperSlipToothVM[] = [];

  for (const toothNumber of order) {
    const defaultSelection: PaperSlipChartSelection = {
      toothNumber,
      source: "default",
      imageUrl: defaultToothImage(arch, toothNumber),
      chartType: null,
    };

    let selection = defaultSelection;
    if (mode === "extraction" && extractionVisuals.has(toothNumber)) {
      const extraction = extractionVisuals.get(toothNumber)!;
      selection = {
        toothNumber,
        source: "extraction",
        imageUrl: extraction.imageUrl,
        chartType: extraction.chartType,
      };
    } else if (mode === "retention" && retentionVisuals.has(toothNumber)) {
      const retention = retentionVisuals.get(toothNumber)!;
      selection = {
        toothNumber,
        source: "retention",
        imageUrl: retention.imageUrl,
        chartType: retention.chartType,
      };
    }

    toothChartSelectionsByTooth[toothNumber] = selection;

    let status: PaperSlipToothStatus = "in_mouth";
    if (allMissing && selectedTeeth.has(toothNumber)) {
      status = "missing";
    } else if (selectedTeeth.has(toothNumber) && missingTeeth.has(toothNumber)) {
      // Only mark a tooth missing when it was explicitly selected — prevents
      // the missing_teeth field (which may cover all 32 teeth for a full denture)
      // from greying out unselected arch teeth.
      status = "missing";
    } else if (mode === "extraction" && extractionVisuals.has(toothNumber)) {
      status = extractionStatusFromLabel(extractionVisuals.get(toothNumber)!.label);
    } else if (
      mode === "retention" &&
      retentionVisuals.has(toothNumber) &&
      retentionVisuals.get(toothNumber)!.chartType === "Implant"
    ) {
      status = "implant";
    }

    teeth.push({
      number: toothNumber,
      status,
    });
  }

  const detailRows = buildProductDetailRows(archProducts);
  const hasImplantNote =
    mode === "retention" &&
    detailRows.some((row) => row.kind === "implant_retention");

  const splintedLinks = new Set<number>();
  for (const product of archProducts) {
    if (!isSplintedSlipProduct(product)) continue;
    for (const link of parseSplintedTeethToLinks(product?.splinted_teeth)) {
      splintedLinks.add(link);
    }
  }

  return {
    arch,
    mode,
    allMissing,
    hasImplantNote,
    selectedTeeth: selectedTeethList,
    teeth,
    toothChartSelectionsByTooth,
    productCallouts,
    callouts: buildCallouts(mode, extractionVisuals, retentionVisuals, allMissing),
    detailRows,
    ...(splintedLinks.size > 0
      ? { splintedLinks: Array.from(splintedLinks).sort((a, b) => a - b) }
      : {}),
  };
}

/** Format opposite_impressions rows as "{qty}x {name}" joined by ", ". */
function formatOpposingImpression(impressions: unknown): string {
  if (!Array.isArray(impressions)) return "";
  return impressions
    .map((imp: any) => {
      const qty = imp?.quantity ?? imp?.qty ?? 1;
      const name = firstStr(imp?.impression?.name, imp?.impression_name, imp?.name);
      return name ? `${qty}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

/** Opposite-extraction callouts for the target (opposite) arch. TIM ("Teeth in
 *  mouth") rows are skipped — they describe present teeth, not work to flag. */
function buildOpposingCallouts(product: any): PaperSlipCallout[] {
  const rows = Array.isArray(product?.opposite_extractions) ? product.opposite_extractions : [];
  const callouts: PaperSlipCallout[] = [];
  for (const grouped of rows) {
    const extraction = grouped?.extraction ?? grouped;
    const label = firstStr(extraction?.name, extraction?.code, "Extraction");
    const isTim =
      String(extraction?.is_tim ?? "").toLowerCase() === "yes" || /^tim/i.test(firstStr(extraction?.code));
    if (isTim) continue;
    const teethNumbers = parseTeeth(grouped?.teeth_numbers).sort((a, b) => a - b);
    if (teethNumbers.length === 0) continue;
    const source: PaperSlipCallout["source"] = /missing/i.test(label) ? "missing" : "extraction";
    const iconUrl =
      nonEmptyUrl(extraction?.image_url) ?? resolveExtractionImage(extraction, teethNumbers[0]);
    callouts.push({ label, teethNumbers, source, iconUrl });
  }
  return callouts;
}

/** Build the per-arch opposing block. A product's opposite work targets the
 *  opposite jaw. Skip opposing extractions and impressions when the target
 *  arch already has its own product (matches /virtual-slip-v2). */
function buildOpposing(products: any[]): {
  maxillary: PaperSlipOpposingVM | null;
  mandibular: PaperSlipOpposingVM | null;
} {
  const archHasProducts: Record<PaperSlipArch, boolean> = { maxillary: false, mandibular: false };
  for (const product of products) archHasProducts[archFromType(product?.type)] = true;

  const acc: Record<PaperSlipArch, { impressions: string[]; callouts: PaperSlipCallout[] }> = {
    maxillary: { impressions: [], callouts: [] },
    mandibular: { impressions: [], callouts: [] },
  };

  for (const product of products) {
    const target: PaperSlipArch = archFromType(product?.type) === "maxillary" ? "mandibular" : "maxillary";
    if (archHasProducts[target]) continue;
    const impression = formatOpposingImpression(product?.opposite_impressions);
    if (impression) acc[target].impressions.push(impression);
    acc[target].callouts.push(...buildOpposingCallouts(product));
  }

  const virtualOpposingByArch: Record<PaperSlipArch, ReturnType<typeof buildOpposingArchVM>> = {
    maxillary: buildOpposingArchVM("mandibular", products),
    mandibular: buildOpposingArchVM("maxillary", products),
  };

  const finalize = (arch: PaperSlipArch): PaperSlipOpposingVM | null => {
    const virtualOpposing = virtualOpposingByArch[arch];
    const impression = archHasProducts[arch]
      ? ""
      : [...new Set(acc[arch].impressions)].join(", ") || (virtualOpposing?.showImpression ? virtualOpposing.impression : "");
    const callouts = acc[arch].callouts;
    if (!impression && callouts.length === 0) return null;
    return { impression, callouts };
  };

  return { maxillary: finalize("maxillary"), mandibular: finalize("mandibular") };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${month}/${day}/${year.slice(2)}`;
}

function joinAddress(parts: unknown[]): string {
  return parts
    .map((part) => firstStr(part))
    .filter(Boolean)
    .join(", ");
}

function collectNotes(rawNotes: unknown): string[] {
  const latest = resolveLatestSlipNoteText(rawNotes);
  return latest ? [latest] : [];
}

export function buildPaperSlipPrintSlipVM(
  data: any,
  options?: { defaultDeliveryTime?: string | null },
): PaperSlipPrintableSlipVM {
  const caseData = data?.case ?? {};
  const lab = caseData?.lab ?? data?.lab ?? {};
  const office = caseData?.office ?? data?.office ?? {};
  const doctor = caseData?.doctor ?? caseData?.doctor_details ?? data?.doctor ?? {};
  const delivery = data?.delivery ?? {};
  const products = Array.isArray(data?.products) ? data.products : [];
  const deliveryDates = resolveSlipDeliveryDates(data, products);
  const relatedSlips = Array.isArray(caseData?.slips)
    ? caseData.slips.map((slip: any) => firstStr(slip?.slip_number)).filter(Boolean)
    : [];
  const dueTime = resolveSlipDeliveryTimeDisplay(
    delivery?.delivery_time,
    options?.defaultDeliveryTime,
  );
  const dueDate =
    deliveryDates.dueDate && dueTime
      ? `${deliveryDates.dueDate} @ ${dueTime}`
      : deliveryDates.dueDate || dueTime;

  return {
    slipId: Number(data?.id ?? 0),
    slipNumber: firstStr(data?.slip_number),
    caseNumber: firstStr(caseData?.case_number),
    title: firstStr(products[0]?.variation?.name_template, products[0]?.product?.name, "Paper Slip"),
    isRush:
      data?.is_rush === true ||
      (Array.isArray(products) && products.some((product) => product?.rush?.is_rush === true)),
    header: {
      labName: firstStr(lab?.name),
      labAddress: joinAddress([
        lab?.address,
        lab?.city,
        lab?.state,
        lab?.postal_code,
      ]),
      labCode: firstStr(lab?.code, caseData?.lab_code),
      labLogoUrl: nonEmptyUrl(lab?.logo_url) ?? null,
      qrCodeUrl: nonEmptyUrl(data?.qr_code_url) ?? null,
      officeName: firstStr(office?.name),
      doctorName: firstStr(doctor?.name),
      doctorLicenseNumber: firstStr(doctor?.license_number, doctor?.license_no),
      patientName: firstStr(caseData?.patient_name),
      gender: firstStr(caseData?.gender),
      age: firstStr(caseData?.age),
      caseNumber: firstStr(caseData?.case_number),
      slipNumber: firstStr(data?.slip_number),
      locationName: firstStr(data?.location?.name),
      pickupDate: formatDate(delivery?.pickup_date),
      dueDate,
      casePanNumber: firstStr(data?.casepan?.number, data?.casepan?.code, data?.casepan_number),
    },
    arches: {
      maxillary: buildArchVM("maxillary", products),
      mandibular: buildArchVM("mandibular", products),
    },
    opposing: buildOpposing(products),
    notes: collectNotes(data?.notes),
    footer: {
      labPhone: firstStr(lab?.phone, lab?.phone_number),
      labEmail: firstStr(lab?.email),
      relatedSlips,
    },
  };
}

export function buildPaperSlipPrintVM(data: any): PaperSlipPrintVM {
  const slip = buildPaperSlipPrintSlipVM(data);
  return {
    arches: slip.arches,
  };
}
