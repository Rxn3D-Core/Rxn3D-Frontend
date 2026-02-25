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
    if (!shadeSelectionState.arch || !shadeSelectionState.fieldType || !shadeSelectionState.productId) return;
    const key = `${shadeSelectionState.productId}_${shadeSelectionState.arch}_${shadeSelectionState.fieldType}`;
    const productId = shadeSelectionState.productId;
    const arch = shadeSelectionState.arch;
    const wasStumpShade = shadeSelectionState.fieldType === "stump_shade";
    const isFixedProduct = productId.startsWith("fixed_");
    setSelectedShades((prev) => {
      const next = { ...prev, [key]: shade };
      if (isFixedProduct) {
        // Fixed products: close when both stump + tooth shades filled
        const stumpKey = `${productId}_${arch}_stump_shade`;
        const toothKey = `${productId}_${arch}_tooth_shade`;
        const bothFilled = !!(next[stumpKey] && next[toothKey]);
        if (bothFilled) {
          setTimeout(() => setShadeSelectionState({ arch: null, fieldType: null, productId: null }), 0);
        } else if (wasStumpShade) {
          setTimeout(
            () => setShadeSelectionState({ arch, productId, fieldType: "tooth_shade" }),
            0
          );
        }
      } else {
        // Removables / other products: only tooth_shade, auto-close after selection
        setTimeout(() => setShadeSelectionState({ arch: null, fieldType: null, productId: null }), 0);
      }
      return next;
    });
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
