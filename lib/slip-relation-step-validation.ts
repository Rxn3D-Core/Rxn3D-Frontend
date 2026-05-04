/**
 * Product slip sections backed by a list of selected items (impressions, shades, etc.).
 * When a section is ON, at least one row with a valid * _id must be present.
 */

export type SlipRelationStepFieldError = { field: string; message: string }

export const SLIP_RELATION_FORM_FIELDS = [
  "impressions",
  "gum_shades",
  "teeth_shades",
  "materials",
  "addons",
  "retentions",
] as const

export type SlipRelationFormField = (typeof SLIP_RELATION_FORM_FIELDS)[number]

export const SLIP_RELATION_FIELD_SET = new Set<string>(SLIP_RELATION_FORM_FIELDS)

function rowHasValidId(row: unknown, idKey: string): boolean {
  if (row === null || typeof row !== "object") return false
  const id = (row as Record<string, unknown>)[idKey]
  if (id === undefined || id === null || id === "") return false
  if (typeof id === "number") return Number.isFinite(id)
  if (typeof id === "string") return id.trim() !== "" && !Number.isNaN(Number(id))
  return false
}

function collectMinOneSelected(
  v: Record<string, unknown>,
  opts: {
    sectionEnabled: boolean
    arrayKey: string
    idKey: string
    errorField: string
    message: string
  },
): SlipRelationStepFieldError[] {
  if (!opts.sectionEnabled) return []
  const rowsUnknown = v[opts.arrayKey]
  const rows: unknown[] = Array.isArray(rowsUnknown) ? rowsUnknown : []
  const selected = rows.filter((row: unknown) => rowHasValidId(row, opts.idKey))
  if (selected.length < 1) {
    return [{ field: opts.errorField, message: opts.message }]
  }
  return []
}

/** Quantity is required (non‑negative integer) only when the add-on row is marked default. */
function addonDefaultRowHasValidQuantity(row: unknown): boolean {
  if (row === null || typeof row !== "object") return true
  const r = row as Record<string, unknown>
  if (r.is_default !== "Yes") return true
  const q = r.quantity
  if (q === undefined || q === null || q === "") return false
  if (typeof q === "number") {
    return Number.isInteger(q) && q >= 0
  }
  if (typeof q === "string") {
    const t = q.trim()
    if (t === "") return false
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 && Math.floor(n) === n
  }
  return false
}

export function collectImpressionsStepErrors(
  v: Record<string, unknown>,
  opts: { impressionsSectionEnabled: boolean },
): SlipRelationStepFieldError[] {
  return collectMinOneSelected(v, {
    sectionEnabled: opts.impressionsSectionEnabled,
    arrayKey: "impressions",
    idKey: "impression_id",
    errorField: "impressions",
    message: "Select at least one impression when Impressions is on.",
  })
}

export function collectGumShadeStepErrors(
  v: Record<string, unknown>,
  opts: { gumShadeSectionEnabled: boolean },
): SlipRelationStepFieldError[] {
  return collectMinOneSelected(v, {
    sectionEnabled: opts.gumShadeSectionEnabled,
    arrayKey: "gum_shades",
    idKey: "gum_shade_id",
    errorField: "gum_shades",
    message: "Select at least one gum shade when Gum Shade is on.",
  })
}

export function collectTeethShadeStepErrors(
  v: Record<string, unknown>,
  opts: { teethShadeSectionEnabled: boolean },
): SlipRelationStepFieldError[] {
  return collectMinOneSelected(v, {
    sectionEnabled: opts.teethShadeSectionEnabled,
    arrayKey: "teeth_shades",
    idKey: "teeth_shade_id",
    errorField: "teeth_shades",
    message: "Select at least one teeth shade when Teeth Shade is on.",
  })
}

export function collectMaterialStepErrors(
  v: Record<string, unknown>,
  opts: { materialSectionEnabled: boolean },
): SlipRelationStepFieldError[] {
  return collectMinOneSelected(v, {
    sectionEnabled: opts.materialSectionEnabled,
    arrayKey: "materials",
    idKey: "material_id",
    errorField: "materials",
    message: "Select at least one material when Material is on.",
  })
}

export function collectAddonsStepErrors(
  v: Record<string, unknown>,
  opts: { addOnsSectionEnabled: boolean },
): SlipRelationStepFieldError[] {
  const out = collectMinOneSelected(v, {
    sectionEnabled: opts.addOnsSectionEnabled,
    arrayKey: "addons",
    idKey: "addon_id",
    errorField: "addons",
    message: "Select at least one add-on when Add-Ons is on.",
  })
  if (!opts.addOnsSectionEnabled || out.length > 0) {
    return out
  }
  const rowsUnknown = v.addons
  const rows: unknown[] = Array.isArray(rowsUnknown) ? rowsUnknown : []
  const invalidDefault = rows.some(
    (row) => rowHasValidId(row, "addon_id") && !addonDefaultRowHasValidQuantity(row),
  )
  if (invalidDefault) {
    out.push({
      field: "addons",
      message:
        "Enter a quantity (0 or greater) for every add-on that is set as default. Leave quantity empty when default is off.",
    })
  }
  return out
}

export function collectRetentionsStepErrors(
  v: Record<string, unknown>,
  opts: { retentionSectionEnabled: boolean },
): SlipRelationStepFieldError[] {
  return collectMinOneSelected(v, {
    sectionEnabled: opts.retentionSectionEnabled,
    arrayKey: "retentions",
    idKey: "retention_id",
    errorField: "retentions",
    message: "Select at least one retention when Retention is on.",
  })
}

/** Sections map matches `sections` state in product modals (camelCase keys). */
export type SlipSectionsFlags = {
  impressions: boolean
  gumShade: boolean
  teethShade: boolean
  material: boolean
  addOns: boolean
  retention: boolean
}

/** Walk slip tabs in UI order; return first failing tab for navigation + error list. */
export function firstSlipPicklistValidationFailure(
  v: Record<string, unknown>,
  sections: SlipSectionsFlags,
): { tabId: string; errors: SlipRelationStepFieldError[] } | null {
  const checks: Array<{ tabId: string; run: () => SlipRelationStepFieldError[] }> = [
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
      tabId: "retention",
      run: () =>
        collectRetentionsStepErrors(v, { retentionSectionEnabled: sections.retention }),
    },
  ]
  for (const { tabId, run } of checks) {
    const errors = run()
    if (errors.length > 0) return { tabId, errors }
  }
  return null
}
