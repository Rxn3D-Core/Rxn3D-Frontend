"use client";

import { useCallback, useState } from "react";
import type { Arch } from "../types";
import {
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

  return { isExtractionsSetupComplete, setExtractionsSetupComplete };
}
