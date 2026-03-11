"use client";

import { useState, useCallback } from "react";
import type { Arch, RetentionType, ProductApiData, ProductAdvanceField } from "../types";

/**
 * The sequential fields shown one by one when Prep or Pontic is selected.
 * Each step becomes visible only after the previous one is filled.
 */
export const FIELD_STEPS = [
  "grade",
  "stage",
  "teeth_shade",
  "gum_shade",
  "impression",
  "addons",
] as const;

/**
 * Progressive steps for Fixed Restoration fields.
 * Product-Material and Retention Type are always shown (excluded from this chain).
 * Implant Detail section is always shown when applicable (its internal fields are excluded).
 */
export const FIXED_FIELD_STEPS = [
  "fixed_stage",
  "fixed_stump_shade",
  "fixed_shade_trio",
  "fixed_characterization",
  "fixed_contact_icons",
  "fixed_margin",
  "fixed_metal",
  "fixed_proximal_contact",
  "fixed_impression",
  "fixed_addons",
] as const;

export type FieldStep = (typeof FIELD_STEPS)[number] | (typeof FIXED_FIELD_STEPS)[number];

/**
 * Optional steps that are shown but do NOT block progression to the next step.
 * Completing them is not required for the chain to advance.
 */
const OPTIONAL_STEPS: ReadonlySet<string> = new Set(["fixed_addons"]);

/**
 * Steps that count as "impression completed" for Case Summary Notes.
 * Add any new impression-type step here to keep behavior dynamic.
 */
export const IMPRESSION_STEP_NAMES: readonly FieldStep[] = ["impression", "fixed_impression"];

/**
 * Map shade field type (from shade picker) to the fixed restoration step name.
 * When user selects a shade for a fixed_* product, we complete this step so the next advance field shows.
 */
export const FIXED_SHADE_FIELD_TO_STEP: Record<string, FieldStep> = {
  stump_shade: "fixed_stump_shade",
  tooth_shade: "fixed_shade_trio",
};

/** Map each fixed field step to the advance_field name patterns that must be present */
const FIXED_STEP_ADVANCE_FIELD_PATTERNS: Record<string, (name: string) => boolean> = {
  fixed_stump_shade:       (n) => n.includes("stump") && n.includes("shade"),
  fixed_shade_trio:        (n) => (n.includes("crown") || n.includes("tooth") || n.includes("incisal") || n.includes("cervical") || n.includes("body")) && n.includes("shade"),
  fixed_characterization:  (n) => n.includes("characterization"),
  fixed_contact_icons:     (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure") || (n.includes("proximal") && n.includes("contact")),
  fixed_margin:            (n) => n.includes("margin"),
  fixed_metal:             (n) => n.includes("metal"),
  fixed_proximal_contact:  (n) => n.includes("proximal") && n.includes("contact"),
};

/**
 * Build the fixed-field chain for a specific product, skipping steps whose
 * corresponding advance_fields are not returned by the API.
 * Steps with no pattern (stage, impression, addons, notes) are always included.
 */
export function getFixedFieldChain(
  advanceFields: ProductAdvanceField[] | undefined
): readonly (typeof FIXED_FIELD_STEPS)[number][] {
  if (!advanceFields || advanceFields.length === 0) {
    // No advance_fields — only include steps that don't require matching advance_fields
    // (stage, impression, addons are always shown; characterization, margin, metal, notes are skipped)
    return FIXED_FIELD_STEPS.filter((step) => !FIXED_STEP_ADVANCE_FIELD_PATTERNS[step]);
  }

  const normalizedNames = advanceFields.map((f) => (f.name ?? "").toLowerCase().trim());

  return FIXED_FIELD_STEPS.filter((step) => {
    const pattern = FIXED_STEP_ADVANCE_FIELD_PATTERNS[step];
    if (!pattern) return true; // no gate — always show (stage, impression, addons, notes)
    return normalizedNames.some(pattern);
  });
}

/** Key format: "maxillary_4" or "mandibular_20" */
function toothKey(arch: Arch, toothNumber: number) {
  return `${arch}_${toothNumber}`;
}

/**
 * Tracks per-tooth field progress for Prep/Pontic retention types.
 * Each tooth that has Prep or Pontic tracks which fields have been completed
 * and which step is currently visible.
 */
export function useToothFieldProgress() {
  // Maps tooth key -> set of completed field steps
  const [completedFields, setCompletedFields] = useState<
    Record<string, Set<FieldStep>>
  >({});

  // Maps tooth key -> field values (so we know what user entered)
  const [fieldValues, setFieldValues] = useState<
    Record<string, Record<string, string>>
  >({});

  // Maps tooth key -> selected product from API
  const [toothProducts, setToothProducts] = useState<
    Record<string, ProductApiData>
  >({});

  // Tracks which tooth keys are currently loading product data
  const [loadingProducts, setLoadingProducts] = useState<
    Record<string, boolean>
  >({});

  // Maps tooth key -> the AddedProduct card ID that "owns" this tooth (0 = initial product)
  const [toothProductCardMap, setToothProductCardMap] = useState<
    Record<string, number>
  >({});

  /** Get the current visible step index for a tooth within a given chain */
  const getVisibleStepCount = useCallback(
    (arch: Arch, toothNumber: number, chain: readonly FieldStep[] = FIELD_STEPS): number => {
      const key = toothKey(arch, toothNumber);
      const completed = completedFields[key];
      if (!completed) return 1; // Show first field by default

      // Count consecutive completed (or optional) fields from the start of the chain
      let count = 0;
      for (const step of chain) {
        if (completed.has(step) || OPTIONAL_STEPS.has(step)) {
          count++;
        } else {
          break;
        }
      }
      // Show completed fields + the next one
      return Math.min(count + 1, chain.length);
    },
    [completedFields]
  );

  /** Mark a field step as completed for a tooth */
  const completeFieldStep = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep, value: string) => {
      const key = toothKey(arch, toothNumber);
      setCompletedFields((prev) => {
        const existing = prev[key] || new Set<FieldStep>();
        const updated = new Set(existing);
        updated.add(step);
        return { ...prev, [key]: updated };
      });
      setFieldValues((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), [step]: value },
      }));
    },
    []
  );

  /** Store a field value WITHOUT marking the step as completed.
   *  Use this for partial progress (e.g. filling 1 of 4 sub-fields). */
  const storeFieldValue = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep, value: string) => {
      const key = toothKey(arch, toothNumber);
      setFieldValues((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), [step]: value },
      }));
    },
    []
  );

  /** Remove a step from completed fields (un-complete it).
   *  Use when a previously-completed step becomes incomplete (e.g. sub-field cleared). */
  const uncompleteFieldStep = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep) => {
      const key = toothKey(arch, toothNumber);
      setCompletedFields((prev) => {
        const existing = prev[key];
        if (!existing || !existing.has(step)) return prev;
        const updated = new Set(existing);
        updated.delete(step);
        return { ...prev, [key]: updated };
      });
    },
    []
  );

  /** Check if a specific field step is completed */
  const isFieldCompleted = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep): boolean => {
      const key = toothKey(arch, toothNumber);
      return completedFields[key]?.has(step) ?? false;
    },
    [completedFields]
  );

  /** Get the value for a field */
  const getFieldValue = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep): string => {
      const key = toothKey(arch, toothNumber);
      return fieldValues[key]?.[step] ?? "";
    },
    [fieldValues]
  );

  /** Check if a field step should be visible (based on previous steps being completed).
   *  Automatically selects the correct chain (prep/pontic vs fixed restoration).
   *  Pass a custom fixedChain (from getFixedFieldChain) to filter steps by product advance_fields. */
  const isFieldVisible = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep, fixedChain?: readonly string[]): boolean => {
      const isFixedStep = (FIXED_FIELD_STEPS as readonly string[]).includes(step);
      const chain = isFixedStep ? (fixedChain ?? FIXED_FIELD_STEPS) : FIELD_STEPS;
      // If the step isn't in the (possibly filtered) chain, it should not be shown
      const stepIndex = (chain as readonly string[]).indexOf(step);
      if (stepIndex === -1) return false;
      const visibleCount = getVisibleStepCount(arch, toothNumber, chain as readonly FieldStep[]);
      return stepIndex < visibleCount;
    },
    [getVisibleStepCount]
  );

  /** Set the selected product for a tooth */
  const setToothProduct = useCallback(
    (arch: Arch, toothNumber: number, product: ProductApiData) => {
      const key = toothKey(arch, toothNumber);
      setToothProducts((prev) => ({ ...prev, [key]: product }));
    },
    []
  );

  /** Get the selected product for a tooth */
  const getToothProduct = useCallback(
    (arch: Arch, toothNumber: number): ProductApiData | null => {
      const key = toothKey(arch, toothNumber);
      return toothProducts[key] ?? null;
    },
    [toothProducts]
  );

  /** Set loading state for a tooth's product fetch */
  const setProductLoading = useCallback(
    (arch: Arch, toothNumber: number, loading: boolean) => {
      const key = toothKey(arch, toothNumber);
      setLoadingProducts((prev) => ({ ...prev, [key]: loading }));
    },
    []
  );

  /** Check if a tooth's product is currently loading */
  const isProductLoading = useCallback(
    (arch: Arch, toothNumber: number): boolean => {
      const key = toothKey(arch, toothNumber);
      return loadingProducts[key] ?? false;
    },
    [loadingProducts]
  );

  /** Get the product card ID that owns a tooth (0 = initial product) */
  const getToothProductCard = useCallback(
    (arch: Arch, toothNumber: number): number => {
      const key = toothKey(arch, toothNumber);
      return toothProductCardMap[key] ?? 0;
    },
    [toothProductCardMap]
  );

  /** Assign a tooth to a product card */
  const setToothProductCard = useCallback(
    (arch: Arch, toothNumber: number, cardId: number) => {
      const key = toothKey(arch, toothNumber);
      setToothProductCardMap((prev) => ({ ...prev, [key]: cardId }));
    },
    []
  );

  /** Migrate field progress from one tooth to another (e.g. when the representative tooth of a Fixed Restoration group changes). */
  const migrateToothProgress = useCallback(
    (arch: Arch, fromTooth: number, toTooth: number) => {
      if (fromTooth === toTooth) return;
      const fromKey = toothKey(arch, fromTooth);
      const toKey = toothKey(arch, toTooth);

      setCompletedFields((prev) => {
        const existing = prev[fromKey];
        if (!existing) return prev;
        const { [fromKey]: _, ...rest } = prev;
        return { ...rest, [toKey]: existing };
      });
      setFieldValues((prev) => {
        const existing = prev[fromKey];
        if (!existing) return prev;
        const { [fromKey]: _, ...rest } = prev;
        return { ...rest, [toKey]: existing };
      });
      setToothProducts((prev) => {
        const existing = prev[fromKey];
        if (!existing) return prev;
        const { [fromKey]: _, ...rest } = prev;
        return { ...rest, [toKey]: existing };
      });
      setToothProductCardMap((prev) => {
        const existing = prev[fromKey];
        if (existing === undefined) return prev;
        const { [fromKey]: _, ...rest } = prev;
        return { ...rest, [toKey]: existing };
      });
    },
    []
  );

  /** Remove all progress for a tooth (when deselected) */
  const clearToothProgress = useCallback(
    (arch: Arch, toothNumber: number) => {
      const key = toothKey(arch, toothNumber);
      setCompletedFields((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
      setFieldValues((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
      setToothProducts((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
      setLoadingProducts((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
      setToothProductCardMap((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  return {
    getVisibleStepCount,
    completeFieldStep,
    storeFieldValue,
    uncompleteFieldStep,
    isFieldCompleted,
    getFieldValue,
    isFieldVisible,
    setToothProduct,
    getToothProduct,
    setProductLoading,
    isProductLoading,
    clearToothProgress,
    migrateToothProgress,
    getToothProductCard,
    setToothProductCard,
  };
}
