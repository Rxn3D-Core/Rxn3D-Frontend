"use client";

import { useState, useCallback } from "react";
import type { Arch, RetentionType, ProductApiData } from "../types";

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

export type FieldStep = (typeof FIELD_STEPS)[number];

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

  /** Get the current visible step index for a tooth (shows up to this index) */
  const getVisibleStepCount = useCallback(
    (arch: Arch, toothNumber: number): number => {
      const key = toothKey(arch, toothNumber);
      const completed = completedFields[key];
      if (!completed) return 1; // Show first field by default

      // Count consecutive completed fields from the start
      let count = 0;
      for (const step of FIELD_STEPS) {
        if (completed.has(step)) {
          count++;
        } else {
          break;
        }
      }
      // Show completed fields + the next one
      return Math.min(count + 1, FIELD_STEPS.length);
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

  /** Check if a field step should be visible (based on previous steps being completed) */
  const isFieldVisible = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep): boolean => {
      const stepIndex = FIELD_STEPS.indexOf(step);
      const visibleCount = getVisibleStepCount(arch, toothNumber);
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
    },
    []
  );

  return {
    getVisibleStepCount,
    completeFieldStep,
    isFieldCompleted,
    getFieldValue,
    isFieldVisible,
    setToothProduct,
    getToothProduct,
    clearToothProgress,
  };
}
