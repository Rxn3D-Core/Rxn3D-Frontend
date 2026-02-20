"use client";

import { useState, useCallback, useRef } from "react";
import type { CaseDesignProps, Arch, RetentionType, ProductApiData } from "../types";
import { productImpressionsToModalOptions } from "../types";
import { mockImpressions } from "../constants";
import { useToothSelection } from "./useToothSelection";
import { useShadeSelection } from "./useShadeSelection";
import { useModalState } from "./useModalState";
import { useProductManagement } from "./useProductManagement";
import { useImplantState } from "./useImplantState";
import { useToothFieldProgress, FIXED_SHADE_FIELD_TO_STEP } from "./useToothFieldProgress";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/** Fetch full product details (stages, impressions, gum_shades, etc.) */
async function fetchProductDetails(productId: number, customerId: number): Promise<ProductApiData | null> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const url = new URL(`/v1/library/products/${productId}`, API_BASE_URL);
    url.searchParams.set("lang", "en");
    url.searchParams.set("customer_id", String(customerId));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export function useCaseDesignState(props: CaseDesignProps) {
  // Expansion states
  const [expandedCard, setExpandedCard] = useState(true);
  const [expandedLeft, setExpandedLeft] = useState(true);
  const [expandedLeft2, setExpandedLeft2] = useState(false);
  const [expandedRight2, setExpandedRight2] = useState(false);
  // Prep/Pontic cards (maxillary): which tooth cards are expanded. Default open (true).
  const [expandedPrepPontic, setExpandedPrepPontic] = useState<Record<number, boolean>>({});

  const togglePrepPonticExpanded = (toothNumber: number) => {
    setExpandedPrepPontic((prev) => ({ ...prev, [toothNumber]: !(prev[toothNumber] !== false) }));
  };
  const isPrepPonticExpanded = (toothNumber: number) => expandedPrepPontic[toothNumber] !== false;
  const [showMaxillary, setShowMaxillary] = useState(true);
  const [showMandibular, setShowMandibular] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const teeth = useToothSelection();
  const shades = useShadeSelection();
  const modals = useModalState();
  const products = useProductManagement();
  const implants = useImplantState();
  const toothFieldProgress = useToothFieldProgress();

  // Cache product data so we only fetch from API once
  const cachedProductRef = useRef<{ productId: number; data: ProductApiData } | null>(null);

  // Fetch and assign product details when retention type is selected
  const fetchAndAssignProduct = useCallback(
    async (arch: Arch, toothNumber: number, productId: number) => {
      // If we already fetched this product, reuse the cached data
      if (cachedProductRef.current && cachedProductRef.current.productId === productId) {
        toothFieldProgress.setToothProduct(arch, toothNumber, cachedProductRef.current.data);
        return;
      }

      const role = localStorage.getItem("role");
      const customerId = Number(
        role === "office_admin" || role === "doctor"
          ? localStorage.getItem("selectedLabId")
          : localStorage.getItem("customerId")
      ) || 1;

      toothFieldProgress.setProductLoading(arch, toothNumber, true);
      const product = await fetchProductDetails(productId, customerId);
      if (product) {
        cachedProductRef.current = { productId, data: product };
        toothFieldProgress.setToothProduct(arch, toothNumber, product);
      }
      toothFieldProgress.setProductLoading(arch, toothNumber, false);
    },
    [toothFieldProgress]
  );

  // Wrap handleSelectRetentionType to auto-assign product for Prep/Pontic/Implant
  const originalHandleSelectRetentionType = teeth.handleSelectRetentionType;
  const handleSelectRetentionType = (arch: Arch, toothNumber: number, type: RetentionType) => {
    originalHandleSelectRetentionType(arch, toothNumber, type);

    if (type === "Prep" || type === "Pontic" || type === "Implant") {
      // Check if already toggling off (deselecting)
      const currentTypes = arch === "maxillary"
        ? teeth.maxillaryRetentionTypes[toothNumber]
        : teeth.mandibularRetentionTypes[toothNumber];
      const isDeselecting = currentTypes?.includes(type);

      if (!isDeselecting && props.selectedProductId) {
        fetchAndAssignProduct(arch, toothNumber, props.selectedProductId);
      }
    }
  };

  // When user selects a shade, mark the corresponding fixed advance-field step completed so the next field shows (dynamic for all shade steps)
  const handleShadeSelect = useCallback(
    (shade: string) => {
      const { arch, fieldType, productId } = shades.shadeSelectionState;
      shades.handleShadeSelect(shade);
      if (!arch || !productId || !fieldType) return;
      const match = productId.match(/^fixed_(\d+)$/);
      if (!match) return;
      const toothNumber = parseInt(match[1], 10);
      const step = FIXED_SHADE_FIELD_TO_STEP[fieldType];
      if (step) {
        toothFieldProgress.completeFieldStep(arch, toothNumber, step, shade);
      }
    },
    [shades.shadeSelectionState, shades.handleShadeSelect, toothFieldProgress.completeFieldStep]
  );

  // Use product impressions from get product response when toothNumber provided; otherwise fall back to modal's mock-based resolution
  const getImpressionDisplayText = useCallback(
    (productId: string, arch: Arch, toothNumber?: number) => {
      const product = toothNumber != null ? toothFieldProgress.getToothProduct(arch, toothNumber) : null;
      const options = productImpressionsToModalOptions(product?.impressions);
      const list = options.length > 0 ? options : mockImpressions;
      const prefix = `${productId}_${arch}_`;
      const entries = Object.entries(modals.selectedImpressions).filter(
        ([key, qty]) => key.startsWith(prefix) && qty > 0
      );
      if (entries.length === 0) return "";
      return entries
        .map(([key, qty]) => {
          const identifier = key.replace(prefix, "");
          const impression = list.find((i) => i.value === identifier);
          return `${qty}x ${impression?.name || identifier}`;
        })
        .join(", ");
    },
    [toothFieldProgress, modals.selectedImpressions]
  );

  return {
    // Expansion
    expandedCard,
    setExpandedCard,
    expandedLeft,
    setExpandedLeft,
    expandedLeft2,
    setExpandedLeft2,
    expandedRight2,
    setExpandedRight2,
    expandedPrepPontic,
    togglePrepPonticExpanded,
    isPrepPonticExpanded,
    showMaxillary,
    setShowMaxillary,
    showMandibular,
    setShowMandibular,
    showDetails,
    setShowDetails,
    // Composed hooks
    ...teeth,
    handleSelectRetentionType, // Override with wrapped version
    ...shades,
    handleShadeSelect, // Override: mark fixed_stump_shade completed when shade is selected so next fields show
    ...modals,
    getImpressionDisplayText, // Override: use product impressions when toothNumber provided
    ...products,
    ...implants,
    ...toothFieldProgress,
    fetchAndAssignProduct,
    // Props pass-through
    ...props,
  };
}
