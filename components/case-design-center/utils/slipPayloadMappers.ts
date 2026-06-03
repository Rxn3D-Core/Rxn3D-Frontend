import type {
  SlipCreationAbutmentDetail,
  SlipCreationAdvanceField,
  SlipCreationExtraction,
  SlipCreationImplantDetail,
  SlipCreationRetention,
  SlipCreationRetentionOption,
  SlipCreationRush,
  SlipCreationTeethSelection,
  SlipCreationToothChart,
} from "@/services/slip-creation-service";
import { fetchProductImplants, type ProductAbutment, type ProductImplant } from "@/services/implant-api";
import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { ProductApiData, ProductExtraction } from "../types";
import {
  isOverlayExtractionByFlag,
  isTimExtractionByFlag,
  toothHasTimBaseExtraction,
} from "./extractionHelpers";
import {
  getRetentionMechanismNamesFromOption,
  parseRetentionMechanismSelection,
} from "./retentionMechanismTypes";
import type { RetentionOptionItem } from "@/components/retention-type-popover";

export type RushUiState = Record<string, unknown> | null | undefined;

/** Normalize rush modal state (`targetDate`) to API `rush` object. */
export function normalizeRush(rush: RushUiState): SlipCreationRush | undefined {
  if (!rush || typeof rush !== "object") return undefined;
  const r = rush as Record<string, unknown>;
  if (r.is_rush === true && typeof r.requested_rush_date === "string" && r.requested_rush_date) {
    return { is_rush: true, requested_rush_date: r.requested_rush_date };
  }
  const targetDate = r.targetDate;
  if (typeof targetDate === "string" && targetDate.trim()) {
    return { is_rush: true, requested_rush_date: targetDate.trim() };
  }
  return undefined;
}

function resolveExtractionId(row: { extraction_id?: number; id?: number } | undefined): number {
  if (!row) return 0;
  const id = row.extraction_id ?? row.id ?? 0;
  return typeof id === "number" && id > 0 ? id : 0;
}

function findRetentionOptionForChartType(
  product: ProductApiData,
  chartType: string
): NonNullable<ProductApiData["retention_options"]>[number] | undefined {
  const options = product.retention_options ?? [];
  return options.find((opt) => {
    const candidates = [
      opt.tooth_chart_type,
      opt.name,
      opt.lab_retention_option?.tooth_chart_type,
      opt.lab_retention_option?.name,
      opt.retention_option?.tooth_chart_type,
      opt.retention_option?.name,
    ];
    return candidates.some((c) => c === chartType);
  });
}

function resolveRetentionOptionId(
  opt: NonNullable<ProductApiData["retention_options"]>[number]
): number {
  return (
    opt.retention_option_id ??
    opt.retention_option?.id ??
    opt.global_connection?.global_retention_option_id ??
    opt.id ??
    0
  );
}

/** Per-tooth retention chart types → `retention_options[]` (teeth_number required). */
export function buildRetentionOptions(
  product: ProductApiData | null | undefined,
  retentionTypesByTooth: Record<number, string[]>,
  cardTeeth: number[]
): SlipCreationRetentionOption[] {
  if (!product || product.has_retention !== "Yes") return [];
  const out: SlipCreationRetentionOption[] = [];
  const seen = new Set<string>();

  for (const toothNumber of cardTeeth) {
    const types = retentionTypesByTooth[toothNumber] ?? [];
    for (const chartType of types) {
      const opt = findRetentionOptionForChartType(product, chartType);
      const retention_option_id = opt ? resolveRetentionOptionId(opt) : 0;
      if (!retention_option_id) continue;
      const key = `${retention_option_id}_${toothNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ retention_option_id, teeth_number: toothNumber });
    }
  }
  return out;
}

type NestedRetentionLink = {
  id?: number;
  retention_id?: number;
  name?: string;
  code?: string | null;
  status?: string | null;
};

function resolveRetentionIdByName(
  product: ProductApiData,
  mechanismName: string
): number {
  const target = mechanismName.trim();
  if (!target) return 0;

  for (const opt of product.retention_options ?? []) {
    for (const nested of (opt.retentions ?? []) as NestedRetentionLink[]) {
      if (nested.name !== target) continue;
      const id = nested.retention_id ?? nested.id ?? 0;
      if (id > 0) return id;
    }
  }
  return 0;
}

/** Parse fixed restoration mechanism field (`Screwed, Cemented`) or legacy retention JSON. */
function parseMechanismNamesFromField(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object" && "name" in item) {
            return String((item as { name?: string }).name ?? "").trim();
          }
          return "";
        })
        .filter(Boolean);
    }
    if (typeof parsed.name === "string" && parsed.name.trim()) {
      return [parsed.name.trim()];
    }
  } catch {
    /* comma-separated or plain name */
  }

  if (trimmed.includes(",")) {
    return parseRetentionMechanismSelection(trimmed);
  }
  return [trimmed];
}

/**
 * Retention mechanisms (Screwed, Cemented, etc.) → `retentions[]`.
 * Supports multiple mechanisms from `fixed_retention_type` / `retention` field values.
 */
export function buildRetentions(
  product: ProductApiData | null | undefined,
  fieldValues: Record<string, string>,
  retentionTypesByTooth: Record<number, string[]>,
  cardTeeth: number[]
): SlipCreationRetention[] {
  if (!product || product.has_retention !== "Yes") return [];

  const retentionRaw =
    fieldValues.fixed_retention_type ?? fieldValues.retention ?? "";
  if (!retentionRaw.trim()) return [];

  const mechanismNamesFromField = parseMechanismNamesFromField(retentionRaw);
  const allowedNames =
    mechanismNamesFromField.length > 0 ? new Set(mechanismNamesFromField) : null;

  const out: SlipCreationRetention[] = [];
  const seen = new Set<string>();

  const pushRetention = (retention_id: number, teeth_number?: number) => {
    if (!retention_id) return;
    const key =
      teeth_number !== undefined ? `${retention_id}_${teeth_number}` : `${retention_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(
      teeth_number !== undefined ? { retention_id, teeth_number } : { retention_id }
    );
  };

  for (const toothNumber of cardTeeth) {
    const chartTypes = retentionTypesByTooth[toothNumber] ?? [];
    for (const chartType of chartTypes) {
      const opt = findRetentionOptionForChartType(product, chartType) as
        | RetentionOptionItem
        | undefined;
      const mechanismNames = getRetentionMechanismNamesFromOption(opt);
      for (const name of mechanismNames) {
        if (allowedNames && !allowedNames.has(name)) continue;
        const retention_id = resolveRetentionIdByName(product, name);
        pushRetention(retention_id, toothNumber);
      }
    }
  }

  if (out.length > 0) return out;

  if (mechanismNamesFromField.length > 0) {
    for (const name of mechanismNamesFromField) {
      pushRetention(resolveRetentionIdByName(product, name));
    }
    if (out.length > 0) return out;
  }

  try {
    const parsed = JSON.parse(retentionRaw) as { retention_id?: number; id?: number };
    const retention_id = Number(parsed.retention_id ?? parsed.id ?? 0) || 0;
    if (retention_id) {
      pushRetention(retention_id);
      return out;
    }
  } catch {
    const retention_id = resolveRetentionIdByName(product, retentionRaw);
    if (retention_id) pushRetention(retention_id);
  }

  return out;
}

function resolveExtractionCodeForTooth(
  toothNumber: number,
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[],
  extractions: ProductExtraction[]
): string | undefined {
  const assigned = toothExtractionMap[toothNumber];
  if (assigned) return assigned;
  if (claspTeeth.includes(toothNumber)) {
    const overlay = extractions.find((e) => isOverlayExtractionByFlag(e));
    return overlay?.code;
  }
  if (toothHasTimBaseExtraction(toothNumber, toothExtractionMap, extractions)) {
    const tim = extractions.find((e) => isTimExtractionByFlag(e));
    return tim?.code;
  }
  return undefined;
}

/** Group per-tooth extraction codes into `extractions[]`. */
export function buildProductExtractions(
  product: ProductApiData | null | undefined,
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[],
  cardTeeth: number[]
): SlipCreationExtraction[] {
  if (!product || product.has_extraction !== "Yes" || !product.extractions?.length) {
    return [];
  }

  const catalog = product.extractions;
  const grouped = new Map<number, number[]>();

  for (const toothNumber of cardTeeth) {
    const code = resolveExtractionCodeForTooth(
      toothNumber,
      toothExtractionMap,
      claspTeeth,
      catalog
    );
    if (!code) continue;
    const row = catalog.find((e) => e.code === code);
    const extraction_id = resolveExtractionId(row);
    if (!extraction_id) continue;
    const list = grouped.get(extraction_id) ?? [];
    list.push(toothNumber);
    grouped.set(extraction_id, list);
  }

  return Array.from(grouped.entries()).map(([extraction_id, teeth_numbers]) => ({
    extraction_id,
    teeth_numbers: [...teeth_numbers].sort((a, b) => a - b),
  }));
}

function resolveExtractionIdForTooth(
  product: ProductApiData,
  toothNumber: number,
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[]
): number | undefined {
  const catalog = product.extractions ?? [];
  if (!catalog.length) return undefined;
  const code = resolveExtractionCodeForTooth(
    toothNumber,
    toothExtractionMap,
    claspTeeth,
    catalog
  );
  if (!code) return undefined;
  const row = catalog.find((e) => e.code === code);
  const extraction_id = resolveExtractionId(row);
  return extraction_id > 0 ? extraction_id : undefined;
}

function buildOppositeExtractionByTooth(
  oppositeExtractions: Array<{ extraction_id: number; teeth_numbers: number[] }> | undefined
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const row of oppositeExtractions ?? []) {
    for (const toothNumber of row.teeth_numbers) {
      map[toothNumber] = row.extraction_id;
    }
  }
  return map;
}

function resolveRetentionIdForTooth(
  product: ProductApiData,
  fieldValues: Record<string, string>,
  retentionTypesByTooth: Record<number, string[]>,
  toothNumber: number
): number | undefined {
  const rows = buildRetentions(product, fieldValues, retentionTypesByTooth, [toothNumber]);
  const perTooth = rows.find((row) => row.teeth_number === toothNumber);
  if (perTooth?.retention_id) return perTooth.retention_id;
  const global = rows.find((row) => row.teeth_number === undefined);
  return global?.retention_id;
}

function resolveRetentionOptionIdForTooth(
  product: ProductApiData,
  retentionTypesByTooth: Record<number, string[]>,
  toothNumber: number
): { chart_type?: string; retention_option_id?: number } {
  const chartTypes = retentionTypesByTooth[toothNumber] ?? [];
  if (chartTypes.length === 0) return {};
  const chart_type = chartTypes[0];
  const opt = findRetentionOptionForChartType(product, chart_type);
  const retention_option_id = opt ? resolveRetentionOptionId(opt) : 0;
  return {
    chart_type,
    ...(retention_option_id > 0 ? { retention_option_id } : {}),
  };
}

/** Per selected tooth → `teeth_selection[]` rows for slip create API. */
export function buildTeethSelection(
  product: ProductApiData | null | undefined,
  retentionTypesByTooth: Record<number, string[]>,
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[],
  cardTeeth: number[]
): SlipCreationTeethSelection[] {
  if (!product || cardTeeth.length === 0) return [];

  const out: SlipCreationTeethSelection[] = [];
  for (const toothNumber of [...cardTeeth].sort((a, b) => a - b)) {
    const { retention_option_id } =
      product.has_retention === "Yes"
        ? resolveRetentionOptionIdForTooth(product, retentionTypesByTooth, toothNumber)
        : {};
    const extraction_id =
      product.has_extraction === "Yes"
        ? resolveExtractionIdForTooth(
            product,
            toothNumber,
            toothExtractionMap,
            claspTeeth
          )
        : undefined;
    out.push({
      teeth_number: toothNumber,
      ...(retention_option_id ? { retention_option_id } : {}),
      ...(extraction_id ? { extraction_ids: [extraction_id] } : {}),
    });
  }
  return out;
}

/** Per selected tooth → `tooth_chart[]` rows for slip create API. */
export function buildToothChart(
  product: ProductApiData | null | undefined,
  fieldValues: Record<string, string>,
  retentionTypesByTooth: Record<number, string[]>,
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[],
  cardTeeth: number[],
  oppositeExtractions?: Array<{ extraction_id: number; teeth_numbers: number[] }>
): SlipCreationToothChart[] {
  if (!product || cardTeeth.length === 0) return [];

  const oppositeByTooth = buildOppositeExtractionByTooth(oppositeExtractions);
  const out: SlipCreationToothChart[] = [];

  for (const toothNumber of [...cardTeeth].sort((a, b) => a - b)) {
    const { chart_type, retention_option_id } = resolveRetentionOptionIdForTooth(
      product,
      retentionTypesByTooth,
      toothNumber
    );
    const retention_id =
      product.has_retention === "Yes"
        ? resolveRetentionIdForTooth(
            product,
            fieldValues,
            retentionTypesByTooth,
            toothNumber
          )
        : undefined;
    const extraction_id =
      product.has_extraction === "Yes"
        ? resolveExtractionIdForTooth(
            product,
            toothNumber,
            toothExtractionMap,
            claspTeeth
          )
        : undefined;
    const opposite_extraction_id = oppositeByTooth[toothNumber];

    out.push({
      tooth_number: toothNumber,
      ...(chart_type ? { chart_type } : {}),
      ...(retention_id ? { retention_id } : {}),
      ...(retention_option_id ? { retention_option_id } : {}),
      ...(extraction_id ? { extraction_id } : {}),
      ...(opposite_extraction_id ? { opposite_extraction_id } : {}),
    });
  }

  return out;
}

function matchImplantRow(
  catalog: ProductImplant[],
  detail: ImplantDetailData
): ProductImplant | undefined {
  if (!detail.brand) return undefined;
  return catalog.find(
    (row) =>
      row.brand_name === detail.brand &&
      (!detail.systemName || row.system_name === detail.systemName)
  );
}

function matchPlatformId(row: ProductImplant, platformName: string): number | undefined {
  if (!platformName) return undefined;
  const platform = row.platforms?.find((p) => p.name === platformName);
  return platform?.id;
}

function matchPlatformSizeId(
  row: ProductImplant,
  platformName: string,
  sizeLabel: string
): number | undefined {
  const platformId = matchPlatformId(row, platformName);
  if (!platformId || !sizeLabel) return undefined;
  const platform = row.platforms?.find((p) => p.id === platformId);
  const size = platform?.sizes?.find((s) => s.label === sizeLabel);
  return size?.id;
}

function resolveAbutmentSelectionIds(
  productAbutments: ProductAbutment[] | undefined,
  category: string,
  typeName: string
): { abutment_id?: number; abutment_type_id?: number; abutment_option_id?: number } {
  if (!productAbutments?.length || !category || !typeName) return {};
  const abutment = productAbutments.find((a) => a.type === category);
  const option = abutment?.options?.find((o) => o.name === typeName);
  const abutment_id = abutment?.id;
  const abutment_type_id = option?.abutment_type_id;
  const abutment_option_id = option?.id;
  return {
    ...(abutment_id ? { abutment_id } : {}),
    ...(abutment_type_id ? { abutment_type_id } : {}),
    ...(abutment_option_id ? { abutment_option_id } : {}),
  };
}

/** Map implant UI + prefetch catalog to structured API arrays. */
export function buildImplantAndAbutmentDetails(
  product: ProductApiData | null | undefined,
  implantDetailByTooth: Record<number, ImplantDetailData> | undefined,
  implantCatalog: ProductImplant[] | undefined
): {
  implant_details: SlipCreationImplantDetail[];
  abutment_details: SlipCreationAbutmentDetail[];
} {
  const implant_details: SlipCreationImplantDetail[] = [];
  const abutment_details: SlipCreationAbutmentDetail[] = [];
  if (!product || !implantDetailByTooth || !implantCatalog?.length) {
    return { implant_details, abutment_details };
  }

  const productAbutments = product.abutments;

  for (const [toothKey, detail] of Object.entries(implantDetailByTooth)) {
    const teeth_number = Number(toothKey);
    if (!detail?.brand && !detail?.platform) continue;

    const row = matchImplantRow(implantCatalog, detail);
    if (!row) continue;

    const implant_platform_id = detail.platform
      ? matchPlatformId(row, detail.platform)
      : undefined;
    const implant_platform_size_id =
      detail.platform && detail.size
        ? matchPlatformSizeId(row, detail.platform, detail.size)
        : undefined;

    implant_details.push({
      teeth_number,
      implant_id: row.id,
      ...(implant_platform_id ? { implant_platform_id } : {}),
      ...(implant_platform_size_id ? { implant_platform_size_id } : {}),
    });

    if (detail.abutmentType && detail.abutmentDetail) {
      const {
        abutment_id,
        abutment_type_id,
        abutment_option_id,
      } = resolveAbutmentSelectionIds(
        productAbutments,
        detail.abutmentType,
        detail.abutmentDetail
      );
      if (abutment_type_id) {
        abutment_details.push({
          teeth_number,
          ...(abutment_id ? { abutment_id } : {}),
          abutment_type_id,
          ...(abutment_option_id ? { abutment_option_id } : {}),
        });
      }
    }
  }

  return { implant_details, abutment_details };
}

/** Resolve `material_id` from saved field value or product name match. */
export function resolveMaterialId(
  product: ProductApiData | null | undefined,
  fieldValues: Record<string, string>
): number | undefined {
  if (!product || product.has_material !== "Yes") return undefined;

  const raw = fieldValues.material?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const id = Number(parsed.material_id ?? parsed.id ?? 0);
      if (id > 0) return id;
    } catch {
      const materials = (product as ProductApiData & { materials?: Array<{ id?: number; material_id?: number; name?: string }> })
        .materials;
      if (materials?.length) {
        const match = materials.find((m) => m.name === raw);
        const mid = match?.material_id ?? match?.id;
        if (mid && mid > 0) return mid;
      }
    }
  }
  return undefined;
}

export interface AdvanceFieldFileSlot {
  formKey: string;
  file: File;
}

/** Strip `File` from advance_fields for JSON; collect multipart keys. */
export function partitionAdvanceFieldsForMultipart(
  advance_fields: SlipCreationAdvanceField[] | undefined,
  slipIndex: number,
  productIndex: number
): { jsonFields: SlipCreationAdvanceField[]; fileSlots: AdvanceFieldFileSlot[] } {
  if (!advance_fields?.length) return { jsonFields: [], fileSlots: [] };

  const jsonFields: SlipCreationAdvanceField[] = [];
  const fileSlots: AdvanceFieldFileSlot[] = [];

  advance_fields.forEach((field, afIndex) => {
    if (field.file instanceof File) {
      fileSlots.push({
        formKey: `slips[${slipIndex}][products][${productIndex}][advance_fields][${afIndex}][file]`,
        file: field.file,
      });
      const { file: _f, file_index: _i, ...rest } = field;
      jsonFields.push(rest);
    } else {
      jsonFields.push(field);
    }
  });

  return { jsonFields, fileSlots };
}

/** Prefetch implant catalogs for snapshots that need structured implant_details. */
export async function prefetchImplantCatalogsForSnapshots(
  snapshots: Array<{ productId: number; implantDetailByTooth?: Record<number, ImplantDetailData> }>,
  customerId: number
): Promise<Map<number, ProductImplant[]>> {
  const map = new Map<number, ProductImplant[]>();
  const ids = new Set<number>();
  for (const snap of snapshots) {
    if (snap.implantDetailByTooth && Object.keys(snap.implantDetailByTooth).length > 0) {
      ids.add(snap.productId);
    }
  }
  await Promise.all(
    [...ids].map(async (productId) => {
      const catalog = await fetchProductImplants(productId, customerId);
      map.set(productId, catalog);
    })
  );
  return map;
}
