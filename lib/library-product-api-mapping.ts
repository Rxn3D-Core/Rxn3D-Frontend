import type { ProductCreateForm } from "@/lib/schemas"

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
  const len = Math.min(15, Math.max(maxMin, 1))
  const arr: string[] = Array.from({ length: len }, () => "")
  sorted.forEach((t) => {
    const i = (t.min_teeth ?? 1) - 1
    if (i >= 0 && i < 15) {
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
    } else if (row.image_url && typeof row.image_url === "string" && row.image_url.startsWith("http")) {
      v.image_url = row.image_url
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

  const has =
    apiProduct.has_variation === true ||
    apiProduct.has_variation === "Yes" ||
    apiProduct.has_variation === "yes"
  const list = Array.isArray(apiProduct.variations) ? apiProduct.variations : []
  if (!has || list.length === 0) {
    return { enable_tooth_count_variation: "No", tooth_count_variations: [] }
  }
  const sorted = [...list].sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )
  const tooth_count_variations = sorted.map((v: any) => ({
    id: v.id,
    image: null,
    image_url: v.image_url ?? undefined,
    tooth_count: v.teeth_spec != null ? String(v.teeth_spec) : "",
    name_template: v.name_template != null ? String(v.name_template) : "",
  }))
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

const ALLOCATION_EPS = 0.02

export function validateStageAllocationPercents(stages: any[] | undefined): string | null {
  if (!Array.isArray(stages) || stages.length === 0) return null
  const nums: number[] = []
  for (const s of stages) {
    if (s == null || s.allocation_percent === undefined || s.allocation_percent === null || s.allocation_percent === "") {
      return null
    }
    const n = typeof s.allocation_percent === "number" ? s.allocation_percent : parseFloat(String(s.allocation_percent))
    if (isNaN(n)) return null
    nums.push(n)
  }
  if (nums.length !== stages.length) return null
  const sum = nums.reduce((a, b) => a + b, 0)
  if (Math.abs(sum - 100) > ALLOCATION_EPS) {
    return `Stage allocation percentages must sum to 100 (currently ${sum.toFixed(2)}).`
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

  const v = buildVariationsApiPayload(form, sections.variation)
  payload.has_variation = v.has_variation
  payload.variations = v.variations

  if (Array.isArray(payload.grades)) {
    payload.grades = applyLabTeethPricingToGrades(payload.grades as any[], form) ?? payload.grades
  }
}
