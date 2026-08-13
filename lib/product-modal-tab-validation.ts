/**
 * Maps product modal validation field names → tab ids, and finds the first
 * misconfigured tab so Update/Save can navigate there.
 */

import { collectGradesStepErrors, type GradesStepFieldError } from "@/lib/grades-step-validation"
import {
  collectAddonsStepErrors,
  collectGumShadeStepErrors,
  collectImpressionsStepErrors,
  collectMaterialStepErrors,
  collectRetentionsStepErrors,
  collectTeethShadeStepErrors,
  type SlipRelationStepFieldError,
  type SlipSectionsFlags,
} from "@/lib/slip-relation-step-validation"
import { collectStagesStepErrors, type StagesStepFieldError } from "@/lib/stages-step-validation"
import {
  collectProductDetailsStepErrors,
  type ProductDetailsFieldError,
} from "@/lib/product-details-step-validation"
import { collectVariationStepErrors, type VariationStepFieldError } from "@/lib/variation-step-validation"

export type ProductModalFieldError = {
  field: string
  message: string
}

/** Field prefixes owned by each product-modal tab (for tab error icons). */
export const PRODUCT_MODAL_TAB_FIELD_PREFIXES: Record<string, string[]> = {
  details: [
    "name",
    "code",
    "category_id",
    "subcategory_id",
    "base_price",
    "type",
    "status",
    "sequence",
    "description",
    "is_single_stage",
    "is_splinted",
    "min_days_to_process",
    "max_days_to_process",
    "enable_auto_billing",
    "auto_billing_days",
    "is_teeth_based_price",
    "teeth_pricing_type",
    "teeth_price_per_tooth",
    "teeth_first_tooth_price",
    "teeth_additional_tooth_price",
    "teeth_custom_prices",
    "show_jaw_photo",
    "jaw_photos",
  ],
  variation: ["enable_tooth_count_variation", "tooth_count_variations"],
  grades: ["grades", "has_grade_based_pricing", "default_grade_id"],
  stages: ["stages"],
  impressions: ["impressions", "impression_group_id", "request_opposing_extraction"],
  gumShade: ["gum_shades", "gum_shade_group_id"],
  teethShade: ["teeth_shades", "teeth_shade_group_id"],
  material: ["materials", "material_group_id"],
  addOns: ["addons", "addon_group_id", "link_all_addons"],
  toothChartConfigurations: [
    "retentions",
    "retention_options",
    "apply_retention_mechanism",
    "retention_type",
    "extractions",
    "opposite_extractions",
    "apply_same_status_to_opposing",
    "enable_default_tooth_chart",
    "allow_select_only_implant",
    "enable_custom_label",
    "custom_label",
    "default_tooth_chart",
  ],
  advanceFields: ["advance_fields"],
  visibility: ["show_to_all_lab", "office_visibilities"],
}

export function tabHasValidationErrors(
  tabId: string,
  errors: Array<{ field: string }>,
): boolean {
  const prefixes = PRODUCT_MODAL_TAB_FIELD_PREFIXES[tabId]
  if (!prefixes || errors.length === 0) return false
  return errors.some((err) =>
    prefixes.some((prefix) => err.field === prefix || err.field.startsWith(`${prefix}.`) || err.field.startsWith(`${prefix}[`)),
  )
}

export type ProductModalSectionsForValidation = SlipSectionsFlags & {
  grades: boolean
  stages: boolean
  variation: boolean
}

export type FirstProductModalValidationFailure = {
  tabId: string
  errors: ProductModalFieldError[]
  /** All toggle/section errors across tabs (for red tab icons). */
  allErrors: ProductModalFieldError[]
}

function gradesEmptyErrors(
  v: Record<string, unknown>,
  gradesSectionEnabled: boolean,
): ProductModalFieldError[] {
  if (!gradesSectionEnabled) return []
  const rows = Array.isArray(v.grades) ? v.grades : []
  if (rows.length === 0) {
    return [{ field: "grades", message: "Select at least one grade when Grades is on." }]
  }
  if (!rows.some((g) => g && typeof g === "object" && (g as { is_default?: string }).is_default === "Yes")) {
    return [{ field: "grades", message: "Select a default grade when Grades is on." }]
  }
  return []
}

/**
 * Walk product modal tabs in UI order; return first failing tab + all collected errors.
 * Used on Update/Save so Retention (and other toggle sections) navigate like Grades.
 */
export function firstProductModalValidationFailure(
  v: Record<string, unknown>,
  opts: {
    sections: ProductModalSectionsForValidation
    enforceLabPricing?: boolean
    isSingleStage?: boolean
    isSuperAdmin?: boolean
    masterGrades?: Array<{ id: number | string; sequence?: number }>
    /** Jaw photo slot URLs / base64 (held outside RHF in product modals) */
    jawPhotos?: { upper?: string | null; lower?: string | null; both?: string | null }
  },
): FirstProductModalValidationFailure | null {
  const { sections } = opts
  const enforceLabPricing = opts.enforceLabPricing ?? false
  const isSingleStage = opts.isSingleStage ?? false
  const isSuperAdmin = opts.isSuperAdmin ?? false
  const masterGrades = opts.masterGrades ?? []

  const allErrors: ProductModalFieldError[] = []
  let first: { tabId: string; errors: ProductModalFieldError[] } | null = null

  const push = (tabId: string, errs: ProductModalFieldError[]) => {
    if (errs.length === 0) return
    allErrors.push(...errs)
    if (!first) first = { tabId, errors: errs }
  }

  push(
    "details",
    collectProductDetailsStepErrors(v, {
      enforceLabPricing,
      sections: { grades: sections.grades },
      jawPhotos: opts.jawPhotos,
    }) as ProductDetailsFieldError[],
  )

  push(
    "variation",
    collectVariationStepErrors(v, {
      variationSectionEnabled: sections.variation,
    }) as VariationStepFieldError[],
  )

  const emptyGradeErrs = gradesEmptyErrors(v, sections.grades)
  push("grades", emptyGradeErrs)
  if (emptyGradeErrs.length === 0 && enforceLabPricing) {
    push(
      "grades",
      collectGradesStepErrors(v, {
        enforceLabGradePricing: enforceLabPricing,
        gradesSectionEnabled: sections.grades,
        masterGrades,
      }) as GradesStepFieldError[],
    )
  }

  if (!isSingleStage) {
    push(
      "stages",
      collectStagesStepErrors(v, {
        stagesSectionEnabled: sections.stages,
        isSingleStage: false,
        isSuperAdmin,
      }) as StagesStepFieldError[],
    )
  }

  const slipChecks: Array<{ tabId: string; run: () => SlipRelationStepFieldError[] }> = [
    {
      tabId: "impressions",
      run: () =>
        collectImpressionsStepErrors(v, { impressionsSectionEnabled: sections.impressions }),
    },
    {
      tabId: "gumShade",
      run: () => collectGumShadeStepErrors(v, { gumShadeSectionEnabled: sections.gumShade }),
    },
    {
      tabId: "teethShade",
      run: () =>
        collectTeethShadeStepErrors(v, { teethShadeSectionEnabled: sections.teethShade }),
    },
    {
      tabId: "material",
      run: () => collectMaterialStepErrors(v, { materialSectionEnabled: sections.material }),
    },
    {
      tabId: "addOns",
      run: () => collectAddonsStepErrors(v, { addOnsSectionEnabled: sections.addOns }),
    },
    {
      // Retention lives under Tooth Chart Configurations (not a top-level "retention" tab).
      tabId: "toothChartConfigurations",
      run: () =>
        collectRetentionsStepErrors(v, { retentionSectionEnabled: sections.retention }),
    },
  ]

  for (const { tabId, run } of slipChecks) {
    push(tabId, run())
  }

  if (!first) return null
  return { ...first, allErrors }
}
