"use client";

import { useEffect, useRef } from "react";
import type { AddedProduct, Arch, ProductApiData } from "@/components/case-design-center/types";
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
 * On add-new-stage load, walk maxillary then mandibular and open the stage picker
 * for each arch that has a preloaded product — but only after the full product details
 * (including the stages array) have been fetched from the product API.
 */
export function useAddStageStagePrompt({
  enabled,
  addedProducts,
  maxillaryTeeth,
  mandibularTeeth,
  focusAccordion,
  handleOpenStageModal,
  isStageModalOpen,
  getToothProduct,
}: Params) {
  const queueRef = useRef<Arch[]>([]);
  const queueIndexRef = useRef(0);
  const startedRef = useRef(false);
  const awaitingCloseRef = useRef(false);
  // The arch whose stage modal we are waiting to open (pending product hydration).
  const pendingArchRef = useRef<Arch | null>(null);
  const pendingOpenedRef = useRef(false);

  const openStageForArch = (arch: Arch): boolean => {
    const ap = addedProducts.find((p) => p.arch === arch);
    if (!ap) return false;
    pendingArchRef.current = arch;
    pendingOpenedRef.current = false;
    focusAccordion(arch, addedProductSlotId(ap.id), ap.id);
    return true;
  };

  const advanceQueue = () => {
    while (queueIndexRef.current < queueRef.current.length) {
      const arch = queueRef.current[queueIndexRef.current];
      queueIndexRef.current += 1;
      if (openStageForArch(arch)) return;
    }
  };

  // Start the queue once teeth and addedProducts are ready.
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
  }, [
    enabled,
    addedProducts,
    maxillaryTeeth,
    mandibularTeeth,
  ]);

  // Watch getToothProduct for the pending arch — open the modal as soon as full
  // product details (stages) are available.
  useEffect(() => {
    if (!enabled || pendingArchRef.current === null || pendingOpenedRef.current) return;
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

  // When the modal closes, advance to the next arch in the queue.
  useEffect(() => {
    if (!enabled || !awaitingCloseRef.current) return;
    if (isStageModalOpen) return;
    awaitingCloseRef.current = false;
    pendingArchRef.current = null;
    pendingOpenedRef.current = false;
    advanceQueue();
  }, [enabled, isStageModalOpen]);
}
