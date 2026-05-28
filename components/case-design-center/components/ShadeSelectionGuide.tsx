"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ToothShadeSelectionSVG } from "@/components/tooth-shade-selection-svg";
import type { Arch, ProductAdvanceField, ProductApiData, ShadeFieldType, ShadeSelectionState } from "../types";
import { getShadeGuideAdvanceFields, getShadeFieldType, getTeethShadesForSelectedGuide } from "../utils/shadeGuideAdvanceFields";
import { ShadeField } from "./fields/ShadeField";

const EMPTY_SHADE_STATE: ShadeSelectionState = {
  arch: null,
  fieldType: null,
  productId: null,
  advanceFieldId: null,
  advanceFieldLabel: null,
  fillMode: null,
};

interface ShadeSelectionGuideProps {
  arch: Arch;
  shadeSelectionState: ShadeSelectionState;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
  selectedShadeGuide: string;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  setSelectedShadeGuide: (v: string) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (productId: string, arch: Arch, fieldType: ShadeFieldType, advanceFieldId?: number | null) => string;
  handleShadeSelect: (shade: string) => void;
  /** Pass advance_fields from the active product to derive dynamic shade labels */
  advanceFields?: ProductAdvanceField[];
  /** Whether the product has_gum_shade flag (used when no advance_fields match) */
  hasGumShadeFlag?: boolean;
  /** Whether the product has_teeth_shade flag (used when no advance_fields match) */
  hasTeethShadeFlag?: boolean;
  /** Product used to resolve shade list for the SVG picker */
  productForShades?: ProductApiData | null;
}

function getShadeLabels(
  advanceFields?: ProductAdvanceField[],
  hasGumShadeFlag?: boolean,
  hasTeethShadeFlag?: boolean,
): { stumpLabel: string | null; toothLabel: string | null } {
  if (advanceFields && advanceFields.length > 0) {
    const stumpField = advanceFields.find((f) => {
      const n = (f.name || "").toLowerCase();
      return (n.includes("stump") || n.includes("gum")) && n.includes("shade");
    });
    const toothField = advanceFields.find((f) => {
      const n = (f.name || "").toLowerCase();
      return (n.includes("tooth") || n.includes("teeth") || n.includes("cervical") || n.includes("incisal") || n.includes("body") || n.includes("crown")) && n.includes("shade") && !n.includes("stump") && !n.includes("gum");
    });
    return {
      stumpLabel: stumpField ? stumpField.name : null,
      toothLabel: toothField ? toothField.name : null,
    };
  }
  return {
    stumpLabel: hasGumShadeFlag ? "Stump Shade" : null,
    toothLabel: hasTeethShadeFlag ? "Tooth Shade" : null,
  };
}

export function ShadeSelectionGuide({
  arch,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  setSelectedShadeGuide,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
  advanceFields,
  hasGumShadeFlag,
  hasTeethShadeFlag,
  productForShades,
}: ShadeSelectionGuideProps) {
  const shadeGuideFields = useMemo(
    () => getShadeGuideAdvanceFields(advanceFields),
    [advanceFields]
  );
  const hasNamedShadeGuideFields = shadeGuideFields.length > 0;
  const { stumpLabel, toothLabel } = useMemo(
    () => getShadeLabels(advanceFields, hasGumShadeFlag, hasTeethShadeFlag),
    [advanceFields, hasGumShadeFlag, hasTeethShadeFlag]
  );
  const isSequenceFill = shadeSelectionState.fillMode !== "edit";

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
  const stumpShade = getSelectedShade(productId, arch, "stump_shade");
  const toothShade = getSelectedShade(productId, arch, "tooth_shade");

  const handleShadeSelectWithAdvance = useCallback(
    (shade: string) => {
      handleShadeSelect(shade);

      if (!hasNamedShadeGuideFields || shadeSelectionState.advanceFieldId == null) {
        return;
      }

      // Edit mode: update this field only — do not walk the sequence again
      if (!isSequenceFill) {
        return;
      }

      const currentFieldId = shadeSelectionState.advanceFieldId;
      const currentFieldIndex = shadeGuideFields.findIndex((f) => f.id === currentFieldId);

      let nextField: (typeof shadeGuideFields)[number] | null = null;
      for (let i = currentFieldIndex + 1; i < shadeGuideFields.length; i++) {
        const candidate = shadeGuideFields[i];
        const fieldType = getShadeFieldType(candidate);
        const existing =
          candidate.id === currentFieldId
            ? shade
            : getSelectedShade(productId, arch, fieldType, candidate.id);
        if (!existing) {
          nextField = candidate;
          break;
        }
      }

      if (nextField) {
        setShadeSelectionState((prev) => ({
          ...prev,
          advanceFieldId: nextField.id,
          advanceFieldLabel: nextField.name,
          fieldType: getShadeFieldType(nextField),
          fillMode: "sequence",
        }));
        return;
      }

      setShadeSelectionState(EMPTY_SHADE_STATE);
    },
    [
      handleShadeSelect,
      hasNamedShadeGuideFields,
      shadeSelectionState.advanceFieldId,
      isSequenceFill,
      shadeGuideFields,
      productId,
      arch,
      getSelectedShade,
      setShadeSelectionState,
    ]
  );

  // When opened directly as tooth_shade or no stump label exists, stump shade is not required
  const toothShadeOnly = shadeSelectionState.fieldType === 'tooth_shade' || stumpLabel === null;

  // The active field is tracked by the hook; default to stump_shade if not yet set
  const activeField: ShadeFieldType = shadeSelectionState.fieldType ?? (toothShadeOnly ? 'tooth_shade' : 'stump_shade');
  const activeAdvanceFieldId = shadeSelectionState.advanceFieldId ?? null;
  const activeShade = getSelectedShade(productId, arch, activeField, activeAdvanceFieldId);

  // Next unselected advance field — used for the red prompt label when no chip is active yet
  const nextUnselectedField = hasNamedShadeGuideFields
    ? shadeGuideFields.find((f) => !getSelectedShade(productId, arch, getShadeFieldType(f), f.id)) ?? null
    : null;

  const activeFieldLabel =
    shadeSelectionState.advanceFieldLabel ||
    (activeAdvanceFieldId != null
      ? shadeGuideFields.find((field) => field.id === activeAdvanceFieldId)?.name ?? null
      : null);

  // For named shade fields: only show SVG picker once a specific field chip has been clicked
  const activeAdvanceField = activeAdvanceFieldId != null
    ? shadeGuideFields.find((f) => f.id === activeAdvanceFieldId) ?? null
    : null;
  const activeFieldIsShadeGuide = hasNamedShadeGuideFields
    ? (activeAdvanceFieldId != null && activeAdvanceField?.field_type === "shade_guide")
    : true;

  const visibleNamedShadeFields = useMemo(() => {
    if (!hasNamedShadeGuideFields) return [];

    // Edit mode: only the field being edited (avoids ambiguity with the shade picker)
    if (!isSequenceFill) {
      if (activeAdvanceFieldId != null) {
        const active = shadeGuideFields.find((field) => field.id === activeAdvanceFieldId);
        return active ? [active] : [];
      }
      return [];
    }

    // Sequence mode: show completed chips; the next empty field is the red prompt only
    return shadeGuideFields.filter((field) =>
      !!getSelectedShade(productId, arch, getShadeFieldType(field), field.id)
    );
  }, [
    hasNamedShadeGuideFields,
    isSequenceFill,
    activeAdvanceFieldId,
    shadeGuideFields,
    productId,
    arch,
    getSelectedShade,
  ]);

  const activeShadeSelection = useMemo(
    () => (activeShade ? [activeShade] : []),
    [activeShade]
  );

  const guideShades = useMemo(
    () => getTeethShadesForSelectedGuide(productForShades, selectedShadeGuide),
    [productForShades, selectedShadeGuide]
  );

  const handleNamedFieldClick = useCallback(
    (field: ProductAdvanceField) => {
      const fieldType = getShadeFieldType(field);
      const selectedShade = getSelectedShade(productId, arch, fieldType, field.id);
      setShadeSelectionState((prev) => ({
        ...prev,
        fieldType,
        advanceFieldId: field.id,
        advanceFieldLabel: field.name,
        fillMode: selectedShade ? "edit" : "sequence",
      }));
    },
    [productId, arch, getSelectedShade, setShadeSelectionState]
  );

  const renderNamedShadeField = (field: ProductAdvanceField) => {
    const fieldType = getShadeFieldType(field);
    const selectedShade = getSelectedShade(productId, arch, fieldType, field.id);
    const isActive = activeAdvanceFieldId != null && field.id === activeAdvanceFieldId;
    return (
      <ShadeField
        key={field.id}
        label={field.name}
        value={selectedShade}
        shade=""
        isActive={isActive}
        onClick={() => handleNamedFieldClick(field)}
        required
      />
    );
  };

  return (
    <div className="mb-4 p-4 bg-white min-w-0 overflow-visible relative">
      <div className="relative">
        <div className="grid grid-cols-2 gap-3 mb-3">

          {/* Shade guide selector — occupies left column of row 1 */}
          <div className="relative">
            <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${selectedShadeGuide ? 'border-[#34a853]' : 'border-[#cf0202]'}`}>
              <legend className={`text-sm px-1 leading-none ${selectedShadeGuide ? 'text-[#34a853]' : 'text-[#cf0202]'}`}>
                {selectedShadeGuide ? 'Shade guide selected' : 'Select Shade Guide'}
              </legend>
              <button
                onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-lg text-[#000000]">{selectedShadeGuide || ''}</span>
                <div className="flex items-center gap-2">
                  {selectedShadeGuide && <Check size={16} className="text-[#34a853]" />}
                  <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform ${showShadeGuideDropdown ? 'rotate-180' : ''}`} />
                </div>
              </button>
            </fieldset>

            {showShadeGuideDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-50 overflow-hidden">
                {shadeGuideOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedShadeGuide(option);
                      setShowShadeGuideDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                      selectedShadeGuide === option ? 'bg-gray-50' : ''
                    }`}
                  >
                    {selectedShadeGuide === option && (
                      <Check size={16} className="text-[#34a853]" />
                    )}
                    <span className={selectedShadeGuide === option ? 'ml-0' : 'ml-6'}>
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shade fields — flow into the same grid after the selector */}
          {selectedShadeGuide && (
            hasNamedShadeGuideFields ? (
              <>
                {visibleNamedShadeFields.map(renderNamedShadeField)}
                {(() => {
                  if (!isSequenceFill) return null;
                  const promptField =
                    activeAdvanceFieldId != null && !activeShade
                      ? activeFieldLabel
                      : activeAdvanceFieldId == null && nextUnselectedField
                        ? nextUnselectedField.name
                        : null;
                  if (!promptField) return null;
                  return (
                    <div key="prompt" className="text-[#cf0202] text-base font-medium flex items-center h-[42px]">
                      {`Select ${promptField.toLowerCase()}`}
                    </div>
                  );
                })()}
              </>
            ) : toothShadeOnly ? (
              toothShade ? (
                <div
                  className="relative border border-[#34a853] rounded h-[42px] flex items-center px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setShadeSelectionState((prev) => ({
                      ...prev,
                      fieldType: "tooth_shade",
                      fillMode: toothShade ? "edit" : "sequence",
                    }))
                  }
                >
                  <label className="absolute left-3 top-0 -translate-y-1/2 text-xs bg-white px-1 pointer-events-none text-[#34a853]">
                    {toothLabel ?? "Tooth Shade"}
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-base text-[#000000]">{toothShade}</span>
                    <Check size={16} className="text-[#34a853] ml-auto" />
                  </div>
                </div>
              ) : (
                <span
                  className="text-[#cf0202] text-base font-medium flex items-center cursor-pointer"
                  onClick={() =>
                    setShadeSelectionState((prev) => ({
                      ...prev,
                      fieldType: "tooth_shade",
                      fillMode: toothShade ? "edit" : "sequence",
                    }))
                  }
                >
                  {`Select ${(toothLabel ?? "tooth shade").toLowerCase()}`}
                </span>
              )
            ) : (
              <>
                {stumpShade ? (
                  <div
                    className="relative border border-[#34a853] rounded h-[42px] flex items-center px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setShadeSelectionState((prev) => ({
                        ...prev,
                        fieldType: "stump_shade",
                        fillMode: stumpShade ? "edit" : "sequence",
                      }))
                    }
                  >
                    <label className="absolute left-3 top-0 -translate-y-1/2 text-xs bg-white px-1 pointer-events-none text-[#34a853]">
                      {stumpLabel ?? "Stump Shade"}
                    </label>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-base text-[#000000]">{stumpShade}</span>
                      <Check size={16} className="text-[#34a853] ml-auto" />
                    </div>
                  </div>
                ) : (
                  <span
                    className="text-[#cf0202] text-base font-medium flex items-center cursor-pointer"
                    onClick={() =>
                      setShadeSelectionState((prev) => ({
                        ...prev,
                        fieldType: "stump_shade",
                        fillMode: stumpShade ? "edit" : "sequence",
                      }))
                    }
                  >
                    {`Select ${(stumpLabel ?? "stump shade").toLowerCase()}`}
                  </span>
                )}

                {stumpShade && toothLabel !== null && (
                  toothShade ? (
                    <div
                      className="relative border border-[#34a853] rounded h-[42px] flex items-center px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() =>
                    setShadeSelectionState((prev) => ({
                      ...prev,
                      fieldType: "tooth_shade",
                      fillMode: toothShade ? "edit" : "sequence",
                    }))
                  }
                    >
                      <label className="absolute left-3 top-0 -translate-y-1/2 text-xs bg-white px-1 pointer-events-none text-[#34a853]">
                        {toothLabel}
                      </label>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-base text-[#000000]">{toothShade}</span>
                        <Check size={16} className="text-[#34a853] ml-auto" />
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-[#cf0202] text-base font-medium flex items-center cursor-pointer"
                      onClick={() =>
                    setShadeSelectionState((prev) => ({
                      ...prev,
                      fieldType: "tooth_shade",
                      fillMode: toothShade ? "edit" : "sequence",
                    }))
                  }
                    >
                      {`Select ${toothLabel.toLowerCase()}`}
                    </span>
                  )
                )}
              </>
            )
          )}
        </div>

        {/* Shade SVG picker — only shown when current active field is a shade_guide type */}
        {selectedShadeGuide && activeFieldIsShadeGuide && (
          <ToothShadeSelectionSVG
            key={`${productId}-${activeAdvanceFieldId ?? activeField}-${selectedShadeGuide}`}
            selectedShades={activeShadeSelection}
            onShadeClick={handleShadeSelectWithAdvance}
            shades={guideShades}
            guideLabel={selectedShadeGuide}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
