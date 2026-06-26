import type {
  SlipCreationAddon,
  SlipCreationAdvanceField,
  SlipCreationExtraction,
  SlipCreationImpression,
  SlipCreationProduct,
  SlipCreationRetention,
  SlipCreationRetentionOption,
  SlipCreationRush,
  SlipCreationShadeDetail,
  SlipCreationTeethSelection,
  SlipCreationToothChart,
  SlipCreationAbutmentDetail,
  SlipCreationImplantDetail,
} from "@/services/slip-creation-service";
import { parseProductTeeth } from "@/lib/virtual-slip-transformer";
import { normalizeRush } from "./slipPayloadMappers";

export type EditSlipProduct = SlipCreationProduct & { id?: number };

function normalizeSlipProductType(type: string | null | undefined): "Upper" | "Lower" | null {
  const t = String(type ?? "").toLowerCase();
  if (t === "upper" || t === "maxillary") return "Upper";
  if (t === "lower" || t === "mandibular") return "Lower";
  return null;
}

function positiveId(value: unknown): number | undefined {
  const id = Number(value ?? 0);
  return id > 0 ? id : undefined;
}

function parseApiTeethSelection(apiProduct: Record<string, unknown>): SlipCreationTeethSelection[] {
  const raw = apiProduct.teeth_selection;
  if (Array.isArray(raw) && raw.length > 0) {
    if (typeof raw[0] === "number") {
      return raw
        .map((toothNumber) => ({ teeth_number: Number(toothNumber) }))
        .filter((row) => row.teeth_number > 0)
        .sort((a, b) => a.teeth_number - b.teeth_number);
    }
    return raw
      .map((row: Record<string, unknown>) => {
        const teeth_number = Number(row.teeth_number ?? row.tooth_number ?? 0);
        const retention_option_id = positiveId(row.retention_option_id);
        const extraction_ids = Array.isArray(row.extraction_ids)
          ? row.extraction_ids.map((id) => Number(id)).filter((id) => id > 0)
          : undefined;
        return {
          teeth_number,
          ...(retention_option_id ? { retention_option_id } : {}),
          ...(extraction_ids?.length ? { extraction_ids } : {}),
        };
      })
      .filter((row) => row.teeth_number > 0)
      .sort((a, b) => a.teeth_number - b.teeth_number);
  }

  const teeth = parseProductTeeth(apiProduct);
  return teeth.map((teeth_number) => ({ teeth_number }));
}

function parseApiExtractions(rows: unknown): SlipCreationExtraction[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      extraction_id: Number(row.extraction_id ?? (row.extraction as { id?: number })?.id ?? 0),
      teeth_numbers: Array.isArray(row.teeth_numbers)
        ? [...row.teeth_numbers].map((n) => Number(n)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
        : [],
    }))
    .filter((row) => row.extraction_id > 0 && row.teeth_numbers.length > 0);
}

function parseApiImpressions(rows: unknown): SlipCreationImpression[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      impression_id: Number(
        row.impression_id ?? (row.impression as { id?: number; impression_id?: number })?.impression_id ??
          (row.impression as { id?: number })?.id ?? 0
      ),
      quantity: Number(row.quantity ?? 1),
    }))
    .filter((row) => row.impression_id > 0 && row.quantity > 0);
}

function parseApiAddons(rows: unknown): SlipCreationAddon[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      addon_id: Number(row.addon_id ?? (row.addon as { id?: number })?.id ?? 0),
      quantity: Number(row.quantity ?? row.qty ?? 1),
    }))
    .filter((row) => row.addon_id > 0 && row.quantity > 0);
}

function parseApiRetentions(rows: unknown): SlipCreationRetention[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => {
      const retention_id = Number(
        row.retention_id ?? (row.retention as { id?: number })?.id ?? 0
      );
      const teeth_number = row.tooth_number ?? row.teeth_number;
      return {
        retention_id,
        ...(teeth_number != null ? { teeth_number: Number(teeth_number) } : {}),
      };
    })
    .filter((row) => row.retention_id > 0);
}

function parseApiRetentionOptions(rows: unknown): SlipCreationRetentionOption[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      retention_option_id: Number(row.retention_option_id ?? row.id ?? 0),
      teeth_number: Number(row.teeth_number ?? row.tooth_num ?? 0),
    }))
    .filter((row) => row.retention_option_id > 0 && row.teeth_number > 0);
}

function parseApiToothChart(rows: unknown): SlipCreationToothChart[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => {
      const tooth_number = Number(row.tooth_number ?? row.tooth_num ?? 0);
      return {
        tooth_number,
        ...(row.chart_type ? { chart_type: String(row.chart_type) } : {}),
        ...(positiveId(row.retention_id) ? { retention_id: positiveId(row.retention_id) } : {}),
        ...(positiveId(row.retention_option_id)
          ? { retention_option_id: positiveId(row.retention_option_id) }
          : {}),
        ...(positiveId(row.extraction_id) ? { extraction_id: positiveId(row.extraction_id) } : {}),
        ...(positiveId(row.opposite_extraction_id)
          ? { opposite_extraction_id: positiveId(row.opposite_extraction_id) }
          : {}),
      };
    })
    .filter((row) => row.tooth_number > 0);
}

function parseApiAdvanceFields(rows: unknown): SlipCreationAdvanceField[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      teeth_number:
        row.teeth_number != null ? Number(row.teeth_number) : row.tooth_number != null ? Number(row.tooth_number) : null,
      advance_field_id: Number(row.advance_field_id ?? row.id ?? 0),
      advance_field_value:
        row.advance_field_value != null
          ? String(row.advance_field_value)
          : row.value != null
            ? String(row.value)
            : null,
    }))
    .filter((row) => row.advance_field_id > 0);
}

function parseApiShadeDetails(rows: unknown): SlipCreationShadeDetail[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      advance_field_id: Number(row.advance_field_id ?? 0),
      teeth_shade_brand_id: Number(row.teeth_shade_brand_id ?? 0),
      teeth_shade_id: Number(row.teeth_shade_id ?? 0),
    }))
    .filter(
      (row) =>
        row.advance_field_id > 0 && row.teeth_shade_brand_id > 0 && row.teeth_shade_id > 0
    );
}

function parseApiImplantDetails(rows: unknown): SlipCreationImplantDetail[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      teeth_number: Number(row.teeth_number ?? row.tooth_number ?? 0),
      implant_id: Number(row.implant_id ?? 0),
      ...(positiveId(row.implant_platform_id)
        ? { implant_platform_id: positiveId(row.implant_platform_id) }
        : {}),
      ...(positiveId(row.implant_platform_size_id)
        ? { implant_platform_size_id: positiveId(row.implant_platform_size_id) }
        : {}),
    }))
    .filter((row) => row.teeth_number > 0 && row.implant_id > 0);
}

function parseApiAbutmentDetails(rows: unknown): SlipCreationAbutmentDetail[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: Record<string, unknown>) => ({
      teeth_number: Number(row.teeth_number ?? row.tooth_number ?? 0),
      abutment_type_id: Number(row.abutment_type_id ?? 0),
      ...(positiveId(row.abutment_id) ? { abutment_id: positiveId(row.abutment_id) } : {}),
      ...(positiveId(row.abutment_option_id)
        ? { abutment_option_id: positiveId(row.abutment_option_id) }
        : {}),
    }))
    .filter((row) => row.teeth_number > 0 && row.abutment_type_id > 0);
}

function parseApiRush(apiProduct: Record<string, unknown>): SlipCreationRush | undefined {
  const rush = apiProduct.rush;
  if (!rush || typeof rush !== "object") return undefined;
  const normalized = normalizeRush(rush as Record<string, unknown>);
  return normalized.is_rush ? normalized : { is_rush: false };
}

function parseApiNotes(apiProduct: Record<string, unknown>): string | undefined {
  if (typeof apiProduct.notes === "string" && apiProduct.notes.trim()) {
    return apiProduct.notes.trim();
  }
  if (Array.isArray(apiProduct.notes) && apiProduct.notes.length > 0) {
    const first = apiProduct.notes[0] as { note?: string };
    if (typeof first?.note === "string" && first.note.trim()) {
      return first.note.trim();
    }
  }
  return undefined;
}

/** Convert GET /slip/details product row → same SlipCreationProduct shape as slip create. */
export function apiSlipProductToSlipCreationProduct(apiRow: unknown): EditSlipProduct | null {
  if (!apiRow || typeof apiRow !== "object") return null;
  const row = apiRow as Record<string, unknown>;
  const type = normalizeSlipProductType(row.type as string);
  if (!type) return null;

  const nestedProduct = (row.product ?? {}) as Record<string, unknown>;
  const nestedCategory = (row.category ?? nestedProduct.subcategory as { category?: { id?: number } } | undefined)?.category;
  const nestedSubcategory = nestedProduct.subcategory as { id?: number; category_id?: number } | undefined;

  const product_id = positiveId(row.product_id ?? nestedProduct.id);
  const category_id = positiveId(
    (nestedCategory as { id?: number } | undefined)?.id ??
      nestedSubcategory?.category_id ??
      (row.category as { id?: number } | undefined)?.id
  );
  const subcategory_id = positiveId(nestedSubcategory?.id ?? row.subcategory_id);

  if (!product_id || !category_id || !subcategory_id) return null;

  const teeth_selection = parseApiTeethSelection(row);
  const extractions = parseApiExtractions(row.extractions);
  const opposite_extractions = parseApiExtractions(row.opposite_extractions);
  const impressions = parseApiImpressions(row.impressions);
  const opposite_impressions = parseApiImpressions(row.opposite_impressions);
  const addons = parseApiAddons(row.addons);
  const retentions = parseApiRetentions(row.retentions);
  const retention_options = parseApiRetentionOptions(row.retention_options);
  const tooth_chart = parseApiToothChart(
    row.tooth_chart ?? row.tooth_chart_entries ?? row.tooth_chart_details
  );
  const advance_fields = parseApiAdvanceFields(row.advance_fields);
  const shade_details = parseApiShadeDetails(row.shade_details);
  const implant_details = parseApiImplantDetails(row.implant_details);
  const abutment_details = parseApiAbutmentDetails(row.abutment_details);

  const teeth_shade = row.teeth_shade as { id?: number; teeth_shade_id?: number; brand?: { id?: number } } | undefined;
  const gum_shade = row.gum_shade as { id?: number; gum_shade_id?: number; brand?: { id?: number } } | undefined;

  const product: EditSlipProduct = {
    type,
    category_id,
    product_id,
    subcategory_id,
    ...(positiveId(row.id) ? { id: positiveId(row.id) } : {}),
    ...(positiveId(row.variation_id ?? (row.variation as { id?: number })?.id)
      ? { variation_id: positiveId(row.variation_id ?? (row.variation as { id?: number })?.id) }
      : {}),
    ...(positiveId(row.stage_id ?? (row.stage as { stage_id?: number; id?: number })?.stage_id ?? (row.stage as { id?: number })?.id)
      ? {
          stage_id: positiveId(
            row.stage_id ??
              (row.stage as { stage_id?: number; id?: number })?.stage_id ??
              (row.stage as { id?: number })?.id
          ),
        }
      : {}),
    ...(positiveId(row.grade_id ?? (row.grade as { grade_id?: number; id?: number })?.grade_id ?? (row.grade as { id?: number })?.id)
      ? {
          grade_id: positiveId(
            row.grade_id ??
              (row.grade as { grade_id?: number; id?: number })?.grade_id ??
              (row.grade as { id?: number })?.id
          ),
        }
      : {}),
    ...(positiveId(row.material_id ?? (row.material as { id?: number; material_id?: number })?.material_id ?? (row.material as { id?: number })?.id)
      ? {
          material_id: positiveId(
            row.material_id ??
              (row.material as { id?: number; material_id?: number })?.material_id ??
              (row.material as { id?: number })?.id
          ),
        }
      : {}),
    ...(positiveId(teeth_shade?.teeth_shade_id ?? teeth_shade?.id)
      ? { teeth_shade_id: positiveId(teeth_shade?.teeth_shade_id ?? teeth_shade?.id) }
      : {}),
    ...(positiveId(teeth_shade?.brand?.id) ? { teeth_shade_brand_id: positiveId(teeth_shade?.brand?.id) } : {}),
    ...(positiveId(gum_shade?.gum_shade_id ?? gum_shade?.id)
      ? { gum_shade_id: positiveId(gum_shade?.gum_shade_id ?? gum_shade?.id) }
      : {}),
    ...(positiveId(gum_shade?.brand?.id) ? { gum_shade_brand_id: positiveId(gum_shade?.brand?.id) } : {}),
    status: String(row.status ?? "In Progress"),
    ...(parseApiNotes(row) ? { notes: parseApiNotes(row) } : {}),
    ...(parseApiRush(row) ? { rush: parseApiRush(row) } : {}),
    ...(teeth_selection.length > 0 ? { teeth_selection } : {}),
    ...(impressions.length > 0 ? { impressions } : {}),
    ...(opposite_impressions.length > 0 ? { opposite_impressions } : {}),
    ...(extractions.length > 0 ? { extractions } : {}),
    ...(opposite_extractions.length > 0 ? { opposite_extractions } : {}),
    ...(addons.length > 0 ? { addons } : {}),
    ...(retentions.length > 0 ? { retentions } : {}),
    ...(retention_options.length > 0 ? { retention_options } : {}),
    ...(tooth_chart.length > 0 ? { tooth_chart } : {}),
    ...(advance_fields.length > 0 ? { advance_fields } : {}),
    ...(shade_details.length > 0 ? { shade_details } : {}),
    ...(implant_details.length > 0 ? { implant_details } : {}),
    ...(abutment_details.length > 0 ? { abutment_details } : {}),
  };

  return product;
}

function hasArrayValues<T>(value: T[] | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

function pickPositiveId(
  prepared: number | undefined,
  baseline: number | undefined
): number | undefined {
  if (prepared != null && prepared > 0) return prepared;
  if (baseline != null && baseline > 0) return baseline;
  return undefined;
}

function pickArray<T>(prepared: T[] | undefined, baseline: T[] | undefined): T[] | undefined {
  if (hasArrayValues(prepared)) return prepared;
  if (hasArrayValues(baseline)) return baseline;
  return undefined;
}

function pickString(prepared: string | undefined, baseline: string | undefined): string | undefined {
  if (typeof prepared === "string" && prepared.trim()) return prepared;
  if (typeof baseline === "string" && baseline.trim()) return baseline;
  return undefined;
}

/**
 * Merge CDC-built product (preferred) with API baseline so edit PUT keeps teeth,
 * extractions, tooth_chart, and other fields when the live collector omits them.
 */
export function mergeEditSlipProductWithBaseline(
  prepared: EditSlipProduct,
  baseline: EditSlipProduct
): EditSlipProduct {
  const merged: EditSlipProduct = {
    ...baseline,
    ...prepared,
    type: prepared.type ?? baseline.type,
    category_id: prepared.category_id || baseline.category_id,
    product_id: prepared.product_id || baseline.product_id,
    subcategory_id: prepared.subcategory_id || baseline.subcategory_id,
    id: prepared.id ?? baseline.id,
    status: prepared.status ?? baseline.status ?? "In Progress",
    variation_id: pickPositiveId(prepared.variation_id, baseline.variation_id),
    stage_id: pickPositiveId(prepared.stage_id, baseline.stage_id),
    grade_id: pickPositiveId(prepared.grade_id, baseline.grade_id),
    material_id: pickPositiveId(prepared.material_id, baseline.material_id),
    teeth_shade_id: pickPositiveId(prepared.teeth_shade_id, baseline.teeth_shade_id),
    teeth_shade_brand_id: pickPositiveId(
      prepared.teeth_shade_brand_id,
      baseline.teeth_shade_brand_id
    ),
    gum_shade_id: pickPositiveId(prepared.gum_shade_id, baseline.gum_shade_id),
    gum_shade_brand_id: pickPositiveId(prepared.gum_shade_brand_id, baseline.gum_shade_brand_id),
    notes: pickString(prepared.notes, baseline.notes),
    rush: prepared.rush?.is_rush ? prepared.rush : baseline.rush ?? prepared.rush,
    teeth_selection: pickArray(prepared.teeth_selection, baseline.teeth_selection),
    impressions: pickArray(prepared.impressions, baseline.impressions),
    opposite_impressions: pickArray(prepared.opposite_impressions, baseline.opposite_impressions),
    extractions: pickArray(prepared.extractions, baseline.extractions),
    opposite_extractions: pickArray(prepared.opposite_extractions, baseline.opposite_extractions),
    addons: pickArray(prepared.addons, baseline.addons),
    retentions: pickArray(prepared.retentions, baseline.retentions),
    retention_options: pickArray(prepared.retention_options, baseline.retention_options),
    tooth_chart: pickArray(prepared.tooth_chart, baseline.tooth_chart),
    shade_details: pickArray(prepared.shade_details, baseline.shade_details),
    advance_fields: pickArray(prepared.advance_fields, baseline.advance_fields),
    implant_details: pickArray(prepared.implant_details, baseline.implant_details),
    abutment_details: pickArray(prepared.abutment_details, baseline.abutment_details),
  };

  return merged;
}

export function buildBaselineEditSlipProducts(apiProducts: unknown[]): EditSlipProduct[] {
  if (!Array.isArray(apiProducts)) return [];
  return apiProducts
    .map((row) => apiSlipProductToSlipCreationProduct(row))
    .filter((row): row is EditSlipProduct => row != null);
}

export function findBaselineProductForPrepared(
  prepared: EditSlipProduct,
  baselineProducts: EditSlipProduct[],
  index: number
): EditSlipProduct | undefined {
  return (
    baselineProducts.find(
      (row) =>
        row.type === prepared.type &&
        (prepared.id == null || row.id === prepared.id) &&
        row.product_id === prepared.product_id
    ) ??
    baselineProducts.find((row) => row.type === prepared.type) ??
    baselineProducts[index]
  );
}
