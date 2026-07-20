import { isOverlayExtractionCode, isTimExtractionRow } from "@/components/case-design-center/utils/extractionHelpers"
import type { RetentionChartType } from "@/components/case-design-center/utils/retentionOptionChartType"
import type { ResolvedProductExtraction } from "@/lib/product-tooth-chart-preview-state"

/** One tooth row stored on the product and sent to the library products API. */
export type ProductDefaultToothChartEntry = {
  tooth_number: number
  retention_option_id?: number | null
  extraction_id?: number | null
  chart_type?: RetentionChartType | null
}

export const ALL_PRODUCT_CHART_TEETH: number[] = [
  ...Array.from({ length: 16 }, (_, i) => i + 1),
  ...Array.from({ length: 16 }, (_, i) => i + 17),
]

export type DefaultToothChartPreviewState = {
  maxillaryRetention: {
    typesByTooth: Record<number, RetentionChartType[]>
    optionIdByTooth: Record<number, number>
  }
  mandibularRetention: {
    typesByTooth: Record<number, RetentionChartType[]>
    optionIdByTooth: Record<number, number>
  }
  maxillaryToothExtractionMap: Record<number, string>
  mandibularToothExtractionMap: Record<number, string>
  maxillaryClaspTeeth: number[]
  mandibularClaspTeeth: number[]
  maxillaryTimOverrideTeeth: number[]
  mandibularTimOverrideTeeth: number[]
}

const EMPTY_PREVIEW: DefaultToothChartPreviewState = {
  maxillaryRetention: { typesByTooth: {}, optionIdByTooth: {} },
  mandibularRetention: { typesByTooth: {}, optionIdByTooth: {} },
  maxillaryToothExtractionMap: {},
  mandibularToothExtractionMap: {},
  maxillaryClaspTeeth: [],
  mandibularClaspTeeth: [],
  maxillaryTimOverrideTeeth: [],
  mandibularTimOverrideTeeth: [],
}

function archForTooth(toothNumber: number): "maxillary" | "mandibular" {
  return toothNumber <= 16 ? "maxillary" : "mandibular"
}

function resolveExtractionCode(
  extractionId: number | null | undefined,
  resolvedExtractions: ResolvedProductExtraction[],
): string | null {
  if (extractionId == null || !Number.isFinite(Number(extractionId))) return null
  const row = resolvedExtractions.find(
    (ext) => Number(ext.extraction_id) === Number(extractionId),
  )
  return row?.code ?? null
}

function resolveExtractionId(
  code: string | undefined,
  resolvedExtractions: ResolvedProductExtraction[],
): number | null {
  if (!code) return null
  const row = resolvedExtractions.find((ext) => ext.code === code)
  return row ? Number(row.extraction_id) : null
}

export function createInitialDefaultToothChart(
  defaultExtractionId: number | null = null,
): ProductDefaultToothChartEntry[] {
  return ALL_PRODUCT_CHART_TEETH.map((tooth_number) => ({
    tooth_number,
    retention_option_id: null,
    extraction_id: defaultExtractionId,
    chart_type: null,
  }))
}

export function normalizeDefaultToothChartEntries(
  entries: ProductDefaultToothChartEntry[] | undefined | null,
  fallbackExtractionId: number | null = null,
): ProductDefaultToothChartEntry[] {
  const byTooth = new Map<number, ProductDefaultToothChartEntry>()
  for (const row of entries ?? []) {
    const tooth = Number(row?.tooth_number)
    if (!Number.isFinite(tooth) || tooth < 1 || tooth > 32) continue
    byTooth.set(tooth, {
      tooth_number: tooth,
      retention_option_id:
        row.retention_option_id != null ? Number(row.retention_option_id) : null,
      extraction_id: row.extraction_id != null ? Number(row.extraction_id) : null,
      chart_type: (row.chart_type as RetentionChartType | null | undefined) ?? null,
    })
  }
  return ALL_PRODUCT_CHART_TEETH.map(
    (tooth_number) =>
      byTooth.get(tooth_number) ?? {
        tooth_number,
        retention_option_id: null,
        extraction_id: fallbackExtractionId,
        chart_type: null,
      },
  )
}

export function hydrateDefaultToothChartFromProduct(
  product: Record<string, unknown>,
  fallbackExtractionId: number | null = null,
): ProductDefaultToothChartEntry[] {
  const enabled =
    product.has_default_tooth_chart === "Yes" ||
    product.enable_default_tooth_chart === "Yes"
  if (!enabled) return []

  const raw = product.default_tooth_chart
  if (!Array.isArray(raw)) return []
  return normalizeDefaultToothChartEntries(
    raw as ProductDefaultToothChartEntry[],
    fallbackExtractionId,
  )
}

export function parseDefaultToothChartToPreviewState(
  entries: ProductDefaultToothChartEntry[],
  resolvedExtractions: ResolvedProductExtraction[],
): DefaultToothChartPreviewState {
  const state: DefaultToothChartPreviewState = {
    maxillaryRetention: { typesByTooth: {}, optionIdByTooth: {} },
    mandibularRetention: { typesByTooth: {}, optionIdByTooth: {} },
    maxillaryToothExtractionMap: {},
    mandibularToothExtractionMap: {},
    maxillaryClaspTeeth: [],
    mandibularClaspTeeth: [],
    maxillaryTimOverrideTeeth: [],
    mandibularTimOverrideTeeth: [],
  }

  for (const row of normalizeDefaultToothChartEntries(
    entries,
    resolveCatalogDefaultExtractionId(resolvedExtractions),
  )) {
    const tooth = row.tooth_number
    const arch = archForTooth(tooth)
    const retentionArch =
      arch === "maxillary" ? state.maxillaryRetention : state.mandibularRetention
    const extractionMap =
      arch === "maxillary"
        ? state.maxillaryToothExtractionMap
        : state.mandibularToothExtractionMap
    const claspTeeth =
      arch === "maxillary" ? state.maxillaryClaspTeeth : state.mandibularClaspTeeth
    const timTeeth =
      arch === "maxillary" ? state.maxillaryTimOverrideTeeth : state.mandibularTimOverrideTeeth

    if (row.retention_option_id != null && row.chart_type) {
      retentionArch.typesByTooth[tooth] = [row.chart_type]
      retentionArch.optionIdByTooth[tooth] = Number(row.retention_option_id)
      continue
    }

    if (row.extraction_id == null) {
      timTeeth.push(tooth)
      continue
    }

    const code = resolveExtractionCode(row.extraction_id, resolvedExtractions)
    if (!code) continue

    if (isOverlayExtractionCode(code, resolvedExtractions)) {
      if (!claspTeeth.includes(tooth)) claspTeeth.push(tooth)
      continue
    }

    if (isTimExtractionRow(resolvedExtractions.find((e) => e.code === code))) {
      timTeeth.push(tooth)
      continue
    }

    extractionMap[tooth] = code
  }

  return state
}

export function buildDefaultToothChartFromPreviewState(
  state: DefaultToothChartPreviewState,
  resolvedExtractions: ResolvedProductExtraction[],
  configDefaultExtractionId: number | null,
): ProductDefaultToothChartEntry[] {
  return ALL_PRODUCT_CHART_TEETH.map((tooth_number) => {
    const arch = archForTooth(tooth_number)
    const retention =
      arch === "maxillary" ? state.maxillaryRetention : state.mandibularRetention
    const extractionMap =
      arch === "maxillary"
        ? state.maxillaryToothExtractionMap
        : state.mandibularToothExtractionMap
    const claspTeeth =
      arch === "maxillary" ? state.maxillaryClaspTeeth : state.mandibularClaspTeeth
    const timTeeth =
      arch === "maxillary" ? state.maxillaryTimOverrideTeeth : state.mandibularTimOverrideTeeth

    const retentionType = retention.typesByTooth[tooth_number]?.[0]
    const retentionOptionId = retention.optionIdByTooth[tooth_number]
    if (retentionType && retentionOptionId != null) {
      return {
        tooth_number,
        retention_option_id: Number(retentionOptionId),
        extraction_id: null,
        chart_type: retentionType,
      }
    }

    if (claspTeeth.includes(tooth_number)) {
      const claspRow = resolvedExtractions.find((ext) =>
        isOverlayExtractionCode(ext.code, resolvedExtractions),
      )
      return {
        tooth_number,
        retention_option_id: null,
        extraction_id: claspRow ? Number(claspRow.extraction_id) : null,
        chart_type: null,
      }
    }

    if (timTeeth.includes(tooth_number)) {
      return {
        tooth_number,
        retention_option_id: null,
        extraction_id: null,
        chart_type: null,
      }
    }

    const code = extractionMap[tooth_number]
    const extractionId = resolveExtractionId(code, resolvedExtractions) ?? configDefaultExtractionId

    return {
      tooth_number,
      retention_option_id: null,
      extraction_id: extractionId,
      chart_type: null,
    }
  })
}

export function serializeDefaultToothChartForApi(
  entries: ProductDefaultToothChartEntry[] | undefined,
): Array<{
  tooth_number: number
  retention_option_id: number | null
  extraction_id: number | null
  chart_type: string | null
}> {
  return normalizeDefaultToothChartEntries(entries).map((row) => ({
    tooth_number: row.tooth_number,
    retention_option_id: row.retention_option_id ?? null,
    extraction_id: row.extraction_id ?? null,
    chart_type: row.chart_type ?? null,
  }))
}

/** Map form fields to API payload (`has_default_tooth_chart` + 32 tooth rows). */
export function applyDefaultToothChartToPayload(
  payload: Record<string, unknown>,
  form: {
    enable_default_tooth_chart?: string | null
    has_default_tooth_chart?: string | null
    allow_select_only_implant?: string | null
    default_tooth_chart?: ProductDefaultToothChartEntry[] | null | unknown
  },
): void {
  const enabled =
    form.enable_default_tooth_chart === "Yes" ||
    form.has_default_tooth_chart === "Yes" ||
    payload.has_default_tooth_chart === "Yes"

  payload.has_default_tooth_chart = enabled ? "Yes" : "No"

  // Always send Yes/No so create/update never omit the field.
  const allowOnlyImplant =
    enabled &&
    (form.allow_select_only_implant === "Yes" ||
      payload.allow_select_only_implant === "Yes")

  payload.allow_select_only_implant = allowOnlyImplant ? "Yes" : "No"

  if (enabled) {
    const source = Array.isArray(form.default_tooth_chart)
      ? form.default_tooth_chart
      : Array.isArray(payload.default_tooth_chart)
        ? (payload.default_tooth_chart as ProductDefaultToothChartEntry[])
        : []
    payload.default_tooth_chart = serializeDefaultToothChartForApi(source)
  } else {
    payload.default_tooth_chart = []
  }

  delete payload.enable_default_tooth_chart
}

export function defaultToothChartSignature(entries: ProductDefaultToothChartEntry[]): string {
  return normalizeDefaultToothChartEntries(entries)
    .map(
      (row) =>
        `${row.tooth_number}:${row.retention_option_id ?? ""}:${row.extraction_id ?? ""}:${row.chart_type ?? ""}`,
    )
    .join("|")
}

export function resolveCatalogDefaultExtractionId(
  resolvedExtractions: ResolvedProductExtraction[],
): number | null {
  const defaultRow = resolvedExtractions.find((row) => row.is_default === "Yes")
  if (defaultRow) return Number(defaultRow.extraction_id)
  const tim = resolvedExtractions.find(isTimExtractionRow)
  return tim ? Number(tim.extraction_id) : null
}

/**
 * How to restore a tooth after Clear/Remove in the product default tooth chart:
 * always fall back to the catalog Def extraction (or TIM), never leave blank.
 */
export type CatalogDefaultExtractionAssignment =
  | { kind: "none" }
  | { kind: "code"; code: string }
  | { kind: "tim" }

export function resolveCatalogDefaultExtractionAssignment(
  resolvedExtractions: ResolvedProductExtraction[],
): CatalogDefaultExtractionAssignment {
  const defaultRow = resolvedExtractions.find(
    (row) => String(row.is_default ?? "").trim().toLowerCase() === "yes",
  )
  if (!defaultRow?.code) return { kind: "none" }
  if (isTimExtractionRow(defaultRow)) return { kind: "tim" }
  return { kind: "code", code: defaultRow.code }
}

export function productHasDefaultToothChartEnabled(
  product: Record<string, unknown> | null | undefined,
): boolean {
  return (
    product?.has_default_tooth_chart === "Yes" ||
    product?.enable_default_tooth_chart === "Yes"
  )
}

/** Skip catalog default extraction/retention auto-select; `default_tooth_chart` is the source of truth. */
export function shouldSkipLegacyDefaultExtractionAutoSelect(
  product: Record<string, unknown> | null | undefined,
): boolean {
  return productHasDefaultToothChartEnabled(product)
}

export { EMPTY_PREVIEW as EMPTY_DEFAULT_TOOTH_CHART_PREVIEW }
