"use client";

import { useState, useCallback } from "react";
import type { CaseDesignProps, Arch, RetentionType, ProductApiData } from "../types";
import { useToothSelection } from "./useToothSelection";
import { useShadeSelection } from "./useShadeSelection";
import { useModalState } from "./useModalState";
import { useProductManagement } from "./useProductManagement";
import { useImplantState } from "./useImplantState";
import { useToothFieldProgress } from "./useToothFieldProgress";

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

  // Fetch and assign product details when Prep/Pontic is selected
  const fetchAndAssignProduct = useCallback(
    async (arch: Arch, toothNumber: number, productId: number) => {
      const role = localStorage.getItem("role");
      const customerId = Number(
        role === "office_admin" || role === "doctor"
          ? localStorage.getItem("selectedLabId")
          : localStorage.getItem("customerId")
      ) || 1;

      const product = await fetchProductDetails(productId, customerId);
      if (product) {
        toothFieldProgress.setToothProduct(arch, toothNumber, product);
      }
    },
    [toothFieldProgress]
  );

  // Wrap handleSelectRetentionType to auto-fetch product for Prep/Pontic
  const originalHandleSelectRetentionType = teeth.handleSelectRetentionType;
  const handleSelectRetentionType = (arch: Arch, toothNumber: number, type: RetentionType) => {
    originalHandleSelectRetentionType(arch, toothNumber, type);

    if (type === "Prep" || type === "Pontic") {
      // Check if already toggling off (deselecting)
      const currentTypes = arch === "maxillary"
        ? teeth.maxillaryRetentionTypes[toothNumber]
        : teeth.mandibularRetentionTypes[toothNumber];
      const isDeselecting = currentTypes?.includes(type);

      if (!isDeselecting) {
        // Fetch product details from API (product ID 1 as default, will be replaced with actual selection)
        fetchAndAssignProduct(arch, toothNumber, 1);
      }
    }
  };

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
    ...modals,
    ...products,
    ...implants,
    ...toothFieldProgress,
    fetchAndAssignProduct,
    // Props pass-through
    ...props,
  };
}
