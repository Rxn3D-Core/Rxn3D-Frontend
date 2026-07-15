import type { ProductCreateForm } from "@/lib/schemas"
import { MAX_PRODUCT_VARIATIONS } from "@/lib/product-limits"

/** API `teeth_pricing_strategy` values (library_products). */
export type TeethPricingStrategyApi = "same_per_tooth" | "first_tooth_more" | "custom_per_count"

/** Form `teeth_pricing_type` values (UI). */
export type TeethPricingTypeForm = "same_price" | "first_tooth_more" | "custom"

const API_TO_FORM: Record<string, TeethPricingTypeForm> = {
  same_per_tooth: "same_price",
  first_tooth_more: "first_tooth_more",
  custom_per_count: "custom",
}

const FORM_TO_API: Record<TeethPricingTypeForm, TeethPricingStrategyApi> = {
  same_price: "same_per_tooth",
  first_tooth_more: "first_tooth_more",
  custom: "custom_per_count",
}

export function teethStrategyApiToForm(api: string | null | undefined): TeethPricingTypeForm {
  if (!api) return "same_price"
  return API_TO_FORM[api] ?? "same_price"
}

export function teethStrategyFormToApi(form: TeethPricingTypeForm | undefined): TeethPricingStrategyApi {
  if (!form) return "same_per_tooth"
  return FORM_TO_API[form] ?? "same_per_tooth"
}

/** Preview state for jaw photo slots (existing https/data URLs or null). */
export type JawPhotosFormState = {
  upper: string | null
  lower: string | null
  both: string | null
}

function pickJawPhotoUrl(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

/**
 * Normalize `jaw_photos` from library product API/detail payloads for form preview.
 * Handles a few alternate nestings/keys so edit modals show images after load or refetch.
 */
export function jawPhotosStateFromProduct(product: unknown): JawPhotosFormState {
  if (!product || typeof product !== "object") {
    return { upper: null, lower: null, both: null }
  }
  const p = product as Record<string, unknown>
  const nested = p.library_product
  const raw =
    (p.jaw_photos as Record<string, unknown> | undefined) ??
    (p.jawPhotos as Record<string, unknown> | undefined) ??
    (nested && typeof nested === "object"
      ? ((nested as Record<string, unknown>).jaw_photos as Record<string, unknown> | undefined)
      : undefined)
  if (!raw || typeof raw !== "object") {
    return { upper: null, lower: null, both: null }
  }
  return {
    upper: pickJawPhotoUrl(raw.upper ?? raw.Upper ?? raw.maxillary),
    lower: pickJawPhotoUrl(raw.lower ?? raw.Lower ?? raw.mandibular),
    both: pickJawPhotoUrl(raw.both ?? raw.Both),
  }
}

export function productHasAnyJawPhotoUrls(product: unknown): boolean {
  const j = jawPhotosStateFromProduct(product)
  return !!(j.upper || j.lower || j.both)
}

export type TeethPriceTierPayload = {
  min_teeth: number
  max_teeth?: number | null
  total_price: number
  sort_order: number
}

export function teethTiersFromCustomPrices(
  customPrices: (string | number | undefined)[] | undefined,
): TeethPriceTierPayload[] {
  if (!Array.isArray(customPrices)) return []
  const tiers: TeethPriceTierPayload[] = []
  customPrices.forEach((raw, index) => {
    if (raw === undefined || raw === null || String(raw).trim() === "") return
    const total_price = typeof raw === "number" ? raw : parseFloat(String(raw))
    if (isNaN(total_price)) return
    const n = index + 1
    tiers.push({
      min_teeth: n,
      max_teeth: n,
      total_price,
      sort_order: index,
    })
  })
  return tiers
}

export function teethCustomPricesFromTiers(
  tiers: Array<{ min_teeth?: number; total_price?: number; sort_order?: number }> | undefined,
): string[] {
  if (!Array.isArray(tiers) || tiers.length === 0) return []
  const sorted = [...tiers].sort(
    (a, b) => (a.sort_order ?? a.min_teeth ?? 0) - (b.sort_order ?? b.min_teeth ?? 0),
  )
  const maxMin = Math.max(...sorted.map((t) => t.min_teeth ?? 0), 0)
  const len = Math.min(16, Math.max(maxMin, 1))
  const arr: string[] = Array.from({ length: len }, () => "")
  sorted.forEach((t) => {
    const i = (t.min_teeth ?? 1) - 1
    if (i >= 0 && i < 16) {
      arr[i] = t.total_price !== undefined && t.total_price !== null ? String(t.total_price) : ""
    }
  })
  while (arr.length > 1 && arr[arr.length - 1] === "") arr.pop()
  return arr
}

export function applyLabTeethPricingToGrades(
  grades: any[] | undefined,
  form: ProductCreateForm,
): any[] | undefined {
  if (!Array.isArray(grades) || grades.length === 0) return grades
  if (form.is_teeth_based_price !== "Yes") return grades

  const strat = teethStrategyFormToApi(form.teeth_pricing_type as TeethPricingTypeForm | undefined)

  return grades.map((g) => {
    const isDef = g.is_default === "Yes"
    if (!isDef) {
      const m = g.markup_percent
      if (m === undefined || m === null || m === "") return { ...g, markup_percent: null }
      const num = typeof m === "number" ? m : parseFloat(String(m))
      return { ...g, markup_percent: isNaN(num) ? null : num }
    }

    let next = { ...g }
    if (strat === "same_per_tooth") {
      const raw = form.teeth_price_per_tooth
      if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
        const p = typeof raw === "number" ? raw : parseFloat(String(raw))
        if (!isNaN(p) && p >= 0) {
          next.price = String(p)
        }
      }
    } else if (strat === "first_tooth_more") {
      const f = form.teeth_first_tooth_price
      const a = form.teeth_additional_tooth_price
      if (f !== undefined && f !== null && String(f).trim() !== "") {
        const fn = typeof f === "number" ? f : parseFloat(String(f))
        if (!isNaN(fn)) next.first_tooth_price = fn
      }
      if (a !== undefined && a !== null && String(a).trim() !== "") {
        const an = typeof a === "number" ? a : parseFloat(String(a))
        if (!isNaN(an)) next.additional_tooth_price = an
      }
    } else if (strat === "custom_per_count") {
      const tiers = teethTiersFromCustomPrices(form.teeth_custom_prices)
      if (tiers.length > 0) {
        next.teeth_price_tiers = tiers
      }
    }
    return next
  })
}

export type ToothCountVariationForm = NonNullable<ProductCreateForm["tooth_count_variations"]>[number]

/** Resolve variation image URL from API row (several backends use different keys or put URL in `image`). */
export function variationImageUrlFromApiRow(v: Record<string, unknown> | undefined): string | undefined {
  if (!v || typeof v !== "object") return undefined
  const candidates = [v.image_url, v.image, v.photo_url, v.thumbnail_url, v.variation_image_url]
  for (const c of candidates) {
    if (c == null) continue
    const s = String(c).trim()
    if (s !== "") return s
  }
  return undefined
}

export function buildVariationsApiPayload(
  form: ProductCreateForm,
  variationSectionEnabled: boolean,
): { has_variation: "Yes" | "No"; variations: any[] } {
  const teethOn = form.is_teeth_based_price === "Yes"
  if (!teethOn || !variationSectionEnabled) {
    return { has_variation: "No", variations: [] }
  }

  const rows = form.tooth_count_variations || []
  if (rows.length === 0) {
    return { has_variation: "No", variations: [] }
  }

  const variations = rows.map((row, index) => {
    const v: Record<string, unknown> = {
      sort_order: index,
      teeth_spec: (row.tooth_count ?? "").trim(),
      name_template: (row.name_template ?? "").trim(),
    }
    if (row.id != null) {
      v.id = row.id
    }
    const img = row.image
    if (typeof img === "string" && img.startsWith("data:image/")) {
      v.image = img
    } else {
      const existingUrl = (s: unknown) =>
        typeof s === "string" && s.trim() !== "" && !s.startsWith("data:") ? s.trim() : ""
      const url = existingUrl(row.image_url) || existingUrl(img)
      if (url) v.image_url = url
    }
    return v
  })

  return { has_variation: "Yes", variations }
}

export function mapApiVariationsToForm(apiProduct: any): {
  enable_tooth_count_variation: "Yes" | "No"
  tooth_count_variations: NonNullable<ProductCreateForm["tooth_count_variations"]>
} {
  const teethOn =
    apiProduct.is_teeth_based_price === "Yes" ||
    apiProduct.is_teeth_based_price === true ||
    apiProduct.is_teeth_based_price === "yes"
  if (!teethOn) {
    return { enable_tooth_count_variation: "No", tooth_count_variations: [] }
  }

  const list = Array.isArray(apiProduct.variations) ? apiProduct.variations : []
  if (list.length === 0) {
    return { enable_tooth_count_variation: "No", tooth_count_variations: [] }
  }

  const sorted = [...list]
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, MAX_PRODUCT_VARIATIONS)
  const tooth_count_variations = sorted.map((v: any) => {
    const row = v as Record<string, unknown>
    const imageUrl = variationImageUrlFromApiRow(row)
    return {
      id: v.id,
      image: null,
      image_url: imageUrl,
      tooth_count: v.teeth_spec != null ? String(v.teeth_spec) : "",
      name_template: v.name_template != null ? String(v.name_template) : "",
    }
  })
  return { enable_tooth_count_variation: "Yes", tooth_count_variations }
}

export function hydrateTeethPricingFieldsFromDefaultGrade(
  grades: any[] | undefined,
  strategyForm: TeethPricingTypeForm,
): Partial<ProductCreateForm> {
  const out: Partial<ProductCreateForm> = {}
  const def = Array.isArray(grades) ? grades.find((g) => g.is_default === "Yes") : undefined
  if (!def) return out

  if (strategyForm === "same_price") {
    if (def.price !== undefined && def.price !== null && String(def.price) !== "") {
      out.teeth_price_per_tooth = String(def.price)
    }
  } else if (strategyForm === "first_tooth_more") {
    if (def.first_tooth_price != null) out.teeth_first_tooth_price = String(def.first_tooth_price)
    if (def.additional_tooth_price != null) out.teeth_additional_tooth_price = String(def.additional_tooth_price)
  } else if (strategyForm === "custom") {
    const tiers = def.teeth_price_tiers
    if (Array.isArray(tiers) && tiers.length > 0) {
      out.teeth_custom_prices = teethCustomPricesFromTiers(tiers)
    }
  }
  return out
}

/** True when teeth-based pricing should be read/sent on the product root (no grade-based rows). */
export function shouldUseProductLevelTeethPricing(form: ProductCreateForm): boolean {
  if (form.is_teeth_based_price !== "Yes") return false
  const gradeBased =
    form.has_grade_based_pricing === "Yes" && Array.isArray(form.grades) && form.grades.length > 0
  return !gradeBased
}

/**
 * Hydrate form teeth fields from product-level API columns / root `teeth_price_tiers`
 * (see docs: product-level tiers when no stage / no grade).
 */
export function hydrateProductLevelTeethPricingFromApi(
  apiProduct: Record<string, unknown>,
  strategyForm: TeethPricingTypeForm,
): Partial<ProductCreateForm> {
  const out: Partial<ProductCreateForm> = {}
  if (strategyForm === "same_price") {
    const v = apiProduct.teeth_per_tooth_price ?? apiProduct.teeth_price_per_tooth
    if (v != null && String(v).trim() !== "") {
      out.teeth_price_per_tooth = String(v)
    }
  } else if (strategyForm === "first_tooth_more") {
    const f = apiProduct.teeth_first_tooth_price
    const a = apiProduct.teeth_additional_tooth_price
    if (f != null && String(f).trim() !== "") {
      out.teeth_first_tooth_price = String(f)
    }
    if (a != null && String(a).trim() !== "") {
      out.teeth_additional_tooth_price = String(a)
    }
  } else if (strategyForm === "custom") {
    const tiers = apiProduct.teeth_price_tiers
    if (Array.isArray(tiers) && tiers.length > 0) {
      out.teeth_custom_prices = teethCustomPricesFromTiers(tiers as any)
    }
  }
  return out
}

function parseNullableProductTeethPrice(raw: unknown): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null
  const n = typeof raw === "number" ? raw : parseFloat(String(raw))
  if (isNaN(n) || n < 0) return null
  return n
}

/** Map product-level teeth strategy fields onto API payload (root `library_products` / lab profile). */
export function applyProductLevelTeethPricingToPayload(
  payload: Record<string, unknown>,
  form: ProductCreateForm,
): void {
  if (!shouldUseProductLevelTeethPricing(form)) return

  const strat = teethStrategyFormToApi(form.teeth_pricing_type as TeethPricingTypeForm | undefined)

  if (strat === "same_per_tooth") {
    payload.teeth_per_tooth_price = parseNullableProductTeethPrice(form.teeth_price_per_tooth)
  } else if (strat === "first_tooth_more") {
    payload.teeth_first_tooth_price = parseNullableProductTeethPrice(form.teeth_first_tooth_price)
    payload.teeth_additional_tooth_price = parseNullableProductTeethPrice(form.teeth_additional_tooth_price)
  } else if (strat === "custom_per_count") {
    payload.teeth_price_tiers = teethTiersFromCustomPrices(form.teeth_custom_prices)
  }
}

/** When teeth pricing is on, each stage must have a non-empty allocation % (any numeric values allowed). Super-admin skips this. */
export function validateStageAllocationPercents(
  stages: any[] | undefined,
  opts?: { isTeethBased?: boolean; isSuperAdmin?: boolean },
): string | null {
  if (!opts?.isTeethBased || opts?.isSuperAdmin) return null
  if (!Array.isArray(stages) || stages.length === 0) return null
  for (const s of stages) {
    if (s == null || s.allocation_percent === undefined || s.allocation_percent === null || String(s.allocation_percent).trim() === "") {
      return "Enter allocation % for each stage."
    }
  }
  return null
}

/** Remove form-only teeth / variation fields before JSON body is sent to the API. */
export function stripLibraryProductFormOnlyFields(payload: Record<string, unknown>): void {
  delete payload.teeth_pricing_type
  delete payload.teeth_price_per_tooth
  delete payload.teeth_first_tooth_price
  delete payload.teeth_additional_tooth_price
  delete payload.teeth_custom_prices
  delete payload.enable_tooth_count_variation
  delete payload.tooth_count_variations
}

export type StageGradeDetailLike = {
  stage_id?: number | string
  id?: number | string
  grade_id?: number | string
  price?: number | string | null
}

function stageIdsEqual(a: unknown, b: unknown): boolean {
  if (a === undefined || a === null || b === undefined || b === null) return false
  return String(a) === String(b) || Number(a) === Number(b)
}

/** Look up a grade price whether the map used string or number keys. */
export function lookupStageGradePrice(
  gradePrices: Record<string | number, unknown> | null | undefined,
  gradeId: number | string,
): unknown {
  if (!gradePrices || typeof gradePrices !== "object") return undefined
  const strId = String(gradeId)
  const numId = Number(gradeId)
  if (Object.prototype.hasOwnProperty.call(gradePrices, gradeId)) return gradePrices[gradeId as keyof typeof gradePrices]
  if (Object.prototype.hasOwnProperty.call(gradePrices, strId)) return gradePrices[strId]
  if (!Number.isNaN(numId) && Object.prototype.hasOwnProperty.call(gradePrices, numId)) {
    return gradePrices[numId]
  }
  return undefined
}

function hasNonEmptyStageGradePrice(v: unknown): boolean {
  return v !== undefined && v !== null && v !== ""
}

/**
 * Fold API `stage_grade_details` into each stage's `grade_prices` map.
 * Used so Update can send the full stage×grade price matrix, not only cells the user just typed.
 * Non-empty form prices win unless `overwriteExisting` is true (use that when hydrating from API).
 */
export function mergeStageGradeDetailsIntoStages<
  T extends { stage_id?: unknown; grade_prices?: Record<string | number, unknown> },
>(
  stages: T[],
  stageGradeDetails: StageGradeDetailLike[] | null | undefined,
  opts?: { overwriteExisting?: boolean },
): T[] {
  if (!Array.isArray(stages) || stages.length === 0) return stages
  if (!Array.isArray(stageGradeDetails) || stageGradeDetails.length === 0) return stages

  const overwrite = opts?.overwriteExisting === true

  return stages.map((stage) => {
    const gradePrices: Record<string | number, unknown> = { ...(stage.grade_prices || {}) }
    for (const sgd of stageGradeDetails) {
      if (!stageIdsEqual(sgd.stage_id ?? sgd.id, stage.stage_id)) continue
      const gradeId = sgd.grade_id
      if (gradeId === undefined || gradeId === null) continue
      const existing = lookupStageGradePrice(gradePrices, gradeId)
      if (!overwrite && hasNonEmptyStageGradePrice(existing)) continue
      if (sgd.price === undefined || sgd.price === null) continue
      // Normalize to a single string key so we do not emit duplicate stage_grades entries
      const key = String(gradeId)
      delete gradePrices[gradeId as keyof typeof gradePrices]
      delete gradePrices[Number(gradeId)]
      gradePrices[key] = String(sgd.price)
    }
    return { ...stage, grade_prices: gradePrices }
  })
}

function coerceOppositeImpressionYesNo(v: unknown): "Yes" | "No" | undefined {
  if (v === "Yes" || v === "yes") return "Yes"
  if (v === "No" || v === "no") return "No"
  if (v === true || v === 1 || v === "1") return "Yes"
  if (v === false || v === 0 || v === "0") return "No"
  if (v === undefined || v === null) return undefined
  if (typeof v === "string" && v.trim() === "") return undefined
  return v ? "Yes" : "No"
}

/**
 * API expects `opposite_impression` ("Yes" | "No"). The form uses `request_opposing_extraction` (boolean).
 * Merge into `opposite_impression` and remove `request_opposing_extraction` so it is never sent.
 */
export function normalizeOppositeImpressionPayload(
  payload: Record<string, unknown>,
  form?: ProductCreateForm,
): void {
  const current = payload.opposite_impression
  if (current === "Yes" || current === "No") {
    delete payload.request_opposing_extraction
    return
  }

  const fromReq =
    payload.request_opposing_extraction !== undefined
      ? payload.request_opposing_extraction
      : form?.request_opposing_extraction

  const resolved =
    coerceOppositeImpressionYesNo(current) ?? coerceOppositeImpressionYesNo(fromReq)

  if (resolved !== undefined) {
    payload.opposite_impression = resolved
  }

  delete payload.request_opposing_extraction
}

type SectionsVariation = { variation: boolean }

export function finalizeLibraryProductApiPayload(
  payload: Record<string, unknown>,
  form: ProductCreateForm,
  sections: SectionsVariation,
): void {
  stripLibraryProductFormOnlyFields(payload)

  if (form.is_teeth_based_price === "Yes") {
    payload.teeth_pricing_strategy = teethStrategyFormToApi(form.teeth_pricing_type as TeethPricingTypeForm | undefined)
  } else {
    delete payload.teeth_pricing_strategy
  }

  applyProductLevelTeethPricingToPayload(payload, form)

  const v = buildVariationsApiPayload(form, sections.variation)
  payload.has_variation = v.has_variation
  payload.variations = v.variations

  if (Array.isArray(payload.grades)) {
    payload.grades = applyLabTeethPricingToGrades(payload.grades as any[], form) ?? payload.grades
  }

  normalizeOppositeImpressionPayload(payload, form)
}
