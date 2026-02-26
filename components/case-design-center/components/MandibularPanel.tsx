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
  ProductGrade,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { getFixedFieldChain } from "../hooks/useToothFieldProgress";
import { ImplantDetailSection } from "./ImplantDetailSection";
import { GumShadePicker } from "./GumShadePicker";

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

function getDefaultGrade(grades?: ProductGrade[]): ProductGrade | null {
  if (!grades || grades.length === 0) return null;
  return grades.find((g) => g.is_default === "Yes" && g.status === "Active") || grades.filter((g) => g.status === "Active").sort((a, b) => a.sequence - b.sequence)[0] || null;
}

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

interface MandibularPanelProps {
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;
  /** When true, overlays the panel to prevent interaction until maxillary is complete */
  disabled?: boolean;
  onAddProduct?: (arch: "maxillary" | "mandibular") => void;
  disableAddProduct?: boolean;

  // Teeth
  mandibularTeeth: number[];
  handleMandibularToothClick: (tooth: number) => void;
  handleMandibularToothDeselect: (tooth: number) => void;
  mandibularRetentionTypes: Record<number, Array<RetentionType>>;

  // Retention popover
  retentionPopoverState: RetentionPopoverState;
  setRetentionPopoverState: (state: RetentionPopoverState) => void;
  /** When true, active product is Removable restoration — hide retention popover and only toggle teeth */
  activeProductIsRemovables?: boolean;
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
  mandibularToothExtractionMap: Record<number, string>;
  mandibularClaspTeeth: number[];
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string) => void;
  selectAllMandibularTeeth: (teeth: number[]) => void;
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

export function MandibularPanel({
  showMandibular,
  setShowMandibular,
  showDetails,
  caseSubmitted = false,
  disabled = false,
  onAddProduct,
  disableAddProduct = false,
  mandibularTeeth,
  handleMandibularToothClick,
  handleMandibularToothDeselect,
  mandibularRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  activeProductIsRemovables = false,
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
  mandibularToothExtractionMap,
  mandibularClaspTeeth,
  handleToothExtractionToggle,
  selectAllMandibularTeeth,
}: MandibularPanelProps) {
  const MANDIBULAR_ALL_TEETH = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  /** Tracks implant detail completion per tooth so we can block impression modal until complete. */
  const [implantDetailCompleteByTooth, setImplantDetailCompleteByTooth] = useState<Record<number, boolean>>({});
  /** Expand/collapse for initial (card 0) Removables product accordion */
  const [initialRemovablesExpanded, setInitialRemovablesExpanded] = useState(true);
  const [showGradeDropdown, setShowGradeDropdown] = useState<string | null>(null);

  // Auto-select default grade for removable products when product loads
  const autoGradeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MANDIBULAR_ALL_TEETH) {
      const tp = getToothProduct("mandibular", tn);
      if (!tp?.grades?.length) continue;
      const key = `mandibular_${tn}`;
      if (autoGradeApplied.current.has(key)) continue;
      const currentVal = getFieldValue("mandibular", tn, "grade");
      if (currentVal) continue;
      const def = getDefaultGrade(tp.grades);
      if (def) {
        autoGradeApplied.current.add(key);
        completeFieldStep("mandibular", tn, "grade", def.name);
      }
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  /** Hide retention-type popover when category is Removable(s) Restoration */
  const isRemovablesCategory =
    mandibularTeeth.some((tn) => {
      const p = getToothProduct("mandibular", tn);
      const name = (p?.subcategory?.category?.name ?? "").toLowerCase();
      return name === "removables" || name === "removables restoration" || name === "removable restoration";
    }) ||
    addedProducts
      .filter((ap) => ap.arch === "mandibular")
      .some((ap) => {
        const name = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
        return name === "removables" || name === "removables restoration" || name === "removable restoration";
      });

  return (
    <div className={`flex-1 min-w-0 px-0 md:px-3 order-3 lg:order-none relative${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
      {/* Overlay to block interaction while maxillary is incomplete */}
      {disabled && (
        <div
          className="absolute inset-0 z-10 rounded-lg flex items-start justify-center pt-12 cursor-not-allowed"
          style={{ backgroundColor: "rgba(245,245,245,0.75)" }}
          title="Complete the Maxillary fields first"
        >
          <span className="text-xs text-[#7f7f7f] bg-white border border-[#d9d9d9] rounded px-3 py-1.5 shadow-sm select-none pointer-events-none">
            Complete Maxillary fields first
          </span>
        </div>
      )}
      {/* Mandibular header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        {showDetails && !caseSubmitted && !disableAddProduct && (
          <button
            onClick={() => onAddProduct?.('mandibular')}
            className="flex items-center gap-1.5 shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-base font-semibold leading-[22px] tracking-[-0.02em] text-center px-2.5 py-1 rounded-md bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer">
            <Plus size={13} strokeWidth={1.5} />
            Add Product
          </button>
        )}
        <h3 className="text-[16px] sm:text-xl font-bold text-[#1d1d1b] tracking-wide">
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
                willExtractTeeth={(() => {
                  const wedCodes = new Set<string>();
                  for (const tn of MANDIBULAR_ALL_TEETH) {
                    const product = getToothProduct("mandibular", tn);
                    for (const e of product?.extractions ?? []) {
                      const n = (e.name ?? "").toLowerCase().trim();
                      if (e.code === "WED" || n === "will extract on delivery") {
                        wedCodes.add(e.code);
                      }
                    }
                  }
                  return Object.entries(mandibularToothExtractionMap)
                    .filter(([, code]) => wedCodes.has(code))
                    .map(([tn]) => Number(tn));
                })()}
                onToothClick={(toothNumber: number) => {
                  if (activeExtractionCode) {
                    // When an extraction box is active, only toggle the extraction mapping.
                    // Ensure tooth stays selected so it appears in the extraction box.
                    if (!mandibularTeeth.includes(toothNumber)) {
                      handleMandibularToothClick(toothNumber);
                    }
                    handleToothExtractionToggle("mandibular", toothNumber, activeExtractionCode);
                  } else {
                    handleMandibularToothClick(toothNumber);
                  }
                }}
                className="w-full"
                retentionTypesByTooth={mandibularRetentionTypes}
                showRetentionPopover={
                  retentionPopoverState.arch === "mandibular" && !isRemovablesCategory && !activeProductIsRemovables
                }
                retentionPopoverTooth={retentionPopoverState.toothNumber}
                onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                onDeselectTooth={handleMandibularToothDeselect}
                toothExtractionMap={mandibularToothExtractionMap}
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
            const allExtractions = MANDIBULAR_ALL_TEETH.flatMap((tn) => {
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
                  claspTeeth={mandibularClaspTeeth}
                  activeExtractionCode={activeExtractionCode}
                  onActiveExtractionChange={setActiveExtractionCode}
                  onToothExtractionToggle={(tn, code) => handleToothExtractionToggle("mandibular", tn, code)}
                  onSelectAllTeeth={selectAllMandibularTeeth}
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
                  const groupStageProductIdFixed = `mandibular_fixed_${groupStageToothNumber}`;
                  const toothNumbersDisplay = `#${toothNumbers.join(",")}`;
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

                  // Gate: hide product fields while shade guide is open and incomplete for this product
                  const _mandFixedShadeProductId = `fixed_${firstToothNumber}`;
                  const fixedShadeIncomplete =
                    shadeSelectionState.productId === _mandFixedShadeProductId &&
                    shadeSelectionState.arch === "mandibular" &&
                    !(
                      getSelectedShade(_mandFixedShadeProductId, "mandibular", "stump_shade") &&
                      getSelectedShade(_mandFixedShadeProductId, "mandibular", "tooth_shade")
                    );

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
                            {(selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]) && (
                                <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                                  {selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]}
                                </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
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
                          productId={categoryName === "Fixed Restoration" ? groupStageProductIdFixed : `mandibular_prep_${firstToothNumber}`}
                          arch="mandibular"
                          toothNumber={categoryName === "Fixed Restoration" ? groupStageToothNumber : firstToothNumber}
                          isExpanded={true}
                          isStageVisible={categoryName === "Fixed Restoration" ? isFixed("fixed_stage") : isFieldVisible("mandibular", firstToothNumber, "stage")}
                          isStageEmpty={categoryName === "Fixed Restoration" ? !(selectedStages[groupStageProductIdFixed] || getFieldValue("mandibular", groupStageToothNumber, "fixed_stage")) : !(selectedStages[`mandibular_prep_${firstToothNumber}`] || getFieldValue("mandibular", firstToothNumber, "stage"))}
                          onOpenStage={handleOpenStageModal}
                        />
                        {categoryName === "Fixed Restoration" && (
                          <>
                            <AutoOpenShadeGuideIfEmpty
                              arch="mandibular"
                              productId={`fixed_${firstToothNumber}`}
                              isExpanded={true}
                              isShadeSectionVisible={isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")}
                              stumpShadeEmpty={!getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "stump_shade")}
                              toothShadeEmpty={!getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                              setShadeSelectionState={setShadeSelectionState}
                            />
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isPrepPonticExpanded(firstToothNumber)}
                              isImpressionVisible={!fixedShadeIncomplete && isFixed("fixed_impression")}
                              isImpressionEmpty={!isFieldCompleted("mandibular", firstToothNumber, "fixed_impression")}
                              onOpenImpressionModal={(arch, productId, toothNum) => {
                                const hasImplantForm = toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant"));
                                if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                                handleOpenImpressionModal(arch, productId, toothNum);
                              }}
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
                            {(isFixed("fixed_stage") || (isFixed("fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", selectedProduct?.advance_fields))) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isFixed("fixed_stage") && (() => {
                                  const fixedStageValue = selectedStages[groupStageProductIdFixed] || getFieldValue("mandibular", groupStageToothNumber, "fixed_stage");
                                  const isStageComplete = isFieldCompleted("mandibular", groupStageToothNumber, "fixed_stage") || !!(fixedStageValue && fixedStageValue.trim());
                                  const showStageGreen = isStageComplete && !caseSubmitted;
                                  return (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      showStageGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      handleOpenStageModal(groupStageProductIdFixed, "mandibular", groupStageToothNumber);
                                    }}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${showStageGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                                      Stage
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000]">
                                        {fixedStageValue}
                                      </span>
                                      {showStageGreen && (
                                        <Check size={16} className="text-[#34a853] ml-auto" />
                                      )}
                                      <div className={showStageGreen ? "" : "ml-auto"}>
                                        <ArticulatorIcon />
                                      </div>
                                    </div>
                                  </fieldset>
                                  );
                                })()}
                                {isFixed("fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", selectedProduct?.advance_fields) && (
                                  <ShadeField
                                    label="Stump Shade"
                                    value={selectedShadeGuide}
                                    shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "stump_shade")}
                                    onClick={() => handleShadeFieldClick("mandibular", "stump_shade", `fixed_${firstToothNumber}`)}
                                    submitted={caseSubmitted}
                                  />
                                )}
                              </div>
                            )}

                            {/* Step 3: Cervical / Incisal / Body Shade (no Tooth Shade field) */}
                            {isFixed("fixed_shade_trio") && hasAdvanceField("fixed_shade_trio", selectedProduct?.advance_fields) && (
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
                                  submitted={caseSubmitted}
                                />
                                <ShadeField
                                  label="Incisal Shade"
                                  value={selectedShadeGuide}
                                  shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                                  onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", `fixed_${firstToothNumber}`)}
                                  submitted={caseSubmitted}
                                />
                                <ShadeField
                                  label="Body Shade"
                                  value={selectedShadeGuide}
                                  shade={getSelectedShade(`fixed_${firstToothNumber}`, "mandibular", "tooth_shade")}
                                  onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", `fixed_${firstToothNumber}`)}
                                  submitted={caseSubmitted}
                                />
                              </div>
                            )}

                            {/* Implant Detail - shown after shade selection, always when applicable */}
                            {toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant")) && (
                              <ImplantDetailSection
                                toothNumber={firstToothNumber}
                                onCompleteChange={(complete) => setImplantDetailCompleteByTooth((prev) => ({ ...prev, [firstToothNumber]: complete }))}
                              />
                            )}

                            {/* Step 4: Characterization / Intensity / Surface finish */}
                            {isFixed("fixed_characterization") && hasAdvanceField("fixed_characterization", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "border-[#34a853]" : isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "border-[#b4b0b0]" : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    if (!isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization")) {
                                      completeFieldStep("mandibular", firstToothNumber, "fixed_characterization", "selected");
                                    }
                                  }}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                                    Characterization
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[14px] sm:text-lg text-[#000000]">{getFieldValue("mandibular", firstToothNumber, "fixed_characterization")}</span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
                                  </div>
                                </fieldset>
                                <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}>
                                  <legend className={`text-sm px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Intensity</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                                </fieldset>
                                <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}>
                                  <legend className={`text-sm px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Surface finish</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                                </fieldset>
                              </div>
                            )}

                            {/* Step 5: Occlusal Contact / Pontic Design / Embrasures / Proximal Contact */}
                            {isFixed("fixed_contact_icons") && hasAdvanceField("fixed_contact_icons", selectedProduct?.advance_fields) && (
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
                                      <IconField label={labels[idx]} value="" icon={icon} submitted={caseSubmitted} />
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Step 6: Margin Design / Margin Depth / Occlusal Reduction / Axial Reduction */}
                            {isFixed("fixed_margin") && hasAdvanceField("fixed_margin", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {["Margin Design", "Margin Depth", "Occlusal Reduction", "Axial Reduction"].map((label, idx) => {
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_margin");
                                  const showGreen = isCompleted && !caseSubmitted;
                                  return (
                                    <fieldset
                                      key={label}
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                        showGreen ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                      }`}
                                      onClick={() => {
                                        if (!isCompleted) completeFieldStep("mandibular", firstToothNumber, "fixed_margin", "selected");
                                      }}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
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
                            {isFixed("fixed_metal") && hasAdvanceField("fixed_metal", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {["Metal Design", "Metal Thickness", "Modification"].map((label, idx) => {
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_metal");
                                  const showGreen = isCompleted && !caseSubmitted;
                                  return (
                                    <fieldset
                                      key={label}
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                        showGreen ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                      }`}
                                      onClick={() => {
                                        if (!isCompleted) completeFieldStep("mandibular", firstToothNumber, "fixed_metal", "selected");
                                      }}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
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
                            {isFixed("fixed_proximal_contact") && hasAdvanceField("fixed_proximal_contact", selectedProduct?.advance_fields) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {["Proximal Contact – Mesial", "Proximal Contact – Distal", "Functional Guidance"].map((label, idx) => {
                                  const isCompleted = isFieldCompleted("mandibular", firstToothNumber, "fixed_proximal_contact");
                                  const showGreen = isCompleted && !caseSubmitted;
                                  return (
                                    <fieldset
                                      key={label}
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                        showGreen ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                                      }`}
                                      onClick={() => {
                                        if (!isCompleted) completeFieldStep("mandibular", firstToothNumber, "fixed_proximal_contact", "selected");
                                      }}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
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
                                    isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") && !caseSubmitted ? "border-[#34a853]" : isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    const hasImplantForm = toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant"));
                                    if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                                    handleOpenImpressionModal("mandibular", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                                  }}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") && !caseSubmitted ? "text-[#34a853]" : isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                                    Impression
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                      {getImpressionDisplayText(selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, "mandibular")}
                                    </span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") && !caseSubmitted && (
                                      <Check size={16} className="text-[#34a853] ml-auto" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFixed("fixed_addons") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                                    }`}
                                    onClick={() => {
                                      handleOpenAddOnsModal("mandibular", selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
                                    }}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                                      Add ons
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                        {getFieldValue("mandibular", firstToothNumber, "fixed_addons")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "fixed_addons") && !caseSubmitted && (
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
                                  isFieldCompleted("mandibular", firstToothNumber, "fixed_notes") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                                }`}
                              >
                                <legend className={`text-sm px-1 leading-none ${isFieldCompleted("mandibular", firstToothNumber, "fixed_notes") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                                  Additional notes
                                </legend>
                                <textarea
                                  rows={3}
                                  placeholder="Enter additional notes..."
                                  className="w-full text-xs text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
                                  onChange={(e) => {
                                    if (e.target.value && !isFieldCompleted("mandibular", firstToothNumber, "fixed_notes")) {
                                      completeFieldStep("mandibular", firstToothNumber, "fixed_notes", e.target.value);
                                    }
                                  }}
                                />
                              </fieldset>
                            )}

                            {/* Bottom action buttons — shown after Impression is completed */}
                            {isFieldCompleted("mandibular", firstToothNumber, "fixed_impression") && (
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
                            </>}
                          </>
                        ) : (
                          <>
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isPrepPonticExpanded(firstToothNumber)}
                              isImpressionVisible={isFieldVisible("mandibular", firstToothNumber, "impression")}
                              isImpressionEmpty={!isFieldCompleted("mandibular", firstToothNumber, "impression")}
                              onOpenImpressionModal={(arch, productId, toothNum) => {
                                const hasImplantForm = toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant"));
                                if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                                handleOpenImpressionModal(arch, productId, toothNum);
                              }}
                              arch="mandibular"
                              productId={selectedProduct?.id?.toString() || `prep_${firstToothNumber}`}
                              toothNumber={firstToothNumber}
                            />
                            {/* ===== OTHER CATEGORIES: Progressive step-by-step fields ===== */}

                            {/* Implant Detail - show if any tooth in group has Implant retention */}
                            {toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant")) && (
                              <ImplantDetailSection
                                toothNumber={firstToothNumber}
                                onCompleteChange={(complete) => setImplantDetailCompleteByTooth((prev) => ({ ...prev, [firstToothNumber]: complete }))}
                              />
                            )}

                            {/* Step 1: Grade / Stage */}
                            {isFieldVisible("mandibular", firstToothNumber, "grade") && (
                              <div className="grid grid-cols-2 gap-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "grade") && !caseSubmitted
                                      ? "border-[#34a853]"
                                      : isFieldCompleted("mandibular", firstToothNumber, "grade")
                                        ? "border-[#b4b0b0]"
                                        : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    if (!isFieldCompleted("mandibular", firstToothNumber, "grade")) {
                                      completeFieldStep("mandibular", firstToothNumber, "grade", "Standard");
                                    }
                                  }}
                                >
                                  <legend
                                    className={`text-sm px-1 leading-none ${
                                      isFieldCompleted("mandibular", firstToothNumber, "grade") && !caseSubmitted
                                        ? "text-[#34a853]"
                                        : isFieldCompleted("mandibular", firstToothNumber, "grade")
                                          ? "text-[#7f7f7f]"
                                          : "text-[#CF0202]"
                                    }`}
                                  >
                                    Grade
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[14px] sm:text-lg text-[#000000]">
                                      {getFieldValue("mandibular", firstToothNumber, "grade")}
                                    </span>
                                    <div className="flex gap-1 ml-auto">
                                      <BlueDiamond />
                                      <BlueDiamond />
                                      <GrayDiamond />
                                      <GrayDiamond />
                                    </div>
                                    {isFieldCompleted("mandibular", firstToothNumber, "grade") && !caseSubmitted && (
                                      <Check size={16} className="text-[#34a853]" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "stage") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "stage") && !caseSubmitted
                                        ? "border-[#34a853]"
                                        : isFieldCompleted("mandibular", firstToothNumber, "stage")
                                          ? "border-[#b4b0b0]"
                                          : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      handleOpenStageModal(`mandibular_prep_${firstToothNumber}`, "mandibular", firstToothNumber);
                                    }}
                                  >
                                    <legend
                                      className={`text-sm px-1 leading-none ${
                                        isFieldCompleted("mandibular", firstToothNumber, "stage") && !caseSubmitted
                                          ? "text-[#34a853]"
                                          : isFieldCompleted("mandibular", firstToothNumber, "stage")
                                            ? "text-[#7f7f7f]"
                                            : "text-[#CF0202]"
                                      }`}
                                    >
                                      Stage
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000]">
                                        {getFieldValue("mandibular", firstToothNumber, "stage")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "stage") && !caseSubmitted && (
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
                              <>
                              <AutoOpenShade
                                hasValue={isFieldCompleted("mandibular", firstToothNumber, "teeth_shade")}
                                onOpen={() => handleShadeFieldClick("mandibular", "tooth_shade", `prep_${firstToothNumber}`)}
                              />
                              {/* Gum Shade Picker - shown above when gum shade field is visible but not completed */}
                              {isFieldVisible("mandibular", firstToothNumber, "gum_shade") &&
                                !isFieldCompleted("mandibular", firstToothNumber, "gum_shade") && (
                                <div className="mt-3">
                                  <GumShadePicker
                                    selected={null}
                                    onSelect={(shadeName) => {
                                      completeFieldStep("mandibular", firstToothNumber, "gum_shade", shadeName);
                                    }}
                                  />
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "teeth_shade") && !caseSubmitted
                                      ? "border-[#34a853]"
                                      : isFieldCompleted("mandibular", firstToothNumber, "teeth_shade")
                                        ? "border-[#b4b0b0]"
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
                                    className={`text-sm px-1 leading-none ${
                                      isFieldCompleted("mandibular", firstToothNumber, "teeth_shade") && !caseSubmitted
                                        ? "text-[#34a853]"
                                        : isFieldCompleted("mandibular", firstToothNumber, "teeth_shade")
                                          ? "text-[#7f7f7f]"
                                          : "text-[#CF0202]"
                                    }`}
                                  >
                                    Teeth shade
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[14px] sm:text-lg text-[#000000]">
                                      {getFieldValue("mandibular", firstToothNumber, "teeth_shade")}
                                    </span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "teeth_shade") && !caseSubmitted && (
                                      <Check size={16} className="text-[#34a853] ml-auto" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "gum_shade") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "gum_shade") && !caseSubmitted
                                        ? "border-[#34a853]"
                                        : isFieldCompleted("mandibular", firstToothNumber, "gum_shade")
                                          ? "border-[#b4b0b0]"
                                          : "border-[#CF0202]"
                                    }`}
                                    onClick={() => {
                                      if (!isFieldCompleted("mandibular", firstToothNumber, "gum_shade")) {
                                        completeFieldStep("mandibular", firstToothNumber, "gum_shade", "GC Initial Gingiva");
                                      }
                                    }}
                                  >
                                    <legend
                                      className={`text-sm px-1 leading-none ${
                                        isFieldCompleted("mandibular", firstToothNumber, "gum_shade") && !caseSubmitted
                                          ? "text-[#34a853]"
                                          : isFieldCompleted("mandibular", firstToothNumber, "gum_shade")
                                            ? "text-[#7f7f7f]"
                                            : "text-[#CF0202]"
                                      }`}
                                    >
                                      Gum Shade
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate">
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
                                      {isFieldCompleted("mandibular", firstToothNumber, "gum_shade") && !caseSubmitted && (
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
                            {isFieldVisible("mandibular", firstToothNumber, "impression") && (
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isFieldCompleted("mandibular", firstToothNumber, "impression") && !caseSubmitted
                                      ? "border-[#34a853]"
                                      : isFieldCompleted("mandibular", firstToothNumber, "impression")
                                        ? "border-[#b4b0b0]"
                                        : "border-[#CF0202]"
                                  }`}
                                  onClick={() => {
                                    const hasImplantForm = toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant"));
                                    if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
                                    handleOpenImpressionModal("mandibular", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                                  }}
                                >
                                  <legend
                                    className={`text-sm px-1 leading-none ${
                                      isFieldCompleted("mandibular", firstToothNumber, "impression") && !caseSubmitted
                                        ? "text-[#34a853]"
                                        : isFieldCompleted("mandibular", firstToothNumber, "impression")
                                          ? "text-[#7f7f7f]"
                                          : "text-[#CF0202]"
                                    }`}
                                  >
                                    Impression
                                  </legend>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                      {getFieldValue("mandibular", firstToothNumber, "impression")}
                                    </span>
                                    {isFieldCompleted("mandibular", firstToothNumber, "impression") && !caseSubmitted && (
                                      <Check size={16} className="text-[#34a853] ml-auto" />
                                    )}
                                  </div>
                                </fieldset>

                                {isFieldVisible("mandibular", firstToothNumber, "addons") ? (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isFieldCompleted("mandibular", firstToothNumber, "addons") && !caseSubmitted
                                        ? "border-[#34a853]"
                                        : "border-[#b4b0b0]"
                                    }`}
                                    onClick={() => {
                                      handleOpenAddOnsModal("mandibular", selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
                                    }}
                                  >
                                    <legend
                                      className={`text-sm px-1 leading-none ${
                                        isFieldCompleted("mandibular", firstToothNumber, "addons") && !caseSubmitted
                                          ? "text-[#34a853]"
                                          : "text-[#7f7f7f]"
                                      }`}
                                    >
                                      Add ons
                                    </legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                                        {getFieldValue("mandibular", firstToothNumber, "addons")}
                                      </span>
                                      {isFieldCompleted("mandibular", firstToothNumber, "addons") && !caseSubmitted && (
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

          {/* Initial Removables product accordion — show fields when user selected Removable restoration and clicked teeth (assigned to card 0) */}
          {showDetails && activeProductIsRemovables && (() => {
            // Use all arch teeth (not just selected) so the accordion stays visible when all teeth are marked missing
            const cardTeeth = MANDIBULAR_ALL_TEETH.filter(tn => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0);
            if (cardTeeth.length === 0) return null;
            const cardProduct = getToothProduct("mandibular", cardTeeth[0]);
            const cardProductName = cardProduct?.name || "Removable restoration";
            const cardProductImage = cardProduct?.image_url || null;
            // For removable products, show all selected teeth from the chart (mandibularTeeth)
            const displayTeeth = [...mandibularTeeth].sort((a, b) => a - b);
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
            const stageVal = selectedStages[`mandibular_prep_${repTnStage}`] || getFieldValue("mandibular", repTnStage, "stage");

            return (
              <div key="initial-removables-mandibular" className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
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
                    <div className="flex items-center gap-1">
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
                      const toothProduct = getToothProduct("mandibular", repTn);
                      const advFields = toothProduct?.advance_fields;
                      const isF = (step: string) => hasAdvanceField(step, advFields) && isFieldVisible("mandibular", repTn, step as any);
                      const isFComplete = (step: string) => isFieldCompleted("mandibular", repTn, step as any);
                      const fVal = (step: string) => getFieldValue("mandibular", repTn, step as any);
                      const productKey = `mandibular_prep_${repTn}`;
                      const stageVal = fVal("stage") || selectedStages[productKey] || "";
                      return (
                        <>
                        <AutoOpenStageIfEmpty
                          productId={productKey}
                          arch="mandibular"
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
                          arch="mandibular"
                          productId={productKey}
                          toothNumber={repTn}
                        />
                        <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                          {/* Row 1: Grade / Stage */}
                          {(isF("grade") || isF("stage")) && (
                          <div className="grid grid-cols-2 gap-3">
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
                                        completeFieldStep("mandibular", repTn, "grade", def?.name || "Economy");
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
                                            completeFieldStep("mandibular", repTn, "grade", g.name);
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
                                  onClick={() => handleOpenStageModal(productKey, "mandibular", repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                  {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              );
                            })()}
                          </div>
                          )}

                          {/* Row 2: Teeth shade / Gum Shade */}
                          {(isF("teeth_shade") || isF("gum_shade")) && (() => {
                            const shadeProductId = `prep_${repTn}`;
                            return (
                              <>
                                {isF("teeth_shade") && (
                                  <AutoOpenShade
                                    hasValue={isFComplete("teeth_shade")}
                                    onOpen={() => handleShadeFieldClick("mandibular", "tooth_shade", shadeProductId)}
                                  />
                                )}
                                {isF("gum_shade") && !isFComplete("gum_shade") && (
                                  <GumShadePicker
                                    selected={null}
                                    onSelect={(shadeName) => {
                                      completeFieldStep("mandibular", repTn, "gum_shade", shadeName);
                                    }}
                                  />
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                  {isF("teeth_shade") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", shadeProductId)}
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
                                        completeFieldStep("mandibular", repTn, "gum_shade", "GC Initial Gingiva");
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

                          {/* Row 3: Impression */}
                          {isF("impression") && (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("impression") && !caseSubmitted ? "border-[#34a853]" : isFComplete("impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                              onClick={() => handleOpenImpressionModal("mandibular", productKey, repTn)}
                            >
                              <legend className={`text-sm px-1 leading-none ${isFComplete("impression") && !caseSubmitted ? "text-[#34a853]" : isFComplete("impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("impression") || getImpressionDisplayText(productKey, "mandibular")}</span>
                              {isFComplete("impression") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                            </fieldset>
                          )}
                          {/* Row 4: Add ons (full width) */}
                          {isF("addons") && (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                              onClick={() => handleOpenAddOnsModal("mandibular", toothProduct?.id?.toString() || productKey, repTn)}
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
                            onClick={() => handleOpenAddOnsModal("mandibular", toothProduct?.id?.toString() || productKey, repTn)}
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
                            onClick={() => handleOpenRushModal("mandibular", productKey)}
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
            .filter(ap => ap.arch === "mandibular")
            .map((ap, apIndex) => {
              // For removable restoration products, use all arch teeth so accordion stays visible when teeth are marked missing
              const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
              const isApRemovables = apCatName === "removables" || apCatName === "removables restoration" || apCatName === "removable restoration";
              const cardTeethSource = isApRemovables ? MANDIBULAR_ALL_TEETH : mandibularTeeth;
              const cardTeeth = cardTeethSource.filter(
                tn => isApRemovables
                  ? getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === ap.id
                  : getToothProductCard("mandibular", tn) === ap.id
              );
              const cardProduct = cardTeeth.length > 0
                ? getToothProduct("mandibular", cardTeeth[0])
                : null;
              const cardProductName = cardProduct?.name || ap.product.name || "Untitled Product";
              const cardProductImage = cardProduct?.image_url || ap.product.image_url || null;
              const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product.category_name || "";
              const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product.subcategory_name || "";
              // For removable products, show all selected teeth from the chart
              const apDisplayTeeth = isApRemovables
                ? [...mandibularTeeth].sort((a, b) => a - b)
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
                        <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
                          Product {apIndex + 2}
                        </span>
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
                      <div className="flex items-center gap-1">
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
                        const toothProduct = getToothProduct("mandibular", repTn);
                        const categoryName = toothProduct?.subcategory?.category?.name?.toLowerCase() || "";
                        const isFixed = categoryName === "fixed restoration";
                        const isRemovables = isCardRemovables || categoryName === "removables" || categoryName === "removables restoration" || categoryName === "removable restoration";
                        const fixedChain = isFixed ? getFixedFieldChain(toothProduct?.advance_fields) : undefined;
                        const advFields = toothProduct?.advance_fields;
                        const isF = (step: string) => isRemovables ? hasAdvanceField(step, advFields) : isFieldVisible("mandibular", repTn, step as any, fixedChain);
                        const isFComplete = (step: string) => isFieldCompleted("mandibular", repTn, step as any);
                        const fVal = (step: string) => getFieldValue("mandibular", repTn, step as any);

                        if (isCardRemovables) {
                          const productKey = `mandibular_prep_${repTn}`;
                          return (
                            <>
                            <AutoOpenImpressionIfEmpty
                              isExpanded={ap.expanded}
                              isImpressionVisible={isF("impression")}
                              isImpressionEmpty={!isFComplete("impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="mandibular"
                              productId={productKey}
                              toothNumber={repTn}
                            />
                            <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                              {(isFixed ? isF("fixed_stage") : isF("stage")) && (() => {
                                const step = isFixed ? "fixed_stage" : "stage";
                                const stageVal = fVal(step) || selectedStages[isFixed ? `mandibular_fixed_${repTn}` : `mandibular_prep_${repTn}`] || "";
                                const isStageComplete = isFComplete(step) || !!(stageVal && stageVal.trim());
                                const showGreen = isStageComplete && !caseSubmitted;
                                return (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleOpenStageModal(isFixed ? `mandibular_fixed_${repTn}` : `mandibular_prep_${repTn}`, "mandibular", repTn)}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                    <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                    {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                  </fieldset>
                                );
                              })()}
                              {(isFixed ? isF("fixed_impression") : isF("impression")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete(isFixed ? "fixed_impression" : "impression") && !caseSubmitted ? "border-[#34a853]" : isFComplete(isFixed ? "fixed_impression" : "impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => handleOpenImpressionModal("mandibular", isFixed ? `mandibular_fixed_${repTn}` : `mandibular_prep_${repTn}`, repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFComplete(isFixed ? "fixed_impression" : "impression") && !caseSubmitted ? "text-[#34a853]" : isFComplete(isFixed ? "fixed_impression" : "impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal(isFixed ? "fixed_impression" : "impression") || getImpressionDisplayText(isFixed ? `mandibular_fixed_${repTn}` : `mandibular_prep_${repTn}`, "mandibular")}</span>
                                  {isFComplete(isFixed ? "fixed_impression" : "impression") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                              {(isFixed ? isF("fixed_addons") : isF("addons")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete(isFixed ? "fixed_addons" : "addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                                  onClick={() => handleOpenAddOnsModal("mandibular", toothProduct?.id?.toString() || (isFixed ? `mandibular_fixed_${repTn}` : `mandibular_prep_${repTn}`), repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFComplete(isFixed ? "fixed_addons" : "addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Add ons</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal(isFixed ? "fixed_addons" : "addons") || "0 selected"}</span>
                                  {isFComplete(isFixed ? "fixed_addons" : "addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                            </div>
                            </>
                          );
                        }

                        return cardTeeth.map(tn => {
                          const tp = getToothProduct("mandibular", tn);
                          const catName = tp?.subcategory?.category?.name?.toLowerCase() || "";
                          const fixed = catName === "fixed restoration";
                          const rem = catName === "removables" || catName === "removables restoration" || catName === "removable restoration";
                          const chain = fixed ? getFixedFieldChain(tp?.advance_fields) : undefined;
                          const isFPerTooth = (step: string) => rem ? hasAdvanceField(step, tp?.advance_fields) : isFieldVisible("mandibular", tn, step as any, chain);
                          const isFCompletePerTooth = (step: string) => isFieldCompleted("mandibular", tn, step as any);
                          const fValPerTooth = (step: string) => getFieldValue("mandibular", tn, step as any);

                          return (
                            <div key={tn} className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                              <p className="font-[Verdana] text-[16px] sm:text-xl font-bold text-[#1d1d1b]">Tooth #{tn}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${caseSubmitted ? "border-[#b4b0b0]" : "border-[#34a853]"}`}>
                                  <legend className={`text-sm px-1 leading-none ${caseSubmitted ? "text-[#7f7f7f]" : "text-[#34a853]"}`}>Product - Material</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate">{tp?.name || cardProductName}</span>
                                  {!caseSubmitted && <Check size={14} className="text-[#34a853] ml-auto flex-shrink-0" />}
                                </fieldset>
                              </div>
                              {(fixed ? isFPerTooth("fixed_stage") : isFPerTooth("stage")) && (() => {
                                const step = fixed ? "fixed_stage" : "stage";
                                const stageVal = fValPerTooth(step) || selectedStages[fixed ? `mandibular_fixed_${tn}` : `mandibular_prep_${tn}`] || "";
                                const isStageComplete = isFCompletePerTooth(step) || !!(stageVal && stageVal.trim());
                                const showGreen = isStageComplete && !caseSubmitted;
                                return (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleOpenStageModal(fixed ? `mandibular_fixed_${tn}` : `mandibular_prep_${tn}`, "mandibular", tn)}
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
                                    const hasImplantForm = (mandibularRetentionTypes[tn] || []).includes("Implant");
                                    if (hasImplantForm && implantDetailCompleteByTooth[tn] !== true) return;
                                    handleOpenImpressionModal("mandibular", fixed ? `mandibular_fixed_${tn}` : `mandibular_prep_${tn}`, tn);
                                  }}
                                >
                                  <legend className={`text-sm px-1 leading-none ${isFCompletePerTooth(fixed ? "fixed_impression" : "impression") && !caseSubmitted ? "text-[#34a853]" : isFCompletePerTooth(fixed ? "fixed_impression" : "impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fValPerTooth(fixed ? "fixed_impression" : "impression") || getImpressionDisplayText(fixed ? `mandibular_fixed_${tn}` : `mandibular_prep_${tn}`, "mandibular")}</span>
                                  {isFCompletePerTooth(fixed ? "fixed_impression" : "impression") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                              {(fixed ? isFPerTooth("fixed_addons") : isFPerTooth("addons")) && (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFCompletePerTooth(fixed ? "fixed_addons" : "addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                                  onClick={() => handleOpenAddOnsModal("mandibular", tp?.id?.toString() || (fixed ? `mandibular_fixed_${tn}` : `mandibular_prep_${tn}`), tn)}
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
