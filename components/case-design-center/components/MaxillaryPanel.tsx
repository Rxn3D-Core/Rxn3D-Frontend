"use client";

import { useRef, useEffect, useState } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Zap,
  Trash2,
  Check,
  Paperclip,
} from "lucide-react";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import { FieldInput, ShadeField, IconField } from "./fields";
import { ShadeSelectionGuide } from "./ShadeSelectionGuide";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
import { ImplantDetailSection } from "./ImplantDetailSection";
import type {
  AddedProduct,
  Arch,
  ShadeFieldType,
  ShadeSelectionState,
  RetentionPopoverState,
  RetentionType,
  ProductApiData,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { getFixedFieldChain } from "../hooks/useToothFieldProgress";
import { shadeGuideOptions as defaultShadeGuideOptions } from "../constants";

/* ------------------------------------------------------------------ */
/*  Articulator icon (Stage field)                                     */
/*  The original file contains a large base64-encoded PNG image here.  */
/*  It is extracted as a constant so the JSX stays readable.           */
/* ------------------------------------------------------------------ */
function ArticulatorIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <rect
        width="31.5133"
        height="31.5133"
        rx="1.28103"
        fill="url(#pattern0_1_1236)"
      />
      <defs>
        <pattern
          id="pattern0_1_1236"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_1_1236"
            transform="translate(0 -0.166667) scale(0.000326797)"
          />
        </pattern>
        {/* NOTE: The original file includes a very large base64 <image> element here.
            Reference: <image id="image0_1_1236" width="3060" height="4080" .../>
            For production, paste the full base64 data from the original CaseDesignCenterTest.tsx line 1412,
            or move the image to a public asset and reference it via src. */}
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Diamond SVG icons (Grade field)                                    */
/* ------------------------------------------------------------------ */
function BlueDiamond() {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#45B2EF" />
      <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#45B2EF" />
      <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#3B9FE2" />
      <path d="M14.9996 23.4212L7.96068 6.84708H22.0388L14.9996 23.4212Z" fill="#45B2EF" />
      <path d="M22.0388 6.84708H7.96068L14.9996 0L22.0388 6.84708Z" fill="#80D4FD" />
      <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#45B2EF" />
      <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#3B9FE2" />
      <path d="M14.9996 0L7.96075 6.84708L6.93016 0H14.9996Z" fill="#4FC1F8" />
      <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#4FC1F8" />
    </svg>
  );
}

function GrayDiamond() {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#575756" />
      <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#575756" />
      <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#706F6F" />
      <path d="M14.9995 23.4212L7.96066 6.84708H22.0388L14.9995 23.4212Z" fill="#575756" />
      <path d="M22.0388 6.84708H7.96066L14.9995 0L22.0388 6.84708Z" fill="#3C3C3B" />
      <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#575756" />
      <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#706F6F" />
      <path d="M14.9996 0L7.96073 6.84708L6.93015 0H14.9996Z" fill="#1D1D1B" />
      <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#1D1D1B" />
    </svg>
  );
}

/** Auto-opens the stage selection modal when accordion is expanded and stage is empty (once per expand). */
function AutoOpenStageIfEmpty({
  productId,
  arch,
  toothNumber,
  isExpanded,
  isStageVisible,
  isStageEmpty,
  onOpenStage,
}: {
  productId: string;
  arch: Arch;
  toothNumber: number;
  isExpanded: boolean;
  isStageVisible: boolean;
  isStageEmpty: boolean;
  onOpenStage: (productId: string, arch: Arch, toothNumber?: number) => void;
}) {
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isStageVisible || !isStageEmpty || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    onOpenStage(productId, arch, toothNumber);
  }, [isExpanded, isStageVisible, isStageEmpty, productId, arch, toothNumber, onOpenStage]);
  return null;
}

/** Auto-opens the teeth shade guide when accordion is expanded and stump or tooth shade is empty (once per expand). */
function AutoOpenShadeGuideIfEmpty({
  arch,
  productId,
  isExpanded,
  isShadeSectionVisible,
  stumpShadeEmpty,
  toothShadeEmpty,
  setShadeSelectionState,
}: {
  arch: Arch;
  productId: string;
  isExpanded: boolean;
  isShadeSectionVisible: boolean;
  stumpShadeEmpty: boolean;
  toothShadeEmpty: boolean;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
}) {
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isShadeSectionVisible || (!stumpShadeEmpty && !toothShadeEmpty) || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    setShadeSelectionState({
      arch,
      productId,
      fieldType: stumpShadeEmpty ? "stump_shade" : "tooth_shade",
    });
  }, [isExpanded, isShadeSectionVisible, stumpShadeEmpty, toothShadeEmpty, arch, productId, setShadeSelectionState]);
  return null;
}

/** Auto-opens the impression selection modal when accordion is expanded and impression is empty (once per expand). */
function AutoOpenImpressionIfEmpty({
  isExpanded,
  isImpressionVisible,
  isImpressionEmpty,
  onOpenImpressionModal,
  arch,
  productId,
  toothNumber,
}: {
  isExpanded: boolean;
  isImpressionVisible: boolean;
  isImpressionEmpty: boolean;
  onOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  arch: Arch;
  productId: string;
  toothNumber: number;
}) {
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isImpressionVisible || !isImpressionEmpty || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    onOpenImpressionModal(arch, productId, toothNumber);
  }, [isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
  return null;
}

/** Scrolls the nearest scrollable ancestor to the bottom whenever content is added. */
function ScrollToBottom() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  });
  return <div ref={ref} />;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MaxillaryPanelProps {
  // Visibility
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;

  // Add product callback
  onAddProduct?: (arch: Arch) => void;
  disableAddProduct?: boolean;

  // Tooth selection
  maxillaryTeeth: number[];
  handleMaxillaryToothClick: (toothNumber: number) => void;
  maxillaryRetentionTypes: Record<number, Array<"Implant" | "Prep" | "Pontic">>;
  retentionPopoverState: RetentionPopoverState;
  setRetentionPopoverState: (state: RetentionPopoverState) => void;
  handleSelectRetentionType: (
    arch: Arch,
    toothNumber: number,
    type: "Implant" | "Prep" | "Pontic"
  ) => void;
  handleMaxillaryToothDeselect: (toothNumber: number) => void;

  // Shade selection
  shadeSelectionState: ShadeSelectionState;
  setShadeSelectionState: (
    state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)
  ) => void;
  selectedShadeGuide: string;
  setSelectedShadeGuide: (v: string) => void;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType
  ) => string;
  handleShadeSelect: (shade: string) => void;
  handleShadeFieldClick: (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string
  ) => void;

  // Expansion
  expandedLeft: boolean;
  setExpandedLeft: (v: boolean) => void;
  isPrepPonticExpanded: (toothNumber: number) => boolean;
  togglePrepPonticExpanded: (toothNumber: number) => void;

  // Rush
  rushedProducts: Record<string, any>;

  // Modal openers
  handleOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  handleOpenRushModal: (arch: Arch, productId: string) => void;
  handleOpenStageModal: (productId: string, arch?: Arch, toothNumber?: number) => void;
  setShowAttachModal: (v: boolean) => void;
  getImpressionDisplayText: (productId: string, arch: Arch) => string;
  selectedStages: Record<string, string>;

  // Added products
  addedProducts: AddedProduct[];
  toggleAddedProductExpanded: (productId: number) => void;
  handleRemoveAddedProduct: (productId: number) => void;

  // Active product card tracking
  activeProductCardId: number;
  setActiveProductCardId: (id: number) => void;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;

  // Tooth field progress (Prep/Pontic step-by-step)
  isFieldVisible: (arch: Arch, toothNumber: number, step: FieldStep, fixedChain?: readonly string[]) => boolean;
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  completeFieldStep: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  clearToothProgress: (arch: Arch, toothNumber: number) => void;
  setToothProduct: (arch: Arch, toothNumber: number, product: ProductApiData) => void;
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
  isProductLoading: (arch: Arch, toothNumber: number) => boolean;
  fetchAndAssignProduct: (arch: Arch, toothNumber: number, productId: number) => Promise<void>;
  maxillaryToothExtractionMap: Record<number, string>;
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string) => void;
  selectAllMaxillaryTeeth: (teeth: number[]) => void;
  clearAllMaxillaryTeeth: () => void;
}

/* ------------------------------------------------------------------ */
/*  MaxillaryPanel                                                     */
/* ------------------------------------------------------------------ */
export function MaxillaryPanel({
  showMaxillary,
  setShowMaxillary,
  showDetails,
  caseSubmitted = false,
  onAddProduct,
  disableAddProduct = false,
  maxillaryTeeth,
  handleMaxillaryToothClick,
  maxillaryRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  handleSelectRetentionType,
  handleMaxillaryToothDeselect,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  setSelectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
  handleShadeFieldClick,
  expandedLeft,
  setExpandedLeft,
  isPrepPonticExpanded,
  togglePrepPonticExpanded,
  rushedProducts,
  handleOpenImpressionModal,
  handleOpenAddOnsModal,
  handleOpenRushModal,
  handleOpenStageModal,
  setShowAttachModal,
  getImpressionDisplayText,
  selectedStages,
  addedProducts,
  toggleAddedProductExpanded,
  handleRemoveAddedProduct,
  activeProductCardId,
  setActiveProductCardId,
  getToothProductCard,
  isFieldVisible,
  isFieldCompleted,
  completeFieldStep,
  getFieldValue,
  clearToothProgress,
  setToothProduct,
  getToothProduct,
  isProductLoading,
  fetchAndAssignProduct,
  maxillaryToothExtractionMap,
  handleToothExtractionToggle,
  selectAllMaxillaryTeeth,
  clearAllMaxillaryTeeth,
}: MaxillaryPanelProps) {
  const MAXILLARY_ALL_TEETH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  return (
    <div className={`flex-1 min-w-0 px-0 md:px-3 order-1 lg:order-none${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
      {/* Maxillary header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        <h3 className="text-[12px] md:text-[14px] font-bold text-[#1d1d1b] tracking-wide">
          MAXILLARY
        </h3>
        {showDetails && !caseSubmitted && (
          <button
            onClick={!disableAddProduct ? () => onAddProduct?.("maxillary") : undefined}
            title={disableAddProduct ? "Complete all required fields before adding another product" : undefined}
            className={`flex items-center gap-1.5 shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md ${disableAddProduct ? "bg-[#b4b0b0] cursor-not-allowed opacity-60" : "bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"}`}
          >
            <Plus size={13} strokeWidth={1.5} />
            Add Product
          </button>
        )}
      </div>

      {/* Eye toggle - always visible */}
      <div className="flex justify-start mb-1">
        <button
          onClick={() => setShowMaxillary(!showMaxillary)}
          className="flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
          title={showMaxillary ? "Hide Maxillary" : "Show Maxillary"}
        >
          {showMaxillary ? (
            <Eye size={13.5} className="text-[#b4b0b0]" />
          ) : (
            <EyeOff size={13.5} className="text-[#b4b0b0]" />
          )}
        </button>
      </div>

      {/* Maxillary section - conditionally shown */}
      {showMaxillary && (
        <>
          {/* Teeth row */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MaxillaryTeethSVG
                selectedTeeth={maxillaryTeeth}
                onToothClick={handleMaxillaryToothClick}
                className="w-full"
                retentionTypesByTooth={maxillaryRetentionTypes}
                showRetentionPopover={
                  retentionPopoverState.arch === "maxillary"
                }
                retentionPopoverTooth={retentionPopoverState.toothNumber}
                onSelectRetentionType={(tooth, type) =>
                  handleSelectRetentionType("maxillary", tooth, type)
                }
                onClosePopover={() =>
                  setRetentionPopoverState({
                    arch: null,
                    toothNumber: null,
                  })
                }
                onDeselectTooth={handleMaxillaryToothDeselect}
              />
            </div>
          </div>

          {/* Shade Selection Guide - Maxillary */}
          {shadeSelectionState.arch === "maxillary" && (
            <ShadeSelectionGuide
              arch="maxillary"
              shadeSelectionState={shadeSelectionState}
              setShadeSelectionState={setShadeSelectionState}
              selectedShadeGuide={selectedShadeGuide}
              showShadeGuideDropdown={showShadeGuideDropdown}
              setShowShadeGuideDropdown={setShowShadeGuideDropdown}
              setSelectedShadeGuide={setSelectedShadeGuide}
              shadeGuideOptions={shadeGuideOptions}
              getSelectedShade={getSelectedShade}
              handleShadeSelect={handleShadeSelect}
            />
          )}

          {/* Tooth status boxes - shown above all product accordions when any product has extractions */}
          {(() => {
            const seenIds = new Set<number>();
            const allExtractions = maxillaryTeeth.flatMap((tn) => {
              const product = getToothProduct("maxillary", tn);
              return product?.extractions ?? [];
            }).filter((e) => {
              if (seenIds.has(e.extraction_id)) return false;
              seenIds.add(e.extraction_id);
              return true;
            });
            if (allExtractions.length === 0) return null;
            return (
              <div className="mt-3">
                <ToothStatusBoxes
                  extractions={allExtractions}
                  selectedTeeth={maxillaryTeeth}
                  allArchTeeth={MAXILLARY_ALL_TEETH}
                  toothExtractionMap={maxillaryToothExtractionMap}
                  activeExtractionCode={activeExtractionCode}
                  onActiveExtractionChange={setActiveExtractionCode}
                  onToothExtractionToggle={(tn, code) => handleToothExtractionToggle("maxillary", tn, code)}
                  onSelectAllTeeth={selectAllMaxillaryTeeth}
                  onClearAllTeeth={clearAllMaxillaryTeeth}
                />
              </div>
            );
          })()}

          {/* Progressive field cards for Prep/Pontic teeth — grouped by product */}
          {(() => {
            const prepPonticTeeth = Object.entries(maxillaryRetentionTypes)
              .filter(([_, types]) =>
                types.some((t) => t === "Prep" || t === "Pontic" || t === "Implant")
              )
              .map(([toothNum, types]) => ({
                toothNumber: Number(toothNum),
                retentionType: types.find((t) => t === "Prep" || t === "Pontic" || t === "Implant")!,
              }));

            if (prepPonticTeeth.length === 0) return null;

            // Group teeth by product ID (teeth with same product share one accordion)
            const groupedByProduct: Record<string, typeof prepPonticTeeth> = {};
            for (const tooth of prepPonticTeeth) {
              const product = getToothProduct("maxillary", tooth.toothNumber);
              const groupKey = product?.id ? String(product.id) : "no_product";
              if (!groupedByProduct[groupKey]) groupedByProduct[groupKey] = [];
              groupedByProduct[groupKey].push(tooth);
            }

            return Object.entries(groupedByProduct).map(([groupKey, teeth]) => {
              // Use first tooth's data for the accordion header
              const firstTooth = teeth[0];
              const firstToothNumber = firstTooth.toothNumber;
              const selectedProduct = getToothProduct("maxillary", firstToothNumber);
              const productName = selectedProduct?.name || "Select Product";
              const productImage = selectedProduct?.image_url || "/placeholder.svg?height=48&width=48&query=dental+crown+tooth";
              const categoryName = selectedProduct?.subcategory?.category?.name || "";
              const subcategoryName = selectedProduct?.subcategory?.name || "";
              const estDays = selectedProduct
                ? selectedProduct.min_days_to_process && selectedProduct.max_days_to_process
                  ? `${selectedProduct.min_days_to_process}-${selectedProduct.max_days_to_process} work days after submission`
                  : selectedProduct.min_days_to_process
                    ? `${selectedProduct.min_days_to_process} work days after submission`
                    : "10 work days after submission"
                : "10 work days after submission";
              const toothNumbers = teeth.map((t) => t.toothNumber);
              const toothNumbersDisplay = toothNumbers.map((n) => `#${n}`).join(",");
              const retentionTypes = [...new Set(teeth.map((t) => t.retentionType))];
              const hasRushed = toothNumbers.some((n) => rushedProducts[`maxillary_prep_${n}`] || rushedProducts[`maxillary_fixed_${n}`]);

              // Show skeleton while product is loading
              const isLoading = !selectedProduct && teeth.some((t) => isProductLoading("maxillary", t.toothNumber));
              if (isLoading) {
                return (
                  <div key={`loading-group-${groupKey}`} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
                    <div className="w-full flex items-center py-[14px] px-2 gap-[10px] rounded-t-[5.4px]">
                      <div className="w-16 h-[62px] rounded-md flex-shrink-0 animate-pulse bg-gray-200" />
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="h-[16px] w-[140px] rounded animate-pulse bg-gray-200" />
                        <div className="h-[14px] w-[60px] rounded animate-pulse bg-gray-200" />
                        <div className="h-[12px] w-[200px] rounded animate-pulse bg-gray-200" />
                      </div>
                    </div>
                  </div>
                );
              }

              // Build product-aware chain for Fixed Restoration fields
              const fixedChain = getFixedFieldChain(selectedProduct?.advance_fields);
              // Helper: check visibility within the product-specific fixed chain
              const isFixed = (step: FieldStep) =>
                isFieldVisible("maxillary", firstToothNumber, step, fixedChain);

              // Gate: hide product fields while shade guide is open and incomplete for this product
              const _fixedShadeProductId = `fixed_${firstToothNumber}`;
              const fixedShadeIncomplete =
                shadeSelectionState.productId === _fixedShadeProductId &&
                shadeSelectionState.arch === "maxillary" &&
                !(
                  getSelectedShade(_fixedShadeProductId, "maxillary", "stump_shade") &&
                  getSelectedShade(_fixedShadeProductId, "maxillary", "tooth_shade")
                );

              return (
              <div
                key={`prep-pontic-group-${groupKey}`}
                className={`rounded-lg bg-white overflow-hidden ${
                  hasRushed
                    ? "border-2 border-[#CF0202]"
                    : "border border-[#d9d9d9]"
                } mt-3`}
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => togglePrepPonticExpanded(firstToothNumber)}
                  className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
                    hasRushed
                      ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                      : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                  }`}
                >
                  <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {selectedProduct?.image_url ? (
                      <img
                        src={productImage}
                        alt={productName}
                        className="w-[61.58px] h-[28.79px] object-contain"
                      />
                    ) : (
                      <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">No img</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col">
                    <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black flex items-center gap-1">
                      {productName}
                      {hasRushed && (
                        <Zap
                          className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0"
                          strokeWidth={2}
                          fill="#CF0202"
                        />
                      )}
                    </p>
                    <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                      {toothNumbersDisplay}
                    </p>
                    <div className="flex items-center gap-[5px] flex-wrap">
                      {categoryName && (
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                          {categoryName}
                        </span>
                      )}
                      {subcategoryName && (
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                          {subcategoryName}
                        </span>
                      )}
                      {(selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[`maxillary_fixed_${firstToothNumber}`]) && (
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                          {selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[`maxillary_fixed_${firstToothNumber}`]}
                        </span>
                      )}
                      <span
                        className={`font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] ${
                          hasRushed
                            ? "text-[#CF0202] font-medium"
                            : "text-[#B4B0B0]"
                        }`}
                      >
                        Est days:{" "}
                        {hasRushed
                          ? "5 work days after submission"
                          : estDays}
                      </span>
                      <Trash2 size={9} className="text-[#999999]" />
                    </div>
                  </div>
                  <ChevronDown
                    size={21.6}
                    className={`text-black flex-shrink-0 transition-transform ${
                      isPrepPonticExpanded(firstToothNumber) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Accordion body - single shared set of fields for the product group */}
                {isPrepPonticExpanded(firstToothNumber) && (
                <div className="border-t border-[#d9d9d9] p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue">
                  <AutoOpenStageIfEmpty
                    productId={categoryName === "Fixed Restoration" ? `maxillary_fixed_${firstToothNumber}` : `maxillary_prep_${firstToothNumber}`}
                    arch="maxillary"
                    toothNumber={firstToothNumber}
                    isExpanded={true}
                    isStageVisible={categoryName === "Fixed Restoration" ? isFixed("fixed_stage") : isFieldVisible("maxillary", firstToothNumber, "stage")}
                    isStageEmpty={categoryName === "Fixed Restoration" ? !(selectedStages[`maxillary_fixed_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "fixed_stage")) : !(selectedStages[`maxillary_prep_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "stage"))}
                    onOpenStage={handleOpenStageModal}
                  />
                  {categoryName === "Fixed Restoration" && (
                    <>
                      <AutoOpenShadeGuideIfEmpty
                        arch="maxillary"
                        productId={`fixed_${firstToothNumber}`}
                        isExpanded={true}
                        isShadeSectionVisible={isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")}
                        stumpShadeEmpty={!getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "stump_shade")}
                        toothShadeEmpty={!getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                        setShadeSelectionState={setShadeSelectionState}
                      />
                      <AutoOpenImpressionIfEmpty
                        isExpanded={isPrepPonticExpanded(firstToothNumber)}
                        isImpressionVisible={!fixedShadeIncomplete && isFixed("fixed_impression")}
                        isImpressionEmpty={!isFieldCompleted("maxillary", firstToothNumber, "fixed_impression")}
                        onOpenImpressionModal={handleOpenImpressionModal}
                        arch="maxillary"
                        productId={selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`}
                        toothNumber={firstToothNumber}
                      />
                    </>
                  )}

                  {categoryName === "Fixed Restoration" ? (
                    <>
                      {/* ===== FIXED RESTORATION: Progressive step-by-step fields ===== */}

                      {/* Product - Material / Retention Type — always shown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldInput
                          label="Product - Material"
                          value={selectedProduct?.name || ""}
                        />
                        <FieldInput
                          label="Retention Type"
                          value={retentionTypes.includes("Implant") ? "Screwed" : "Cemented"}
                        />
                      </div>

                      {/* All remaining fields hidden until both shades are selected */}
                      {!fixedShadeIncomplete && <>

                      {/* Step 1 & 2: Stage and Stump Shade in one row */}
                      {(isFixed("fixed_stage") || isFixed("fixed_stump_shade")) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {isFixed("fixed_stage") && (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "fixed_stage")
                                  ? "border-[#34a853]"
                                  : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                handleOpenStageModal(`maxillary_fixed_${firstToothNumber}`, "maxillary", firstToothNumber);
                              }}
                            >
                              <legend
                                className={`text-[11px] px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "fixed_stage")
                                    ? "text-[#34a853]"
                                    : "text-[#CF0202]"
                                }`}
                              >
                                Stage
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[13px] text-[#1d1d1b]">
                                  {selectedStages[`maxillary_fixed_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "fixed_stage")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "fixed_stage") && (
                                  <Check size={16} className="text-[#34a853] ml-auto" />
                                )}
                                <div className={isFieldCompleted("maxillary", firstToothNumber, "fixed_stage") ? "" : "ml-auto"}>
                                  <ArticulatorIcon />
                                </div>
                              </div>
                            </fieldset>
                          )}
                          {isFixed("fixed_stump_shade") && (
                            <ShadeField
                              label="Stump Shade"
                              value={selectedShadeGuide}
                              shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "stump_shade")}
                              onClick={() => handleShadeFieldClick("maxillary", "stump_shade", `fixed_${firstToothNumber}`)}
                            />
                          )}
                        </div>
                      )}

                      {/* Step 3: Cervical / Incisal / Body Shade (no Tooth Shade field) */}
                      {isFixed("fixed_shade_trio") && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <ShadeField
                            label="Cervical Shade"
                            value={selectedShadeGuide}
                            shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                            onClick={() => {
                              handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`);
                              if (!isFieldCompleted("maxillary", firstToothNumber, "fixed_shade_trio")) {
                                completeFieldStep("maxillary", firstToothNumber, "fixed_shade_trio", "selected");
                              }
                            }}
                          />
                          <ShadeField
                            label="Incisal Shade"
                            value={selectedShadeGuide}
                            shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                            onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                          />
                          <ShadeField
                            label="Body Shade"
                            value={selectedShadeGuide}
                            shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                            onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                          />
                        </div>
                      )}

                      {/* Implant Detail - shown after shade selection, always when applicable */}
                      {toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && (
                        <ImplantDetailSection toothNumber={firstToothNumber} />
                      )}

                      {/* Step 4: Characterization / Intensity / Surface finish */}
                      {isFixed("fixed_characterization") && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization")
                                ? "border-[#34a853]"
                                : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              if (!isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization")) {
                                completeFieldStep("maxillary", firstToothNumber, "fixed_characterization", "selected");
                              }
                            }}
                          >
                            <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                              Characterization
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[13px] text-[#1d1d1b]">{getFieldValue("maxillary", firstToothNumber, "fixed_characterization")}</span>
                              {isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && <Check size={16} className="text-[#34a853] ml-auto" />}
                            </div>
                          </fieldset>
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization")
                                ? "border-[#34a853]"
                                : "border-[#d9d9d9]"
                            }`}
                          >
                            <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                              Intensity
                            </legend>
                            <span className="text-[13px] text-[#1d1d1b]"></span>
                          </fieldset>
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization")
                                ? "border-[#34a853]"
                                : "border-[#d9d9d9]"
                            }`}
                          >
                            <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                              Surface finish
                            </legend>
                            <span className="text-[13px] text-[#1d1d1b]"></span>
                          </fieldset>
                        </div>
                      )}

                      {/* Step 5: Occlusal Contact / Pontic Design / Embrasures / Proximal Contact */}
                      {isFixed("fixed_contact_icons") && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(["occlusal", "pontic", "embrasures", "proximal"] as const).map((icon, idx) => {
                            const labels = ["Occlusal Contact", "Pontic Design", "Embrasures", "Proximal Contact"];
                            const isCompleted = isFieldCompleted("maxillary", firstToothNumber, "fixed_contact_icons");
                            return (
                              <div
                                key={icon}
                                className="cursor-pointer"
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_contact_icons", "selected");
                                  }
                                }}
                              >
                                <IconField label={labels[idx]} value="" icon={icon} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Step 6: Margin Design / Margin Depth / Occlusal Reduction / Axial Reduction */}
                      {isFixed("fixed_margin") && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {["Margin Design", "Margin Depth", "Occlusal Reduction", "Axial Reduction"].map((label, idx) => {
                            const isCompleted = isFieldCompleted("maxillary", firstToothNumber, "fixed_margin");
                            return (
                              <fieldset
                                key={label}
                                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                  isCompleted
                                    ? "border-[#34a853]"
                                    : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                }`}
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_margin", "selected");
                                  }
                                }}
                              >
                                <legend className={`text-[11px] px-1 leading-none ${isCompleted ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>
                                  {label}
                                </legend>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-[13px] text-[#1d1d1b]"></span>
                                  {isCompleted && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
                                </div>
                              </fieldset>
                            );
                          })}
                        </div>
                      )}

                      {/* Step 7: Metal Design / Metal Thickness / Modification */}
                      {isFixed("fixed_metal") && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {["Metal Design", "Metal Thickness", "Modification"].map((label, idx) => {
                            const isCompleted = isFieldCompleted("maxillary", firstToothNumber, "fixed_metal");
                            return (
                              <fieldset
                                key={label}
                                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                  isCompleted
                                    ? "border-[#34a853]"
                                    : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                }`}
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_metal", "selected");
                                  }
                                }}
                              >
                                <legend className={`text-[11px] px-1 leading-none ${isCompleted ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>
                                  {label}
                                </legend>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-[13px] text-[#1d1d1b]"></span>
                                  {isCompleted && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
                                </div>
                              </fieldset>
                            );
                          })}
                        </div>
                      )}

                      {/* Step 8: Proximal Contact Mesial / Distal / Functional Guidance */}
                      {isFixed("fixed_proximal_contact") && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {["Proximal Contact – Mesial", "Proximal Contact – Distal", "Functional Guidance"].map((label, idx) => {
                            const isCompleted = isFieldCompleted("maxillary", firstToothNumber, "fixed_proximal_contact");
                            return (
                              <fieldset
                                key={label}
                                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                  isCompleted
                                    ? "border-[#34a853]"
                                    : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                }`}
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_proximal_contact", "selected");
                                  }
                                }}
                              >
                                <legend className={`text-[11px] px-1 leading-none ${isCompleted ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>
                                  {label}
                                </legend>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-[13px] text-[#1d1d1b]"></span>
                                  {isCompleted && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
                                </div>
                              </fieldset>
                            );
                          })}
                        </div>
                      )}

                      {/* Step 9: Impression / Add ons */}
                      {isFixed("fixed_impression") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_impression")
                                ? "border-[#34a853]"
                                : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              handleOpenImpressionModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                            }}
                          >
                            <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                              Impression
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[13px] text-[#1d1d1b] truncate">
                                {getImpressionDisplayText(selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, "maxillary")}
                              </span>
                              {isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") && (
                                <Check size={16} className="text-[#34a853] ml-auto" />
                              )}
                            </div>
                          </fieldset>

                          {isFixed("fixed_addons") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "fixed_addons")
                                  ? "border-[#34a853]"
                                  : "border-[#d9d9d9]"
                              }`}
                              onClick={() => {
                                handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                              }}
                            >
                              <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_addons") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                                Add ons
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[13px] text-[#1d1d1b] truncate">
                                  {getFieldValue("maxillary", firstToothNumber, "fixed_addons")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "fixed_addons") && (
                                  <Check size={16} className="text-[#34a853] ml-auto" />
                                )}
                              </div>
                            </fieldset>
                          ) : (
                            <div />
                          )}
                        </div>
                      )}

                      {/* Additional notes — only shown when advance_fields includes a notes field */}
                      {isFixed("fixed_notes") && (
                        <fieldset
                          className={`border rounded px-3 pb-2 pt-0 ${
                            isFieldCompleted("maxillary", firstToothNumber, "fixed_notes")
                              ? "border-[#34a853]"
                              : "border-[#d9d9d9]"
                          }`}
                        >
                          <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_notes") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                            Additional notes
                          </legend>
                          <textarea
                            rows={3}
                            placeholder="Enter additional notes..."
                            className="w-full text-[12px] text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
                            onChange={(e) => {
                              if (e.target.value && !isFieldCompleted("maxillary", firstToothNumber, "fixed_notes")) {
                                completeFieldStep("maxillary", firstToothNumber, "fixed_notes", e.target.value);
                              }
                            }}
                          />
                        </fieldset>
                      )}

                      {/* Bottom action buttons — shown after Impression is completed */}
                      {isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") && (
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                          <button
                            onClick={() => {
                              handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                            }}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              Add ons
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAttachModal(true)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              Attach Files
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenRushModal("maxillary", `fixed_${firstToothNumber}`)
                            }
                            className={`relative flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors ${
                              hasRushed ? "bg-[#CF0202]" : "bg-[#F9F9F9]"
                            }`}
                          >
                            <span
                              className={`font-["Verdana"] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] whitespace-nowrap ${
                                hasRushed ? "text-white" : "text-black"
                              }`}
                            >
                              {hasRushed ? "Rushed" : "Request Rush"}
                            </span>
                            <Zap
                              className={`w-[8.78px] h-[10.54px] flex-shrink-0 ${
                                hasRushed ? "text-white" : "text-[#CF0202]"
                              }`}
                              strokeWidth={0.878154}
                            />
                          </button>
                        </div>
                      )}
                      </>}
                    </>
                  ) : (
                    <>
                      <AutoOpenImpressionIfEmpty
                        isExpanded={isPrepPonticExpanded(firstToothNumber)}
                        isImpressionVisible={isFieldVisible("maxillary", firstToothNumber, "impression")}
                        isImpressionEmpty={!isFieldCompleted("maxillary", firstToothNumber, "impression")}
                        onOpenImpressionModal={handleOpenImpressionModal}
                        arch="maxillary"
                        productId={selectedProduct?.id?.toString() || `prep_${firstToothNumber}`}
                        toothNumber={firstToothNumber}
                      />
                      {/* ===== OTHER CATEGORIES: Progressive step-by-step fields ===== */}

                      {/* Implant Detail - show if any tooth in group has Implant retention */}
                      {toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && (
                        <ImplantDetailSection toothNumber={firstToothNumber} />
                      )}

                      {/* Step 1: Grade / Stage */}
                      {isFieldVisible("maxillary", firstToothNumber, "grade") && (
                        <div className="grid grid-cols-2 gap-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "grade")
                                ? "border-[#34a853]"
                                : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              if (!isFieldCompleted("maxillary", firstToothNumber, "grade")) {
                                completeFieldStep("maxillary", firstToothNumber, "grade", "Standard");
                              }
                            }}
                          >
                            <legend
                              className={`text-[11px] px-1 leading-none ${
                                isFieldCompleted("maxillary", firstToothNumber, "grade")
                                  ? "text-[#34a853]"
                                  : "text-[#CF0202]"
                              }`}
                            >
                              Grade
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[13px] text-[#1d1d1b]">
                                {getFieldValue("maxillary", firstToothNumber, "grade")}
                              </span>
                              <div className="flex gap-1 ml-auto">
                                <BlueDiamond />
                                <BlueDiamond />
                                <GrayDiamond />
                                <GrayDiamond />
                              </div>
                              {isFieldCompleted("maxillary", firstToothNumber, "grade") && (
                                <Check size={16} className="text-[#34a853]" />
                              )}
                            </div>
                          </fieldset>

                          {isFieldVisible("maxillary", firstToothNumber, "stage") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "stage")
                                  ? "border-[#34a853]"
                                  : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                handleOpenStageModal(`maxillary_prep_${firstToothNumber}`, "maxillary", firstToothNumber);
                              }}
                            >
                              <legend
                                className={`text-[11px] px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "stage")
                                    ? "text-[#34a853]"
                                    : "text-[#CF0202]"
                                }`}
                              >
                                Stage
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[13px] text-[#1d1d1b]">
                                  {getFieldValue("maxillary", firstToothNumber, "stage")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "stage") && (
                                  <Check size={16} className="text-[#34a853]" />
                                )}
                                <div className="ml-auto">
                                  <ArticulatorIcon />
                                </div>
                              </div>
                            </fieldset>
                          ) : (
                            <div />
                          )}
                        </div>
                      )}

                      {/* Step 2: Teeth shade / Gum Shade */}
                      {isFieldVisible("maxillary", firstToothNumber, "teeth_shade") && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "teeth_shade")
                                ? "border-[#34a853]"
                                : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              handleShadeFieldClick(
                                "maxillary",
                                "tooth_shade",
                                `prep_${firstToothNumber}`
                              );
                              if (!isFieldCompleted("maxillary", firstToothNumber, "teeth_shade")) {
                                completeFieldStep("maxillary", firstToothNumber, "teeth_shade", "Vita Classical");
                              }
                            }}
                          >
                            <legend
                              className={`text-[11px] px-1 leading-none ${
                                isFieldCompleted("maxillary", firstToothNumber, "teeth_shade")
                                  ? "text-[#34a853]"
                                  : "text-[#CF0202]"
                              }`}
                            >
                              Teeth shade
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[13px] text-[#1d1d1b]">
                                {getFieldValue("maxillary", firstToothNumber, "teeth_shade")}
                              </span>
                              {isFieldCompleted("maxillary", firstToothNumber, "teeth_shade") && (
                                <Check size={16} className="text-[#34a853] ml-auto" />
                              )}
                            </div>
                          </fieldset>

                          {isFieldVisible("maxillary", firstToothNumber, "gum_shade") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "gum_shade")
                                  ? "border-[#34a853]"
                                  : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                if (!isFieldCompleted("maxillary", firstToothNumber, "gum_shade")) {
                                  completeFieldStep("maxillary", firstToothNumber, "gum_shade", "GC Initial Gingiva");
                                }
                              }}
                            >
                              <legend
                                className={`text-[11px] px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "gum_shade")
                                    ? "text-[#34a853]"
                                    : "text-[#CF0202]"
                                }`}
                              >
                                Gum Shade
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[13px] text-[#1d1d1b] truncate">
                                  {getFieldValue("maxillary", firstToothNumber, "gum_shade")}
                                </span>
                                <svg
                                  width="29"
                                  height="29"
                                  viewBox="0 0 29 29"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="flex-shrink-0"
                                >
                                  <rect width="28.0391" height="28.0391" rx="6" fill="#E58D8D" />
                                </svg>
                                {isFieldCompleted("maxillary", firstToothNumber, "gum_shade") && (
                                  <Check size={16} className="text-[#34a853] flex-shrink-0" />
                                )}
                              </div>
                            </fieldset>
                          ) : (
                            <div />
                          )}
                        </div>
                      )}

                      {/* Step 3: Impression / Add ons */}
                      {isFieldVisible("maxillary", firstToothNumber, "impression") && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "impression")
                                ? "border-[#34a853]"
                                : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              handleOpenImpressionModal("maxillary", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                            }}
                          >
                            <legend
                              className={`text-[11px] px-1 leading-none ${
                                isFieldCompleted("maxillary", firstToothNumber, "impression")
                                  ? "text-[#34a853]"
                                  : "text-[#CF0202]"
                              }`}
                            >
                              Impression
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[13px] text-[#1d1d1b] truncate">
                                {getFieldValue("maxillary", firstToothNumber, "impression")}
                              </span>
                              {isFieldCompleted("maxillary", firstToothNumber, "impression") && (
                                <Check size={16} className="text-[#34a853] ml-auto" />
                              )}
                            </div>
                          </fieldset>

                          {isFieldVisible("maxillary", firstToothNumber, "addons") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "addons")
                                  ? "border-[#34a853]"
                                  : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                              }}
                            >
                              <legend
                                className={`text-[11px] px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "addons")
                                    ? "text-[#34a853]"
                                    : "text-[#CF0202]"
                                }`}
                              >
                                Add ons
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[13px] text-[#1d1d1b] truncate">
                                  {getFieldValue("maxillary", firstToothNumber, "addons")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "addons") && (
                                  <Check size={16} className="text-[#34a853] ml-auto" />
                                )}
                              </div>
                            </fieldset>
                          ) : (
                            <div />
                          )}
                        </div>
                      )}

                      {/* Bottom action buttons */}
                      {isFieldCompleted("maxillary", firstToothNumber, "addons") && (
                        <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                          <button
                            onClick={() => {
                              handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                            }}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              {getFieldValue("maxillary", firstToothNumber, "addons")
                                ? `Add ons (${getFieldValue("maxillary", firstToothNumber, "addons").split(",").length} selected)`
                                : "Add ons"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAttachModal(true)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              Attach Files
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenRushModal("maxillary", `prep_${firstToothNumber}`)
                            }
                            className="relative flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              Request Rush
                            </span>
                            <Zap
                              className="w-[8.78px] h-[10.54px] flex-shrink-0 text-[#CF0202]"
                              strokeWidth={0.878154}
                            />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <ScrollToBottom />
                </div>
                )}
              </div>
              );
            });
          })()}

          {/* Added product accordions — full field workflow, teeth owned by each card */}
          {showDetails && !caseSubmitted && addedProducts
            .filter(ap => ap.arch === "maxillary")
            .map((ap, apIndex) => {
              const cardTeeth = maxillaryTeeth.filter(
                tn => getToothProductCard("maxillary", tn) === ap.id
              );
              const cardProduct = cardTeeth.length > 0
                ? getToothProduct("maxillary", cardTeeth[0])
                : null;
              const cardProductName = cardProduct?.name || ap.product.name || "Untitled Product";
              const cardProductImage = cardProduct?.image_url || ap.product.image_url || null;
              const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product.category_name || "";
              const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product.subcategory_name || "";
              const cardToothDisplay = cardTeeth.map(n => `#${n}`).join(", ");
              const isActive = activeProductCardId === ap.id;

              return (
                <div
                  key={ap.id}
                  className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      toggleAddedProductExpanded(ap.id);
                      setActiveProductCardId(isActive ? 0 : ap.id);
                    }}
                    className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${isActive ? "bg-[#c8e2f7] hover:bg-[#b8d8f4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
                  >
                    <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {cardProductImage ? (
                        <img src={cardProductImage} alt={cardProductName} className="w-[61.58px] h-[28.79px] object-contain" />
                      ) : (
                        <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">No img</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left flex flex-col">
                      <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                        {cardProductName}
                      </p>
                      {cardToothDisplay && (
                        <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                          {cardToothDisplay}
                        </p>
                      )}
                      <div className="flex items-center gap-[5px] flex-wrap">
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                          Product {apIndex + 2}
                        </span>
                        {cardCategoryName && (
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                            {cardCategoryName}
                          </span>
                        )}
                        {cardSubcategoryName && (
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                            {cardSubcategoryName}
                          </span>
                        )}
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-[#B4B0B0]">
                          {isActive ? "Active — click teeth to assign" : "Click to activate"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                          className="ml-1 hover:text-red-500 transition-colors"
                          title="Remove product"
                        >
                          <Trash2 size={9} className="text-[#999999] hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    <ChevronDown
                      size={21.6}
                      className={`text-black flex-shrink-0 transition-transform ${ap.expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {ap.expanded && (
                    <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue">
                      {cardTeeth.length === 0 ? (
                        <p className="text-[12px] text-[#b4b0b0] text-center py-4">
                          Select teeth from the chart above to assign them to this product.
                        </p>
                      ) : (
                        cardTeeth.map(tn => {
                          const toothProduct = getToothProduct("maxillary", tn);
                          const isFixed = toothProduct?.subcategory?.category?.name === "Fixed Restoration";
                          const fixedChain = isFixed ? getFixedFieldChain(toothProduct?.advance_fields) : undefined;
                          const isF = (step: string) => isFieldVisible("maxillary", tn, step as any, fixedChain);
                          const isFComplete = (step: string) => isFieldCompleted("maxillary", tn, step as any);
                          const fVal = (step: string) => getFieldValue("maxillary", tn, step as any);

                          return (
                            <div key={tn} className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                              <p className="font-[Verdana] text-[11px] font-semibold text-[#1d1d1b]">Tooth #{tn}</p>

                              {/* Product - Material */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                                  <legend className="text-[11px] text-[#34a853] px-1">Product - Material</legend>
                                  <span className="text-[13px] text-[#1d1d1b] truncate">{toothProduct?.name || cardProductName}</span>
                                  <Check size={14} className="text-[#34a853] ml-auto flex-shrink-0" />
                                </fieldset>
                              </div>

                              {/* Stage */}
                              {(isFixed ? isF("fixed_stage") : isF("stage")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete(isFixed ? "fixed_stage" : "stage") ? "border-[#34a853]" : "border-[#CF0202]"}`}
                                  onClick={() => handleOpenStageModal(isFixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, "maxillary", tn)}
                                >
                                  <legend className={`text-[11px] px-1 ${isFComplete(isFixed ? "fixed_stage" : "stage") ? "text-[#34a853]" : "text-[#CF0202]"}`}>Stage</legend>
                                  <span className="text-[13px] text-[#1d1d1b] truncate flex-1">{fVal(isFixed ? "fixed_stage" : "stage") || selectedStages[isFixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`] || ""}</span>
                                  {isFComplete(isFixed ? "fixed_stage" : "stage") && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}

                              {/* Impression */}
                              {(isFixed ? isF("fixed_impression") : isF("impression")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete(isFixed ? "fixed_impression" : "impression") ? "border-[#34a853]" : "border-[#CF0202]"}`}
                                  onClick={() => handleOpenImpressionModal("maxillary", isFixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, tn)}
                                >
                                  <legend className={`text-[11px] px-1 ${isFComplete(isFixed ? "fixed_impression" : "impression") ? "text-[#34a853]" : "text-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[13px] text-[#1d1d1b] truncate flex-1">{fVal(isFixed ? "fixed_impression" : "impression") || getImpressionDisplayText(isFixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, "maxillary", tn)}</span>
                                  {isFComplete(isFixed ? "fixed_impression" : "impression") && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}

                              {/* Add-ons */}
                              {(isFixed ? isF("fixed_addons") : isF("addons")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete(isFixed ? "fixed_addons" : "addons") ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                                  onClick={() => handleOpenAddOnsModal("maxillary", isFixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, tn)}
                                >
                                  <legend className={`text-[11px] px-1 ${isFComplete(isFixed ? "fixed_addons" : "addons") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Add ons</legend>
                                  <span className="text-[13px] text-[#1d1d1b] truncate flex-1">{fVal(isFixed ? "fixed_addons" : "addons") || "0 selected"}</span>
                                  {isFComplete(isFixed ? "fixed_addons" : "addons") && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* Bottom actions */}
                      <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                        <button
                          type="button"
                          onClick={() => setShowAttachModal(true)}
                          className="flex-none w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                        >
                          <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                          <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
                        </button>
                      </div>
                      <ScrollToBottom />
                    </div>
                  )}
                </div>
              );
            })
          }

        </>
      )}
    </div>
  );
}
