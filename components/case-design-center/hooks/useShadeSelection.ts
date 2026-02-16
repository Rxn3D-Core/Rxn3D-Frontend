"use client";

import { useState } from "react";
import type { Arch, ShadeFieldType, ShadeSelectionState } from "../types";
import { shadeGuideOptions } from "../constants";

export function useShadeSelection() {
  const [shadeSelectionState, setShadeSelectionState] = useState<ShadeSelectionState>({
    arch: null,
    fieldType: null,
    productId: null,
  });

  const [selectedShades, setSelectedShades] = useState<Record<string, string>>({});
  const [selectedShadeGuide, setSelectedShadeGuide] = useState<string>("Vita Classical");
  const [showShadeGuideDropdown, setShowShadeGuideDropdown] = useState<boolean>(false);

  const handleShadeFieldClick = (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string
  ) => {
    setShadeSelectionState({ arch, fieldType, productId });
  };

  const handleShadeSelect = (shade: string) => {
    if (shadeSelectionState.arch && shadeSelectionState.fieldType && shadeSelectionState.productId) {
      const key = `${shadeSelectionState.productId}_${shadeSelectionState.arch}_${shadeSelectionState.fieldType}`;
      setSelectedShades((prev) => ({ ...prev, [key]: shade }));
      setShadeSelectionState({ arch: null, fieldType: null, productId: null });
    }
  };

  const getSelectedShade = (productId: string, arch: Arch, fieldType: ShadeFieldType) => {
    const key = `${productId}_${arch}_${fieldType}`;
    return selectedShades[key] || "";
  };

  return {
    shadeSelectionState,
    setShadeSelectionState,
    selectedShades,
    selectedShadeGuide,
    setSelectedShadeGuide,
    showShadeGuideDropdown,
    setShowShadeGuideDropdown,
    shadeGuideOptions,
    handleShadeFieldClick,
    handleShadeSelect,
    getSelectedShade,
  };
}
