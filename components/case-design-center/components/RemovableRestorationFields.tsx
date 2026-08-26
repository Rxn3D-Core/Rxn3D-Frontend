"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Check } from "@/components/ui/custom-check";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FieldInput,
  ShadeField,
} from "./fields";
import type { ImplantDetailData } from "./ImplantDetailSection";
import { ImplantDetailBoxes } from "./ImplantDetailBoxes";
import {
  areAllImplantDetailsComplete,
  getImplantTeethInGroup,
} from "../utils/implantDetailHelpers";
import { useCrossArchImplantMirror } from "../hooks/useCrossArchImplantMirror";
import type {
  Arch,
  ShadeFieldType,
  ProductApiData,
  ProductGrade,
  RetentionType,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { getSelectionFieldChain } from "../hooks/useToothFieldProgress";
import {
  shouldSkipStageSelection,
  parseStageDisplayName,
} from "../utils/categoryHelpers";
import {
  productHasGrades,
  resolveProductGradesForDisplay,
  parseGradeDisplayName,
  isGradeStepCompleteForDisplay,
} from "../utils/gradeHelpers";
import { buildRemovableAddonFieldContext } from "../utils/addonDisplayHelpers";
import type { StoredAddonEntry } from "../utils/addonDisplayHelpers";
import type { SlipImpressionSelections } from "../utils/impressionStorage";
import {
  ARCH_IMPRESSION_PRODUCT_ID,
  archHasActiveImpressionSelections,
} from "../utils/impressionFieldSync";
import {
  findShadeCatalogMatch,
  formatRemovableShadeFieldLabel,
  SHADE_FIELD_LABEL_CLASS,
} from "../utils/shadeFieldDisplay";

/* ------------------------------------------------------------------ */
/*  Diamond SVG icons (Grade field)                                    */
/* ------------------------------------------------------------------ */
export type GradeDiamondPalette = { a: string; b: string; c: string; d: string };

/** Unfilled (placeholder) diamond color. */
const GRADE_UNFILLED_PALETTE: GradeDiamondPalette = { a: "#575756", b: "#706F6F", c: "#3C3C3B", d: "#1D1D1B" };

/**
 * Diamond color by grade level (1-based): level 1 = lowest grade.
 * gray → silver → gold → platinum → blue; levels beyond 5 reuse blue.
 */
const GRADE_LEVEL_PALETTES: GradeDiamondPalette[] = [
  { a: "#9CA3AF", b: "#6B7280", c: "#D1D5DB", d: "#B5BBC4" }, // 1 gray
  { a: "#C0C7CF", b: "#9AA3AD", c: "#E8ECF0", d: "#D6DBE0" }, // 2 silver
  { a: "#E6B422", b: "#C8960F", c: "#F7D560", d: "#F0C53C" }, // 3 gold
  { a: "#A9BCCB", b: "#8499AB", c: "#D7E2EA", d: "#C2D1DC" }, // 4 platinum
  { a: "#45B2EF", b: "#3B9FE2", c: "#80D4FD", d: "#4FC1F8" }, // 5 blue
];

export function gradeLevelPalette(level: number): GradeDiamondPalette {
  if (level <= 0) return GRADE_LEVEL_PALETTES[0];
  return GRADE_LEVEL_PALETTES[Math.min(level, GRADE_LEVEL_PALETTES.length) - 1];
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX_COLOR_PATTERN.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(hex.trim().slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function shadeHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (c: number) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
}

/** Build a 4-stop diamond palette from a single hex grade color. */
export function paletteFromHex(hex: string): GradeDiamondPalette {
  const normalized = hex.trim().toUpperCase();
  return {
    a: normalized,
    b: shadeHex(normalized, -0.15),
    c: shadeHex(normalized, 0.25),
    d: shadeHex(normalized, -0.3),
  };
}

/** Use grade.color when set; otherwise fall back to level-based defaults. */
export function resolveGradePalette(
  grade?: Pick<ProductGrade, "color"> | null,
  level = 1
): GradeDiamondPalette {
  const hex = grade?.color?.trim();
  if (hex && HEX_COLOR_PATTERN.test(hex)) {
    return paletteFromHex(hex);
  }
  return gradeLevelPalette(level);
}

function Diamond({ filled, palette }: { filled: boolean; palette?: GradeDiamondPalette }) {
  const c = filled ? (palette ?? GRADE_LEVEL_PALETTES[4]) : GRADE_UNFILLED_PALETTE;
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

/* ------------------------------------------------------------------ */
/*  Grade helpers (exported so panels can reuse)                       */
/* ------------------------------------------------------------------ */

export function getGradeDiamondCount(gradeName: string, grades?: ProductGrade[]): number {
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

export function getDefaultGrade(grades?: ProductGrade[]): ProductGrade | null {
  if (!grades || grades.length === 0) return null;
  return grades.find((g) => g.is_default === "Yes" && g.status === "Active") || grades.filter((g) => g.status === "Active").sort((a, b) => a.sequence - b.sequence)[0] || null;
}

export function getActiveGrades(grades?: ProductGrade[]): ProductGrade[] {
  if (!grades || grades.length === 0) return [];
  return grades.filter((g) => g.status === "Active").sort((a, b) => a.sequence - b.sequence);
}

/** Static diamond display (used in non-interactive contexts) */
export function GradeDiamonds({
  filledCount,
  total = 4,
  palette,
}: {
  filledCount: number;
  total?: number;
  palette?: GradeDiamondPalette;
}) {
  const filled = Math.max(0, Math.min(filledCount, total));
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <Diamond key={i} filled={i < filled} palette={palette} />
      ))}
    </div>
  );
}

/**
 * Grade picker modal — lists each grade as its level's colored diamonds plus the
 * grade name (level 1 = 1 diamond, level 2 = 2 diamonds, …). Opened from the grade
 * field, mirroring the stage selection modal.
 */
export function GradeSelectionModal({
  grades,
  selectedGradeName,
  onSelect,
  onClose,
}: {
  grades: ProductGrade[];
  selectedGradeName?: string;
  onSelect: (grade: ProductGrade) => void;
  onClose: () => void;
}) {
  const sortedGrades = [...grades].sort((a, b) => a.sequence - b.sequence);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-3 sm:p-4">
          <DialogTitle
            className="font-semibold"
            style={{ fontFamily: "Verdana", fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            <span className="text-xl sm:text-[26px]">Select grade</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 sm:px-5 py-2 sm:py-3 overflow-y-auto max-h-[70vh] flex flex-col gap-2">
          {sortedGrades.map((grade, idx) => {
            const level = idx + 1;
            const isSelected =
              grade.name === selectedGradeName || grade.code === selectedGradeName;
            const palette = resolveGradePalette(grade, level);
            return (
              <button
                key={grade.grade_id ?? grade.name}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(grade);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-3 py-2 transition-all duration-200 bg-white cursor-pointer text-left",
                  isSelected
                    ? "border-blue-500 shadow-md"
                    : "border-gray-300 hover:border-blue-500 hover:shadow"
                )}
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  {Array.from({ length: level }, (_, i) => (
                    <Diamond key={i} filled palette={palette} />
                  ))}
                </div>
                <span
                  className="text-[18px] sm:text-[22px] text-[#000000] truncate"
                  style={{ fontFamily: "Verdana", fontWeight: 400, letterSpacing: "-0.02em" }}
                >
                  {grade.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t p-3 sm:p-4 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              border: "2px solid #9BA5B7",
              borderRadius: "6px",
              fontFamily: "Verdana",
              fontWeight: 700,
              fontSize: "12px",
              color: "#9BA5B7",
            }}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Module-level guard so only one grade picker auto-opens at a time. Several grade
 * fields (both arches, opposing) can mount together; without this they would each
 * pop their modal simultaneously and stack.
 */
let gradeAutoOpenActive = false;

/**
 * Grade field content: shows the selected grade name + its level-colored diamonds,
 * and opens the grade selection modal on click. A product with a single grade
 * auto-selects it (no modal needed). When a multi-grade field is shown without a
 * selection, the picker auto-opens once so the user doesn't have to click first.
 */
export function GradeHoverSelector({
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
  const [modalOpen, setModalOpen] = useState(false);
  // Sort by sequence so diamond count maps to grade level. Grade `sequence` values can
  // be non-contiguous (e.g. levels 2 and 3) — position, not raw sequence, drives the count.
  const sortedGrades = [...grades].sort((a, b) => a.sequence - b.sequence);
  const total = sortedGrades.length > 0 ? sortedGrades.length : 4;
  const currentIndex = sortedGrades.findIndex(
    (g) => g.name === currentGradeName || g.code === currentGradeName
  );
  const currentCount = currentIndex >= 0 ? currentIndex + 1 : getGradeDiamondCount(currentGradeName, grades);
  const selectedGrade = currentIndex >= 0 ? sortedGrades[currentIndex] : undefined;
  const palette = resolveGradePalette(selectedGrade, currentCount);

  // Single grade → auto-select it; don't ask the user to pick.
  const autoSelectSigRef = useRef<string | null>(null);
  const gradesSignature = sortedGrades.map((g) => g.grade_id).join(",");
  useEffect(() => {
    if (disabled) return;
    if (sortedGrades.length === 1 && currentIndex === -1 && autoSelectSigRef.current !== gradesSignature) {
      autoSelectSigRef.current = gradesSignature;
      onSelect(sortedGrades[0]);
    }
  }, [disabled, currentIndex, gradesSignature, onSelect, sortedGrades]);

  // Auto-open the picker the first time a multi-grade field is shown without a
  // selection, so the user picks a grade without having to click the field first.
  // Mirrors the stage modal's auto-open. Opens once per mount; cancelling won't re-open.
  const autoOpenedRef = useRef(false);
  const ownsAutoOpenLockRef = useRef(false);
  useEffect(() => {
    if (disabled) return;
    if (autoOpenedRef.current) return;
    if (sortedGrades.length <= 1) return; // single grade auto-selects instead
    if (currentIndex !== -1) return; // already has a selection
    if (gradeAutoOpenActive) return; // another grade field is already auto-opening
    autoOpenedRef.current = true;
    gradeAutoOpenActive = true;
    ownsAutoOpenLockRef.current = true;
    setModalOpen(true);
  }, [disabled, sortedGrades.length, currentIndex]);

  // Release the auto-open lock if this field unmounts while still holding it.
  useEffect(() => {
    return () => {
      if (ownsAutoOpenLockRef.current) {
        gradeAutoOpenActive = false;
        ownsAutoOpenLockRef.current = false;
      }
    };
  }, []);

  const closeGradeModal = () => {
    if (ownsAutoOpenLockRef.current) {
      gradeAutoOpenActive = false;
      ownsAutoOpenLockRef.current = false;
    }
    setModalOpen(false);
  };

  return (
    <>
      {/* Clickable field content. The modal is rendered as a sibling (below) rather
          than a child so its clicks don't bubble back into this open handler via the
          React portal tree and immediately re-open it. */}
      <div
        className={`flex items-center gap-2 w-full ${disabled ? "" : "cursor-pointer"}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setModalOpen(true);
        }}
      >
        <span className="text-[14px] sm:text-lg text-[#000000] min-w-0 truncate transition-opacity duration-200">
          {currentGradeName}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {currentCount > 0
            ? // Selected: show that grade's diamonds, all in its level color.
              Array.from({ length: currentCount }, (_, i) => (
                <Diamond key={i} filled palette={palette} />
              ))
            : // Unselected: gray placeholders, one per available grade.
              Array.from({ length: total }, (_, i) => (
                <Diamond key={i} filled={false} />
              ))}
        </div>
      </div>
      {modalOpen && !disabled && (
        <GradeSelectionModal
          grades={sortedGrades}
          selectedGradeName={currentGradeName}
          onSelect={(grade) => {
            onSelect(grade);
            closeGradeModal();
          }}
          onClose={closeGradeModal}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto-open helpers                                                  */
/* ------------------------------------------------------------------ */

export function AutoOpenShade({ hasValue, onOpen }: { hasValue: boolean; onOpen: () => void }) {
  const opened = useRef(false);
  useEffect(() => {
    if (!hasValue && !opened.current) {
      opened.current = true;
      onOpen();
    }
  }, [hasValue, onOpen]);
  return null;
}

export function AutoOpenGumShade({ visible, hasValue, onOpen }: { visible: boolean; hasValue: boolean; onOpen: () => void }) {
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

export function AutoOpenImpressionIfEmpty({
  isExpanded,
  isImpressionVisible,
  isImpressionEmpty,
  onOpenImpressionModal,
  arch,
  productId,
  toothNumber,
  blockAutoOpen = false,
}: {
  isExpanded: boolean;
  isImpressionVisible: boolean;
  isImpressionEmpty: boolean;
  onOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  arch: Arch;
  productId: string;
  toothNumber: number;
  /** When true (e.g. impression modal already open), skip auto-open */
  blockAutoOpen?: boolean;
}) {
  const hasAutoOpenedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (blockAutoOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isImpressionVisible || !isImpressionEmpty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onOpenImpressionModal(arch, productId, toothNumber);
    }, 350);
  }, [isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber, blockAutoOpen]);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Articulator icon (Stage field)                                     */
/* ------------------------------------------------------------------ */
function ArticulatorIcon({ arch }: { arch: "mandibular" | "maxillary" }) {
  const patternId = `pattern0_rem_${arch}`;
  const imageId = `image0_rem_${arch}`;
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
        fill={`url(#${patternId})`}
      />
      <defs>
        <pattern
          id={patternId}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${imageId}`}
            transform="translate(0 -0.166667) scale(0.000326797)"
          />
        </pattern>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  RemovableRestorationFields props                                   */
/* ------------------------------------------------------------------ */
interface RemovableRestorationFieldsProps {
  arch: "mandibular" | "maxillary";
  firstToothNumber: number;
  selectedProduct: ProductApiData | null;
  toothNumbers: number[];
  caseSubmitted: boolean;
  retentionTypesMap: Record<number, Array<RetentionType>>;
  implantDetailCompleteByTooth: Record<number, boolean>;
  setImplantDetailCompleteByTooth: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  implantDetailByTooth: Record<number, ImplantDetailData>;
  setImplantDetailByTooth: React.Dispatch<React.SetStateAction<Record<number, ImplantDetailData>>>;
  isExpanded: boolean;
  isFieldVisible: (arch: Arch, toothNumber: number, step: FieldStep, fixedChain?: readonly string[]) => boolean;
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  completeFieldStep: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  storeFieldValue: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  uncompleteFieldStep: (arch: Arch, toothNumber: number, step: FieldStep) => void;
  handleOpenStageModal: (productId: string, arch?: Arch, toothNumber?: number) => void;
  handleShadeFieldClick: (arch: Arch, fieldType: ShadeFieldType, productId: string) => void;
  handleOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  getImpressionDisplayText?: (productId: string, arch: Arch) => string;
  selectedImpressions?: SlipImpressionSelections;
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  setPanelGumShadePicker: (state: { toothNumber: number; gumShades: any[]; selectedName?: string | null }) => void;
  /** Product+arch combos where user chose "Submit, no opposing needed" */
  noOpposingNeeded?: Record<string, boolean>;
  /** When false, hides progressive fields until user acknowledges extractions (multi-status removables). */
  showProgressiveFields?: boolean;
  /** Implant details from the opposite arch for cross-arch mirroring. */
  peerImplantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Opposite-arch implant completion state for more accurate source-tooth selection during mirror. */
  peerImplantCompleteByTooth?: Record<number, boolean>;
  /** Arch-level: only one implant detail accordion open at a time on this side. */
  expandedImplantTooth?: number;
  onExpandedImplantToothChange?: (toothNumber: number | undefined) => void;
  /** Modal/store add-on selections keyed by product id */
  productAddOns?: Record<string, { maxillary?: StoredAddonEntry[]; mandibular?: StoredAddonEntry[] }>;
  /** Structured add-on selections keyed as `${arch}_${toothNumber}` */
  selectedAddonsByTooth?: Record<string, Array<{ addon_id: number; qty: number }>>;
  /** Product card id (0 = initial card). Used to resolve virtual-slot add-on values. */
  productCardId?: number;
  /** Lab customer id owning the product catalog (office flows select the lab in the wizard). */
  labCustomerId?: number | null;
  /** Active shade-guide system_name fallback when product shade rows lack brand.system_name. */
  selectedShadeGuide?: string | null;
}

/* ------------------------------------------------------------------ */
/*  RemovableRestorationFields component                               */
/* ------------------------------------------------------------------ */
export function SelectionProductFields({
  arch,
  firstToothNumber,
  selectedProduct,
  toothNumbers,
  caseSubmitted,
  retentionTypesMap,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
  implantDetailByTooth,
  setImplantDetailByTooth,
  isExpanded,
  isFieldVisible: isFieldVisibleFn,
  isFieldCompleted: isFieldCompletedFn,
  getFieldValue: getFieldValueFn,
  completeFieldStep: completeFieldStepFn,
  storeFieldValue: storeFieldValueFn,
  uncompleteFieldStep: uncompleteFieldStepFn,
  handleOpenStageModal,
  handleShadeFieldClick,
  handleOpenImpressionModal,
  getImpressionDisplayText,
  selectedImpressions = { maxillary: [], mandibular: [] },
  handleOpenAddOnsModal,
  setPanelGumShadePicker,
  noOpposingNeeded = {},
  showProgressiveFields = true,
  peerImplantDetailByTooth,
  peerImplantCompleteByTooth,
  expandedImplantTooth,
  onExpandedImplantToothChange,
  productAddOns = {},
  selectedAddonsByTooth = {},
  productCardId = 0,
  labCustomerId,
  selectedShadeGuide,
}: RemovableRestorationFieldsProps) {
  const removableChain = getSelectionFieldChain(selectedProduct);
  const implantTeeth = useMemo(
    () => getImplantTeethInGroup(toothNumbers, retentionTypesMap),
    [toothNumbers, retentionTypesMap]
  );

  useCrossArchImplantMirror({
    arch,
    implantTeeth,
    peerImplantDetailByTooth,
    peerImplantCompleteByTooth,
    implantDetailByTooth,
    setImplantDetailByTooth,
    implantDetailCompleteByTooth,
    setImplantDetailCompleteByTooth,
    caseSubmitted,
  });

  if (!showProgressiveFields) return null;

  const isVisible = (step: FieldStep): boolean => isFieldVisibleFn(arch, firstToothNumber, step, removableChain);
  const implantDetailReady = areAllImplantDetailsComplete(
    implantTeeth,
    implantDetailCompleteByTooth,
    implantDetailByTooth
  );
  const impressionDisplay =
    getImpressionDisplayText?.(ARCH_IMPRESSION_PRODUCT_ID, arch) ||
    getFieldValueFn(arch, firstToothNumber, "impression");
  const impressionComplete =
    isFieldCompletedFn(arch, firstToothNumber, "impression") ||
    (!!impressionDisplay &&
      archHasActiveImpressionSelections(
        selectedImpressions,
        ARCH_IMPRESSION_PRODUCT_ID,
        arch
      ));

  return (
    <>
      <AutoOpenImpressionIfEmpty
        isExpanded={isExpanded}
        isImpressionVisible={isVisible("impression") && implantDetailReady}
        isImpressionEmpty={!impressionComplete}
        onOpenImpressionModal={(a, productId, toothNum) => {
          handleOpenImpressionModal(a, productId, toothNum);
        }}
        arch={arch}
        productId={selectedProduct?.id?.toString() || `prep_${firstToothNumber}`}
        toothNumber={firstToothNumber}
      />
      {/* ===== OTHER CATEGORIES: Progressive step-by-step fields ===== */}

      {/* Implant Detail — one box per implant tooth; additional teeth mirror the first */}
      <ImplantDetailBoxes
        toothNumbers={toothNumbers}
        retentionTypesMap={retentionTypesMap}
        implantDetailByTooth={implantDetailByTooth}
        setImplantDetailByTooth={setImplantDetailByTooth}
        implantDetailCompleteByTooth={implantDetailCompleteByTooth}
        setImplantDetailCompleteByTooth={setImplantDetailCompleteByTooth}
        caseSubmitted={caseSubmitted}
        advanceFields={selectedProduct?.advance_fields}
        productId={selectedProduct?.id}
        productAbutments={selectedProduct?.abutments}
        labCustomerId={labCustomerId}
        expandedImplantTooth={expandedImplantTooth}
        onExpandedImplantToothChange={onExpandedImplantToothChange}
      />

      {/* Step 1: Grade / Stage */}
      {isVisible("grade") && (() => {
        const stageRaw = getFieldValueFn(arch, firstToothNumber, "stage");
        const stageName = parseStageDisplayName(stageRaw);
        const selectedStageObj = selectedProduct?.stages?.find((s) => s.name === stageName);
        const stageCfg = selectedStageObj?.stage_configurations;

        const gradeRaw = getFieldValueFn(arch, firstToothNumber, "grade") || "";
        const gradeVal = parseGradeDisplayName(gradeRaw);
        const isGradeComplete = isGradeStepCompleteForDisplay(
          gradeRaw,
          isFieldCompletedFn(arch, firstToothNumber, "grade"),
          selectedProduct
        );
        const showGradeGreen = isGradeComplete && !caseSubmitted;
        const productGrades = resolveProductGradesForDisplay(selectedProduct);
        // Hide grade if stage_configurations.grade === "No"
        const gradeAllowedByStage = !stageCfg || stageCfg.grade !== "No";
        const hasGrades =
          (productGrades.length > 0 || productHasGrades(selectedProduct)) && gradeAllowedByStage;
        const showStage = isVisible("stage") && !shouldSkipStageSelection(selectedProduct);
        const showTwoCols = hasGrades && showStage;
        return (
        <div className={`grid grid-cols-1 ${showTwoCols ? "sm:grid-cols-2" : ""} gap-3`}>
          {hasGrades && (
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center transition-colors ${
              showGradeGreen
                ? "border-[#34a853]"
                : isGradeComplete
                  ? "border-[#b4b0b0]"
                  : "border-[#CF0202]"
            }`}
          >
            <legend
              className={`text-sm px-1 leading-none ${
                showGradeGreen
                  ? "text-[#34a853]"
                  : isGradeComplete
                    ? "text-[#7f7f7f]"
                    : "text-[#CF0202]"
              }`}
            >
              Grade
            </legend>
            <GradeHoverSelector
              grades={productGrades}
              currentGradeName={gradeVal}
              disabled={caseSubmitted}
              onSelect={(g) => completeFieldStepFn(arch, firstToothNumber, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))}
            />
            {showGradeGreen && (
              <Check size={16} className="text-[#34a853] ml-1 flex-shrink-0" />
            )}
          </fieldset>
          )}

          {showStage ? (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center pointer-events-auto cursor-pointer hover:bg-gray-50 transition-colors ${
                isFieldCompletedFn(arch, firstToothNumber, "stage") && !caseSubmitted
                  ? "border-[#34a853]"
                  : isFieldCompletedFn(arch, firstToothNumber, "stage")
                    ? "border-[#b4b0b0]"
                    : "border-[#CF0202]"
              }`}
              onClick={() => {
                if (!caseSubmitted) handleOpenStageModal(`${arch}_prep_${firstToothNumber}`, arch, firstToothNumber);
              }}
            >
              <legend
                className={`text-sm px-1 leading-none ${
                  isFieldCompletedFn(arch, firstToothNumber, "stage") && !caseSubmitted
                    ? "text-[#34a853]"
                    : isFieldCompletedFn(arch, firstToothNumber, "stage")
                      ? "text-[#7f7f7f]"
                      : "text-[#CF0202]"
                }`}
              >
                Stage
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[14px] sm:text-lg text-[#000000]">
                  {stageName}
                </span>
                {isFieldCompletedFn(arch, firstToothNumber, "stage") && !caseSubmitted && (
                  <Check size={16} className="text-[#34a853]" />
                )}
                <div className="ml-auto">
                  <ArticulatorIcon arch={arch} />
                </div>
              </div>
            </fieldset>
          ) : null}
        </div>
        );
      })()}

      {/* Step 2: Teeth shade / Gum Shade */}
      {isVisible("teeth_shade") && (() => {
        const showGumShade = isVisible("gum_shade");
        return (
        <>
        <AutoOpenShade
          hasValue={isFieldCompletedFn(arch, firstToothNumber, "teeth_shade")}
          onOpen={() => handleShadeFieldClick(arch, "tooth_shade", `prep_${firstToothNumber}`)}
        />
        <AutoOpenGumShade
          visible={showGumShade}
          hasValue={isFieldCompletedFn(arch, firstToothNumber, "gum_shade")}
          onOpen={() => setPanelGumShadePicker({ toothNumber: firstToothNumber, gumShades: selectedProduct?.gum_shades || [] })}
        />
        <div className={`grid grid-cols-1 ${showGumShade ? "sm:grid-cols-2" : ""} gap-3 mt-3`}>
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors min-w-0 overflow-hidden ${
              isFieldCompletedFn(arch, firstToothNumber, "teeth_shade") && !caseSubmitted
                ? "border-[#34a853]"
                : isFieldCompletedFn(arch, firstToothNumber, "teeth_shade")
                  ? "border-[#b4b0b0]"
                  : "border-[#CF0202]"
            }`}
            onClick={() => {
              handleShadeFieldClick(
                arch,
                "tooth_shade",
                `prep_${firstToothNumber}`
              );
            }}
          >
            <legend
              className={`text-sm px-1 leading-none ${
                isFieldCompletedFn(arch, firstToothNumber, "teeth_shade") && !caseSubmitted
                  ? "text-[#34a853]"
                  : isFieldCompletedFn(arch, firstToothNumber, "teeth_shade")
                    ? "text-[#7f7f7f]"
                    : "text-[#CF0202]"
              }`}
            >
              Teeth shade
            </legend>
            <div className="flex items-center gap-2 w-full min-w-0">
              <span
                className={SHADE_FIELD_LABEL_CLASS}
                title={formatRemovableShadeFieldLabel(
                  getFieldValueFn(arch, firstToothNumber, "teeth_shade"),
                  selectedProduct?.teeth_shades,
                  selectedShadeGuide
                ) || undefined}
              >
                {formatRemovableShadeFieldLabel(
                  getFieldValueFn(arch, firstToothNumber, "teeth_shade"),
                  selectedProduct?.teeth_shades,
                  selectedShadeGuide
                )}
              </span>
              {isFieldCompletedFn(arch, firstToothNumber, "teeth_shade") && !caseSubmitted && (
                <Check size={16} className="text-[#34a853] flex-shrink-0" />
              )}
            </div>
          </fieldset>

          {isVisible("gum_shade") ? (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors min-w-0 overflow-hidden ${
                isFieldCompletedFn(arch, firstToothNumber, "gum_shade") && !caseSubmitted
                  ? "border-[#34a853]"
                  : isFieldCompletedFn(arch, firstToothNumber, "gum_shade")
                    ? "border-[#b4b0b0]"
                    : "border-[#CF0202]"
              }`}
              onClick={() => {
                if (!caseSubmitted) {
                  const currentGumShade = getFieldValueFn(arch, firstToothNumber, "gum_shade");
                  let currentName: string | null = null;
                  if (currentGumShade) { try { currentName = JSON.parse(currentGumShade).name ?? null; } catch {} }
                  setPanelGumShadePicker({ toothNumber: firstToothNumber, gumShades: selectedProduct?.gum_shades || [], selectedName: currentName });
                }
              }}
            >
              <legend
                className={`text-sm px-1 leading-none ${
                  isFieldCompletedFn(arch, firstToothNumber, "gum_shade") && !caseSubmitted
                    ? "text-[#34a853]"
                    : isFieldCompletedFn(arch, firstToothNumber, "gum_shade")
                      ? "text-[#7f7f7f]"
                      : "text-[#CF0202]"
                }`}
              >
                Gum Shade
              </legend>
              <div className="flex items-center gap-2 w-full min-w-0">
                {(() => {
                  const raw = getFieldValueFn(arch, firstToothNumber, "gum_shade");
                  const matchedShade = findShadeCatalogMatch(raw, selectedProduct?.gum_shades);
                  const color = matchedShade?.color_code_middle ?? null;
                  const displayName = formatRemovableShadeFieldLabel(raw, selectedProduct?.gum_shades);
                  return (
                    <>
                      <span className={SHADE_FIELD_LABEL_CLASS} title={displayName || undefined}>{displayName}</span>
                      {color && (
                        <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                          <rect width="28.0391" height="28.0391" rx="6" fill={color} />
                        </svg>
                      )}
                    </>
                  );
                })()}
                {isFieldCompletedFn(arch, firstToothNumber, "gum_shade") && !caseSubmitted && (
                  <Check size={16} className="text-[#34a853] flex-shrink-0" />
                )}
              </div>
            </fieldset>
          ) : null}
        </div>
        </>
        );
      })()}

      {/* Step 3: Impression / Add ons */}
      {isVisible("impression") && implantDetailReady && (() => {
        const showAddons = isVisible("addons");
        const addonCtx = buildRemovableAddonFieldContext({
          arch,
          cardId: productCardId,
          cardTeeth: toothNumbers,
          repTooth: firstToothNumber,
          product: selectedProduct,
          getFieldValue: getFieldValueFn,
          selectedAddonsByTooth,
          productAddOns,
        });
        const showAddonField = showAddons && addonCtx.show;
        return (
        <div className="flex flex-col gap-3 mt-3">
          <fieldset
            className={`border rounded px-3 py-0 relative min-h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors w-full ${
              impressionComplete && !caseSubmitted
                ? "border-[#34a853]"
                : impressionComplete
                  ? "border-[#b4b0b0]"
                  : "border-[#CF0202]"
            }`}
            onClick={() => {
              handleOpenImpressionModal(arch, selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
            }}
          >
            <legend
              className={`text-sm px-1 leading-none ${
                impressionComplete && !caseSubmitted
                  ? "text-[#34a853]"
                  : impressionComplete
                    ? "text-[#7f7f7f]"
                    : "text-[#CF0202]"
              }`}
            >
              Impression
            </legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000] break-words">
                {impressionDisplay}
              </span>
              {impressionComplete && !caseSubmitted && (
                <Check size={16} className="text-[#34a853] ml-auto" />
              )}
            </div>
          </fieldset>

          {showAddonField ? (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                isFieldCompletedFn(arch, firstToothNumber, "addons") && !caseSubmitted
                  ? "border-[#34a853]"
                  : "border-[#b4b0b0]"
              }`}
              onClick={() => {
                handleOpenAddOnsModal(arch, selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
              }}
            >
              <legend
                className={`text-sm px-1 leading-none ${
                  isFieldCompletedFn(arch, firstToothNumber, "addons") && !caseSubmitted
                    ? "text-[#34a853]"
                    : "text-[#7f7f7f]"
                }`}
              >
                Add ons
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                  {addonCtx.display}
                </span>
                {isFieldCompletedFn(arch, firstToothNumber, "addons") && !caseSubmitted && (
                  <Check size={16} className="text-[#34a853] ml-auto" />
                )}
              </div>
            </fieldset>
          ) : null}
        </div>
        );
      })()}

    </>
  );
}
