/**
 * Builds tooth-chart extraction overlay state for the virtual slip from slip-details
 * product payloads — same inputs the Case Design Center SVG expects:
 * toothExtractionMap, claspTeeth, extractionsByCode, extractionImagesByCode.
 */

import {
  isOverlayExtractionByFlag,
  isSingleDefaultOnlyExtractionList,
  isTimExtractionByFlag,
  isTimExtractionRow,
} from "@/components/case-design-center/utils/extractionHelpers";
import type { ProductExtraction } from "@/components/case-design-center/types";
import { mapOppositeExtractionsToProductExtractions } from "@/components/case-design-center/utils/opposingExtractionHelpers";
import {
  buildExtractionScopeTeeth,
  getToothStatusBoxDisplayMap,
} from "@/components/case-design-center/utils/removableToothDisplay";

export type ExtractionMetaByCode = Record<
  string,
  { code: string; name: string; visibility_type?: string; color?: string | null; overlay?: string }
>;

export type ExtractionImagesByCode = Record<string, Record<number, string | null>>;

export interface ExtractionDisplayVM {
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
  extractionsByCode: ExtractionMetaByCode;
  extractionImagesByCode: ExtractionImagesByCode;
}

const EMPTY_DISPLAY: ExtractionDisplayVM = {
  toothExtractionMap: {},
  claspTeeth: [],
  extractionsByCode: {},
  extractionImagesByCode: {},
};

const MAXILLARY_ALL_TEETH = Array.from({ length: 16 }, (_, i) => i + 1);
const MANDIBULAR_ALL_TEETH = Array.from({ length: 16 }, (_, i) => i + 17);

function parseTeethSelection(value: unknown): number[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  }
  if (Array.isArray(value)) {
    return value
      .map((v: unknown) =>
        typeof v === "number"
          ? v
          : parseInt(String((v as { tooth_number?: unknown })?.tooth_number ?? v), 10),
      )
      .filter((n) => Number.isFinite(n));
  }
  return [];
}

function looksLikeMissingCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return normalized === "MT" || normalized.startsWith("MT_") || normalized.includes("MISSING");
}

function looksLikeWillExtractCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return (
    normalized === "WED" ||
    normalized.startsWith("WEOD_") ||
    normalized.startsWith("WED_") ||
    normalized.includes("WILL_EXTRACT") ||
    normalized.includes("EXTRACT_ON")
  );
}

function isSlipStatusExtractionCode(
  code: string,
  meta?: { name?: string },
): boolean {
  const nameLower = (meta?.name ?? "").toLowerCase();
  return (
    looksLikeMissingCode(code) ||
    looksLikeWillExtractCode(code) ||
    nameLower.includes("missing teeth") ||
    nameLower.includes("missing tooth") ||
    nameLower.includes("will extract")
  );
}

/** Infer visibility when slip-details nested `extraction` omits visibility_type. */
function inferVisibilityType(row: Partial<ProductExtraction>): string {
  const explicit = String(row.visibility_type ?? "").trim();
  if (explicit) return explicit;
  const code = String(row.code ?? "").trim();
  const name = String(row.name ?? "").toLowerCase();
  if (looksLikeMissingCode(code) || name.includes("missing")) return "Image";
  if (looksLikeWillExtractCode(code) || name.includes("will extract")) return "Image";
  if (isTimExtractionRow(row as ProductExtraction)) return "Image";
  return "Color";
}

function nonEmptyUrl(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function mergeImagesForCode(
  extractionImagesByCode: ExtractionImagesByCode,
  code: string,
  images: Array<{ tooth_number: number; image_url: string | null }>,
): ExtractionImagesByCode {
  if (!images.length) return extractionImagesByCode;
  return {
    ...extractionImagesByCode,
    [code]: {
      ...(extractionImagesByCode[code] ?? {}),
      ...Object.fromEntries(images.map((img) => [img.tooth_number, img.image_url])),
    },
  };
}

function imageUrlForToothFromCatalogRow(
  catalogRow: ProductExtraction | undefined,
  toothNumber: number,
): string | null {
  if (!catalogRow) return null;
  const fromImages = catalogRow.images?.find((img) => img.tooth_number === toothNumber)?.image_url;
  return nonEmptyUrl(fromImages) ?? nonEmptyUrl(catalogRow.image_url);
}

function imageUrlFromToothChartRow(
  row: any,
  catalogRow: ProductExtraction | undefined,
  toothNumber: number,
): string | null {
  return (
    nonEmptyUrl(row?.selected_image_url) ??
    nonEmptyUrl(row?.tooth_chart_entry?.selected_image_url) ??
    nonEmptyUrl(row?.image_url) ??
    nonEmptyUrl(row?.tooth_chart_entry?.image_url) ??
    imageUrlForToothFromCatalogRow(catalogRow, toothNumber)
  );
}

function findTimCatalogRow(catalog: ProductExtraction[]): ProductExtraction | undefined {
  return catalog.find((row) => isTimExtractionRow(row));
}

function resolveToothChartCatalogRow(
  row: any,
  catalog: ProductExtraction[],
): ProductExtraction | null | undefined {
  const toothNumber = Number(row?.tooth_number ?? row?.tooth_chart_entry?.tooth_number);
  const parentExtractionId = Number(
    row?.extraction_id ??
      row?.tooth_chart_entry?.extraction_id ??
      row?.tooth_chart_entry?.extraction?.id,
  );
  if (!Number.isFinite(toothNumber)) return undefined;
  const nested = row?.tooth_chart_entry?.extraction ?? row?.extraction;
  if (nested) {
    return (
      normalizeCatalogRow(nested as Partial<ProductExtraction>, parentExtractionId) ??
      findCatalogRow(catalog, parentExtractionId)
    );
  }
  if (Number.isFinite(parentExtractionId) && parentExtractionId > 0) {
    return findCatalogRow(catalog, parentExtractionId);
  }
  return undefined;
}

function registerCatalogMeta(
  extractionsByCode: ExtractionMetaByCode,
  row: ProductExtraction,
): void {
  extractionsByCode[row.code] = {
    code: row.code,
    name: row.name,
    visibility_type: row.visibility_type,
    color: row.color ?? null,
    overlay: row.overlay,
  };
}

/**
 * Product teeth (`teeth_selection`) should render TIM / tooth-chart extraction images,
 * not status-box overlays (MT/WED) or orange gear selection indicators.
 */
function finalizeProductTeethChartDisplay(
  display: ExtractionDisplayVM,
  apiProduct: any,
  catalog: ProductExtraction[],
): ExtractionDisplayVM {
  const productTeeth = parseTeethSelection(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  if (productTeeth.length === 0) return display;

  const toothExtractionMap = { ...display.toothExtractionMap };
  let extractionImagesByCode = { ...display.extractionImagesByCode };
  const extractionsByCode = { ...display.extractionsByCode };

  const timRow = findTimCatalogRow(catalog);
  if (timRow?.code) {
    registerCatalogMeta(extractionsByCode, timRow);
    extractionImagesByCode = mergeImagesForCode(
      extractionImagesByCode,
      timRow.code,
      timRow.images ?? [],
    );
  }

  for (const row of getToothChartRows(apiProduct)) {
    const toothNumber = Number(row?.tooth_number ?? row?.tooth_chart_entry?.tooth_number);
    if (!Number.isFinite(toothNumber) || !productTeeth.includes(toothNumber)) continue;
    if (display.claspTeeth.includes(toothNumber)) continue;

    const catalogRow = resolveToothChartCatalogRow(row, catalog);
    if (!catalogRow?.code || isOverlayExtractionByFlag(catalogRow)) continue;
    if (looksLikeMissingCode(catalogRow.code) || (catalogRow.name ?? "").toLowerCase().includes("will extract")) {
      continue;
    }

    registerCatalogMeta(extractionsByCode, catalogRow);
    extractionImagesByCode = mergeImagesForCode(
      extractionImagesByCode,
      catalogRow.code,
      catalogRow.images ?? [],
    );

    const rowImageUrl = imageUrlFromToothChartRow(row, catalogRow, toothNumber);
    if (rowImageUrl) {
      extractionImagesByCode = {
        ...extractionImagesByCode,
        [catalogRow.code]: {
          ...(extractionImagesByCode[catalogRow.code] ?? {}),
          [toothNumber]: rowImageUrl,
        },
      };
    }

    const resolvedUrl = extractionImagesByCode[catalogRow.code]?.[toothNumber];
    if (resolvedUrl || catalogRow.visibility_type === "Image") {
      toothExtractionMap[toothNumber] = catalogRow.code;
    }
  }

  for (const toothNumber of productTeeth) {
    if (display.claspTeeth.includes(toothNumber)) continue;

    const mappedCode = toothExtractionMap[toothNumber];
    const mappedMeta = mappedCode ? extractionsByCode[mappedCode] : undefined;
    const mappedIsStatusBox =
      !!mappedCode &&
      (looksLikeMissingCode(mappedCode) ||
        (mappedMeta?.name ?? "").toLowerCase().includes("will extract"));

    if (
      mappedCode &&
      extractionImagesByCode[mappedCode]?.[toothNumber] &&
      !mappedIsStatusBox
    ) {
      continue;
    }

    const timImageUrl = timRow?.code
      ? imageUrlForToothFromCatalogRow(timRow, toothNumber) ??
        extractionImagesByCode[timRow.code]?.[toothNumber] ??
        null
      : null;

    if (
      mappedCode &&
      isSlipStatusExtractionCode(mappedCode, mappedMeta) &&
      (extractionImagesByCode[mappedCode]?.[toothNumber] ||
        mappedMeta?.visibility_type === "Image" ||
        mappedMeta?.visibility_type === "Color")
    ) {
      continue;
    }

    if (timRow?.code && timImageUrl) {
      extractionImagesByCode = {
        ...extractionImagesByCode,
        [timRow.code]: {
          ...(extractionImagesByCode[timRow.code] ?? {}),
          [toothNumber]: timImageUrl,
        },
      };
      toothExtractionMap[toothNumber] = timRow.code;
    }
  }

  return {
    ...display,
    toothExtractionMap,
    extractionImagesByCode,
    extractionsByCode,
  };
}

function isGroupedExtractionRow(row: unknown): row is {
  extraction_id?: number;
  teeth_numbers?: number[];
  extraction?: Partial<ProductExtraction>;
} {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return Array.isArray(r.teeth_numbers) || r.extraction_id != null;
}

function normalizeCatalogRow(
  row: Partial<ProductExtraction>,
  parentExtractionId?: number,
): ProductExtraction | null {
  const code = String(row.code ?? "").trim();
  if (!code) return null;
  const extractionId = Number(parentExtractionId ?? row.extraction_id ?? row.id ?? 0);
  return {
    id: Number(row.id ?? extractionId ?? 0),
    extraction_id: extractionId,
    name: String(row.name ?? code),
    code,
    color: row.color ?? null,
    url: row.url ?? null,
    is_default: String(row.is_default ?? "No"),
    is_required: String(row.is_required ?? "No"),
    is_optional: String(row.is_optional ?? "No"),
    min_teeth: row.min_teeth ?? null,
    max_teeth: row.max_teeth ?? null,
    is_image_extraction: String(row.is_image_extraction ?? "No"),
    image_url: row.image_url ?? null,
    is_tim: row.is_tim ?? "No",
    overlay: row.overlay ?? "No",
    images: Array.isArray(row.images) ? row.images : [],
    visibility_type: inferVisibilityType(row),
    sequence: Number(row.sequence ?? 0),
    status: String(row.status ?? "Active"),
    price: row.price ?? null,
  };
}

type SavedSlipExtractionRow = {
  extraction_id?: number;
  teeth_numbers?: number[];
  extraction?: Partial<ProductExtraction>;
};

/** Slip-details row: `{ extraction_id, teeth_numbers, extraction: { visibility_type, overlay, images, ... } }`. */
function normalizeSlipExtractionRow(row: SavedSlipExtractionRow): ProductExtraction | null {
  if (!row?.extraction) return null;
  return normalizeCatalogRow(row.extraction, Number(row.extraction_id));
}

function mergeCatalogRows(
  existing: ProductExtraction,
  incoming: ProductExtraction,
): ProductExtraction {
  const imageMap = new Map<number, string | null>();
  for (const img of existing.images ?? []) {
    imageMap.set(img.tooth_number, img.image_url);
  }
  for (const img of incoming.images ?? []) {
    imageMap.set(img.tooth_number, img.image_url);
  }
  return {
    ...existing,
    ...incoming,
    visibility_type: incoming.visibility_type ?? existing.visibility_type,
    overlay: incoming.overlay ?? existing.overlay,
    color: incoming.color ?? existing.color,
    image_url: incoming.image_url ?? existing.image_url,
    is_tim: incoming.is_tim ?? existing.is_tim,
    images: [...imageMap.entries()].map(([tooth_number, image_url]) => ({
      tooth_number,
      image_url,
    })),
  };
}

function buildCatalogFromExtractionsField(
  apiProduct: any,
  savedField: "extractions" | "opposite_extractions",
  catalogSources: unknown[],
): ProductExtraction[] {
  const byCode = new Map<string, ProductExtraction>();

  const addRow = (row: ProductExtraction | null) => {
    if (!row?.code) return;
    const existing = byCode.get(row.code);
    byCode.set(row.code, existing ? mergeCatalogRows(existing, row) : row);
  };

  const savedRows: SavedSlipExtractionRow[] = Array.isArray(apiProduct?.[savedField])
    ? apiProduct[savedField]
    : [];
  for (const saved of savedRows) {
    addRow(normalizeSlipExtractionRow(saved));
  }

  for (const source of catalogSources) {
    for (const raw of (source as ProductExtraction[] | undefined) ?? []) {
      addRow(normalizeCatalogRow(raw as Partial<ProductExtraction>));
    }
  }

  return [...byCode.values()];
}

function catalogFromProduct(apiProduct: any): ProductExtraction[] {
  return buildCatalogFromExtractionsField(apiProduct, "extractions", [
    apiProduct?.product?.extractions,
    apiProduct?.variation?.extractions,
    apiProduct?.product?.variation?.extractions,
  ]);
}

function catalogFromOpposingProduct(apiProduct: any): ProductExtraction[] {
  const mapped = mapOppositeExtractionsToProductExtractions(
    apiProduct?.product?.opposite_extractions,
    apiProduct?.product?.extractions,
  );
  return buildCatalogFromExtractionsField(apiProduct, "opposite_extractions", [
    mapped,
    apiProduct?.product?.opposite_extractions,
    apiProduct?.product?.extractions,
  ]);
}

function toothInArch(
  toothNumber: number,
  arch: "maxillary" | "mandibular",
): boolean {
  return arch === "maxillary"
    ? toothNumber >= 1 && toothNumber <= 16
    : toothNumber >= 17 && toothNumber <= 32;
}

function buildCatalogMaps(catalog: ProductExtraction[]): Pick<
  ExtractionDisplayVM,
  "extractionsByCode" | "extractionImagesByCode"
> {
  const extractionsByCode: ExtractionMetaByCode = {};
  const extractionImagesByCode: ExtractionImagesByCode = {};

  for (const row of catalog) {
    if (String(row.status ?? "Active").trim().toLowerCase() === "inactive") continue;
    extractionsByCode[row.code] = {
      code: row.code,
      name: row.name,
      visibility_type: row.visibility_type,
      color: row.color ?? null,
      overlay: row.overlay,
    };
    if (row.images?.length) {
      extractionImagesByCode[row.code] = row.images.reduce<Record<number, string | null>>(
        (map, img) => {
          map[img.tooth_number] = img.image_url;
          return map;
        },
        {},
      );
    }
  }

  return { extractionsByCode, extractionImagesByCode };
}

function findCatalogRow(
  catalog: ProductExtraction[],
  extractionId: number,
): ProductExtraction | undefined {
  if (!Number.isFinite(extractionId) || extractionId <= 0) return undefined;
  return catalog.find(
    (row) =>
      Number(row.extraction_id) === extractionId ||
      Number(row.id) === extractionId,
  );
}

function assignToothExtraction(
  toothNumber: number,
  catalogRow: ProductExtraction | undefined,
  state: Pick<ExtractionDisplayVM, "toothExtractionMap" | "claspTeeth">,
): void {
  if (!Number.isFinite(toothNumber) || !catalogRow?.code) return;
  if (isOverlayExtractionByFlag(catalogRow)) {
    if (!state.claspTeeth.includes(toothNumber)) {
      state.claspTeeth.push(toothNumber);
    }
    return;
  }
  state.toothExtractionMap[toothNumber] = catalogRow.code;
}

function applyGroupedExtractionsFromRows(
  rows: unknown[],
  catalog: ProductExtraction[],
  state: Pick<ExtractionDisplayVM, "toothExtractionMap" | "claspTeeth">,
  options?: { skipTeeth?: number[]; arch?: "maxillary" | "mandibular" },
): void {
  if (!rows.length || !isGroupedExtractionRow(rows[0])) return;
  const skipSet = new Set(options?.skipTeeth ?? []);
  const arch = options?.arch;

  for (const row of rows) {
    if (!isGroupedExtractionRow(row)) continue;
    const extractionId = Number(row.extraction_id);
    const catalogRow =
      normalizeSlipExtractionRow(row as SavedSlipExtractionRow) ??
      findCatalogRow(catalog, extractionId);
    const teeth = (row.teeth_numbers ?? [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    for (const toothNumber of teeth) {
      if (skipSet.has(toothNumber)) continue;
      if (arch && !toothInArch(toothNumber, arch)) continue;
      assignToothExtraction(toothNumber, catalogRow, state);
    }
  }
}

function applyGroupedExtractions(
  apiProduct: any,
  catalog: ProductExtraction[],
  state: Pick<ExtractionDisplayVM, "toothExtractionMap" | "claspTeeth">,
  skipTeeth: number[] = [],
): void {
  const rows = Array.isArray(apiProduct?.extractions) ? apiProduct.extractions : [];
  applyGroupedExtractionsFromRows(rows, catalog, state, { skipTeeth });
}

function getToothChartRows(apiProduct: any): any[] {
  const candidates = [
    apiProduct?.selected_teeth,
    apiProduct?.selected_teeth_map,
    apiProduct?.tooth_chart,
    apiProduct?.tooth_chart_entries,
    apiProduct?.tooth_chart_details,
    apiProduct?.tooth_selections,
    apiProduct?.teeth_selection,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function applyToothChartExtractions(
  apiProduct: any,
  catalog: ProductExtraction[],
  state: Pick<ExtractionDisplayVM, "toothExtractionMap" | "claspTeeth">,
  skipTeeth: number[] = [],
): void {
  const skipSet = new Set(skipTeeth);
  for (const row of getToothChartRows(apiProduct)) {
    const toothNumber = Number(row?.tooth_number ?? row?.tooth_chart_entry?.tooth_number);
    if (!Number.isFinite(toothNumber) || skipSet.has(toothNumber)) continue;
    const catalogRow = resolveToothChartCatalogRow(row, catalog);
    assignToothExtraction(toothNumber, catalogRow ?? undefined, state);
  }
}

/** Build extraction overlay state for one slip-details product row. */
export function buildExtractionDisplayFromSlipProduct(apiProduct: any): ExtractionDisplayVM {
  if (!apiProduct) return { ...EMPTY_DISPLAY };

  const catalog = catalogFromProduct(apiProduct);
  if (catalog.length === 0 && !Array.isArray(apiProduct?.extractions)) {
    return { ...EMPTY_DISPLAY };
  }

  const productTeeth = parseTeethSelection(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  const { extractionsByCode, extractionImagesByCode } = buildCatalogMaps(catalog);
  const toothExtractionMap: Record<number, string> = {};
  const claspTeeth: number[] = [];

  // Grouped slip `extractions[]` is authoritative for chart status (MT / WEOD / clasps).
  applyGroupedExtractions(apiProduct, catalog, { toothExtractionMap, claspTeeth });
  applyToothChartExtractions(apiProduct, catalog, { toothExtractionMap, claspTeeth }, productTeeth);

  claspTeeth.sort((a, b) => a - b);

  return finalizeProductTeethChartDisplay(
    {
      toothExtractionMap,
      claspTeeth,
      extractionsByCode,
      extractionImagesByCode,
    },
    apiProduct,
    catalog,
  );
}

function mergeExtractionDisplay(
  target: ExtractionDisplayVM,
  source: ExtractionDisplayVM,
): ExtractionDisplayVM {
  return {
    toothExtractionMap: { ...target.toothExtractionMap, ...source.toothExtractionMap },
    claspTeeth: [...new Set([...target.claspTeeth, ...source.claspTeeth])].sort((a, b) => a - b),
    extractionsByCode: { ...target.extractionsByCode, ...source.extractionsByCode },
    extractionImagesByCode: { ...target.extractionImagesByCode, ...source.extractionImagesByCode },
  };
}

function applyOpposingMirrorFromSelectedTeeth(
  sourceProduct: any,
  targetArch: "maxillary" | "mandibular",
  catalog: ProductExtraction[],
  state: Pick<ExtractionDisplayVM, "toothExtractionMap" | "claspTeeth">,
  extractionImagesByCode: ExtractionImagesByCode,
): ExtractionImagesByCode {
  let imagesByCode = extractionImagesByCode;

  for (const row of getToothChartRows(sourceProduct)) {
    const mainTooth = Number(row?.tooth_number ?? row?.tooth_chart_entry?.tooth_number);
    if (!Number.isFinite(mainTooth) || mainTooth < 1 || mainTooth > 32) continue;

    const entry = row?.tooth_chart_entry ?? {};
    const oppositeExtractionId = Number(
      entry?.opposite_extraction_id ?? row?.opposite_extraction_id,
    );
    if (!Number.isFinite(oppositeExtractionId) || oppositeExtractionId <= 0) continue;

    const opposingTooth = 33 - mainTooth;
    if (!toothInArch(opposingTooth, targetArch)) continue;

    const catalogRow = findCatalogRow(catalog, oppositeExtractionId);
    if (!catalogRow?.code) continue;

    assignToothExtraction(opposingTooth, catalogRow, state);

    const rowImageUrl = imageUrlFromToothChartRow(row, catalogRow, opposingTooth);
    if (rowImageUrl) {
      imagesByCode = {
        ...imagesByCode,
        [catalogRow.code]: {
          ...(imagesByCode[catalogRow.code] ?? {}),
          [opposingTooth]: rowImageUrl,
        },
      };
    }
  }

  return imagesByCode;
}

/** Unmarked opposing-arch teeth render as Teeth In Mouth (TIM) when catalog provides images. */
function applyOpposingTimInMouthDefaults(
  display: ExtractionDisplayVM,
  catalog: ProductExtraction[],
  targetArch: "maxillary" | "mandibular",
): ExtractionDisplayVM {
  const timRow = findTimCatalogRow(catalog);
  if (!timRow?.code) return display;

  const allTeeth =
    targetArch === "maxillary" ? MAXILLARY_ALL_TEETH : MANDIBULAR_ALL_TEETH;
  const toothExtractionMap = { ...display.toothExtractionMap };
  let extractionImagesByCode = { ...display.extractionImagesByCode };
  const extractionsByCode = { ...display.extractionsByCode };

  registerCatalogMeta(extractionsByCode, timRow);
  extractionImagesByCode = mergeImagesForCode(
    extractionImagesByCode,
    timRow.code,
    timRow.images ?? [],
  );

  for (const toothNumber of allTeeth) {
    if (display.claspTeeth.includes(toothNumber)) continue;
    const code = toothExtractionMap[toothNumber];
    const meta = code ? extractionsByCode[code] : undefined;
    if (
      code &&
      (looksLikeMissingCode(code) ||
        looksLikeWillExtractCode(code) ||
        (meta?.name ?? "").toLowerCase().includes("will extract"))
    ) {
      continue;
    }
    if (code === timRow.code) continue;

    const timImageUrl =
      imageUrlForToothFromCatalogRow(timRow, toothNumber) ??
      extractionImagesByCode[timRow.code]?.[toothNumber] ??
      null;
    if (!timImageUrl) continue;

    extractionImagesByCode = {
      ...extractionImagesByCode,
      [timRow.code]: {
        ...(extractionImagesByCode[timRow.code] ?? {}),
        [toothNumber]: timImageUrl,
      },
    };
    toothExtractionMap[toothNumber] = timRow.code;
  }

  return {
    ...display,
    toothExtractionMap,
    claspTeeth: display.claspTeeth,
    extractionsByCode,
    extractionImagesByCode,
  };
}

/** Saved `opposite_extractions[]` on a slip product row (teeth on the opposing arch). */
export function buildOpposingExtractionDisplayFromSlipProduct(
  apiProduct: any,
  targetArch: "maxillary" | "mandibular",
): ExtractionDisplayVM {
  if (!apiProduct) return { ...EMPTY_DISPLAY };

  const catalog = catalogFromOpposingProduct(apiProduct);
  const savedRows = Array.isArray(apiProduct?.opposite_extractions)
    ? apiProduct.opposite_extractions
    : [];
  if (catalog.length === 0 && !savedRows.length) return { ...EMPTY_DISPLAY };

  const { extractionsByCode, extractionImagesByCode } = buildCatalogMaps(catalog);
  const toothExtractionMap: Record<number, string> = {};
  const claspTeeth: number[] = [];

  applyGroupedExtractionsFromRows(savedRows, catalog, { toothExtractionMap, claspTeeth }, {
    arch: targetArch,
  });

  claspTeeth.sort((a, b) => a - b);

  let display: ExtractionDisplayVM = {
    toothExtractionMap,
    claspTeeth,
    extractionsByCode,
    extractionImagesByCode,
  };
  display = applyOpposingTimInMouthDefaults(display, catalog, targetArch);
  return display;
}

/** Mirror opposing extractions from the other jaw's `selected_teeth` (33 − tooth). */
export function buildOpposingMirrorExtractionDisplay(
  sourceProduct: any,
  targetArch: "maxillary" | "mandibular",
): ExtractionDisplayVM {
  if (!sourceProduct) return { ...EMPTY_DISPLAY };

  const catalog = catalogFromOpposingProduct(sourceProduct);
  if (catalog.length === 0) return { ...EMPTY_DISPLAY };

  const { extractionsByCode, extractionImagesByCode } = buildCatalogMaps(catalog);
  const toothExtractionMap: Record<number, string> = {};
  const claspTeeth: number[] = [];

  const imagesByCode = applyOpposingMirrorFromSelectedTeeth(
    sourceProduct,
    targetArch,
    catalog,
    { toothExtractionMap, claspTeeth },
    extractionImagesByCode,
  );

  claspTeeth.sort((a, b) => a - b);

  return {
    toothExtractionMap,
    claspTeeth,
    extractionsByCode,
    extractionImagesByCode: imagesByCode,
  };
}

export function productHasOpposingExtractions(apiProduct: any): boolean {
  const saved = apiProduct?.opposite_extractions;
  if (Array.isArray(saved) && saved.length > 0) return true;
  const catalog = apiProduct?.product?.opposite_extractions;
  return Array.isArray(catalog) && catalog.length > 0;
}

export function productHasOpposingImpression(apiProduct: any): boolean {
  if (apiProduct?.opposite_impression === "Yes") return true;
  const saved = apiProduct?.opposite_impressions;
  return Array.isArray(saved) && saved.length > 0;
}

/** CDC: show opposing block when `opposite_impression` or saved `opposite_extractions`. */
export function productHasOpposingSection(apiProduct: any): boolean {
  return productHasOpposingImpression(apiProduct) || productHasOpposingExtractions(apiProduct);
}

/** @deprecated Use buildOpposingArchVM — merges saved opposite_extractions from cross-arch products. */
export function buildOpposingExtractionDisplay(
  opposingProducts: any[],
  targetArch: "maxillary" | "mandibular",
): ExtractionDisplayVM {
  let merged = { ...EMPTY_DISPLAY };
  for (const p of opposingProducts) {
    merged = mergeExtractionDisplay(
      merged,
      buildOpposingMirrorExtractionDisplay(p, targetArch),
    );
  }
  return merged;
}

export interface OpposingArchVM {
  /** Arch rendered in the opposing chart (opposite of the host column). */
  arch: "maxillary" | "mandibular";
  teeth: Array<{ number: number; status: "in_mouth" | "missing" | "will_extract" | "implant" }>;
  extractionDisplay: ExtractionDisplayVM;
  /** Host-arch slip product row (for opposing catalog icons in status boxes). */
  catalogApiProduct: any | null;
  impression: string;
  showExtractions: boolean;
  showImpression: boolean;
  missingTeeth: number[];
  willExtractTeeth: number[];
  claspTeeth: number[];
}

export interface VirtualSlipStatusBoxProps {
  extractions: ProductExtraction[];
  selectedTeeth: number[];
  allArchTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
  displayTeethByCode: Record<string, number[]>;
}

/** Product extraction catalog rows for read-only ToothStatusBoxes (slip creation design). */
export function productExtractionsForStatusBoxes(
  display: ExtractionDisplayVM,
  apiProduct?: any,
  catalogField: "extractions" | "opposite_extractions" = "extractions",
): ProductExtraction[] {
  const catalog = apiProduct
    ? catalogField === "opposite_extractions"
      ? catalogFromOpposingProduct(apiProduct)
      : catalogFromProduct(apiProduct)
    : [];

  const activeFromCatalog = catalog
    .filter((row) => String(row.status ?? "Active").trim().toLowerCase() === "active")
    .filter((row) => !isTimExtractionByFlag(row))
    .sort((a, b) => a.sequence - b.sequence);

  if (activeFromCatalog.length > 0) return activeFromCatalog;

  return Object.entries(display.extractionsByCode)
    .filter(([code, meta]) => {
      if (isTimExtractionRow({ code, name: meta?.name })) return false;
      return teethForExtractionCode(display, code).length > 0;
    })
    .map(([code, meta], index) => ({
      id: index + 1,
      extraction_id: index + 1,
      name: meta.name,
      code,
      color: meta.color ?? null,
      url: null,
      is_default: "No",
      is_required: "No",
      is_optional: "No",
      min_teeth: null,
      max_teeth: null,
      is_image_extraction: meta.visibility_type === "Image" ? "Yes" : "No",
      image_url: null,
      is_tim: "No",
      overlay: meta.overlay ?? "No",
      images: [],
      visibility_type: meta.visibility_type ?? "Image",
      sequence: index + 1,
      status: "Active",
      price: null,
    }));
}

/** Props for read-only `ToothStatusBoxes` on the virtual slip, or null when nothing to show. */
export function buildVirtualSlipStatusBoxProps(
  display: ExtractionDisplayVM,
  arch: "maxillary" | "mandibular",
  options?: {
    apiProduct?: any;
    catalogField?: "extractions" | "opposite_extractions";
    excludeTeeth?: number[];
  },
): VirtualSlipStatusBoxProps | null {
  const catalogField = options?.catalogField ?? "extractions";
  const excludeTeeth = options?.excludeTeeth ?? [];
  const archTeeth = arch === "maxillary" ? MAXILLARY_ALL_TEETH : MANDIBULAR_ALL_TEETH;
  const extractions = productExtractionsForStatusBoxes(
    display,
    options?.apiProduct,
    catalogField,
  );

  if (extractions.length === 0 || isSingleDefaultOnlyExtractionList(extractions)) {
    return null;
  }

  const selectedTeeth = Object.keys(display.toothExtractionMap)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const extractionScope = buildExtractionScopeTeeth(
    selectedTeeth,
    display.toothExtractionMap,
    display.claspTeeth,
    archTeeth,
  );
  const extractionRows = extractions.map((row) => ({
    code: row.code,
    is_tim: row.is_tim,
    overlay: row.overlay,
  }));
  const displayTeethByCode = getToothStatusBoxDisplayMap({
    extractions: extractionRows,
    selectedTeeth: extractionScope,
    toothExtractionMap: display.toothExtractionMap,
    claspTeeth: display.claspTeeth,
    excludeTeeth,
  });

  const hasVisibleBox = extractions.some(
    (row) => (displayTeethByCode[row.code] ?? []).length > 0,
  );
  if (!hasVisibleBox) return null;

  return {
    extractions,
    selectedTeeth: extractionScope,
    allArchTeeth: archTeeth,
    toothExtractionMap: display.toothExtractionMap,
    claspTeeth: display.claspTeeth,
    displayTeethByCode,
  };
}

/** Build opposing chart + impression block for one slip column (matches CDC opposing accordion). */
export function buildOpposingArchVM(
  hostArch: "maxillary" | "mandibular",
  allProducts: any[],
): OpposingArchVM | null {
  const targetArch: "maxillary" | "mandibular" =
    hostArch === "maxillary" ? "mandibular" : "maxillary";
  const hostProducts = allProducts.filter(
    (p) => archFromType(p?.type) === hostArch,
  );
  const crossArchProducts = allProducts.filter(
    (p) => archFromType(p?.type) !== hostArch,
  );

  let extractionDisplay = { ...EMPTY_DISPLAY };
  const impressionParts: string[] = [];

  for (const p of hostProducts) {
    const formatted = formatOpposingImpressions(p?.opposite_impressions);
    if (formatted) impressionParts.push(formatted);
    if (productHasOpposingExtractions(p)) {
      extractionDisplay = mergeExtractionDisplay(
        extractionDisplay,
        buildOpposingExtractionDisplayFromSlipProduct(p, targetArch),
      );
    }
  }

  for (const p of crossArchProducts) {
    extractionDisplay = mergeExtractionDisplay(
      extractionDisplay,
      buildOpposingMirrorExtractionDisplay(p, targetArch),
    );
  }

  const hasOpposingExtractions = hostProducts.some(productHasOpposingExtractions);
  const showImpression =
    hostProducts.some(productHasOpposingImpression) || impressionParts.length > 0;
  /** Show full arch chart whenever saved opposite_extractions exist (MT/WEOD without S3 URLs). */
  const showExtractions = hasOpposingExtractions;

  if (!hostProducts.some(productHasOpposingSection) && !impressionParts.length) {
    return null;
  }

  const chartStatus = chartStatusTeethFromExtractionDisplay(extractionDisplay);
  const toothOrder =
    targetArch === "maxillary" ? MAXILLARY_ALL_TEETH : MANDIBULAR_ALL_TEETH;
  const missingSet = new Set(chartStatus.missingTeeth);
  const willExtractSet = new Set(chartStatus.willExtractTeeth);

  const catalogApiProduct =
    hostProducts.find(productHasOpposingExtractions) ??
    hostProducts.find(productHasOpposingImpression) ??
    null;

  return {
    arch: targetArch,
    teeth: toothOrder.map((number) => ({
      number,
      status: willExtractSet.has(number)
        ? "will_extract"
        : missingSet.has(number)
          ? "missing"
          : "in_mouth",
    })),
    extractionDisplay,
    catalogApiProduct,
    impression: impressionParts.join(", "),
    showExtractions,
    showImpression,
    missingTeeth: chartStatus.missingTeeth,
    willExtractTeeth: chartStatus.willExtractTeeth,
    claspTeeth: extractionDisplay.claspTeeth,
  };
}

function archFromType(type: unknown): "maxillary" | "mandibular" | null {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("upper") || t.includes("max")) return "maxillary";
  if (t.includes("lower") || t.includes("man")) return "mandibular";
  return null;
}

/** Format slip `impressions` / `opposite_impressions` rows for read-only display. */
export function formatOpposingImpressions(impressions: unknown): string {
  if (!Array.isArray(impressions)) return "";
  return impressions
    .map((imp: any) => {
      const qty = imp?.quantity ?? imp?.qty ?? 1;
      const name = String(
        imp?.impression?.name ??
          imp?.impression_name ??
          imp?.name ??
          imp?.impression?.code ??
          imp?.code ??
          "",
      ).trim();
      return name ? `${qty}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

export function mergeArchExtractionDisplays(displays: ExtractionDisplayVM[]): ExtractionDisplayVM {
  return displays.reduce(
    (acc, cur) => mergeExtractionDisplay(acc, cur),
    { ...EMPTY_DISPLAY },
  );
}

/**
 * Missing / will-extract teeth for chart fallback overlays when slip rows omit per-tooth image URLs.
 */
export function chartStatusTeethFromExtractionDisplay(display: ExtractionDisplayVM): {
  missingTeeth: number[];
  willExtractTeeth: number[];
} {
  const missingTeeth: number[] = [];
  const willExtractTeeth: number[] = [];

  for (const [toothKey, code] of Object.entries(display.toothExtractionMap)) {
    const toothNumber = Number(toothKey);
    if (!Number.isFinite(toothNumber)) continue;
    const meta = display.extractionsByCode[code];
    const nameLower = (meta?.name ?? "").toLowerCase();
    if (looksLikeMissingCode(code) || nameLower.includes("missing")) {
      missingTeeth.push(toothNumber);
    } else if (
      looksLikeWillExtractCode(code) ||
      nameLower.includes("will extract")
    ) {
      willExtractTeeth.push(toothNumber);
    }
  }

  return {
    missingTeeth: [...new Set(missingTeeth)].sort((a, b) => a - b),
    willExtractTeeth: [...new Set(willExtractTeeth)].sort((a, b) => a - b),
  };
}

/** True when the chart should use extraction maps instead of flat missing/will-extract lists. */
export function hasExtractionChartOverlay(display: ExtractionDisplayVM | undefined): boolean {
  if (!display) return false;
  return (
    Object.keys(display.toothExtractionMap).length > 0 ||
    display.claspTeeth.length > 0 ||
    Object.keys(display.extractionsByCode).length > 0
  );
}

/** Grouped `{ extraction_id, teeth_numbers }[]` saved on slip products. */
export function isGroupedSlipExtractions(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && isGroupedExtractionRow(value[0]);
}

/** Teeth assigned to a specific extraction code (for product summary chips). */
export function teethForExtractionCode(
  display: ExtractionDisplayVM,
  code: string,
  overlay = false,
): number[] {
  if (overlay) {
    return display.claspTeeth.filter((tn) => {
      const mapped = display.toothExtractionMap[tn];
      return !mapped || mapped === code;
    });
  }
  return Object.entries(display.toothExtractionMap)
    .filter(([, c]) => c === code)
    .map(([tn]) => Number(tn))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

function catalogRowsForStatusBoxes(
  display: ExtractionDisplayVM,
  apiProduct: any,
): Array<{ code: string; is_tim?: string; overlay?: string }> {
  const catalog = catalogFromProduct(apiProduct);
  if (catalog.length > 0) {
    return catalog.map((row) => ({
      code: row.code,
      is_tim: row.is_tim,
      overlay: row.overlay,
    }));
  }
  return Object.entries(display.extractionsByCode).map(([code, meta]) => ({
    code,
    is_tim: isTimExtractionRow({ code, is_tim: code === "TIM" ? "Yes" : "No", name: meta?.name }) ? "Yes" : "No",
    overlay: meta.overlay,
  }));
}

/** Infer status-box chip teeth using the same scoping rules as slip creation. */
export function extractionChipTeethFromSlipProduct(
  apiProduct: any,
  display: ExtractionDisplayVM,
  arch: "maxillary" | "mandibular",
): {
  missingTeeth: number[];
  willExtractTeeth: number[];
  claspTeeth: number[];
} {
  const productTeeth = parseTeethSelection(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  const archTeeth = arch === "maxillary" ? MAXILLARY_ALL_TEETH : MANDIBULAR_ALL_TEETH;
  const extractionScope = buildExtractionScopeTeeth(
    productTeeth,
    display.toothExtractionMap,
    display.claspTeeth,
    archTeeth,
  );
  const extractions = catalogRowsForStatusBoxes(display, apiProduct);
  const displayMap = getToothStatusBoxDisplayMap({
    extractions,
    selectedTeeth: extractionScope,
    toothExtractionMap: display.toothExtractionMap,
    claspTeeth: display.claspTeeth,
    excludeTeeth: productTeeth,
  });

  const missingTeeth: number[] = [];
  const willExtractTeeth: number[] = [];
  const claspTeeth: number[] = [];

  for (const [code, teeth] of Object.entries(displayMap)) {
    if (teeth.length === 0) continue;
    const meta = display.extractionsByCode[code];
    const catalogRow = extractions.find((row) => row.code === code);
    if (isOverlayExtractionByFlag(catalogRow ?? { overlay: meta?.overlay })) {
      claspTeeth.push(...teeth);
      continue;
    }
    const nameLower = (meta?.name ?? "").toLowerCase();
    if (looksLikeMissingCode(code) || nameLower.includes("missing teeth")) {
      missingTeeth.push(...teeth);
    } else if (
      (meta?.visibility_type === "Image" || looksLikeWillExtractCode(code)) &&
      !looksLikeMissingCode(code) &&
      !isTimExtractionByFlag(catalogRow ?? { is_tim: meta?.code === "TIM" ? "Yes" : "No" }) &&
      !isTimExtractionRow({ code, name: meta?.name }) &&
      nameLower !== "teeth in mouth"
    ) {
      willExtractTeeth.push(...teeth);
    }
  }

  return {
    missingTeeth: [...new Set(missingTeeth)].sort((a, b) => a - b),
    willExtractTeeth: [...new Set(willExtractTeeth)].sort((a, b) => a - b),
    claspTeeth: [...new Set(claspTeeth)].sort((a, b) => a - b),
  };
}

/** @deprecated Prefer extractionChipTeethFromSlipProduct for product-scoped chips. */
export function extractionChipTeethFromDisplay(display: ExtractionDisplayVM): {
  missingTeeth: number[];
  willExtractTeeth: number[];
  claspTeeth: number[];
} {
  const missingTeeth: number[] = [];
  const willExtractTeeth: number[] = [];

  for (const [code, meta] of Object.entries(display.extractionsByCode)) {
    const teeth = teethForExtractionCode(display, code);
    if (teeth.length === 0) continue;
    const nameLower = (meta.name ?? "").toLowerCase();
    if (looksLikeMissingCode(code) || nameLower.includes("missing teeth")) {
      missingTeeth.push(...teeth);
    } else if (
      (meta.visibility_type === "Image" || looksLikeWillExtractCode(code)) &&
      !looksLikeMissingCode(code) &&
      meta.overlay !== "Yes" &&
      !isTimExtractionRow({ code, name: meta.name }) &&
      nameLower !== "teeth in mouth"
    ) {
      willExtractTeeth.push(...teeth);
    }
  }

  const claspTeeth = [...display.claspTeeth].sort((a, b) => a - b);

  return {
    missingTeeth: [...new Set(missingTeeth)].sort((a, b) => a - b),
    willExtractTeeth: [...new Set(willExtractTeeth)].sort((a, b) => a - b),
    claspTeeth,
  };
}
