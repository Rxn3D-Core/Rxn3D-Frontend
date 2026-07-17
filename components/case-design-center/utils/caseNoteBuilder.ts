import type {
  Arch,
  ImplantDetailData,
  NotesProps,
  ProductAdvanceField,
  ProductApiData,
  ProductGumShade,
  ProductTeethShade,
  RetentionType,
  SlipProductSnapshot,
} from "../types";
import { getCategoryName, hasRetentionOptions, isNonRetentionCategory } from "./categoryHelpers";
import { resolveProductTeethForSlipSubmit } from "./removableToothDisplay";
import {
  buildShadeSelectionKey,
  getShadeFieldType,
  getShadeGuideAdvanceFields,
  resolveFixedShadeProductId,
} from "./shadeGuideAdvanceFields";

export type ProductNoteWorkflow = "fixed" | "removable" | "orthodontic";

export interface NoteGroup {
  arch: Arch;
  category: string;
  cardId: number;
  productName: string;
  teeth: number[];
  note: string;
}

export interface ProductNoteContext {
  arch: Arch;
  teeth: number[];
  /** All teeth on the card (including missing/extracted) for extraction lines */
  allCardTeeth?: number[];
  product: ProductApiData | null;
  repTooth: number;
  getFieldValue: NotesProps["getFieldValue"];
  getSelectedShade: NotesProps["getSelectedShade"];
  getImpressionDisplayText?: NotesProps["getImpressionDisplayText"];
  selectedStages?: NotesProps["selectedStages"];
  maxillaryRetentionTypes?: NotesProps["maxillaryRetentionTypes"];
  mandibularRetentionTypes?: NotesProps["mandibularRetentionTypes"];
  maxillaryToothExtractionMap?: NotesProps["maxillaryToothExtractionMap"];
  mandibularToothExtractionMap?: NotesProps["mandibularToothExtractionMap"];
  implantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Panel-level implant fields (right1 = mandibular, right2 = maxillary) */
  panelImplantBrand?: string;
  panelImplantPlatform?: string;
  panelImplantInclusion?: string;
  /** Active teeth shade guide (e.g. Vita Classical) for removable notes. */
  shadeGuide?: string;
}

const FIXED_MULTI_FIELD_STEPS = [
  "fixed_characterization",
  "fixed_contact_icons",
  "fixed_margin",
  "fixed_metal",
  "fixed_proximal_contact",
] as const;

const FIXED_SIMPLE_FIELD_STEPS: Array<{ step: string; fallbackLabel: string }> = [
  { step: "fixed_retention_type", fallbackLabel: "Retention mechanism" },
  { step: "fixed_notes", fallbackLabel: "Additional notes" },
];

const ADVANCE_FIELD_STEP_MATCHERS: Record<string, (name: string) => boolean> = {
  fixed_characterization: (n) =>
    n.includes("characterization") ||
    n.includes("character") ||
    n.includes("intensity") ||
    n.includes("surface finish") ||
    n.includes("surface_finish"),
  fixed_contact_icons: (n) =>
    n.includes("occlusal") ||
    n.includes("pontic") ||
    n.includes("embrasure") ||
    (n.includes("proximal") && n.includes("contact") && !n.includes("mesial") && !n.includes("distal")),
  fixed_proximal_contact: (n) =>
    (n.includes("proximal") && n.includes("contact") && (n.includes("mesial") || n.includes("distal"))) ||
    n.includes("functional guidance"),
  fixed_margin: (n) => n.includes("margin"),
  fixed_metal: (n) => n.includes("metal"),
};

export function formatTeethNumbers(teeth: number[]): string {
  if (teeth.length === 0) return "";
  const sorted = [...teeth].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `#${start}` : `#${start}–#${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `#${start}` : `#${start}–#${end}`);
  return ranges.join(", ");
}

/** `#11 and #12` style list for removable fabrication lines. */
export function formatTeethNumbersWithAnd(teeth: number[]): string {
  if (teeth.length === 0) return "";
  const sorted = [...teeth].sort((a, b) => a - b);
  const labels = sorted.map((tn) => `#${tn}`);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

interface ShadeNoteInfo {
  name: string;
  systemName: string;
}

function parseShadeSelectionField(raw: string): {
  shadeId: number;
  brandId: number;
  name: string;
} {
  if (!raw?.trim()) return { shadeId: 0, brandId: 0, name: "" };
  try {
    const parsed = JSON.parse(raw) as {
      teeth_shade_id?: number;
      gum_shade_id?: number;
      brand_id?: number;
      name?: string;
    };
    return {
      shadeId: Number(parsed.teeth_shade_id ?? parsed.gum_shade_id ?? 0),
      brandId: Number(parsed.brand_id ?? 0),
      name: String(parsed.name ?? "").trim(),
    };
  } catch {
    return { shadeId: 0, brandId: 0, name: raw.trim() };
  }
}

function resolveTeethShadeForNote(
  product: ProductApiData | null,
  raw: string,
  shadeGuide?: string,
): ShadeNoteInfo | null {
  const parsed = parseShadeSelectionField(raw);
  const name = parsed.name || parseFieldDisplayValue(raw);
  if (!name) return null;

  let systemName = shadeGuide?.trim() ?? "";
  const shades = (product?.teeth_shades ?? []) as ProductTeethShade[];
  if (!systemName && shades.length > 0) {
    const match =
      shades.find((row) => {
        const rowShadeId = Number(row.teeth_shade_id ?? row.id ?? 0);
        const rowBrandId = Number(row.brand?.id ?? 0);
        if (parsed.shadeId > 0 && rowShadeId === parsed.shadeId) return true;
        if (parsed.brandId > 0 && rowBrandId === parsed.brandId && row.name === name) return true;
        return row.name === name;
      }) ?? null;
    systemName = match?.brand?.system_name?.trim() ?? "";
  }

  return { name, systemName };
}

function resolveGumShadeForNote(
  product: ProductApiData | null,
  raw: string,
): ShadeNoteInfo | null {
  const parsed = parseShadeSelectionField(raw);
  const name = parsed.name || parseFieldDisplayValue(raw);
  if (!name) return null;

  let systemName = "";
  const shades = (product?.gum_shades ?? []) as ProductGumShade[];
  if (shades.length > 0) {
    const match =
      shades.find((row) => {
        const rowShadeId = Number(row.gum_shade_id ?? row.id ?? 0);
        const rowBrandId = Number(row.brand?.id ?? 0);
        if (parsed.shadeId > 0 && rowShadeId === parsed.shadeId) return true;
        if (parsed.brandId > 0 && rowBrandId === parsed.brandId && row.name === name) return true;
        return row.name === name;
      }) ?? null;
    systemName = match?.brand?.system_name?.trim() ?? "";
  }

  return { name, systemName };
}

function buildRemovableShadeClause(
  teethShade: ShadeNoteInfo | null,
  gumShade: ShadeNoteInfo | null,
): string {
  const teethPart = teethShade
    ? `${teethShade.systemName ? `${teethShade.systemName} ` : ""}${teethShade.name} denture`.trim()
    : "";
  const gumPart = gumShade
    ? `${gumShade.systemName ? `${gumShade.systemName} ` : ""}${gumShade.name} gingiva`.trim()
    : "";
  if (teethPart && gumPart) return `use ${teethPart} with ${gumPart}`;
  if (teethPart) return `use ${teethPart}`;
  if (gumPart) return `use ${gumPart}`;
  return "";
}

function buildExtractionClauses(
  allCardTeeth: number[],
  extractionMap: Record<number, string>,
  product: ProductApiData | null,
): string[] {
  const codeToName: Record<string, string> = {};
  for (const ext of product?.extractions ?? []) {
    if (ext.code && ext.name) codeToName[ext.code] = ext.name;
  }
  const byCode: Record<string, number[]> = {};
  for (const tn of allCardTeeth) {
    const code = extractionMap[tn];
    if (!code) continue;
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push(tn);
  }
  return Object.entries(byCode).map(([code, extractedTeeth]) => {
    const name = codeToName[code] || code;
    return `${name}: ${formatTeethNumbers(extractedTeeth.sort((a, b) => a - b))}`;
  });
}

export function getProductNoteWorkflow(product: ProductApiData | null): ProductNoteWorkflow {
  if (!product || hasRetentionOptions(product)) return "fixed";
  return "removable";
}

function getAdvanceFieldsForNoteStep(
  step: string,
  advanceFields?: ProductAdvanceField[],
): ProductAdvanceField[] {
  if (!advanceFields?.length) return [];
  const matcher = ADVANCE_FIELD_STEP_MATCHERS[step];
  if (!matcher) return [];
  return advanceFields
    .filter((f) => matcher((f.name || "").toLowerCase()))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

function resolveAdvanceFieldName(
  fieldIdKey: string,
  advanceFields: ProductAdvanceField[] | undefined,
): string {
  const id = Number(fieldIdKey);
  if (!Number.isNaN(id)) {
    const match = advanceFields?.find((f) => f.id === id);
    if (match?.name) return match.name;
  }
  return fieldIdKey;
}

function isToothNumberKey(key: string): boolean {
  const n = Number(key);
  return Number.isInteger(n) && n >= 1 && n <= 32;
}

function allKeysMatchAdvanceFieldIds(
  keys: string[],
  advanceFields: ProductAdvanceField[] | undefined,
): boolean {
  if (!advanceFields?.length || keys.length === 0) return false;
  const idSet = new Set(advanceFields.map((f) => f.id));
  return keys.every((key) => {
    const id = Number(key);
    return Number.isInteger(id) && idSet.has(id);
  });
}

function selectionNameFromValue(val: unknown): string {
  if (val && typeof val === "object" && val !== null && "name" in val) {
    return String((val as { name?: string }).name ?? "").trim();
  }
  if (typeof val === "string") return val.trim();
  return "";
}

function formatPerToothSelectionMap(parsed: Record<string, unknown>): string {
  const parts = Object.entries(parsed)
    .filter(([key]) => isToothNumberKey(key))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tooth, val]) => {
      const name = selectionNameFromValue(val);
      return name ? `#${tooth} ${name}` : null;
    })
    .filter((part): part is string => Boolean(part));
  return parts.join(", ");
}

/** Human-readable value — never returns raw JSON strings. */
export function formatFieldValueForNote(
  raw: string | undefined | null,
  advanceFields?: ProductAdvanceField[],
): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  if (trimmed === "auto") return "Auto";
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && "skipped" in parsed && (parsed as { skipped?: boolean }).skipped) {
      return "";
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "name" in item) {
            return String((item as { name?: string }).name ?? "");
          }
          return "";
        })
        .filter(Boolean)
        .join(", ");
    }
    if (parsed && typeof parsed === "object" && parsed !== null) {
      if ("name" in parsed && typeof (parsed as { name?: unknown }).name === "string") {
        return String((parsed as { name: string }).name);
      }
      const record = parsed as Record<string, unknown>;
      const keys = Object.keys(record);
      if (
        keys.length > 0 &&
        keys.every(isToothNumberKey) &&
        !allKeysMatchAdvanceFieldIds(keys, advanceFields)
      ) {
        const perTooth = formatPerToothSelectionMap(record);
        if (perTooth) return perTooth;
      }
      const entries = Object.entries(record);
      const parts: string[] = [];
      for (const [key, val] of entries) {
        if (val && typeof val === "object" && val !== null && "name" in val) {
          const label = resolveAdvanceFieldName(key, advanceFields);
          const value = String((val as { name?: string }).name ?? "").trim();
          if (value) parts.push(`${label}: ${value}`);
        } else if (typeof val === "string" && val.trim()) {
          parts.push(`${resolveAdvanceFieldName(key, advanceFields)}: ${val.trim()}`);
        }
      }
      if (parts.length > 0) return parts.join("; ");
    }
  } catch {
    /* fall through */
  }
  return "";
}

function appendLabeledLines(lines: string[], label: string, value: string | undefined | null): void {
  const display = formatFieldValueForNote(value);
  if (!display) return;
  if (display.includes(": ") && display.includes("; ")) {
    for (const segment of display.split("; ")) {
      const colon = segment.indexOf(": ");
      if (colon > 0) lines.push(`${segment.slice(0, colon)}: ${segment.slice(colon + 2)}.`);
      else lines.push(`${label}: ${segment}.`);
    }
    return;
  }
  if (display.includes(": ") && !display.includes("; ")) {
    lines.push(`${display}.`);
    return;
  }
  lines.push(`${label}: ${display}.`);
}

function appendFixedAdvanceFieldLines(
  lines: string[],
  arch: Arch,
  repTooth: number,
  step: string,
  getFieldValue: NotesProps["getFieldValue"],
  product: ProductApiData | null,
): void {
  const raw = getFieldValue(arch, repTooth, step);
  const advanceFields = product?.advance_fields;
  const formatted = formatFieldValueForNote(raw, advanceFields);
  if (!formatted) return;

  const stepFields = getAdvanceFieldsForNoteStep(step, advanceFields);
  if (stepFields.length > 0 && formatted.includes(": ")) {
    for (const segment of formatted.split("; ")) {
      const colon = segment.indexOf(": ");
      if (colon > 0) lines.push(`${segment.slice(0, colon)}: ${segment.slice(colon + 2)}.`);
    }
    return;
  }

  const fallback =
    step === "fixed_characterization"
      ? "Characterization"
      : step === "fixed_contact_icons"
        ? "Contacts"
        : step === "fixed_margin"
          ? "Margin"
          : step === "fixed_metal"
            ? "Metal"
            : step === "fixed_proximal_contact"
              ? "Proximal contact"
              : step;
  lines.push(`${fallback}: ${formatted}.`);
}

function appendFixedShadeLines(
  lines: string[],
  product: ProductApiData | null,
  productShadeId: string,
  arch: Arch,
  getSelectedShade: NotesProps["getSelectedShade"],
): void {
  const shadeFields = getShadeGuideAdvanceFields(product?.advance_fields);
  if (shadeFields.length > 0) {
    for (const field of shadeFields) {
      const fieldType = getShadeFieldType(field);
      const value = getSelectedShade(productShadeId, arch, fieldType, field.id);
      if (value) lines.push(`${field.name}: ${value}.`);
    }
    return;
  }
  const stump = getSelectedShade(productShadeId, arch, "stump_shade");
  const tooth = getSelectedShade(productShadeId, arch, "tooth_shade");
  if (stump) lines.push(`Stump shade: ${stump}.`);
  if (tooth) lines.push(`Tooth shade: ${tooth}.`);
}

function parseFieldDisplayValue(raw: string): string {
  return formatFieldValueForNote(raw);
}

function appendDetailLine(lines: string[], label: string, value: string | undefined | null): void {
  appendLabeledLines(lines, label, value);
}

function resolveFixedStageName(
  arch: Arch,
  minTooth: number,
  repTooth: number,
  getFieldValue: NotesProps["getFieldValue"],
  selectedStages?: NotesProps["selectedStages"],
): string {
  const legacyKey = `fixed_${minTooth}`;
  const archFixedKey = `${arch}_fixed_${repTooth}`;
  const archPrepKey = `${arch}_prep_${repTooth}`;
  return (
    selectedStages?.[legacyKey] ??
    selectedStages?.[archFixedKey] ??
    selectedStages?.[archPrepKey] ??
    getFieldValue(arch, repTooth, "fixed_stage") ??
    getFieldValue(arch, repTooth, "stage") ??
    ""
  );
}

function buildPerToothRetentionSummary(
  teeth: number[],
  retentionTypes: Record<number, RetentionType[]>,
): string | null {
  const parts: string[] = [];
  for (const tn of [...teeth].sort((a, b) => a - b)) {
    const types = retentionTypes[tn];
    if (!types?.length) continue;
    parts.push(`#${tn} (${types.join("/")})`);
  }
  if (parts.length === 0) return null;
  return `Retention: ${parts.join("; ")}.`;
}

function buildImplantDetailSummary(
  implantDetailByTooth: Record<number, ImplantDetailData> | undefined,
  teeth: number[],
): string | null {
  if (!implantDetailByTooth) return null;
  const lines: string[] = [];
  for (const tn of [...teeth].sort((a, b) => a - b)) {
    const detail = implantDetailByTooth[tn];
    if (!detail) continue;
    const bits: string[] = [];
    if (detail.brand) bits.push(detail.brand);
    if (detail.systemName) bits.push(detail.systemName);
    if (detail.platform) bits.push(`platform ${detail.platform}`);
    if (detail.size) bits.push(`size ${detail.size}`);
    if (detail.abutmentType || detail.abutmentDetail) {
      bits.push([detail.abutmentType, detail.abutmentDetail].filter(Boolean).join(" "));
    }
    if (detail.inclusions) bits.push(detail.inclusions);
    if (bits.length > 0) lines.push(`#${tn}: ${bits.join(", ")}`);
  }
  if (lines.length === 0) return null;
  return `Implant details: ${lines.join("; ")}.`;
}

function appendExtractionStatusLines(
  lines: string[],
  allCardTeeth: number[],
  extractionMap: Record<number, string>,
  product: ProductApiData | null,
): void {
  const codeToName: Record<string, string> = {};
  for (const ext of product?.extractions ?? []) {
    if (ext.code && ext.name) codeToName[ext.code] = ext.name;
  }
  const byCode: Record<string, number[]> = {};
  for (const tn of allCardTeeth) {
    const code = extractionMap[tn];
    if (!code) continue;
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push(tn);
  }
  for (const [code, extractedTeeth] of Object.entries(byCode)) {
    const name = codeToName[code] || code;
    lines.push(`${name}: ${formatTeethNumbers(extractedTeeth.sort((a, b) => a - b))}.`);
  }
}

function resolveFixedShadeForNote(
  product: ProductApiData | null,
  shadeName: string,
  shadeGuide?: string,
): ShadeNoteInfo | null {
  if (!shadeName) return null;
  let systemName = shadeGuide?.trim() ?? "";
  const shades = (product?.teeth_shades ?? []) as ProductTeethShade[];
  if (!systemName && shades.length > 0) {
    const match = shades.find((row) => row.name === shadeName) ?? null;
    systemName = match?.brand?.system_name?.trim() ?? "";
  }
  return { name: shadeName, systemName };
}

export function buildFixedProductNote(ctx: ProductNoteContext): string {
  const {
    arch,
    teeth,
    product,
    repTooth,
    getFieldValue,
    getSelectedShade,
    selectedStages,
  } = ctx;
  const productName = product?.name || "restoration";
  const teethStr = formatTeethNumbers(teeth);
  const minTooth = teeth.length ? Math.min(...teeth) : repTooth;

  const grade = parseFieldDisplayValue(getFieldValue(arch, repTooth, "grade"));
  const stageName = resolveFixedStageName(arch, minTooth, repTooth, getFieldValue, selectedStages);
  const productShadeId = resolveFixedShadeProductId(product?.id, minTooth);

  const shadeFields = getShadeGuideAdvanceFields(product?.advance_fields);
  let shadeClause = "";
  if (shadeFields.length > 0) {
    const primaryField = shadeFields[0];
    const fieldType = getShadeFieldType(primaryField);
    const shadeName = getSelectedShade(productShadeId, arch, fieldType, primaryField.id);
    if (shadeName) {
      const info = resolveFixedShadeForNote(product, shadeName, ctx.shadeGuide);
      if (info) {
        shadeClause = `, shade ${info.systemName ? `${info.systemName} ` : ""}${info.name}`.trimEnd();
      }
    }
  } else {
    const toothShadeName = getSelectedShade(productShadeId, arch, "tooth_shade");
    if (toothShadeName) {
      const info = resolveFixedShadeForNote(product, toothShadeName, ctx.shadeGuide);
      if (info) {
        shadeClause = `, shade ${info.systemName ? `${info.systemName} ` : ""}${info.name}`.trimEnd();
      }
    }
  }

  const gradeBit = grade ? `${grade} ` : "";
  let line = `Please fabricate ${gradeBit}${productName}`;
  if (teethStr) line += ` for ${teethStr}`;
  if (stageName) line += ` for ${stageName}`;
  line += shadeClause;

  return `${line}.`;
}

export function buildRemovableProductNote(ctx: ProductNoteContext): string {
  const { arch, teeth, product, repTooth, getFieldValue, selectedStages } = ctx;
  const productName = product?.name || "removable";
  const grade = parseFieldDisplayValue(getFieldValue(arch, repTooth, "grade"));
  const stageKey = `${arch}_prep_${repTooth}`;
  const stageName =
    selectedStages?.[stageKey] ??
    parseFieldDisplayValue(getFieldValue(arch, repTooth, "stage")) ??
    null;

  const teethShade = resolveTeethShadeForNote(
    product,
    getFieldValue(arch, repTooth, "teeth_shade"),
    ctx.shadeGuide,
  );

  const gradeBit = grade ? `${grade} ` : "";
  let line = `Please fabricate ${gradeBit}${productName}`;
  // `teeth` must be orange-header / teeth_selection only (not missing, extract, clasps).
  if (teeth.length > 0) line += ` for ${formatTeethNumbers(teeth)}`;
  if (stageName) line += ` for ${stageName}`;
  if (teethShade) {
    const shadeStr = `${teethShade.systemName ? `${teethShade.systemName} ` : ""}${teethShade.name}`.trim();
    if (shadeStr) line += `, shade ${shadeStr}`;
  }

  return `${line}.`;
}

export function buildOrthodonticProductNote(ctx: ProductNoteContext): string {
  const { arch, product, repTooth, getFieldValue, selectedStages } = ctx;
  const productName = product?.name || "orthodontic appliance";
  const stageKey = `${arch}_prep_${repTooth}`;
  const stageName =
    selectedStages?.[stageKey] ?? parseFieldDisplayValue(getFieldValue(arch, repTooth, "stage")) ?? null;

  let line = `Please fabricate ${productName}`;
  if (stageName) line += ` for ${stageName}`;
  return `${line}.`;
}

export function buildProductNoteFromContext(ctx: ProductNoteContext): string {
  if (getProductNoteWorkflow(ctx.product) === "fixed") return buildFixedProductNote(ctx);
  return buildRemovableProductNote(ctx);
}

export function buildProductNoteFromSnapshot(snapshot: SlipProductSnapshot): string {
  const arch = snapshot.type === "Upper" ? "maxillary" : "mandibular";
  const repTooth = snapshot.repToothNumber;
  const minTooth = snapshot.teethNumbers.length
    ? Math.min(...snapshot.teethNumbers)
    : repTooth;

  const getFieldValue = (_a: Arch, _t: number, step: string) =>
    snapshot.fieldValues[step] ?? "";

  const fixedShadeProductId = snapshot.productApiData?.id
    ? resolveFixedShadeProductId(snapshot.productApiData.id, minTooth)
    : `fixed_${minTooth}`;

  const getSelectedShade = (
    productId: string,
    a: Arch,
    fieldType: "tooth_shade" | "stump_shade",
    advanceFieldId?: number | null,
  ) => {
    const key = buildShadeSelectionKey(productId, a, fieldType, advanceFieldId);
    return snapshot.selectedShades[key] ?? "";
  };

  const stageEntries: Record<string, string> = {};
  if (snapshot.stageName) {
    stageEntries[`fixed_${minTooth}`] = snapshot.stageName;
    stageEntries[`${arch}_fixed_${repTooth}`] = snapshot.stageName;
    stageEntries[`${arch}_prep_${repTooth}`] = snapshot.stageName;
  }

  const ctx: ProductNoteContext = {
    arch,
    teeth: snapshot.teethNumbers,
    allCardTeeth: snapshot.teethNumbers,
    product: snapshot.productApiData,
    repTooth,
    getFieldValue,
    getSelectedShade,
    selectedStages: stageEntries,
    implantDetailByTooth: snapshot.implantDetailByTooth,
    shadeGuide: snapshot.shadeGuide ?? "",
  };

  return buildProductNoteFromContext(ctx);
}

function contextFromProps(
  arch: Arch,
  teeth: number[],
  allCardTeeth: number[],
  product: ProductApiData | null,
  repTooth: number,
  props: NotesProps,
): ProductNoteContext {
  const panelImplantBrand = arch === "maxillary" ? props.right2Brand : props.right1Brand;
  const panelImplantPlatform = arch === "maxillary" ? props.right2Platform : props.right1Platform;
  const panelImplantInclusion = arch === "maxillary" ? props.right2Inclusion : props.right1Inclusion;
  const implantDetailByTooth =
    arch === "maxillary"
      ? props.maxillaryImplantDetailByTooth
      : props.mandibularImplantDetailByTooth;

  return {
    arch,
    teeth,
    allCardTeeth,
    product,
    repTooth,
    getFieldValue: props.getFieldValue,
    getSelectedShade: props.getSelectedShade,
    getImpressionDisplayText: props.getImpressionDisplayText,
    selectedStages: props.selectedStages,
    maxillaryRetentionTypes: props.maxillaryRetentionTypes,
    mandibularRetentionTypes: props.mandibularRetentionTypes,
    maxillaryToothExtractionMap: props.maxillaryToothExtractionMap,
    mandibularToothExtractionMap: props.mandibularToothExtractionMap,
    implantDetailByTooth,
    panelImplantBrand,
    panelImplantPlatform,
    panelImplantInclusion,
    shadeGuide: props.selectedShadeGuide,
  };
}

/** Build note groups with Fixed / Removable / Orthodontic section labels (live UI). */
export function buildNoteGroups(props: NotesProps): NoteGroup[] {
  const groups: NoteGroup[] = [];
  const MAXILLARY_ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const MANDIBULAR_ALL = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

  for (const arch of ["maxillary", "mandibular"] as Arch[]) {
    const retTypes =
      arch === "maxillary" ? props.maxillaryRetentionTypes : props.mandibularRetentionTypes;
    const selectedTeeth = arch === "maxillary" ? props.maxillaryTeeth : props.mandibularTeeth;
    const allArchTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
    const claspTeeth =
      arch === "maxillary"
        ? props.maxillaryClaspTeeth ?? []
        : props.mandibularClaspTeeth ?? [];
    const noActiveBoxTeeth =
      arch === "maxillary"
        ? props.maxillaryNoActiveBoxTeeth ?? []
        : props.mandibularNoActiveBoxTeeth ?? [];

    const fixedTeethByProductKey = new Map<string, number[]>();
    for (const toothStr of Object.keys(retTypes)) {
      const tn = Number(toothStr);
      const product = props.getToothProduct(arch, tn);
      if (!hasRetentionOptions(product)) continue;
      const key = product?.id != null ? String(product.id) : `solo_${tn}`;
      if (!fixedTeethByProductKey.has(key)) fixedTeethByProductKey.set(key, []);
      fixedTeethByProductKey.get(key)!.push(tn);
    }

    for (const [, teeth] of fixedTeethByProductKey) {
      const minTooth = Math.min(...teeth);
      const product = props.getToothProduct(arch, minTooth);
      if (!hasRetentionOptions(product)) continue;
      const cardId = props.getToothProductCard(arch, minTooth);
      const note = buildProductNoteFromContext(
        contextFromProps(arch, teeth, teeth, product, minTooth, props),
      );
      groups.push({
        arch,
        category: "Fixed Restoration",
        cardId,
        productName: product?.name || "Restoration",
        teeth,
        note,
      });
    }

    const extractionMap =
      arch === "maxillary"
        ? props.maxillaryToothExtractionMap ?? {}
        : props.mandibularToothExtractionMap ?? {};

    const cardToRepTooth = new Map<number, number>();
    for (const tn of allArchTeeth) {
      const product = props.getToothProduct(arch, tn);
      if (!product) continue;
      const card = props.getToothProductCard(arch, tn);
      if (card != null && !cardToRepTooth.has(card)) {
        cardToRepTooth.set(card, tn);
      }
    }

    const allCardToTeeth = new Map<number, number[]>();
    for (const tn of selectedTeeth) {
      const card = props.getToothProductCard(arch, tn);
      if (card == null) continue;
      if (!allCardToTeeth.has(card)) allCardToTeeth.set(card, []);
      allCardToTeeth.get(card)!.push(tn);
    }

    for (const [card, repTooth] of cardToRepTooth) {
      const product = props.getToothProduct(arch, repTooth);
      const allCardTeeth = allCardToTeeth.get(card) || [repTooth];
      const workflow = getProductNoteWorkflow(product);
      if (workflow === "removable" && isNonRetentionCategory(product)) {
        // Same teeth as orange product header / teeth_selection — exclude
        // missing, will-extract, clasps, and other status-only teeth.
        const removableNoteTeeth = resolveProductTeethForSlipSubmit({
          isRemovable: true,
          cardTeeth: allCardTeeth,
          toothExtractionMap: extractionMap,
          claspTeeth,
          noActiveBoxTeeth,
          extractions: product?.extractions,
        });

        groups.push({
          arch,
          category: "Removable",
          cardId: card,
          productName: product?.name || "Removable",
          teeth: removableNoteTeeth,
          note: buildRemovableProductNote(
            contextFromProps(
              arch,
              removableNoteTeeth,
              allCardTeeth,
              product,
              repTooth,
              props,
            ),
          ),
        });
      }
    }
  }

  return groups;
}

export function buildSectionText(arch: Arch, groups: NoteGroup[]): string {
  const archGroups = groups.filter((g) => g.arch === arch);
  if (!archGroups.length) return "";

  return archGroups.map((g) => g.note).join("\n");
}

export function buildCaseSummaryText(groups: NoteGroup[]): string {
  const maxText = buildSectionText("maxillary", groups);
  const mandText = buildSectionText("mandibular", groups);
  return [maxText, mandText].filter(Boolean).join("\n\n");
}
