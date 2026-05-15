"use client";

import { useState } from "react";
import type { Arch, ShadeFieldType, ShadeSelectionState } from "../types";
import { shadeGuideOptions } from "../constants";
import { buildShadeSelectionKey } from "../utils/shadeGuideAdvanceFields";

export function useShadeSelection() {
  const [shadeSelectionState, setShadeSelectionState] = useState<ShadeSelectionState>({
    arch: null,
    fieldType: null,
    productId: null,
    advanceFieldId: null,
    advanceFieldLabel: null,
  });

  const [selectedShades, setSelectedShades] = useState<Record<string, string>>({});
  const [selectedShadeGuide, setSelectedShadeGuide] = useState<string>("");
  const [showShadeGuideDropdown, setShowShadeGuideDropdown] = useState<boolean>(true);

  const handleShadeFieldClick = (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string,
    options?: { advanceFieldId?: number | null; advanceFieldLabel?: string | null }
  ) => {
    setShadeSelectionState({
      arch,
      fieldType,
      productId,
      advanceFieldId: options?.advanceFieldId ?? null,
      advanceFieldLabel: options?.advanceFieldLabel ?? null,
    });
  };

  const handleShadeSelect = (shade: string) => {
    if (!shadeSelectionState.arch || !shadeSelectionState.fieldType || !shadeSelectionState.productId) return;
    const key = buildShadeSelectionKey(
      shadeSelectionState.productId,
      shadeSelectionState.arch,
      shadeSelectionState.fieldType,
      shadeSelectionState.advanceFieldId
    );
    const productId = shadeSelectionState.productId;
    const arch = shadeSelectionState.arch;
    const wasStumpShade = shadeSelectionState.fieldType === "stump_shade";
    const isAdvanceFieldSelection = shadeSelectionState.advanceFieldId != null;
    const isFixedProduct = productId.startsWith("fixed_");
    setSelectedShades((prev) => {
      const next = { ...prev, [key]: shade };
      // Advance field selections: ShadeSelectionGuide handles its own state progression
      if (isAdvanceFieldSelection) {
        return next;
      }
      if (isFixedProduct) {
        // Fixed products: close when both stump + tooth shades filled
        const stumpKey = buildShadeSelectionKey(productId, arch, "stump_shade");
        const toothKey = buildShadeSelectionKey(productId, arch, "tooth_shade");
        const bothFilled = !!(next[stumpKey] && next[toothKey]);
        if (bothFilled) {
          setTimeout(() => setShadeSelectionState({ arch: null, fieldType: null, productId: null, advanceFieldId: null, advanceFieldLabel: null }), 0);
        } else if (wasStumpShade) {
          setTimeout(
            () => setShadeSelectionState({ arch, productId, fieldType: "tooth_shade", advanceFieldId: null, advanceFieldLabel: null }),
            0
          );
        }
      } else {
        // Removables / other products: only tooth_shade, auto-close after selection
        setTimeout(() => setShadeSelectionState({ arch: null, fieldType: null, productId: null, advanceFieldId: null, advanceFieldLabel: null }), 0);
      }
      return next;
    });
  };

  const getSelectedShade = (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => {
    const key = buildShadeSelectionKey(productId, arch, fieldType, advanceFieldId);
    return selectedShades[key] || "";
  };

  return {
    shadeSelectionState,
    setShadeSelectionState,
    selectedShades,
    setSelectedShades,
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
