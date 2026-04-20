"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Trash2,
  Check,
  Paperclip,
} from "lucide-react";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import type { RetentionOptionItem } from "@/components/retention-type-popover";
import {
  FieldInput,
  ShadeField,
  IconField,
} from "./fields";
import { RushIcon } from "./CenterActionIcons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShadeSelectionGuide } from "./ShadeSelectionGuide";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  AddedProduct,
  Arch,
  ShadeFieldType,
  ShadeSelectionState,
  RetentionPopoverState,
  RetentionType,
  ProductApiData,
  ProductGrade,
  ProductExtraction,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { getFixedFieldChain } from "../hooks/useToothFieldProgress";
import type { ImplantDetailData } from "./ImplantDetailSection";
import { GumShadePicker } from "./GumShadePicker";
import { isRemovableCategory, isFixedCategory, getCategoryName, isSingleStageNoStages } from "../utils/categoryHelpers";
import { resolveVariationDisplay } from "../utils/variationHelpers";
import { FixedRestorationFields } from "./FixedRestorationFields";
import { RemovableRestorationFields } from "./RemovableRestorationFields";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
import { ProductImagePreview } from "./ProductImagePreview";

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

/** Single diamond SVG with smooth color transition between blue/gray */
function Diamond({ filled }: { filled: boolean }) {
  const blue = { a: "#45B2EF", b: "#3B9FE2", c: "#80D4FD", d: "#4FC1F8" };
  const gray = { a: "#575756", b: "#706F6F", c: "#3C3C3B", d: "#1D1D1B" };
  const c = filled ? blue : gray;
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill={c.a} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill={c.a} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill={c.b} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M14.9996 23.4212L7.96068 6.84708H22.0388L14.9996 23.4212Z" fill={c.a} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M22.0388 6.84708H7.96068L14.9996 0L22.0388 6.84708Z" fill={c.c} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill={c.a} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill={c.b} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M14.9996 0L7.96075 6.84708L6.93016 0H14.9996Z" fill={c.d} className="transition-[fill] duration-300 ease-in-out" />
      <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill={c.d} className="transition-[fill] duration-300 ease-in-out" />
    </svg>
  );
}

/** Static diamond display (used in non-interactive contexts) */
function GradeDiamonds({ filledCount, total = 4 }: { filledCount: number; total?: number }) {
  const filled = Math.max(0, Math.min(filledCount, total));
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <Diamond key={i} filled={i < filled} />
      ))}
    </div>
  );
}

/**
 * Interactive grade selector: hover over diamonds to preview, click to select.
 * Hovering diamond N fills diamonds 1..N with smooth animation.
 */
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
  const displayName = hoverIndex !== null
    ? (grades.find((g) => g.sequence === hoverIndex + 1)?.name || currentGradeName)
    : currentGradeName;

  return (
    <div
      className="flex items-center gap-2 w-full"
      onMouseLeave={() => setHoverIndex(null)}
    >
      <span className="text-[14px] sm:text-lg text-[#000000] min-w-0 truncate transition-opacity duration-200">
        {displayName}
      </span>
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
  caseSubmitted = false,
}: {
  productId: string;
  arch: Arch;
  toothNumber: number;
  isExpanded: boolean;
  isStageVisible: boolean;
  isStageEmpty: boolean;
  onOpenStage: (productId: string, arch: Arch, toothNumber?: number) => void;
  caseSubmitted?: boolean;
}) {
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (caseSubmitted) return; // never auto-open stage modal in read-only mode
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isStageVisible || !isStageEmpty || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    onOpenStage(productId, arch, toothNumber);
  }, [caseSubmitted, isExpanded, isStageVisible, isStageEmpty, productId, arch, toothNumber, onOpenStage]);
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
  caseSubmitted = false,
}: {
  arch: Arch;
  productId: string;
  isExpanded: boolean;
  isShadeSectionVisible: boolean;
  stumpShadeEmpty: boolean;
  toothShadeEmpty: boolean;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
  caseSubmitted?: boolean;
}) {
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (caseSubmitted) return; // never auto-open shade picker in read-only mode
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
  }, [caseSubmitted, isExpanded, isShadeSectionVisible, stumpShadeEmpty, toothShadeEmpty, arch, productId, setShadeSelectionState]);
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
  caseSubmitted = false,
}: {
  isExpanded: boolean;
  isImpressionVisible: boolean;
  isImpressionEmpty: boolean;
  onOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  arch: Arch;
  productId: string;
  toothNumber: number;
  caseSubmitted?: boolean;
}) {
  const hasAutoOpenedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (caseSubmitted) return; // never auto-open impression modal in read-only mode
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isImpressionVisible || !isImpressionEmpty || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onOpenImpressionModal(arch, productId, toothNumber);
    }, 350);
  }, [caseSubmitted, isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
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

/** Get advance fields from the API that match a given step pattern */
function getAdvanceFieldsForStep(
  step: string,
  advanceFields: Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number; [key: string]: any }> | undefined
): Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number; [key: string]: any }> {
  if (!advanceFields || advanceFields.length === 0) return [];

  const matchers: Record<string, (n: string) => boolean> = {
    fixed_contact_icons: (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure") || (n.includes("proximal") && n.includes("contact") && !n.includes("mesial") && !n.includes("distal")),
    fixed_proximal_contact: (n) => (n.includes("proximal") && n.includes("contact") && (n.includes("mesial") || n.includes("distal"))) || n.includes("functional guidance"),
    fixed_margin: (n) => n.includes("margin"),
    fixed_metal: (n) => n.includes("metal"),
  };

  const matcher = matchers[step];
  if (!matcher) return [];

  return advanceFields
    .filter((f) => matcher((f.name || "").toLowerCase()))
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
}

/** Advance field dropdown that auto-selects default option and auto-opens when no value. */
function AdvanceFieldSelect({
  fieldId,
  fieldName,
  activeOptions,
  currentSelection,
  borderColor,
  labelColor,
  onSelect,
  caseSubmitted,
}: {
  fieldId: number;
  fieldName: string;
  activeOptions: Array<{ id: number; name: string; is_default?: string; [key: string]: any }>;
  currentSelection: { name: string; optionId: number } | undefined;
  borderColor: string;
  labelColor: string;
  onSelect: (opt: { id: number; name: string }) => void;
  caseSubmitted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasAutoSelected = useRef(false);

  // Auto-select the default option on mount if no current selection
  useEffect(() => {
    if (!currentSelection && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      const defaultOpt = activeOptions.find((o) => o.is_default === "Yes");
      if (defaultOpt) {
        onSelect(defaultOpt);
      }
    }
  }, [currentSelection, activeOptions, onSelect]);

  const hasVal = !!currentSelection;

  return (
    <fieldset
      className="border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 cursor-pointer hover:bg-gray-50 transition-colors"
      style={{ borderColor }}
      onClick={() => setOpen(true)}
    >
      <legend className="text-sm px-1 leading-none whitespace-nowrap" style={{ color: labelColor }}>
        {fieldName}
      </legend>
      <Select
        open={open}
        onOpenChange={setOpen}
        value={currentSelection?.optionId?.toString() || ""}
        onValueChange={(value) => {
          const opt = activeOptions.find((o) => o.id?.toString() === value);
          if (opt) onSelect(opt);
        }}
      >
        <SelectTrigger
          className="border-0 shadow-none p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden text-lg font-normal text-[#000000] min-w-0 w-full"
        >
          <SelectValue>
            {currentSelection ? currentSelection.name : ''}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeOptions.map((option) => (
            <SelectItem key={option.id} value={option.id.toString()}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasVal && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto flex-shrink-0" />}
    </fieldset>
  );
}

interface MandibularPanelProps {
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;
  /** When true, overlays the panel to prevent interaction until maxillary is complete */
  disabled?: boolean;
  /** True once the removables impression field has been completed — reveals tooth chart and ToothStatusBoxes */
  removablesImpressionDone?: boolean;
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
  /** Retention options from the product API response, used by retention popover */
  retentionOptions?: RetentionOptionItem[];
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
  handleOpenRushModal: (arch: Arch, productId: string, maxProductId?: string, mandProductId?: string) => void;

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
  storeFieldValue: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  uncompleteFieldStep: (arch: Arch, toothNumber: number, step: FieldStep) => void;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  clearToothProgress: (arch: Arch, toothNumber: number) => void;
  setToothProduct: (arch: Arch, toothNumber: number, product: ProductApiData) => void;
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
  isProductLoading: (arch: Arch, toothNumber: number) => boolean;
  fetchAndAssignProduct: (arch: Arch, toothNumber: number, productId: number) => Promise<void>;
  mandibularToothExtractionMap: Record<number, string>;
  mandibularClaspTeeth: number[];
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string, extractions?: import("../types").ProductExtraction[]) => void;
  selectAllMandibularTeeth: (teeth: number[]) => void;
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
  /** When true, the initial card 0 product is Fixed Restoration AND mandibular teeth with Prep/Pontic exist */
  mandibularHasFixedCard0?: boolean;
  /** When true, the initial card 0 product is a Removable/Ortho AND mandibular teeth have been selected for it */
  mandibularHasRemovablesCard0?: boolean;
  /** Product+arch combos where user chose "Submit, no opposing needed" */
  noOpposingNeeded?: Record<string, boolean>;
  /** When set, renders the opposing product accordion for Removable Restoration products with opposite_extractions */
  opposingProductData?: ProductApiData | null;
  /**
   * Opposing tooth extraction map: toothNumber → extractionCode for the opposing arch.
   * Used to display and collect opposing extraction tooth selections.
   */
  opposingToothExtractionMap?: Record<number, string>;
  /** Called when the user toggles a tooth into/out of an opposing extraction box */
  onOpposingExtractionToggle?: (toothNumber: number, extractionCode: string) => void;
  /** Selects all opposing arch teeth for a given opposing extraction */
  onSelectAllOpposingTeeth?: (teeth: number[]) => void;
  /** Called when the checked teeth (checkbox selection) change */
  onCheckedTeethChange?: (teeth: number[]) => void;
  /** Called whenever implant detail data changes for any tooth (so CaseDesignCenter can include it in the slip snapshot). */
  onImplantDetailChange?: (implantDetailByTooth: Record<number, ImplantDetailData>) => void;
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

function AutoOpenGumShade({ visible, hasValue, onOpen }: { visible: boolean; hasValue: boolean; onOpen: () => void }) {
  const opened = useRef(false);
  useEffect(() => {
    if (visible && !hasValue && !opened.current) {
      opened.current = true;
      onOpen();
    }
    if (!visible || hasValue) {
      opened.current = false;
    }
  }, [visible, hasValue, onOpen]);
  return null;
}

export function MandibularPanel({
  showMandibular,
  setShowMandibular,
  showDetails,
  caseSubmitted = false,
  disabled = false,
  mandibularTeeth,
  handleMandibularToothClick,
  handleMandibularToothDeselect,
  mandibularRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  activeProductIsRemovables = false,
  retentionOptions,
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
  storeFieldValue,
  uncompleteFieldStep,
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
  onToothStatusValidationChange,
  mandibularHasFixedCard0 = false,
  mandibularHasRemovablesCard0 = false,
  removablesImpressionDone = false,
  noOpposingNeeded = {},
  opposingProductData = null,
  opposingToothExtractionMap = {},
  onOpposingExtractionToggle,
  onSelectAllOpposingTeeth,
  onCheckedTeethChange,
  onImplantDetailChange,
}: MandibularPanelProps) {
  const MANDIBULAR_ALL_TEETH = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  const [activeExtractions, setActiveExtractions] = useState<import("../types").ProductExtraction[]>([]);
  const [toothStatusPopoverTooth, setToothStatusPopoverTooth] = useState<number | null>(null);
  const [toothStatusPopoverExtractions, setToothStatusPopoverExtractions] = useState<ProductExtraction[]>([]);
  const [mandibularCheckedTeeth, setMandibularCheckedTeeth] = useState<number[]>([]);
  const handleMandibularCheckedTeethChange = useCallback((teeth: number[]) => {
    setMandibularCheckedTeeth(teeth);
    onCheckedTeethChange?.(teeth);
  }, [onCheckedTeethChange]);
  /** Tracks implant detail completion per tooth so we can block impression modal until complete. */
  const [implantDetailCompleteByTooth, setImplantDetailCompleteByTooth] = useState<Record<number, boolean>>({});
  /** Persists implant detail form data per tooth so it survives accordion collapse/expand. */
  const [implantDetailByTooth, setImplantDetailByToothRaw] = useState<Record<number, ImplantDetailData>>({});
  const setImplantDetailByTooth = useCallback((updater: Record<number, ImplantDetailData> | ((prev: Record<number, ImplantDetailData>) => Record<number, ImplantDetailData>)) => {
    setImplantDetailByToothRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onImplantDetailChange?.(next);
      return next;
    });
  }, [onImplantDetailChange]);
  /** Expand/collapse for initial (card 0) Removables product accordion */
  const [initialRemovablesExpanded, setInitialRemovablesExpanded] = useState(true);
  /** Expand/collapse for the opposing product accordion */
  const [opposingAccordionExpanded, setOpposingAccordionExpanded] = useState(true);
  /** Active extraction code selected in the opposing ToothStatusBoxes */
  const [opposingActiveExtractionCode, setOpposingActiveExtractionCode] = useState<string | null>(null);
  const [opposingActiveExtractions, setOpposingActiveExtractions] = useState<import("../types").ProductExtraction[]>([]);
  /** Tracks which card 0 fixed product group is active (by product ID) for tooth chart sync */
  const [activeFixedGroupProductId, setActiveFixedGroupProductId] = useState<number | null>(null);
  // Auto-collapse card 0 removables accordion when another mandibular product becomes active.
  // Only react to cards that belong to this (mandibular) arch — maxillary card activations
  // should not collapse the mandibular removable accordion.
  const prevActiveCardRef = useRef(activeProductCardId);
  useEffect(() => {
    if (
      activeProductCardId !== 0 &&
      prevActiveCardRef.current !== activeProductCardId &&
      addedProducts.some(ap => ap.id === activeProductCardId && ap.arch === "mandibular")
    ) {
      setInitialRemovablesExpanded(false);
    }
    prevActiveCardRef.current = activeProductCardId;
  }, [activeProductCardId, addedProducts]);
  /** Panel-level gum shade picker state — shown above tooth status boxes */
  const [panelGumShadePicker, setPanelGumShadePicker] = useState<{ toothNumber: number; gumShades: { gum_shade_id: number; name: string; color_code_middle: string; brand: { id: number } }[]; selectedName?: string | null } | null>(null);
  // Auto-select default grade for removable products when product loads
  const autoGradeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MANDIBULAR_ALL_TEETH) {
      const tp = getToothProduct("mandibular", tn);
      if (!tp) continue;
      const key = `mandibular_${tn}`;
      if (autoGradeApplied.current.has(key)) continue;
      const currentVal = getFieldValue("mandibular", tn, "grade");
      if (currentVal) continue;
      const activeGrades = getActiveGrades(tp.grades);
      if (activeGrades.length === 0) {
        // No grades available — auto-complete grade step so the chain progresses to the next field
        autoGradeApplied.current.add(key);
        completeFieldStep("mandibular", tn, "grade", JSON.stringify({ skipped: true }));
      } else {
        const def = getDefaultGrade(tp.grades);
        if (def) {
          autoGradeApplied.current.add(key);
          completeFieldStep("mandibular", tn, "grade", JSON.stringify({ grade_id: def.grade_id, name: def.name }));
        }
      }
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  // Auto-fetch product data for Removable added cards that have no teeth assigned yet.
  // Uses a virtual slot (-ap.id) so each card gets its own isolated product data.
  const removableFetchedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "mandibular")) {
      if (!ap.productId) continue;
      const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
      if (!isRemovableCategory(apCatName)) continue;
      const hasTeeth = MANDIBULAR_ALL_TEETH.some(tn => getToothProductCard("mandibular", tn) === ap.id);
      if (hasTeeth) continue;
      const virtualSlot = -ap.id;
      if (removableFetchedRef.current.has(ap.id)) continue;
      removableFetchedRef.current.add(ap.id);
      fetchAndAssignProduct("mandibular", virtualSlot, ap.productId);
    }
  }, [addedProducts, fetchAndAssignProduct, getToothProductCard]);

  // Auto-fetch product data for Fixed Restoration added cards whose teeth are assigned but product data is missing.
  const fixedFetchedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "mandibular")) {
      if (!ap.productId) continue;
      const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
      if (!isFixedCategory(apCatName)) continue;
      const assignedTeeth = MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === ap.id);
      for (const tn of assignedTeeth) {
        if (getToothProduct("mandibular", tn)) continue;
        const toothKey = ap.id * 1000 + tn;
        if (fixedFetchedRef.current.has(toothKey)) continue;
        fixedFetchedRef.current.add(toothKey);
        fetchAndAssignProduct("mandibular", tn, ap.productId);
      }
    }
  }, [addedProducts, fetchAndAssignProduct, getToothProductCard, getToothProduct]);


  /**
   * When multiple products exist and a specific accordion is active,
   * highlight only the teeth assigned to that card.
   * For card 0 fixed groups, filter by the active fixed group's product ID.
   */
  const activeCardMandibularTeeth = (() => {
    if (activeProductCardId !== 0) {
      // Check if the active added card is a removable product
      const activeAp = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular");
      if (activeAp) {
        const apCatName = (activeAp.product?.subcategory?.category?.name || activeAp.product?.category_name || "").toLowerCase();
        if (isRemovableCategory(apCatName)) {
          // For removable products, always show all selected teeth (don't filter by card ownership)
          return mandibularTeeth;
        }
      }
      // Non-removable added product card active — show only its teeth
      return mandibularTeeth.filter(tn => getToothProductCard("mandibular", tn) === activeProductCardId);
    }
    if (activeFixedGroupProductId !== null) {
      return mandibularTeeth.filter(tn =>
        getToothProductCard("mandibular", tn) === 0 &&
        getToothProduct("mandibular", tn)?.id === activeFixedGroupProductId
      );
    }
    return mandibularTeeth;
  })();

  return (
    <div className={`flex-1 min-w-0 px-0 md:px-16 order-3 lg:order-none relative`}>
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

      {/* Eye toggle + Teeth row */}
      <div className="relative">
        <button
          onClick={() => setShowMandibular(!showMandibular)}
          className="absolute right-0 top-0 z-10 flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
          title={showMandibular ? "Hide Mandibular" : "Show Mandibular"}
        >
          {showMandibular
            ? <Eye size={13.5} className="text-[#b4b0b0]" />
            : <EyeOff size={13.5} className="text-[#b4b0b0]" />
          }
        </button>
        {showMandibular && (!activeProductIsRemovables || activeProductCardId !== 0 || removablesImpressionDone) && (
          <div className="pr-9">
            {activeProductIsRemovables && activeProductCardId !== 0 ? (
              <p className="text-center text-orange-500 font-bold text-sm mb-1">
                Select teeth that will be included in flipper/stayplate
              </p>
            ) : (() => {
              const checkedCount = mandibularCheckedTeeth.length;
              const activeProductName = activeProductCardId !== 0
                ? addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular")?.product?.name || ""
                : getToothProduct("mandibular", mandibularTeeth[0])?.name || "";
              return checkedCount > 0 ? (
                <p className="text-center text-orange-500 font-bold text-sm mb-1">
                  {checkedCount} {checkedCount === 1 ? "TOOTH" : "TEETH"} to include in {activeProductName}
                </p>
              ) : null;
            })()}
            <MandibularTeethSVG
                selectedTeeth={activeCardMandibularTeeth}
                willExtractTeeth={(() => {
                  const isWedCode = (code: string) => {
                    if (code === "WED") return true;
                    // Look up extraction in any source to match by name
                    const sources: Array<{ code: string; name?: string | null }[]> = [];
                    for (const tn of MANDIBULAR_ALL_TEETH) {
                      const p = getToothProduct("mandibular", tn);
                      if (p?.extractions) sources.push(p.extractions);
                    }
                    for (const ap of addedProducts) {
                      if (ap.arch === "mandibular" && (ap.product as any)?.extractions) {
                        sources.push((ap.product as any).extractions);
                      }
                    }
                    if (opposingProductData?.extractions) sources.push(opposingProductData.extractions);
                    for (const exts of sources) {
                      const match = exts.find((e) => e.code === code);
                      if (match) {
                        const n = (match.name ?? "").toLowerCase().trim();
                        if (match.code === "WED" || n === "will extract on delivery") return true;
                      }
                    }
                    return false;
                  };
                  const wedFromMain = Object.entries(mandibularToothExtractionMap)
                    .filter(([, code]) => isWedCode(code))
                    .map(([tn]) => Number(tn));
                  const wedFromOpposing = opposingProductData
                    ? Object.entries(opposingToothExtractionMap)
                        .filter(([, code]) => isWedCode(code))
                        .map(([tn]) => Number(tn))
                    : [];
                  return Array.from(new Set([...wedFromMain, ...wedFromOpposing]));
                })()}
                onToothClick={(toothNumber: number) => {
                  // When a Removable/Ortho card is active (card 0 or added), show tooth status popover.
                  if (activeProductIsRemovables) {
                    if (activeProductCardId !== 0) {
                      // Added removable card
                      const activeCard = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular");
                      if (activeCard) {
                        const cardTeethForExts = MANDIBULAR_ALL_TEETH.filter(tn =>
                          getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === activeCard.id
                        );
                        const repTn = cardTeethForExts.length > 0 ? cardTeethForExts[0] : -activeCard.id;
                        const exts: ProductExtraction[] = getToothProduct("mandibular", repTn)?.extractions ?? (activeCard.product as any)?.extractions ?? [];
                        setToothStatusPopoverTooth(toothNumber);
                        setToothStatusPopoverExtractions(exts);
                      }
                    } else {
                      // Initial card 0 removable/ortho
                      const card0Teeth = MANDIBULAR_ALL_TEETH.filter(tn =>
                        getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
                      );
                      const exts: ProductExtraction[] = card0Teeth.length > 0
                        ? (getToothProduct("mandibular", card0Teeth[0])?.extractions ?? [])
                        : [];
                      setToothStatusPopoverTooth(toothNumber);
                      setToothStatusPopoverExtractions(exts);
                    }
                    return;
                  }
                  // When an added Fixed Restoration card is active, bypass opposingProductData routing
                  // so the user can assign teeth to the new product via the retention popover.
                  const addedFixedActive = activeProductCardId !== 0 && !activeProductIsRemovables;
                  if (opposingProductData && !addedFixedActive) {
                    // Opposing arch: route click to opposing extraction toggle
                    if (opposingActiveExtractionCode) {
                      const opposingExt = opposingProductData.opposite_extractions?.find((e) => e.code === opposingActiveExtractionCode);
                      const maxTeeth = opposingExt?.max_teeth && opposingExt.max_teeth > 0 ? opposingExt.max_teeth : null;
                      const currentCount = Object.values(opposingToothExtractionMap).filter((c) => c === opposingActiveExtractionCode).length;
                      const alreadyAssigned = opposingToothExtractionMap[toothNumber] === opposingActiveExtractionCode;
                      if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                        return;
                      }
                      onOpposingExtractionToggle?.(toothNumber, opposingActiveExtractionCode);
                    } else {
                      // No active opposing extraction — open the tooth status popover
                      // sourced from the opposing product's opposite_extractions.
                      const exts: ProductExtraction[] = (opposingProductData.opposite_extractions ?? []).map((e) => ({
                        id: e.id,
                        extraction_id: e.id,
                        name: e.name,
                        code: e.code,
                        color: e.color ?? null,
                        url: null,
                        is_default: e.is_default ?? "No",
                        is_required: e.is_required ?? "No",
                        is_optional: e.is_optional ?? "No",
                        min_teeth: e.min_teeth ?? null,
                        max_teeth: e.max_teeth ?? null,
                        price: null,
                        is_image_extraction: "No",
                        image_url: null,
                        sequence: 0,
                        status: "Active",
                      }));
                      setToothStatusPopoverTooth(toothNumber);
                      setToothStatusPopoverExtractions(exts);
                    }
                  } else if (activeExtractionCode && !addedFixedActive) {
                    const activeExt = activeExtractions.find((e) => e.code === activeExtractionCode);
                    const maxTeeth = activeExt?.max_teeth && activeExt.max_teeth > 0 ? activeExt.max_teeth : null;
                    const currentCount = Object.values(mandibularToothExtractionMap).filter((c) => c === activeExtractionCode).length;
                    const alreadyAssigned = mandibularToothExtractionMap[toothNumber] === activeExtractionCode;
                    if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                      return;
                    }
                    if (!mandibularTeeth.includes(toothNumber)) {
                      handleMandibularToothClick(toothNumber);
                    }
                    handleToothExtractionToggle("mandibular", toothNumber, activeExtractionCode, activeExtractions);
                  } else {
                    handleMandibularToothClick(toothNumber);
                  }
                }}
                className="w-full"
                retentionTypesByTooth={mandibularRetentionTypes}
                showRetentionPopover={
                  retentionPopoverState.arch === "mandibular" && !activeProductIsRemovables &&
                  (!opposingProductData || activeProductCardId !== 0)
                }
                retentionPopoverTooth={retentionPopoverState.toothNumber}
                onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                onDeselectTooth={handleMandibularToothDeselect}
                retentionOptions={retentionOptions}
                toothExtractionMap={opposingProductData ? opposingToothExtractionMap : mandibularToothExtractionMap}
                hideSelectionIndicators={(!!opposingProductData && activeProductCardId === 0) || activeProductIsRemovables}
                showCheckboxes={false}
                onCheckedTeethChange={handleMandibularCheckedTeethChange}
                claspTeeth={mandibularClaspTeeth}
                getAddonValue={(toothNumber) => getFieldValue("mandibular", toothNumber, "addons")}
                showToothStatusPopover={(activeProductIsRemovables || (!!opposingProductData && activeProductCardId === 0)) && toothStatusPopoverTooth !== null}
                toothStatusPopoverTooth={toothStatusPopoverTooth}
                toothStatusByTooth={opposingProductData ? opposingToothExtractionMap : mandibularToothExtractionMap}
                toothStatusOptions={toothStatusPopoverExtractions
                  .filter(e => e.status === "Active")
                  .sort((a, b) => a.sequence - b.sequence)
                  .map(e => ({ code: e.code, name: e.name, color: e.color ?? "#aaa" }))}
                toothStatusProductName={(() => {
                  if (opposingProductData) return opposingProductData.name ?? null;
                  if (activeProductCardId !== 0) {
                    const activeCard = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular");
                    return activeCard?.product?.name ?? null;
                  }
                  const card0Teeth = MANDIBULAR_ALL_TEETH.filter(tn =>
                    getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
                  );
                  return card0Teeth.length > 0 ? (getToothProduct("mandibular", card0Teeth[0])?.name ?? null) : null;
                })()}
                toothStatusProductImageUrl={(() => {
                  if (opposingProductData) return opposingProductData.image_url ?? null;
                  if (activeProductCardId !== 0) {
                    const activeCard = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular");
                    return activeCard?.product?.image_url ?? null;
                  }
                  const card0Teeth = MANDIBULAR_ALL_TEETH.filter(tn =>
                    getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
                  );
                  return card0Teeth.length > 0 ? (getToothProduct("mandibular", card0Teeth[0])?.image_url ?? null) : null;
                })()}
                onSelectToothStatus={(toothNumber, code) => {
                  // When an added removable card is active, route to that card instead of opposing
                  const addedRemovableActive = activeProductIsRemovables && activeProductCardId !== 0;
                  if (opposingProductData && !addedRemovableActive) {
                    onOpposingExtractionToggle?.(toothNumber, code);
                    setToothStatusPopoverTooth(null);
                    return;
                  }
                  handleMandibularToothClick(toothNumber);
                  handleToothExtractionToggle("mandibular", toothNumber, code, toothStatusPopoverExtractions);
                  setToothStatusPopoverTooth(null);
                }}
                onCloseToothStatusPopover={() => setToothStatusPopoverTooth(null)}
                onRemoveToothStatus={(toothNumber) => {
                  const addedRemovableActive = activeProductIsRemovables && activeProductCardId !== 0;
                  if (opposingProductData && !addedRemovableActive) {
                    const currentCode = opposingToothExtractionMap[toothNumber];
                    if (currentCode) onOpposingExtractionToggle?.(toothNumber, currentCode);
                    setToothStatusPopoverTooth(null);
                    return;
                  }
                  handleMandibularToothClick(toothNumber);
                  setToothStatusPopoverTooth(null);
                }}
              />
            </div>
        )}
      </div>

      {showMandibular && (
        <>
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

          {/* Panel-level Gum Shade Picker — shown above tooth status boxes when triggered from removable accordion */}
          {panelGumShadePicker && (
            <div className="mt-3">
              <GumShadePicker
                selected={panelGumShadePicker.selectedName ?? null}
                onSelect={(shade) => {
                  completeFieldStep("mandibular", panelGumShadePicker.toothNumber, "gum_shade", JSON.stringify({ gum_shade_id: shade.gum_shade_id, brand_id: shade.brand.id, name: shade.name }));
                  setPanelGumShadePicker(null);
                }}
                gumShades={panelGumShadePicker.gumShades}
              />
            </div>
          )}


          {/* Scrollable accordion container — allows multiple product accordions to scroll */}
          <div className="max-h-[60vh] overflow-y-auto scrollbar-blue space-y-2 pr-1">

          {/* Added product accordions — full field workflow, teeth owned by each card */}
          {showDetails && addedProducts
            .filter(ap => ap.arch === "mandibular")
            .map((ap, apIndex) => {
              // For removable restoration products, use all arch teeth so accordion stays visible when teeth are marked missing
              const apCatName = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
              // Each added product is an independent slot — always show its accordion.
              // Newly added Fixed products have no teeth yet and show an empty state until the user assigns teeth.
              const isApRemovables = isRemovableCategory(apCatName);
              const cardTeethSource = isApRemovables ? MANDIBULAR_ALL_TEETH : mandibularTeeth;
              const cardTeeth = cardTeethSource.filter(
                tn => isApRemovables
                  ? getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === ap.id
                  : getToothProductCard("mandibular", tn) === ap.id
              );
              // All teeth directly assigned to this card, sorted ascending
              const assignedTeeth = isApRemovables
                ? MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === ap.id).sort((a, b) => a - b)
                : cardTeeth;
              const cardProduct = cardTeeth.length > 0
                ? getToothProduct("mandibular", cardTeeth[0])
                : null;
              const cardProductName = cardProduct?.name || ap.product?.name || "Untitled Product";
              const cardProductImage = cardProduct?.image_url || ap.product?.image_url || null;
              const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
              const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product?.subcategory?.name || ap.product?.subcategory_name || "";
              // For removable products, show all selected teeth from the chart
              const apDisplayTeeth = isApRemovables
                ? [...mandibularTeeth].sort((a, b) => a - b)
                : cardTeeth;
              // Filter to only show teeth with extraction statuses (MT, WED, WEOD, FR, CTS)
              const HEADER_EXTRACTION_CODES_AP = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
              const apFilteredTeeth = apDisplayTeeth.filter(tn => {
                const code = mandibularToothExtractionMap[tn];
                return code && HEADER_EXTRACTION_CODES_AP.has(code);
              });
              // Show filtered teeth if extraction codes exist, otherwise show all tooth numbers (match card 0 behavior)
              const apFinalTeeth = apFilteredTeeth.length > 0 ? apFilteredTeeth : cardTeeth;
              const cardToothDisplay = apFinalTeeth.length > 0 ? `#${apFinalTeeth.join(",")}` : "";
              const isActive = activeProductCardId === ap.id;
              // For removable cards with no teeth yet, use a negative virtual slot (-ap.id) where product data was pre-fetched
              const apRepTn = cardTeeth.length > 0 ? cardTeeth[0] : (isApRemovables ? -ap.id : 0);
              const apProductKey = `mandibular_prep_${apRepTn}`;
              const hasRushedAp = rushedProducts[apProductKey];
              const apStageVal = cardTeeth.length > 0 ? (selectedStages[apProductKey] || getFieldValue("mandibular", apRepTn, "stage")) : "";

              // For removable products, compute extractions for header display
              // Use apRepTn (the representative slot where product data was loaded) to get extractions
              const apExtractions = isApRemovables
                ? (getToothProduct("mandibular", apRepTn)?.extractions ?? [])
                : [];

              const apImpressionDone = apRepTn !== 0 && (
                isFieldCompleted("mandibular", apRepTn, "impression") ||
                isFieldCompleted("mandibular", apRepTn, "fixed_impression")
              );

              return (
                <div key={ap.id} className="relative mt-2">
                <div
                  className={`rounded-lg bg-white overflow-hidden ${hasRushedAp ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}
                >
                  {isApRemovables ? (
                    // Removable restoration: product name top, image+tooth-status-boxes in same row
                    <div
                      className={`w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative ${hasRushedAp ? "bg-[#FCE4E4]" : "bg-white"}`}
                      onClick={() => {
                        toggleAddedProductExpanded(ap.id);
                        setActiveProductCardId(isActive ? 0 : ap.id);
                        setActiveFixedGroupProductId(null);
                        setActiveExtractionCode(null);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Chevron top-right */}
                      <div className="absolute top-3 right-2 z-10">
                        <ChevronDown
                          size={21.6}
                          className={`text-black transition-transform ${ap.expanded ? "rotate-180" : ""}`}
                        />
                      </div>
                      {/* Image left + product name, status boxes & badges right */}
                      <div className="flex items-stretch gap-[10px] px-[8px] py-[14px]" onClick={(e) => e.stopPropagation()}>
                        <ProductImagePreview
                          imageUrl={cardProductImage}
                          altText={cardProductName}
                          containerClassName="w-[64px] rounded-[6px] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]"
                          imgClassName="w-[61.58px] h-[28.79px] object-contain"
                          fallback={
                            <div className="w-[61.58px] h-[28.79px] flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">No img</span>
                            </div>
                          }
                        />
                        <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
                          {/* Breadcrumb badges: category + subcategory at top */}
                          <div className="flex items-center gap-[4px] flex-wrap">
                            {cardCategoryName && <AccordionBadge>{cardCategoryName}</AccordionBadge>}
                            {cardSubcategoryName && <AccordionBadge>{cardSubcategoryName}</AccordionBadge>}
                          </div>
                          {/* Title + tooth numbers in green-bordered box */}
                          <div className="flex flex-col gap-[5px] border border-[#34C759] rounded-[7px] p-[10px] mr-8">
                            <p className="font-[Inter] text-[20px] font-bold leading-[20px] tracking-[-0.02em] text-black">
                              {cardProductName} {assignedTeeth.length} {assignedTeeth.length === 1 ? "tooth" : "teeth"} to replace
                              {hasRushedAp && <RushIcon className="inline w-[14px] h-[14px] ml-1" />}
                            </p>
                            {assignedTeeth.length > 0 && (
                              <p className="font-[Inter] text-[20px] font-normal leading-[20px] tracking-[-0.02em] text-black">
                                #{assignedTeeth.join(",")}
                              </p>
                            )}
                          </div>
                          {/* Tooth status boxes */}
                          {apExtractions.length > 0 && (
                            <ToothStatusBoxes
                              extractions={apExtractions}
                              selectedTeeth={mandibularTeeth}
                              allArchTeeth={MANDIBULAR_ALL_TEETH}
                              toothExtractionMap={mandibularToothExtractionMap}
                              claspTeeth={mandibularClaspTeeth}
                              activeExtractionCode={activeExtractionCode}
                              onActiveExtractionChange={(code, exts) => { setActiveExtractionCode(code); if (exts) setActiveExtractions(exts); }}
                              onToothExtractionToggle={(tn, code, extractions) => handleToothExtractionToggle("mandibular", tn, code, extractions)}
                              onSelectAllTeeth={selectAllMandibularTeeth}
                              onRequiredValidationChange={onToothStatusValidationChange}
                              isRemovable={true}
                              submitted={caseSubmitted}
                              hideDefaultBox={true}
                            />
                          )}
                          {/* Est days + delete button on same line */}
                          <div className="flex items-center gap-[6px]">
                            <EstDaysLabel rushed={hasRushedAp} text={hasRushedAp ? "5 work days after submission" : "10 work days after submission"} />
                            {!caseSubmitted && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                                className="hover:text-red-500 transition-colors"
                                title="Remove product"
                              >
                                <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Non-removable: original horizontal layout
                  <button
                    type="button"
                    onClick={() => {
                      toggleAddedProductExpanded(ap.id);
                      setActiveProductCardId(isActive ? 0 : ap.id);
                      setActiveFixedGroupProductId(null);
                      setActiveExtractionCode(null);
                    }}
                    className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${hasRushedAp ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : "bg-white hover:bg-gray-50"}`}
                  >
                    <ProductImagePreview
                      imageUrl={cardProductImage}
                      altText={cardProductName}
                    />
                    <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                      <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black flex items-center gap-1 truncate">
                        {cardProductName}
                        {cardToothDisplay && (
                          <span className="font-normal text-[13px] sm:text-base text-black">{cardToothDisplay}</span>
                        )}
                        {hasRushedAp && <RushIcon className="w-[20px] h-[20px] flex-shrink-0" />}
                      </p>
                      <div className="flex items-center gap-[5px] flex-wrap">
                        {cardSubcategoryName && (
                          <AccordionBadge>{cardSubcategoryName}</AccordionBadge>
                        )}
                        {!isSingleStageNoStages(cardProduct) && (() => {
                          const apStageKey = isFixedCategory(cardCategoryName)
                            ? `mandibular_fixed_${apRepTn}`
                            : `mandibular_prep_${apRepTn}`;
                          const apStageVal = apRepTn > 0 ? (selectedStages[apStageKey] || getFieldValue("mandibular", apRepTn, isFixedCategory(cardCategoryName) ? "fixed_stage" : "stage")) : "";
                          return apStageVal ? <AccordionBadge>{apStageVal}</AccordionBadge> : null;
                        })()}
                        {(() => {
                          const apEstDays = cardProduct
                            ? cardProduct.min_days_to_process && cardProduct.max_days_to_process
                              ? `${cardProduct.min_days_to_process}-${cardProduct.max_days_to_process} work days after submission`
                              : cardProduct.min_days_to_process
                                ? `${cardProduct.min_days_to_process} work days after submission`
                                : "10 work days after submission"
                            : "10 work days after submission";
                          return <EstDaysLabel rushed={hasRushedAp} text={hasRushedAp ? "5 work days after submission" : apEstDays} />;
                        })()}
                        {!caseSubmitted && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                          className="ml-1 hover:text-red-500 transition-colors"
                          title="Remove product"
                        >
                          <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                        </button>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      size={21.6}
                      className={`text-black flex-shrink-0 transition-transform ${ap.expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  )}

                  {ap.expanded && (
                    <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
                      {cardTeeth.length === 0 ? (
                        <p className="text-xs text-[#b4b0b0] text-center py-4">
                          Select teeth from the chart above to assign them to this product.
                        </p>
                      ) : (() => {
                        const isCardRemovables = isApRemovables || isRemovableCategory(cardCategoryName);
                        // For removable cards with no teeth yet, use the virtual slot (-ap.id) where product data was pre-fetched
                        const repTn = cardTeeth.length > 0 ? cardTeeth[0] : (isCardRemovables ? -ap.id : 0);
                        const toothProduct = getToothProduct("mandibular", repTn);
                        const categoryName = toothProduct?.subcategory?.category?.name?.toLowerCase() || "";
                        const isFixed = isFixedCategory(categoryName);
                        const isRemovables = isCardRemovables || isRemovableCategory(categoryName);
                        const fixedChain = isFixed ? getFixedFieldChain(toothProduct?.advance_fields) : undefined;
                        const advFields = toothProduct?.advance_fields;
                        const isF = (step: string) => isFieldVisible("mandibular", repTn, step as any, fixedChain);
                        const isFComplete = (step: string) => isFieldCompleted("mandibular", repTn, step as any);
                        const fVal = (step: string) => getFieldValue("mandibular", repTn, step as any);

                        if (isCardRemovables) {
                          const productKey = `mandibular_prep_${repTn}`;
                          return (
                            <>
                            {!isSingleStageNoStages(toothProduct) && (
                            <AutoOpenStageIfEmpty
                              productId={productKey}
                              arch="mandibular"
                              toothNumber={repTn}
                              isExpanded={ap.expanded}
                              isStageVisible={hasAdvanceField("stage", advFields)}
                              isStageEmpty={!isFComplete("stage") && !(selectedStages[productKey])}
                              onOpenStage={handleOpenStageModal}
                              caseSubmitted={caseSubmitted}
                            />
                            )}
                            <AutoOpenImpressionIfEmpty
                              isExpanded={ap.expanded}
                              isImpressionVisible={isF("impression")}
                              isImpressionEmpty={!isFComplete("impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="mandibular"
                              productId={productKey}
                              toothNumber={repTn}
                              caseSubmitted={caseSubmitted}
                            />
                            <div className="rounded-lg p-3 space-y-3">
                              {/* Row 1: Grade / Stage */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isF("grade") && (() => {
                                  const productGrades = getActiveGrades(toothProduct?.grades);
                                  if (productGrades.length === 0) return null;
                                  const gradeRaw = fVal("grade") || "";
                                  let gradeVal = gradeRaw;
                                  try { const p = JSON.parse(gradeRaw); gradeVal = p.name ?? gradeRaw; } catch {}
                                  const isGradeComplete = isFComplete("grade") || !!(gradeVal && gradeVal.trim());
                                  const showGradeGreen = isGradeComplete && !caseSubmitted;
                                  return (
                                    <fieldset
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center transition-colors ${showGradeGreen ? "border-[#34a853]" : isGradeComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGradeGreen ? "text-[#34a853]" : isGradeComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Grade</legend>
                                      <GradeHoverSelector
                                        grades={productGrades}
                                        currentGradeName={gradeVal}
                                        disabled={caseSubmitted}
                                        onSelect={(g) => completeFieldStep("mandibular", repTn, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))}
                                      />
                                      {showGradeGreen && <Check size={16} className="text-[#34a853] ml-1 flex-shrink-0" />}
                                    </fieldset>
                                  );
                                })()}
                                {isF("stage") && !isSingleStageNoStages(toothProduct) && (() => {
                                  const stageVal = fVal("stage") || selectedStages[productKey] || "";
                                  const isStageComplete = isFComplete("stage") || !!(stageVal && stageVal.trim());
                                  const showGreen = isStageComplete && !caseSubmitted;
                                  return (
                                    <fieldset
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center pointer-events-auto cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                      onClick={() => !caseSubmitted && handleOpenStageModal(productKey, "mandibular", repTn)}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                      {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                    </fieldset>
                                  );
                                })()}
                              </div>

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
                                    <AutoOpenGumShade
                                      visible={isF("gum_shade")}
                                      hasValue={isFComplete("gum_shade")}
                                      onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [] })}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {isF("teeth_shade") && isFComplete("teeth_shade") && (
                                      <fieldset
                                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                        onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", shadeProductId)}
                                      >
                                        <legend className={`text-sm px-1 leading-none ${isFComplete("teeth_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("teeth_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Teeth shade</legend>
                                        <div className="flex items-center gap-2 w-full">
                                          <span className="text-[14px] sm:text-lg text-[#000000]">{(() => { const r = fVal("teeth_shade"); try { return JSON.parse(r).name ?? r; } catch { return r; } })()}</span>
                                          {isFComplete("teeth_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
                                        </div>
                                      </fieldset>
                                      )}
                                      {isF("gum_shade") && isFComplete("teeth_shade") && isFComplete("gum_shade") && (
                                      <fieldset
                                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                        onClick={() => {
                                          if (!caseSubmitted) {
                                            const currentGumShade = fVal("gum_shade");
                                            let currentName: string | null = null;
                                            if (currentGumShade) { try { currentName = JSON.parse(currentGumShade).name ?? null; } catch {} }
                                            setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [], selectedName: currentName });
                                          }
                                        }}
                                      >
                                        <legend className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("gum_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Gum Shade</legend>
                                        <div className="flex items-center gap-2 w-full">
                                          {(() => {
                                            const raw = fVal("gum_shade");
                                            let displayName = raw;
                                            let color: string | null = null;
                                            try { const p = JSON.parse(raw); displayName = p.name ?? raw; } catch {}
                                            const matchedShade = toothProduct?.gum_shades?.find((s) => s.name === displayName);
                                            if (matchedShade) color = matchedShade.color_code_middle;
                                            return (
                                              <>
                                                <span className="text-[14px] sm:text-lg text-[#000000] truncate">{displayName}</span>
                                                {color && (
                                                  <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 ml-auto">
                                                    <rect width="28.0391" height="28.0391" rx="6" fill={color} />
                                                  </svg>
                                                )}
                                              </>
                                            );
                                          })()}
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

                              {/* Row 4: Add ons */}
                              {isF("addons") && (() => {
                                const addonsVal = fVal("addons") || "";
                                const addonItems = addonsVal ? addonsVal.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                                const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                                const onClickAddon = () => handleOpenAddOnsModal("mandibular", toothProduct?.id?.toString() || productKey, repTn);
                                if (addonItems.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-2">
                                    {addonItems.map((item: string, idx: number) => (
                                      <fieldset key={idx} className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${borderClass}`} onClick={onClickAddon}>
                                        <legend className={`text-sm px-1 leading-none ${legendClass}`}>Add on</legend>
                                        <span className="text-[14px] sm:text-lg text-[#000000] truncate">{item}</span>
                                      </fieldset>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            </>
                          );
                        }

                        // Fixed restoration added product — use same FixedRestorationFields as Card 0
                        const apFirstTn = cardTeeth[0];
                        const apToothProduct = getToothProduct("mandibular", apFirstTn);
                        const apFixedChain = getFixedFieldChain(apToothProduct?.advance_fields);
                        const apRetentionTypes = cardTeeth.flatMap(tn => mandibularRetentionTypes[tn] || []);
                        const apIsFixed = (step: FieldStep) =>
                          isFieldVisible("mandibular", apFirstTn, step, apFixedChain);
                        const apFixedShadeProductId = `fixed_${apFirstTn}`;
                        const apFixedShadeIncomplete =
                          shadeSelectionState.productId === apFixedShadeProductId &&
                          shadeSelectionState.arch === "mandibular" &&
                          !(
                            getSelectedShade(apFixedShadeProductId, "mandibular", "stump_shade") &&
                            getSelectedShade(apFixedShadeProductId, "mandibular", "tooth_shade")
                          );
                        const apGroupStageProductIdFixed = `mandibular_fixed_${apFirstTn}`;

                        return (
                          <>
                            {!isSingleStageNoStages(apToothProduct) && (
                            <AutoOpenStageIfEmpty
                              productId={apGroupStageProductIdFixed}
                              arch="mandibular"
                              toothNumber={apFirstTn}
                              isExpanded={ap.expanded}
                              isStageVisible={!apFixedShadeIncomplete && apIsFixed("fixed_stage")}
                              isStageEmpty={!isFieldCompleted("mandibular", apFirstTn, "fixed_stage") && !(selectedStages[apGroupStageProductIdFixed])}
                              onOpenStage={handleOpenStageModal}
                              caseSubmitted={caseSubmitted}
                            />
                            )}
                            <AutoOpenShadeGuideIfEmpty
                              arch="mandibular"
                              productId={apFixedShadeProductId}
                              isExpanded={ap.expanded}
                              isShadeSectionVisible={apIsFixed("fixed_stump_shade") || apIsFixed("fixed_shade_trio")}
                              stumpShadeEmpty={!getSelectedShade(apFixedShadeProductId, "mandibular", "stump_shade")}
                              toothShadeEmpty={!getSelectedShade(apFixedShadeProductId, "mandibular", "tooth_shade")}
                              setShadeSelectionState={setShadeSelectionState}
                              caseSubmitted={caseSubmitted}
                            />
                            <AutoOpenImpressionIfEmpty
                              isExpanded={ap.expanded}
                              isImpressionVisible={!apFixedShadeIncomplete && apIsFixed("fixed_impression") && !(cardTeeth.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant")) && implantDetailCompleteByTooth[apFirstTn] !== true)}
                              isImpressionEmpty={!isFieldCompleted("mandibular", apFirstTn, "fixed_impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="mandibular"
                              productId={apToothProduct?.id?.toString() || `fixed_${apFirstTn}`}
                              toothNumber={apFirstTn}
                              caseSubmitted={caseSubmitted}
                            />
                            <FixedRestorationFields
                              arch="mandibular"
                              firstToothNumber={apFirstTn}
                              groupStageToothNumber={apFirstTn}
                              groupStageProductIdFixed={apGroupStageProductIdFixed}
                              selectedProduct={apToothProduct}
                              toothNumbers={cardTeeth}
                              retentionTypes={apRetentionTypes}
                              caseSubmitted={caseSubmitted}
                              fixedShadeIncomplete={apFixedShadeIncomplete}
                              selectedShadeGuide={selectedShadeGuide}
                              selectedStages={selectedStages}
                              retentionTypesMap={mandibularRetentionTypes}
                              implantDetailCompleteByTooth={implantDetailCompleteByTooth}
                              setImplantDetailCompleteByTooth={setImplantDetailCompleteByTooth}
                              implantDetailByTooth={implantDetailByTooth}
                              setImplantDetailByTooth={setImplantDetailByTooth}
                              isFieldVisible={isFieldVisible}
                              isFieldCompleted={isFieldCompleted}
                              getFieldValue={getFieldValue}
                              completeFieldStep={completeFieldStep}
                              storeFieldValue={storeFieldValue}
                              uncompleteFieldStep={uncompleteFieldStep}
                              isFixed={apIsFixed as (step: string) => boolean}
                              getSelectedShade={getSelectedShade as (productId: string, arch: string, shadeType: string) => any}
                              handleOpenStageModal={handleOpenStageModal}
                              handleShadeFieldClick={handleShadeFieldClick}
                              handleOpenImpressionModal={handleOpenImpressionModal}
                              handleOpenAddOnsModal={handleOpenAddOnsModal}
                              getImpressionDisplayText={getImpressionDisplayText as (productId: string, arch: string) => string}
                            />
                          </>
                        );
                      })()}

                      <ScrollToBottom />
                    </div>
                  )}
                </div>
                </div>
              );
            })
          }
          {/* Progressive field cards for Prep/Pontic teeth — grouped by product (card 0 only) */}
          {showDetails && mandibularHasFixedCard0 && (() => {
                // Get all mandibular teeth with retention types
                const allTeeth = Object.entries(mandibularRetentionTypes)
                  .filter(([toothNum, types]) =>
                    types.some((t) => t === "Prep" || t === "Pontic" || t === "Implant") &&
                    getToothProductCard("mandibular", Number(toothNum)) === 0
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
                  if (isRemovableCategory(categoryName)) return null;
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
                  const HEADER_EXTRACTION_CODES = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
                  const headerTeeth = toothNumbers.filter(tn => {
                    const code = mandibularToothExtractionMap[tn];
                    return code && HEADER_EXTRACTION_CODES.has(code);
                  });
                  const displayTeeth = headerTeeth.length > 0 ? headerTeeth : toothNumbers;
                  const toothNumbersDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";
                  const retentionTypes = [...new Set(teeth.map((t) => t.retentionType))];
                  const hasRushed = toothNumbers.some((n) => rushedProducts[`mandibular_prep_${n}`] || rushedProducts[`mandibular_fixed_${n}`]);

                  // Show skeleton while product is loading
                  const isLoading = !selectedProduct && teeth.some((t) => isProductLoading("mandibular", t.toothNumber));
                  if (isLoading) {
                    return (
                      <div key={`loading-group-${groupKey}`} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-4">
                        <div className="w-full flex items-center py-[14px] px-2 gap-[10px] rounded-t-[5.4px]">
                          <div className="w-[50px] h-[50px] rounded-md flex-shrink-0 animate-pulse bg-gray-200" />
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
                  // Use groupStageToothNumber so all field progress keys are consistent
                  const isFixed = (step: FieldStep) =>
                    isFieldVisible("mandibular", groupStageToothNumber, step, fixedChain);

                  // Gate: hide product fields while shade guide is open and incomplete for this product
                  const _mandFixedShadeProductId = `fixed_${groupStageToothNumber}`;
                  const fixedShadeIncomplete =
                    shadeSelectionState.productId === _mandFixedShadeProductId &&
                    shadeSelectionState.arch === "mandibular" &&
                    !(
                      getSelectedShade(_mandFixedShadeProductId, "mandibular", "stump_shade") &&
                      getSelectedShade(_mandFixedShadeProductId, "mandibular", "tooth_shade")
                    );

                  // ---- Product Accordion (progressive step-by-step) ----
                  const showFixedActionsMand = isFixedCategory(categoryName) && isFieldCompleted("mandibular", groupStageToothNumber, "fixed_impression") && !caseSubmitted;
                  const showPrepActionsMand = !isFixedCategory(categoryName) && isFieldCompleted("mandibular", firstToothNumber, "addons") && !caseSubmitted;
                  const showActionsMand = showFixedActionsMand || showPrepActionsMand;

                  return (
                    <div key={`prep-pontic-group-${groupKey}`} className="relative mt-4">
                    <div
                      className={`rounded-lg bg-white overflow-hidden ${
                        hasRushed
                          ? "border-2 border-[#CF0202]"
                          : "border border-[#d9d9d9]"
                      }`}
                    >
                      {/* Accordion header */}
                      <button
                        type="button"
                        onClick={() => {
                          togglePrepPonticExpanded(firstToothNumber);
                          setActiveProductCardId(0);
                          setActiveFixedGroupProductId(selectedProduct?.id ?? null);
                        }}
                        className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
                          hasRushed
                            ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <ProductImagePreview
                          imageUrl={selectedProduct?.image_url ? productImage : null}
                          altText={productName}
                        />
                        <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                          <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black flex items-center gap-1 truncate">
                            {productName}
                            {toothNumbersDisplay && (
                              <span className="font-normal text-[13px] sm:text-base text-black">{toothNumbersDisplay}</span>
                            )}
                            {hasRushed && (
                              <RushIcon className="w-[20px] h-[20px] flex-shrink-0" />
                            )}
                          </p>
                          <div className="flex items-center gap-[5px] flex-wrap">
                            {subcategoryName && (
                              <AccordionBadge>{subcategoryName}</AccordionBadge>
                            )}
                            {!isSingleStageNoStages(selectedProduct) && (selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]) && (
                                <AccordionBadge>
                                  {selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]}
                                </AccordionBadge>
                            )}
                            <EstDaysLabel rushed={hasRushed} text={hasRushed ? "5 work days after submission" : estDays} />
                            {!caseSubmitted && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const teethToClear = MANDIBULAR_ALL_TEETH.filter(
                                    (tn) => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
                                  );
                                  teethToClear.forEach((tn) => {
                                    clearToothProgress("mandibular", tn);
                                    handleMandibularToothDeselect(tn);
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const teethToClear = MANDIBULAR_ALL_TEETH.filter(
                                      (tn) => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
                                    );
                                    teethToClear.forEach((tn) => {
                                      clearToothProgress("mandibular", tn);
                                      handleMandibularToothDeselect(tn);
                                    });
                                  }
                                }}
                                className="inline-flex items-center justify-center flex-shrink-0 cursor-pointer hover:text-red-500 transition-colors"
                                title="Remove product"
                              >
                                <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                              </span>
                            )}
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
                      <div className={`border-t border-[#d9d9d9] p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
                        {!isSingleStageNoStages(selectedProduct) && (
                        <AutoOpenStageIfEmpty
                          productId={isFixedCategory(categoryName) ? groupStageProductIdFixed : `mandibular_prep_${firstToothNumber}`}
                          arch="mandibular"
                          toothNumber={isFixedCategory(categoryName) ? groupStageToothNumber : firstToothNumber}
                          isExpanded={true}
                          isStageVisible={isFixedCategory(categoryName) ? isFixed("fixed_stage") : isFieldVisible("mandibular", firstToothNumber, "stage")}
                          isStageEmpty={isFixedCategory(categoryName) ? !(selectedStages[groupStageProductIdFixed] || getFieldValue("mandibular", groupStageToothNumber, "fixed_stage")) : !(selectedStages[`mandibular_prep_${firstToothNumber}`] || getFieldValue("mandibular", firstToothNumber, "stage"))}
                          onOpenStage={handleOpenStageModal}
                          caseSubmitted={caseSubmitted}
                        />
                        )}
                        {isFixedCategory(categoryName) && (
                          <>
                            <AutoOpenShadeGuideIfEmpty
                              arch="mandibular"
                              productId={`fixed_${groupStageToothNumber}`}
                              isExpanded={true}
                              isShadeSectionVisible={isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")}
                              stumpShadeEmpty={!getSelectedShade(`fixed_${groupStageToothNumber}`, "mandibular", "stump_shade")}
                              toothShadeEmpty={!getSelectedShade(`fixed_${groupStageToothNumber}`, "mandibular", "tooth_shade")}
                              setShadeSelectionState={setShadeSelectionState}
                              caseSubmitted={caseSubmitted}
                            />
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isPrepPonticExpanded(firstToothNumber)}
                              isImpressionVisible={!fixedShadeIncomplete && isFixed("fixed_impression") && !(toothNumbers.some((n) => (mandibularRetentionTypes[n] || []).includes("Implant")) && implantDetailCompleteByTooth[groupStageToothNumber] !== true)}
                              isImpressionEmpty={!isFieldCompleted("mandibular", groupStageToothNumber, "fixed_impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="mandibular"
                              productId={selectedProduct?.id?.toString() || `fixed_${groupStageToothNumber}`}
                              toothNumber={groupStageToothNumber}
                              caseSubmitted={caseSubmitted}
                            />
                          </>
                        )}

                        {isFixedCategory(categoryName) ? (
                          <FixedRestorationFields
                            arch="mandibular"
                            firstToothNumber={groupStageToothNumber}
                            groupStageToothNumber={groupStageToothNumber}
                            groupStageProductIdFixed={groupStageProductIdFixed}
                            selectedProduct={selectedProduct}
                            toothNumbers={toothNumbers}
                            retentionTypes={retentionTypes}
                            caseSubmitted={caseSubmitted}
                            fixedShadeIncomplete={fixedShadeIncomplete}
                            selectedShadeGuide={selectedShadeGuide}
                            selectedStages={selectedStages}
                            retentionTypesMap={mandibularRetentionTypes}
                            implantDetailCompleteByTooth={implantDetailCompleteByTooth}
                            setImplantDetailCompleteByTooth={setImplantDetailCompleteByTooth}
                            implantDetailByTooth={implantDetailByTooth}
                            setImplantDetailByTooth={setImplantDetailByTooth}
                            isFieldVisible={isFieldVisible}
                            isFieldCompleted={isFieldCompleted}
                            getFieldValue={getFieldValue}
                            completeFieldStep={completeFieldStep}
                            storeFieldValue={storeFieldValue}
                            uncompleteFieldStep={uncompleteFieldStep}
                            isFixed={isFixed as (step: string) => boolean}
                            getSelectedShade={getSelectedShade as (productId: string, arch: string, shadeType: string) => any}
                            handleOpenStageModal={handleOpenStageModal}
                            handleShadeFieldClick={handleShadeFieldClick}
                            handleOpenImpressionModal={handleOpenImpressionModal}
                            handleOpenAddOnsModal={handleOpenAddOnsModal}
                            getImpressionDisplayText={getImpressionDisplayText as (productId: string, arch: string) => string}
                          />
                        ) : (
                          <RemovableRestorationFields
                            arch="mandibular"
                            firstToothNumber={firstToothNumber}
                            selectedProduct={selectedProduct}
                            toothNumbers={toothNumbers}
                            caseSubmitted={caseSubmitted}
                            retentionTypesMap={mandibularRetentionTypes}
                            implantDetailCompleteByTooth={implantDetailCompleteByTooth}
                            setImplantDetailCompleteByTooth={setImplantDetailCompleteByTooth}
                            isExpanded={isPrepPonticExpanded(firstToothNumber)}
                            isFieldVisible={isFieldVisible}
                            isFieldCompleted={isFieldCompleted}
                            getFieldValue={getFieldValue}
                            completeFieldStep={completeFieldStep}
                            storeFieldValue={storeFieldValue}
                            uncompleteFieldStep={uncompleteFieldStep}
                            handleOpenStageModal={handleOpenStageModal}
                            handleShadeFieldClick={handleShadeFieldClick}
                            handleOpenImpressionModal={handleOpenImpressionModal}
                            handleOpenAddOnsModal={handleOpenAddOnsModal}
                            setPanelGumShadePicker={setPanelGumShadePicker}
                            noOpposingNeeded={noOpposingNeeded}
                          />
                        )}
                        <ScrollToBottom />
                      </div>
                      )}
                    </div>
                    </div>
                  );
                });
              })()}

          {/* Initial Removables product accordion — show fields when card 0 product is Removable/Ortho AND teeth are assigned to it */}
          {showDetails && mandibularHasRemovablesCard0 && (() => {
            // Use all arch teeth (not just selected) so the accordion stays visible when all teeth are marked missing
            const cardTeeth = MANDIBULAR_ALL_TEETH.filter(tn => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0);
            if (cardTeeth.length === 0) return null;
            const cardProduct = getToothProduct("mandibular", cardTeeth[0]);
            // For removable products, show only teeth with extraction statuses (MT, WED, WEOD, FR, CTS)
            const HEADER_EXTRACTION_CODES_REM = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
            const displayTeeth = [...mandibularTeeth].sort((a, b) => a - b).filter(tn => {
              const code = mandibularToothExtractionMap[tn];
              return code && HEADER_EXTRACTION_CODES_REM.has(code);
            });
            // Resolve label + image from product variations based on teeth_space (count of teeth)
            const variationDisplay = resolveVariationDisplay(cardProduct, displayTeeth.length);
            const cardProductName = variationDisplay.name;
            const cardProductImage = variationDisplay.imageUrl;
            const hasVariationMatch = variationDisplay.matched;
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
            const removablesProductKey = `mandibular_prep_${cardTeeth[0]}`;
            const hasRushedRemovables = rushedProducts[removablesProductKey];

            // Compute extractions for this removable product
            const cardExtractionsSeen = new Set<number>();
            const cardExtractions = cardTeeth.flatMap((tn) => {
              const product = getToothProduct("mandibular", tn);
              return product?.extractions ?? [];
            }).filter((e) => {
              if (cardExtractionsSeen.has(e.extraction_id)) return false;
              cardExtractionsSeen.add(e.extraction_id);
              return true;
            });

            return (
              <div key="initial-removables-mandibular" className="relative mt-4">
              <div className={`rounded-lg bg-white overflow-hidden ${hasRushedRemovables ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}>
                <div
                  className={`w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative ${hasRushedRemovables ? "bg-[#FCE4E4]" : "bg-white"}`}
                  onClick={() => {
                    setInitialRemovablesExpanded((e) => !e);
                    if (!initialRemovablesExpanded) setActiveProductCardId(0);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Chevron top-right */}
                  <div className="absolute top-3 right-2 z-10">
                    <ChevronDown
                      size={21.6}
                      className={`text-black transition-transform ${initialRemovablesExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                  {/* Image left + product name, status boxes & badges right */}
                  <div className="flex items-stretch gap-[10px] px-[8px] py-[14px]" onClick={(e) => e.stopPropagation()}>
                    <ProductImagePreview
                      imageUrl={cardProductImage}
                      altText={cardProductName}
                      containerClassName="w-[64px] rounded-[6px] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]"
                      imgClassName="w-[61.58px] h-[28.79px] object-contain"
                      fallback={
                        <div className="w-[61.58px] h-[28.79px] flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">No img</span>
                        </div>
                      }
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-[9.94px]">
                      {/* Show all header content only after user picks a tooth status from the popover, or case submitted — initially blank */}
                      {(cardTeeth.some(tn => mandibularToothExtractionMap[tn]) || caseSubmitted) && (
                        <>
                          {/* Category badges above green box */}
                          <div className="flex items-center gap-[4px] flex-wrap">
                            {cardProduct?.subcategory?.category?.name && (
                              <AccordionBadge>{cardProduct.subcategory.category.name}</AccordionBadge>
                            )}
                            {cardProduct?.subcategory?.name && (
                              <AccordionBadge>{cardProduct.subcategory.name}</AccordionBadge>
                            )}
                          </div>
                          {/* Title + tooth numbers in green-bordered box */}
                          <div className="flex flex-col gap-[5px] border border-[#34C759] rounded-[7px] p-[10px] mr-8">
                            <p className="font-[Inter] text-[20px] font-bold leading-[20px] tracking-[-0.02em] text-black">
                              {hasVariationMatch
                                ? `${cardProductName} to replace`
                                : `${cardProductName} ${displayTeeth.length} ${displayTeeth.length === 1 ? "tooth" : "teeth"} to replace`}
                              {hasRushedRemovables && <RushIcon className="inline w-[14px] h-[14px] ml-1" />}
                            </p>
                            <p className="font-[Inter] text-[20px] font-normal leading-[20px] tracking-[-0.02em] text-black">
                              {cardToothDisplay}
                            </p>
                          </div>
                          {cardExtractions.length > 0 && (
                            <ToothStatusBoxes
                              extractions={cardExtractions}
                              selectedTeeth={mandibularTeeth}
                              allArchTeeth={MANDIBULAR_ALL_TEETH}
                              toothExtractionMap={mandibularToothExtractionMap}
                              claspTeeth={mandibularClaspTeeth}
                              activeExtractionCode={activeExtractionCode}
                              onActiveExtractionChange={(code, exts) => { setActiveExtractionCode(code); if (exts) setActiveExtractions(exts); }}
                              onToothExtractionToggle={(tn, code, extractions) => handleToothExtractionToggle("mandibular", tn, code, extractions)}
                              onSelectAllTeeth={selectAllMandibularTeeth}
                              onRequiredValidationChange={onToothStatusValidationChange}
                              isRemovable={true}
                              submitted={caseSubmitted}
                              hideDefaultBox={true}
                            />
                          )}
                          {/* Est days + stage badge + trash below status boxes */}
                          <div className="flex items-center gap-[4.97px] flex-wrap">
                            {stageVal && !isSingleStageNoStages(cardProduct) && (
                              <AccordionBadge>{stageVal}</AccordionBadge>
                            )}
                            <EstDaysLabel rushed={hasRushedRemovables} text={hasRushedRemovables ? "5 work days after submission" : estDays} />
                            {!caseSubmitted && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const teethToClear = MANDIBULAR_ALL_TEETH.filter(
                                    (tn) => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
                                  );
                                  teethToClear.forEach((tn) => {
                                    clearToothProgress("mandibular", tn);
                                    handleMandibularToothDeselect(tn);
                                  });
                                  setInitialRemovablesExpanded(false);
                                  setActiveProductCardId(0);
                                }}
                                className="hover:text-red-500 transition-colors flex-shrink-0"
                                title="Remove product"
                              >
                                <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue${initialRemovablesExpanded ? "" : " hidden"}${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
                    {(() => {
                      const repTn = cardTeeth[0];
                      const toothProduct = getToothProduct("mandibular", repTn);
                      const advFields = toothProduct?.advance_fields;
                      const isF = (step: string) => hasAdvanceField(step, advFields) && isFieldVisible("mandibular", repTn, step as any);
                      const isFComplete = (step: string) => isFieldCompleted("mandibular", repTn, step as any);
                      const fVal = (step: string) => getFieldValue("mandibular", repTn, step as any);
                      const productKey = `mandibular_prep_${repTn}`;
                      const stageVal = fVal("stage") || selectedStages[productKey] || "";
                      const singleStageSkip = isSingleStageNoStages(toothProduct);
                      return (
                        <>
                        {!singleStageSkip && (
                        <AutoOpenStageIfEmpty
                          productId={productKey}
                          arch="mandibular"
                          toothNumber={repTn}
                          isExpanded={initialRemovablesExpanded}
                          isStageVisible={isF("stage")}
                          isStageEmpty={!stageVal}
                          onOpenStage={handleOpenStageModal}
                          caseSubmitted={caseSubmitted}
                        />
                        )}
                        <AutoOpenImpressionIfEmpty
                          isExpanded={initialRemovablesExpanded}
                          isImpressionVisible={isF("impression")}
                          isImpressionEmpty={!isFComplete("impression")}
                          onOpenImpressionModal={handleOpenImpressionModal}
                          arch="mandibular"
                          productId={productKey}
                          toothNumber={repTn}
                          caseSubmitted={caseSubmitted}
                        />
                        <div className="rounded-lg p-3 space-y-3">
                          {/* Row 1: Grade / Stage */}
                          {(isF("grade") || (isF("stage") && !singleStageSkip)) && (() => {
                            const gradeProducts = getActiveGrades(toothProduct?.grades);
                            const hasGradesRow = gradeProducts.length > 0;
                            return (
                          <div className={`grid grid-cols-1 ${hasGradesRow ? "sm:grid-cols-2" : ""} gap-3`}>
                            {isF("grade") && (() => {
                              const productGrades = gradeProducts;
                              if (productGrades.length === 0) return null;
                              const gradeRaw = fVal("grade") || "";
                              let gradeVal = gradeRaw;
                              try { const p = JSON.parse(gradeRaw); gradeVal = p.name ?? gradeRaw; } catch {}
                              const isGradeComplete = isFComplete("grade") || !!(gradeVal && gradeVal.trim());
                              const showGradeGreen = isGradeComplete && !caseSubmitted;
                              return (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center transition-colors ${showGradeGreen ? "border-[#34a853]" : isGradeComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                >
                                  <legend className={`text-sm px-1 leading-none ${showGradeGreen ? "text-[#34a853]" : isGradeComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Grade</legend>
                                  <GradeHoverSelector
                                    grades={productGrades}
                                    currentGradeName={gradeVal}
                                    disabled={caseSubmitted}
                                    onSelect={(g) => completeFieldStep("mandibular", repTn, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))}
                                  />
                                  {showGradeGreen && <Check size={16} className="text-[#34a853] ml-1 flex-shrink-0" />}
                                </fieldset>
                              );
                            })()}
                            {isF("stage") && !singleStageSkip && (() => {
                              const stageVal = fVal("stage") || selectedStages[productKey] || "";
                              const isStageComplete = isFComplete("stage") || !!(stageVal && stageVal.trim());
                              const showGreen = isStageComplete && !caseSubmitted;
                              return (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center pointer-events-auto cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => !caseSubmitted && handleOpenStageModal(productKey, "mandibular", repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                  {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              );
                            })()}
                          </div>
                            );
                          })()}

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
                                <AutoOpenGumShade
                                  visible={isF("gum_shade")}
                                  hasValue={isFComplete("gum_shade")}
                                  onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [] })}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {isF("teeth_shade") && isFComplete("teeth_shade") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", shadeProductId)}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${isFComplete("teeth_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("teeth_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Teeth shade</legend>
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="text-[14px] sm:text-lg text-[#000000]">{(() => { const r = fVal("teeth_shade"); try { return JSON.parse(r).name ?? r; } catch { return r; } })()}</span>
                                      {isFComplete("teeth_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
                                    </div>
                                  </fieldset>
                                  )}
                                  {isF("gum_shade") && isFComplete("teeth_shade") && isFComplete("gum_shade") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => {
                                      if (!caseSubmitted) {
                                        const currentGumShade = fVal("gum_shade");
                                        let currentName: string | null = null;
                                        if (currentGumShade) { try { currentName = JSON.parse(currentGumShade).name ?? null; } catch {} }
                                        setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [], selectedName: currentName });
                                      }
                                    }}
                                  >
                                    <legend className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("gum_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Gum Shade</legend>
                                    <div className="flex items-center gap-2 w-full">
                                      {(() => {
                                        const raw = fVal("gum_shade");
                                        let displayName = raw;
                                        let color: string | null = null;
                                        try { const p = JSON.parse(raw); displayName = p.name ?? raw; } catch {}
                                        const matchedShade = toothProduct?.gum_shades?.find((s) => s.name === displayName);
                                        if (matchedShade) color = matchedShade.color_code_middle;
                                        return (
                                          <>
                                            <span className="text-[14px] sm:text-lg text-[#000000] truncate">{displayName}</span>
                                            {color && (
                                              <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 ml-auto">
                                                <rect width="28.0391" height="28.0391" rx="6" fill={color} />
                                              </svg>
                                            )}
                                          </>
                                        );
                                      })()}
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
                          {/* Row 4: Add ons (separate fields per add-on, responsive) */}
                          {isF("addons") && (() => {
                            const addonsVal = fVal("addons") || "";
                            const addonItems = addonsVal ? addonsVal.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                            const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                            const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                            const onClickAddon = () => handleOpenAddOnsModal("mandibular", toothProduct?.id?.toString() || productKey, repTn);
                            if (addonItems.length === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-3">
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
                              </div>
                            );
                          })()}
                        </div>

                        </>
                      );
                    })()}
                  </div>
              </div>
              </div>
            );
          })()}

          {/* Opposing product accordion — shown when selected Removable Restoration product has opposite_extractions */}
          {showDetails && opposingProductData && (opposingProductData.opposite_extractions?.length ?? 0) > 0 && (() => {
            // Map ProductOppositeExtraction to ProductExtraction shape for ToothStatusBoxes
            const opposingExtractions: import("../types").ProductExtraction[] = opposingProductData.opposite_extractions!.map(e => ({
              id: e.id,
              extraction_id: e.id,
              name: e.name,
              code: e.code,
              color: e.color ?? null,
              url: null,
              is_default: e.is_default ?? "No",
              is_required: e.is_required ?? "No",
              is_optional: e.is_optional ?? "No",
              min_teeth: e.min_teeth ?? null,
              max_teeth: e.max_teeth ?? null,
              price: null,
              is_image_extraction: "No",
              image_url: null,
              sequence: 0,
              status: "Active",
            }));

            // Opposing arch for a mandibular product is maxillary (teeth 1–16)
            const OPPOSING_ARCH_TEETH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
            const opposingAssignedTeeth = Object.keys(opposingToothExtractionMap).map(Number).sort((a, b) => a - b);
            const hasOpposingStatus = opposingAssignedTeeth.length > 0;

            return (
              <div key="opposing-accordion" className="relative mt-4">
                <div className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9]">
                  {/* Header — matches MaxillaryPanel card-0 removable style: white bg, category pills on top, green-bordered title box */}
                  <div
                    className="w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative bg-white cursor-pointer"
                    onClick={() => setOpposingAccordionExpanded(e => !e)}
                  >
                    <div className="absolute top-3 right-2 z-10">
                      <ChevronDown
                        size={21.6}
                        className={`text-black transition-transform ${opposingAccordionExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                    {/* Product info */}
                    <div className="flex items-stretch gap-[10px] px-[8px] py-[14px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex-1 min-w-0 flex flex-col gap-[9.94px]">
                        {/* Category + subcategory badges at the top */}
                        <div className="flex items-center gap-[4px] flex-wrap">
                          {opposingProductData.subcategory?.category?.name && (
                            <AccordionBadge>{opposingProductData.subcategory.category.name}</AccordionBadge>
                          )}
                          {opposingProductData.subcategory?.name && (
                            <AccordionBadge>{opposingProductData.subcategory.name}</AccordionBadge>
                          )}
                        </div>
                        {/* Title + tooth numbers in green-bordered box (only after user picks a tooth status or case submitted) */}
                        {(hasOpposingStatus || caseSubmitted) ? (
                          <div className="flex flex-col gap-[5px] border border-[#34C759] rounded-[7px] p-[10px] mr-8">
                            <p className="font-[Inter] text-[20px] font-bold leading-[20px] tracking-[-0.02em] text-black">
                              <span className="font-normal text-[16px] text-[#555555]">opposing</span>
                            </p>
                            {opposingAssignedTeeth.length > 0 && (
                              <p className="font-[Inter] text-[20px] font-normal leading-[20px] tracking-[-0.02em] text-black">
                                #{opposingAssignedTeeth.join(",")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="font-[Inter] text-[20px] font-bold leading-tight text-black pr-6 text-left">
                            <span className="font-normal text-[16px] text-[#555555]">opposing</span>
                          </p>
                        )}
                        {/* Tooth status boxes */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <ToothStatusBoxes
                            extractions={opposingExtractions}
                            selectedTeeth={opposingAssignedTeeth}
                            allArchTeeth={OPPOSING_ARCH_TEETH}
                            toothExtractionMap={opposingToothExtractionMap}
                            claspTeeth={[]}
                            activeExtractionCode={opposingActiveExtractionCode}
                            onActiveExtractionChange={(code, exts) => {
                              setOpposingActiveExtractionCode(code);
                              if (exts) setOpposingActiveExtractions(exts);
                            }}
                            onToothExtractionToggle={(tn, code) => onOpposingExtractionToggle?.(tn, code)}
                            onSelectAllTeeth={(teeth) => onSelectAllOpposingTeeth?.(teeth)}
                            onRequiredValidationChange={onToothStatusValidationChange}
                            isRemovable={true}
                            submitted={caseSubmitted}
                            hideDefaultBox={true}
                            disableRequiredValidation={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Body */}
                  {opposingAccordionExpanded && (
                    <div className="px-[14px] py-[14px] flex flex-col gap-[10px]">
                      <fieldset className="border border-[#b4b0b0] rounded px-3 py-0 relative h-[42px] flex items-center">
                        <legend className="text-sm px-1 leading-none text-[#7f7f7f]">Impression</legend>
                        <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">No Opposing</span>
                      </fieldset>
                      <p className="font-['Verdana'] text-sm text-black">
                        No impression will be sent on this appointment.{" "}
                        Please note that opposing scan is <span className="text-[#CF0202] font-bold">required</span> for this impression.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          </div>{/* end scrollable accordion container */}

        </>
      )}

    </div>
  );
}
