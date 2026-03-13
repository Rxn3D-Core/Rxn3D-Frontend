"use client";

import { useRef, useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  FieldInput,
  ShadeField,
} from "./fields";
import { ImplantDetailSection } from "./ImplantDetailSection";
import type {
  Arch,
  ShadeFieldType,
  ProductApiData,
  ProductGrade,
  RetentionType,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";

/* ------------------------------------------------------------------ */
/*  Diamond SVG icons (Grade field)                                    */
/* ------------------------------------------------------------------ */
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
export function GradeDiamonds({ filledCount }: { filledCount: number }) {
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
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onOpenImpressionModal(arch, productId, toothNumber);
    }, 350);
  }, [isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
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
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  setPanelGumShadePicker: (state: { toothNumber: number; gumShades: any[]; selectedName?: string | null }) => void;
}

/* ------------------------------------------------------------------ */
/*  RemovableRestorationFields component                               */
/* ------------------------------------------------------------------ */
export function RemovableRestorationFields({
  arch,
  firstToothNumber,
  selectedProduct,
  toothNumbers,
  caseSubmitted,
  retentionTypesMap,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
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
  handleOpenAddOnsModal,
  setPanelGumShadePicker,
}: RemovableRestorationFieldsProps) {
  return (
    <>
      <AutoOpenImpressionIfEmpty
        isExpanded={isExpanded}
        isImpressionVisible={isFieldVisibleFn(arch, firstToothNumber, "impression")}
        isImpressionEmpty={!isFieldCompletedFn(arch, firstToothNumber, "impression")}
        onOpenImpressionModal={(a, productId, toothNum) => {
          const hasImplantForm = toothNumbers.some((n) => (retentionTypesMap[n] || []).includes("Implant"));
          if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
          handleOpenImpressionModal(a, productId, toothNum);
        }}
        arch={arch}
        productId={selectedProduct?.id?.toString() || `prep_${firstToothNumber}`}
        toothNumber={firstToothNumber}
      />
      {/* ===== OTHER CATEGORIES: Progressive step-by-step fields ===== */}

      {/* Implant Detail - show if any tooth in group has Implant retention */}
      {toothNumbers.some((n) => (retentionTypesMap[n] || []).includes("Implant")) && (
        <ImplantDetailSection
          toothNumber={firstToothNumber}
          onCompleteChange={(complete) => setImplantDetailCompleteByTooth((prev) => ({ ...prev, [firstToothNumber]: complete }))}
          caseSubmitted={caseSubmitted}
        />
      )}

      {/* Step 1: Grade / Stage */}
      {isFieldVisibleFn(arch, firstToothNumber, "grade") && (() => {
        const gradeRaw = getFieldValueFn(arch, firstToothNumber, "grade") || "";
        let gradeVal = gradeRaw;
        try { const p = JSON.parse(gradeRaw); gradeVal = p.name ?? gradeRaw; } catch {}
        const isGradeComplete = isFieldCompletedFn(arch, firstToothNumber, "grade");
        const showGradeGreen = isGradeComplete && !caseSubmitted;
        const productGrades = getActiveGrades(selectedProduct?.grades);
        const hasGrades = productGrades.length > 0;
        const showStage = isFieldVisibleFn(arch, firstToothNumber, "stage");
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
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                isFieldCompletedFn(arch, firstToothNumber, "stage") && !caseSubmitted
                  ? "border-[#34a853]"
                  : isFieldCompletedFn(arch, firstToothNumber, "stage")
                    ? "border-[#b4b0b0]"
                    : "border-[#CF0202]"
              }`}
              onClick={() => {
                handleOpenStageModal(`${arch}_prep_${firstToothNumber}`, arch, firstToothNumber);
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
                  {getFieldValueFn(arch, firstToothNumber, "stage")}
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
      {isFieldVisibleFn(arch, firstToothNumber, "teeth_shade") && (() => {
        const showGumShade = isFieldVisibleFn(arch, firstToothNumber, "gum_shade");
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
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
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
              if (!isFieldCompletedFn(arch, firstToothNumber, "teeth_shade")) {
                completeFieldStepFn(arch, firstToothNumber, "teeth_shade", "Vita Classical");
              }
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
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000]">
                {(() => { const r = getFieldValueFn(arch, firstToothNumber, "teeth_shade"); try { return JSON.parse(r).name ?? r; } catch { return r; } })()}
              </span>
              {isFieldCompletedFn(arch, firstToothNumber, "teeth_shade") && !caseSubmitted && (
                <Check size={16} className="text-[#34a853] ml-auto" />
              )}
            </div>
          </fieldset>

          {isFieldVisibleFn(arch, firstToothNumber, "gum_shade") ? (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
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
              <div className="flex items-center gap-2 w-full">
                {(() => {
                  const raw = getFieldValueFn(arch, firstToothNumber, "gum_shade");
                  let displayName = raw;
                  let color: string | null = null;
                  try { const p = JSON.parse(raw); displayName = p.name ?? raw; } catch {}
                  const matchedShade = selectedProduct?.gum_shades?.find((s) => s.name === displayName);
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
      {isFieldVisibleFn(arch, firstToothNumber, "impression") && (() => {
        const showAddons = isFieldVisibleFn(arch, firstToothNumber, "addons");
        return (
        <div className={`grid grid-cols-1 ${showAddons ? "sm:grid-cols-2" : ""} gap-3 mt-3`}>
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
              isFieldCompletedFn(arch, firstToothNumber, "impression") && !caseSubmitted
                ? "border-[#34a853]"
                : isFieldCompletedFn(arch, firstToothNumber, "impression")
                  ? "border-[#b4b0b0]"
                  : "border-[#CF0202]"
            }`}
            onClick={() => {
              const hasImplantForm = toothNumbers.some((n) => (retentionTypesMap[n] || []).includes("Implant"));
              if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
              handleOpenImpressionModal(arch, selectedProduct?.id?.toString() || `prep_${firstToothNumber}`, firstToothNumber);
            }}
          >
            <legend
              className={`text-sm px-1 leading-none ${
                isFieldCompletedFn(arch, firstToothNumber, "impression") && !caseSubmitted
                  ? "text-[#34a853]"
                  : isFieldCompletedFn(arch, firstToothNumber, "impression")
                    ? "text-[#7f7f7f]"
                    : "text-[#CF0202]"
              }`}
            >
              Impression
            </legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                {getFieldValueFn(arch, firstToothNumber, "impression")}
              </span>
              {isFieldCompletedFn(arch, firstToothNumber, "impression") && !caseSubmitted && (
                <Check size={16} className="text-[#34a853] ml-auto" />
              )}
            </div>
          </fieldset>

          {isFieldVisibleFn(arch, firstToothNumber, "addons") && getFieldValueFn(arch, firstToothNumber, "addons") ? (
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
                  {getFieldValueFn(arch, firstToothNumber, "addons")}
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
