"use client";

import { useEffect, useRef } from "react";
import type { AddedProduct, Arch, ProductApiData } from "@/components/case-design-center/types";
import { ARCH_IMPRESSION_PRODUCT_ID } from "@/components/case-design-center/utils/impressionFieldSync";
import { addedProductSlotId } from "@/components/case-design-center/utils/productAccordionFocus";

const PROMPT_ORDER: Arch[] = ["maxillary", "mandibular"];

type ArchPhase = "stage" | "impression";

type Params = {
  enabled: boolean;
  /** When true, open the stage picker for each arch before impressions. */
  promptStages: boolean;
  /** When true, open the New / No Impression choice after stage (or alone). */
  promptImpressions: boolean;
  addedProducts: AddedProduct[];
  maxillaryTeeth: number[];
  mandibularTeeth: number[];
  focusAccordion: (arch: Arch, slotId: string, cardId?: number) => void;
  handleOpenStageModal: (
    productId: string,
    arch?: Arch,
    toothNumber?: number
  ) => void;
  handleOpenImpressionModal: (
    arch: Arch,
    productId: string,
    toothNumber?: number
  ) => void;
  isStageModalOpen: boolean;
  showImpressionModal: boolean;
  /** Skip opening impression when the arch already has a confirmed choice. */
  isImpressionCompleteForArch: (arch: Arch) => boolean;
  /** Used to detect when full product details (including stages) have been loaded. */
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
};

/** True when the product data at this tooth includes a populated stages array. */
function productStagesReady(product: ProductApiData | null): boolean {
  if (!product) return false;
  // stages array exists and has at least one entry — full details are loaded
  if (Array.isArray(product.stages) && product.stages.length > 0) return true;
  // has_stage explicitly "No" or is_single_stage "Yes" → no picker needed, treat as ready
  const hasStage = String(product.has_stage ?? "").trim().toLowerCase();
  const isSingle = String(product.is_single_stage ?? "").trim().toLowerCase();
  if (hasStage === "no" || isSingle === "yes") return true;
  // advance_fields or teeth_shades present → product is hydrated from the details API
  if (Array.isArray(product.advance_fields) && product.advance_fields.length > 0) return true;
  if (Array.isArray(product.teeth_shades) && product.teeth_shades.length > 0) return true;
  return false;
}

/**
 * On add-new-stage load, walk maxillary then mandibular:
 * 1. Open stage picker (when promptStages)
 * 2. After stage closes, open New / No Impression choice (when promptImpressions)
 *
 * Stages open only after full product details (including stages) are fetched.
 */
export function useAddStageStagePrompt({
  enabled,
  promptStages,
  promptImpressions,
  addedProducts,
  maxillaryTeeth,
  mandibularTeeth,
  focusAccordion,
  handleOpenStageModal,
  handleOpenImpressionModal,
  isStageModalOpen,
  showImpressionModal,
  isImpressionCompleteForArch,
  getToothProduct,
}: Params) {
  const queueRef = useRef<Arch[]>([]);
  const queueIndexRef = useRef(0);
  const startedRef = useRef(false);
  const phaseRef = useRef<ArchPhase>("stage");
  const awaitingCloseRef = useRef(false);
  // The arch whose modal we are waiting to open (pending product hydration).
  const pendingArchRef = useRef<Arch | null>(null);
  const pendingOpenedRef = useRef(false);

  const openStageForArch = (arch: Arch): boolean => {
    const ap = addedProducts.find((p) => p.arch === arch);
    if (!ap) return false;
    phaseRef.current = "stage";
    pendingArchRef.current = arch;
    pendingOpenedRef.current = false;
    focusAccordion(arch, addedProductSlotId(ap.id), ap.id);
    return true;
  };

  const openImpressionForArch = (arch: Arch): boolean => {
    if (isImpressionCompleteForArch(arch)) return false;
    const ap = addedProducts.find((p) => p.arch === arch);
    if (!ap) return false;
    const archTeeth = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth;
    const repTn = archTeeth[0] ?? (arch === "maxillary" ? 1 : 17);
    phaseRef.current = "impression";
    pendingArchRef.current = arch;
    pendingOpenedRef.current = true;
    focusAccordion(arch, addedProductSlotId(ap.id), ap.id);
    handleOpenImpressionModal(arch, ARCH_IMPRESSION_PRODUCT_ID, repTn);
    awaitingCloseRef.current = true;
    return true;
  };

  const advanceQueue = () => {
    while (queueIndexRef.current < queueRef.current.length) {
      const arch = queueRef.current[queueIndexRef.current];
      queueIndexRef.current += 1;
      if (promptStages) {
        if (openStageForArch(arch)) return;
        // No product for stage — still try impressions for this arch.
        if (promptImpressions && openImpressionForArch(arch)) return;
        continue;
      }
      if (promptImpressions && openImpressionForArch(arch)) return;
    }
  };

  const afterStageClosed = (arch: Arch) => {
    if (promptImpressions && openImpressionForArch(arch)) return;
    advanceQueue();
  };

  // Start the queue once teeth and addedProducts are ready.
  useEffect(() => {
    if (!enabled || startedRef.current) return;
    if (!promptStages && !promptImpressions) return;
    if (addedProducts.length === 0) return;
    if (maxillaryTeeth.length === 0 && mandibularTeeth.length === 0) return;

    startedRef.current = true;
    queueRef.current = PROMPT_ORDER.filter((arch) =>
      addedProducts.some((p) => p.arch === arch)
    );
    queueIndexRef.current = 0;
    advanceQueue();
  }, [
    enabled,
    promptStages,
    promptImpressions,
    addedProducts,
    maxillaryTeeth,
    mandibularTeeth,
  ]);

  // Watch getToothProduct for the pending arch — open the stage modal as soon as full
  // product details (stages) are available.
  useEffect(() => {
    if (!enabled || pendingArchRef.current === null || pendingOpenedRef.current) return;
    if (phaseRef.current !== "stage") return;
    const arch = pendingArchRef.current;
    const archTeeth = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth;
    const repTn = archTeeth[0] ?? (arch === "maxillary" ? 1 : 17);
    const product = getToothProduct(arch, repTn);
    if (!productStagesReady(product)) return; // wait for next render

    pendingOpenedRef.current = true;
    const productKey = `${arch}_prep_${repTn}`;
    handleOpenStageModal(productKey, arch, repTn);
    awaitingCloseRef.current = true;
  }, [
    enabled,
    getToothProduct,
    maxillaryTeeth,
    mandibularTeeth,
    handleOpenStageModal,
  ]);

  // When the stage modal closes, ask impressions for that arch (or advance).
  useEffect(() => {
    if (!enabled || !awaitingCloseRef.current) return;
    if (phaseRef.current !== "stage") return;
    if (isStageModalOpen) return;
    awaitingCloseRef.current = false;
    const arch = pendingArchRef.current;
    pendingArchRef.current = null;
    pendingOpenedRef.current = false;
    if (arch) afterStageClosed(arch);
    else advanceQueue();
  }, [enabled, isStageModalOpen]);

  // When the impression modal closes, advance to the next arch.
  useEffect(() => {
    if (!enabled || !awaitingCloseRef.current) return;
    if (phaseRef.current !== "impression") return;
    if (showImpressionModal) return;
    awaitingCloseRef.current = false;
    pendingArchRef.current = null;
    pendingOpenedRef.current = false;
    advanceQueue();
  }, [enabled, showImpressionModal]);
}
