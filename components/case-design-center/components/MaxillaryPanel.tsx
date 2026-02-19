"use client";

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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MaxillaryPanelProps {
  // Visibility
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;
  showDetails: boolean;

  // Add product callback
  onAddProduct?: (arch: Arch) => void;

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

  // Tooth field progress (Prep/Pontic step-by-step)
  isFieldVisible: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
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
  onAddProduct,
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
  return (
    <div className="flex-1 min-w-0 px-0 md:px-3 order-1 lg:order-none">
      {/* Maxillary header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        <h3 className="text-[12px] md:text-[14px] font-bold text-[#1d1d1b] tracking-wide">
          MAXILLARY
        </h3>
        {showDetails && (
          <button
            onClick={() => onAddProduct?.("maxillary")}
            className="flex items-center gap-1.5 bg-[#1162A8] hover:bg-[#0d4a85] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md"
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
                <div className="border-t border-[#d9d9d9] p-4 bg-white space-y-3">

                  {categoryName === "Fixed Restoration" ? (
                    <>
                      {/* ===== FIXED RESTORATION: All fields shown at once ===== */}

                      {/* Product - Material / Select Retention type */}
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

                      {/* Implant Detail - show if any tooth in group has Implant retention */}
                      {toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && (
                        <ImplantDetailSection toothNumber={firstToothNumber} />
                      )}

                      {/* Stage / Stump Shade */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldInput
                          label="Stage"
                          value={selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[`maxillary_fixed_${firstToothNumber}`] || ""}
                          onClick={() => handleOpenStageModal(`maxillary_fixed_${firstToothNumber}`, "maxillary", firstToothNumber)}
                        />
                        <ShadeField
                          label="Stump Shade"
                          value=""
                          shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "stump_shade")}
                          onClick={() => handleShadeFieldClick("maxillary", "stump_shade", `fixed_${firstToothNumber}`)}
                        />
                      </div>

                      {/* Cervical / Incisal / Body Shade */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ShadeField
                          label="Cervical Shade"
                          value=""
                          shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                          onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                        />
                        <ShadeField
                          label="Incisal Shade"
                          value=""
                          shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                          onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                        />
                        <ShadeField
                          label="Body Shade"
                          value=""
                          shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                          onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                        />
                      </div>

                      {/* Characterization / Intensity / Surface finish */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldInput label="Characterization" value="" />
                        <FieldInput label="Intensity" value="" />
                        <FieldInput label="Surface finish" value="" />
                      </div>

                      {/* Occlusal Contact / Pontic Design / Embrasures / Proximal Contact */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <IconField label="Occlusal Contact" value="" icon="occlusal" />
                        <IconField label="Pontic Design" value="" icon="pontic" />
                        <IconField label="Embrasures" value="" icon="embrasures" />
                        <IconField label="Proximal Contact" value="" icon="proximal" />
                      </div>

                      {/* Margin Design / Margin Depth / Occlusal Reduction / Axial Reduction */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <FieldInput label="Margin Design" value="" />
                        <FieldInput label="Margin Depth" value="" />
                        <FieldInput label="Occlusal Reduction" value="" />
                        <FieldInput label="Axial Reduction" value="" />
                      </div>

                      {/* Metal Design / Metal Thickness / Modification */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldInput label="Metal Design" value="" />
                        <FieldInput label="Metal Thickness" value="" />
                        <FieldInput label="Modification" value="" />
                      </div>

                      {/* Proximal Contact Mesial / Distal / Functional Guidance */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldInput label="Proximal Contact – Mesial" value="" />
                        <FieldInput label="Proximal Contact – Distal" value="" />
                        <FieldInput label="Functional Guidance" value="" />
                      </div>

                      {/* Impression / Add ons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldInput
                          label="Impression"
                          value={getImpressionDisplayText(selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, "maxillary")}
                          onClick={() => handleOpenImpressionModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber)}
                        />
                        <FieldInput
                          label="Add ons"
                          value=""
                          onClick={() => handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber)}
                        />
                      </div>

                      {/* Additional notes */}
                      <fieldset className="border border-[#7f7f7f] rounded px-3 pb-2 pt-0">
                        <legend className="text-[11px] text-[#7f7f7f] px-1 leading-none">
                          Additional notes
                        </legend>
                        <textarea
                          rows={3}
                          placeholder="Enter additional notes..."
                          className="w-full text-[12px] text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
                        />
                      </fieldset>

                      {/* Bottom action buttons */}
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
                    </>
                  ) : (
                    <>
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
                </div>
                )}
              </div>
              );
            });
          })()}

          {/* Status boxes, product accordions - hidden initially until showDetails */}
          {showDetails && (
            <>
           
              {/* Restoration product card (Metal frame acrylic) - full accordion */}
              <div
                className={`rounded-lg bg-white overflow-hidden ${
                  rushedProducts["maxillary_removable_1"]
                    ? "border-2 border-[#CF0202]"
                    : "border border-[#d9d9d9]"
                }`}
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => setExpandedLeft(!expandedLeft)}
                  className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
                    rushedProducts["maxillary_removable_1"]
                      ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                      : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                  }`}
                >
                  <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48&query=dental+partial+denture+tooth"
                      alt="Restoration"
                      className="w-[61.58px] h-[28.79px] object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col">
                    <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black flex items-center gap-1">
                      Metal frame acrylic
                      {rushedProducts["maxillary_removable_1"] && (
                        <Zap
                          className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0"
                          strokeWidth={2}
                          fill="#CF0202"
                        />
                      )}
                    </p>
                    <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                      #4,5
                    </p>
                    <div className="flex items-center gap-[5px] flex-wrap">
                      <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                        Removable Restoration
                      </span>
                      <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                        Partial denture
                      </span>
                      <span
                        className={`font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] ${
                          rushedProducts["maxillary_removable_1"]
                            ? "text-[#CF0202] font-medium"
                            : "text-[#B4B0B0]"
                        }`}
                      >
                        Est days:{" "}
                        {rushedProducts["maxillary_removable_1"]
                          ? "5 work days after submission"
                          : "10 work days after submission"}
                      </span>
                      <Trash2 size={9} className="text-[#999999]" />
                    </div>
                  </div>
                  <ChevronDown
                    size={21.6}
                    className={`text-black flex-shrink-0 transition-transform ${
                      expandedLeft ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Accordion body */}
                {expandedLeft && (
                  <div className="border-t border-[#d9d9d9] p-4 bg-white space-y-3">
                    {/* Grade / Stage */}
                    <div className="grid grid-cols-2 gap-3">
                      <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                        <legend className="text-[11px] text-[#34a853] px-1 leading-none">
                          Grade
                        </legend>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#1d1d1b]">
                            Standard
                          </span>
                          <div className="flex gap-1 ml-auto">
                            <BlueDiamond />
                            <BlueDiamond />
                            <GrayDiamond />
                            <GrayDiamond />
                          </div>
                          <Check size={16} className="text-[#34a853]" />
                        </div>
                      </fieldset>
                      <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                        <legend className="text-[11px] text-[#34a853] px-1 leading-none">
                          Stage
                        </legend>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#1d1d1b]">
                            Try in with teeth
                          </span>
                          <Check size={16} className="text-[#34a853]" />
                          <div className="ml-auto">
                            <ArticulatorIcon />
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    {/* Teeth shade / Gum Shade */}
                    <div className="grid grid-cols-2 gap-3">
                      <ShadeField
                        label="Teeth shade"
                        value="Vita Classical"
                        shade={
                          getSelectedShade(
                            "removable_metal_frame",
                            "maxillary",
                            "tooth_shade"
                          ) || "A2"
                        }
                        onClick={() =>
                          handleShadeFieldClick(
                            "maxillary",
                            "tooth_shade",
                            "removable_metal_frame"
                          )
                        }
                      />
                      <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                        <legend className="text-[11px] text-[#34a853] px-1 leading-none">
                          Gum Shade
                        </legend>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            defaultValue="GC Initial Gingiva, G-Intense"
                            className="flex-1 text-[13px] text-[#1d1d1b] bg-transparent outline-none leading-tight min-w-0"
                          />
                          <svg
                            width="29"
                            height="29"
                            viewBox="0 0 29 29"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect
                              width="28.0391"
                              height="28.0391"
                              rx="6"
                              fill="#E58D8D"
                            />
                          </svg>
                          <Check size={16} className="text-[#34a853]" />
                        </div>
                      </fieldset>
                    </div>

                    {/* Impression / Add ons */}
                    <div className="grid grid-cols-2 gap-3">
                      <FieldInput
                        label="Impression"
                        value={
                          getImpressionDisplayText("removable_1", "maxillary") ||
                          "1x Clean impression, 1x STL"
                        }
                        onClick={() =>
                          handleOpenImpressionModal("maxillary", "removable_1")
                        }
                      />
                      <FieldInput
                        label="Add ons"
                        value="1x Gold tooth, 2x clasps, 1x custom tray..."
                        onClick={() =>
                          handleOpenAddOnsModal("maxillary", "removable_1")
                        }
                      />
                    </div>

                    {/* Bottom action buttons */}
                    <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                      <button
                        onClick={() =>
                          handleOpenAddOnsModal("maxillary", "removable_1")
                        }
                        className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                      >
                        <Plus
                          size={10}
                          className="text-[#1E1E1E]"
                          strokeWidth={1.5}
                        />
                        <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                          Add ons (3 selected)
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAttachModal(true)}
                        className="flex-none order-1 flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                      >
                        <Paperclip
                          size={10}
                          className="text-[#1E1E1E]"
                          strokeWidth={1.5}
                        />
                        <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                          Attach Files (15 uploads)
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenRushModal("maxillary", "removable_1")
                        }
                        className={`relative flex-none order-3 flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors ${
                          rushedProducts["maxillary_removable_1"]
                            ? "bg-[#CF0202]"
                            : "bg-[#F9F9F9]"
                        }`}
                      >
                        <span
                          className={`font-["Verdana"] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] whitespace-nowrap ${
                            rushedProducts["maxillary_removable_1"]
                              ? "text-white"
                              : "text-black"
                          }`}
                        >
                          {rushedProducts["maxillary_removable_1"]
                            ? "Rushed"
                            : "Request Rush"}
                        </span>
                        <Zap
                          className={`w-[8.78px] h-[10.54px] flex-shrink-0 ${
                            rushedProducts["maxillary_removable_1"]
                              ? "text-white"
                              : "text-[#CF0202]"
                          }`}
                          strokeWidth={0.878154}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamically added maxillary products */}
              {addedProducts
                .filter((ap) => ap.arch === "maxillary")
                .map((ap) => (
                  <div
                    key={ap.id}
                    className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAddedProductExpanded(ap.id)}
                      className="w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                    >
                      <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {ap.product.image_url ? (
                          <img
                            src={ap.product.image_url}
                            alt={ap.product.name || "Product"}
                            className="w-[61.58px] h-[28.79px] object-contain"
                          />
                        ) : (
                          <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-[10px] text-gray-400">
                              No img
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left flex flex-col">
                        <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                          {ap.product.name || "Untitled Product"}
                        </p>
                        <div className="flex items-center gap-[5px] flex-wrap">
                          {ap.product.category_name && (
                            <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                              {ap.product.category_name}
                            </span>
                          )}
                          {ap.product.subcategory_name && (
                            <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                              {ap.product.subcategory_name}
                            </span>
                          )}
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-[#B4B0B0]">
                            Est days: 10 work days after submission
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAddedProduct(ap.id);
                            }}
                            className="ml-1 hover:text-red-500 transition-colors"
                            title="Remove product"
                          >
                            <Trash2
                              size={9}
                              className="text-[#999999] hover:text-red-500"
                            />
                          </button>
                        </div>
                      </div>
                      <ChevronDown
                        size={21.6}
                        className={`text-black flex-shrink-0 transition-transform ${
                          ap.expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {ap.expanded && (
                      <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldInput
                            label="Product - Material"
                            value={ap.product.name || ""}
                          />
                          <FieldInput
                            label="Category"
                            value={
                              ap.product.category_name ||
                              ap.product.category?.name ||
                              ""
                            }
                          />
                        </div>
                        {ap.product.code && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldInput
                              label="Product Code"
                              value={ap.product.code}
                            />
                            <FieldInput
                              label="Arch"
                              value={
                                ap.arch === "maxillary"
                                  ? "Maxillary (Upper)"
                                  : "Mandibular (Lower)"
                              }
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAddOnsModal(
                                "maxillary",
                                `added_${ap.id}`
                              )
                            }
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Plus
                              size={10}
                              className="text-[#1E1E1E]"
                              strokeWidth={1.5}
                            />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              Add ons
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAttachModal(true)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Paperclip
                              size={10}
                              className="text-[#1E1E1E]"
                              strokeWidth={1.5}
                            />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              Attach Files
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
