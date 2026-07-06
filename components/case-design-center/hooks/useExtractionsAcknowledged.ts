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
import { shouldSkipLegacyDefaultExtractionAutoSelect } from "@/lib/product-default-tooth-chart";

/**
 * @param arch which arch this acknowledgement state belongs to
 * @param preloaded when true (add-new-stage / edit-slip preload), cards the user
 *   hasn't touched default to "acknowledged" so all fields show open on first load
 *   without requiring a Done click. Explicitly toggling a card off still hides it.
 */
export function useExtractionsAcknowledged(arch: Arch, preloaded = false) {
  const [acknowledgedByCard, setAcknowledgedByCard] = useState<Record<string, boolean>>({});

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

  const setExtractionsSetupComplete = useCallback(
    (cardId: number, value: boolean) => {
      setAcknowledgedByCard((prev) => ({
        ...prev,
        [removableCardAckKey(arch, cardId)]: value,
      }));
    },
    [arch]
  );

  const isFixedRetentionSetupComplete = useCallback(
    (
      product: Parameters<typeof hasRetentionOptions>[0],
      caseSubmitted?: boolean
    ) => {
      if (caseSubmitted) return true;
      if (!product || !hasRetentionOptions(product)) return true;
      if (shouldSkipLegacyDefaultExtractionAutoSelect(product as Record<string, unknown>)) {
        return true;
      }
      const ack = acknowledgedByCard[fixedRetentionAckKey(arch)];
      return ack === undefined ? preloaded : ack === true;
    },
    [arch, acknowledgedByCard, preloaded]
  );

  const setFixedRetentionSetupComplete = useCallback(
    (value: boolean) => {
      setAcknowledgedByCard((prev) => ({
        ...prev,
        [fixedRetentionAckKey(arch)]: value,
      }));
    },
    [arch]
  );

  return {
    isExtractionsSetupComplete,
    setExtractionsSetupComplete,
    isFixedRetentionSetupComplete,
    setFixedRetentionSetupComplete,
  };
}
