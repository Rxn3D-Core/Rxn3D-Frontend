/**
 * Grades tab validation for lab product modal (selected tiers must have valid prices).
 */

export type GradesStepFieldError = { field: string; message: string }

type FormGradeRow = {
  grade_id?: number | string
  price?: unknown
  markup_percent?: unknown
  is_default?: string
}

type MasterGrade = { id: number | string; sequence?: number }

function parsePositivePrice(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (s === "") return null
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** First tooth anchor from Product Details (matches GradesSection). */
export function firstToothAnchorFromForm(v: Record<string, unknown>): number | null {
  if (v.is_teeth_based_price !== "Yes") return null
  const t = (v.teeth_pricing_type as string) ?? "same_price"
  if (t === "same_price") {
    const p = parseFloat(String(v.teeth_price_per_tooth ?? "").trim())
    return !Number.isNaN(p) && p > 0 ? p : null
  }
  if (t === "first_tooth_more") {
    const p = parseFloat(String(v.teeth_first_tooth_price ?? "").trim())
    return !Number.isNaN(p) && p > 0 ? p : null
  }
  if (t === "custom") {
    const arr = Array.isArray(v.teeth_custom_prices) ? v.teeth_custom_prices : []
    const p = parseFloat(String(arr[0] ?? "").trim())
    return !Number.isNaN(p) && p > 0 ? p : null
  }
  return null
}

function sortSelectedGradesByMasterOrder(rows: FormGradeRow[], masterGrades: MasterGrade[]): FormGradeRow[] {
  if (rows.length === 0) return rows
  const masterList = Array.isArray(masterGrades) ? masterGrades : []
  const selected = [...rows]
  selected.sort((a, b) => {
    const aId = a.grade_id
    const bId = b.grade_id
    const aNeg = typeof aId === "number" && aId < 0
    const bNeg = typeof bId === "number" && bId < 0
    if (aNeg && !bNeg) return 1
    if (!aNeg && bNeg) return -1
    if (aNeg && bNeg) return (aId as number) - (bId as number)
    const ma = masterList.find((mg) => mg.id === aId)
    const mb = masterList.find((mg) => mg.id === bId)
    const sa = ma?.sequence ?? 999999
    const sb = mb?.sequence ?? 999999
    if (sa !== sb) return sa - sb
    return String(aId).localeCompare(String(bId))
  })
  return selected
}

function getAnchorGradeId(rows: FormGradeRow[], masterGrades: MasterGrade[]): number | string | undefined {
  const sorted = sortSelectedGradesByMasterOrder(rows, masterGrades)
  return sorted[0]?.grade_id
}

export function collectGradesStepErrors(
  v: Record<string, unknown>,
  opts: {
    enforceLabGradePricing: boolean
    gradesSectionEnabled: boolean
    masterGrades: MasterGrade[]
  },
): GradesStepFieldError[] {
  if (!opts.enforceLabGradePricing || !opts.gradesSectionEnabled) return []
  if (String(v.has_grade_based_pricing ?? "") !== "Yes") return []

  const rows = Array.isArray(v.grades) ? (v.grades as FormGradeRow[]) : []
  if (rows.length === 0) return []

  const errs: GradesStepFieldError[] = []

  if (!rows.some((g) => g.is_default === "Yes")) {
    errs.push({ field: "grades", message: "Select a default grade" })
  }

  const teethOn = v.is_teeth_based_price === "Yes"
  const anchorFromDetails = teethOn ? firstToothAnchorFromForm(v) : null
  const teethGradeLock = teethOn && String(v.has_grade_based_pricing ?? "") === "Yes"
  const anchorId = teethGradeLock ? getAnchorGradeId(rows, opts.masterGrades) : undefined

  rows.forEach((g, i) => {
    const gid = g.grade_id
    const isAnchor = teethGradeLock && anchorId !== undefined && String(gid) === String(anchorId)

    if (isAnchor) {
      if (anchorFromDetails == null || anchorFromDetails <= 0) {
        errs.push({
          field: `grades.${i}.price`,
          message: "Set per-tooth pricing on Product Details (first tooth / per-tooth prices required)",
        })
        return
      }
      const p = parsePositivePrice(g.price)
      if (p === null) {
        errs.push({
          field: `grades.${i}.price`,
          message: "Anchor grade price must be greater than 0",
        })
      }
      return
    }

    const p = parsePositivePrice(g.price)
    if (p === null) {
      errs.push({
        field: `grades.${i}.price`,
        message:
          teethGradeLock && !isAnchor
            ? "Enter markup % until tier price is set, or ensure price is greater than 0"
            : "Grade price is required",
      })
    }
  })

  return errs
}
