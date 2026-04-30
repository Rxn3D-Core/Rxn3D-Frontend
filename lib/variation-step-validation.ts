/** Step-level validation for tooth-count variation rows (lab + global product modal). */

export const VARIATION_MAX_TOOTH_COUNT = 16

export type VariationStepFieldError = { field: string; message: string }

/**
 * Validates non-empty tooth count strings (ranges like "4 - 16" or single values).
 * Empty string → no message (caller adds "required").
 */
export function variationToothCountFormatIssue(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parts = trimmed
    .split("-")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) return "Enter a valid tooth count"

  const nums: number[] = []
  for (const part of parts) {
    const n = parseInt(part, 10)
    if (Number.isNaN(n) || n < 1) return "Enter a valid tooth count (1–16)"
    if (n > VARIATION_MAX_TOOTH_COUNT) {
      return `Max is ${VARIATION_MAX_TOOTH_COUNT} (${VARIATION_MAX_TOOTH_COUNT} teeth = Full Denture)`
    }
    nums.push(n)
  }

  if (nums.length === 2 && nums[0] > nums[1]) {
    return "Invalid range: lower bound must be ≤ upper bound"
  }

  return undefined
}

export function collectVariationStepErrors(
  v: Record<string, unknown>,
  opts: { variationSectionEnabled: boolean },
): VariationStepFieldError[] {
  const teethOn = v.is_teeth_based_price === "Yes"
  if (!teethOn || !opts.variationSectionEnabled) return []

  const rows = Array.isArray(v.tooth_count_variations) ? (v.tooth_count_variations as Record<string, unknown>[]) : []
  if (rows.length === 0) return []

  const errs: VariationStepFieldError[] = []

  rows.forEach((row, i) => {
    const tcRaw = String(row?.tooth_count ?? "").trim()
    const baseToothField = `tooth_count_variations.${i}.tooth_count`
    if (!tcRaw) {
      errs.push({ field: baseToothField, message: "Total number of teeth is required" })
    } else {
      const fmt = variationToothCountFormatIssue(tcRaw)
      if (fmt) errs.push({ field: baseToothField, message: fmt })
    }

    const nm = String(row?.name_template ?? "").trim()
    if (!nm) {
      errs.push({ field: `tooth_count_variations.${i}.name_template`, message: "Variation name is required" })
    }
  })

  return errs
}
