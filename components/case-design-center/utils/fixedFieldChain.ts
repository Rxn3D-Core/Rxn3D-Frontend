/**
 * Dynamic fixed-restoration field chain.
 *
 * The fixed flow used to map the product's `advance_fields` onto a hardcoded list
 * of steps via NAME matching (FIXED_STEP_ADVANCE_FIELD_PATTERNS — "margin", "metal",
 * etc.). That is brittle: renaming a field, a typo, or a translation silently drops
 * it from the flow.
 *
 * This builds the chain purely from stable, backend-controlled attributes:
 *   - `field_type` decides how the field renders (and which ones are special),
 *   - `sequence`  decides the order,
 *   - `id`        is the stable storage/completion key.
 *
 * The display `name` is never used for behavior — only as a label.
 */

/** Minimal shape we rely on from a product advance field. */
export interface AdvanceFieldLike {
  id: number;
  name: string;
  field_type: string;
  sequence?: number;
  status?: string | null;
}

/** Field types that need bespoke UI rather than the generic widget renderer. */
export const SHADE_GUIDE_FIELD_TYPE = "shade_guide";
export const IMPLANT_LIBRARY_FIELD_TYPE = "implant_library";

export type FixedFieldKind = "stage" | "shade_guide" | "implant_library" | "generic";

export interface FixedFieldDescriptor {
  /** Stable progress/storage key: `stage` or `af:<id>`. */
  key: string;
  kind: FixedFieldKind;
  /** Present for advance-field-backed descriptors. */
  advanceFieldId?: number;
  fieldType?: string;
  /** Display label only — never used for behavior. */
  name: string;
  sequence: number;
}

/** Stable progress key for an advance field. */
export function advanceFieldKey(id: number): string {
  return `af:${id}`;
}

/** Parse `af:<id>` back to the numeric id (null when not an advance-field key). */
export function parseAdvanceFieldKey(key: string): number | null {
  const m = /^af:(\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

function kindForFieldType(fieldType: string): FixedFieldKind {
  if (fieldType === SHADE_GUIDE_FIELD_TYPE) return "shade_guide";
  if (fieldType === IMPLANT_LIBRARY_FIELD_TYPE) return "implant_library";
  return "generic";
}

export interface BuildFixedFieldChainOptions {
  /** Caller passes the resolved decision (e.g. !shouldSkipStageSelection && has_stage !== "No"). */
  includeStage?: boolean;
}

/**
 * Build the ordered fixed-field chain for a product, driven entirely by
 * `advance_fields` (field_type + sequence + id). Stage, when applicable, is a
 * product-level step that always leads. Inactive fields are dropped.
 */
export function buildFixedFieldChain(
  advanceFields: AdvanceFieldLike[] | undefined,
  options: BuildFixedFieldChainOptions = {}
): FixedFieldDescriptor[] {
  const out: FixedFieldDescriptor[] = [];

  if (options.includeStage) {
    out.push({ key: "stage", kind: "stage", name: "Stage", sequence: Number.NEGATIVE_INFINITY });
  }

  const active = (advanceFields ?? [])
    .filter((f) => f && typeof f.id === "number" && (f.status ?? "Active") === "Active")
    .map((f, index) => ({ field: f, index }))
    .sort((a, b) => {
      const sa = a.field.sequence ?? Number.MAX_SAFE_INTEGER;
      const sb = b.field.sequence ?? Number.MAX_SAFE_INTEGER;
      // Stable: fall back to original order when sequences tie or are missing.
      return sa - sb || a.index - b.index;
    });

  for (const { field } of active) {
    out.push({
      key: advanceFieldKey(field.id),
      kind: kindForFieldType(field.field_type),
      advanceFieldId: field.id,
      fieldType: field.field_type,
      name: field.name,
      sequence: field.sequence ?? 0,
    });
  }

  return out;
}

/** First incomplete descriptor in the chain — drives the "next field" reveal. */
export function nextIncompleteFixedField(
  chain: FixedFieldDescriptor[],
  isComplete: (descriptor: FixedFieldDescriptor) => boolean
): FixedFieldDescriptor | null {
  for (const descriptor of chain) {
    if (!isComplete(descriptor)) return descriptor;
  }
  return null;
}
