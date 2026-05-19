"use client";

import { useState } from "react";
import type { Arch, ShadeFieldType, ShadeSelectionState } from "../types";
import { shadeGuideOptions } from "../constants";
import { buildShadeSelectionKey, isFixedProductShadeStorageId } from "../utils/shadeGuideAdvanceFields";

export function useShadeSelection() {
  const emptyShadeSelectionState = (): ShadeSelectionState => ({
    arch: null,
    fieldType: null,
    productId: null,
    advanceFieldId: null,
    advanceFieldLabel: null,
    fillMode: null,
  });

  const [shadeSelectionState, setShadeSelectionState] = useState<ShadeSelectionState>(
    emptyShadeSelectionState
  );

  const [selectedShades, setSelectedShades] = useState<Record<string, string>>({});
  const [selectedShadeGuide, setSelectedShadeGuide] = useState<string>("");
  const [showShadeGuideDropdown, setShowShadeGuideDropdown] = useState<boolean>(true);

  const readSelectedShade = (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => {
    const key = buildShadeSelectionKey(productId, arch, fieldType, advanceFieldId);
    return selectedShades[key] || "";
  };

  const handleShadeFieldClick = (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string,
    options?: {
      advanceFieldId?: number | null;
      advanceFieldLabel?: string | null;
      fillMode?: ShadeSelectionState["fillMode"];
      storageToothNumber?: number | null;
    }
  ) => {
    const advanceFieldId = options?.advanceFieldId ?? null;
    const existing = readSelectedShade(productId, arch, fieldType, advanceFieldId);
    setShadeSelectionState({
      arch,
      fieldType,
      productId,
      advanceFieldId,
      advanceFieldLabel: options?.advanceFieldLabel ?? null,
      fillMode: options?.fillMode ?? (existing ? "edit" : "sequence"),
      storageToothNumber: options?.storageToothNumber ?? null,
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
    const isFixedProduct = isFixedProductShadeStorageId(productId);
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
          setTimeout(() => setShadeSelectionState(emptyShadeSelectionState()), 0);
        } else if (wasStumpShade) {
          setTimeout(
            () =>
              setShadeSelectionState({
                arch,
                productId,
                fieldType: "tooth_shade",
                advanceFieldId: null,
                advanceFieldLabel: null,
                fillMode: "sequence",
              }),
            0
          );
        }
      } else {
        // Removables / other products: only tooth_shade, auto-close after selection
        setTimeout(() => setShadeSelectionState(emptyShadeSelectionState()), 0);
      }
      return next;
    });
  };

  const getSelectedShade = readSelectedShade;

  /** Copy shade keys from a legacy fixed_NN id to fixed_p_{productId} (same arch). */
  const migrateFixedShadeProductId = (
    fromProductId: string,
    toProductId: string,
    arch: Arch
  ) => {
    if (!fromProductId || !toProductId || fromProductId === toProductId) return;
    setSelectedShades((prev) => {
      const prefix = `${fromProductId}_${arch}_`;
      let changed = false;
      const next = { ...prev };
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(prefix)) continue;
        const newKey = `${toProductId}${key.slice(fromProductId.length)}`;
        if (next[newKey] == null || next[newKey] === "") {
          next[newKey] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setShadeSelectionState((prev) => {
      if (prev.arch === arch && prev.productId === fromProductId) {
        return { ...prev, productId: toProductId };
      }
      return prev;
    });
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
    migrateFixedShadeProductId,
  };
}
