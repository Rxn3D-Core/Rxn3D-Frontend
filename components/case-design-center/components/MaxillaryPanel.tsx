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
import { GumShadePicker } from "./GumShadePicker";
import type {
  AddedProduct,
  Arch,
  ShadeFieldType,
  ShadeSelectionState,
  RetentionPopoverState,
  RetentionType,
  ProductApiData,
  ProductGrade,
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

/**
 * Renders diamonds based on the grade sequence.
 * sequence 1 (Economy) = 1 blue + 3 gray
 * sequence 2 (Standard) = 2 blue + 2 gray
 * sequence 3 (Premium) = 3 blue + 1 gray
 * sequence 4 (Ultra Premium) = 4 blue + 0 gray
 */
function GradeDiamonds({ filledCount }: { filledCount: number }) {
  const total = 4;
  const blue = Math.max(0, Math.min(filledCount, total));
  const gray = total - blue;
  return (
    <div className="flex gap-1">
      {Array.from({ length: blue }, (_, i) => <BlueDiamond key={`b${i}`} />)}
      {Array.from({ length: gray }, (_, i) => <GrayDiamond key={`g${i}`} />)}
    </div>
  );
}

/** Get the number of filled diamonds from a grade name or code, using the grades array from the API */
function getGradeDiamondCount(gradeName: string, grades?: ProductGrade[]): number {
  if (!gradeName || !grades || grades.length === 0) {
    // Fallback: try to match by known names
    const lower = gradeName?.toLowerCase() || "";
    if (lower.includes("economy")) return 1;
    if (lower.includes("ultra")) return 4;
    if (lower.includes("premium")) return 3;
    if (lower.includes("standard")) return 2;
    return 0;
  }
  const match = grades.find(
    (g) => g.name === gradeName || g.code === gradeName
  );
  return match ? match.sequence : 0;
}

/** Get the default grade from the API grades array */
function getDefaultGrade(grades?: ProductGrade[]): ProductGrade | null {
  if (!grades || grades.length === 0) return null;
  return grades.find((g) => g.is_default === "Yes" && g.status === "Active") || grades.filter((g) => g.status === "Active").sort((a, b) => a.sequence - b.sequence)[0] || null;
}

/** Get active grades sorted by sequence */
function getActiveGrades(grades?: ProductGrade[]): ProductGrade[] {
  if (!grades || grades.length === 0) return [];
  return grades.filter((g) => g.status === "Active").sort((a, b) => a.sequence - b.sequence);
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
  /** When true, active product is Removable restoration — hide retention popover and only toggle teeth */
  activeProductIsRemovables?: boolean;
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
  maxillaryClaspTeeth: number[];
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string) => void;
  selectAllMaxillaryTeeth: (teeth: number[]) => void;
}

function hasAdvanceField(
  step: string,
  advanceFields: Array<{ name: string; field_type: string }> | undefined
): boolean {
  const alwaysShow = ["fixed_stage", "fixed_impression", "stage", "impression"];
  if (alwaysShow.includes(step)) return true;
  if (!advanceFields || advanceFields.length === 0) return true;

  const names = advanceFields.map((f) => (f.name || "").toLowerCase());

  switch (step) {
    // Fixed restoration steps
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
    case "fixed_addons":
      return names.some((n) => n.includes("add") && (n.includes("on") || n.includes("addon")));
    case "fixed_notes":
      return names.some((n) => n.includes("note") || n.includes("additional"));
    // Removable restoration steps
    case "grade":
      return names.some((n) => n.includes("grade"));
    case "teeth_shade":
      return names.some((n) => n.includes("teeth") && n.includes("shade"));
    case "gum_shade":
      return names.some((n) => n.includes("gum") && n.includes("shade"));
    case "addons":
      return names.some((n) => n.includes("add") && (n.includes("on") || n.includes("addon")));
    default:
      return true;
  }
}

/** Auto-opens the shade picker when this component mounts (i.e. shade field becomes visible) and the field has no value */
function AutoOpenShade({ hasValue, onOpen }: { hasValue: boolean; onOpen: () => void }) {
  const opened = useRef(false);
  useEffect(() => {
    if (!hasValue && !opened.current) {
      opened.current = true;
      onOpen();
    }
  }, [hasValue, onOpen]);
  return null;
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
  activeProductIsRemovables = false,
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
  maxillaryClaspTeeth,
  handleToothExtractionToggle,
  selectAllMaxillaryTeeth,
}: MaxillaryPanelProps) {
  const MAXILLARY_ALL_TEETH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  /** Tracks implant detail completion per tooth (firstToothNumber) so we can block impression modal until complete. */
  const [implantDetailCompleteByTooth, setImplantDetailCompleteByTooth] = useState<Record<number, boolean>>({});
  /** Expand/collapse for initial (card 0) Removables product accordion */
  const [initialRemovablesExpanded, setInitialRemovablesExpanded] = useState(true);
  const [showGradeDropdown, setShowGradeDropdown] = useState<string | null>(null);

  // Auto-select default grade for removable products when product loads
  const autoGradeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MAXILLARY_ALL_TEETH) {
      const tp = getToothProduct("maxillary", tn);
      if (!tp?.grades?.length) continue;
      const key = `maxillary_${tn}`;
      if (autoGradeApplied.current.has(key)) continue;
      const currentVal = getFieldValue("maxillary", tn, "grade");
      if (currentVal) continue;
      const def = getDefaultGrade(tp.grades);
      if (def) {
        autoGradeApplied.current.add(key);
        completeFieldStep("maxillary", tn, "grade", def.name);
      }
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  /** Hide retention-type popover when category is Removable(s) Restoration */
  const isRemovablesCategory =
    maxillaryTeeth.some((tn) => {
      const p = getToothProduct("maxillary", tn);
      const name = (p?.subcategory?.category?.name ?? "").toLowerCase();
      return name === "removables" || name === "removables restoration" || name === "removable restoration";
    }) ||
    addedProducts
      .filter((ap) => ap.arch === "maxillary")
      .some((ap) => {
        const name = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
        return name === "removables" || name === "removables restoration" || name === "removable restoration";
      });

  return (
    <div className={`flex-1 min-w-0 px-0 md:px-3 order-1 lg:order-none${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
      {/* Maxillary header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        <h3 className="text-[16px] sm:text-xl font-bold text-[#1d1d1b] tracking-wide">
          MAXILLARY
        </h3>
        {showDetails && !caseSubmitted && !disableAddProduct && (
          <button
            onClick={() => onAddProduct?.("maxillary")}
            className="flex items-center gap-1.5 shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-base font-semibold leading-[22px] tracking-[-0.02em] text-center px-2.5 py-1 rounded-md bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
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
                willExtractTeeth={(() => {
                  // Find WED extraction codes from product extractions
                  const wedCodes = new Set<string>();
                  for (const tn of MAXILLARY_ALL_TEETH) {
                    const product = getToothProduct("maxillary", tn);
                    for (const e of product?.extractions ?? []) {
                      const n = (e.name ?? "").toLowerCase().trim();
                      if (e.code === "WED" || n === "will extract on delivery") {
                        wedCodes.add(e.code);
                      }
                    }
                  }
                  return Object.entries(maxillaryToothExtractionMap)
                    .filter(([, code]) => wedCodes.has(code))
                    .map(([tn]) => Number(tn));
                })()}
                onToothClick={(toothNumber: number) => {
                  if (activeExtractionCode) {
                    // When an extraction box is active, only toggle the extraction mapping.
                    // Ensure tooth stays selected so it appears in the extraction box.
                    if (!maxillaryTeeth.includes(toothNumber)) {
                      handleMaxillaryToothClick(toothNumber);
                    }
                    handleToothExtractionToggle("maxillary", toothNumber, activeExtractionCode);
                  } else {
                    handleMaxillaryToothClick(toothNumber);
                  }
                }}
                className="w-full"
                retentionTypesByTooth={maxillaryRetentionTypes}
                showRetentionPopover={
                  retentionPopoverState.arch === "maxillary" && !isRemovablesCategory && !activeProductIsRemovables
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
                toothExtractionMap={maxillaryToothExtractionMap}
                hideSelectionIndicators={isRemovablesCategory || activeProductIsRemovables}
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
            const allExtractions = MAXILLARY_ALL_TEETH.flatMap((tn) => {
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
                  claspTeeth={maxillaryClaspTeeth}
                  activeExtractionCode={activeExtractionCode}
                  onActiveExtractionChange={setActiveExtractionCode}
                  onToothExtractionToggle={(tn, code) => handleToothExtractionToggle("maxillary", tn, code)}
                  onSelectAllTeeth={selectAllMaxillaryTeeth}
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

              // Skip removables products — they have their own dedicated accordion section
              const catLower = categoryName.toLowerCase();
              if (catLower === "removables" || catLower === "removables restoration" || catLower === "removable restoration") return null;
              const estDays = selectedProduct
                ? selectedProduct.min_days_to_process && selectedProduct.max_days_to_process
                  ? `${selectedProduct.min_days_to_process}-${selectedProduct.max_days_to_process} work days after submission`
                  : selectedProduct.min_days_to_process
                    ? `${selectedProduct.min_days_to_process} work days after submission`
                    : "10 work days after submission"
                : "10 work days after submission";
              const toothNumbers = teeth.map((t) => t.toothNumber);
              // Stable key for stage so value is not lost when group order or implant section changes
              const groupStageToothNumber = Math.min(...toothNumbers);
              const groupStageProductIdFixed = `maxillary_fixed_${groupStageToothNumber}`;
              const toothNumbersDisplay = `#${toothNumbers.join(",")}`;
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
                  <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                    <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black flex items-center gap-1 truncate">
                      {productName}
                      {hasRushed && (
                        <Zap
                          className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0"
                          strokeWidth={2}
                          fill="#CF0202"
                        />
                      )}
                    </p>
                    <p className="font-[Verdana] text-[13px] sm:text-lg leading-tight tracking-[-0.02em] text-black truncate">
                      {toothNumbersDisplay}
                    </p>
                    <div className="flex items-center gap-[5px] flex-wrap">
                      {categoryName && (
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          {categoryName}
                        </span>
                      )}
                      {subcategoryName && (
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          {subcategoryName}
                        </span>
                      )}
                      {(selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]) && (
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          {selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-[5px]">
                      <span
                        className={`font-[Verdana] text-[11px] sm:text-[13px] leading-tight tracking-[-0.02em] whitespace-nowrap ${
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
                      <Trash2 size={9} className="text-[#999999] flex-shrink-0" />
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
                    productId={categoryName === "Fixed Restoration" ? groupStageProductIdFixed : `maxillary_prep_${firstToothNumber}`}
                    arch="maxillary"
                    toothNumber={categoryName === "Fixed Restoration" ? groupStageToothNumber : firstToothNumber}
                    isExpanded={true}
                    isStageVisible={categoryName === "Fixed Restoration" ? isFixed("fixed_stage") : isFieldVisible("maxillary", firstToothNumber, "stage")}
                    isStageEmpty={categoryName === "Fixed Restoration" ? !(selectedStages[groupStageProductIdFixed] || getFieldValue("maxillary", groupStageToothNumber, "fixed_stage")) : !(selectedStages[`maxillary_prep_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "stage"))}
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
                        onOpenImpressionModal={(arch, productId, toothNum) => {
                          const hasImplantForm = toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant"));
                          if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                          handleOpenImpressionModal(arch, productId, toothNum);
                        }}
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
                          submitted={caseSubmitted}
                        />
                        <FieldInput
                          label="Retention Type"
                          value={retentionTypes.includes("Implant") ? "Screwed" : "Cemented"}
                          submitted={caseSubmitted}
                        />
                      </div>

                      {/* All remaining fields hidden until both shades are selected */}
                      {!fixedShadeIncomplete && <>

                      {/* Step 1 & 2: Stage and Stump Shade in one row */}
                      {(isFixed("fixed_stage") || isFixed("fixed_stump_shade")) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {isFixed("fixed_stage") && (() => {
                            const fixedStageValue = selectedStages[groupStageProductIdFixed] || getFieldValue("maxillary", groupStageToothNumber, "fixed_stage");
                            const isStageComplete = isFieldCompleted("maxillary", groupStageToothNumber, "fixed_stage") || !!(fixedStageValue && fixedStageValue.trim());
                            return (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isStageComplete && !caseSubmitted ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                handleOpenStageModal(groupStageProductIdFixed, "maxillary", groupStageToothNumber);
                              }}
                            >
                              <legend
                                className={`text-sm px-1 leading-none ${
                                  isStageComplete && !caseSubmitted ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"
                                }`}
                              >
                                Stage
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[14px] sm:text-lg text-[#000000]">
                                  {fixedStageValue}
                                </span>
                                {isStageComplete && !caseSubmitted && (
                                  <Check size={16} className="text-[#34a853] ml-auto" />
                                )}
                                <div className={isStageComplete && !caseSubmitted ? "" : "ml-auto"}>
                                  <ArticulatorIcon />
                                </div>
                              </div>
                            </fieldset>
                            );
                          })()}
                          {isFixed("fixed_stump_shade") && (
                            <ShadeField
                              label="Stump Shade"
                              value={selectedShadeGuide}
                              shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "stump_shade")}
                              onClick={() => handleShadeFieldClick("maxillary", "stump_shade", `fixed_${firstToothNumber}`)}
                              submitted={caseSubmitted}
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
                            submitted={caseSubmitted}
                          />
                          <ShadeField
                            label="Incisal Shade"
                            value={selectedShadeGuide}
                            shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                            onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                            submitted={caseSubmitted}
                          />
                          <ShadeField
                            label="Body Shade"
                            value={selectedShadeGuide}
                            shade={getSelectedShade(`fixed_${firstToothNumber}`, "maxillary", "tooth_shade")}
                            onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", `fixed_${firstToothNumber}`)}
                            submitted={caseSubmitted}
                          />
                        </div>
                      )}

                      {/* Implant Detail - shown after shade selection, always when applicable */}
                      {toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && (
                        <ImplantDetailSection
                          toothNumber={firstToothNumber}
                          onCompleteChange={(complete) => setImplantDetailCompleteByTooth((prev) => ({ ...prev, [firstToothNumber]: complete }))}
                        />
                      )}

                      {/* Step 4: Characterization / Intensity / Surface finish */}
                      {isFixed("fixed_characterization") && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted
                                ? "border-[#34a853]"
                                : isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization")
                                  ? "border-[#b4b0b0]"
                                  : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              if (!isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization")) {
                                completeFieldStep("maxillary", firstToothNumber, "fixed_characterization", "selected");
                              }
                            }}
                          >
                            <legend className={`text-sm px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                              Characterization
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[14px] sm:text-lg text-[#000000]">{getFieldValue("maxillary", firstToothNumber, "fixed_characterization")}</span>
                              {isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
                            </div>
                          </fieldset>
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted
                                ? "border-[#34a853]"
                                : "border-[#d9d9d9]"
                            }`}
                          >
                            <legend className={`text-sm px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                              Intensity
                            </legend>
                            <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                          </fieldset>
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted
                                ? "border-[#34a853]"
                                : "border-[#d9d9d9]"
                            }`}
                          >
                            <legend className={`text-sm px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                              Surface finish
                            </legend>
                            <span className="text-[14px] sm:text-lg text-[#000000]"></span>
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
                                <IconField label={labels[idx]} value="" icon={icon} submitted={caseSubmitted} />
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
                            const showGreen = isCompleted && !caseSubmitted;
                            return (
                              <fieldset
                                key={label}
                                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                  showGreen
                                    ? "border-[#34a853]"
                                    : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                }`}
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_margin", "selected");
                                  }
                                }}
                              >
                                <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>
                                  {label}
                                </legend>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                                  {showGreen && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
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
                            const showGreen = isCompleted && !caseSubmitted;
                            return (
                              <fieldset
                                key={label}
                                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                  showGreen
                                    ? "border-[#34a853]"
                                    : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                }`}
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_metal", "selected");
                                  }
                                }}
                              >
                                <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>
                                  {label}
                                </legend>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                                  {showGreen && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
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
                            const showGreen = isCompleted && !caseSubmitted;
                            return (
                              <fieldset
                                key={label}
                                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                  showGreen
                                    ? "border-[#34a853]"
                                    : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                }`}
                                onClick={() => {
                                  if (!isCompleted) {
                                    completeFieldStep("maxillary", firstToothNumber, "fixed_proximal_contact", "selected");
                                  }
                                }}
                              >
                                <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>
                                  {label}
                                </legend>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                                  {showGreen && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
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
                              isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") && !caseSubmitted
                                ? "border-[#34a853]"
                                : isFieldCompleted("maxillary", firstToothNumber, "fixed_impression")
                                  ? "border-[#b4b0b0]"
                                  : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              const hasImplantForm = toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant"));
                              const implantComplete = implantDetailCompleteByTooth[firstToothNumber] === true;
                              if (hasImplantForm && !implantComplete) return;
                              handleOpenImpressionModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                            }}
                          >
                            <legend className={`text-sm px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") && !caseSubmitted ? "text-[#34a853]" : isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                              Impression
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                {getImpressionDisplayText(selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, "maxillary")}
                              </span>
                              {isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") && !caseSubmitted && (
                                <Check size={16} className="text-[#34a853] ml-auto" />
                              )}
                            </div>
                          </fieldset>

                          {isFixed("fixed_addons") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "fixed_addons") && !caseSubmitted
                                  ? "border-[#34a853]"
                                  : "border-[#d9d9d9]"
                              }`}
                              onClick={() => {
                                handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                              }}
                            >
                              <legend className={`text-sm px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                                Add ons
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                  {getFieldValue("maxillary", firstToothNumber, "fixed_addons")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "fixed_addons") && !caseSubmitted && (
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
                            isFieldCompleted("maxillary", firstToothNumber, "fixed_notes") && !caseSubmitted
                              ? "border-[#34a853]"
                              : "border-[#d9d9d9]"
                          }`}
                        >
                          <legend className={`text-sm px-1 leading-none ${isFieldCompleted("maxillary", firstToothNumber, "fixed_notes") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                            Additional notes
                          </legend>
                          <textarea
                            rows={3}
                            placeholder="Enter additional notes..."
                            className="w-full text-xs text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
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
                        onOpenImpressionModal={(arch, productId, toothNum) => {
                          const hasImplantForm = toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant"));
                          if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                          handleOpenImpressionModal(arch, productId, toothNum);
                        }}
                        arch="maxillary"
                        productId={selectedProduct?.id?.toString() || `prep_${firstToothNumber}`}
                        toothNumber={firstToothNumber}
                      />
                      {/* ===== OTHER CATEGORIES: Progressive step-by-step fields ===== */}

                      {/* Implant Detail - show if any tooth in group has Implant retention */}
                      {toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && (
                        <ImplantDetailSection
                          toothNumber={firstToothNumber}
                          onCompleteChange={(complete) => setImplantDetailCompleteByTooth((prev) => ({ ...prev, [firstToothNumber]: complete }))}
                        />
                      )}

                      {/* Step 1: Grade / Stage */}
                      {isFieldVisible("maxillary", firstToothNumber, "grade") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "grade") && !caseSubmitted
                                ? "border-[#34a853]"
                                : isFieldCompleted("maxillary", firstToothNumber, "grade")
                                  ? "border-[#b4b0b0]"
                                  : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              if (!isFieldCompleted("maxillary", firstToothNumber, "grade")) {
                                completeFieldStep("maxillary", firstToothNumber, "grade", "Standard");
                              }
                            }}
                          >
                            <legend
                              className={`text-sm px-1 leading-none ${
                                isFieldCompleted("maxillary", firstToothNumber, "grade") && !caseSubmitted
                                  ? "text-[#34a853]"
                                  : isFieldCompleted("maxillary", firstToothNumber, "grade")
                                    ? "text-[#7f7f7f]"
                                    : "text-[#CF0202]"
                              }`}
                            >
                              Grade
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[14px] sm:text-lg text-[#000000]">
                                {getFieldValue("maxillary", firstToothNumber, "grade")}
                              </span>
                              <div className="flex gap-1 ml-auto">
                                <BlueDiamond />
                                <BlueDiamond />
                                <GrayDiamond />
                                <GrayDiamond />
                              </div>
                              {isFieldCompleted("maxillary", firstToothNumber, "grade") && !caseSubmitted && (
                                <Check size={16} className="text-[#34a853]" />
                              )}
                            </div>
                          </fieldset>

                          {isFieldVisible("maxillary", firstToothNumber, "stage") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "stage") && !caseSubmitted
                                  ? "border-[#34a853]"
                                  : isFieldCompleted("maxillary", firstToothNumber, "stage")
                                    ? "border-[#b4b0b0]"
                                    : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                handleOpenStageModal(`maxillary_prep_${firstToothNumber}`, "maxillary", firstToothNumber);
                              }}
                            >
                              <legend
                                className={`text-sm px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "stage") && !caseSubmitted
                                    ? "text-[#34a853]"
                                    : isFieldCompleted("maxillary", firstToothNumber, "stage")
                                      ? "text-[#7f7f7f]"
                                      : "text-[#CF0202]"
                                }`}
                              >
                                Stage
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[14px] sm:text-lg text-[#000000]">
                                  {getFieldValue("maxillary", firstToothNumber, "stage")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "stage") && !caseSubmitted && (
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
                        <>
                        <AutoOpenShade
                          hasValue={isFieldCompleted("maxillary", firstToothNumber, "teeth_shade")}
                          onOpen={() => handleShadeFieldClick("maxillary", "tooth_shade", `prep_${firstToothNumber}`)}
                        />
                        {/* Gum Shade Picker - shown above when gum shade field is visible but not completed */}
                        {isFieldVisible("maxillary", firstToothNumber, "gum_shade") &&
                          !isFieldCompleted("maxillary", firstToothNumber, "gum_shade") && (
                          <div className="mt-3">
                            <GumShadePicker
                              selected={null}
                              onSelect={(shadeName) => {
                                completeFieldStep("maxillary", firstToothNumber, "gum_shade", shadeName);
                              }}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "teeth_shade") && !caseSubmitted
                                ? "border-[#34a853]"
                                : isFieldCompleted("maxillary", firstToothNumber, "teeth_shade")
                                  ? "border-[#b4b0b0]"
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
                              className={`text-sm px-1 leading-none ${
                                isFieldCompleted("maxillary", firstToothNumber, "teeth_shade") && !caseSubmitted
                                  ? "text-[#34a853]"
                                  : isFieldCompleted("maxillary", firstToothNumber, "teeth_shade")
                                    ? "text-[#7f7f7f]"
                                    : "text-[#CF0202]"
                              }`}
                            >
                              Teeth shade
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[14px] sm:text-lg text-[#000000]">
                                {getFieldValue("maxillary", firstToothNumber, "teeth_shade")}
                              </span>
                              {isFieldCompleted("maxillary", firstToothNumber, "teeth_shade") && !caseSubmitted && (
                                <Check size={16} className="text-[#34a853] ml-auto" />
                              )}
                            </div>
                          </fieldset>

                          {isFieldVisible("maxillary", firstToothNumber, "gum_shade") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "gum_shade") && !caseSubmitted
                                  ? "border-[#34a853]"
                                  : isFieldCompleted("maxillary", firstToothNumber, "gum_shade")
                                    ? "border-[#b4b0b0]"
                                    : "border-[#CF0202]"
                              }`}
                              onClick={() => {
                                if (!isFieldCompleted("maxillary", firstToothNumber, "gum_shade")) {
                                  completeFieldStep("maxillary", firstToothNumber, "gum_shade", "GC Initial Gingiva");
                                }
                              }}
                            >
                              <legend
                                className={`text-sm px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "gum_shade") && !caseSubmitted
                                    ? "text-[#34a853]"
                                    : isFieldCompleted("maxillary", firstToothNumber, "gum_shade")
                                      ? "text-[#7f7f7f]"
                                      : "text-[#CF0202]"
                                }`}
                              >
                                Gum Shade
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[14px] sm:text-lg text-[#000000] truncate">
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
                                {isFieldCompleted("maxillary", firstToothNumber, "gum_shade") && !caseSubmitted && (
                                  <Check size={16} className="text-[#34a853] flex-shrink-0" />
                                )}
                              </div>
                            </fieldset>
                          ) : (
                            <div />
                          )}
                        </div>
                        </>
                      )}

                      {/* Step 3: Impression / Add ons */}
                      {isFieldVisible("maxillary", firstToothNumber, "impression") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <fieldset
                            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                              isFieldCompleted("maxillary", firstToothNumber, "impression") && !caseSubmitted
                                ? "border-[#34a853]"
                                : isFieldCompleted("maxillary", firstToothNumber, "impression")
                                  ? "border-[#b4b0b0]"
                                  : "border-[#CF0202]"
                            }`}
                            onClick={() => {
                              const hasImplantForm = toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant"));
                              if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                              handleOpenImpressionModal("maxillary", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                            }}
                          >
                            <legend
                              className={`text-sm px-1 leading-none ${
                                isFieldCompleted("maxillary", firstToothNumber, "impression") && !caseSubmitted
                                  ? "text-[#34a853]"
                                  : isFieldCompleted("maxillary", firstToothNumber, "impression")
                                    ? "text-[#7f7f7f]"
                                    : "text-[#CF0202]"
                              }`}
                            >
                              Impression
                            </legend>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                {getFieldValue("maxillary", firstToothNumber, "impression")}
                              </span>
                              {isFieldCompleted("maxillary", firstToothNumber, "impression") && !caseSubmitted && (
                                <Check size={16} className="text-[#34a853] ml-auto" />
                              )}
                            </div>
                          </fieldset>

                          {isFieldVisible("maxillary", firstToothNumber, "addons") ? (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                isFieldCompleted("maxillary", firstToothNumber, "addons") && !caseSubmitted
                                  ? "border-[#34a853]"
                                  : "border-[#b4b0b0]"
                              }`}
                              onClick={() => {
                                handleOpenAddOnsModal("maxillary", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                              }}
                            >
                              <legend
                                className={`text-sm px-1 leading-none ${
                                  isFieldCompleted("maxillary", firstToothNumber, "addons") && !caseSubmitted
                                    ? "text-[#34a853]"
                                    : "text-[#7f7f7f]"
                                }`}
                              >
                                Add ons
                              </legend>
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                  {getFieldValue("maxillary", firstToothNumber, "addons")}
                                </span>
                                {isFieldCompleted("maxillary", firstToothNumber, "addons") && !caseSubmitted && (
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

          {/* Initial Removables product accordion — show fields when user selected Removable restoration and clicked teeth (assigned to card 0) */}
          {showDetails && activeProductIsRemovables && (() => {
            // Use all arch teeth (not just selected) so the accordion stays visible when all teeth are marked missing
            const cardTeeth = MAXILLARY_ALL_TEETH.filter(tn => getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0);
            if (cardTeeth.length === 0) return null;
            const cardProduct = getToothProduct("maxillary", cardTeeth[0]);
            const cardProductName = cardProduct?.name || "Removable restoration";
            const cardProductImage = cardProduct?.image_url || null;
            // For removable products, show all selected teeth from the chart (maxillaryTeeth)
            const displayTeeth = [...maxillaryTeeth].sort((a, b) => a - b);
            const cardToothDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";
            const isActive = activeProductCardId === 0;
            const estDays = cardProduct
              ? cardProduct.min_days_to_process && cardProduct.max_days_to_process
                ? `${cardProduct.min_days_to_process}-${cardProduct.max_days_to_process} work days after submission`
                : cardProduct.min_days_to_process
                  ? `${cardProduct.min_days_to_process} work days after submission`
                  : "10 work days after submission"
              : "10 work days after submission";
            const repTnStage = cardTeeth[0];
            const stageVal = selectedStages[`maxillary_prep_${repTnStage}`] || getFieldValue("maxillary", repTnStage, "stage");

            return (
              <div key="initial-removables-maxillary" className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setInitialRemovablesExpanded((e) => !e);
                    if (!initialRemovablesExpanded) setActiveProductCardId(0);
                  }}
                  className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${isActive ? "bg-[#c8e2f7] hover:bg-[#b8d8f4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
                >
                  <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {cardProductImage ? (
                      <img src={cardProductImage} alt={cardProductName} className="w-[61.58px] h-[28.79px] object-contain" />
                    ) : (
                      <div className="w-16 h-[62px] rounded-md bg-gray-100 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">No img</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                    <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black truncate">{cardProductName}</p>
                    {cardToothDisplay && (
                      <p className="font-[Verdana] text-[13px] sm:text-lg leading-tight tracking-[-0.02em] text-black truncate">{cardToothDisplay}</p>
                    )}
                    <div className="flex items-center gap-[5px] flex-wrap">
                      {cardProduct?.subcategory?.category?.name && (
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          {cardProduct.subcategory.category.name}
                        </span>
                      )}
                      {cardProduct?.subcategory?.name && (
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          {cardProduct.subcategory.name}
                        </span>
                      )}
                      {stageVal && (
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          {stageVal}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-[5px]">
                      <span className="font-[Verdana] text-[11px] sm:text-[13px] leading-tight tracking-[-0.02em] text-[#B4B0B0] whitespace-nowrap">
                        Est days: {estDays}
                      </span>
                      <Trash2 size={9} className="text-[#999999] flex-shrink-0" />
                    </div>
                  </div>
                  <ChevronDown
                    size={21.6}
                    className={`text-black flex-shrink-0 transition-transform ${initialRemovablesExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {initialRemovablesExpanded && (
                  <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 ${showGradeDropdown ? "overflow-visible" : "max-h-[600px] overflow-y-auto scrollbar-blue"}`}>
                    {(() => {
                      const repTn = cardTeeth[0];
                      const toothProduct = getToothProduct("maxillary", repTn);
                      const advFields = toothProduct?.advance_fields;
                      const isF = (step: string) => hasAdvanceField(step, advFields) && isFieldVisible("maxillary", repTn, step as any);
                      const isFComplete = (step: string) => isFieldCompleted("maxillary", repTn, step as any);
                      const fVal = (step: string) => getFieldValue("maxillary", repTn, step as any);
                      const productKey = `maxillary_prep_${repTn}`;
                      const stageVal = fVal("stage") || selectedStages[productKey] || "";
                      return (
                        <>
                        <AutoOpenStageIfEmpty
                          productId={productKey}
                          arch="maxillary"
                          toothNumber={repTn}
                          isExpanded={initialRemovablesExpanded}
                          isStageVisible={isF("stage")}
                          isStageEmpty={!stageVal}
                          onOpenStage={handleOpenStageModal}
                        />
                        <AutoOpenImpressionIfEmpty
                          isExpanded={initialRemovablesExpanded}
                          isImpressionVisible={isF("impression")}
                          isImpressionEmpty={!isFComplete("impression")}
                          onOpenImpressionModal={handleOpenImpressionModal}
                          arch="maxillary"
                          productId={productKey}
                          toothNumber={repTn}
                        />
                        <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                          {/* Row 1: Grade / Stage */}
                          {(isF("grade") || isF("stage")) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {isF("grade") && (() => {
                              const gradeVal = fVal("grade") || "";
                              const isGradeComplete = isFComplete("grade") || !!(gradeVal && gradeVal.trim());
                              const showGradeGreen = isGradeComplete && !caseSubmitted;
                              const productGrades = getActiveGrades(toothProduct?.grades);
                              const diamondCount = getGradeDiamondCount(gradeVal, toothProduct?.grades);
                              return (
                                <div className="relative">
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${showGradeGreen ? "border-[#34a853]" : isGradeComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => {
                                      if (productGrades.length > 0) {
                                        setShowGradeDropdown((prev) => prev === productKey ? null : productKey);
                                      } else if (!isGradeComplete) {
                                        const def = getDefaultGrade(toothProduct?.grades);
                                        completeFieldStep("maxillary", repTn, "grade", def?.name || "Economy");
                                      }
                                    }}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${showGradeGreen ? "text-[#34a853]" : isGradeComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Grade</legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000]">{gradeVal}</span>
                                      <div className="ml-auto flex items-center gap-1">
                                        <GradeDiamonds filledCount={diamondCount} />
                                        {showGradeGreen && <Check size={16} className="text-[#34a853]" />}
                                        <ChevronDown size={14} className="text-[#7f7f7f]" />
                                      </div>
                                    </div>
                                  </fieldset>
                                  {showGradeDropdown === productKey && productGrades.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-20 overflow-hidden">
                                      {productGrades.map((g) => (
                                        <button
                                          key={g.id}
                                          onClick={() => {
                                            completeFieldStep("maxillary", repTn, "grade", g.name);
                                            setShowGradeDropdown(null);
                                          }}
                                          className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${gradeVal === g.name ? "bg-gray-50" : ""}`}
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            {gradeVal === g.name && <Check size={14} className="text-[#34a853]" />}
                                            <span className={gradeVal === g.name ? "" : "ml-[22px]"}>{g.name}</span>
                                          </div>
                                          <GradeDiamonds filledCount={g.sequence} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {isF("stage") && (() => {
                              const stageVal = fVal("stage") || selectedStages[productKey] || "";
                              const isStageComplete = isFComplete("stage") || !!(stageVal && stageVal.trim());
                              const showGreen = isStageComplete && !caseSubmitted;
                              return (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => handleOpenStageModal(productKey, "maxillary", repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                  {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              );
                            })()}
                          </div>
                          )}

                          {/* Row 3: Teeth shade / Gum Shade */}
                          {(isF("teeth_shade") || isF("gum_shade")) && (() => {
                            const shadeProductId = `prep_${repTn}`;
                            return (
                              <>
                                {isF("teeth_shade") && (
                                  <AutoOpenShade
                                    hasValue={isFComplete("teeth_shade")}
                                    onOpen={() => handleShadeFieldClick("maxillary", "tooth_shade", shadeProductId)}
                                  />
                                )}
                                {isF("gum_shade") && !isFComplete("gum_shade") && (
                                  <GumShadePicker
                                    selected={null}
                                    onSelect={(shadeName) => {
                                      completeFieldStep("maxillary", repTn, "gum_shade", shadeName);
                                    }}
                                  />
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {isF("teeth_shade") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", shadeProductId)}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${isFComplete("teeth_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("teeth_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Teeth shade</legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000]">{fVal("teeth_shade")}</span>
                                      {isFComplete("teeth_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
                                    </div>
                                  </fieldset>
                                  )}
                                  {isF("gum_shade") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => {
                                      if (!isFComplete("gum_shade")) {
                                        completeFieldStep("maxillary", repTn, "gum_shade", "GC Initial Gingiva");
                                      }
                                    }}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("gum_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Gum Shade</legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate">{fVal("gum_shade")}</span>
                                      <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                        <rect width="28.0391" height="28.0391" rx="6" fill="#E58D8D" />
                                      </svg>
                                      {isFComplete("gum_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
                                    </div>
                                  </fieldset>
                                  )}
                                </div>
                              </>
                            );
                          })()}

                          {/* Row 4: Impression */}
                          {isF("impression") && (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("impression") && !caseSubmitted ? "border-[#34a853]" : isFComplete("impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                              onClick={() => handleOpenImpressionModal("maxillary", productKey, repTn)}
                            >
                              <legend className={`text-sm px-1 leading-none ${isFComplete("impression") && !caseSubmitted ? "text-[#34a853]" : isFComplete("impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("impression") || getImpressionDisplayText(productKey, "maxillary")}</span>
                              {isFComplete("impression") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                            </fieldset>
                          )}
                          {/* Row 5: Add ons (full width) */}
                          {isF("addons") && (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                              onClick={() => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn)}
                            >
                              <legend className={`text-sm px-1 leading-none ${isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Add ons</legend>
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("addons") || "0 selected"}</span>
                              {isFComplete("addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                            </fieldset>
                          )}
                        </div>

                        {/* Bottom action buttons — only show when impression has value */}
                        {isFComplete("impression") && (
                        <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                          <button
                            onClick={() => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                              {fVal("addons") ? `Add ons (${fVal("addons").split(",").length} selected)` : "Add ons"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAttachModal(true)}
                            className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRushModal("maxillary", productKey)}
                            className="relative flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors"
                          >
                            <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Request Rush</span>
                            <Zap className="w-[8.78px] h-[10.54px] flex-shrink-0 text-[#CF0202]" strokeWidth={0.878154} />
                          </button>
                        </div>
                        )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Added product accordions — full field workflow, teeth owned by each card */}
          {showDetails && !caseSubmitted && addedProducts
            .filter(ap => ap.arch === "maxillary")
            .map((ap, apIndex) => {
              // For removable restoration products, use all arch teeth so accordion stays visible when teeth are marked missing
              const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
              const isApRemovables = apCatName === "removables" || apCatName === "removables restoration" || apCatName === "removable restoration";
              const cardTeethSource = isApRemovables ? MAXILLARY_ALL_TEETH : maxillaryTeeth;
              const cardTeeth = cardTeethSource.filter(
                tn => isApRemovables
                  ? getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === ap.id
                  : getToothProductCard("maxillary", tn) === ap.id
              );
              const cardProduct = cardTeeth.length > 0
                ? getToothProduct("maxillary", cardTeeth[0])
                : null;
              const cardProductName = cardProduct?.name || ap.product.name || "Untitled Product";
              const cardProductImage = cardProduct?.image_url || ap.product.image_url || null;
              const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product.category_name || "";
              const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product.subcategory_name || "";
              // For removable products, show all selected teeth from the chart
              const apDisplayTeeth = isApRemovables
                ? [...maxillaryTeeth].sort((a, b) => a - b)
                : cardTeeth;
              const cardToothDisplay = apDisplayTeeth.length > 0 ? `#${apDisplayTeeth.join(",")}` : "";
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
                    <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                      <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black truncate">
                        {cardProductName}
                      </p>
                      {cardToothDisplay && (
                        <p className="font-[Verdana] text-[13px] sm:text-lg leading-tight tracking-[-0.02em] text-black truncate">
                          {cardToothDisplay}
                        </p>
                      )}
                      <div className="flex items-center gap-[5px] flex-wrap">
                        {cardCategoryName && (
                          <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                            {cardCategoryName}
                          </span>
                        )}
                        {cardSubcategoryName && (
                          <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                            {cardSubcategoryName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-[5px]">
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] leading-tight tracking-[-0.02em] text-[#B4B0B0] whitespace-nowrap">
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
                    <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 ${showGradeDropdown ? "overflow-visible" : "max-h-[600px] overflow-y-auto scrollbar-blue"}`}>
                      {cardTeeth.length === 0 ? (
                        <p className="text-xs text-[#b4b0b0] text-center py-4">
                          Select teeth from the chart above to assign them to this product.
                        </p>
                      ) : (() => {
                        const isCardRemovables = /removables|removable restoration/i.test(cardCategoryName);
                        const repTn = cardTeeth[0];
                        const toothProduct = getToothProduct("maxillary", repTn);
                        const categoryName = toothProduct?.subcategory?.category?.name?.toLowerCase() || "";
                        const isFixed = categoryName === "fixed restoration";
                        const isRemovables = isCardRemovables || categoryName === "removables" || categoryName === "removables restoration" || categoryName === "removable restoration";
                        const fixedChain = isFixed ? getFixedFieldChain(toothProduct?.advance_fields) : undefined;
                        const advFields = toothProduct?.advance_fields;
                        const isF = (step: string) => isRemovables ? hasAdvanceField(step, advFields) : isFieldVisible("maxillary", repTn, step as any, fixedChain);
                        const isFComplete = (step: string) => isFieldCompleted("maxillary", repTn, step as any);
                        const fVal = (step: string) => getFieldValue("maxillary", repTn, step as any);

                        if (isCardRemovables) {
                          const productKey = `maxillary_prep_${repTn}`;
                          return (
                            <>
                            <AutoOpenImpressionIfEmpty
                              isExpanded={ap.expanded}
                              isImpressionVisible={hasAdvanceField("impression", advFields) && isFieldVisible("maxillary", repTn, "impression" as any)}
                              isImpressionEmpty={!isFieldCompleted("maxillary", repTn, "impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="maxillary"
                              productId={productKey}
                              toothNumber={repTn}
                            />
                            <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                              {/* Row 1: Grade / Stage */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {hasAdvanceField("grade", advFields) && (() => {
                                  const gradeVal = fVal("grade") || "";
                                  const isGradeComplete = isFComplete("grade") || !!(gradeVal && gradeVal.trim());
                                  const showGradeGreen = isGradeComplete && !caseSubmitted;
                                  const productGrades = getActiveGrades(toothProduct?.grades);
                                  const diamondCount = getGradeDiamondCount(gradeVal, toothProduct?.grades);
                                  const apGradeKey = `ap_${ap.id}_grade`;
                                  return (
                                    <div className="relative">
                                      <fieldset
                                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${showGradeGreen ? "border-[#34a853]" : isGradeComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                        onClick={() => {
                                          if (productGrades.length > 0) {
                                            setShowGradeDropdown((prev) => prev === apGradeKey ? null : apGradeKey);
                                          } else if (!isGradeComplete) {
                                            const def = getDefaultGrade(toothProduct?.grades);
                                            completeFieldStep("maxillary", repTn, "grade", def?.name || "Economy");
                                          }
                                        }}
                                      >
                                        <legend className={`text-sm px-1 leading-none ${showGradeGreen ? "text-[#34a853]" : isGradeComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Grade</legend>
                                        <div className="flex items-center gap-2 w-full">
                                          <span className="text-[14px] sm:text-lg text-[#000000]">{gradeVal}</span>
                                          <div className="ml-auto flex items-center gap-1">
                                            <GradeDiamonds filledCount={diamondCount} />
                                            {showGradeGreen && <Check size={16} className="text-[#34a853]" />}
                                            <ChevronDown size={14} className="text-[#7f7f7f]" />
                                          </div>
                                        </div>
                                      </fieldset>
                                      {showGradeDropdown === apGradeKey && productGrades.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-20 overflow-hidden">
                                          {productGrades.map((g) => (
                                            <button
                                              key={g.id}
                                              onClick={() => {
                                                completeFieldStep("maxillary", repTn, "grade", g.name);
                                                setShowGradeDropdown(null);
                                              }}
                                              className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${gradeVal === g.name ? "bg-gray-50" : ""}`}
                                            >
                                              <div className="flex items-center gap-2 flex-1">
                                                {gradeVal === g.name && <Check size={14} className="text-[#34a853]" />}
                                                <span className={gradeVal === g.name ? "" : "ml-[22px]"}>{g.name}</span>
                                              </div>
                                              <GradeDiamonds filledCount={g.sequence} />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                                {hasAdvanceField("stage", advFields) && (() => {
                                  const stageVal = fVal("stage") || selectedStages[productKey] || "";
                                  const isStageComplete = isFComplete("stage") || !!(stageVal && stageVal.trim());
                                  const showGreen = isStageComplete && !caseSubmitted;
                                  return (
                                    <fieldset
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                      onClick={() => handleOpenStageModal(productKey, "maxillary", repTn)}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                      {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                    </fieldset>
                                  );
                                })()}
                              </div>

                              {/* Row 3: Teeth shade / Gum Shade */}
                              {(hasAdvanceField("teeth_shade", advFields) || hasAdvanceField("gum_shade", advFields)) && (() => {
                                const shadeProductId = `prep_${repTn}`;
                                return (
                                  <>
                                    {hasAdvanceField("teeth_shade", advFields) && (
                                      <AutoOpenShade
                                        hasValue={isFComplete("teeth_shade")}
                                        onOpen={() => handleShadeFieldClick("maxillary", "tooth_shade", shadeProductId)}
                                      />
                                    )}
                                    {hasAdvanceField("gum_shade", advFields) && !isFComplete("gum_shade") && (
                                      <GumShadePicker
                                        selected={null}
                                        onSelect={(shadeName) => {
                                          completeFieldStep("maxillary", repTn, "gum_shade", shadeName);
                                        }}
                                      />
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {hasAdvanceField("teeth_shade", advFields) && (
                                      <fieldset
                                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                        onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", shadeProductId)}
                                      >
                                        <legend className={`text-sm px-1 leading-none ${isFComplete("teeth_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("teeth_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Teeth shade</legend>
                                        <div className="flex items-center gap-2 w-full">
                                          <span className="text-[14px] sm:text-lg text-[#000000]">{fVal("teeth_shade")}</span>
                                          {isFComplete("teeth_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
                                        </div>
                                      </fieldset>
                                      )}
                                      {hasAdvanceField("gum_shade", advFields) && (
                                      <fieldset
                                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                        onClick={() => {
                                          if (!isFComplete("gum_shade")) {
                                            completeFieldStep("maxillary", repTn, "gum_shade", "GC Initial Gingiva");
                                          }
                                        }}
                                      >
                                        <legend className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("gum_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Gum Shade</legend>
                                        <div className="flex items-center gap-2 w-full">
                                          <span className="text-[14px] sm:text-lg text-[#000000] truncate">{fVal("gum_shade")}</span>
                                          <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                            <rect width="28.0391" height="28.0391" rx="6" fill="#E58D8D" />
                                          </svg>
                                          {isFComplete("gum_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
                                        </div>
                                      </fieldset>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}

                              {/* Row 4: Impression */}
                              {hasAdvanceField("impression", advFields) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("impression") && !caseSubmitted ? "border-[#34a853]" : isFComplete("impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => handleOpenImpressionModal("maxillary", productKey, repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFComplete("impression") && !caseSubmitted ? "text-[#34a853]" : isFComplete("impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("impression") || getImpressionDisplayText(productKey, "maxillary")}</span>
                                  {isFComplete("impression") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                              {/* Row 5: Add ons (full width) */}
                              {hasAdvanceField("addons", advFields) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                                  onClick={() => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Add ons</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("addons") || "0 selected"}</span>
                                  {isFComplete("addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                            </div>

                            {/* Bottom action buttons — only show when impression has value */}
                            {isFComplete("impression") && (
                            <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                              <button
                                onClick={() => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn)}
                                className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                              >
                                <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                                <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                                  {fVal("addons") ? `Add ons (${fVal("addons").split(",").length} selected)` : "Add ons"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAttachModal(true)}
                                className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                              >
                                <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                                <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRushModal("maxillary", productKey)}
                                className="relative flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors"
                              >
                                <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Request Rush</span>
                                <Zap className="w-[8.78px] h-[10.54px] flex-shrink-0 text-[#CF0202]" strokeWidth={0.878154} />
                              </button>
                            </div>
                            )}
                            </>
                          );
                        }

                        return cardTeeth.map(tn => {
                          const tp = getToothProduct("maxillary", tn);
                          const catName = tp?.subcategory?.category?.name?.toLowerCase() || "";
                          const fixed = catName === "fixed restoration";
                          const rem = catName === "removables" || catName === "removables restoration" || catName === "removable restoration";
                          const chain = fixed ? getFixedFieldChain(tp?.advance_fields) : undefined;
                          const isFPerTooth = (step: string) => rem ? hasAdvanceField(step, tp?.advance_fields) : isFieldVisible("maxillary", tn, step as any, chain);
                          const isFCompletePerTooth = (step: string) => isFieldCompleted("maxillary", tn, step as any);
                          const fValPerTooth = (step: string) => getFieldValue("maxillary", tn, step as any);

                          return (
                            <div key={tn} className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                              <p className="font-[Verdana] text-[16px] sm:text-xl font-bold text-[#1d1d1b]">Tooth #{tn}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${caseSubmitted ? "border-[#b4b0b0]" : "border-[#34a853]"}`}>
                                  <legend className={`text-sm px-1 ${caseSubmitted ? "text-[#7f7f7f]" : "text-[#34a853]"}`}>Product - Material</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate">{tp?.name || cardProductName}</span>
                                  {!caseSubmitted && <Check size={14} className="text-[#34a853] ml-auto flex-shrink-0" />}
                                </fieldset>
                              </div>
                              {(fixed ? isFPerTooth("fixed_stage") : isFPerTooth("stage")) && (() => {
                                const step = fixed ? "fixed_stage" : "stage";
                                const stageVal = fValPerTooth(step) || selectedStages[fixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`] || "";
                                const isStageComplete = isFCompletePerTooth(step) || !!(stageVal && stageVal.trim());
                                const showGreen = isStageComplete && !caseSubmitted;
                                return (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleOpenStageModal(fixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, "maxillary", tn)}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                    <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                    {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                  </fieldset>
                                );
                              })()}
                              {(fixed ? isFPerTooth("fixed_impression") : isFPerTooth("impression")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFCompletePerTooth(fixed ? "fixed_impression" : "impression") && !caseSubmitted ? "border-[#34a853]" : isFCompletePerTooth(fixed ? "fixed_impression" : "impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => {
                                    const hasImplantForm = (maxillaryRetentionTypes[tn] || []).includes("Implant");
                                    if (hasImplantForm && implantDetailCompleteByTooth[tn] !== true) return;
                                    handleOpenImpressionModal("maxillary", fixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, tn);
                                  }}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFCompletePerTooth(fixed ? "fixed_impression" : "impression") && !caseSubmitted ? "text-[#34a853]" : isFCompletePerTooth(fixed ? "fixed_impression" : "impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fValPerTooth(fixed ? "fixed_impression" : "impression") || getImpressionDisplayText(fixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, "maxillary")}</span>
                                  {isFCompletePerTooth(fixed ? "fixed_impression" : "impression") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                              {(fixed ? isFPerTooth("fixed_addons") : isFPerTooth("addons")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFCompletePerTooth(fixed ? "fixed_addons" : "addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                                  onClick={() => handleOpenAddOnsModal("maxillary", fixed ? `maxillary_fixed_${tn}` : `maxillary_prep_${tn}`, tn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFCompletePerTooth(fixed ? "fixed_addons" : "addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Add ons</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fValPerTooth(fixed ? "fixed_addons" : "addons") || "0 selected"}</span>
                                  {isFCompletePerTooth(fixed ? "fixed_addons" : "addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                            </div>
                          );
                        });
                      })()}

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
