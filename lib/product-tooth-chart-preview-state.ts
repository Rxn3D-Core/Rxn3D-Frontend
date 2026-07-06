import type { ProductExtraction } from "@/components/case-design-center/types"
import type { ExtractionStatusOption, RetentionOptionItem } from "@/components/retention-type-popover"
import {
  isTimExtractionRow,
  type ExtractionLike,
} from "@/components/case-design-center/utils/extractionHelpers"
import {
  getChartTeethForArch,
  retentionOptionHasFullArchImages,
  type RetentionArch,
} from "@/components/case-design-center/utils/retentionChartImage"
import {
  resolveRetentionOptionChartTypeOrDefault,
  type RetentionChartType,
} from "@/components/case-design-center/utils/retentionOptionChartType"
import type { Extraction } from "@/lib/schemas"
import {
  chartStatusTeethFromExtractionDisplay,
  type ExtractionDisplayVM,
} from "@/lib/virtual-slip-extraction-display"
import type { RetentionOption } from "@/services/retention-options-api"

const REPRESENTATIVE_MAXILLARY = [8, 9, 10, 11, 7, 6, 12, 5]
const REPRESENTATIVE_MANDIBULAR = [25, 26, 27, 28, 24, 23, 29, 22]

export type ProductToothChartPreviewSvgState = {
  selectedTeeth: number[]
  missingTeeth: number[]
  willExtractTeeth: number[]
  claspTeeth: number[]
  retentionTypesByTooth: Record<number, RetentionChartType[]>
  retentionOptions: RetentionOptionItem[]
  toothExtractionMap: Record<number, string>
  extractionsByCode: Record<
    string,
    { code: string; name: string; visibility_type?: string; color?: string | null; overlay?: string }
  >
  extractionImagesByCode: Record<string, Record<number, string | null>>
}

type ProductExtractionRow = {
  extraction_id: number
  status?: string
  is_default?: "Yes" | "No"
  max_teeth?: number | null
}

export type ResolvedProductExtraction = ExtractionLike & {
  extraction_id: number
  code: string
  name: string
  color?: string | null
  visibility_type?: string
  image_url?: string | null
  sample_image_url?: string | null
  images?: Array<{ tooth_number: number; image_url: string | null }>
  is_required?: string
  is_optional?: string
  max_teeth?: number | null
  sequence?: number
}

function nonEmptyUrl(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed.length > 0 ? trimmed : null
}

function looksLikeMissing(code: string, name: string): boolean {
  const c = code.toUpperCase()
  const n = name.toLowerCase()
  return c === "MT" || n.includes("missing")
}

function looksLikeWillExtract(code: string, name: string): boolean {
  const c = code.toUpperCase()
  const n = name.toLowerCase()
  return c === "WED" || c === "WEOD" || n.includes("will extract")
}

function looksLikeClasp(name: string): boolean {
  return name.toLowerCase().includes("clasp")
}

export function catalogRetentionOptionToItem(opt: RetentionOption): RetentionOptionItem {
  const rawImages =
    (Array.isArray(opt.tooth_images) ? opt.tooth_images : null) ??
    (Array.isArray((opt as RetentionOption & { images?: typeof opt.tooth_images }).images)
      ? (opt as RetentionOption & { images?: typeof opt.tooth_images }).images
      : null)

  return {
    id: Number(opt.id),
    name: opt.name,
    image_url: opt.image_url,
    tooth_chart_type: opt.tooth_chart_type,
    has_implant: opt.has_implant,
    selector_shape: opt.selector_shape,
    status: opt.status,
    sequence: opt.sequence,
    images: rawImages
      ? rawImages.map((row) => ({
          tooth_number: Number(row.tooth_number),
          image_url: row.image_url,
        }))
      : undefined,
    global_connection:
      opt.global_connection ??
      (opt.sample_image_url ? { sample_image_url: opt.sample_image_url } : null),
  }
}

export function buildProductRetentionOptions(input: {
  retentionEnabled: boolean
  linkedRetentionOptionIds: number[]
  retentionCatalog: RetentionOption[]
}): RetentionOptionItem[] {
  if (!input.retentionEnabled) return []
  const idSet = new Set(input.linkedRetentionOptionIds.map(Number))
  return input.retentionCatalog
    .filter((opt) => idSet.has(Number(opt.id)))
    .map(catalogRetentionOptionToItem)
}

/** API id for GET /library/retention-options/{id}/tooth-images (lab rows use global id). */
export function resolveRetentionOptionToothImagesApiId(item: RetentionOptionItem): number {
  const globalId = item.global_connection?.global_retention_option_id
  if (typeof globalId === "number" && globalId > 0) return globalId
  return Number(item.id)
}

export type RetentionToothImageRow = {
  tooth_number: number
  image_url: string | null
}

export function collectRetentionToothImagesApiIds(options: RetentionOptionItem[]): number[] {
  const seen = new Set<number>()
  const ids: number[] = []
  for (const opt of options) {
    const apiId = resolveRetentionOptionToothImagesApiId(opt)
    if (apiId > 0 && !seen.has(apiId)) {
      seen.add(apiId)
      ids.push(apiId)
    }
  }
  return ids
}

export function enrichRetentionOptionsWithToothImages(
  options: RetentionOptionItem[],
  imagesByApiId: Map<number, RetentionToothImageRow[]>,
): RetentionOptionItem[] {
  return options.map((opt) => {
    const apiId = resolveRetentionOptionToothImagesApiId(opt)
    const fetched = imagesByApiId.get(apiId)
    if (!fetched?.length && !(opt.images?.length)) return opt

    const byTooth = new Map<number, { tooth_number: number; image_url: string | null }>()
    for (const row of opt.images ?? []) {
      byTooth.set(Number(row.tooth_number), {
        tooth_number: Number(row.tooth_number),
        image_url: row.image_url ?? null,
      })
    }
    for (const row of fetched ?? []) {
      const toothNumber = Number(row.tooth_number)
      const url = nonEmptyUrl(row.image_url)
      if (url) {
        byTooth.set(toothNumber, { tooth_number: toothNumber, image_url: url })
      }
    }
    if (byTooth.size === 0) return opt
    return {
      ...opt,
      images: Array.from(byTooth.values()).sort((a, b) => a.tooth_number - b.tooth_number),
    }
  })
}

/** Toggle off only when the same option id + chart type is selected again. */
export function applyProductRetentionSelection(
  prevTypes: Record<number, RetentionChartType[]>,
  prevIds: Record<number, number>,
  toothNumber: number,
  optionId: number,
  type: RetentionChartType,
): {
  types: Record<number, RetentionChartType[]>
  ids: Record<number, number>
  toggledOff: boolean
} {
  const curType = prevTypes[toothNumber]?.[0]
  const curId = prevIds[toothNumber]
  if (curType === type && Number(curId) === Number(optionId)) {
    const types = { ...prevTypes }
    const ids = { ...prevIds }
    delete types[toothNumber]
    delete ids[toothNumber]
    return { types, ids, toggledOff: true }
  }
  return {
    types: { ...prevTypes, [toothNumber]: [type] },
    ids: { ...prevIds, [toothNumber]: optionId },
    toggledOff: false,
  }
}

/**
 * Chart display map: teeth with a retention assignment do not show default/user extraction
 * (mutual exclusivity — retention image or selector shape replaces extraction base).
 */
export function buildChartToothExtractionMap(
  mergedExtractionMap: Record<number, string>,
  retentionTypesByTooth: Record<number, RetentionChartType[]>,
): Record<number, string> {
  const result = { ...mergedExtractionMap }
  for (const key of Object.keys(retentionTypesByTooth)) {
    const toothNumber = Number(key)
    if (retentionTypesByTooth[toothNumber]?.length) {
      delete result[toothNumber]
    }
  }
  return result
}

/**
 * Slip-style interactive map: user overrides win over catalog default; teeth marked TIM
 * show no extraction code (teeth-in-mouth). Matches case design center toothExtractionMap semantics.
 */
export function buildInteractiveToothExtractionMap(
  arch: RetentionArch,
  configDefaultMap: Record<number, string>,
  userOverrideMap: Record<number, string>,
  timOverrideTeeth: number[],
): Record<number, string> {
  const timSet = new Set(timOverrideTeeth)
  const result: Record<number, string> = {}

  for (const toothNumber of getChartTeethForArch(arch)) {
    if (timSet.has(toothNumber)) continue
    if (toothNumber in userOverrideMap) {
      result[toothNumber] = userOverrideMap[toothNumber]
      continue
    }
    if (toothNumber in configDefaultMap) {
      result[toothNumber] = configDefaultMap[toothNumber]
    }
  }

  return result
}

export function resolveActiveProductExtractions(
  productExtractions: ProductExtractionRow[],
  allExtractions: Extraction[],
): ResolvedProductExtraction[] {
  const resolved: ResolvedProductExtraction[] = []
  for (const row of productExtractions) {
    if (row.status === "Inactive") continue
    const catalog = allExtractions.find((ext) => Number(ext.id) === Number(row.extraction_id))
    if (!catalog) continue
    const overlayFlag = (catalog as Extraction & { is_overlay?: string }).is_overlay
    resolved.push({
      extraction_id: Number(row.extraction_id),
      code: catalog.code,
      name: catalog.name,
      color: catalog.color,
      status: row.status ?? "Active",
      is_default: row.is_default ?? "No",
      is_tim: isTimExtractionRow(catalog) ? "Yes" : "No",
      overlay:
        String(overlayFlag ?? "").trim().toLowerCase() === "yes" ||
        catalog.name.toLowerCase().includes("clasp")
          ? "Yes"
          : "No",
      is_image_extraction: catalog.is_image_extraction,
      visibility_type: catalog.is_image_extraction === "Yes" ? "Image" : "Color",
      image_url: catalog.image_url ?? null,
      sample_image_url: catalog.sample_image_url ?? null,
      images: Array.isArray(catalog.images)
        ? catalog.images.map((img) => ({
            tooth_number: Number(img.tooth_number),
            image_url: img.image_url ?? null,
          }))
        : undefined,
      max_teeth: row.max_teeth ?? null,
      sequence: catalog.sequence,
    })
  }
  return resolved.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

function resolveExtractionPopoverImageUrl(
  row: ResolvedProductExtraction,
  toothImagesByExtractionId: ProductPreviewToothImages,
  toothNumber?: number,
): string | null {
  const toothImages = toothImagesForResolvedRow(row, toothImagesByExtractionId)
  if (toothNumber !== undefined) {
    const perTooth = toothImages.find((img) => Number(img.tooth_number) === toothNumber)?.image_url
    if (nonEmptyUrl(perTooth)) return perTooth
  }
  return (
    toothImages.find((img) => nonEmptyUrl(img.image_url))?.image_url ??
    nonEmptyUrl(row.image_url) ??
    nonEmptyUrl(row.sample_image_url)
  )
}

/** API id for GET /library/extractions/{id}/tooth-images (lab rows use global id). */
export function resolveExtractionToothImagesApiId(
  extractionId: number,
  allExtractions: Extraction[],
): number {
  const catalog = allExtractions.find((ext) => Number(ext.id) === Number(extractionId))
  const globalId = catalog?.global_extraction_id
  if (typeof globalId === "number" && globalId > 0) return globalId
  return extractionId
}

export function collectExtractionToothImagesApiIds(
  resolvedExtractions: ResolvedProductExtraction[],
  allExtractions: Extraction[],
): number[] {
  const seen = new Set<number>()
  const ids: number[] = []
  for (const row of resolvedExtractions) {
    const apiId = resolveExtractionToothImagesApiId(row.extraction_id, allExtractions)
    if (apiId > 0 && !seen.has(apiId)) {
      seen.add(apiId)
      ids.push(apiId)
    }
  }
  return ids
}

export function mergeExtractionToothImages(
  base: ProductPreviewToothImages,
  imagesByApiId: Map<number, RetentionToothImageRow[]>,
  resolvedExtractions: ResolvedProductExtraction[],
  allExtractions: Extraction[],
): ProductPreviewToothImages {
  const apiIdToExtractionIds = new Map<number, number[]>()
  for (const row of resolvedExtractions) {
    const apiId = resolveExtractionToothImagesApiId(row.extraction_id, allExtractions)
    const list = apiIdToExtractionIds.get(apiId) ?? []
    list.push(row.extraction_id)
    apiIdToExtractionIds.set(apiId, list)
  }

  const result: ProductPreviewToothImages = { ...base }
  for (const [apiId, rows] of imagesByApiId) {
    const extractionIds = apiIdToExtractionIds.get(apiId) ?? []
    for (const extractionId of extractionIds) {
      const byTooth = new Map<number, { tooth_number: number; image_url: string | null }>()
      for (const existing of result[extractionId] ?? []) {
        byTooth.set(Number(existing.tooth_number), existing)
      }
      for (const row of rows) {
        const toothNumber = Number(row.tooth_number)
        const url = nonEmptyUrl(row.image_url)
        if (url) {
          byTooth.set(toothNumber, { tooth_number: toothNumber, image_url: url })
        }
      }
      if (byTooth.size > 0) {
        result[extractionId] = Array.from(byTooth.values()).sort(
          (a, b) => a.tooth_number - b.tooth_number,
        )
      }
    }
  }
  return result
}

/** Full code → tooth image map for chart rendering (includes image_url fallbacks on all teeth). */
export function buildProductExtractionImagesByCode(
  resolvedExtractions: ResolvedProductExtraction[],
  toothImagesByExtractionId: ProductPreviewToothImages = {},
): Record<string, Record<number, string | null>> {
  const extractionImagesByCode: Record<string, Record<number, string | null>> = {}

  for (const row of resolvedExtractions) {
    if (!row.code) continue
    const code = row.code
    const toothImages = toothImagesForResolvedRow(row, toothImagesByExtractionId)

    for (const img of toothImages) {
      const url = nonEmptyUrl(img.image_url)
      if (!url) continue
      extractionImagesByCode[code] = {
        ...(extractionImagesByCode[code] ?? {}),
        [Number(img.tooth_number)]: url,
      }
    }

    const fallback = nonEmptyUrl(row.image_url) ?? nonEmptyUrl(row.sample_image_url)
    if (fallback) {
      for (let toothNumber = 1; toothNumber <= 32; toothNumber += 1) {
        if (extractionImagesByCode[code]?.[toothNumber]) continue
        extractionImagesByCode[code] = {
          ...(extractionImagesByCode[code] ?? {}),
          [toothNumber]: fallback,
        }
      }
    }
  }

  return extractionImagesByCode
}

function mapResolvedExtractionsToPopoverOptions(
  resolvedExtractions: ResolvedProductExtraction[],
  toothImagesByExtractionId: ProductPreviewToothImages,
  toothNumber?: number,
): ExtractionStatusOption[] {
  return resolvedExtractions
    .filter((row) => !!row.code && !!row.name)
    .filter((row) => !isTimExtractionRow(row))
    .map((row) => ({
      code: row.code!,
      name: row.name!,
      imageUrl: resolveExtractionPopoverImageUrl(row, toothImagesByExtractionId, toothNumber),
    }))
}

export function buildProductExtractionPopoverOptions(
  resolvedExtractions: ResolvedProductExtraction[],
  toothImagesByExtractionId: ProductPreviewToothImages = {},
): ExtractionStatusOption[] | undefined {
  const options = mapResolvedExtractionsToPopoverOptions(
    resolvedExtractions,
    toothImagesByExtractionId,
  )
  return options.length > 0 ? options : undefined
}

export function buildProductExtractionPopoverOptionsForTooth(
  resolvedExtractions: ResolvedProductExtraction[],
  toothImagesByExtractionId: ProductPreviewToothImages,
  toothNumber: number,
): ExtractionStatusOption[] | undefined {
  const options = mapResolvedExtractionsToPopoverOptions(
    resolvedExtractions,
    toothImagesByExtractionId,
    toothNumber,
  )
  return options.length > 0 ? options : undefined
}

function imageUrlForCatalogTooth(
  row: ProductExtraction | undefined,
  toothNumber: number,
): string | null {
  if (!row) return null
  const fromImages = row.images?.find((img) => img.tooth_number === toothNumber)?.image_url
  return nonEmptyUrl(fromImages) ?? nonEmptyUrl(row.image_url) ?? nonEmptyUrl(row.sample_image_url)
}

function toothImagesForResolvedRow(
  row: ResolvedProductExtraction,
  toothImagesByExtractionId: ProductPreviewToothImages,
): Array<{ tooth_number: number; image_url: string | null }> {
  if (row.images?.length) return row.images
  return toothImagesByExtractionId[row.extraction_id] ?? []
}

export function buildProductPreviewToothImages(
  resolvedExtractions: ResolvedProductExtraction[],
): ProductPreviewToothImages {
  const result: ProductPreviewToothImages = {}
  for (const row of resolvedExtractions) {
    if (row.images?.length) {
      result[row.extraction_id] = row.images
    }
  }
  return result
}

export function buildProductExtractionCatalog(
  resolvedExtractions: ResolvedProductExtraction[],
  toothImagesByExtractionId: ProductPreviewToothImages = {},
): ProductExtraction[] {
  return resolvedExtractions.map((row) => ({
    id: row.extraction_id,
    extraction_id: row.extraction_id,
    name: row.name,
    code: row.code,
    color: row.color ?? null,
    url: null,
    is_default: row.is_default ?? "No",
    is_required: row.is_required ?? "No",
    is_optional: row.is_optional ?? "No",
    min_teeth: null,
    max_teeth: row.max_teeth ?? null,
    is_image_extraction: row.is_image_extraction ?? "No",
    image_url: row.image_url ?? null,
    is_tim: row.is_tim,
    overlay: row.overlay ?? "No",
    images: toothImagesForResolvedRow(row, toothImagesByExtractionId).map((img) => ({
      tooth_number: img.tooth_number,
      image_url: img.image_url,
    })),
    visibility_type: (row.visibility_type ?? "Color") as ProductExtraction["visibility_type"],
    sequence: row.sequence ?? 0,
    status: row.status ?? "Active",
    price: null,
  }))
}

/** Product row marked default, else TIM, else first active extraction. */
function resolveDefaultCatalogRow(catalog: ProductExtraction[]): ProductExtraction | undefined {
  const active = catalog.filter(
    (row) => String(row.status ?? "Active").trim().toLowerCase() !== "inactive",
  )
  const explicitDefault = active.find(
    (row) => String(row.is_default ?? "").trim().toLowerCase() === "yes",
  )
  if (explicitDefault) return explicitDefault
  return active.find((row) => isTimExtractionRow(row)) ?? active[0]
}

/** Baseline chart: default extraction images on every arch tooth (from product Def column). */
function buildCatalogDefaultExtractionDisplayForArch(
  arch: RetentionArch,
  catalog: ProductExtraction[],
): ExtractionDisplayVM {
  if (catalog.length === 0) {
    return {
      toothExtractionMap: {},
      claspTeeth: [],
      extractionsByCode: {},
      extractionImagesByCode: {},
    }
  }

  const extractionsByCode: ExtractionDisplayVM["extractionsByCode"] = {}
  const extractionImagesByCode: ExtractionDisplayVM["extractionImagesByCode"] = {}

  for (const row of catalog) {
    if (String(row.status ?? "Active").trim().toLowerCase() === "inactive") continue
    const hasImageCatalog =
      (row.images?.length ?? 0) > 0 ||
      nonEmptyUrl(row.image_url) != null ||
      nonEmptyUrl(row.sample_image_url) != null
    const visibilityType =
      row.visibility_type ??
      (hasImageCatalog || isTimExtractionRow(row) ? "Image" : "Color")
    extractionsByCode[row.code] = {
      code: row.code,
      name: row.name,
      visibility_type: visibilityType,
      color: row.color ?? null,
      overlay: row.overlay,
    }
    if (row.images?.length) {
      extractionImagesByCode[row.code] = {
        ...(extractionImagesByCode[row.code] ?? {}),
        ...Object.fromEntries(row.images.map((img) => [img.tooth_number, img.image_url])),
      }
    }
  }

  const defaultRow = resolveDefaultCatalogRow(catalog)
  const archTeeth = getChartTeethForArch(arch)
  const toothExtractionMap: Record<number, string> = {}

  if (defaultRow?.code) {
    for (const toothNumber of archTeeth) {
      const url = imageUrlForCatalogTooth(defaultRow, toothNumber)
      if (url) {
        toothExtractionMap[toothNumber] = defaultRow.code
        extractionImagesByCode[defaultRow.code] = {
          ...(extractionImagesByCode[defaultRow.code] ?? {}),
          [toothNumber]: url,
        }
      } else if (defaultRow.visibility_type === "Color" || defaultRow.color) {
        toothExtractionMap[toothNumber] = defaultRow.code
      }
    }
  }

  return {
    toothExtractionMap,
    claspTeeth: [],
    extractionsByCode,
    extractionImagesByCode,
  }
}

function extractionDisplayToArchPreview(display: ExtractionDisplayVM): Pick<
  ProductArchConfigPreview,
  | "toothExtractionMap"
  | "claspTeeth"
  | "missingTeeth"
  | "willExtractTeeth"
  | "extractionsByCode"
  | "extractionImagesByCode"
> {
  const chartStatus = chartStatusTeethFromExtractionDisplay(display)
  return {
    toothExtractionMap: display.toothExtractionMap,
    claspTeeth: display.claspTeeth,
    missingTeeth: chartStatus.missingTeeth,
    willExtractTeeth: chartStatus.willExtractTeeth,
    extractionsByCode: display.extractionsByCode,
    extractionImagesByCode: display.extractionImagesByCode,
  }
}

/** @deprecated Use buildProductConfigChartPreview extractionsByCode instead. */
export function buildProductExtractionCatalogMeta(
  resolvedExtractions: ResolvedProductExtraction[],
  toothImagesByExtractionId: ProductPreviewToothImages = {},
): {
  extractionsByCode: ProductToothChartPreviewSvgState["extractionsByCode"]
  extractionImagesByCode: ProductToothChartPreviewSvgState["extractionImagesByCode"]
} {
  const catalog = buildProductExtractionCatalog(resolvedExtractions, toothImagesByExtractionId)
  const maxillary = buildCatalogDefaultExtractionDisplayForArch("maxillary", catalog)
  const mandibular = buildCatalogDefaultExtractionDisplayForArch("mandibular", catalog)
  return {
    extractionsByCode: { ...maxillary.extractionsByCode, ...mandibular.extractionsByCode },
    extractionImagesByCode: mergeExtractionImagesByCode(
      maxillary.extractionImagesByCode,
      mandibular.extractionImagesByCode,
    ),
  }
}

function mergeExtractionImagesByCode(
  maxillary: ExtractionDisplayVM["extractionImagesByCode"],
  mandibular: ExtractionDisplayVM["extractionImagesByCode"],
): ExtractionDisplayVM["extractionImagesByCode"] {
  const merged = { ...maxillary }
  for (const [code, byTooth] of Object.entries(mandibular)) {
    merged[code] = { ...(merged[code] ?? {}), ...byTooth }
  }
  return merged
}

export type ProductPreviewToothImages = Record<
  number,
  Array<{ tooth_number: number; image_url: string | null }>
>

export type ProductArchConfigPreview = {
  retentionTypesByTooth: Record<number, RetentionChartType[]>
  retentionOptionIdByTooth: Record<number, number>
  toothExtractionMap: Record<number, string>
  claspTeeth: number[]
  missingTeeth: number[]
  willExtractTeeth: number[]
  extractionsByCode: ProductToothChartPreviewSvgState["extractionsByCode"]
  extractionImagesByCode: ProductToothChartPreviewSvgState["extractionImagesByCode"]
}

export type ProductConfigChartPreview = {
  maxillary: ProductArchConfigPreview
  mandibular: ProductArchConfigPreview
}

const EMPTY_ARCH_PREVIEW: ProductArchConfigPreview = {
  retentionTypesByTooth: {},
  retentionOptionIdByTooth: {},
  toothExtractionMap: {},
  claspTeeth: [],
  missingTeeth: [],
  willExtractTeeth: [],
  extractionsByCode: {},
  extractionImagesByCode: {},
}

/** Live chart overlays driven by retention/extraction panel selections (no tooth clicks). */
export function buildProductConfigChartPreview(input: {
  retentionEnabled: boolean
  extractionsEnabled: boolean
  linkedRetentionOptionIds: number[]
  retentionCatalog: RetentionOption[]
  productExtractions: ProductExtractionRow[]
  allExtractions: Extraction[]
  toothImagesByExtractionId?: ProductPreviewToothImages
}): ProductConfigChartPreview {
  const maxillary: ProductArchConfigPreview = { ...EMPTY_ARCH_PREVIEW }
  const mandibular: ProductArchConfigPreview = { ...EMPTY_ARCH_PREVIEW }

  if (input.retentionEnabled) {
    const linkedItems = buildProductRetentionOptions({
      retentionEnabled: true,
      linkedRetentionOptionIds: input.linkedRetentionOptionIds,
      retentionCatalog: input.retentionCatalog,
    })
    const maxillaryRetention = assignRetentionPreviewForArch("maxillary", linkedItems)
    const mandibularRetention = assignRetentionPreviewForArch("mandibular", linkedItems)
    maxillary.retentionTypesByTooth = maxillaryRetention.retentionTypesByTooth
    maxillary.retentionOptionIdByTooth = maxillaryRetention.retentionOptionIdByTooth
    mandibular.retentionTypesByTooth = mandibularRetention.retentionTypesByTooth
    mandibular.retentionOptionIdByTooth = mandibularRetention.retentionOptionIdByTooth
  }

  if (input.extractionsEnabled) {
    const resolved = resolveActiveProductExtractions(input.productExtractions, input.allExtractions)
    const catalog = buildProductExtractionCatalog(
      resolved,
      input.toothImagesByExtractionId ?? {},
    )
    const maxillaryExtraction = extractionDisplayToArchPreview(
      buildCatalogDefaultExtractionDisplayForArch("maxillary", catalog),
    )
    const mandibularExtraction = extractionDisplayToArchPreview(
      buildCatalogDefaultExtractionDisplayForArch("mandibular", catalog),
    )
    Object.assign(maxillary, maxillaryExtraction)
    Object.assign(mandibular, mandibularExtraction)
  }

  return { maxillary, mandibular }
}

function assignRetentionPreviewForArch(
  arch: RetentionArch,
  linkedItems: RetentionOptionItem[],
): {
  retentionTypesByTooth: Record<number, RetentionChartType[]>
  retentionOptionIdByTooth: Record<number, number>
} {
  const retentionTypesByTooth: Record<number, RetentionChartType[]> = {}
  const retentionOptionIdByTooth: Record<number, number> = {}
  const archTeeth = getChartTeethForArch(arch)
  const representatives = arch === "maxillary" ? REPRESENTATIVE_MAXILLARY : REPRESENTATIVE_MANDIBULAR
  let repIndex = 0

  for (const item of linkedItems) {
    const chartType = resolveRetentionOptionChartTypeOrDefault(item)
    if (retentionOptionHasFullArchImages(item, arch)) {
      for (const toothNumber of archTeeth) {
        retentionTypesByTooth[toothNumber] = [chartType]
        retentionOptionIdByTooth[toothNumber] = item.id
      }
      continue
    }

    const toothNumber = representatives[repIndex % representatives.length]
    repIndex += 1
    retentionTypesByTooth[toothNumber] = [chartType]
    retentionOptionIdByTooth[toothNumber] = item.id
  }

  return { retentionTypesByTooth, retentionOptionIdByTooth }
}

function applyDefaultExtractionPreview(
  state: ProductToothChartPreviewSvgState,
  extraction: Extraction,
) {
  const code = extraction.code
  const name = extraction.name
  const visibilityType = extraction.is_image_extraction === "Yes" ? "Image" : "Color"
  const imageUrl = nonEmptyUrl(extraction.image_url) ?? nonEmptyUrl(extraction.sample_image_url)

  state.extractionsByCode[code] = {
    code,
    name,
    visibility_type: visibilityType,
    color: extraction.color,
  }

  if (imageUrl) {
    const byTooth: Record<number, string | null> = {}
    for (let tooth = 1; tooth <= 32; tooth += 1) {
      byTooth[tooth] = imageUrl
    }
    state.extractionImagesByCode[code] = byTooth
    return
  }

  const sampleTeeth = [8, 9, 25, 26]
  if (looksLikeMissing(code, name)) {
    state.missingTeeth.push(...sampleTeeth)
    return
  }
  if (looksLikeWillExtract(code, name)) {
    state.willExtractTeeth.push(...sampleTeeth)
    return
  }
  if (looksLikeClasp(name)) {
    state.claspTeeth.push(...sampleTeeth)
    return
  }

  for (const toothNumber of sampleTeeth) {
    state.toothExtractionMap[toothNumber] = code
  }
}

export function buildProductToothChartPreviewSvgState(input: {
  retentionEnabled: boolean
  extractionsEnabled: boolean
  linkedRetentionOptionIds: number[]
  retentionCatalog: RetentionOption[]
  productExtractions: ProductExtractionRow[]
  allExtractions: Extraction[]
}): ProductToothChartPreviewSvgState {
  const state: ProductToothChartPreviewSvgState = {
    selectedTeeth: [],
    missingTeeth: [],
    willExtractTeeth: [],
    claspTeeth: [],
    retentionTypesByTooth: {},
    retentionOptions: [],
    toothExtractionMap: {},
    extractionsByCode: {},
    extractionImagesByCode: {},
  }

  if (input.retentionEnabled) {
    const idSet = new Set(input.linkedRetentionOptionIds.map(Number))
    const linkedItems = input.retentionCatalog
      .filter((opt) => idSet.has(Number(opt.id)))
      .map(catalogRetentionOptionToItem)
    state.retentionOptions = linkedItems
    const maxillaryRetention = assignRetentionPreviewForArch("maxillary", linkedItems)
    const mandibularRetention = assignRetentionPreviewForArch("mandibular", linkedItems)
    Object.assign(state.retentionTypesByTooth, maxillaryRetention.retentionTypesByTooth)
    Object.assign(state.retentionTypesByTooth, mandibularRetention.retentionTypesByTooth)
  }

  if (input.extractionsEnabled) {
    const activeDefault = input.productExtractions.find(
      (row) => row.status === "Active" && row.is_default === "Yes",
    )
    if (activeDefault) {
      const extraction =
        input.allExtractions.find((ext) => Number(ext.id) === Number(activeDefault.extraction_id)) ??
        null
      if (extraction) {
        applyDefaultExtractionPreview(state, extraction)
      }
    }
  }

  state.missingTeeth = [...new Set(state.missingTeeth)].sort((a, b) => a - b)
  state.willExtractTeeth = [...new Set(state.willExtractTeeth)].sort((a, b) => a - b)
  state.claspTeeth = [...new Set(state.claspTeeth)].sort((a, b) => a - b)

  return state
}
