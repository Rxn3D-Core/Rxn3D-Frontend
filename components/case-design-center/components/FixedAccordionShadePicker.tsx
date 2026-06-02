"use client";

import { useEffect, useMemo } from "react";
import { Check } from "@/components/ui/custom-check";
import { ChevronDown } from "lucide-react";
import { ToothShadeSelectionSVG } from "@/components/tooth-shade-selection-svg";
import type { Arch, ProductApiData, ShadeFieldType, ShadeSelectionState } from "../types";
import { getTeethShadesForSelectedGuide } from "../utils/shadeGuideAdvanceFields";

interface FixedAccordionShadePickerProps {
  arch: Arch;
  shadeSelectionState: ShadeSelectionState;
  selectedShadeGuide: string;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  setSelectedShadeGuide: (v: string) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string;
  onShadeSelect: (shade: string) => void;
  productForShades?: ProductApiData | null;
}

export function FixedAccordionShadePicker({
  arch,
  shadeSelectionState,
  selectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  setSelectedShadeGuide,
  shadeGuideOptions,
  getSelectedShade,
  onShadeSelect,
  productForShades,
}: FixedAccordionShadePickerProps) {
  useEffect(() => {
    if (!shadeGuideOptions.length) return;

    const matchingOption = selectedShadeGuide
      ? shadeGuideOptions.find(
          (option) => option.trim().toLowerCase() === selectedShadeGuide.trim().toLowerCase()
        ) ?? null
      : null;

    if (matchingOption) {
      if (matchingOption !== selectedShadeGuide) {
        setSelectedShadeGuide(matchingOption);
      }
      setShowShadeGuideDropdown(false);
      return;
    }

    if (shadeGuideOptions.length === 1 && !selectedShadeGuide) {
      setSelectedShadeGuide(shadeGuideOptions[0]);
      setShowShadeGuideDropdown(false);
    }
  }, [shadeGuideOptions, selectedShadeGuide, setSelectedShadeGuide, setShowShadeGuideDropdown]);

  const productId = shadeSelectionState.productId || "";
  const fieldType = shadeSelectionState.fieldType;
  const advanceFieldId = shadeSelectionState.advanceFieldId ?? null;
  const activeShade =
    fieldType != null
      ? getSelectedShade(productId, arch, fieldType, advanceFieldId)
      : "";

  const activeShadeSelection = useMemo(
    () => (activeShade ? [activeShade] : []),
    [activeShade]
  );

  const guideShades = useMemo(
    () => getTeethShadesForSelectedGuide(productForShades, selectedShadeGuide),
    [productForShades, selectedShadeGuide]
  );

  const activeLabel = shadeSelectionState.advanceFieldLabel || "Shade";

  if (!fieldType) return null;

  return (
    <div className="mt-3 border border-[#1162A8] rounded-lg p-4 bg-white min-w-0 overflow-visible">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="relative">
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
              selectedShadeGuide ? "border-[#34a853]" : "border-[#cf0202]"
            }`}
          >
            <legend
              className={`text-sm px-1 leading-none ${
                selectedShadeGuide ? "text-[#34a853]" : "text-[#cf0202]"
              }`}
            >
              {selectedShadeGuide ? "Shade guide selected" : "Select Shade Guide"}
            </legend>
            <button
              type="button"
              onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-lg text-[#000000]">{selectedShadeGuide || ""}</span>
              <div className="flex items-center gap-2">
                {selectedShadeGuide && <Check size={16} className="text-[#34a853]" />}
                <ChevronDown
                  size={16}
                  className={`text-[#7f7f7f] transition-transform ${
                    showShadeGuideDropdown ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
          </fieldset>

          {showShadeGuideDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-50 overflow-hidden">
              {shadeGuideOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSelectedShadeGuide(option);
                    setShowShadeGuideDropdown(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    selectedShadeGuide === option ? "bg-gray-50" : ""
                  }`}
                >
                  {selectedShadeGuide === option && (
                    <Check size={16} className="text-[#34a853]" />
                  )}
                  <span className={selectedShadeGuide === option ? "ml-0" : "ml-6"}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedShadeGuide && (
          <div className="flex flex-col justify-center min-h-[42px]">
            <span className="text-sm text-[#7f7f7f]">Editing</span>
            <span className="text-base font-semibold text-[#1162A8]">{activeLabel}</span>
            {activeShade && (
              <span className="text-sm text-[#000000]">Current: {activeShade}</span>
            )}
          </div>
        )}
      </div>

      {selectedShadeGuide && (
        <ToothShadeSelectionSVG
          key={`${productId}-${advanceFieldId ?? fieldType}-${selectedShadeGuide}`}
          selectedShades={activeShadeSelection}
          onShadeClick={onShadeSelect}
          shades={guideShades}
          guideLabel={selectedShadeGuide}
          className="w-full"
        />
      )}
    </div>
  );
}