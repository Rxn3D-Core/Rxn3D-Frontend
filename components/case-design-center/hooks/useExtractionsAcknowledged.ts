"use client";

import { useCallback, useState } from "react";
import type { Arch } from "../types";
import { hasRetentionOptions } from "../utils/categoryHelpers";
import {
  fixedRetentionAckKey,
  removableCardAckKey,
  requiresExtractionsAcknowledgement,
  type ExtractionLike,
} from "../utils/extractionHelpers";

/**
 * @param arch which arch this acknowledgement state belongs to
 * @param preloaded when true (add-new-stage / edit-slip preload), cards the user
 *   hasn't touched default to "acknowledged" so all fields show open on first load
 *   without requiring a Done click. Explicitly toggling a card off still hides it.
 */
export function useExtractionsAcknowledged(arch: Arch, preloaded = false) {
  const [acknowledgedByCard, setAcknowledgedByCard] = useState<Record<string, boolean>>({});
  /**
   * Sticky unlock for grade/stage/shade/impression. Once the user clicks Done the
   * first time, fields stay visible even if Done is later reset so they can edit
   * teeth — avoids remounting and re-prompting already-selected values.
   */
  const [fieldsUnlockedByCard, setFieldsUnlockedByCard] = useState<Record<string, boolean>>({});

  const isExtractionsSetupComplete = useCallback(
    (
      extractions: ReadonlyArray<ExtractionLike> | undefined | null,
      cardId: number,
      caseSubmitted?: boolean
    ) => {
      if (caseSubmitted) return true;
      if (!requiresExtractionsAcknowledgement(extractions)) return true;
      const ack = acknowledgedByCard[removableCardAckKey(arch, cardId)];
      return ack === undefined ? preloaded : ack === true;
    },
    [arch, acknowledgedByCard, preloaded]
  );

  const areRemovableFieldsUnlocked = useCallback(
    (cardId: number) => {
      if (preloaded) return true;
      return fieldsUnlockedByCard[removableCardAckKey(arch, cardId)] === true;
    },
    [arch, fieldsUnlockedByCard, preloaded]
  );

  const setExtractionsSetupComplete = useCallback(
    (cardId: number, value: boolean) => {
      const key = removableCardAckKey(arch, cardId);
      setAcknowledgedByCard((prev) => ({
        ...prev,
        [key]: value,
      }));
      // First Done unlocks fields permanently for this card (tooth re-edits may
      // clear acknowledgement to show Done again, but must not re-ask for fields).
      if (value) {
        setFieldsUnlockedByCard((prev) =>
          prev[key] === true ? prev : { ...prev, [key]: true }
        );
      }
    },
    [arch]
  );

  const isFixedRetentionSetupComplete = useCallback(
    (
      product: Parameters<typeof hasRetentionOptions>[0],
      caseSubmitted?: boolean,
      cardId = 0
    ) => {
      if (caseSubmitted) return true;
      if (!product || !hasRetentionOptions(product)) return true;
      const ack = acknowledgedByCard[fixedRetentionAckKey(arch, cardId)];
      return ack === undefined ? preloaded : ack === true;
    },
    [arch, acknowledgedByCard, preloaded]
  );

  const setFixedRetentionSetupComplete = useCallback(
    (value: boolean, cardId = 0) => {
      setAcknowledgedByCard((prev) => ({
        ...prev,
        [fixedRetentionAckKey(arch, cardId)]: value,
      }));
    },
    [arch]
  );

  return {
    isExtractionsSetupComplete,
    setExtractionsSetupComplete,
    areRemovableFieldsUnlocked,
    isFixedRetentionSetupComplete,
    setFixedRetentionSetupComplete,
  };
}
