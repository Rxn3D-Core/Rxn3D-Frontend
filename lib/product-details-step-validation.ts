/**
 * Product Details tab validation (global / lab product modal).
 * Lab admin: pricing + per-tooth pricing when enabled. Super admin: identity fields only.
 */
export type ProductDetailsSectionFlags = {
  grades: boolean
}

export type ProductDetailsStepValidationOpts = {
  /** When false (superadmin), skip all price rules */
  enforceLabPricing: boolean
  sections: ProductDetailsSectionFlags
}

export type ProductDetailsFieldError = { field: string; message: string }

function parseNonNegativeMoney(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (s === "") return null
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function collectProductDetailsStepErrors(
  v: Record<string, unknown>,
  opts: ProductDetailsStepValidationOpts,
): ProductDetailsFieldError[] {
  const errs: ProductDetailsFieldError[] = []

  if (!String(v.name ?? "").trim()) {
    errs.push({ field: "name", message: "Product name is required" })
  }
  if (!String(v.code ?? "").trim()) {
    errs.push({ field: "code", message: "Product code is required" })
  }

  const cat = v.category_id
  if (cat == null || cat === "" || !Number.isFinite(Number(cat))) {
    errs.push({ field: "category_id", message: "Category is required" })
  }

  const sub = v.subcategory_id
  if (sub == null || sub === "" || Number(sub) <= 0 || !Number.isFinite(Number(sub))) {
    errs.push({ field: "subcategory_id", message: "Subcategory is required" })
  }

  if (!opts.enforceLabPricing) {
    return errs
  }

  const grades = Array.isArray(v.grades) ? (v.grades as Record<string, unknown>[]) : []
  const defaultGrade = grades.find((g) => g.is_default === "Yes")
  const hasGradeSection = opts.sections.grades
  const hasGradeBasedPricing = v.has_grade_based_pricing === "Yes"
  const isTeeth = v.is_teeth_based_price === "Yes"

  const defaultGradePriceRaw =
    defaultGrade && defaultGrade.price !== undefined && defaultGrade.price !== null && defaultGrade.price !== ""
      ? String(defaultGrade.price)
      : ""

  const lockedByGrades =
    hasGradeSection &&
    !!String(defaultGradePriceRaw).trim() &&
    (isTeeth === true || hasGradeBasedPricing)

  const rawBaseSource = lockedByGrades ? defaultGradePriceRaw : String(v.base_price ?? "")
  if (String(rawBaseSource).trim() === "") {
    errs.push({ field: "base_price", message: "Base price is required" })
  } else {
    const n = parseNonNegativeMoney(rawBaseSource)
    if (n === null) errs.push({ field: "base_price", message: "Enter a valid base price" })
    else if (n <= 0)
      errs.push({ field: "base_price", message: "Enter a base price greater than 0" })
  }

  if (isTeeth) {
    const t = (v.teeth_pricing_type as string) || "same_price"
    if (t === "same_price") {
      const raw = String(v.teeth_price_per_tooth ?? "").trim()
      if (raw === "" || parseNonNegativeMoney(raw) === null) {
        errs.push({ field: "teeth_price_per_tooth", message: "Price per tooth is required for lab products" })
      }
    } else if (t === "first_tooth_more") {
      const fRaw = String(v.teeth_first_tooth_price ?? "").trim()
      const aRaw = String(v.teeth_additional_tooth_price ?? "").trim()
      if (fRaw === "" || parseNonNegativeMoney(fRaw) === null) {
        errs.push({ field: "teeth_first_tooth_price", message: "First tooth price is required" })
      }
      if (aRaw === "" || parseNonNegativeMoney(aRaw) === null) {
        errs.push({ field: "teeth_additional_tooth_price", message: "Additional tooth price is required" })
      }
    } else if (t === "custom") {
      const arr = Array.isArray(v.teeth_custom_prices) ? (v.teeth_custom_prices as unknown[]) : []
      if (arr.length === 0) {
        errs.push({ field: "teeth_custom_prices", message: "Add at least one custom tooth price" })
      }
      arr.forEach((cell, i) => {
        const raw = String(cell ?? "").trim()
        if (raw === "" || parseNonNegativeMoney(raw) === null) {
          errs.push({
            field: `teeth_custom_prices.${i}`,
            message: `Enter a valid price for tooth count ${i + 1}`,
          })
        }
      })
    }
  }

  return errs
}
