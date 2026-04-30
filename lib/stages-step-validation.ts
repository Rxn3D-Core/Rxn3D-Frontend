/**
 * Stages tab: allocation % rows must be non-empty (teeth-based, non–super-admin); values may be any number and totals may exceed 100. Days & pricing rules unchanged.
 */

export type StagesStepFieldError = { field: string; message: string }

/** Teeth + grades: each stage row price = (grade full price from Grades) × (allocation % ÷ 100). Mirrors StagesSection. */
function mergeStageGradePricesForTeeth(
  stage: { grade_prices?: Record<string | number, string | undefined> },
  allocationStr: string,
  gradeRows: { grade_id?: number | string; id?: number | string; price?: unknown }[],
): Record<string, string> {
  const base: Record<string, string> = { ...((stage.grade_prices as Record<string, string>) || {}) }
  gradeRows.forEach((g) => {
    const gid = g.grade_id ?? g.id
    delete base[gid as keyof typeof base]
    delete base[String(gid)]
  })
  const pct = parseFloat(String(allocationStr ?? "").trim())
  if (Number.isNaN(pct) || pct <= 0) {
    return base
  }
  const factor = pct / 100
  gradeRows.forEach((g) => {
    const gid = g.grade_id ?? g.id
    const full = parseFloat(String(g.price ?? "").trim())
    const key = gid as keyof typeof base
    base[key] =
      Number.isNaN(full) || full < 0 ? "" : (full * factor).toFixed(2)
  })
  return base
}

function pickGradePriceFromMap(
  gp: Record<string, unknown> | undefined,
  gradeId: number | string | undefined,
): string {
  if (!gp || gradeId === undefined || gradeId === null) return ""
  const normalizedId = String(gradeId)
  let raw: unknown =
    gp[gradeId as keyof typeof gp] ?? gp[normalizedId] ?? gp[gradeId]
  if (
    raw === undefined &&
    typeof gradeId === "string" &&
    !Number.isNaN(Number(gradeId))
  ) {
    raw = gp[Number(gradeId)]
  }
  return String(raw ?? "").trim()
}

function parsePositivePrice(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (s === "") return null
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function parseStageDays(stage: Record<string, unknown>): number | null {
  const days = stage.days
  if (days === undefined || days === null) return null
  if (typeof days === "number") return Number.isFinite(days) ? days : null
  const s = String(days).trim()
  if (s === "") return null
  const n = parseInt(s, 10)
  if (!Number.isFinite(n)) return null
  return n
}

export function collectStagesStepErrors(
  v: Record<string, unknown>,
  opts: {
    stagesSectionEnabled: boolean
    isSingleStage: boolean
    /** Super-admin: no allocation % or per-stage price UI — validate days/workflow only. */
    isSuperAdmin?: boolean
  },
): StagesStepFieldError[] {
  const errors: StagesStepFieldError[] = []

  if (!opts.stagesSectionEnabled || opts.isSingleStage) {
    return errors
  }

  const rows = Array.isArray(v.stages)
    ? (v.stages as Record<string, unknown>[])
    : []

  if (rows.length === 0) {
    errors.push({
      field: "stages",
      message: "Select at least one stage or turn Stages off.",
    })
    return errors
  }

  const hasGradeBased = String(v.has_grade_based_pricing ?? "") === "Yes"
  const grades = Array.isArray(v.grades)
    ? (v.grades as {
        grade_id?: number | string
        id?: number | string
        price?: unknown
      }[])
    : []
  const hasSelectedGrades = grades.length > 0
  const isTeethBased = v.is_teeth_based_price === "Yes"
  const teethAuto =
    !opts.isSuperAdmin && isTeethBased && hasGradeBased && hasSelectedGrades

  let hasTeethAllocRowError = false

  if (!opts.isSuperAdmin && isTeethBased && rows.length > 0) {
    rows.forEach((stage, i) => {
      const raw = stage.allocation_percent
      const s = raw === undefined || raw === null ? "" : String(raw).trim()

      if (s === "") {
        hasTeethAllocRowError = true
        errors.push({
          field: `stages.${i}.allocation_percent`,
          message: "Enter allocation % for each stage.",
        })
      }
    })
  }

  rows.forEach((stage, i) => {
    const d = parseStageDays(stage)
    if (d === null || d <= 0) {
      errors.push({
        field: `stages.${i}.days`,
        message: "Enter days greater than 0 for each stage.",
      })
    }
  })

  if (opts.isSuperAdmin) {
    return errors
  }

  if (hasGradeBased && hasSelectedGrades) {
    rows.forEach((stage, i) => {
      if (teethAuto && hasTeethAllocRowError) return

      grades.forEach((grade) => {
        const gradeId = grade.grade_id ?? grade.id
        let resolved = ""

        if (teethAuto) {
          const merged = mergeStageGradePricesForTeeth(
            stage as { grade_prices?: Record<string | number, string | undefined> },
            String(stage.allocation_percent ?? ""),
            grades,
          )
          resolved = pickGradePriceFromMap(merged as Record<string, unknown>, gradeId)
        } else {
          const gp =
            stage.grade_prices && typeof stage.grade_prices === "object"
              ? (stage.grade_prices as Record<string, unknown>)
              : undefined
          resolved = pickGradePriceFromMap(gp, gradeId)
          if (!resolved) {
            resolved = String(grade.price ?? "").trim()
          }
        }

        if (parsePositivePrice(resolved) === null) {
          errors.push({
            field: `stages.${i}.grade_price.${String(gradeId)}`,
            message: "Enter a price greater than 0 for each grade on each stage.",
          })
        }
      })
    })
  } else {
    rows.forEach((stage, i) => {
      const priceRaw = stage.economy_price || stage.standard_price || ""
      if (parsePositivePrice(priceRaw) === null) {
        errors.push({
          field: `stages.${i}.economy_price`,
          message: "Enter a price greater than 0 for each stage.",
        })
      }
    })
  }

  return errors
}
