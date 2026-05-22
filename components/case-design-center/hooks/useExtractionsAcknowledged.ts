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

export function useExtractionsAcknowledged(arch: Arch) {
  const [acknowledgedByCard, setAcknowledgedByCard] = useState<Record<string, boolean>>({});

  const isExtractionsSetupComplete = useCallback(
    (
      extractions: ReadonlyArray<ExtractionLike> | undefined | null,
      cardId: number,
      caseSubmitted?: boolean
    ) => {
      if (caseSubmitted) return true;
      if (!requiresExtractionsAcknowledgement(extractions)) return true;
      return acknowledgedByCard[removableCardAckKey(arch, cardId)] === true;
    },
    [arch, acknowledgedByCard]
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
      return acknowledgedByCard[fixedRetentionAckKey(arch)] === true;
    },
    [arch, acknowledgedByCard]
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
