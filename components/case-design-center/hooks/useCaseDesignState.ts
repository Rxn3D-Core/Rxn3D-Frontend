"use client";

import { useState } from "react";
import type { CaseDesignProps } from "../types";
import { useToothSelection } from "./useToothSelection";
import { useShadeSelection } from "./useShadeSelection";
import { useModalState } from "./useModalState";
import { useProductManagement } from "./useProductManagement";
import { useImplantState } from "./useImplantState";

export function useCaseDesignState(props: CaseDesignProps) {
  // Expansion states
  const [expandedCard, setExpandedCard] = useState(true);
  const [expandedLeft, setExpandedLeft] = useState(true);
  const [expandedLeft2, setExpandedLeft2] = useState(false);
  const [expandedRight2, setExpandedRight2] = useState(false);
  const [showMaxillary, setShowMaxillary] = useState(true);
  const [showMandibular, setShowMandibular] = useState(true);

  const teeth = useToothSelection();
  const shades = useShadeSelection();
  const modals = useModalState();
  const products = useProductManagement();
  const implants = useImplantState();

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
    showMaxillary,
    setShowMaxillary,
    showMandibular,
    setShowMandibular,
    // Composed hooks
    ...teeth,
    ...shades,
    ...modals,
    ...products,
    ...implants,
    // Props pass-through
    ...props,
  };
}
