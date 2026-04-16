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
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import type { RetentionOptionItem } from "@/components/retention-type-popover";
import { FieldInput, ShadeField, IconField } from "./fields";
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
import { isRemovableCategory, isFixedCategory, getCategoryName, isSingleStageNoStages } from "../utils/categoryHelpers";
import { FixedRestorationFields } from "./FixedRestorationFields";
import type { ImplantDetailData } from "./ImplantDetailSection";
import { RemovableRestorationFields } from "./RemovableRestorationFields";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
import { ProductImagePreview } from "./ProductImagePreview";

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
 * Shows grade name label below the diamonds.
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
    // Clear any pending timer before starting a new one
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onOpenImpressionModal(arch, productId, toothNumber);
    }, 350);
  }, [caseSubmitted, isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
  // Cleanup only on unmount, not on re-renders
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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MaxillaryPanelProps {
  // Visibility
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;
  /** True once the removables impression field has been completed — reveals tooth chart and ToothStatusBoxes */
  removablesImpressionDone?: boolean;


  // Tooth selection
  maxillaryTeeth: number[];
  handleMaxillaryToothClick: (toothNumber: number) => void;
  maxillaryRetentionTypes: Record<number, Array<"Implant" | "Prep" | "Pontic">>;
  retentionPopoverState: RetentionPopoverState;
  setRetentionPopoverState: (state: RetentionPopoverState) => void;
  /** When true, active product is Removable restoration — hide retention popover and only toggle teeth */
  activeProductIsRemovables?: boolean;
  /** Retention options from the product API response, used by retention popover */
  retentionOptions?: RetentionOptionItem[];
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
  handleOpenRushModal: (arch: Arch, productId: string, maxProductId?: string, mandProductId?: string) => void;
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
  storeFieldValue: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  uncompleteFieldStep: (arch: Arch, toothNumber: number, step: FieldStep) => void;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  clearToothProgress: (arch: Arch, toothNumber: number) => void;
  setToothProduct: (arch: Arch, toothNumber: number, product: ProductApiData) => void;
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
  isProductLoading: (arch: Arch, toothNumber: number) => boolean;
  fetchAndAssignProduct: (arch: Arch, toothNumber: number, productId: number) => Promise<void>;
  maxillaryToothExtractionMap: Record<number, string>;
  maxillaryClaspTeeth: number[];
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string, extractions?: import("../types").ProductExtraction[]) => void;
  selectAllMaxillaryTeeth: (teeth: number[]) => void;
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
  /** When true, the initial card 0 product is Fixed Restoration AND maxillary teeth with Prep/Pontic exist */
  maxillaryHasFixedCard0?: boolean;
  /** When true, the initial card 0 product is a Removable/Ortho AND maxillary teeth have been selected for it */
  maxillaryHasRemovablesCard0?: boolean;
  /** Product+arch combos where user chose "Submit, no opposing needed" */
  noOpposingNeeded?: Record<string, boolean>;
  /** When set, renders the opposing product accordion for products with opposite_extractions */
  opposingProductData?: ProductApiData | null;
  /** Opposing tooth extraction map: toothNumber → extractionCode for the opposing arch */
  opposingToothExtractionMap?: Record<number, string>;
  /** Called when the user toggles a tooth into/out of an opposing extraction box */
  onOpposingExtractionToggle?: (toothNumber: number, extractionCode: string) => void;
  /** Called when the checked teeth (checkbox selection) change */
  onCheckedTeethChange?: (teeth: number[]) => void;
  /** Called whenever implant detail data changes for any tooth (so CaseDesignCenter can include it in the slip snapshot). */
  onImplantDetailChange?: (implantDetailByTooth: Record<number, ImplantDetailData>) => void;
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

/* ------------------------------------------------------------------ */
/*  MaxillaryPanel                                                     */
/* ------------------------------------------------------------------ */
export function MaxillaryPanel({
  showMaxillary,
  setShowMaxillary,
  showDetails,
  caseSubmitted = false,
  maxillaryTeeth,
  handleMaxillaryToothClick,
  maxillaryRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  activeProductIsRemovables = false,
  retentionOptions,
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
  storeFieldValue,
  uncompleteFieldStep,
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
  onToothStatusValidationChange,
  maxillaryHasFixedCard0 = false,
  maxillaryHasRemovablesCard0 = false,
  removablesImpressionDone = false,
  noOpposingNeeded = {},
  opposingProductData = null,
  opposingToothExtractionMap = {},
  onOpposingExtractionToggle,
  onCheckedTeethChange,
  onImplantDetailChange,
}: MaxillaryPanelProps) {
  const MAXILLARY_ALL_TEETH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  const [activeExtractions, setActiveExtractions] = useState<import("../types").ProductExtraction[]>([]);
  const [maxillaryCheckedTeeth, setMaxillaryCheckedTeeth] = useState<number[]>([]);
  const handleMaxillaryCheckedTeethChange = useCallback((teeth: number[]) => {
    setMaxillaryCheckedTeeth(teeth);
    onCheckedTeethChange?.(teeth);
  }, [onCheckedTeethChange]);
  /** Tracks implant detail completion per tooth (firstToothNumber) so we can block impression modal until complete. */
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
  // Auto-collapse card 0 removables accordion when another maxillary product becomes active.
  // Only react to cards that belong to this (maxillary) arch — mandibular card activations
  // should not collapse the maxillary removable accordion.
  const prevActiveCardRef = useRef(activeProductCardId);
  useEffect(() => {
    if (
      activeProductCardId !== 0 &&
      prevActiveCardRef.current !== activeProductCardId &&
      addedProducts.some(ap => ap.id === activeProductCardId && ap.arch === "maxillary")
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
    for (const tn of MAXILLARY_ALL_TEETH) {
      const tp = getToothProduct("maxillary", tn);
      if (!tp) continue;
      const key = `maxillary_${tn}`;
      if (autoGradeApplied.current.has(key)) continue;
      const currentVal = getFieldValue("maxillary", tn, "grade");
      if (currentVal) continue;
      const activeGrades = getActiveGrades(tp.grades);
      if (activeGrades.length === 0) {
        // No grades available — auto-complete grade step so the chain progresses to the next field
        autoGradeApplied.current.add(key);
        completeFieldStep("maxillary", tn, "grade", JSON.stringify({ skipped: true }));
      } else {
        const def = getDefaultGrade(tp.grades);
        if (def) {
          autoGradeApplied.current.add(key);
          completeFieldStep("maxillary", tn, "grade", JSON.stringify({ grade_id: def.grade_id, name: def.name }));
        }
      }
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  // Auto-fetch product data for Removable added cards that have no teeth assigned yet.
  // Uses a virtual slot (-ap.id) so each card gets its own isolated product data.
  const removableFetchedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "maxillary")) {
      if (!ap.productId) continue;
      const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
      if (!isRemovableCategory(apCatName)) continue;
      const hasTeeth = MAXILLARY_ALL_TEETH.some(tn => getToothProductCard("maxillary", tn) === ap.id);
      if (hasTeeth) continue;
      const virtualSlot = -ap.id;
      if (removableFetchedRef.current.has(ap.id)) continue;
      removableFetchedRef.current.add(ap.id);
      fetchAndAssignProduct("maxillary", virtualSlot, ap.productId);
    }
  }, [addedProducts, fetchAndAssignProduct, getToothProductCard]);

  // Auto-fetch product data for Fixed Restoration added cards whose teeth are assigned but product data is missing.
  const fixedFetchedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "maxillary")) {
      if (!ap.productId) continue;
      const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
      if (!isFixedCategory(apCatName)) continue;
      const assignedTeeth = MAXILLARY_ALL_TEETH.filter(tn => getToothProductCard("maxillary", tn) === ap.id);
      for (const tn of assignedTeeth) {
        if (getToothProduct("maxillary", tn)) continue;
        const toothKey = ap.id * 1000 + tn;
        if (fixedFetchedRef.current.has(toothKey)) continue;
        fixedFetchedRef.current.add(toothKey);
        fetchAndAssignProduct("maxillary", tn, ap.productId);
      }
    }
  }, [addedProducts, fetchAndAssignProduct, getToothProductCard, getToothProduct]);



  /**
   * When multiple products exist and a specific accordion is active,
   * highlight only the teeth assigned to that card.
   * For card 0 fixed groups, filter by the active fixed group's product ID.
   */
  const activeCardMaxillaryTeeth = (() => {
    if (activeProductCardId !== 0) {
      // Check if the active added card is a removable product
      const activeAp = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary");
      if (activeAp) {
        const apCatName = (activeAp.product?.subcategory?.category?.name || activeAp.product?.category_name || "").toLowerCase();
        if (isRemovableCategory(apCatName)) {
          // For removable products, always show all selected teeth (don't filter by card ownership)
          return maxillaryTeeth;
        }
      }
      // Non-removable added product card active — show only its teeth
      return maxillaryTeeth.filter(tn => getToothProductCard("maxillary", tn) === activeProductCardId);
    }
    if (activeFixedGroupProductId !== null) {
      // Card 0 fixed group active — show only teeth belonging to this product
      return maxillaryTeeth.filter(tn =>
        getToothProductCard("maxillary", tn) === 0 &&
        getToothProduct("maxillary", tn)?.id === activeFixedGroupProductId
      );
    }
    // No specific card active — show all teeth
    return maxillaryTeeth;
  })();

  return (
    <div className={`flex-1 min-w-0 px-0 md:px-16 order-1 lg:order-none`}>

      {/* Eye toggle + Teeth row */}
      <div className="relative">
        <button
          onClick={() => setShowMaxillary(!showMaxillary)}
          className="absolute left-0 top-0 z-10 flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
          title={showMaxillary ? "Hide Maxillary" : "Show Maxillary"}
        >
          {showMaxillary ? (
            <Eye size={13.5} className="text-[#b4b0b0]" />
          ) : (
            <EyeOff size={13.5} className="text-[#b4b0b0]" />
          )}
        </button>
        {showMaxillary && (!activeProductIsRemovables || activeProductCardId !== 0 || removablesImpressionDone) && (
          <div className="pl-9">
            {(() => {
              const checkedCount = opposingProductData
                ? Object.keys(opposingToothExtractionMap).length
                : maxillaryCheckedTeeth.length;
              const activeProductName = activeProductCardId !== 0
                ? addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.name || ""
                : getToothProduct("maxillary", maxillaryTeeth[0])?.name || "";
              return checkedCount > 0 ? (
                <p className="text-center text-[#CF0202] font-bold text-sm mb-1">
                  {checkedCount} {checkedCount === 1 ? "TOOTH" : "TEETH"} to include in {activeProductName}
                </p>
              ) : null;
            })()}
            <MaxillaryTeethSVG
              selectedTeeth={activeCardMaxillaryTeeth}
              willExtractTeeth={(() => {
                const wedCodes = new Set<string>();
                if (opposingProductData) {
                  for (const e of opposingProductData.extractions ?? []) {
                    const n = (e.name ?? "").toLowerCase().trim();
                    if (e.code === "WED" || n === "will extract on delivery") {
                      wedCodes.add(e.code);
                    }
                  }
                  return Object.entries(opposingToothExtractionMap)
                    .filter(([, code]) => wedCodes.has(code))
                    .map(([tn]) => Number(tn));
                }
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
                // When an added Fixed Restoration card is active, bypass opposingProductData routing
                // so the user can assign teeth to the new product via the retention popover.
                const addedFixedActive = activeProductCardId !== 0 && !activeProductIsRemovables;
                if (opposingProductData && !addedFixedActive) {
                  if (opposingActiveExtractionCode) {
                    const opposingExt = opposingProductData.opposite_extractions?.find((e) => e.code === opposingActiveExtractionCode);
                    const maxTeeth = opposingExt?.max_teeth && opposingExt.max_teeth > 0 ? opposingExt.max_teeth : null;
                    const currentCount = Object.values(opposingToothExtractionMap).filter((c) => c === opposingActiveExtractionCode).length;
                    const alreadyAssigned = opposingToothExtractionMap[toothNumber] === opposingActiveExtractionCode;
                    if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                      return;
                    }
                    onOpposingExtractionToggle?.(toothNumber, opposingActiveExtractionCode);
                  }
                } else if (activeExtractionCode && !addedFixedActive) {
                  const activeExt = activeExtractions.find((e) => e.code === activeExtractionCode);
                  const maxTeeth = activeExt?.max_teeth && activeExt.max_teeth > 0 ? activeExt.max_teeth : null;
                  const currentCount = Object.values(maxillaryToothExtractionMap).filter((c) => c === activeExtractionCode).length;
                  const alreadyAssigned = maxillaryToothExtractionMap[toothNumber] === activeExtractionCode;
                  if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                    return;
                  }
                  if (!maxillaryTeeth.includes(toothNumber)) {
                    handleMaxillaryToothClick(toothNumber);
                  }
                  handleToothExtractionToggle("maxillary", toothNumber, activeExtractionCode, activeExtractions);
                } else {
                  handleMaxillaryToothClick(toothNumber);
                }
              }}
              className="w-full"
              retentionTypesByTooth={maxillaryRetentionTypes}
              showRetentionPopover={
                retentionPopoverState.arch === "maxillary" && !activeProductIsRemovables &&
                (!opposingProductData || activeProductCardId !== 0)
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
              retentionOptions={retentionOptions}
              toothExtractionMap={opposingProductData ? opposingToothExtractionMap : maxillaryToothExtractionMap}
              hideSelectionIndicators={(!!opposingProductData && activeProductCardId === 0) || activeProductIsRemovables}
              showCheckboxes={
                opposingProductData
                  ? (!!opposingActiveExtractionCode || Object.keys(opposingToothExtractionMap).length > 0)
                  : (!!activeExtractionCode || Object.keys(maxillaryToothExtractionMap).length > 0)
              }
              onCheckedTeethChange={handleMaxillaryCheckedTeethChange}
              claspTeeth={maxillaryClaspTeeth}
              getAddonValue={(toothNumber) => getFieldValue("maxillary", toothNumber, "addons")}
            />
          </div>
        )}
      </div>

      {showMaxillary && (
        <>
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

          {/* Panel-level Gum Shade Picker — shown above tooth status boxes when triggered from removable accordion */}
          {panelGumShadePicker && (
            <div className="mt-3">
              <GumShadePicker
                selected={panelGumShadePicker.selectedName ?? null}
                onSelect={(shade) => {
                  completeFieldStep("maxillary", panelGumShadePicker.toothNumber, "gum_shade", JSON.stringify({ gum_shade_id: shade.gum_shade_id, brand_id: shade.brand.id, name: shade.name }));
                  setPanelGumShadePicker(null);
                }}
                gumShades={panelGumShadePicker.gumShades}
              />
            </div>
          )}


          {/* Scrollable accordion container — allows multiple product accordions to scroll */}
          <div className="max-h-[60vh] overflow-y-auto scrollbar-blue space-y-0 pr-1">

          {/* Added product accordions — full field workflow, teeth owned by each card */}
          {showDetails && addedProducts
            .filter(ap => ap.arch === "maxillary")
            .map((ap, apIndex) => {
              // For removable restoration products, use all arch teeth so accordion stays visible when teeth are marked missing
              const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
              // Each added product is an independent slot — always show its accordion.
              // Newly added Fixed products have no teeth yet and show an empty state until the user assigns teeth.
              const isApRemovables = isRemovableCategory(apCatName);
              const cardTeethSource = isApRemovables ? MAXILLARY_ALL_TEETH : maxillaryTeeth;
              const cardTeeth = cardTeethSource.filter(
                tn => isApRemovables
                  ? getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === ap.id
                  : getToothProductCard("maxillary", tn) === ap.id
              );
              const cardProduct = cardTeeth.length > 0
                ? getToothProduct("maxillary", cardTeeth[0])
                : null;
              const cardProductName = cardProduct?.name || ap.product?.name || "Untitled Product";
              const cardProductImage = cardProduct?.image_url || ap.product?.image_url || null;
              const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
              const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product?.subcategory?.name || ap.product?.subcategory_name || "";
              // For removable products, show all selected teeth from the chart
              const apDisplayTeeth = isApRemovables
                ? [...maxillaryTeeth].sort((a, b) => a - b)
                : cardTeeth;
              // Filter to only show teeth with extraction statuses (MT, WED, WEOD, FR, CTS)
              const HEADER_EXTRACTION_CODES_AP = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
              const apFilteredTeeth = apDisplayTeeth.filter(tn => {
                const code = maxillaryToothExtractionMap[tn];
                return code && HEADER_EXTRACTION_CODES_AP.has(code);
              });
              // Show filtered teeth if extraction codes exist, otherwise show all tooth numbers (match card 0 behavior)
              const apFinalTeeth = apFilteredTeeth.length > 0 ? apFilteredTeeth : cardTeeth;
              const cardToothDisplay = apFinalTeeth.length > 0 ? `#${apFinalTeeth.join(",")}` : "";
              const isActive = activeProductCardId === ap.id;
              // For removable cards with no teeth yet, use a negative virtual slot (-ap.id) so each card
              // has isolated product data fetched into it. Real teeth (1-32) are always positive.
              const apRepTn = cardTeeth.length > 0 ? cardTeeth[0] : (isApRemovables ? -ap.id : 0);
              const apProductKey = `maxillary_prep_${apRepTn}`;
              const hasRushedAp = rushedProducts[apProductKey];
              const apStageVal = cardTeeth.length > 0 ? (selectedStages[apProductKey] || getFieldValue("maxillary", apRepTn, "stage")) : "";

              // For removable products, compute extractions for header display
              // Use apRepTn (the representative slot where product data was loaded) to get extractions
              const apExtractions = isApRemovables
                ? (getToothProduct("maxillary", apRepTn)?.extractions ?? [])
                : [];

              const apImpressionDone = apRepTn !== 0 && (
                isFieldCompleted("maxillary", apRepTn, "impression") ||
                isFieldCompleted("maxillary", apRepTn, "fixed_impression")
              );

              return (
                <div key={ap.id} className="relative mt-3">
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
                        <div className="flex-1 min-w-0 flex flex-col gap-[9.94px]">
                          {/* Product name — left aligned (centered when submitted) */}
                          <p className={`font-[Inter] text-[20px] font-bold leading-tight text-black pr-6 ${caseSubmitted ? "text-center" : "text-left"}`}>
                            {cardProductName}
                            {hasRushedAp && <RushIcon className="inline w-[14px] h-[14px] ml-1" />}
                          </p>
                          {apExtractions.length > 0 && (
                            <ToothStatusBoxes
                              extractions={apExtractions}
                              selectedTeeth={maxillaryTeeth}
                              allArchTeeth={MAXILLARY_ALL_TEETH}
                              toothExtractionMap={maxillaryToothExtractionMap}
                              claspTeeth={maxillaryClaspTeeth}
                              activeExtractionCode={activeExtractionCode}
                              onActiveExtractionChange={(code, exts) => { setActiveExtractionCode(code); if (exts) setActiveExtractions(exts); }}
                              onToothExtractionToggle={(tn, code, extractions) => handleToothExtractionToggle("maxillary", tn, code, extractions)}
                              onSelectAllTeeth={selectAllMaxillaryTeeth}
                              onRequiredValidationChange={onToothStatusValidationChange}
                              isRemovable={true}
                              submitted={caseSubmitted}
                              hideDefaultBox={true}
                            />
                          )}
                          {/* Category badges + est days below tooth status boxes */}
                          <div className="flex items-center gap-[4.97px] flex-wrap">
                            {cardSubcategoryName && (
                              <AccordionBadge>{cardSubcategoryName}</AccordionBadge>
                            )}
                            {apStageVal && !isSingleStageNoStages(cardProduct) && (
                              <AccordionBadge>{apStageVal}</AccordionBadge>
                            )}
                            <EstDaysLabel rushed={hasRushedAp} text={hasRushedAp ? "5 work days after submission" : "10 work days after submission"} />
                            {!caseSubmitted && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                              className="ml-1 hover:text-red-500 transition-colors"
                              title="Remove product"
                            >
                              <Trash2 size={9} className="text-[#999999] hover:text-red-500" />
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
                    className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${hasRushedAp ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : isActive ? "bg-[#c8e2f7] hover:bg-[#b8d8f4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
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
                            ? `maxillary_fixed_${apRepTn}`
                            : `maxillary_prep_${apRepTn}`;
                          const apStageVal = apRepTn > 0 ? (selectedStages[apStageKey] || getFieldValue("maxillary", apRepTn, isFixedCategory(cardCategoryName) ? "fixed_stage" : "stage")) : "";
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
                          <Trash2 size={9} className="text-[#999999] hover:text-red-500" />
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
                        const isCardRemovables = isApRemovables || /removables|removable restoration|orthodontics/i.test(cardCategoryName);
                        // For removable cards with no teeth yet, use the virtual slot (-ap.id) where product data was pre-fetched
                        const repTn = cardTeeth.length > 0 ? cardTeeth[0] : (isCardRemovables ? -ap.id : 0);
                        const toothProduct = getToothProduct("maxillary", repTn);
                        const categoryName = toothProduct?.subcategory?.category?.name?.toLowerCase() || "";
                        const isFixed = isFixedCategory(categoryName);
                        const isRemovables = isCardRemovables || isRemovableCategory(categoryName);
                        const fixedChain = isFixed ? getFixedFieldChain(toothProduct?.advance_fields) : undefined;
                        const advFields = toothProduct?.advance_fields;
                        const isF = (step: string) => isFieldVisible("maxillary", repTn, step as any, fixedChain);
                        const isFComplete = (step: string) => isFieldCompleted("maxillary", repTn, step as any);
                        const fVal = (step: string) => getFieldValue("maxillary", repTn, step as any);

                        if (isCardRemovables) {
                          const productKey = `maxillary_prep_${repTn}`;
                          return (
                            <>
                            {!isSingleStageNoStages(toothProduct) && (
                            <AutoOpenStageIfEmpty
                              productId={productKey}
                              arch="maxillary"
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
                              isImpressionEmpty={!isFieldCompleted("maxillary", repTn, "impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="maxillary"
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
                                        onSelect={(g) => completeFieldStep("maxillary", repTn, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))}
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
                                      onClick={() => !caseSubmitted && handleOpenStageModal(productKey, "maxillary", repTn)}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{stageVal}</span>
                                      {showGreen && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                    </fieldset>
                                  );
                                })()}
                              </div>

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
                                    <AutoOpenGumShade
                                      visible={isF("gum_shade")}
                                      hasValue={isFComplete("gum_shade")}
                                      onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [] })}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {isF("teeth_shade") && isFComplete("teeth_shade") && (
                                      <fieldset
                                        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                        onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", shadeProductId)}
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
                              {/* Row 5: Add ons (separate fields per add-on, responsive) */}
                              {isF("addons") && (() => {
                                const addonsVal = fVal("addons") || "";
                                const addonItems = addonsVal ? addonsVal.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                                const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                                const onClickAddon = () => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn);
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
                        }

                        // Fixed restoration added product — use same FixedRestorationFields as Card 0
                        const apFirstTn = cardTeeth[0];
                        const apToothProduct = getToothProduct("maxillary", apFirstTn);
                        const apFixedChain = getFixedFieldChain(apToothProduct?.advance_fields);
                        const apRetentionTypes = cardTeeth.flatMap(tn => maxillaryRetentionTypes[tn] || []);
                        const apIsFixed = (step: FieldStep) =>
                          isFieldVisible("maxillary", apFirstTn, step, apFixedChain);
                        const apFixedShadeProductId = `fixed_${apFirstTn}`;
                        const apFixedShadeIncomplete =
                          shadeSelectionState.productId === apFixedShadeProductId &&
                          shadeSelectionState.arch === "maxillary" &&
                          !(
                            getSelectedShade(apFixedShadeProductId, "maxillary", "stump_shade") &&
                            getSelectedShade(apFixedShadeProductId, "maxillary", "tooth_shade")
                          );
                        const apGroupStageProductIdFixed = `maxillary_fixed_${apFirstTn}`;

                        return (
                          <>
                            {!isSingleStageNoStages(apToothProduct) && (
                            <AutoOpenStageIfEmpty
                              productId={apGroupStageProductIdFixed}
                              arch="maxillary"
                              toothNumber={apFirstTn}
                              isExpanded={ap.expanded}
                              isStageVisible={!apFixedShadeIncomplete && apIsFixed("fixed_stage")}
                              isStageEmpty={!isFieldCompleted("maxillary", apFirstTn, "fixed_stage") && !(selectedStages[apGroupStageProductIdFixed])}
                              onOpenStage={handleOpenStageModal}
                              caseSubmitted={caseSubmitted}
                            />
                            )}
                            <AutoOpenShadeGuideIfEmpty
                              arch="maxillary"
                              productId={apFixedShadeProductId}
                              isExpanded={ap.expanded}
                              isShadeSectionVisible={apIsFixed("fixed_stump_shade") || apIsFixed("fixed_shade_trio")}
                              stumpShadeEmpty={!getSelectedShade(apFixedShadeProductId, "maxillary", "stump_shade")}
                              toothShadeEmpty={!getSelectedShade(apFixedShadeProductId, "maxillary", "tooth_shade")}
                              setShadeSelectionState={setShadeSelectionState}
                              caseSubmitted={caseSubmitted}
                            />
                            <AutoOpenImpressionIfEmpty
                              isExpanded={ap.expanded}
                              isImpressionVisible={!apFixedShadeIncomplete && apIsFixed("fixed_impression") && !(cardTeeth.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && implantDetailCompleteByTooth[apFirstTn] !== true)}
                              isImpressionEmpty={!isFieldCompleted("maxillary", apFirstTn, "fixed_impression")}
                              onOpenImpressionModal={handleOpenImpressionModal}
                              arch="maxillary"
                              productId={apToothProduct?.id?.toString() || `fixed_${apFirstTn}`}
                              toothNumber={apFirstTn}
                              caseSubmitted={caseSubmitted}
                            />
                            <FixedRestorationFields
                              arch="maxillary"
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
                              retentionTypesMap={maxillaryRetentionTypes}
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
          {showDetails && maxillaryHasFixedCard0 && (() => {
            const prepPonticTeeth = Object.entries(maxillaryRetentionTypes)
              .filter(([toothNum, types]) =>
                types.some((t) => t === "Prep" || t === "Pontic" || t === "Implant") &&
                getToothProductCard("maxillary", Number(toothNum)) === 0
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
              const groupKey = product?.id ? String(product!.id) : "no_product";
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
              if (isRemovableCategory(catLower)) return null;
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
              const HEADER_EXTRACTION_CODES = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
              const headerTeeth = toothNumbers.filter(tn => {
                const code = maxillaryToothExtractionMap[tn];
                return code && HEADER_EXTRACTION_CODES.has(code);
              });
              // Show filtered teeth if extraction codes exist, otherwise show all tooth numbers
              const displayTeeth = headerTeeth.length > 0 ? headerTeeth : toothNumbers;
              const toothNumbersDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";
              const retentionTypes = [...new Set(teeth.map((t) => t.retentionType))];
              const hasRushed = toothNumbers.some((n) => rushedProducts[`maxillary_prep_${n}`] || rushedProducts[`maxillary_fixed_${n}`]);

              // Show skeleton while product is loading
              const isLoading = !selectedProduct && teeth.some((t) => isProductLoading("maxillary", t.toothNumber));
              if (isLoading) {
                return (
                  <div key={`loading-group-${groupKey}`} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
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
                isFieldVisible("maxillary", groupStageToothNumber, step, fixedChain);

              // Gate: hide product fields while shade guide is open and incomplete for this product
              const _fixedShadeProductId = `fixed_${groupStageToothNumber}`;
              const fixedShadeIncomplete =
                shadeSelectionState.productId === _fixedShadeProductId &&
                shadeSelectionState.arch === "maxillary" &&
                !(
                  getSelectedShade(_fixedShadeProductId, "maxillary", "stump_shade") &&
                  getSelectedShade(_fixedShadeProductId, "maxillary", "tooth_shade")
                );

              const showFixedActions = isFixedCategory(categoryName) && isFieldCompleted("maxillary", groupStageToothNumber, "fixed_impression") && !caseSubmitted;
              const showPrepActions = !isFixedCategory(categoryName) && isFieldCompleted("maxillary", firstToothNumber, "addons") && !caseSubmitted;
              const showActions = showFixedActions || showPrepActions;

              return (
              <div key={`prep-pontic-group-${groupKey}`} className="relative mt-3">
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
                      : activeProductCardId === 0
                        ? "bg-[#c8e2f7] hover:bg-[#bdddf5]"
                        : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"
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
                      {!isSingleStageNoStages(selectedProduct) && (selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]) && (
                        <AccordionBadge>{selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]}</AccordionBadge>
                      )}
                      <EstDaysLabel rushed={hasRushed} text={hasRushed ? "5 work days after submission" : estDays} />
                      {!caseSubmitted && <Trash2 size={9} className="text-[#999999] flex-shrink-0" />}
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
                    productId={isFixedCategory(categoryName) ? groupStageProductIdFixed : `maxillary_prep_${firstToothNumber}`}
                    arch="maxillary"
                    toothNumber={isFixedCategory(categoryName) ? groupStageToothNumber : firstToothNumber}
                    isExpanded={true}
                    isStageVisible={isFixedCategory(categoryName) ? isFixed("fixed_stage") : isFieldVisible("maxillary", firstToothNumber, "stage")}
                    isStageEmpty={isFixedCategory(categoryName) ? !(selectedStages[groupStageProductIdFixed] || getFieldValue("maxillary", groupStageToothNumber, "fixed_stage")) : !(selectedStages[`maxillary_prep_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "stage"))}
                    onOpenStage={handleOpenStageModal}
                    caseSubmitted={caseSubmitted}
                  />
                  )}
                  {isFixedCategory(categoryName) && (
                    <>
                      <AutoOpenShadeGuideIfEmpty
                        arch="maxillary"
                        productId={`fixed_${groupStageToothNumber}`}
                        isExpanded={true}
                        isShadeSectionVisible={isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")}
                        stumpShadeEmpty={!getSelectedShade(`fixed_${groupStageToothNumber}`, "maxillary", "stump_shade")}
                        toothShadeEmpty={!getSelectedShade(`fixed_${groupStageToothNumber}`, "maxillary", "tooth_shade")}
                        setShadeSelectionState={setShadeSelectionState}
                        caseSubmitted={caseSubmitted}
                      />
                      <AutoOpenImpressionIfEmpty
                        isExpanded={isPrepPonticExpanded(firstToothNumber)}
                        isImpressionVisible={!fixedShadeIncomplete && isFixed("fixed_impression") && !(toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && implantDetailCompleteByTooth[groupStageToothNumber] !== true)}
                        isImpressionEmpty={!isFieldCompleted("maxillary", groupStageToothNumber, "fixed_impression")}
                        onOpenImpressionModal={handleOpenImpressionModal}
                        arch="maxillary"
                        productId={selectedProduct?.id?.toString() || `fixed_${groupStageToothNumber}`}
                        toothNumber={groupStageToothNumber}
                        caseSubmitted={caseSubmitted}
                      />
                    </>
                  )}

                  {isFixedCategory(categoryName) ? (
                    <FixedRestorationFields
                      arch="maxillary"
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
                      retentionTypesMap={maxillaryRetentionTypes}
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
                      arch="maxillary"
                      firstToothNumber={firstToothNumber}
                      selectedProduct={selectedProduct}
                      toothNumbers={toothNumbers}
                      caseSubmitted={caseSubmitted}
                      retentionTypesMap={maxillaryRetentionTypes}
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
          {showDetails && maxillaryHasRemovablesCard0 && (() => {
            // Use all arch teeth (not just selected) so the accordion stays visible when all teeth are marked missing
            const cardTeeth = MAXILLARY_ALL_TEETH.filter(tn => getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0);
            if (cardTeeth.length === 0) return null;
            const cardProduct = getToothProduct("maxillary", cardTeeth[0]);
            const cardProductName = cardProduct?.name || "Removable restoration";
            const cardProductImage = cardProduct?.image_url || null;
            // For removable products, show only teeth with extraction statuses (MT, WED, WEOD, FR, CTS)
            const HEADER_EXTRACTION_CODES_REM = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
            const displayTeeth = [...maxillaryTeeth].sort((a, b) => a - b).filter(tn => {
              const code = maxillaryToothExtractionMap[tn];
              return code && HEADER_EXTRACTION_CODES_REM.has(code);
            });
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
            const removablesProductKey = `maxillary_prep_${cardTeeth[0]}`;
            const hasRushedRemovables = rushedProducts[removablesProductKey];

            // Compute extractions for this removable product
            const cardExtractionsSeen = new Set<number>();
            const cardExtractions = cardTeeth.flatMap((tn) => {
              const product = getToothProduct("maxillary", tn);
              return product?.extractions ?? [];
            }).filter((e) => {
              if (cardExtractionsSeen.has(e.extraction_id)) return false;
              cardExtractionsSeen.add(e.extraction_id);
              return true;
            });

            return (
              <div key="initial-removables-maxillary" className="relative mt-3">
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
                      {/* Product name — left aligned (centered when submitted) */}
                      <p className={`font-[Inter] text-[20px] font-bold leading-tight text-black pr-6 ${caseSubmitted ? "text-center" : "text-left"}`}>
                        {cardProductName}
                        {hasRushedRemovables && <RushIcon className="inline w-[14px] h-[14px] ml-1" />}
                      </p>
                      {cardExtractions.length > 0 && removablesImpressionDone && (
                        <ToothStatusBoxes
                          extractions={cardExtractions}
                          selectedTeeth={maxillaryTeeth}
                          allArchTeeth={MAXILLARY_ALL_TEETH}
                          toothExtractionMap={maxillaryToothExtractionMap}
                          claspTeeth={maxillaryClaspTeeth}
                          activeExtractionCode={activeExtractionCode}
                          onActiveExtractionChange={(code, exts) => { setActiveExtractionCode(code); if (exts) setActiveExtractions(exts); }}
                          onToothExtractionToggle={(tn, code, extractions) => handleToothExtractionToggle("maxillary", tn, code, extractions)}
                          onSelectAllTeeth={selectAllMaxillaryTeeth}
                          onRequiredValidationChange={onToothStatusValidationChange}
                          isRemovable={true}
                          submitted={caseSubmitted}
                          hideDefaultBox={true}
                        />
                      )}
                      {/* Category badges + est days below tooth status boxes */}
                      <div className="flex items-center gap-[4.97px] flex-wrap">
                        {cardProduct?.subcategory?.name && (
                          <AccordionBadge>{cardProduct.subcategory.name}</AccordionBadge>
                        )}
                        {stageVal && !isSingleStageNoStages(cardProduct) && (
                          <AccordionBadge>{stageVal}</AccordionBadge>
                        )}
                        <EstDaysLabel rushed={hasRushedRemovables} text={hasRushedRemovables ? "5 work days after submission" : estDays} />
                        {!caseSubmitted && <Trash2 size={9} className="text-[#999999] flex-shrink-0" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue${initialRemovablesExpanded ? "" : " hidden"}${caseSubmitted ? " pointer-events-none select-none" : ""}`}>
                    {(() => {
                      const repTn = cardTeeth[0];
                      const toothProduct = getToothProduct("maxillary", repTn);
                      const advFields = toothProduct?.advance_fields;
                      const isF = (step: string) => hasAdvanceField(step, advFields) && isFieldVisible("maxillary", repTn, step as any);
                      const isFComplete = (step: string) => isFieldCompleted("maxillary", repTn, step as any);
                      const fVal = (step: string) => getFieldValue("maxillary", repTn, step as any);
                      const productKey = `maxillary_prep_${repTn}`;
                      const stageVal = fVal("stage") || selectedStages[productKey] || "";
                      const singleStageSkip = isSingleStageNoStages(toothProduct);
                      return (
                        <>
                        {!singleStageSkip && (
                        <AutoOpenStageIfEmpty
                          productId={productKey}
                          arch="maxillary"
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
                          arch="maxillary"
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
                                    onSelect={(g) => completeFieldStep("maxillary", repTn, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))}
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
                                  onClick={() => !caseSubmitted && handleOpenStageModal(productKey, "maxillary", repTn)}
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
                                <AutoOpenGumShade
                                  visible={isF("gum_shade")}
                                  hasValue={isFComplete("gum_shade")}
                                  onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [] })}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {isF("teeth_shade") && isFComplete("teeth_shade") && (
                                  <fieldset
                                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("teeth_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("teeth_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                    onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", shadeProductId)}
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
                          {/* Row 5: Add ons (separate fields per add-on, responsive) */}
                          {isF("addons") && (() => {
                            const addonsVal = fVal("addons") || "";
                            const addonItems = addonsVal ? addonsVal.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                            const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                            const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                            const onClickAddon = () => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn);
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


          {/* Opposing product accordion — shown when selected product has opposite_extractions */}
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

            // Opposing arch for a maxillary product is mandibular (teeth 17–32)
            const OPPOSING_ARCH_TEETH = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];

            return (
              <div key="opposing-accordion" className="relative mt-3">
                <div className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9]">
                  {/* Header */}
                  <div
                    className="w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative bg-[#DFEEFB] cursor-pointer"
                    onClick={() => setOpposingAccordionExpanded(e => !e)}
                  >
                    <div className="absolute top-3 right-2 z-10">
                      <ChevronDown
                        size={21.6}
                        className={`text-black transition-transform ${opposingAccordionExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                    {/* Image left + product name, tooth status & category badges right */}
                    <div className="flex items-stretch gap-[10px] px-[8px] py-[14px]">
                      <ProductImagePreview
                        imageUrl={opposingProductData.image_url}
                        altText={`${opposingProductData.name} opposing`}
                        containerClassName="w-[64px] rounded-[6px] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]"
                        imgClassName="w-[61.58px] h-[28.79px] object-contain"
                        fallback={
                          <div className="w-[61.58px] h-[28.79px] flex items-center justify-center">
                            <span className="text-[10px] text-gray-400">No img</span>
                          </div>
                        }
                      />
                      <div className="flex-1 min-w-0 flex flex-col gap-[9.94px]">
                        <p className="font-[Inter] text-[20px] font-bold leading-tight text-black pr-6 text-left">
                          {opposingProductData.name}{" "}
                          <span className="font-normal text-[16px] text-[#555555]">opposing</span>
                        </p>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ToothStatusBoxes
                            extractions={opposingExtractions}
                            selectedTeeth={Object.keys(opposingToothExtractionMap).map(Number)}
                            allArchTeeth={OPPOSING_ARCH_TEETH}
                            toothExtractionMap={opposingToothExtractionMap}
                            claspTeeth={[]}
                            activeExtractionCode={opposingActiveExtractionCode}
                            onActiveExtractionChange={(code, exts) => {
                              setOpposingActiveExtractionCode(code);
                              if (exts) setOpposingActiveExtractions(exts);
                            }}
                            onToothExtractionToggle={(tn, code) => onOpposingExtractionToggle?.(tn, code)}
                            onSelectAllTeeth={() => {}}
                            onRequiredValidationChange={onToothStatusValidationChange}
                            isRemovable={true}
                            submitted={caseSubmitted}
                            hideDefaultBox={true}
                          />
                        </div>
                        <div className="flex items-center gap-[4.97px] flex-wrap">
                          {opposingProductData.subcategory?.name && (
                            <AccordionBadge>{opposingProductData.subcategory.name}</AccordionBadge>
                          )}
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
