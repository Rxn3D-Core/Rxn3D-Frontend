"use client";

import { useState, useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Check } from "@/components/ui/custom-check";
import type { Arch, ProductApiData, ProductExtraction, ShadeFieldType } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
import { ProductImagePreview, productAccordionLargeImageContainerClass } from "./ProductImagePreview";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
import { RushIcon } from "./CenterActionIcons";
import { parseAddonDisplayItems, productSupportsAddons } from "../utils/addonDisplayHelpers";
import { isSingleDefaultOnlyExtractionList } from "../utils/extractionHelpers";
import { mapOppositeExtractionsToProductExtractions } from "../utils/opposingExtractionHelpers";
import {
  caseDesignInter,
  removableHeaderTitleClass,
  removableHeaderToothClass,
} from "../case-design-inter-font";
import { getRemovableHeaderTitle, shouldShowRemovableHeaderContent } from "../utils/removableHeaderLabel";
import { getRemovableOrangeHeaderTeeth, getToothStatusBoxDisplayMap } from "../utils/removableToothDisplay";
import { resolveVariationDisplay, resolveArchProductImage } from "../utils/variationHelpers";
import { GradeHoverSelector } from "./RemovableRestorationFields";
import { isSingleStageNoStages, shouldSkipStageSelection, parseStageDisplayName } from "../utils/categoryHelpers";
import {
  productHasGrades,
  resolveProductGradesForDisplay,
  parseGradeDisplayName,
  isGradeStepCompleteForDisplay,
} from "../utils/gradeHelpers";
import {
  findShadeCatalogMatch,
  formatRemovableShadeFieldLabel,
  getShadePreviewCode,
  SHADE_FIELD_LABEL_CLASS,
} from "../utils/shadeFieldDisplay";
import { TeethShadePreviewIcon } from "./TeethShadePreviewIcon";
import {
  archHasOpposingImpressionSelections,
  resolveOpposingImpressionProductId,
} from "../utils/opposingImpressionReadiness";
import { shouldSkipLegacyDefaultExtractionAutoSelect } from "@/lib/product-default-tooth-chart";

function OpposingImpressionSkippedNotice() {
  return (
    <p
      className="text-sm leading-snug text-[#555555]"
      style={{ fontFamily: "Verdana, sans-serif" }}
    >
      No impression will be sent on this appointment. Please note that opposing scan is{" "}
      <span className="font-bold text-[#CF0202]">required</span> for this impression.
    </p>
  );
}

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
  if (step === "addons" || step === "fixed_addons") {
    return productSupportsAddons(product as ProductApiData);
  }
  const alwaysShow = ["fixed_stage", "fixed_impression", "stage"];
  if (alwaysShow.includes(step)) return true;
  // Stump shade is gated on gum shade only — a teeth-shade-only product must not show it.
  if (step === "fixed_stump_shade" && product?.has_gum_shade === "Yes") {
    return true;
  }
  if (step === "fixed_shade_trio" && product?.has_teeth_shade === "Yes") return true;
  if (!advanceFields || advanceFields.length === 0) return true;
  const names = advanceFields.map((f) => (f.name || "").toLowerCase());
  switch (step) {
    case "grade":
      return (
        productHasGrades(product as ProductApiData) || names.some((n) => n.includes("grade"))
      );
    case "teeth_shade":
      return product?.has_teeth_shade === "Yes" || names.some((n) => n.includes("teeth") && n.includes("shade"));
    case "gum_shade":
      return product?.has_gum_shade === "Yes" || names.some((n) => n.includes("gum") && n.includes("shade"));
    default:
      return names.some((n) => n.includes(step.replace(/_/g, " ")));
  }
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
  selectedImpressions: import("../utils/impressionStorage").SlipImpressionSelections;
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
  /**
   * Single-arch slip: hide primary product (image, name, grade, shades).
   * Only opposing extractions and impression when configured on the product.
   */
  opposingOnlyLayout?: boolean;
};

export function OpposingRemovableAccordion({
  opposingArch,
  fieldArch,
  fieldRepTn,
  opposingProductData,
  opposingOnlyLayout = false,
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
  const skipLegacyDefaultAutoSelect = shouldSkipLegacyDefaultExtractionAutoSelect(
    opposingProductData as Record<string, unknown>,
  );
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
  // Prefer a matched variation image; otherwise show this arch's (upper/lower) image when configured.
  const productImage = variationDisplay.matched
    ? variationDisplay.imageUrl
    : resolveArchProductImage(opposingProductData, opposingArch, variationDisplay.imageUrl);
  const hasVariationMatch = variationDisplay.matched;
  const cardToothDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";

  const productKey = `${fieldArch}_prep_${fieldRepTn}`;
  const hasRushed = !!rushedProducts[productKey];
  const stageVal = selectedStages[productKey] || getFieldValue(fieldArch, fieldRepTn, "stage");
  const stageDisplayName = parseStageDisplayName(stageVal);
  const remStageObj = opposingProductData.stages?.find((s) => s.name === stageDisplayName);
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
  const impressionModalProductId = resolveOpposingImpressionProductId(
    opposingProductData,
    selectedImpressions,
    opposingArch
  );
  const singleStageSkip = isSingleStageNoStages(opposingProductData);
  const opposingRepTn =
    opposingSelectedTeeth.length > 0 ? Math.min(...opposingSelectedTeeth) : opposingArchTeeth[0];

  const impressionDisplay =
    opposingImpressionText ||
    getImpressionDisplayText(impressionModalProductId, opposingArch) ||
    fVal("impression");
  const hasOpposingImpressionSelected = archHasOpposingImpressionSelections(
    selectedImpressions,
    opposingArch
  );
  const impressionComplete =
    isFComplete("impression") ||
    (!!impressionDisplay && hasOpposingImpressionSelected);

  const hasOpposingExtractionsConfigured = (opposingProductData.opposite_extractions?.length ?? 0) > 0;
  const hasOpposingImpressionConfigured = opposingProductData.opposite_impression === "Yes";
  const showOpposingExtractions =
    hasOpposingExtractionsConfigured && opposingExtractions.length > 0 && !opposingIsSingleDefaultOnly;
  const showOpposingImpressionField =
    hasOpposingImpressionConfigured && (opposingOnlyLayout ? true : isF("impression"));

  return (
    <PanelDiv className="relative mt-4">
      <PanelDiv className="rounded-lg bg-white overflow-hidden">
        <PanelDiv
          className={`w-full flex flex-col transition-colors rounded-t-[5.4px] relative cursor-pointer ${hasRushed ? "bg-[#FCE4E4]" : "bg-white"}`}
          onClick={() => setExpanded((e) => !e)}
        >
          <PanelDiv className="absolute top-3 right-2 z-10">
            <ChevronDown
              size={21.6}
              className={`text-black transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </PanelDiv>
          <PanelDiv
            className={`flex flex-col gap-[9.94px] px-[8px] pt-[14px] ${opposingOnlyLayout ? "w-full" : "flex items-stretch gap-[10px]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {!opposingOnlyLayout && (
              <ProductImagePreview
                imageUrl={productImage}
                altText={productName}
                containerClassName={productAccordionLargeImageContainerClass}
                imgClassName="w-full h-full object-contain"
                fallback={
                  <PanelDiv className="w-full h-full flex items-center justify-center">
                    <span className="text-[10px] text-gray-400">No img</span>
                  </PanelDiv>
                }
              />
            )}
            <PanelDiv className={`min-w-0 flex flex-col gap-[9.94px] ${opposingOnlyLayout ? "w-full" : "flex-1"}`}>
              {opposingOnlyLayout ? (
                <>
                  {showOpposingExtractions && (
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
                      skipDefaultAutoSelect={skipLegacyDefaultAutoSelect}
                      disableRequiredValidation
                    />
                  )}
                  {showOpposingImpressionField &&
                    (hasOpposingImpressionSelected ? (
                      <fieldset
                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${caseSubmitted ? "" : "cursor-pointer hover:bg-gray-50"} ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : impressionDisplay ? "border-[#CF0202]" : "border-[#d9d9d9]"}`}
                        onClick={() => {
                          if (caseSubmitted) return;
                          handleOpenImpressionModal(
                            opposingArch,
                            impressionModalProductId,
                            opposingRepTn
                          );
                        }}
                      >
                        <legend
                          className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : impressionDisplay ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}
                        >
                          Impression
                        </legend>
                        <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">
                          {impressionDisplay}
                        </span>
                        {impressionComplete && !caseSubmitted && (
                          <Check size={14} className="text-[#34a853] flex-shrink-0" />
                        )}
                      </fieldset>
                    ) : (
                      <OpposingImpressionSkippedNotice />
                    ))}
                </>
              ) : (
                shouldShowRemovableHeaderContent({
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
                    <fieldset
                      className={`${caseDesignInter.className} rounded-[6px] px-[12px] py-[10px] min-h-[48px] flex items-center justify-center text-center relative`}
                      style={{
                        border: opposingActiveExtractionCode === null
                          ? "2px solid rgb(211, 211, 211)"
                          : "1px solid rgb(217, 217, 217)",
                        boxShadow: opposingActiveExtractionCode === null
                          ? "rgb(219, 234, 254) 0px 0px 0px 2px"
                          : "none"
                      }}
                    >
                      <div
                        className="absolute left-[16px] top-1/2 transform -translate-y-1/2 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpposingActiveExtractionCode(null);
                        }}
                        title="Activate product tooth selections"
                      >
                        <svg width="24" height="24" viewBox="0 0 248 248" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M127.118 20.6655C135.297 20.6656 141.928 27.2961 141.928 35.4751V105.36H212.524C220.704 105.36 227.334 111.99 227.334 120.169V126.307C227.334 134.486 220.704 141.118 212.524 141.118H141.928V212.525C141.927 220.704 135.297 227.334 127.118 227.334H120.98C112.801 227.334 106.171 220.704 106.171 212.525V141.118H35.4756C27.2964 141.118 20.666 134.486 20.666 126.307V120.169C20.6661 111.99 27.2965 105.36 35.4756 105.36H106.171V35.4751C106.171 27.2961 112.801 20.6655 120.98 20.6655H127.118Z"
                            fill="url(#paint0_linear_removable_plus_opposing)"
                          />
                          <defs>
                            <linearGradient
                              id="paint0_linear_removable_plus_opposing"
                              x1="283.36"
                              y1="23.4262"
                              x2="-14.7"
                              y2="260.838"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#2AA6DE" />
                              <stop offset="0.5" stopColor="#82298D" />
                              <stop offset="1" stopColor="#C9539F" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                      <legend className={`${removableHeaderTitleClass} px-[8px] text-center text-[#555555] flex items-center justify-center gap-1`}>
                        {getRemovableHeaderTitle({
                          productName,
                          hasVariation: opposingProductData.has_variation,
                          teethCount: displayTeeth.length,
                          isFullDenture: cardIsFullDenture,
                          hasVariationMatch,
                        })}
                        {hasRushed && <RushIcon className="inline w-[14px] h-[14px] ml-1" />}
                      </legend>
                      {cardToothDisplay && (
                        <p className={`${removableHeaderToothClass} text-[#666666]`}>
                          {cardToothDisplay}
                        </p>
                      )}
                    </fieldset>
                    {showOpposingExtractions && (
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
                        skipDefaultAutoSelect={skipLegacyDefaultAutoSelect}
                        disableRequiredValidation
                      />
                    )}
                    <PanelDiv className="flex items-center gap-[4.97px] flex-wrap">
                      {/* Hidden: stage badge — set to true to restore */}
                      {false && stageVal && !singleStageSkip && <AccordionBadge>{stageVal}</AccordionBadge>}
                      <EstDaysLabel
                        rushed={hasRushed}
                        text={hasRushed ? "5 work days after submission" : estDays}
                      />
                    </PanelDiv>
                  </>
                )
              )}
            </PanelDiv>
          </PanelDiv>
        </PanelDiv>

        {expanded &&
          ((showOpposingImpressionField && !opposingOnlyLayout) ||
            (!opposingOnlyLayout &&
              (isF("grade") ||
                isF("stage") ||
                isF("teeth_shade") ||
                isF("gum_shade") ||
                isF("addons")))) && (
            <PanelDiv className="px-[14px] py-[14px] flex flex-col gap-[10px]">
              <PanelDiv className="rounded-lg p-3 space-y-3">
                {!opposingOnlyLayout && (isF("grade") || (isF("stage") && !singleStageSkip)) && (() => {
                  const gradeProducts = resolveProductGradesForDisplay(opposingProductData);
                  const hasGradesRow =
                    gradeProducts.length > 0 || (isF("grade") && productHasGrades(opposingProductData));
                  return (
                    <PanelDiv className={`grid grid-cols-1 ${hasGradesRow ? "sm:grid-cols-2" : ""} gap-3`}>
                      {isF("grade") &&
                        (gradeProducts.length > 0 || productHasGrades(opposingProductData)) &&
                        (() => {
                          const gradeRaw = fVal("grade") || "";
                          const gradeVal = parseGradeDisplayName(gradeRaw);
                          const isGradeComplete = isGradeStepCompleteForDisplay(
                            gradeRaw,
                            isFComplete("grade"),
                            opposingProductData
                          );
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
                            <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{parseStageDisplayName(stageValue)}</span>
                            {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                          </fieldset>
                        );
                      })()}
                    </PanelDiv>
                  );
                })()}

                {!opposingOnlyLayout && (isF("teeth_shade") || isF("gum_shade")) && (
                  <PanelDiv className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isF("teeth_shade") && isFComplete("teeth_shade") && (
                      <fieldset
                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors min-w-0 overflow-hidden ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                        onClick={() =>
                          handleShadeFieldClick(fieldArch, "tooth_shade", `prep_${fieldRepTn}`)
                        }
                      >
                        <legend
                          className={`text-sm px-1 leading-none ${isFComplete("teeth_shade") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}
                        >
                          Teeth shade
                        </legend>
                        <PanelDiv className="flex items-center gap-2 w-full min-w-0">
                          <span
                            className={SHADE_FIELD_LABEL_CLASS}
                            title={formatRemovableShadeFieldLabel(
                              fVal("teeth_shade"),
                              opposingProductData.teeth_shades
                            ) || undefined}
                          >
                            {formatRemovableShadeFieldLabel(
                              fVal("teeth_shade"),
                              opposingProductData.teeth_shades
                            )}
                          </span>
                          {getShadePreviewCode(fVal("teeth_shade")) && (
                            <TeethShadePreviewIcon shadeCode={getShadePreviewCode(fVal("teeth_shade"))} />
                          )}
                          {isFComplete("teeth_shade") && !caseSubmitted && (
                            <Check size={16} className="text-[#34a853] flex-shrink-0" />
                          )}
                        </PanelDiv>
                      </fieldset>
                    )}
                    {isF("gum_shade") && isFComplete("teeth_shade") && (
                      <fieldset
                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors min-w-0 overflow-hidden ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
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
                        <PanelDiv className="flex items-center gap-2 w-full min-w-0">
                          {isFComplete("gum_shade") ? (
                            (() => {
                              const raw = fVal("gum_shade");
                              const matchedShade = findShadeCatalogMatch(
                                raw,
                                opposingProductData.gum_shades
                              );
                              const color = matchedShade?.color_code_middle ?? null;
                              const displayName = formatRemovableShadeFieldLabel(
                                raw,
                                opposingProductData.gum_shades
                              );
                              return (
                                <>
                                  <span className={SHADE_FIELD_LABEL_CLASS} title={displayName || undefined}>{displayName}</span>
                                  {color && (
                                    <svg
                                      width="29"
                                      height="29"
                                      viewBox="0 0 29 29"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="flex-shrink-0"
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

                {showOpposingImpressionField &&
                  (hasOpposingImpressionSelected ? (
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${caseSubmitted ? "" : "cursor-pointer hover:bg-gray-50"} ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : impressionDisplay ? "border-[#CF0202]" : "border-[#d9d9d9]"}`}
                      onClick={() => {
                        if (caseSubmitted) return;
                        handleOpenImpressionModal(
                          opposingArch,
                          impressionModalProductId,
                          opposingRepTn
                        );
                      }}
                    >
                      <legend
                        className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : impressionDisplay ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}
                      >
                        Impression
                      </legend>
                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">
                        {impressionDisplay}
                      </span>
                      {impressionComplete && !caseSubmitted && (
                        <Check size={14} className="text-[#34a853] flex-shrink-0" />
                      )}
                    </fieldset>
                  ) : (
                    <OpposingImpressionSkippedNotice />
                  ))}

                {!opposingOnlyLayout && isF("addons") && (() => {
                  const addonsVal = fVal("addons") || "";
                  const addonItems = parseAddonDisplayItems(addonsVal);
                  const borderClass =
                    isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                  const legendClass =
                    isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                  const onClickAddon = () =>
                    handleOpenAddOnsModal(
                      fieldArch,
                      opposingProductData.id?.toString() || `prep_${fieldRepTn}`,
                      fieldRepTn
                    );
                  if (addonItems.length === 0) {
                    return (
                      <fieldset
                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${borderClass}`}
                        onClick={onClickAddon}
                      >
                        <legend className={`text-sm px-1 leading-none ${legendClass}`}>Add ons</legend>
                        <span className="text-[14px] sm:text-lg text-[#000000]">Select add ons</span>
                      </fieldset>
                    );
                  }
                  return (
                    <PanelDiv className="flex flex-wrap gap-3">
                      {addonItems.map((item: string, idx: number) => (
                        <fieldset
                          key={idx}
                          className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 flex-1 min-w-[200px] ${borderClass}`}
                          onClick={onClickAddon}
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
