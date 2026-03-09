"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
import { isRemovableCategory, isFixedCategory, getCategoryName } from "../utils/categoryHelpers";
import { FixedRestorationFields } from "./FixedRestorationFields";
import { RemovableRestorationFields } from "./RemovableRestorationFields";
import { FloatingActionIcons } from "./FloatingActionIcons";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";

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
function GradeDiamonds({ filledCount }: { filledCount: number }) {
  const total = 4;
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
  const total = 4;
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
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
  }, [isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
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
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string) => void;
  selectAllMaxillaryTeeth: (teeth: number[]) => void;
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
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
  removablesImpressionDone = false,
}: MaxillaryPanelProps) {
  const MAXILLARY_ALL_TEETH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  /** Tracks implant detail completion per tooth (firstToothNumber) so we can block impression modal until complete. */
  const [implantDetailCompleteByTooth, setImplantDetailCompleteByTooth] = useState<Record<number, boolean>>({});
  /** Expand/collapse for initial (card 0) Removables product accordion */
  const [initialRemovablesExpanded, setInitialRemovablesExpanded] = useState(true);
  // Auto-collapse card 0 removables accordion when another product becomes active
  const prevActiveCardRef = useRef(activeProductCardId);
  useEffect(() => {
    if (activeProductCardId !== 0 && prevActiveCardRef.current !== activeProductCardId) {
      setInitialRemovablesExpanded(false);
    }
    prevActiveCardRef.current = activeProductCardId;
  }, [activeProductCardId]);
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

  /** Hide retention-type popover when category is Removable(s) Restoration */
  const isRemovablesCategory =
    maxillaryTeeth.some((tn) => {
      const p = getToothProduct("maxillary", tn);
      const name = (p?.subcategory?.category?.name ?? "").toLowerCase();
      return isRemovableCategory(name);
    }) ||
    addedProducts
      .filter((ap) => ap.arch === "maxillary")
      .some((ap) => {
        const name = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
        return isRemovableCategory(name);
      });

  return (
    <div className={`flex-1 min-w-0 px-0 md:px-16 order-1 lg:order-none${caseSubmitted ? " pointer-events-none select-none" : ""}`}>

      {/* Eye toggle + Teeth row */}
      <div className="flex items-start gap-2">
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
        {showMaxillary && (!activeProductIsRemovables || removablesImpressionDone) && (
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


          {/* Progressive field cards for Prep/Pontic teeth — grouped by product (card 0 only) */}
          {(() => {
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
              const toothNumbersDisplay = displayTeeth.length > 0 ? displayTeeth.map(t => `#${t}`).join(", ") : "";
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

              const showFixedActions = isFixedCategory(categoryName) && isFieldCompleted("maxillary", firstToothNumber, "fixed_impression") && !caseSubmitted;
              const showPrepActions = !isFixedCategory(categoryName) && isFieldCompleted("maxillary", firstToothNumber, "addons") && !caseSubmitted;
              const showActions = showFixedActions || showPrepActions;

              return (
              <div key={`prep-pontic-group-${groupKey}`} className="relative mt-3">
                <FloatingActionIcons
                  arch="maxillary"
                  visible={showActions}
                  onAttach={() => setShowAttachModal(true)}
                  onRush={() => handleOpenRushModal("maxillary", isFixedCategory(categoryName) ? `fixed_${firstToothNumber}` : `prep_${firstToothNumber}`)}
                  rushLabel={hasRushed ? "Rushed" : "Request Rush"}
                />
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
                  }}
                  className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
                    hasRushed
                      ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                      : activeProductCardId === 0
                        ? "bg-[#c8e2f7] hover:bg-[#bdddf5]"
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
                      {toothNumbersDisplay && (
                        <span className="font-normal text-[13px] sm:text-base text-black">{toothNumbersDisplay}</span>
                      )}
                      {hasRushed && (
                        <Zap
                          className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0"
                          strokeWidth={2}
                          fill="#CF0202"
                        />
                      )}
                    </p>
                    <div className="flex items-center gap-[5px] flex-wrap">
                      {categoryName && (
                        <AccordionBadge>{categoryName}</AccordionBadge>
                      )}
                      {subcategoryName && (
                        <AccordionBadge>{subcategoryName}</AccordionBadge>
                      )}
                      {(selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]) && (
                        <AccordionBadge>{selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]}</AccordionBadge>
                      )}
                      <EstDaysLabel rushed={hasRushed} text={hasRushed ? "5 work days after submission" : estDays} />
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
                    productId={isFixedCategory(categoryName) ? groupStageProductIdFixed : `maxillary_prep_${firstToothNumber}`}
                    arch="maxillary"
                    toothNumber={isFixedCategory(categoryName) ? groupStageToothNumber : firstToothNumber}
                    isExpanded={true}
                    isStageVisible={isFixedCategory(categoryName) ? isFixed("fixed_stage") : isFieldVisible("maxillary", firstToothNumber, "stage")}
                    isStageEmpty={isFixedCategory(categoryName) ? !(selectedStages[groupStageProductIdFixed] || getFieldValue("maxillary", groupStageToothNumber, "fixed_stage")) : !(selectedStages[`maxillary_prep_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "stage"))}
                    onOpenStage={handleOpenStageModal}
                  />
                  {isFixedCategory(categoryName) && (
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
                        isImpressionVisible={!fixedShadeIncomplete && isFixed("fixed_impression") && !(toothNumbers.some((n) => (maxillaryRetentionTypes[n] || []).includes("Implant")) && implantDetailCompleteByTooth[firstToothNumber] !== true)}
                        isImpressionEmpty={!isFieldCompleted("maxillary", firstToothNumber, "fixed_impression")}
                        onOpenImpressionModal={handleOpenImpressionModal}
                        arch="maxillary"
                        productId={selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`}
                        toothNumber={firstToothNumber}
                      />
                    </>
                  )}

                  {isFixedCategory(categoryName) ? (
                    <FixedRestorationFields
                      arch="maxillary"
                      firstToothNumber={firstToothNumber}
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
                      isFieldVisible={isFieldVisible}
                      isFieldCompleted={isFieldCompleted}
                      getFieldValue={getFieldValue}
                      completeFieldStep={completeFieldStep}
                      storeFieldValue={storeFieldValue}
                      uncompleteFieldStep={uncompleteFieldStep}
                      isFixed={isFixed}
                      getSelectedShade={getSelectedShade}
                      handleOpenStageModal={handleOpenStageModal}
                      handleShadeFieldClick={handleShadeFieldClick}
                      handleOpenImpressionModal={handleOpenImpressionModal}
                      handleOpenAddOnsModal={handleOpenAddOnsModal}
                      getImpressionDisplayText={getImpressionDisplayText}
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

          {/* Initial Removables product accordion — show fields when user selected Removable restoration and clicked teeth (assigned to card 0) */}
          {showDetails && activeProductIsRemovables && (() => {
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
                <FloatingActionIcons
                  arch="maxillary"
                  visible={removablesImpressionDone && !caseSubmitted}
                  onAttach={() => setShowAttachModal(true)}
                  onRush={() => handleOpenRushModal("maxillary", `prep_${cardTeeth[0]}`)}
                  rushLabel={hasRushedRemovables ? "Rushed" : "Request Rush"}
                />
              <div className={`rounded-lg bg-white overflow-hidden ${hasRushedRemovables ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}>
                <div
                  className={`w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative ${hasRushedRemovables ? "bg-[#FCE4E4]" : isActive ? "bg-[#c8e2f7]" : "bg-[#DFEEFB]"}`}
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
                  {/* Product name centered */}
                  <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black text-center pt-3 pb-2 px-10">
                    {cardProductName}
                    {hasRushedRemovables && <Zap className="inline w-[14px] h-[14px] text-[#CF0202] ml-1" strokeWidth={2} fill="#CF0202" />}
                  </p>
                  {/* Image + tooth status boxes in same row */}
                  <div className="flex items-start gap-2 px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                    <div className="w-16 h-auto rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden self-center">
                      {cardProductImage ? (
                        <img src={cardProductImage} alt={cardProductName} className="w-[61.58px] h-[28.79px] object-contain" />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">No img</span>
                        </div>
                      )}
                    </div>
                    {cardExtractions.length > 0 && removablesImpressionDone && (
                      <div className="flex-1 min-w-0">
                        <ToothStatusBoxes
                          extractions={cardExtractions}
                          selectedTeeth={maxillaryTeeth}
                          allArchTeeth={MAXILLARY_ALL_TEETH}
                          toothExtractionMap={maxillaryToothExtractionMap}
                          claspTeeth={maxillaryClaspTeeth}
                          activeExtractionCode={activeExtractionCode}
                          onActiveExtractionChange={setActiveExtractionCode}
                          onToothExtractionToggle={(tn, code) => handleToothExtractionToggle("maxillary", tn, code)}
                          onSelectAllTeeth={selectAllMaxillaryTeeth}
                          onRequiredValidationChange={onToothStatusValidationChange}
                          isRemovable={true}
                          submitted={caseSubmitted}
                        />
                      </div>
                    )}
                  </div>
                  {/* Bottom row: category badges + est days */}
                  <div className="px-2 pb-2 flex items-center gap-[5px] flex-wrap">
                    {cardProduct?.subcategory?.category?.name && (
                      <AccordionBadge>{cardProduct.subcategory.category.name}</AccordionBadge>
                    )}
                    {cardProduct?.subcategory?.name && (
                      <AccordionBadge>{cardProduct.subcategory.name}</AccordionBadge>
                    )}
                    {stageVal && (
                      <AccordionBadge>{stageVal}</AccordionBadge>
                    )}
                    <EstDaysLabel rushed={hasRushedRemovables} text={hasRushedRemovables ? "5 work days after submission" : estDays} />
                    <Trash2 size={9} className="text-[#999999] flex-shrink-0" />
                  </div>
                </div>

                {initialRemovablesExpanded && (
                  <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue`}>
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
                          {(isF("grade") || isF("stage")) && (() => {
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
                                  {isF("teeth_shade") && (
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
                                  {isF("gum_shade") && (
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
                          {/* Row 5: Add ons (full width) */}
                          {isF("addons") && (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}
                              onClick={() => handleOpenAddOnsModal("maxillary", toothProduct?.id?.toString() || productKey, repTn)}
                            >
                              <legend className={`text-sm px-1 leading-none ${isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Add ons</legend>
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("addons") || "No add on selected"}</span>
                              {isFComplete("addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                            </fieldset>
                          )}
                        </div>

                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              </div>
            );
          })()}

          {/* Added product accordions — full field workflow, teeth owned by each card */}
          {showDetails && !caseSubmitted && addedProducts
            .filter(ap => ap.arch === "maxillary")
            .map((ap, apIndex) => {
              // For removable restoration products, use all arch teeth so accordion stays visible when teeth are marked missing
              const apCatName = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
              const isApRemovables = isRemovableCategory(apCatName);
              const cardTeethSource = isApRemovables ? MAXILLARY_ALL_TEETH : maxillaryTeeth;
              const cardTeeth = cardTeethSource.filter(
                tn => isApRemovables
                  ? getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === ap.id
                  : getToothProductCard("maxillary", tn) === ap.id
              );
              // For non-removable (Fixed) products, don't render accordion until teeth are assigned
              if (!isApRemovables && cardTeeth.length === 0) return null;
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
              // Filter to only show teeth with extraction statuses (MT, WED, WEOD, FR, CTS)
              const HEADER_EXTRACTION_CODES_AP = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
              const apFilteredTeeth = apDisplayTeeth.filter(tn => {
                const code = maxillaryToothExtractionMap[tn];
                return code && HEADER_EXTRACTION_CODES_AP.has(code);
              });
              // Show filtered teeth if extraction codes exist, otherwise show all tooth numbers (match card 0 behavior)
              const apFinalTeeth = apFilteredTeeth.length > 0 ? apFilteredTeeth : cardTeeth;
              const cardToothDisplay = apFinalTeeth.length > 0 ? apFinalTeeth.map(t => `#${t}`).join(", ") : "";
              const isActive = activeProductCardId === ap.id;
              const apRepTn = cardTeeth.length > 0 ? cardTeeth[0] : 0;
              const apProductKey = `maxillary_prep_${apRepTn}`;
              const hasRushedAp = rushedProducts[apProductKey];

              // For removable products, compute extractions for header display
              const apExtractionsSeen = new Set<number>();
              const apExtractions = isApRemovables
                ? cardTeeth.flatMap((tn) => {
                    const product = getToothProduct("maxillary", tn);
                    return product?.extractions ?? [];
                  }).filter((e) => {
                    if (apExtractionsSeen.has(e.extraction_id)) return false;
                    apExtractionsSeen.add(e.extraction_id);
                    return true;
                  })
                : [];

              const apImpressionDone = apRepTn > 0 && (
                isFieldCompleted("maxillary", apRepTn, "impression") ||
                isFieldCompleted("maxillary", apRepTn, "fixed_impression")
              );

              return (
                <div key={ap.id} className="relative mt-3">
                  <FloatingActionIcons
                    arch="maxillary"
                    visible={apImpressionDone && !caseSubmitted}
                    onAttach={() => setShowAttachModal(true)}
                    onRush={() => handleOpenRushModal("maxillary", apProductKey)}
                    rushLabel={hasRushedAp ? "Rushed" : "Request Rush"}
                    onAddOns={() => handleOpenAddOnsModal("maxillary", getToothProduct("maxillary", apRepTn)?.id?.toString() || `prep_${apRepTn}`, apRepTn)}
                  />
                <div
                  className={`rounded-lg bg-white overflow-hidden ${hasRushedAp ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}
                >
                  {isApRemovables ? (
                    // Removable restoration: product name top, image+tooth-status-boxes in same row
                    <div
                      className={`w-full flex flex-col transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] relative ${hasRushedAp ? "bg-[#FCE4E4]" : isActive ? "bg-[#c8e2f7]" : "bg-[#DFEEFB]"}`}
                      onClick={() => {
                        toggleAddedProductExpanded(ap.id);
                        setActiveProductCardId(isActive ? 0 : ap.id);
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
                      {/* Product name centered */}
                      <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black text-center pt-3 pb-2 px-10">
                        {cardProductName}
                        {hasRushedAp && <Zap className="inline w-[14px] h-[14px] text-[#CF0202] ml-1" strokeWidth={2} fill="#CF0202" />}
                      </p>
                      {/* Image + tooth status boxes in same row */}
                      <div className="flex items-start gap-2 px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-auto rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden self-center">
                          {cardProductImage ? (
                            <img src={cardProductImage} alt={cardProductName} className="w-[61.58px] h-[28.79px] object-contain" />
                          ) : (
                            <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">No img</span>
                            </div>
                          )}
                        </div>
                        {apExtractions.length > 0 && (
                          <div className="flex-1 min-w-0">
                            <ToothStatusBoxes
                              extractions={apExtractions}
                              selectedTeeth={maxillaryTeeth}
                              allArchTeeth={MAXILLARY_ALL_TEETH}
                              toothExtractionMap={maxillaryToothExtractionMap}
                              claspTeeth={maxillaryClaspTeeth}
                              activeExtractionCode={activeExtractionCode}
                              onActiveExtractionChange={setActiveExtractionCode}
                              onToothExtractionToggle={(tn, code) => handleToothExtractionToggle("maxillary", tn, code)}
                              onSelectAllTeeth={selectAllMaxillaryTeeth}
                              onRequiredValidationChange={onToothStatusValidationChange}
                              isRemovable={true}
                              submitted={caseSubmitted}
                            />
                          </div>
                        )}
                      </div>
                      <div className="px-2 pb-2 flex items-center gap-[5px] flex-wrap">
                        {cardCategoryName && (
                          <AccordionBadge>{cardCategoryName}</AccordionBadge>
                        )}
                        {cardSubcategoryName && (
                          <AccordionBadge>{cardSubcategoryName}</AccordionBadge>
                        )}
                        <EstDaysLabel rushed={hasRushedAp} text={hasRushedAp ? "5 work days after submission" : "10 work days after submission"} />
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
                  ) : (
                    // Non-removable: original horizontal layout
                  <button
                    type="button"
                    onClick={() => {
                      toggleAddedProductExpanded(ap.id);
                      setActiveProductCardId(isActive ? 0 : ap.id);
                    }}
                    className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${hasRushedAp ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : isActive ? "bg-[#c8e2f7] hover:bg-[#b8d8f4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
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
                      <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black flex items-center gap-1 truncate">
                        {cardProductName}
                        {cardToothDisplay && (
                          <span className="font-normal text-[13px] sm:text-base text-black">{cardToothDisplay}</span>
                        )}
                        {hasRushedAp && <Zap className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0" strokeWidth={2} fill="#CF0202" />}
                      </p>
                      <div className="flex items-center gap-[5px] flex-wrap">
                        <AccordionBadge>Product {apIndex + 2}</AccordionBadge>
                        {cardCategoryName && (
                          <AccordionBadge>{cardCategoryName}</AccordionBadge>
                        )}
                        {cardSubcategoryName && (
                          <AccordionBadge>{cardSubcategoryName}</AccordionBadge>
                        )}
                        {(() => {
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
                  )}

                  {ap.expanded && (
                    <div className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue`}>
                      {cardTeeth.length === 0 ? (
                        <p className="text-xs text-[#b4b0b0] text-center py-4">
                          Select teeth from the chart above to assign them to this product.
                        </p>
                      ) : (() => {
                        const isCardRemovables = /removables|removable restoration|orthodontics/i.test(cardCategoryName);
                        const repTn = cardTeeth[0];
                        const toothProduct = getToothProduct("maxillary", repTn);
                        const categoryName = toothProduct?.subcategory?.category?.name?.toLowerCase() || "";
                        const isFixed = isFixedCategory(categoryName);
                        const isRemovables = isCardRemovables || isRemovableCategory(categoryName);
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
                                    <AutoOpenGumShade
                                      visible={hasAdvanceField("gum_shade", advFields)}
                                      hasValue={isFComplete("gum_shade")}
                                      onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: toothProduct?.gum_shades || [] })}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {hasAdvanceField("teeth_shade", advFields) && (
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
                                      {hasAdvanceField("gum_shade", advFields) && (
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
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fVal("addons") || "No add on selected"}</span>
                                  {isFComplete("addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                            </div>

                            </>
                          );
                        }

                        return cardTeeth.map(tn => {
                          const tp = getToothProduct("maxillary", tn);
                          const catName = tp?.subcategory?.category?.name?.toLowerCase() || "";
                          const fixed = isFixedCategory(catName);
                          const rem = isRemovableCategory(catName);
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
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{fValPerTooth(fixed ? "fixed_addons" : "addons") || "No add on selected"}</span>
                                  {isFCompletePerTooth(fixed ? "fixed_addons" : "addons") && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                              )}
                            </div>
                          );
                        });
                      })()}

                      <ScrollToBottom />
                    </div>
                  )}
                </div>
                </div>
              );
            })
          }

        </>
      )}
    </div>
  );
}
