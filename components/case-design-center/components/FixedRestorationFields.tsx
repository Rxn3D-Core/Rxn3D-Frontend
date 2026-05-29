"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Check } from "lucide-react";
import {
  FieldInput,
  ShadeField,
} from "./fields";
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
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { FIXED_RETENTION_MECHANISM_FIELD_STEP } from "../hooks/useToothFieldProgress";
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
import { shouldSkipStageSelection } from "../utils/categoryHelpers";
import { productHasGrades } from "../utils/gradeHelpers";
import { parseAddonDisplayItems } from "../utils/addonDisplayHelpers";
import {
  getShadeGuideAdvanceFields,
  getShadeFieldType,
  areFixedProductShadesComplete,
  getDisplayedShadeGuideFields,
  isStumpLikeShadeField,
  getShadeGuideOptionsFromProduct,
  resolveFixedShadeProductId,
} from "../utils/shadeGuideAdvanceFields";
import type { SlipImpressionSelections } from "../utils/impressionStorage";
import {
  ARCH_IMPRESSION_PRODUCT_ID,
  archHasActiveImpressionSelections,
} from "../utils/impressionFieldSync";

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
  const alwaysShow = ["fixed_stage", "fixed_impression", "fixed_addons", "stage", "impression", "addons"];
  if (alwaysShow.includes(step)) return true;

  const hasTeethShadeFlag = product?.has_teeth_shade === "Yes";
  const hasGumShadeFlag = product?.has_gum_shade === "Yes";

  // Shade steps: show when has_* flag is set, regardless of advance_fields
  if (step === "fixed_stump_shade") {
    if (hasTeethShadeFlag || hasGumShadeFlag) return true;
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
          className="border-0 shadow-none p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden text-lg font-normal text-[#000000] min-w-0 w-full bg-transparent"
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
  migrateFixedShadeProductId?: (fromProductId: string, toProductId: string, arch: Arch) => void;
  /** Implant details from the opposite arch (same product) for cross-arch mirroring. */
  peerImplantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Arch-wide impression qty grid (shared by all fixed/removable products on this jaw). */
  selectedImpressions?: SlipImpressionSelections;
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
  migrateFixedShadeProductId,
  peerImplantDetailByTooth,
  selectedImpressions = { maxillary: [], mandibular: [] },
}: FixedRestorationFieldsProps) {
  const implantTeeth = useMemo(
    () => getImplantTeethInGroup(toothNumbers, retentionTypesMap),
    [toothNumbers, retentionTypesMap]
  );

  useCrossArchImplantMirror({
    arch,
    implantTeeth,
    retentionTypesMap,
    retentionOptions: selectedProduct?.retention_options,
    peerImplantDetailByTooth,
    implantDetailByTooth,
    setImplantDetailByTooth,
    implantDetailCompleteByTooth,
    setImplantDetailCompleteByTooth,
    caseSubmitted,
  });
  const implantDetailReady = areAllImplantDetailsComplete(
    implantTeeth,
    implantDetailCompleteByTooth
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
    usesAccordionShadePicker &&
    shadeSelectionState?.arch === arch &&
    shadeSelectionState?.productId === fixedShadeProductId &&
    shadeSelectionState?.fieldType != null;
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
      }
    );
  const isSingleShadeEdit = shadeEditActiveFieldId != null;
  const usesNamedShadeGuideFields = namedShadeGuideFields.length > 0;
  const effectiveShadeGuideOptions =
    shadeGuideOptions.length > 0
      ? shadeGuideOptions
      : getShadeGuideOptionsFromProduct(selectedProduct);
  const showFixedStage =
    !shouldSkipStageSelection(selectedProduct) && isFixed("fixed_stage");
  const impressionVisible =
    isFixedAfterImplant("fixed_impression") && showImpressionAndAddons;
  const hasAutoOpenedImpressionRef = useRef(false);
  const impressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
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

      {showFixedStage && !isSingleShadeEdit && (() => {
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
              <span className="text-[14px] sm:text-lg text-[#000000]">{fixedStageValue}</span>
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
        />
      )}

      {/* Legacy stage + stump/teeth shade fields (no shade_guide advance fields) */}
      {(() => {
        if (usesNamedShadeGuideFields) return null;

        const showStage = showFixedStage;
        const af = selectedProduct?.advance_fields || [];
        const hasTeethFlag = selectedProduct?.has_teeth_shade === "Yes";
        const hasGumFlag = selectedProduct?.has_gum_shade === "Yes";

        let stumpShadeFields: { label: string; shadeType: "stump_shade" | "tooth_shade"; isGumShade: boolean }[] = [];
        if (isFixed("fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", af, selectedProduct)) {
          // First try to find matching entries in advance_fields
          const fromAf = af
            .filter((f) => {
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
            });

          if (fromAf.length > 0) {
            // Teeth shade first, gum shade second
            stumpShadeFields = [...fromAf].sort((a, b) => (a.isGumShade ? 1 : 0) - (b.isGumShade ? 1 : 0));
          } else {
            // No advance_fields match — fall back to has_* flags (teeth first)
            if (hasTeethFlag) stumpShadeFields.push({ label: "Teeth Shade", shadeType: "tooth_shade", isGumShade: false });
            if (hasGumFlag) stumpShadeFields.push({ label: "Gum Shade", shadeType: "stump_shade", isGumShade: true });
          }
        }

        if (!showStage && stumpShadeFields.length === 0) return null;

        const colCount = (showStage ? 1 : 0) + stumpShadeFields.length;
        const gridCols = colCount >= 3 ? "sm:grid-cols-3" : colCount === 2 ? "sm:grid-cols-2" : "";
        return (
        <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
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
                  {fixedStageValue}
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
              const gumShadeValue = getFieldValue(arch, firstToothNumber, "fixed_stump_shade");
              let gumShadeName: string | null = null;
              try { if (gumShadeValue) gumShadeName = JSON.parse(gumShadeValue).name ?? null; } catch {}
              const matchedGumShade = selectedProduct?.gum_shades?.find((s) => s.name === gumShadeName);
              const gumShadeColor = matchedGumShade?.color_code_middle ?? null;
              const isGumComplete = isFieldCompleted(arch, firstToothNumber, "fixed_stump_shade");
              const borderColor = isGumComplete && !caseSubmitted ? "border-[#34a853]" : isGumComplete ? "border-[#b4b0b0]" : "border-[#CF0202]";
              const legendColor = isGumComplete && !caseSubmitted ? "text-[#34a853]" : isGumComplete ? "text-[#7f7f7f]" : "text-[#CF0202]";
              return (
                <fieldset
                  key={label}
                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
                  onClick={() => {
                    if (!caseSubmitted) setPanelGumShadePicker({ toothNumber: firstToothNumber, gumShades: selectedProduct?.gum_shades || [], selectedName: gumShadeName });
                  }}
                >
                  <legend className={`text-sm px-1 leading-none ${legendColor}`}>{label}</legend>
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-[14px] sm:text-lg text-[#000000] truncate">{gumShadeName ?? ""}</span>
                    {gumShadeColor && (
                      <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 ml-auto">
                        <rect width="28.0391" height="28.0391" rx="6" fill={gumShadeColor} />
                      </svg>
                    )}
                    {isGumComplete && !caseSubmitted && <Check size={16} className={`text-[#34a853] flex-shrink-0 ${gumShadeColor ? "" : "ml-auto"}`} />}
                  </div>
                </fieldset>
              );
            }
            return (
              <ShadeField
                key={label}
                label={label}
                value={getSelectedShade(fixedShadeProductId, arch, shadeType)}
                shade=""
                onClick={() => handleShadeFieldClick(arch, shadeType, fixedShadeProductId)}
                submitted={caseSubmitted}
                required
              />
            );
          })}
        </div>
        );
      })()}

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
            {trioFields.map(({ name }, idx) => (
              <ShadeField
                key={name}
                label={name}
                value={getSelectedShade(fixedShadeProductId, arch, "tooth_shade")}
                shade=""
                onClick={() => {
                  handleShadeFieldClick(arch, "tooth_shade", fixedShadeProductId);
                  if (idx === 0 && !isFieldCompleted(arch, firstToothNumber, "fixed_shade_trio")) {
                    completeFieldStep(arch, firstToothNumber, "fixed_shade_trio", "selected");
                  }
                }}
                submitted={caseSubmitted}
                required
              />
            ))}
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
