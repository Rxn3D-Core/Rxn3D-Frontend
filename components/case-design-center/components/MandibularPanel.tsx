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
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import {
  FieldInput,
  ShadeField,
  IconField,
} from "./fields";
import { ShadeSelectionGuide } from "./ShadeSelectionGuide";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
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
import { ImplantDetailSection } from "./ImplantDetailSection";

/* ------------------------------------------------------------------ */
/*  Articulator icon (Stage field)                                     */
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
        fill="url(#pattern0_mandibular)"
      />
      <defs>
        <pattern
          id="pattern0_mandibular"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_mandibular"
            transform="translate(0 -0.166667) scale(0.000326797)"
          />
        </pattern>
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

/**
 * Check whether a FIXED_FIELD_STEPS key has a matching advance_field in the product API response.
 * Returns true (show the field) when:
 *  - No advance_fields on the product (show all — no gating)
 *  - The step always shows regardless of advance_fields (stage, impression, addons, notes)
 *  - A matching advance_field name is found
 */
function hasAdvanceField(
  step: string,
  advanceFields: Array<{ name: string; field_type: string }> | undefined
): boolean {
  const alwaysShow = ["fixed_stage", "fixed_impression", "fixed_addons", "fixed_notes"];
  if (alwaysShow.includes(step)) return true;
  if (!advanceFields || advanceFields.length === 0) return true;

  const names = advanceFields.map((f) => (f.name || "").toLowerCase());

  switch (step) {
    case "fixed_stump_shade":
      return names.some((n) => n.includes("stump") && n.includes("shade"));
    case "fixed_shade_trio":
      return names.some(
        (n) =>
          (n.includes("tooth") && n.includes("shade")) ||
          (n.includes("crown") && n.includes("shade")) ||
          n.includes("cervical") ||
          n.includes("incisal") ||
          n.includes("body shade")
      );
    case "fixed_characterization":
      return names.some((n) => n.includes("characterization") || n.includes("character"));
    case "fixed_contact_icons":
      return names.some(
        (n) =>
          n.includes("occlusal") ||
          n.includes("pontic") ||
          n.includes("embrasure") ||
          (n.includes("proximal") && n.includes("contact"))
      );
    case "fixed_margin":
      return names.some((n) => n.includes("margin"));
    case "fixed_metal":
      return names.some((n) => n.includes("metal"));
    case "fixed_proximal_contact":
      return names.some((n) => n.includes("proximal") && n.includes("contact"));
    default:
      return true;
  }
}

interface MandibularPanelProps {
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;
  onAddProduct?: (arch: "maxillary" | "mandibular") => void;

  // Teeth
  mandibularTeeth: number[];
  handleMandibularToothClick: (tooth: number) => void;
  handleMandibularToothDeselect: (tooth: number) => void;
  mandibularRetentionTypes: Record<number, Array<RetentionType>>;

  // Retention popover
  retentionPopoverState: RetentionPopoverState;
  setRetentionPopoverState: (state: RetentionPopoverState) => void;
  handleSelectRetentionType: (arch: Arch, tooth: number, type: RetentionType) => void;

  // Shade selection
  shadeSelectionState: ShadeSelectionState;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
  selectedShadeGuide: string;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  setSelectedShadeGuide: (v: string) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (productId: string, arch: Arch, fieldType: ShadeFieldType) => string;
  handleShadeSelect: (shade: string) => void;
  handleShadeFieldClick: (arch: Arch, fieldType: ShadeFieldType, productId: string) => void;

  // Expansion (Prep/Pontic)
  isPrepPonticExpanded: (toothNumber: number) => boolean;
  togglePrepPonticExpanded: (toothNumber: number) => void;

  // Stage
  handleOpenStageModal: (productId: string, arch?: Arch, toothNumber?: number) => void;

  // Impression
  handleOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  getImpressionDisplayText: (productId: string, arch: Arch) => string;

  // Add-ons
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;

  // Stages
  selectedStages: Record<string, string>;

  // Attach files
  setShowAttachModal: (v: boolean) => void;

  // Rush
  rushedProducts: Record<string, boolean>;
  handleOpenRushModal: (arch: Arch, productId: string) => void;

  // Added products
  addedProducts: AddedProduct[];
  toggleAddedProductExpanded: (id: number) => void;
  handleRemoveAddedProduct: (id: number) => void;

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
  mandibularToothExtractionMap: Record<number, string>;
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string) => void;
  selectAllMandibularTeeth: (teeth: number[]) => void;
  clearAllMandibularTeeth: () => void;
}

export function MandibularPanel({
  showMandibular,
  setShowMandibular,
  showDetails,
  caseSubmitted = false,
  onAddProduct,
  mandibularTeeth,
  handleMandibularToothClick,
  handleMandibularToothDeselect,
  mandibularRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  handleSelectRetentionType,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  setSelectedShadeGuide,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
  handleShadeFieldClick,
  isPrepPonticExpanded,
  togglePrepPonticExpanded,
  handleOpenStageModal,
  handleOpenImpressionModal,
  getImpressionDisplayText,
  handleOpenAddOnsModal,
  selectedStages,
  setShowAttachModal,
  rushedProducts,
  handleOpenRushModal,
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
  mandibularToothExtractionMap,
  handleToothExtractionToggle,
  selectAllMandibularTeeth,
  clearAllMandibularTeeth,
}: MandibularPanelProps) {
  const MANDIBULAR_ALL_TEETH = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  return (
    <div className={`flex-1 min-w-0 px-0 md:px-3 order-3 lg:order-none${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
      {/* Mandibular header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        {showDetails && !caseSubmitted && (
          <button
            onClick={() => onAddProduct?.('mandibular')}
            className="flex items-center gap-1.5 bg-[#1162A8] hover:bg-[#0d4a85] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md">
            <Plus size={13} strokeWidth={1.5} />
            Add Product
          </button>
        )}
        <h3 className="text-[12px] md:text-[14px] font-bold text-[#1d1d1b] tracking-wide">
          MANDIBULAR
        </h3>
      </div>

      {/* Eye toggle - always visible */}
      <div className="flex justify-end mb-1">
        <button
          onClick={() => setShowMandibular(!showMandibular)}
          className="flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
          title={showMandibular ? "Hide Mandibular" : "Show Mandibular"}
        >
          {showMandibular
            ? <Eye size={13.5} className="text-[#b4b0b0]" />
            : <EyeOff size={13.5} className="text-[#b4b0b0]" />
          }
        </button>
      </div>

      {/* Mandibular section - conditionally shown */}
      {showMandibular && (
        <>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MandibularTeethSVG
                selectedTeeth={mandibularTeeth}
                onToothClick={handleMandibularToothClick}
                className="w-full"
                retentionTypesByTooth={mandibularRetentionTypes}
                showRetentionPopover={retentionPopoverState.arch === 'mandibular'}
                retentionPopoverTooth={retentionPopoverState.toothNumber}
                onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                onDeselectTooth={handleMandibularToothDeselect}
              />
            </div>
          </div>

          {/* Shade Selection Guide - Mandibular */}
          {shadeSelectionState.arch === 'mandibular' && (
            <ShadeSelectionGuide
              arch="mandibular"
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
            const allExtractions = mandibularTeeth.flatMap((tn) => {
              const product = getToothProduct("mandibular", tn);
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
                  selectedTeeth={mandibularTeeth}
                  allArchTeeth={MANDIBULAR_ALL_TEETH}
                  toothExtractionMap={mandibularToothExtractionMap}
                  activeExtractionCode={activeExtractionCode}
                  onActiveExtractionChange={setActiveExtractionCode}
                  onToothExtractionToggle={(tn, code) => handleToothExtractionToggle("mandibular", tn, code)}
                  onSelectAllTeeth={selectAllMandibularTeeth}
                  onClearAllTeeth={clearAllMandibularTeeth}
                />
              </div>
            );
          })()}

          {/* ---- Dynamic product accordions based on category ---- */}
          {(() => {
                // Get all mandibular teeth with retention types
                const allTeeth = Object.entries(mandibularRetentionTypes)
                  .filter(([_, types]) =>
                    types.some((t) => t === "Prep" || t === "Pontic" || t === "Implant")
                  )
                  .map(([toothNum, types]) => ({
                    toothNumber: Number(toothNum),
                    retentionType: types.find((t) => t === "Prep" || t === "Pontic" || t === "Implant")!,
                  }));

                if (allTeeth.length === 0) return null;

                // Group teeth by product ID
                const groupedByProduct: Record<string, typeof allTeeth> = {};
                for (const tooth of allTeeth) {
                  const product = getToothProduct("mandibular", tooth.toothNumber);
                  const groupKey = product?.id ? String(product.id) : "no_product";
                  if (!groupedByProduct[groupKey]) groupedByProduct[groupKey] = [];
                  groupedByProduct[groupKey].push(tooth);
                }

                return Object.entries(groupedByProduct).map(([groupKey, teeth]) => {
                  const firstTooth = teeth[0];
                  const firstToothNumber = firstTooth.toothNumber;
                  const selectedProduct = getToothProduct("mandibular", firstToothNumber);
                  const productName = selectedProduct?.name || "Select Product";
                  const productImage = selectedProduct?.image_url || "/placeholder.svg?height=48&width=48&query=dental+crown+implant+tooth";
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
                  const hasRushed = toothNumbers.some((n) => rushedProducts[`mandibular_prep_${n}`] || rushedProducts[`mandibular_fixed_${n}`]);

                  // Show skeleton while product is loading
                  const isLoading = !selectedProduct && teeth.some((t) => isProductLoading("mandibular", t.toothNumber));
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
                    isFieldVisible("mandibular", firstToothNumber, step, fixedChain);

                  // ---- Product Accordion (progressive step-by-step) ----
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
                            {(selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[`mandibular_fixed_${firstToothNumber}`]) && (
                              <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                                {selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[`mandibular_fixed_${firstToothNumber}`]}
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
                          productId={categoryName === "Fixed Restoration" ? `mandibular_fixed_${firstToothNumber}` : `mandibular_prep_${firstToothNumber}`}
                          arch="mandibular"
                          toothNumber={firstToothNumber}
                          isExpanded={true}
                          isStageVisible={categoryName === "Fixed Restoration" ? isFieldVisible("mandibular", firstToothNumber, "fixed_stage") : isFieldVisible("mandibular", firstToothNumber, "stage")}
                          isStageEmpty={categoryName === "Fixed Restoration" ? !(selectedStages[`mandibular_fixed_${firstToothNumber}`] || getFieldValue("mandibular", firstToothNumber, "fixed_stage")) : !(selectedStages[`mandibular_prep_${firstToothNumber}`] || getFieldValue("mandibular", firstToothNumber, "stage"))}
                          onOpenStage={handleOpenStageModal}
                        />
                        {categoryName === "Fixed Restoration" && (
                          <>
                            <AutoOpenShadeGuideIfEmpty
                              arch="mandibular"
                              productId={`fixed_${firstToothNumber}`}
                              isExpanded={true}
                              isShadeSectionVisible={isFieldVisible("mandibular", firstToothNumber, "fixed_stump_shade") || isFieldVisible("mandibular", firstToothNumber, "fixed_shade_trio")}
                              stumpShadeEmpty={!getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "stump_shade")}
                              toothShadeEmpty={!getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                              setShadeSelectionState={setShadeSelectionState}
                            />
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isPrepPonticExpanded(firstToothNumber)}
                              isImpressionVisible={isFieldVisible("mandibular", firstToothNumber, "fixed_impression")}
                              isImpressionEmpty={!isFieldCompleted("mandibular", firstToothNumber, "fixed_impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="mandibular"
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

                            {/* Step 1 & 2: Stage and Stump Shade in one row */}
                            {(isFieldVisible("mandibular", firstToothNumber, "fixed_stage") || (isFieldVisible("mandibular", firstToothNumber, "fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", selectedProduct?.advance_fields))) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isFieldVisible("mandibular", firstToothNumber, "fixed_stage") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "fixed_stage")
                                        ? "border-[#34a853]"
                                        : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      handleOpenStageModal(`mandibular_fixed_${firstToothNumber}`, "mandibular", firstToothNumber);
                                    }}
                                  >
                                    <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_stage") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                                      Stage
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[13px] text-[#1d1d1b]">
                                        {selectedStages[`mandibular_fixed_${firstToothNumber}`] || getFieldValue("mandibular", firstToothNumber, "fixed_stage")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "fixed_stage") && (
                                        <Check size={16} className="text-[#34a853] ml-auto" />
                                      )}
                                      <div className={isFieldCompleted("mandibular", firstToothNumber, "fixed_stage") ? "" : "ml-auto"}>
                                        <ArticulatorIcon />
                                      </div>
                                    </div>
                                  </fieldset>
                                )}
                                {isFieldVisible("mandibular", firstToothNumber, "fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", selectedProduct?.advance_fields) && (
                                  <ShadeField
                                    label="Stump Shade"
                                    value={selectedShadeGuide}
                                    shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "stump_shade")}
                                    onClick={() => handleShadeFieldClick("mandibular", "stump_shade", `fixed_${firstToothNumber}`)}
                                  />
                                )}
                              </div>
                            )}

                            {/* Step 3: Cervical / Incisal / Body Shade (no Tooth Shade field) */}
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_shade_trio") && hasAdvanceField("fixed_shade_trio", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ShadeField
                                  label="Cervical Shade"
                                  value={selectedShadeGuide}
                                  shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                                  onClick={() => {
                                    handleShadeFieldClick("mandibular", "tooth_shade", `fixed_${firstToothNumber}`);
                                    if (!isFieldCompleted("mandibular", firstToothNumber, "fixed_shade_trio")) {
                                      completeFieldStep("mandibular", firstToothNumber, "fixed_shade_trio", "selected");
                                    }
                                  }}
                                />
                                <ShadeField
                                  label="Incisal Shade"
                                  value={selectedShadeGuide}
                                  shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                                  onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", `fixed_${firstToothNumber}`)}
                                />
                                <ShadeField
                                  label="Body Shade"
                                  value={selectedShadeGuide}
                                  shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                                  onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", `fixed_${firstToothNumber}`)}
                                />
                              </div>
                            )}

                            {/* Implant Detail - shown after shade selection, always when applicable */}
                            {toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant")) && (
                              <ImplantDetailSection toothNumber={firstToothNumber} />
                            )}

                            {/* Step 4: Characterization / Intensity / Surface finish */}
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_characterization") && hasAdvanceField("fixed_characterization", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "border-[#34a853]" : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    if (!isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization")) {
                                      completeFieldStep("mandibular", firstToothNumber, "fixed_characterization", "selected");
                                    }
                                  }}
                                >
                                  <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                                    Characterization
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[13px] text-[#1d1d1b]">{getFieldValue("mandibular", firstToothNumber, "fixed_characterization")}</span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && <Check size={16} className="text-[#34a853] ml-auto" />}
                                  </div>
                                </fieldset>
                                <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "border-[#34a853]" : "border-[#d9d9d9]"}`}>
                                  <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Intensity</legend>
                                  <span className="text-[13px] text-[#1d1d1b]"></span>
                                </fieldset>
                                <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "border-[#34a853]" : "border-[#d9d9d9]"}`}>
                                  <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Surface finish</legend>
                                  <span className="text-[13px] text-[#1d1d1b]"></span>
                                </fieldset>
                              </div>
                            )}

                            {/* Step 5: Occlusal Contact / Pontic Design / Embrasures / Proximal Contact */}
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_contact_icons") && hasAdvanceField("fixed_contact_icons", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {(["occlusal", "pontic", "embrasures", "proximal"] as const).map((icon, idx) => {
                                  const labels = ["Occlusal Contact", "Pontic Design", "Embrasures", "Proximal Contact"];
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_contact_icons");
                                  return (
                                    <div
                                      key={icon}
                                      className="cursor-pointer"
                                      onClick={() => {
                                        if (!isCompleted) {
                                          completeFieldStep("mandibular", firstToothNumber, "fixed_contact_icons", "selected");
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
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_margin") && hasAdvanceField("fixed_margin", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {["Margin Design", "Margin Depth", "Occlusal Reduction", "Axial Reduction"].map((label, idx) => {
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_margin");
                                  return (
                                    <fieldset
                                      key={label}
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                        isCompleted ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                      }`}
                                      onClick={() => {
                                        if (!isCompleted) completeFieldStep("mandibular", firstToothNumber, "fixed_margin", "selected");
                                      }}
                                    >
                                      <legend className={`text-[11px] px-1 leading-none ${isCompleted ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
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
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_metal") && hasAdvanceField("fixed_metal", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {["Metal Design", "Metal Thickness", "Modification"].map((label, idx) => {
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_metal");
                                  return (
                                    <fieldset
                                      key={label}
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                        isCompleted ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                      }`}
                                      onClick={() => {
                                        if (!isCompleted) completeFieldStep("mandibular", firstToothNumber, "fixed_metal", "selected");
                                      }}
                                    >
                                      <legend className={`text-[11px] px-1 leading-none ${isCompleted ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
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
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_proximal_contact") && hasAdvanceField("fixed_proximal_contact", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {["Proximal Contact – Mesial", "Proximal Contact – Distal", "Functional Guidance"].map((label, idx) => {
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_proximal_contact");
                                  return (
                                    <fieldset
                                      key={label}
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                        isCompleted ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                      }`}
                                      onClick={() => {
                                        if (!isCompleted) completeFieldStep("mandibular", firstToothNumber, "fixed_proximal_contact", "selected");
                                      }}
                                    >
                                      <legend className={`text-[11px] px-1 leading-none ${isCompleted ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
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
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_impression") && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") ? "border-[#34a853]" : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    handleOpenImpressionModal("mandibular", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                                  }}
                                >
                                  <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                                    Impression
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[13px] text-[#1d1d1b] truncate">
                                      {getImpressionDisplayText(selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, "mandibular")}
                                    </span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") && (
                                      <Check size={16} className="text-[#34a853] ml-auto" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "fixed_addons") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") ? "border-[#34a853]" : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      handleOpenAddOnsModal("mandibular", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                                    }}
                                  >
                                    <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                                      Add ons
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[13px] text-[#1d1d1b] truncate">
                                        {getFieldValue("mandibular", firstToothNumber, "fixed_addons")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") && (
                                        <Check size={16} className="text-[#34a853] ml-auto" />
                                      )}
                                    </div>
                                  </fieldset>
                                ) : (
                                  <div />
                                )}
                              </div>
                            )}

                            {/* Step 10: Additional notes */}
                            {isFieldVisible("mandibular", firstToothNumber, "fixed_notes") && (
                              <fieldset
                                className={`border rounded px-3 pb-2 pt-0 ${
                                  isFieldCompleted("mandibular", firstToothNumber, "fixed_notes") ? "border-[#34a853]" : "border-[#CF0202]"
                                }`}
                              >
                                <legend className={`text-[11px] px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_notes") ? "text-[#34a853]" : "text-[#CF0202]"}`}>
                                  Additional notes
                                </legend>
                                <textarea
                                  rows={3}
                                  placeholder="Enter additional notes..."
                                  className="w-full text-[12px] text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
                                  onChange={(e) => {
                                    if (e.target.value && !isFieldCompleted("mandibular", firstToothNumber, "fixed_notes")) {
                                      completeFieldStep("mandibular", firstToothNumber, "fixed_notes", e.target.value);
                                    }
                                  }}
                                />
                              </fieldset>
                            )}

                            {/* Bottom action buttons — shown after Add ons is completed */}
                            {isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") && (
                              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                                <button
                                  onClick={() => {
                                    handleOpenAddOnsModal("mandibular", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
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
                                    handleOpenRushModal("mandibular", `fixed_${firstToothNumber}`)
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
                          </>
                        ) : (
                          <>
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isPrepPonticExpanded(firstToothNumber)}
                              isImpressionVisible={isFieldVisible("mandibular", firstToothNumber, "impression")}
                              isImpressionEmpty={!isFieldCompleted("mandibular", firstToothNumber, "impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="mandibular"
                              productId={selectedProduct?.id?.toString() || `prep_${firstToothNumber}`}
                              toothNumber={firstToothNumber}
                            />
                            {/* ===== OTHER CATEGORIES: Progressive step-by-step fields ===== */}

                            {/* Implant Detail - show if any tooth in group has Implant retention */}
                            {toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant")) && (
                              <ImplantDetailSection toothNumber={firstToothNumber} />
                            )}

                            {/* Step 1: Grade / Stage */}
                            {isFieldVisible("mandibular", firstToothNumber, "grade") && (
                              <div className="grid grid-cols-2 gap-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "grade")
                                      ? "border-[#34a853]"
                                      : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    if (!isFieldCompleted("mandibular", firstToothNumber, "grade")) {
                                      completeFieldStep("mandibular", firstToothNumber, "grade", "Standard");
                                    }
                                  }}
                                >
                                  <legend
                                    className={`text-[11px] px-1 leading-none ${
                                      isFieldCompleted("mandibular", firstToothNumber, "grade")
                                        ? "text-[#34a853]"
                                        : "text-[#CF0202]"
                                    }`}
                                  >
                                    Grade
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[13px] text-[#1d1d1b]">
                                      {getFieldValue("mandibular", firstToothNumber, "grade")}
                                    </span>
                                    <div className="flex gap-1 ml-auto">
                                      <BlueDiamond />
                                      <BlueDiamond />
                                      <GrayDiamond />
                                      <GrayDiamond />
                                    </div>
                                    {isFieldCompleted("mandibular", firstToothNumber, "grade") && (
                                      <Check size={16} className="text-[#34a853]" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "stage") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "stage")
                                        ? "border-[#34a853]"
                                        : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      handleOpenStageModal(`mandibular_prep_${firstToothNumber}`, "mandibular", firstToothNumber);
                                    }}
                                  >
                                    <legend
                                      className={`text-[11px] px-1 leading-none ${
                                        isFieldCompleted("mandibular", firstToothNumber, "stage")
                                          ? "text-[#34a853]"
                                          : "text-[#CF0202]"
                                      }`}
                                    >
                                      Stage
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[13px] text-[#1d1d1b]">
                                        {getFieldValue("mandibular", firstToothNumber, "stage")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "stage") && (
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
                            {isFieldVisible("mandibular", firstToothNumber, "teeth_shade") && (
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "teeth_shade")
                                      ? "border-[#34a853]"
                                      : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    handleShadeFieldClick(
                                      "mandibular",
                                      "tooth_shade",
                                      `prep_${firstToothNumber}`
                                    );
                                    if (!isFieldCompleted("mandibular", firstToothNumber, "teeth_shade")) {
                                      completeFieldStep("mandibular", firstToothNumber, "teeth_shade", "Vita Classical");
                                    }
                                  }}
                                >
                                  <legend
                                    className={`text-[11px] px-1 leading-none ${
                                      isFieldCompleted("mandibular", firstToothNumber, "teeth_shade")
                                        ? "text-[#34a853]"
                                        : "text-[#CF0202]"
                                    }`}
                                  >
                                    Teeth shade
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[13px] text-[#1d1d1b]">
                                      {getFieldValue("mandibular", firstToothNumber, "teeth_shade")}
                                    </span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "teeth_shade") && (
                                      <Check size={16} className="text-[#34a853] ml-auto" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "gum_shade") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "gum_shade")
                                        ? "border-[#34a853]"
                                        : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      if (!isFieldCompleted("mandibular", firstToothNumber, "gum_shade")) {
                                        completeFieldStep("mandibular", firstToothNumber, "gum_shade", "GC Initial Gingiva");
                                      }
                                    }}
                                  >
                                    <legend
                                      className={`text-[11px] px-1 leading-none ${
                                        isFieldCompleted("mandibular", firstToothNumber, "gum_shade")
                                          ? "text-[#34a853]"
                                          : "text-[#CF0202]"
                                      }`}
                                    >
                                      Gum Shade
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[13px] text-[#1d1d1b] truncate">
                                        {getFieldValue("mandibular", firstToothNumber, "gum_shade")}
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
                                      {isFieldCompleted("mandibular", firstToothNumber, "gum_shade") && (
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
                            {isFieldVisible("mandibular", firstToothNumber, "impression") && (
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "impression")
                                      ? "border-[#34a853]"
                                      : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    handleOpenImpressionModal("mandibular", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                                  }}
                                >
                                  <legend
                                    className={`text-[11px] px-1 leading-none ${
                                      isFieldCompleted("mandibular", firstToothNumber, "impression")
                                        ? "text-[#34a853]"
                                        : "text-[#CF0202]"
                                    }`}
                                  >
                                    Impression
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[13px] text-[#1d1d1b] truncate">
                                      {getFieldValue("mandibular", firstToothNumber, "impression")}
                                    </span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "impression") && (
                                      <Check size={16} className="text-[#34a853] ml-auto" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "addons") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "addons")
                                        ? "border-[#34a853]"
                                        : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      handleOpenAddOnsModal("mandibular", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                                    }}
                                  >
                                    <legend
                                      className={`text-[11px] px-1 leading-none ${
                                        isFieldCompleted("mandibular", firstToothNumber, "addons")
                                          ? "text-[#34a853]"
                                          : "text-[#CF0202]"
                                      }`}
                                    >
                                      Add ons
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[13px] text-[#1d1d1b] truncate">
                                        {getFieldValue("mandibular", firstToothNumber, "addons")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "addons") && (
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
                            {isFieldCompleted("mandibular", firstToothNumber, "addons") && (
                              <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                                <button
                                  onClick={() => {
                                    handleOpenAddOnsModal("mandibular", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                                  }}
                                  className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                                >
                                  <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                                  <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                                    {getFieldValue("mandibular", firstToothNumber, "addons")
                                      ? `Add ons (${getFieldValue("mandibular", firstToothNumber, "addons").split(",").length} selected)`
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
                                    handleOpenRushModal("mandibular", `prep_${firstToothNumber}`)
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

          {showDetails && (
            <>
              {/* Dynamically added mandibular products */}
              {addedProducts
                .filter(ap => ap.arch === "mandibular")
                .map(ap => (
                  <div key={ap.id} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
                    <button
                      type="button"
                      onClick={() => toggleAddedProductExpanded(ap.id)}
                      className="w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                    >
                      <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {ap.product.image_url ? (
                          <img src={ap.product.image_url} alt={ap.product.name || "Product"} className="w-[61.58px] h-[28.79px] object-contain" />
                        ) : (
                          <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-[10px] text-gray-400">No img</span>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldInput
                            label="Product - Material"
                            value={ap.product.name || ""}
                          />
                          <FieldInput
                            label="Category"
                            value={ap.product.category_name || ap.product.category?.name || ""}
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
                              value={ap.arch === "maxillary" ? "Maxillary (Upper)" : "Mandibular (Lower)"}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                          <button
                            type="button"
                            onClick={() => handleOpenAddOnsModal("mandibular", `added_${ap.id}`)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Add ons</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAttachModal(true)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
                          </button>
                        </div>
                        <ScrollToBottom />
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
