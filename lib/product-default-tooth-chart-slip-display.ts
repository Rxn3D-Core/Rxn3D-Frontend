import type { ProductExtraction } from "@/components/case-design-center/types"
import { isTimExtractionRow } from "@/components/case-design-center/utils/extractionHelpers"
import type { RetentionChartType } from "@/components/case-design-center/utils/retentionOptionChartType"
import { getChartTeethForArch } from "@/components/case-design-center/utils/retentionChartImage"
import {
  hydrateDefaultToothChartFromProduct,
  parseDefaultToothChartToPreviewState,
  productHasDefaultToothChartEnabled,
} from "@/lib/product-default-tooth-chart"
import {
  buildChartToothExtractionMap,
  type ResolvedProductExtraction,
} from "@/lib/product-tooth-chart-preview-state"

export { productHasDefaultToothChartEnabled }

export type ProductArchScope = "maxillary" | "mandibular" | "both"

/** Maps library product `type` (Upper / Lower / Both) to which CDC arch(es) may show its default chart. */
export function resolveProductArchScope(
  product: Record<string, unknown> | null | undefined,
): ProductArchScope | null {
  const raw = String(
    product?.type ??
      (product?.subcategory as { type?: string } | undefined)?.type ??
      (product?.subcategory as { category?: { type?: string } } | undefined)?.category?.type ??
      "",
  )
    .trim()
    .toLowerCase()

  if (!raw) return null
  if (raw === "both" || (raw.includes("maxillary") && raw.includes("mandibular"))) {
    return "both"
  }
  if (raw === "upper" || raw === "maxillary") return "maxillary"
  if (raw === "lower" || raw === "mandibular") return "mandibular"
  return null
}

export function productDefaultToothChartAppliesToArch(
  product: Record<string, unknown> | null | undefined,
  arch: "maxillary" | "mandibular",
  slipInitialArch?: "maxillary" | "mandibular" | "both",
): boolean {
  const scope = resolveProductArchScope(product)
  if (scope === "both") return true
  if (scope === "maxillary") return arch === "maxillary"
  if (scope === "mandibular") return arch === "mandibular"
  if (slipInitialArch === "both") return true
  if (slipInitialArch) return slipInitialArch === arch
  return false
}

/** Own-arch product for default chart SVG overlay (not opposing-extraction mirror data). */
export function resolveSlipDefaultChartProduct(input: {
  arch: "maxillary" | "mandibular"
  activeProduct?: Record<string, unknown> | null
  card0InitialProduct?: Record<string, unknown> | null
  slipInitialArch?: "maxillary" | "mandibular" | "both"
  /** Opposite-arch mirror accordion — never show product default chart there. */
  isOpposingMirrorPanel?: boolean
}): Record<string, unknown> | null {
  if (input.isOpposingMirrorPanel) return null

  const candidate = input.activeProduct ?? input.card0InitialProduct
  if (!candidate || !productHasDefaultToothChartEnabled(candidate)) return null

  if (
    !productDefaultToothChartAppliesToArch(
      candidate,
      input.arch,
      input.activeProduct ? undefined : input.slipInitialArch,
    )
  ) {
    return null
  }

  return candidate
}

export type SlipSvgToothChartDisplay = {
  toothExtractionMap: Record<number, string>
  claspTeeth: number[]
  retentionTypesByTooth: Record<number, RetentionChartType[]>
}

function cdcProductExtractionsToResolved(
  extractions: ProductExtraction[] | undefined,
): ResolvedProductExtraction[] {
  return (extractions ?? [])
    .filter((row) => row.status === "Active")
    .map((row) => ({
      extraction_id: Number(row.extraction_id ?? row.id),
      code: row.code,
      name: row.name,
      color: row.color,
      status: row.status ?? "Active",
      is_default: row.is_default ?? "No",
      is_tim: isTimExtractionRow(row) ? ("Yes" as const) : ("No" as const),
      overlay:
        String(row.overlay ?? "").trim().toLowerCase() === "yes" ||
        row.name.toLowerCase().includes("clasp")
          ? ("Yes" as const)
          : ("No" as const),
      is_image_extraction: row.is_image_extraction,
      visibility_type: row.visibility_type,
      image_url: row.image_url ?? null,
      sample_image_url: null,
      images: Array.isArray(row.images)
        ? row.images.map((img) => ({
            tooth_number: Number(img.tooth_number),
            image_url: img.image_url ?? null,
          }))
        : undefined,
      max_teeth: row.max_teeth ?? null,
      sequence: row.sequence,
    }))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

function catalogDefaultExtractionId(resolved: ResolvedProductExtraction[]): number | null {
  const def = resolved.find((row) => row.is_default === "Yes")
  return def ? Number(def.extraction_id) : null
}

function parsedDefaultForArch(
  product: Record<string, unknown>,
  arch: "maxillary" | "mandibular",
  resolved: ResolvedProductExtraction[],
) {
  const fallbackId = catalogDefaultExtractionId(resolved)
  const entries = hydrateDefaultToothChartFromProduct(product, fallbackId)
  const parsed = parseDefaultToothChartToPreviewState(entries, resolved)
  return arch === "maxillary"
    ? {
        extractionMap: parsed.maxillaryToothExtractionMap,
        claspTeeth: parsed.maxillaryClaspTeeth,
        retentionTypesByTooth: parsed.maxillaryRetention.typesByTooth,
      }
    : {
        extractionMap: parsed.mandibularToothExtractionMap,
        claspTeeth: parsed.mandibularClaspTeeth,
        retentionTypesByTooth: parsed.mandibularRetention.typesByTooth,
      }
}

/**
 * Display-only tooth chart for slip creation (Case Design Center) SVGs.
 * User/state maps win; product default chart fills unassigned teeth.
 * Does not mutate slip selection or status-box state.
 */
export function mergeProductDefaultToothChartForSlipSvgDisplay(input: {
  product: Record<string, unknown> | null | undefined
  arch: "maxillary" | "mandibular"
  userToothExtractionMap: Record<number, string>
  userClaspTeeth: number[]
  userRetentionTypesByTooth: Record<number, string[] | RetentionChartType[]>
}): SlipSvgToothChartDisplay {
  const {
    product,
    arch,
    userToothExtractionMap,
    userClaspTeeth,
    userRetentionTypesByTooth,
  } = input

  const userRetention = userRetentionTypesByTooth as Record<number, RetentionChartType[]>

  if (!product || !productHasDefaultToothChartEnabled(product)) {
    return {
      toothExtractionMap: userToothExtractionMap,
      claspTeeth: userClaspTeeth,
      retentionTypesByTooth: userRetention,
    }
  }

  const resolved = cdcProductExtractionsToResolved(
    (product as { extractions?: ProductExtraction[] }).extractions,
  )
  const defaults = parsedDefaultForArch(product, arch, resolved)
  const archTeeth = getChartTeethForArch(arch)

  const displayExtractionMap: Record<number, string> = { ...defaults.extractionMap }
  const displayClasp = [...defaults.claspTeeth]
  const displayRetention: Record<number, RetentionChartType[]> = {
    ...defaults.retentionTypesByTooth,
  }

  for (const tooth of archTeeth) {
    const userRet = userRetention[tooth]
    if (userRet?.length) {
      displayRetention[tooth] = userRet
      delete displayExtractionMap[tooth]
      const claspIdx = displayClasp.indexOf(tooth)
      if (claspIdx >= 0) displayClasp.splice(claspIdx, 1)
      continue
    }

    if (Object.prototype.hasOwnProperty.call(userToothExtractionMap, tooth)) {
      displayExtractionMap[tooth] = userToothExtractionMap[tooth]
      delete displayRetention[tooth]
      continue
    }

    if (userClaspTeeth.includes(tooth)) {
      if (!displayClasp.includes(tooth)) displayClasp.push(tooth)
      delete displayExtractionMap[tooth]
      delete displayRetention[tooth]
    }
  }

  return {
    toothExtractionMap: buildChartToothExtractionMap(displayExtractionMap, displayRetention),
    claspTeeth: displayClasp,
    retentionTypesByTooth: displayRetention,
  }
}

/** Slip state seeded from product `default_tooth_chart` for one arch (card 0). */
export type DefaultToothChartSlipAssignment = {
  retentionTypesByTooth: Record<number, RetentionChartType[]>
  toothExtractionMap: Record<number, string>
  claspTeeth: number[]
  /** Teeth to bind to the initial product on slip creation. */
  productTeeth: number[]
}

/**
 * Teeth configured on the product default chart for slip card 0 — retention,
 * extraction status, clasps, and explicit teeth-in-mouth rows.
 */
export function resolveDefaultToothChartSlipAssignmentForArch(
  product: Record<string, unknown> | null | undefined,
  arch: "maxillary" | "mandibular",
  slipInitialArch?: "maxillary" | "mandibular" | "both",
): DefaultToothChartSlipAssignment | null {
  if (!product || !productHasDefaultToothChartEnabled(product)) return null
  if (!productDefaultToothChartAppliesToArch(product, arch, slipInitialArch)) return null

  const resolved = cdcProductExtractionsToResolved(
    (product as { extractions?: ProductExtraction[] }).extractions,
  )
  const fallbackId = catalogDefaultExtractionId(resolved)
  const entries = hydrateDefaultToothChartFromProduct(product, fallbackId)
  const parsed = parseDefaultToothChartToPreviewState(entries, resolved)

  const extractionMap =
    arch === "maxillary"
      ? parsed.maxillaryToothExtractionMap
      : parsed.mandibularToothExtractionMap
  const claspTeeth =
    arch === "maxillary" ? parsed.maxillaryClaspTeeth : parsed.mandibularClaspTeeth
  const retentionTypesByTooth =
    arch === "maxillary"
      ? parsed.maxillaryRetention.typesByTooth
      : parsed.mandibularRetention.typesByTooth
  const timTeeth =
    arch === "maxillary"
      ? parsed.maxillaryTimOverrideTeeth
      : parsed.mandibularTimOverrideTeeth

  const archTeeth = getChartTeethForArch(arch)
  const productTeethSet = new Set<number>()
  for (const tooth of archTeeth) {
    if (retentionTypesByTooth[tooth]?.length) productTeethSet.add(tooth)
    if (Object.prototype.hasOwnProperty.call(extractionMap, tooth)) {
      productTeethSet.add(tooth)
    }
    if (claspTeeth.includes(tooth)) productTeethSet.add(tooth)
    if (timTeeth.includes(tooth)) productTeethSet.add(tooth)
  }

  return {
    retentionTypesByTooth,
    toothExtractionMap: extractionMap,
    claspTeeth,
    productTeeth: [...productTeethSet].sort((a, b) => a - b),
  }
}
