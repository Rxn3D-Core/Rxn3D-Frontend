"use client";

import { useEffect, useRef } from "react";
import type { AddedProduct, Arch } from "@/components/case-design-center/types";
import {
  addedProductSlotId,
} from "@/components/case-design-center/utils/productAccordionFocus";

const PROMPT_ORDER: Arch[] = ["maxillary", "mandibular"];

type Params = {
  enabled: boolean;
  addedProducts: AddedProduct[];
  maxillaryTeeth: number[];
  mandibularTeeth: number[];
  focusAccordion: (arch: Arch, slotId: string, cardId?: number) => void;
  handleOpenStageModal: (
    productId: string,
    arch?: Arch,
    toothNumber?: number
  ) => void;
  isStageModalOpen: boolean;
};

/**
 * On add-new-stage load, walk maxillary then mandibular and open the stage picker
 * for each arch that has a preloaded product.
 */
export function useAddStageStagePrompt({
  enabled,
  addedProducts,
  maxillaryTeeth,
  mandibularTeeth,
  focusAccordion,
  handleOpenStageModal,
  isStageModalOpen,
}: Params) {
  const queueRef = useRef<Arch[]>([]);
  const queueIndexRef = useRef(0);
  const startedRef = useRef(false);
  const awaitingCloseRef = useRef(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openStageForArch = (arch: Arch) => {
    const ap = addedProducts.find((p) => p.arch === arch);
    if (!ap) return false;

    focusAccordion(arch, addedProductSlotId(ap.id), ap.id);

    const teeth = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth;
    const repTn = teeth[0] ?? (arch === "maxillary" ? 1 : 17);
    const productKey = `${arch}_prep_${repTn}`;

    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => {
      handleOpenStageModal(productKey, arch, repTn);
      awaitingCloseRef.current = true;
    }, 200);
    return true;
  };

  const advanceQueue = () => {
    while (queueIndexRef.current < queueRef.current.length) {
      const arch = queueRef.current[queueIndexRef.current];
      queueIndexRef.current += 1;
      if (openStageForArch(arch)) return;
    }
  };

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    if (addedProducts.length === 0) return;
    if (maxillaryTeeth.length === 0 && mandibularTeeth.length === 0) return;

    startedRef.current = true;
    queueRef.current = PROMPT_ORDER.filter((arch) =>
      addedProducts.some((p) => p.arch === arch)
    );
    queueIndexRef.current = 0;
    advanceQueue();

    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, [
    enabled,
    addedProducts,
    maxillaryTeeth,
    mandibularTeeth,
    focusAccordion,
    handleOpenStageModal,
  ]);

  useEffect(() => {
    if (!enabled || !awaitingCloseRef.current) return;
    if (isStageModalOpen) return;
    awaitingCloseRef.current = false;
    advanceQueue();
  }, [enabled, isStageModalOpen]);
}
