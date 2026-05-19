"use client";

import { useState, type ReactNode, type MouseEvent } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { Arch, ProductApiData, ProductExtraction, ProductGrade, ShadeFieldType } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
import { ProductImagePreview } from "./ProductImagePreview";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
import { RushIcon } from "./CenterActionIcons";
import { parseAddonDisplayItems } from "../utils/addonDisplayHelpers";
import { isSingleDefaultOnlyExtractionList } from "../utils/extractionHelpers";
import { mapOppositeExtractionsToProductExtractions } from "../utils/opposingExtractionHelpers";
import { getRemovableHeaderTitle, shouldShowRemovableHeaderContent } from "../utils/removableHeaderLabel";
import { getRemovableOrangeHeaderTeeth, getToothStatusBoxDisplayMap } from "../utils/removableToothDisplay";
import { resolveVariationDisplay } from "../utils/variationHelpers";
import { isSingleStageNoStages, shouldSkipStageSelection } from "../utils/categoryHelpers";
import { archHasActiveImpressionSelections } from "../utils/impressionFieldSync";

function isFullDentureProduct(
  extractions: Array<{ code: string; name: string; status: string }> | undefined
): boolean {
  if (!extractions || extractions.length === 0) return false;
  const active = extractions.filter((e) => e.status === "Active");
  if (active.length === 0) return false;
  const hasTim = active.some(
    (e) => e.code === "TIM" || (e.name ?? "").toLowerCase().trim() === "teeth in mouth"
  );
  if (hasTim) return false;
  return active.every(
    (e) => e.code === "MT" || (e.name ?? "").toLowerCase().trim() === "missing teeth"
  );
}

function hasAdvanceField(
  step: string,
  advanceFields: Array<{ name: string; field_type: string }> | undefined,
  product?: {
    has_impression?: "Yes" | "No" | null;
    has_teeth_shade?: string | null;
    has_gum_shade?: string | null;
    is_single_stage?: string | boolean;
    has_stage?: string | boolean;
    stages?: unknown[];
  }
): boolean {
  if ((step === "stage" || step === "fixed_stage") && shouldSkipStageSelection(product)) {
    return false;
  }
  if (step === "impression") {
    return product?.has_impression === "Yes";
  }
  const alwaysShow = ["fixed_stage", "fixed_impression", "fixed_addons", "stage", "addons"];
  if (alwaysShow.includes(step)) return true;
  if (step === "fixed_stump_shade" && (product?.has_teeth_shade === "Yes" || product?.has_gum_shade === "Yes")) {
    return true;
  }
  if (step === "fixed_shade_trio" && product?.has_teeth_shade === "Yes") return true;
  if (!advanceFields || advanceFields.length === 0) return true;
  const names = advanceFields.map((f) => (f.name || "").toLowerCase());
  switch (step) {
    case "grade":
      return names.some((n) => n.includes("grade"));
    case "teeth_shade":
      return product?.has_teeth_shade === "Yes" || names.some((n) => n.includes("teeth") && n.includes("shade"));
    case "gum_shade":
      return product?.has_gum_shade === "Yes" || names.some((n) => n.includes("gum") && n.includes("shade"));
    default:
      return names.some((n) => n.includes(step.replace(/_/g, " ")));
  }
}

function getActiveGrades(grades?: ProductGrade[]): ProductGrade[] {
  if (!grades || grades.length === 0) return [];
  return grades.filter((g) => g.status === "Active").sort((a, b) => a.sequence - b.sequence);
}

function Diamond({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 1L16.7942 9L9 17L1.20577 9L9 1Z"
        fill={filled ? "#007AFF" : "#D9D9D9"}
        stroke={filled ? "#007AFF" : "#D9D9D9"}
        strokeWidth="0.5"
      />
    </svg>
  );
}

function getGradeDiamondCount(gradeName: string, grades?: ProductGrade[]): number {
  if (!gradeName || !grades || grades.length === 0) {
    const lower = gradeName?.toLowerCase() || "";
    if (lower.includes("economy")) return 1;
    if (lower.includes("ultra")) return 4;
    if (lower.includes("premium")) return 3;
    if (lower.includes("standard")) return 2;
    return 0;
  }
  const match = grades.find((g) => g.name === gradeName || g.code === gradeName);
  return match ? match.sequence : 0;
}

function GradeHoverSelector({
  grades,
  currentGradeName,
  onSelect,
  disabled,
}: {
  grades: ProductGrade[];
  currentGradeName: string;
  onSelect: (grade: ProductGrade) => void;
  disabled?: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = grades.length > 0 ? grades.length : 4;
  const currentCount = getGradeDiamondCount(currentGradeName, grades);
  const displayCount = hoverIndex !== null ? hoverIndex + 1 : currentCount;
  const displayName =
    hoverIndex !== null
      ? grades.find((g) => g.sequence === hoverIndex + 1)?.name || currentGradeName
      : currentGradeName;

  return (
    <PanelDiv
      className="flex items-center gap-2 w-full"
      onMouseLeave={() => setHoverIndex(null)}
    >
      <span className="text-[14px] sm:text-lg text-[#000000] min-w-0 truncate">{displayName}</span>
      <div className="ml-auto flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => {
          const gradeForIndex = grades.find((g) => g.sequence === i + 1);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !gradeForIndex}
              className={`p-0 border-0 bg-transparent ${!disabled && gradeForIndex ? "cursor-pointer" : "cursor-default"} transition-transform duration-200 hover:scale-110`}
              onMouseEnter={() => {
                if (!disabled && gradeForIndex) setHoverIndex(i);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled && gradeForIndex) onSelect(gradeForIndex);
              }}
            >
              <Diamond filled={i < displayCount} />
            </button>
          );
        })}
      </div>
    </PanelDiv>
  );
}

function PanelDiv({
  className,
  children,
  onClick,
  onMouseLeave,
}: {
  className?: string;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div className={className} onClick={onClick} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}

export type OpposingRemovableAccordionProps = {
  opposingArch: Arch;
  /** Arch where product fields (grade, stage, shades, addons) are stored */
  fieldArch: Arch;
  fieldRepTn: number;
  opposingProductData: ProductApiData;
  opposingArchTeeth: number[];
  opposingToothExtractionMap: Record<number, string>;
  opposingClaspTeeth: number[];
  opposingNoActiveBoxTeeth: number[];
  opposingSelectedTeeth: number[];
  selectedImpressions: Record<string, number>;
  opposingImpressionText: string;
  confirmDetailsChecked?: boolean;
  caseSubmitted?: boolean;
  selectedStages: Record<string, string>;
  rushedProducts: Record<string, unknown>;
  isFieldVisible: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  completeFieldStep: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  handleOpenStageModal: (productId: string, arch?: Arch, toothNumber?: number) => void;
  handleShadeFieldClick: (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string
  ) => void;
  handleOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  getImpressionDisplayText: (productId: string, arch: Arch, toothNumber?: number) => string;
  setPanelGumShadePicker: (opts: {
    toothNumber: number;
    gumShades: { gum_shade_id: number; name: string; color_code_middle: string; brand: { id: number } }[];
    selectedName?: string | null;
  }) => void;
  opposingActiveExtractionCode: string | null;
  setOpposingActiveExtractionCode: (code: string | null) => void;
  setOpposingActiveExtractions: (exts: ProductExtraction[]) => void;
  onOpposingExtractionToggle?: (
    toothNumber: number,
    extractionCode: string,
    extractions?: ProductExtraction[]
  ) => void;
  onSelectAllOpposingTeeth?: (teeth: number[]) => void;
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
};

export function OpposingRemovableAccordion({
  opposingArch,
  fieldArch,
  fieldRepTn,
  opposingProductData,
  opposingArchTeeth,
  opposingToothExtractionMap,
  opposingClaspTeeth,
  opposingNoActiveBoxTeeth,
  opposingSelectedTeeth,
  selectedImpressions,
  opposingImpressionText,
  confirmDetailsChecked,
  caseSubmitted = false,
  selectedStages,
  rushedProducts,
  isFieldVisible,
  isFieldCompleted,
  completeFieldStep,
  getFieldValue,
  handleOpenStageModal,
  handleShadeFieldClick,
  handleOpenImpressionModal,
  handleOpenAddOnsModal,
  getImpressionDisplayText,
  setPanelGumShadePicker,
  opposingActiveExtractionCode,
  setOpposingActiveExtractionCode,
  setOpposingActiveExtractions,
  onOpposingExtractionToggle,
  onSelectAllOpposingTeeth,
  onToothStatusValidationChange,
}: OpposingRemovableAccordionProps) {
  const [expanded, setExpanded] = useState(true);

  const opposingExtractions = mapOppositeExtractionsToProductExtractions(
    opposingProductData.opposite_extractions,
    opposingProductData.extractions
  );
  const opposingIsSingleDefaultOnly = isSingleDefaultOnlyExtractionList(opposingExtractions);
  const cardIsFullDenture = isFullDentureProduct(opposingProductData.extractions);
  const rawDisplayTeeth = cardIsFullDenture
    ? opposingArchTeeth
    : opposingSelectedTeeth.length > 0
      ? [...opposingSelectedTeeth].sort((a, b) => a - b)
      : Object.keys(opposingToothExtractionMap).map(Number);
  const displayTeeth = getRemovableOrangeHeaderTeeth({
    selectedTeeth: rawDisplayTeeth,
    toothExtractionMap: opposingToothExtractionMap,
    claspTeeth: opposingClaspTeeth,
    noActiveBoxTeeth: opposingNoActiveBoxTeeth,
    extractions: opposingExtractions,
    isFullDenture: cardIsFullDenture,
    isSingleDefaultOnly: opposingIsSingleDefaultOnly,
  });
  const variationDisplay = resolveVariationDisplay(opposingProductData, displayTeeth.length);
  const productName = variationDisplay.name;
  const productImage = variationDisplay.imageUrl;
  const hasVariationMatch = variationDisplay.matched;
  const cardToothDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";

  const productKey = `${fieldArch}_prep_${fieldRepTn}`;
  const hasRushed = !!rushedProducts[productKey];
  const stageVal = selectedStages[productKey] || getFieldValue(fieldArch, fieldRepTn, "stage");
  const remStageObj = opposingProductData.stages?.find((s) => s.name === stageVal);
  const remDays = remStageObj?.days_to_process;
  const estDays =
    remDays != null
      ? `${remDays} work day${remDays === 1 ? "" : "s"} after submission`
      : "10 work days after submission";

  const advFields = opposingProductData.advance_fields;
  const isF = (step: string) =>
    hasAdvanceField(step, advFields, opposingProductData) &&
    isFieldVisible(fieldArch, fieldRepTn, step as FieldStep);
  const isFComplete = (step: string) => isFieldCompleted(fieldArch, fieldRepTn, step as FieldStep);
  const fVal = (step: string) => getFieldValue(fieldArch, fieldRepTn, step as FieldStep);
  const impressionModalProductId = "0";
  const singleStageSkip = isSingleStageNoStages(opposingProductData);
  const opposingRepTn =
    opposingSelectedTeeth.length > 0 ? Math.min(...opposingSelectedTeeth) : opposingArchTeeth[0];

  const impressionDisplay =
    opposingImpressionText ||
    getImpressionDisplayText(impressionModalProductId, opposingArch) ||
    fVal("impression");
  const impressionComplete =
    isFComplete("impression") ||
    (!!impressionDisplay &&
      archHasActiveImpressionSelections(selectedImpressions, impressionModalProductId, opposingArch));

  return (
    <PanelDiv className="relative mt-4">
      <PanelDiv className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9]">
        <PanelDiv
          className={`w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative cursor-pointer ${hasRushed ? "bg-[#FCE4E4]" : "bg-white"}`}
          onClick={() => setExpanded((e) => !e)}
        >
          <PanelDiv className="absolute top-3 right-2 z-10">
            <ChevronDown
              size={21.6}
              className={`text-black transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </PanelDiv>
          <PanelDiv className="flex items-stretch gap-[10px] px-[8px] py-[14px]" onClick={(e) => e.stopPropagation()}>
            <ProductImagePreview
              imageUrl={productImage}
              altText={productName}
              containerClassName="w-[162px] h-[152px] rounded-[6px] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]"
              imgClassName="w-full h-full object-contain"
              fallback={
                <PanelDiv className="w-full h-full flex items-center justify-center">
                  <span className="text-[10px] text-gray-400">No img</span>
                </PanelDiv>
              }
            />
            <PanelDiv className="flex-1 min-w-0 flex flex-col gap-[9.94px]">
              {shouldShowRemovableHeaderContent({
                hasProduct: true,
                hasVariation: opposingProductData.has_variation,
                teethCount: displayTeeth.length,
                caseSubmitted,
              }) && (
                <>
                  <PanelDiv className="flex items-center gap-[4px] flex-wrap">
                    {opposingProductData.subcategory?.category?.name && (
                      <AccordionBadge>{opposingProductData.subcategory.category.name}</AccordionBadge>
                    )}
                    {opposingProductData.subcategory?.name && (
                      <AccordionBadge>{opposingProductData.subcategory.name}</AccordionBadge>
                    )}
                  </PanelDiv>
                  <PanelDiv
                    className={`flex flex-col items-center text-center gap-[5px] border rounded-[7px] p-[10px] mr-8 ${confirmDetailsChecked ? "border-[#34C759]" : "border-[#F97316]"}`}
                  >
                    <p className="font-[Inter] text-[20px] font-bold leading-[20px] tracking-[-0.02em] text-black">
                      {getRemovableHeaderTitle({
                        productName,
                        hasVariation: opposingProductData.has_variation,
                        teethCount: displayTeeth.length,
                        isFullDenture: cardIsFullDenture,
                        hasVariationMatch,
                      })}
                      {hasRushed && <RushIcon className="inline w-[14px] h-[14px] ml-1" />}
                    </p>
                    {cardToothDisplay && (
                      <p className="font-[Inter] text-[20px] font-normal leading-[20px] tracking-[-0.02em] text-black">
                        {cardToothDisplay}
                      </p>
                    )}
                  </PanelDiv>
                  {opposingExtractions.length > 0 && !opposingIsSingleDefaultOnly && (
                    <ToothStatusBoxes
                      extractions={opposingExtractions}
                      selectedTeeth={
                        opposingSelectedTeeth.length > 0
                          ? opposingSelectedTeeth
                          : Object.keys(opposingToothExtractionMap).map(Number)
                      }
                      allArchTeeth={opposingArchTeeth}
                      toothExtractionMap={opposingToothExtractionMap}
                      claspTeeth={opposingClaspTeeth}
                      displayTeethByCode={getToothStatusBoxDisplayMap({
                        extractions: opposingExtractions,
                        selectedTeeth:
                          opposingSelectedTeeth.length > 0
                            ? opposingSelectedTeeth
                            : Object.keys(opposingToothExtractionMap).map(Number),
                        toothExtractionMap: opposingToothExtractionMap,
                        claspTeeth: opposingClaspTeeth,
                      })}
                      activeExtractionCode={opposingActiveExtractionCode}
                      onActiveExtractionChange={(code, exts) => {
                        setOpposingActiveExtractionCode(code);
                        if (exts) setOpposingActiveExtractions(exts);
                      }}
                      onToothExtractionToggle={(tn, code, exts) =>
                        onOpposingExtractionToggle?.(tn, code, exts ?? opposingExtractions)
                      }
                      onSelectAllTeeth={(teeth) => onSelectAllOpposingTeeth?.(teeth)}
                      onRequiredValidationChange={onToothStatusValidationChange}
                      isRemovable
                      submitted={caseSubmitted}
                      hideDefaultBox
                      disableRequiredValidation
                    />
                  )}
                  <PanelDiv className="flex items-center gap-[4.97px] flex-wrap">
                    {stageVal && !singleStageSkip && <AccordionBadge>{stageVal}</AccordionBadge>}
                    <EstDaysLabel
                      rushed={hasRushed}
                      text={hasRushed ? "5 work days after submission" : estDays}
                    />
                  </PanelDiv>
                </>
              )}
            </PanelDiv>
          </PanelDiv>
        </PanelDiv>

        {expanded && (
          <PanelDiv className="px-[14px] py-[14px] flex flex-col gap-[10px]">
            <PanelDiv className="rounded-lg p-3 space-y-3">
              {(isF("grade") || (isF("stage") && !singleStageSkip)) && (() => {
                const gradeProducts = getActiveGrades(opposingProductData.grades);
                const hasGradesRow = gradeProducts.length > 0;
                return (
                  <PanelDiv className={`grid grid-cols-1 ${hasGradesRow ? "sm:grid-cols-2" : ""} gap-3`}>
                    {isF("grade") && gradeProducts.length > 0 && (() => {
                      const gradeRaw = fVal("grade") || "";
                      let gradeVal = gradeRaw;
                      try {
                        const p = JSON.parse(gradeRaw);
                        gradeVal = p.name ?? gradeRaw;
                      } catch {
                        /* plain string */
                      }
                      const isGradeComplete = isFComplete("grade") || !!(gradeVal && gradeVal.trim());
                      const showGradeGreen = isGradeComplete && !caseSubmitted;
                      return (
                        <fieldset
                          className={`border rounded px-3 py-0 relative h-[42px] flex items-center transition-colors ${showGradeGreen ? "border-[#34a853]" : isGradeComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                        >
                          <legend
                            className={`text-sm px-1 leading-none ${showGradeGreen ? "text-[#34a853]" : isGradeComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}
                          >
                            Grade
                          </legend>
                          <GradeHoverSelector
                            grades={gradeProducts}
                            currentGradeName={gradeVal}
                            disabled={caseSubmitted}
                            onSelect={(g) =>
                              completeFieldStep(
                                fieldArch,
                                fieldRepTn,
                                "grade",
                                JSON.stringify({ grade_id: g.grade_id, name: g.name })
                              )
                            }
                          />
                          {showGradeGreen && <Check size={16} className="text-[#34a853] ml-1 flex-shrink-0" />}
                        </fieldset>
                      );
                    })()}
                    {isF("stage") && !singleStageSkip && (() => {
                      const stageValue = fVal("stage") || selectedStages[productKey] || "";
                      const isStageComplete = isFComplete("stage") || !!(stageValue && stageValue.trim());
                      const showGreen = isStageComplete && !caseSubmitted;
                      return (
                        <fieldset
                          className={`border rounded px-3 py-0 relative h-[42px] flex items-center pointer-events-auto cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                          onClick={() =>
                            !caseSubmitted && handleOpenStageModal(productKey, fieldArch, fieldRepTn)
                          }
                        >
                          <legend
                            className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}
                          >
                            Stage
                          </legend>
                          <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageValue}</span>
                          {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                        </fieldset>
                      );
                    })()}
                  </PanelDiv>
                );
              })()}

              {(isF("teeth_shade") || isF("gum_shade")) && (
                <PanelDiv className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isF("teeth_shade") && isFComplete("teeth_shade") && (
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                      onClick={() =>
                        handleShadeFieldClick(fieldArch, "tooth_shade", `prep_${fieldRepTn}`)
                      }
                    >
                      <legend
                        className={`text-sm px-1 leading-none ${isFComplete("teeth_shade") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}
                      >
                        Teeth shade
                      </legend>
                      <PanelDiv className="flex items-center gap-2 w-full">
                        <span className="text-[14px] sm:text-lg text-[#000000]">
                          {(() => {
                            const r = fVal("teeth_shade");
                            try {
                              return JSON.parse(r).name ?? r;
                            } catch {
                              return r;
                            }
                          })()}
                        </span>
                        {isFComplete("teeth_shade") && !caseSubmitted && (
                          <Check size={16} className="text-[#34a853] ml-auto" />
                        )}
                      </PanelDiv>
                    </fieldset>
                  )}
                  {isF("gum_shade") && isFComplete("teeth_shade") && (
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                      onClick={() => {
                        if (!caseSubmitted) {
                          const currentGumShade = fVal("gum_shade");
                          let currentName: string | null = null;
                          if (currentGumShade) {
                            try {
                              currentName = JSON.parse(currentGumShade).name ?? null;
                            } catch {
                              /* ignore */
                            }
                          }
                          setPanelGumShadePicker({
                            toothNumber: fieldRepTn,
                            gumShades: opposingProductData.gum_shades || [],
                            selectedName: currentName,
                          });
                        }
                      }}
                    >
                      <legend
                        className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}
                      >
                        Gum Shade
                      </legend>
                      <PanelDiv className="flex items-center gap-2 w-full">
                        {isFComplete("gum_shade") ? (
                          (() => {
                            const raw = fVal("gum_shade");
                            let displayName = raw;
                            let color: string | null = null;
                            try {
                              const p = JSON.parse(raw);
                              displayName = p.name ?? raw;
                            } catch {
                              /* plain */
                            }
                            const matchedShade = opposingProductData.gum_shades?.find(
                              (s) => s.name === displayName
                            );
                            if (matchedShade) color = matchedShade.color_code_middle;
                            return (
                              <>
                                <span className="text-[14px] sm:text-lg text-[#000000] truncate">{displayName}</span>
                                {color && (
                                  <svg
                                    width="29"
                                    height="29"
                                    viewBox="0 0 29 29"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="flex-shrink-0 ml-auto"
                                  >
                                    <rect width="28.0391" height="28.0391" rx="6" fill={color} />
                                  </svg>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <span className="text-[#CF0202] text-base font-medium">Select Gum Shade</span>
                        )}
                        {isFComplete("gum_shade") && !caseSubmitted && (
                          <Check size={16} className="text-[#34a853] flex-shrink-0" />
                        )}
                      </PanelDiv>
                    </fieldset>
                  )}
                </PanelDiv>
              )}

              {isF("impression") && (
                <fieldset
                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${caseSubmitted ? "" : "cursor-pointer hover:bg-gray-50"} ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                  onClick={() => {
                    if (caseSubmitted) return;
                    handleOpenImpressionModal(
                      opposingArch,
                      opposingProductData.id?.toString() ?? "0",
                      opposingRepTn
                    );
                  }}
                >
                  <legend
                    className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}
                  >
                    Impression
                  </legend>
                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">
                    {impressionDisplay || "No Opposing"}
                  </span>
                  {impressionComplete && !caseSubmitted && (
                    <Check size={14} className="text-[#34a853] flex-shrink-0" />
                  )}
                </fieldset>
              )}
              {!impressionDisplay && isF("impression") && (
                <p className="font-['Verdana'] text-sm text-black">
                  No impression will be sent on this appointment. Please note that opposing scan is{" "}
                  <span className="text-[#CF0202] font-bold">required</span> for this impression.
                </p>
              )}

              {isF("addons") && (() => {
                const addonsVal = fVal("addons") || "";
                const addonItems = parseAddonDisplayItems(addonsVal);
                const borderClass =
                  isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                const legendClass =
                  isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                if (addonItems.length === 0) return null;
                return (
                  <PanelDiv className="flex flex-wrap gap-3">
                    {addonItems.map((item: string, idx: number) => (
                      <fieldset
                        key={idx}
                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 flex-1 min-w-[200px] ${borderClass}`}
                        onClick={() =>
                          handleOpenAddOnsModal(
                            fieldArch,
                            opposingProductData.id?.toString() || productKey,
                            fieldRepTn
                          )
                        }
                      >
                        <legend className={`text-sm px-1 leading-none ${legendClass}`}>Add on</legend>
                        <span className="text-[14px] sm:text-lg text-[#000000] truncate">{item}</span>
                        {!caseSubmitted && isFComplete("addons") && idx === addonItems.length - 1 && (
                          <Check size={14} className="text-[#34a853] ml-2 flex-shrink-0" />
                        )}
                      </fieldset>
                    ))}
                  </PanelDiv>
                );
              })()}
            </PanelDiv>
          </PanelDiv>
        )}
      </PanelDiv>
    </PanelDiv>
  );
}
