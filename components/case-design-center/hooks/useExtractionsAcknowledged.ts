"use client";

import { useCallback, useRef, useState } from "react";
import type { AddedProduct, Arch } from "../types";
import { hasRetentionOptions } from "../utils/categoryHelpers";
import { ARCH_SHARED_REMOVABLE_ACK_CARD_ID } from "../utils/archSharedRemovable";
import {
  fixedRetentionAckKey,
  removableCardAckKey,
  requiresExtractionsAcknowledgement,
  type ExtractionLike,
} from "../utils/extractionHelpers";

/**
 * @param arch which arch this acknowledgement state belongs to
 * @param preloaded when true (add-new-stage / edit-slip preload), cards that
 *   already existed on load default to "acknowledged" so their fields stay open.
 *   Products added later on the empty arch still require tooth selection + Done.
 * @param addedProducts snapshot of cards present when the hook first runs; new
 *   cards appended after that are not treated as preloaded.
 * @param preloadedToothCounts teeth-per-card from the slip preload map. Empty
 *   preloaded cards seed Done=false so selecting the first tooth cannot open
 *   stage/grade before the tooth-chart Done click.
 */
export function useExtractionsAcknowledged(
  arch: Arch,
  preloaded = false,
  addedProducts?: ReadonlyArray<Pick<AddedProduct, "id" | "arch">>,
  preloadedToothCounts?: Readonly<Record<number, number>>
) {
  const preloadedCardIdsRef = useRef<Set<number> | null>(null);
  if (preloadedCardIdsRef.current === null) {
    const hasExistingCards = (addedProducts?.length ?? 0) > 0;
    if (!preloaded || hasExistingCards) {
      const ids = new Set<number>([0, ARCH_SHARED_REMOVABLE_ACK_CARD_ID]);
      if (preloaded) {
        for (const product of addedProducts ?? []) {
          if (!product.arch || product.arch === arch || product.arch === "both") {
            ids.add(product.id);
          }
        }
      }
      preloadedCardIdsRef.current = ids;
    }
  }

  const isPreloadedCard = useCallback(
    (cardId: number) => {
      if (!preloaded) return false;
      // Bootstrap has not hydrated yet — keep existing cards open, don't flash Done.
      if (preloadedCardIdsRef.current === null) return true;
      return preloadedCardIdsRef.current.has(cardId);
    },
    [preloaded]
  );

  const [acknowledgedByCard, setAcknowledgedByCard] = useState<Record<string, boolean>>(
    () => {
      if (!preloaded || !preloadedToothCounts) return {};
      const init: Record<string, boolean> = {};
      const cardIds = new Set<number>([0, ...(preloadedCardIdsRef.current ?? [])]);
      for (const id of Object.keys(preloadedToothCounts).map(Number)) {
        cardIds.add(id);
      }
      for (const cardId of cardIds) {
        if (cardId === ARCH_SHARED_REMOVABLE_ACK_CARD_ID) continue;
        const hasTeeth = (preloadedToothCounts[cardId] ?? 0) > 0;
        // Empty chart → must click Done after selecting teeth.
        // Chart already has teeth → treat as Done so saved fields stay open.
        init[removableCardAckKey(arch, cardId)] = hasTeeth;
        init[fixedRetentionAckKey(arch, cardId)] = hasTeeth;
      }
      return init;
    }
  );
  /**
   * Sticky unlock for grade/stage/shade/impression. Once the user clicks Done the
   * first time, fields stay visible even if Done is later reset so they can edit
   * teeth — avoids remounting and re-prompting already-selected values.
   */
  const [fieldsUnlockedByCard, setFieldsUnlockedByCard] = useState<Record<string, boolean>>(
    () => {
      if (!preloaded || !preloadedToothCounts) return {};
      const init: Record<string, boolean> = {};
      for (const [idStr, count] of Object.entries(preloadedToothCounts)) {
        if ((count ?? 0) <= 0) continue;
        const cardId = Number(idStr);
        init[removableCardAckKey(arch, cardId)] = true;
        init[fixedRetentionAckKey(arch, cardId)] = true;
      }
      return init;
    }
  );

  const isExtractionsSetupComplete = useCallback(
    (
      extractions: ReadonlyArray<ExtractionLike> | undefined | null,
      cardId: number,
      caseSubmitted?: boolean
    ) => {
      if (caseSubmitted) return true;
      if (!requiresExtractionsAcknowledgement(extractions)) return true;
      const ack = acknowledgedByCard[removableCardAckKey(arch, cardId)];
      if (ack !== undefined) return ack === true;
      return isPreloadedCard(cardId);
    },
    [arch, acknowledgedByCard, isPreloadedCard]
  );

  /** True only after the user (or preload-with-teeth seed) set Done — not the empty-card default. */
  const hasExplicitExtractionsAck = useCallback(
    (cardId: number) => acknowledgedByCard[removableCardAckKey(arch, cardId)] === true,
    [arch, acknowledgedByCard]
  );

  const areRemovableFieldsUnlocked = useCallback(
    (cardId: number) => {
      if (fieldsUnlockedByCard[removableCardAckKey(arch, cardId)] === true) return true;
      // Preloaded cards that already had teeth stay unlocked; empty charts do not.
      if (isPreloadedCard(cardId) && (preloadedToothCounts?.[cardId] ?? 0) > 0) return true;
      return false;
    },
    [arch, fieldsUnlockedByCard, isPreloadedCard, preloadedToothCounts]
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
      if (ack !== undefined) return ack === true;
      return isPreloadedCard(cardId);
    },
    [arch, acknowledgedByCard, isPreloadedCard]
  );

  const hasExplicitFixedRetentionAck = useCallback(
    (cardId: number) => acknowledgedByCard[fixedRetentionAckKey(arch, cardId)] === true,
    [arch, acknowledgedByCard]
  );

  /**
   * Sticky unlock for fixed stage/grade/shade/impression. Once Done is clicked
   * (or the card was preloaded with teeth), fields stay unlocked.
   */
  const areFixedFieldsUnlocked = useCallback(
    (cardId: number) => {
      if (fieldsUnlockedByCard[fixedRetentionAckKey(arch, cardId)] === true) return true;
      if (isPreloadedCard(cardId) && (preloadedToothCounts?.[cardId] ?? 0) > 0) return true;
      return false;
    },
    [arch, fieldsUnlockedByCard, isPreloadedCard, preloadedToothCounts]
  );

  const setFixedRetentionSetupComplete = useCallback(
    (value: boolean, cardId = 0) => {
      const key = fixedRetentionAckKey(arch, cardId);
      setAcknowledgedByCard((prev) => ({
        ...prev,
        [key]: value,
      }));
      if (value) {
        setFieldsUnlockedByCard((prev) =>
          prev[key] === true ? prev : { ...prev, [key]: true }
        );
      }
    },
    [arch]
  );

  return {
    isExtractionsSetupComplete,
    setExtractionsSetupComplete,
    hasExplicitExtractionsAck,
    areRemovableFieldsUnlocked,
    areFixedFieldsUnlocked,
    hasExplicitFixedRetentionAck,
    isFixedRetentionSetupComplete,
    setFixedRetentionSetupComplete,
  };
}
