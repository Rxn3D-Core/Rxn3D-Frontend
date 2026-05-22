"use client";

import { useEffect, useRef } from "react";
import type { Arch, ShadeFieldType, ShadeSelectionState } from "../types";

/**
 * When fixed-restoration chart retention is acknowledged (Done), open the first
 * incomplete configuration step (stage modal or shade picker) once per acknowledgment.
 */
export function AutoOpenFirstFixedFieldAfterRetentionDone({
  retentionFieldsVisible,
  isExpanded,
  caseSubmitted = false,
  isStageVisible,
  isStageEmpty,
  onOpenStage,
  stageProductId,
  arch,
  stageToothNumber,
  usesAccordionShadePicker,
  firstMissingShadeField,
  fixedShadeProductId,
  storageToothNumber,
  setShadeSelectionState,
  isLegacyShadeSectionVisible,
  legacyStumpShadeEmpty,
  legacyToothShadeEmpty,
  fixedShadesComplete,
}: {
  retentionFieldsVisible: boolean;
  isExpanded: boolean;
  caseSubmitted?: boolean;
  isStageVisible: boolean;
  isStageEmpty: boolean;
  onOpenStage: (productId: string, arch: Arch, toothNumber?: number) => void;
  stageProductId: string;
  arch: Arch;
  stageToothNumber: number;
  usesAccordionShadePicker: boolean;
  firstMissingShadeField?: { id: number; name: string; fieldType: ShadeFieldType } | null;
  fixedShadeProductId: string;
  storageToothNumber: number;
  setShadeSelectionState: (
    state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)
  ) => void;
  isLegacyShadeSectionVisible: boolean;
  legacyStumpShadeEmpty: boolean;
  legacyToothShadeEmpty: boolean;
  fixedShadesComplete: boolean;
}) {
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (caseSubmitted || !retentionFieldsVisible) {
      if (!retentionFieldsVisible) hasAutoOpenedRef.current = false;
      return;
    }
    if (!isExpanded || hasAutoOpenedRef.current) return;

    if (isStageVisible && isStageEmpty) {
      hasAutoOpenedRef.current = true;
      onOpenStage(stageProductId, arch, stageToothNumber);
      return;
    }

    if (usesAccordionShadePicker && !fixedShadesComplete && firstMissingShadeField) {
      hasAutoOpenedRef.current = true;
      setShadeSelectionState({
        arch,
        productId: fixedShadeProductId,
        fieldType: firstMissingShadeField.fieldType,
        advanceFieldId: firstMissingShadeField.id,
        advanceFieldLabel: firstMissingShadeField.name,
        fillMode: "sequence",
        storageToothNumber,
      });
      return;
    }

    if (!usesAccordionShadePicker && isLegacyShadeSectionVisible && !fixedShadesComplete) {
      const hasNamedShadeFields = firstMissingShadeField !== undefined;
      const shouldOpen = hasNamedShadeFields
        ? firstMissingShadeField != null
        : legacyStumpShadeEmpty || legacyToothShadeEmpty;
      if (!shouldOpen) return;

      hasAutoOpenedRef.current = true;
      setShadeSelectionState({
        arch,
        productId: fixedShadeProductId,
        fieldType:
          firstMissingShadeField?.fieldType ?? (legacyToothShadeEmpty ? "tooth_shade" : "stump_shade"),
        advanceFieldId: firstMissingShadeField?.id ?? null,
        advanceFieldLabel: firstMissingShadeField?.name ?? null,
        fillMode: "sequence",
        storageToothNumber,
      });
    }
  }, [
    caseSubmitted,
    retentionFieldsVisible,
    isExpanded,
    isStageVisible,
    isStageEmpty,
    onOpenStage,
    stageProductId,
    arch,
    stageToothNumber,
    usesAccordionShadePicker,
    firstMissingShadeField,
    fixedShadeProductId,
    storageToothNumber,
    setShadeSelectionState,
    isLegacyShadeSectionVisible,
    legacyStumpShadeEmpty,
    legacyToothShadeEmpty,
    fixedShadesComplete,
  ]);

  return null;
}
