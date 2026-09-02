"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Check } from "@/components/ui/custom-check";
import {
  FieldInput,
  ShadeField,
} from "./fields";
import {
  formatShadeFieldLabel,
  getGumShadePreviewColor,
  SHADE_FIELD_LABEL_CLASS,
  type ShadeCatalogRow,
} from "../utils/shadeFieldDisplay";
import { resolveGumShadesForDisplay } from "../utils/gradeHelpers";
import { GumShadePreviewSwatch } from "./GumShadePreviewSwatch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Arch,
  ShadeFieldType,
  ShadeSelectionState,
  ProductApiData,
  RetentionType,
} from "../types";
import { FixedAccordionShadePicker } from "./FixedAccordionShadePicker";
import { ShadeDetailSection } from "./ShadeDetailSection";
import { GumShadePicker } from "./GumShadePicker";
import { TeethShadePreviewIcon } from "./TeethShadePreviewIcon";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import {
  FIXED_RETENTION_MECHANISM_FIELD_STEP,
  getRetentionFieldChain,
} from "../hooks/useToothFieldProgress";
import {
  getSuggestedRetentionMechanismTypes,
  serializeRetentionMechanismSelection,
} from "../utils/retentionMechanismTypes";
import { resolveVariationDisplay } from "../utils/variationHelpers";
import type { ImplantDetailData } from "./ImplantDetailSection";
import { ImplantDetailBoxes } from "./ImplantDetailBoxes";
import {
  areAllImplantDetailsComplete,
  getImplantTeethInGroup,
  hasPostImplantFixedFieldProgress,
  POST_IMPLANT_FIXED_FIELD_STEPS,
} from "../utils/implantDetailHelpers";
import { useCrossArchImplantMirror } from "../hooks/useCrossArchImplantMirror";
import { shouldSkipStageSelection, parseStageDisplayName } from "../utils/categoryHelpers";
import {
  productHasGrades,
  getActiveGrades,
  parseGradeDisplayName,
  isGradeStepCompleteForDisplay,
} from "../utils/gradeHelpers";
import { GradeHoverSelector } from "./RemovableRestorationFields";
import { parseAddonDisplayItems, productSupportsAddons } from "../utils/addonDisplayHelpers";
import {
  getShadeGuideAdvanceFields,
  getShadeFieldType,
  areFixedProductShadesComplete,
  getDisplayedShadeGuideFields,
  getFirstMissingShadeGuideField,
  isStumpLikeShadeField,
  getShadeGuideOptionsFromProduct,
  resolveFixedShadeProductId,
  buildShadeSelectionKey,
} from "../utils/shadeGuideAdvanceFields";
import type { SlipImpressionSelections } from "../utils/impressionStorage";
import {
  ARCH_IMPRESSION_PRODUCT_ID,
  archHasActiveImpressionSelections,
} from "../utils/impressionFieldSync";
import { useAutoOpenSuppressed } from "./auto-open-suppression";

/** Removaables-style display name from a field value (plain string or JSON `{ name }`). */
function parseShadeFieldDisplayName(raw: string | undefined | null): string {
  if (!raw?.trim()) return "";
  try {
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.name === "string" && parsed.name) return parsed.name;
      const nested = Object.values(parsed ?? {}).find(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { name?: unknown }).name === "string" &&
          !!(entry as { name: string }).name
      ) as { name: string } | undefined;
      if (nested?.name) return nested.name;
    }
  } catch {
    /* plain string */
  }
  return raw.trim();
}

/** Placeholder values written by sync effects — not real shade selections. */
const SHADE_PLACEHOLDER_VALUES = new Set([
  "shade-sync",
  "shade-sync-skip-stump",
  "selected",
]);

function isRealShadeDisplayValue(raw: string | undefined | null): boolean {
  const name = parseShadeFieldDisplayName(raw);
  if (!name) return false;
  return !SHADE_PLACEHOLDER_VALUES.has(name.trim().toLowerCase());
}

/** Fixed gum shade may be stored on the group stage tooth or any tooth in the bridge. */
function resolveFixedGumShadeRaw(
  arch: Arch,
  toothNumbers: number[],
  firstToothNumber: number,
  groupStageToothNumber: number,
  getFieldValue: (arch: Arch, toothNumber: number, step: string) => string,
  getSelectedShade: (productId: string, arch: Arch, shadeType: ShadeFieldType) => string,
  fixedShadeProductId: string
): string {
  const toothCandidates = [...new Set([firstToothNumber, groupStageToothNumber, ...toothNumbers])];
  for (const tn of toothCandidates) {
    const raw = getFieldValue(arch, tn, "fixed_stump_shade");
    if (isRealShadeDisplayValue(raw)) return raw;
  }
  return getSelectedShade(fixedShadeProductId, arch, "stump_shade") || "";
}

/* ------------------------------------------------------------------ */
/*  Articulator icon (Stage field)                                     */
/* ------------------------------------------------------------------ */
function ArticulatorIcon({ arch }: { arch: "mandibular" | "maxillary" }) {
  const patternId = `pattern0_${arch}`;
  const imageId = `image0_${arch}`;
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
/*  hasAdvanceField                                                     */
/* ------------------------------------------------------------------ */
type ProductShadeFlags = {
  has_teeth_shade?: string | null;
  has_gum_shade?: string | null;
  advance_fields?: Array<{ name: string; field_type: string }>;
};

/**
 * Check whether a FIXED_FIELD_STEPS key has a matching advance_field in the product API response.
 * Returns true (show the field) when:
 *  - No advance_fields on the product (show all — no gating)
 *  - The step always shows regardless of advance_fields (stage, impression, addons, notes)
 *  - A matching advance_field name is found
 *  - For shade steps: has_teeth_shade or has_gum_shade flag is "Yes" (overrides advance_fields)
 */
export function hasAdvanceField(
  step: string,
  advanceFields: Array<{ name: string; field_type: string }> | undefined,
  product?: ProductShadeFlags | null
): boolean {
  if ((step === "stage" || step === "fixed_stage") && shouldSkipStageSelection(product)) {
    return false;
  }
  if (step === "addons" || step === "fixed_addons") {
    return productSupportsAddons(product as ProductApiData | null);
  }
  const alwaysShow = ["fixed_stage", "fixed_impression", "stage", "impression"];
  if (alwaysShow.includes(step)) return true;

  const hasTeethShadeFlag = product?.has_teeth_shade === "Yes";
  const hasGumShadeFlag = product?.has_gum_shade === "Yes";

  // Shade steps: show when the matching has_* flag is set, regardless of advance_fields.
  // Stump shade is gated on gum shade only — a teeth-shade-only product must not show it.
  if (step === "fixed_stump_shade") {
    if (hasGumShadeFlag) return true;
  }
  if (step === "fixed_shade_trio") {
    if (hasTeethShadeFlag) return true;
  }

  if (!advanceFields || advanceFields.length === 0) {
    return false;
  }

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
      return productHasGrades(product as ProductApiData) || names.some((n) => n.includes("grade"));
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

/* ------------------------------------------------------------------ */
/*  getAdvanceFieldsForStep                                            */
/* ------------------------------------------------------------------ */
/** Get advance fields from the API that match a given step pattern */
export function getAdvanceFieldsForStep(
  step: string,
  advanceFields: Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number; [key: string]: any }> | undefined
): Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number; [key: string]: any }> {
  if (!advanceFields || advanceFields.length === 0) return [];

  const matchers: Record<string, (n: string) => boolean> = {
    fixed_characterization: (n) => n.includes("characterization") || n.includes("character") || n.includes("intensity") || n.includes("surface finish") || n.includes("surface_finish"),
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

/* ------------------------------------------------------------------ */
/*  AdvanceFieldSelect                                                 */
/* ------------------------------------------------------------------ */
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
  activeOptions: Array<{ id: number; name: string; is_default?: string; image_url?: string | null; [key: string]: any }>;
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
  const selectedOption = activeOptions.find((o) => o.id === currentSelection?.optionId);
  const selectedImageUrl = selectedOption?.image_url ?? null;

  return (
    <fieldset
      className="border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 cursor-pointer hover:bg-gray-50 transition-colors"
      style={{ borderColor }}
      onClick={() => setOpen(true)}
    >
      <legend className="text-sm px-1 leading-none whitespace-nowrap" style={{ color: labelColor }}>
        {fieldName}
      </legend>
      <div className="flex items-center gap-2 w-full min-w-0">
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
            className="border-0 shadow-none p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden text-lg font-normal text-[#000000] min-w-0 flex-1 bg-transparent"
          >
            <SelectValue>
              {currentSelection ? currentSelection.name : ''}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {activeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id.toString()}>
                <div className="flex items-center gap-2">
                  {option.image_url && (
                    <img src={option.image_url} alt={option.name} className="w-6 h-6 object-contain flex-shrink-0" />
                  )}
                  {option.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected option image — shown on the right of the field */}
        {selectedImageUrl && (
          <img
            src={selectedImageUrl}
            alt={currentSelection?.name ?? ""}
            className="h-8 w-8 object-contain flex-shrink-0"
          />
        )}
        {hasVal && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/*  FixedRestorationFields props                                       */
/* ------------------------------------------------------------------ */
interface FixedRestorationFieldsProps {
  arch: "mandibular" | "maxillary";
  isExpanded: boolean;
  firstToothNumber: number;
  groupStageToothNumber: number;
  groupStageProductIdFixed: string;
  selectedProduct: ProductApiData | null;
  toothNumbers: number[];
  retentionTypes: string[];
  caseSubmitted: boolean;
  /** When true, implant / impression / etc. stay hidden until all required shades are set. */
  fixedShadeIncomplete: boolean;
  usesAccordionShadePicker?: boolean;
  shadeSelectionState?: ShadeSelectionState;
  setShadeSelectionState?: (
    state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)
  ) => void;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  setSelectedShadeGuide: (v: string) => void;
  shadeGuideOptions: string[];
  handleShadeSelect: (shade: string) => void;
  selectedShadeGuide: string;
  selectedStages: Record<string, string>;
  retentionTypesMap: Record<number, string[]>;
  implantDetailCompleteByTooth: Record<number, boolean>;
  setImplantDetailCompleteByTooth: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  implantDetailByTooth: Record<number, ImplantDetailData>;
  setImplantDetailByTooth: React.Dispatch<React.SetStateAction<Record<number, ImplantDetailData>>>;
  isFieldVisible: (arch: Arch, toothNumber: number, step: FieldStep, fixedChain?: readonly string[]) => boolean;
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  completeFieldStep: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  storeFieldValue: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  uncompleteFieldStep: (arch: Arch, toothNumber: number, step: FieldStep) => void;
  isFixed: (step: string) => boolean;
  getSelectedShade: (productId: string, arch: string, shadeType: string, advanceFieldId?: number | null) => any;
  handleOpenStageModal: (productId: string, arch?: Arch, toothNumber?: number) => void;
  handleShadeFieldClick: (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string,
    options?: {
      advanceFieldId?: number | null;
      advanceFieldLabel?: string | null;
      storageToothNumber?: number | null;
    }
  ) => void;
  handleOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  getImpressionDisplayText: (productId: string, arch: string) => string;
  setPanelGumShadePicker: (state: { toothNumber: number; gumShades: any[]; selectedName?: string | null }) => void;
  /** Direct write into the shade-selection map (classic gum must also land as stump_shade). */
  setSelectedShades?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  migrateFixedShadeProductId?: (fromProductId: string, toProductId: string, arch: Arch) => void;
  /** Implant details from the opposite arch (same product) for cross-arch mirroring. */
  peerImplantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Opposite-arch implant completion state for more accurate source-tooth selection during mirror. */
  peerImplantCompleteByTooth?: Record<number, boolean>;
  /** Arch-level: only one implant detail accordion open at a time on this side. */
  expandedImplantTooth?: number;
  onExpandedImplantToothChange?: (toothNumber: number | undefined) => void;
  /** Arch-wide impression qty grid (shared by all fixed/removable products on this jaw). */
  selectedImpressions?: SlipImpressionSelections;
  /** Lab customer id owning the product catalog (office flows select the lab in the wizard). */
  labCustomerId?: number | null;
}

/* ------------------------------------------------------------------ */
/*  FixedRestorationFields component                                   */
/* ------------------------------------------------------------------ */
export function RetentionProductFields({
  arch,
  isExpanded,
  firstToothNumber,
  groupStageToothNumber,
  groupStageProductIdFixed,
  selectedProduct,
  toothNumbers,
  retentionTypes,
  caseSubmitted,
  fixedShadeIncomplete,
  usesAccordionShadePicker = false,
  shadeSelectionState,
  setShadeSelectionState,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  setSelectedShadeGuide,
  shadeGuideOptions,
  handleShadeSelect,
  selectedShadeGuide,
  selectedStages,
  retentionTypesMap,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
  implantDetailByTooth,
  setImplantDetailByTooth,
  isFieldVisible,
  isFieldCompleted,
  getFieldValue,
  completeFieldStep,
  storeFieldValue,
  uncompleteFieldStep,
  isFixed,
  getSelectedShade,
  handleOpenStageModal,
  handleShadeFieldClick,
  handleOpenImpressionModal,
  handleOpenAddOnsModal,
  getImpressionDisplayText,
  setPanelGumShadePicker,
  setSelectedShades,
  migrateFixedShadeProductId,
  peerImplantDetailByTooth,
  peerImplantCompleteByTooth,
  expandedImplantTooth,
  onExpandedImplantToothChange,
  selectedImpressions = { maxillary: [], mandibular: [] },
  labCustomerId,
}: FixedRestorationFieldsProps) {
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
  const implantDetailReady = areAllImplantDetailsComplete(
    implantTeeth,
    implantDetailCompleteByTooth,
    implantDetailByTooth
  );
  const fixedChain = useMemo(
    () => getRetentionFieldChain(selectedProduct?.advance_fields, selectedProduct),
    [selectedProduct]
  );
  const hasPostImplantProgress = useMemo(
    () =>
      toothNumbers.some((tn) =>
        hasPostImplantFixedFieldProgress(arch, tn, isFieldCompleted, getFieldValue)
      ),
    [arch, toothNumbers, isFieldCompleted, getFieldValue]
  );
  /**
   * Post-implant steps (characterization → impression) require implant detail when the
   * group has implant teeth — unless the user already progressed (e.g. added a new implant).
   */
  const showPostImplantFields =
    implantTeeth.length === 0 || implantDetailReady || hasPostImplantProgress;
  const showImpressionAndAddons = showPostImplantFields;
  const isFixedAfterImplant = useCallback(
    (step: string): boolean => {
      const isPostImplantStep = (POST_IMPLANT_FIXED_FIELD_STEPS as readonly string[]).includes(
        step
      );
      if (isPostImplantStep && !showPostImplantFields) return false;
      if (isFixed(step)) return true;
      if (!hasPostImplantProgress || !isPostImplantStep) return false;
      const fieldStep = step as FieldStep;
      return (
        isFieldCompleted(arch, firstToothNumber, fieldStep) ||
        !!getFieldValue(arch, firstToothNumber, fieldStep)?.trim()
      );
    },
    [
      arch,
      firstToothNumber,
      isFixed,
      hasPostImplantProgress,
      showPostImplantFields,
      isFieldCompleted,
      getFieldValue,
    ]
  );
  const impressionModalProductId = ARCH_IMPRESSION_PRODUCT_ID;
  const impressionDisplayText =
    getImpressionDisplayText(impressionModalProductId, arch)?.trim() ?? "";
  const impressionHasArchSelections = archHasActiveImpressionSelections(
    selectedImpressions,
    impressionModalProductId,
    arch
  );
  const impressionComplete =
    isFieldCompleted(arch, firstToothNumber, "fixed_impression") ||
    impressionHasArchSelections ||
    !!impressionDisplayText;
  const impressionEmpty = !impressionDisplayText && !impressionHasArchSelections;
  const fixedShadeProductId = resolveFixedShadeProductId(
    selectedProduct?.id,
    groupStageToothNumber
  );

  useEffect(() => {
    if (!migrateFixedShadeProductId || !selectedProduct?.id) return;
    for (const tn of toothNumbers) {
      migrateFixedShadeProductId(`fixed_${tn}`, fixedShadeProductId, arch);
    }
  }, [
    migrateFixedShadeProductId,
    selectedProduct?.id,
    fixedShadeProductId,
    arch,
    toothNumbers.join(","),
  ]);
  const namedShadeGuideFields = getShadeGuideAdvanceFields(selectedProduct?.advance_fields);
  const namedStumpShadeFields = namedShadeGuideFields.filter((field) => isStumpLikeShadeField(field));
  const namedToothShadeFields = namedShadeGuideFields.filter((field) => !isStumpLikeShadeField(field));
  const isAccordionShadePickerActive =
    shadeSelectionState?.arch === arch &&
    shadeSelectionState?.productId === fixedShadeProductId &&
    shadeSelectionState?.fieldType != null &&
    // Named advance shade_guide fields use the in-accordion picker.
    // Classic/general Teeth Shade (has_teeth_shade, no named guides) uses the
    // panel ShadeSelectionGuide above the chart — not this bottom block.
    usesAccordionShadePicker;
  const [inlineGumPickerOpen, setInlineGumPickerOpen] = useState(false);
  const shadeEditActiveFieldId =
    isAccordionShadePickerActive && shadeSelectionState?.fillMode === "edit"
      ? shadeSelectionState.advanceFieldId ?? null
      : null;
  const getSelectedShadeForDisplay = getSelectedShade as (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string;
  const resolveVisibleShadeFields = (fields: typeof namedStumpShadeFields) =>
    usesAccordionShadePicker
      ? getDisplayedShadeGuideFields(fields, fixedShadeProductId, arch, getSelectedShadeForDisplay, {
          editActiveFieldId: shadeEditActiveFieldId,
        })
      : fields;
  const visibleStumpShadeFields = resolveVisibleShadeFields(namedStumpShadeFields);
  const visibleToothShadeFields = resolveVisibleShadeFields(namedToothShadeFields);
  const visibleNamedShadeFieldsOrdered = resolveVisibleShadeFields(namedShadeGuideFields);
  const namedShadesComplete =
    namedShadeGuideFields.length > 0 &&
    areFixedProductShadesComplete(
      selectedProduct?.advance_fields,
      fixedShadeProductId,
      arch,
      getSelectedShadeForDisplay,
      {
        needsStumpShade: namedStumpShadeFields.length > 0,
        needsToothShade: namedToothShadeFields.length > 0,
        classicShadeFlags: false,
      }
    );
  const isSingleShadeEdit = shadeEditActiveFieldId != null;
  const usesNamedShadeGuideFields = namedShadeGuideFields.length > 0;
  const hasClassicTeethShadeFlag = selectedProduct?.has_teeth_shade === "Yes";
  const hasClassicGumShadeFlag = selectedProduct?.has_gum_shade === "Yes";
  const hasClassicShadeFlags = hasClassicTeethShadeFlag || hasClassicGumShadeFlag;
  const autoOpenSuppressed = useAutoOpenSuppressed();
  const gradeComplete = !productHasGrades(selectedProduct) || isGradeStepCompleteForDisplay(
    getFieldValue(arch, firstToothNumber, "grade"),
    isFieldCompleted(arch, firstToothNumber, "grade"),
    selectedProduct
  );
  const effectiveShadeGuideOptions =
    shadeGuideOptions.length > 0
      ? shadeGuideOptions
      : getShadeGuideOptionsFromProduct(selectedProduct);
  const displayGumShades = resolveGumShadesForDisplay(selectedProduct);
  const showFixedStage =
    !shouldSkipStageSelection(selectedProduct) && isFixed("fixed_stage");
  const impressionVisible =
    isFixedAfterImplant("fixed_impression") && showImpressionAndAddons;
  const hasAutoOpenedImpressionRef = useRef(false);
  const impressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Key of the shade field last auto-opened, so each newly revealed field opens once. */
  const autoOpenedShadeKeyRef = useRef<string | null>(null);
  const shadeAutoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Named shade-guide UI can be complete while fixed_shade_trio / fixed_stump_shade stay
   * unmarked — that blocks post-implant fields. Only sync placeholders when classic
   * Teeth/Gum are NOT required (named-only products). Classic has_* shades must keep a
   * real value, never "shade-sync".
   */
  useEffect(() => {
    if (caseSubmitted || fixedShadeIncomplete) return;
    if (hasClassicShadeFlags) return;

    if (
      fixedChain.includes("fixed_shade_trio") &&
      !isFieldCompleted(arch, firstToothNumber, "fixed_shade_trio")
    ) {
      completeFieldStep(arch, firstToothNumber, "fixed_shade_trio", "shade-sync");
    }

    const hasNamedStumpFields = namedStumpShadeFields.length > 0;
    if (
      fixedChain.includes("fixed_stump_shade") &&
      !hasNamedStumpFields &&
      !isFieldCompleted(arch, firstToothNumber, "fixed_stump_shade")
    ) {
      completeFieldStep(arch, firstToothNumber, "fixed_stump_shade", "shade-sync-skip-stump");
    }
  }, [
    arch,
    caseSubmitted,
    completeFieldStep,
    firstToothNumber,
    fixedChain,
    fixedShadeIncomplete,
    hasClassicShadeFlags,
    isFieldCompleted,
    namedStumpShadeFields.length,
  ]);

  /** Edit preload marks the whole fixed chain complete — clear empty shade steps so the
   *  UI shows red (incomplete) instead of a green empty box, and the picker can open. */
  useEffect(() => {
    if (caseSubmitted || !hasClassicShadeFlags) return;

    if (hasClassicTeethShadeFlag) {
      const raw = getFieldValue(arch, firstToothNumber, "fixed_shade_trio");
      const hasReal =
        isRealShadeDisplayValue(raw) ||
        !!getSelectedShade(fixedShadeProductId, arch, "tooth_shade");
      if (!hasReal && isFieldCompleted(arch, firstToothNumber, "fixed_shade_trio")) {
        uncompleteFieldStep(arch, firstToothNumber, "fixed_shade_trio");
      }
    }

    if (hasClassicGumShadeFlag) {
      const raw = getFieldValue(arch, firstToothNumber, "fixed_stump_shade");
      const hasReal =
        isRealShadeDisplayValue(raw) ||
        !!getSelectedShade(fixedShadeProductId, arch, "stump_shade");
      if (!hasReal && isFieldCompleted(arch, firstToothNumber, "fixed_stump_shade")) {
        uncompleteFieldStep(arch, firstToothNumber, "fixed_stump_shade");
      }
    }
  }, [
    arch,
    caseSubmitted,
    firstToothNumber,
    fixedShadeProductId,
    getFieldValue,
    getSelectedShade,
    hasClassicGumShadeFlag,
    hasClassicShadeFlags,
    hasClassicTeethShadeFlag,
    isFieldCompleted,
    uncompleteFieldStep,
  ]);

  // Close inline gum picker when the teeth shade accordion picker opens.
  useEffect(() => {
    if (shadeSelectionState?.arch === arch && shadeSelectionState?.fieldType != null) {
      setInlineGumPickerOpen(false);
    }
  }, [arch, shadeSelectionState?.arch, shadeSelectionState?.fieldType]);

  useEffect(() => {
    if (caseSubmitted || !setShadeSelectionState) return;
    if (isExpanded) return;
    if (
      shadeSelectionState?.arch === arch &&
      shadeSelectionState?.productId === fixedShadeProductId
    ) {
      setShadeSelectionState({
        arch: null,
        fieldType: null,
        productId: null,
        advanceFieldId: null,
        advanceFieldLabel: null,
        fillMode: null,
      });
    }
  }, [
    arch,
    caseSubmitted,
    fixedShadeProductId,
    isExpanded,
    setShadeSelectionState,
    shadeSelectionState?.arch,
    shadeSelectionState?.productId,
  ]);

  useEffect(() => {
    if (caseSubmitted) return;
    if (!isExpanded) {
      hasAutoOpenedImpressionRef.current = false;
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = null;
      }
      return;
    }
    if (!impressionVisible || !impressionEmpty) {
      hasAutoOpenedImpressionRef.current = false;
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = null;
      }
      return;
    }
    if (hasAutoOpenedImpressionRef.current) return;

    hasAutoOpenedImpressionRef.current = true;
    if (impressionTimerRef.current) clearTimeout(impressionTimerRef.current);
    impressionTimerRef.current = setTimeout(() => {
      impressionTimerRef.current = null;
      handleOpenImpressionModal(arch, impressionModalProductId, firstToothNumber);
    }, 150);
  }, [
    arch,
    caseSubmitted,
    firstToothNumber,
    handleOpenImpressionModal,
    impressionEmpty,
    impressionModalProductId,
    impressionVisible,
    isExpanded,
  ]);

  /**
   * Auto-open the shade picker for the first empty shade field so the user
   * doesn't have to click it — mirrors the impression auto-open above.
   * Waits for stage selection (when the product has stages) so it doesn't
   * compete with the stage modal.
   */
  useEffect(() => {
    const clearShadeTimer = () => {
      if (shadeAutoOpenTimerRef.current) {
        clearTimeout(shadeAutoOpenTimerRef.current);
        shadeAutoOpenTimerRef.current = null;
      }
    };
    // Edit-slip preload already has values — do not reopen the picker in a loop.
    if (caseSubmitted || autoOpenSuppressed) return;
    if (!isExpanded) {
      autoOpenedShadeKeyRef.current = null;
      clearShadeTimer();
      return;
    }
    // A shade picker is already open (here or on another card) — don't stomp it.
    if (shadeSelectionState?.fieldType != null) return;

    const stageValue =
      selectedStages[groupStageProductIdFixed] ||
      getFieldValue(arch, groupStageToothNumber, "fixed_stage");
    const stageComplete =
      isFieldCompleted(arch, groupStageToothNumber, "fixed_stage") ||
      !!(stageValue && stageValue.trim());
    if (!shouldSkipStageSelection(selectedProduct) && !stageComplete) {
      autoOpenedShadeKeyRef.current = null;
      clearShadeTimer();
      return;
    }

    // Wait for grade selection before opening shade — grade modal and shade picker
    // would overlap if both opened simultaneously, and the ref would already be set
    // preventing shade from re-opening once grade is chosen.
    if (!gradeComplete) {
      autoOpenedShadeKeyRef.current = null;
      clearShadeTimer();
      return;
    }

    const classicTeethRaw = getFieldValue(arch, firstToothNumber, "fixed_shade_trio");
    const classicTeethMissing =
      hasClassicTeethShadeFlag &&
      isFixed("fixed_shade_trio") &&
      !parseShadeFieldDisplayName(classicTeethRaw) &&
      !getSelectedShade(fixedShadeProductId, arch, "tooth_shade");

    // Named shade_guide fields are separate from classic Teeth/Gum. Prefer classic
    // teeth shade (removaables-style) when the product has has_teeth_shade.
    const firstMissingNamed =
      !hasClassicShadeFlags && usesNamedShadeGuideFields
        ? getFirstMissingShadeGuideField(
            selectedProduct?.advance_fields,
            fixedShadeProductId,
            arch,
            getSelectedShadeForDisplay
          )
        : null;
    const legacyTeethShadeMissing =
      !hasClassicTeethShadeFlag &&
      !usesNamedShadeGuideFields &&
      isFixed("fixed_shade_trio") &&
      hasAdvanceField("fixed_shade_trio", selectedProduct?.advance_fields, selectedProduct) &&
      !getSelectedShade(fixedShadeProductId, arch, "tooth_shade");

    const target = classicTeethMissing
      ? {
          key: `${fixedShadeProductId}|${arch}|tooth_shade`,
          fieldType: "tooth_shade" as ShadeFieldType,
          options: { storageToothNumber: firstToothNumber },
        }
      : firstMissingNamed
        ? {
            key: `${fixedShadeProductId}|${arch}|${firstMissingNamed.id}`,
            fieldType: firstMissingNamed.fieldType,
            options: {
              advanceFieldId: firstMissingNamed.id,
              advanceFieldLabel: firstMissingNamed.name,
              storageToothNumber: firstToothNumber,
            },
          }
        : legacyTeethShadeMissing
          ? {
              key: `${fixedShadeProductId}|${arch}|tooth_shade`,
              fieldType: "tooth_shade" as ShadeFieldType,
              options: { storageToothNumber: firstToothNumber },
            }
          : null;
    if (!target) {
      autoOpenedShadeKeyRef.current = null;
      clearShadeTimer();
      return;
    }
    if (autoOpenedShadeKeyRef.current === target.key) return;

    autoOpenedShadeKeyRef.current = target.key;
    clearShadeTimer();
    shadeAutoOpenTimerRef.current = setTimeout(() => {
      shadeAutoOpenTimerRef.current = null;
      handleShadeFieldClick(arch, target.fieldType, fixedShadeProductId, target.options);
    }, 150);
  }, [
    arch,
    autoOpenSuppressed,
    caseSubmitted,
    firstToothNumber,
    fixedShadeProductId,
    getFieldValue,
    getSelectedShade,
    getSelectedShadeForDisplay,
    gradeComplete,
    groupStageProductIdFixed,
    groupStageToothNumber,
    handleShadeFieldClick,
    hasClassicShadeFlags,
    hasClassicTeethShadeFlag,
    isExpanded,
    isFieldCompleted,
    isFixed,
    selectedProduct,
    selectedStages,
    shadeSelectionState?.fieldType,
    usesNamedShadeGuideFields,
  ]);

  useEffect(() => {
    return () => {
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
      }
      if (shadeAutoOpenTimerRef.current) {
        clearTimeout(shadeAutoOpenTimerRef.current);
      }
    };
  }, []);

  // Auto-complete steps whose advance_fields are empty — must be in useEffect, not inline during render
  useEffect(() => {
    if (!showPostImplantFields) return;
    if (!isFixed("fixed_characterization")) return;
    if (!hasAdvanceField("fixed_characterization", selectedProduct?.advance_fields)) return;
    const fields = getAdvanceFieldsForStep("fixed_characterization", selectedProduct?.advance_fields);
    if (fields.length === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_characterization")) {
      completeFieldStep(arch, firstToothNumber, "fixed_characterization", "auto");
    }
  }, [arch, firstToothNumber, selectedProduct, isFixed, isFieldCompleted, completeFieldStep, showPostImplantFields]);

  useEffect(() => {
    if (!showPostImplantFields) return;
    if (!isFixed("fixed_margin")) return;
    if (!hasAdvanceField("fixed_margin", selectedProduct?.advance_fields)) return;
    const fields = getAdvanceFieldsForStep("fixed_margin", selectedProduct?.advance_fields);
    if (fields.length === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_margin")) {
      completeFieldStep(arch, firstToothNumber, "fixed_margin", "auto");
    }
  }, [arch, firstToothNumber, selectedProduct, isFixed, isFieldCompleted, completeFieldStep, showPostImplantFields]);

  useEffect(() => {
    if (!showPostImplantFields) return;
    if (!isFixed("fixed_metal")) return;
    if (!hasAdvanceField("fixed_metal", selectedProduct?.advance_fields)) return;
    const fields = getAdvanceFieldsForStep("fixed_metal", selectedProduct?.advance_fields);
    if (fields.length === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_metal")) {
      completeFieldStep(arch, firstToothNumber, "fixed_metal", "auto");
    }
  }, [arch, firstToothNumber, selectedProduct, isFixed, isFieldCompleted, completeFieldStep, showPostImplantFields]);

  useEffect(() => {
    if (!showPostImplantFields) return;
    if (!isFixed("fixed_contact_icons")) return;
    if (!hasAdvanceField("fixed_contact_icons", selectedProduct?.advance_fields)) return;
    const fields = getAdvanceFieldsForStep("fixed_contact_icons", selectedProduct?.advance_fields);
    if (fields.length === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_contact_icons")) {
      completeFieldStep(arch, firstToothNumber, "fixed_contact_icons", "auto");
    }
  }, [arch, firstToothNumber, selectedProduct, isFixed, isFieldCompleted, completeFieldStep, showPostImplantFields]);

  useEffect(() => {
    if (!showPostImplantFields) return;
    if (!isFixed("fixed_proximal_contact")) return;
    if (!hasAdvanceField("fixed_proximal_contact", selectedProduct?.advance_fields)) return;
    const fields = getAdvanceFieldsForStep("fixed_proximal_contact", selectedProduct?.advance_fields);
    if (fields.length === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_proximal_contact")) {
      completeFieldStep(arch, firstToothNumber, "fixed_proximal_contact", "auto");
    }
  }, [arch, firstToothNumber, selectedProduct, isFixed, isFieldCompleted, completeFieldStep, showPostImplantFields]);

  const toothNumbersKey = useMemo(
    () => [...toothNumbers].sort((a, b) => a - b).join(","),
    [toothNumbers]
  );

  const availableRetentionMechanismTypes = useMemo(
    () =>
      getSuggestedRetentionMechanismTypes(
        selectedProduct,
        retentionTypesMap,
        toothNumbers
      ),
    [selectedProduct, retentionTypesMap, toothNumbers, toothNumbersKey]
  );

  const availableRetentionMechanismTypesKey =
    availableRetentionMechanismTypes.join(",");

  const retentionMechanismSelectionKey = useMemo(() => {
    if (!toothNumbersKey) return "";
    return toothNumbersKey
      .split(",")
      .map((tn) => {
        const n = Number(tn);
        return `${n}:${(retentionTypesMap[n] || []).join("|")}`;
      })
      .join(",");
  }, [toothNumbersKey, retentionTypesMap]);

  const showRetentionMechanismField = availableRetentionMechanismTypes.length > 0;

  const materialDisplay = useMemo(
    () => resolveVariationDisplay(selectedProduct, toothNumbers.length),
    [selectedProduct, toothNumbers.length]
  );

  useEffect(() => {
    if (caseSubmitted) return;

    const currentValue = getFieldValue(
      arch,
      firstToothNumber,
      FIXED_RETENTION_MECHANISM_FIELD_STEP
    );
    const isComplete = isFieldCompleted(
      arch,
      firstToothNumber,
      FIXED_RETENTION_MECHANISM_FIELD_STEP
    );

    if (availableRetentionMechanismTypes.length === 0) {
      if (currentValue === "" && !isComplete) return;
      if (currentValue !== "") {
        storeFieldValue(arch, firstToothNumber, FIXED_RETENTION_MECHANISM_FIELD_STEP, "");
      }
      if (isComplete) {
        uncompleteFieldStep(arch, firstToothNumber, FIXED_RETENTION_MECHANISM_FIELD_STEP);
      }
      return;
    }

    const serialized = serializeRetentionMechanismSelection(
      availableRetentionMechanismTypes
    );
    if (currentValue === serialized && isComplete) return;

    if (currentValue !== serialized) {
      storeFieldValue(arch, firstToothNumber, FIXED_RETENTION_MECHANISM_FIELD_STEP, serialized);
    }
    if (!isComplete || currentValue !== serialized) {
      completeFieldStep(arch, firstToothNumber, FIXED_RETENTION_MECHANISM_FIELD_STEP, serialized);
    }
  }, [
    arch,
    firstToothNumber,
    caseSubmitted,
    retentionMechanismSelectionKey,
    availableRetentionMechanismTypesKey,
    storeFieldValue,
    completeFieldStep,
    uncompleteFieldStep,
    getFieldValue,
    isFieldCompleted,
  ]);

  const retentionTypeDisplay =
    getFieldValue(arch, firstToothNumber, FIXED_RETENTION_MECHANISM_FIELD_STEP) ||
    serializeRetentionMechanismSelection(availableRetentionMechanismTypes);

  return (
    <>
      {/* ===== FIXED RESTORATION: Progressive step-by-step fields ===== */}

      {/* Product - Material / Retention Type — material always; retention types when linked */}
      <div
        className={
          showRetentionMechanismField
            ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
            : "grid grid-cols-1 gap-3"
        }
      >
        <FieldInput
          label="Product - Material"
          value={materialDisplay.name || ""}
          submitted={caseSubmitted}
        />
        {showRetentionMechanismField && (
          <FieldInput
            label="Retention Type"
            value={retentionTypeDisplay}
            submitted={caseSubmitted}
          />
        )}
      </div>

      {/* Grade — shown first (after identity fields) and required when the product has
          grades, mirroring the removable flow. Uses the shared "grade" step so submit
          handling is identical. */}
      {productHasGrades(selectedProduct) && (() => {
        const productGrades = getActiveGrades(selectedProduct?.grades);
        if (productGrades.length === 0) return null;
        const gradeRaw = getFieldValue(arch, firstToothNumber, "grade") || "";
        const gradeVal = parseGradeDisplayName(gradeRaw);
        const isGradeComplete = isGradeStepCompleteForDisplay(
          gradeRaw,
          isFieldCompleted(arch, firstToothNumber, "grade"),
          selectedProduct
        );
        const showGradeGreen = isGradeComplete && !caseSubmitted;
        return (
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center mt-3 ${
              showGradeGreen ? "border-[#34a853]" : isGradeComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
            }`}
          >
            <legend className={`text-sm px-1 leading-none ${showGradeGreen ? "text-[#34a853]" : isGradeComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
              Grade
            </legend>
            <GradeHoverSelector
              grades={productGrades}
              currentGradeName={gradeVal}
              disabled={caseSubmitted}
              onSelect={(g) =>
                completeFieldStep(arch, firstToothNumber, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))
              }
            />
            {showGradeGreen && <Check size={16} className="text-[#34a853] ml-1 flex-shrink-0" />}
          </fieldset>
        );
      })()}

      {/* Standalone Stage: named-shade path only. In the legacy path Stage is rendered
          in the stage+shade grid below, so gating here avoids a duplicate Stage field. */}
      {showFixedStage && !isSingleShadeEdit && usesNamedShadeGuideFields && (() => {
        const fixedStageValue = selectedStages[groupStageProductIdFixed] || getFieldValue(arch, groupStageToothNumber, "fixed_stage");
        const isStageComplete = isFieldCompleted(arch, groupStageToothNumber, "fixed_stage") || !!(fixedStageValue && fixedStageValue.trim());
        const showStageGreen = isStageComplete && !caseSubmitted;
        return (
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center mt-3 pointer-events-auto cursor-pointer hover:bg-gray-50 transition-colors ${
              showStageGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
            }`}
            onClick={() => {
              if (!caseSubmitted) handleOpenStageModal(groupStageProductIdFixed, arch, groupStageToothNumber);
            }}
          >
            <legend className={`text-sm px-1 leading-none ${showStageGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
              Stage
            </legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000]">{parseStageDisplayName(fixedStageValue)}</span>
              {showStageGreen && <Check size={16} className="text-[#34a853] ml-auto" />}
              <div className={showStageGreen ? "" : "ml-auto"}>
                <ArticulatorIcon arch={arch} />
              </div>
            </div>
          </fieldset>
        );
      })()}

      {usesNamedShadeGuideFields && visibleNamedShadeFieldsOrdered.length > 0 && (
        <ShadeDetailSection
          arch={arch}
          fields={visibleNamedShadeFieldsOrdered}
          productShadeId={fixedShadeProductId}
          storageToothNumber={firstToothNumber}
          getSelectedShade={getSelectedShadeForDisplay}
          onShadeFieldClick={handleShadeFieldClick}
          caseSubmitted={caseSubmitted}
          isComplete={namedShadesComplete}
          activeAdvanceFieldId={
            isAccordionShadePickerActive ? shadeSelectionState?.advanceFieldId ?? null : null
          }
          selectedShadeGuide={selectedShadeGuide}
          product={selectedProduct}
        />
      )}

      {/* Classic stage + Teeth Shade / Gum Shade — removaables-style.
          Named shade_guide fields (Body / Cervical / …) render separately above;
          do not hide classic teeth/gum when those exist. */}
      {(() => {
        // Stage already renders standalone when named shade guides are present.
        const showStage = showFixedStage && !usesNamedShadeGuideFields;
        const af = selectedProduct?.advance_fields || [];
        const hasTeethFlag = hasClassicTeethShadeFlag;
        const hasGumFlag = hasClassicGumShadeFlag;

        let stumpShadeFields: { label: string; shadeType: "stump_shade" | "tooth_shade"; isGumShade: boolean }[] = [];
        // Teeth shade is gated on fixed_shade_trio, gum/stump shade on fixed_stump_shade —
        // decoupled so a teeth-shade-only product still renders its Teeth Shade field
        // (it used to be built only under the fixed_stump_shade gate).
        const wantsTeethShade =
          (isFixed("fixed_shade_trio") && hasAdvanceField("fixed_shade_trio", af, selectedProduct)) ||
          hasTeethFlag;
        const wantsGumShade =
          (isFixed("fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", af, selectedProduct)) ||
          hasGumFlag;
        if (wantsTeethShade || wantsGumShade) {
          // Prefer removaables-style labels from has_* flags. Exclude shade_guide-typed
          // advance fields — those belong in ShadeDetailSection, not this row.
          if (hasTeethFlag || hasGumFlag) {
            if (wantsTeethShade && hasTeethFlag) {
              stumpShadeFields.push({ label: "Teeth Shade", shadeType: "tooth_shade", isGumShade: false });
            }
            if (wantsGumShade && hasGumFlag) {
              stumpShadeFields.push({ label: "Gum Shade", shadeType: "stump_shade", isGumShade: true });
            }
          } else {
            const fromAf = af
              .filter((f) => {
                if (f.field_type === "shade_guide") return false;
                const n = (f.name || "").toLowerCase();
                return (n.includes("stump") && n.includes("shade")) ||
                       (n.includes("teeth") && n.includes("shade")) ||
                       (n.includes("tooth") && n.includes("shade")) ||
                       (n.includes("gum") && n.includes("shade"));
              })
              .map((f) => {
                const n = (f.name || "").toLowerCase();
                const isGumShade = n.includes("gum") || n.includes("stump");
                const shadeType: "stump_shade" | "tooth_shade" = isGumShade ? "stump_shade" : "tooth_shade";
                return { label: f.name, shadeType, isGumShade };
              })
              .filter((f) => (f.isGumShade ? wantsGumShade : wantsTeethShade));

            if (fromAf.length > 0) {
              stumpShadeFields = [...fromAf].sort((a, b) => (a.isGumShade ? 1 : 0) - (b.isGumShade ? 1 : 0));
            } else {
              if (wantsTeethShade) stumpShadeFields.push({ label: "Teeth Shade", shadeType: "tooth_shade", isGumShade: false });
              if (wantsGumShade) stumpShadeFields.push({ label: "Gum Shade", shadeType: "stump_shade", isGumShade: true });
            }
          }
        }

        if (!showStage && stumpShadeFields.length === 0) return null;

        const colCount = (showStage ? 1 : 0) + stumpShadeFields.length;
        const gridCols = colCount >= 3 ? "sm:grid-cols-3" : colCount === 2 ? "sm:grid-cols-2" : "";
        return (
        <div className={`grid grid-cols-1 ${gridCols} gap-3${usesNamedShadeGuideFields ? " mt-3" : ""}`}>
          {showStage && (() => {
            const fixedStageValue = selectedStages[groupStageProductIdFixed] || getFieldValue(arch, groupStageToothNumber, "fixed_stage");
            const isStageComplete = isFieldCompleted(arch, groupStageToothNumber, "fixed_stage") || !!(fixedStageValue && fixedStageValue.trim());
            const showStageGreen = isStageComplete && !caseSubmitted;
            return (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center pointer-events-auto cursor-pointer hover:bg-gray-50 transition-colors ${
                showStageGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
              }`}
              onClick={() => {
                if (!caseSubmitted) handleOpenStageModal(groupStageProductIdFixed, arch, groupStageToothNumber);
              }}
            >
              <legend className={`text-sm px-1 leading-none ${showStageGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                Stage
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[14px] sm:text-lg text-[#000000]">
                  {parseStageDisplayName(fixedStageValue)}
                </span>
                {showStageGreen && (
                  <Check size={16} className="text-[#34a853] ml-auto" />
                )}
                <div className={showStageGreen ? "" : "ml-auto"}>
                  <ArticulatorIcon arch={arch} />
                </div>
              </div>
            </fieldset>
            );
          })()}
          {stumpShadeFields.map(({ label, shadeType, isGumShade }) => {
            if (isGumShade) {
              const gumShadeRaw = resolveFixedGumShadeRaw(
                arch,
                toothNumbers,
                firstToothNumber,
                groupStageToothNumber,
                getFieldValue,
                getSelectedShade,
                fixedShadeProductId
              );
              const gumShadeName = isRealShadeDisplayValue(gumShadeRaw)
                ? parseShadeFieldDisplayName(gumShadeRaw)
                : gumShadeRaw.trim() || null;
              const gumLabelSource = gumShadeRaw;
              const gumDisplayLabel = gumShadeName
                ? formatShadeFieldLabel(gumLabelSource, displayGumShades)
                : "";
              const gumShadeColor = getGumShadePreviewColor(gumLabelSource, displayGumShades);
              const isGumComplete = !!gumShadeName;
              const borderColor = isGumComplete && !caseSubmitted ? "border-[#34a853]" : isGumComplete ? "border-[#b4b0b0]" : "border-[#CF0202]";
              const legendColor = isGumComplete && !caseSubmitted ? "text-[#34a853]" : isGumComplete ? "text-[#7f7f7f]" : "text-[#CF0202]";
              return (
                <fieldset
                  key={label}
                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors min-w-0 overflow-hidden ${borderColor}`}
                  onClick={() => {
                    if (caseSubmitted) return;
                    setShadeSelectionState?.({
                      arch: null,
                      fieldType: null,
                      productId: null,
                      advanceFieldId: null,
                      advanceFieldLabel: null,
                      fillMode: null,
                    });
                    setInlineGumPickerOpen(true);
                  }}
                >
                  <legend className={`text-sm px-1 leading-none ${legendColor}`}>{label}</legend>
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <span className={SHADE_FIELD_LABEL_CLASS} title={gumDisplayLabel || undefined}>
                      {gumDisplayLabel}
                    </span>
                    {gumShadeColor && <GumShadePreviewSwatch color={gumShadeColor} />}
                    {isGumComplete && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
                  </div>
                </fieldset>
              );
            }
            // Removaables-style Teeth Shade: prefer field value JSON/name, then selectedShades.
            const teethRaw = getFieldValue(arch, firstToothNumber, "fixed_shade_trio");
            const teethFromField = isRealShadeDisplayValue(teethRaw)
              ? parseShadeFieldDisplayName(teethRaw)
              : "";
            const shadeCode =
              teethFromField ||
              getSelectedShade(fixedShadeProductId, arch, shadeType) ||
              "";
            const teethLabelSource = isRealShadeDisplayValue(teethRaw) ? teethRaw : shadeCode;
            const teethDisplayLabel = shadeCode
              ? formatShadeFieldLabel(
                  teethLabelSource,
                  selectedProduct?.teeth_shades as ShadeCatalogRow[] | undefined,
                  selectedShadeGuide
                )
              : "";
            const isTeethComplete = !!shadeCode;
            const teethBorder =
              isTeethComplete && !caseSubmitted
                ? "border-[#34a853]"
                : isTeethComplete
                  ? "border-[#b4b0b0]"
                  : "border-[#CF0202]";
            const teethLegend =
              isTeethComplete && !caseSubmitted
                ? "text-[#34a853]"
                : isTeethComplete
                  ? "text-[#7f7f7f]"
                  : "text-[#CF0202]";
            return (
              <fieldset
                key={label}
                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors min-w-0 overflow-hidden ${teethBorder}`}
                onClick={() => {
                  if (caseSubmitted) return;
                  setInlineGumPickerOpen(false);
                  handleShadeFieldClick(arch, shadeType, fixedShadeProductId, {
                    storageToothNumber: firstToothNumber,
                  });
                }}
              >
                <legend className={`text-sm px-1 leading-none ${teethLegend}`}>{label}</legend>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className={SHADE_FIELD_LABEL_CLASS} title={teethDisplayLabel || undefined}>
                    {teethDisplayLabel}
                  </span>
                  {shadeCode && <TeethShadePreviewIcon shadeCode={shadeCode} />}
                  {isTeethComplete && !caseSubmitted && (
                    <Check size={16} className="text-[#34a853] flex-shrink-0" />
                  )}
                </div>
              </fieldset>
            );
          })}
        </div>
        );
      })()}

      {inlineGumPickerOpen && !caseSubmitted && (
        <div className="mt-3">
          <GumShadePicker
            selected={
              parseShadeFieldDisplayName(getFieldValue(arch, firstToothNumber, "fixed_stump_shade")) ||
              getSelectedShade(fixedShadeProductId, arch, "stump_shade") ||
              null
            }
            onSelect={(shade) => {
              completeFieldStep(
                arch,
                firstToothNumber,
                "fixed_stump_shade",
                JSON.stringify({
                  gum_shade_id: shade.gum_shade_id,
                  brand_id: shade.brand?.id,
                  name: shade.name,
                })
              );
              setSelectedShades?.((prev) => ({
                ...prev,
                [buildShadeSelectionKey(fixedShadeProductId, arch, "stump_shade")]: shade.name,
              }));
              setInlineGumPickerOpen(false);
            }}
            gumShades={displayGumShades}
          />
        </div>
      )}

      {/* Step 3: Shade trio fields driven entirely by advance_fields — no static fallback */}
      {isFixed("fixed_shade_trio") && hasAdvanceField("fixed_shade_trio", selectedProduct?.advance_fields, selectedProduct) && (() => {
        if (usesNamedShadeGuideFields) return null;

        const af = selectedProduct?.advance_fields || [];
        const trioFields = af.filter((f) => {
          const n = (f.name || "").toLowerCase();
          return (
            n.includes("shade") &&
            !n.includes("stump") &&
            (n.includes("cervical") || n.includes("incisal") || n.includes("body") || n.includes("crown") || n.includes("tooth"))
          );
        });
        if (trioFields.length === 0) return null;
        return (
          <div className="grid grid-cols-2 gap-3">
            {trioFields.map(({ name }, idx) => {
              const trioCode = getSelectedShade(fixedShadeProductId, arch, "tooth_shade");
              const trioLabel = trioCode
                ? formatShadeFieldLabel(
                    trioCode,
                    selectedProduct?.teeth_shades as ShadeCatalogRow[] | undefined,
                    selectedShadeGuide
                  )
                : "";
              return (
              <ShadeField
                key={name}
                label={name}
                value={trioLabel}
                shade={trioCode}
                onClick={() => {
                  handleShadeFieldClick(arch, "tooth_shade", fixedShadeProductId);
                  if (idx === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_shade_trio")) {
                    completeFieldStep(arch, firstToothNumber, "fixed_shade_trio", "selected");
                  }
                }}
                submitted={caseSubmitted}
                required
              />
            );
            })}
          </div>
        );
      })()}

      {isAccordionShadePickerActive && shadeSelectionState && (
        <FixedAccordionShadePicker
          arch={arch}
          shadeSelectionState={shadeSelectionState}
          selectedShadeGuide={selectedShadeGuide}
          showShadeGuideDropdown={showShadeGuideDropdown}
          setShowShadeGuideDropdown={setShowShadeGuideDropdown}
          setSelectedShadeGuide={setSelectedShadeGuide}
          shadeGuideOptions={effectiveShadeGuideOptions}
          getSelectedShade={
            getSelectedShade as (
              productId: string,
              arch: Arch,
              fieldType: ShadeFieldType,
              advanceFieldId?: number | null
            ) => string
          }
          onShadeSelect={handleShadeSelect}
          productForShades={selectedProduct}
        />
      )}

      {!fixedShadeIncomplete && <>

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

      {/* Step 4: Dynamic characterization advance fields */}
      {isFixedAfterImplant("fixed_characterization") && hasAdvanceField("fixed_characterization", selectedProduct?.advance_fields) && (() => {
        const charFields = getAdvanceFieldsForStep("fixed_characterization", selectedProduct?.advance_fields);
        if (charFields.length === 0) return null;
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_characterization");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = charFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = charFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_characterization");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_characterization", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_characterization", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_characterization");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 5: Dynamic advance fields — progressive: show one by one, auto-open dropdown */}
      {isFixedAfterImplant("fixed_contact_icons") && hasAdvanceField("fixed_contact_icons", selectedProduct?.advance_fields) && (() => {
        const contactFields = getAdvanceFieldsForStep("fixed_contact_icons", selectedProduct?.advance_fields);
        if (contactFields.length === 0) {
          // No matching fields — auto-complete handled in useEffect above
          return null;
        }
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_contact_icons");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = contactFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = contactFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_contact_icons");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_contact_icons", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_contact_icons", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_contact_icons");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 6: Dynamic margin advance fields */}
      {isFixedAfterImplant("fixed_margin") && hasAdvanceField("fixed_margin", selectedProduct?.advance_fields) && (() => {
        const marginFields = getAdvanceFieldsForStep("fixed_margin", selectedProduct?.advance_fields);
        if (marginFields.length === 0) return null;
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_margin");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = marginFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = marginFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_margin");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_margin", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_margin", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_margin");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 7: Dynamic metal advance fields */}
      {isFixedAfterImplant("fixed_metal") && hasAdvanceField("fixed_metal", selectedProduct?.advance_fields) && (() => {
        const metalFields = getAdvanceFieldsForStep("fixed_metal", selectedProduct?.advance_fields);
        if (metalFields.length === 0) return null;
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_metal");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = metalFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = metalFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_metal");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_metal", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_metal", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_metal");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 8: Dynamic advance fields — progressive: show one by one, auto-open dropdown */}
      {isFixedAfterImplant("fixed_proximal_contact") && hasAdvanceField("fixed_proximal_contact", selectedProduct?.advance_fields) && (() => {
        const proximalFields = getAdvanceFieldsForStep("fixed_proximal_contact", selectedProduct?.advance_fields);
        if (proximalFields.length === 0) {
          // No matching fields — auto-complete handled in useEffect above
          return null;
        }
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_proximal_contact");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = proximalFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = proximalFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_proximal_contact");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_proximal_contact", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_proximal_contact", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_proximal_contact");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 9: Impression / Add ons */}
      {isFixedAfterImplant("fixed_impression") && showImpressionAndAddons && (() => {
        const addonsVal = isFixedAfterImplant("fixed_addons") ? (getFieldValue(arch, firstToothNumber, "fixed_addons") || "") : "";
        const addonItems = parseAddonDisplayItems(addonsVal);
        const borderClass = isFieldCompleted(arch, firstToothNumber, "fixed_addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
        const legendClass = isFieldCompleted(arch, firstToothNumber, "fixed_addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
        const onClickAddon = () => handleOpenAddOnsModal(arch, selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
        return (
          <div className="flex flex-wrap gap-3">
            <fieldset
              className={`border rounded px-3 py-0 relative min-h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors w-full ${
                impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
              }`}
              onClick={() => {
                handleOpenImpressionModal(arch, impressionModalProductId, firstToothNumber);
              }}
            >
              <legend className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                Impression
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[14px] sm:text-lg text-[#000000] break-words">
                  {impressionDisplayText}
                </span>
                {impressionComplete && !caseSubmitted && (
                  <Check size={16} className="text-[#34a853] ml-auto" />
                )}
              </div>
            </fieldset>

            {isFixedAfterImplant("fixed_addons") && addonItems.length > 0 &&
                addonItems.map((item: string, idx: number) => (
                  <fieldset key={idx} className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors flex-1 min-w-[200px] ${borderClass}`} onClick={onClickAddon}>
                    <legend className={`text-sm px-1 leading-none ${legendClass}`}>Add on</legend>
                    <span className="text-[14px] sm:text-lg text-[#000000] truncate">{item}</span>
                    {!caseSubmitted && isFieldCompleted(arch, firstToothNumber, "fixed_addons") && idx === addonItems.length - 1 && (
                      <Check size={14} className="text-[#34a853] ml-2 flex-shrink-0" />
                    )}
                  </fieldset>
                ))
            }
          </div>
        );
      })()}


      </>}
    </>
  );
}
