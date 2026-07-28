"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useAutoOpenSuppressed } from "./auto-open-suppression";
import {
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Trash2,
  Paperclip,
} from "lucide-react";
import { Check } from "@/components/ui/custom-check";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import type { RetentionOptionItem, ExtractionStatusOption } from "@/components/retention-type-popover";
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
import { OppositeArchAddProductShield } from "./AddProductFocusOverlay";
import { InlineAddProductPicker } from "./InlineAddProductPicker";
import type { InlineAddProductResult } from "./InlineAddProductPicker";
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
import { getRetentionFieldChain, getSelectionFieldChain, getNextSelectionFieldStep } from "../hooks/useToothFieldProgress";
import type { ImplantDetailData } from "./ImplantDetailSection";
import { GumShadePicker } from "./GumShadePicker";
import {
  isNonRetentionCategory,
  hasRetentionOptions,
  isSingleStageNoStages,
  shouldSkipStageSelection,
  isDisplayableStageValue,
  parseStageDisplayName,
} from "../utils/categoryHelpers";
import { isProductRushed, resolveCardRepToothForRush } from "../utils/rushModalContext";
import {
  productHasGrades,
  resolveProductGradesForDisplay,
  findOppositeArchGradesDonor,
  findArchProductDonor,
  findOppositeArchProductDonor,
  resolveProductForStageField,
  resolveGumShadesForDisplay,
  parseGradeDisplayName,
  isGradeStepCompleteForDisplay,
  isGradeFieldValueSkipped,
} from "../utils/gradeHelpers";
import { resolveVariationDisplay, resolveArchProductImage } from "../utils/variationHelpers";
import {
  FLIPPER_STAYPLATE_SELECTION_HINT,
  isFlipperOrStayplateProduct,
  isRemovableToothSelectionFocused,
  isRemovableToothStatusPopoverEligible,
  resolveProductCustomLabel,
} from "../utils/removableSelectionHints";
import {
  isSingleDefaultOnlyExtractionList,
  isExtractionSelectionOptional,
  hasConfiguredExtractions,
  requiresExtractionsAcknowledgement,
  isOverlayExtractionCode,
  shouldAutoSelectArchForDefaultExtraction,
  toothHasTimBaseExtraction,
} from "../utils/extractionHelpers";
import { isArchRemovableProductDetailPending } from "../utils/productDetailLoading";
import { useExtractionsAcknowledged } from "../hooks/useExtractionsAcknowledged";
import {
  ARCH_SHARED_REMOVABLE_ACK_CARD_ID,
  archHasRemovableProducts,
  collectArchRemovableProductSources,
  mergeArchRemovableExtractions,
} from "../utils/archSharedRemovable";
import {
  resolveAddedCardProductData,
  resolveAddedCardRepTooth,
} from "../utils/resolveAddedCardProduct";
import {
  formatSplintGroups,
  deriveAutoSplintLinks,
  deriveWingTeeth,
  combineSplintLinks,
  toggleSplintOverlay,
  type SplintOverlay,
} from "../utils/splintHelpers";
import { AccordionHeaderActions } from "./ExtractionsDoneAcknowledgement";
import { AutoOpenFirstFixedFieldAfterRetentionDone } from "./FixedRetentionFieldAutoOpen";
import { resolveFixedCardGating } from "../utils/fixedCardGating";
import {
  parseAddonDisplayItems,
  buildRemovableAddonFieldContext,
  productSupportsAddons,
} from "../utils/addonDisplayHelpers";
import { useCaseDesignStore } from "@/stores/caseDesignStore";
import { hasImplantRetention } from "../utils/implantHelpers";
import {
  areAllImplantDetailsComplete,
  getImplantTeethInGroup,
  isImplantDetailFilled,
  resolveGroupStageToothNumber,
} from "../utils/implantDetailHelpers";
import { getActiveProductPopoverContextToken } from "../utils/activeProductPopoverContext.js";
import { shouldUseScopedRetentionMode } from "../utils/activeCardPopoverMode";
import { isOwnArchToothChartEnabled } from "../utils/productAccordionFocus";
import {
  buildShadeSelectionKey,
  isFixedProductShadeStorageId,
  resolveFixedShadeProductId,
  shouldUseAccordionOnlyFixedShades,
} from "../utils/shadeGuideAdvanceFields";
import {
  caseDesignInter,
  removableHeaderTitleClass,
  removableHeaderToothClass,
} from "../case-design-inter-font";
import { resolveRemovableEstDaysText } from "../utils/removableEstDays";
import { getRemovableHeaderTitle, shouldShowRemovableHeaderContent } from "../utils/removableHeaderLabel";
import { shouldAddToProductSelectionOnRemovableClick } from "../utils/removableToothClickMode";
import {
  buildExtractionScopeTeeth,
  getRemovableOrangeHeaderTeeth,
  getToothStatusBoxDisplayMap,
  resolveRemovableStatusBoxSelectedTeeth,
} from "../utils/removableToothDisplay";
import {
  resolveRemovablePopoverExtractionsForActiveCard,
  shouldApplyExtractionOnPopoverSelect,
} from "../utils/removableToothPopoverAssign";
import {
  ARCH_IMPRESSION_PRODUCT_ID,
  archHasActiveImpressionSelections,
} from "../utils/impressionFieldSync";
import { mapOppositeExtractionsToProductExtractions } from "../utils/opposingExtractionHelpers";
import { RetentionProductFields } from "./FixedRestorationFields";
import { SelectionProductFields, GradeHoverSelector } from "./RemovableRestorationFields";
import { ProductAccordionCard } from "./ProductAccordionCard";
import { RestorationAccordionHeader } from "./RestorationAccordionHeader";
import { OpposingRemovableAccordion } from "./OpposingRemovableAccordion";
import { StageHistoryBlock } from "./StageHistoryBlock";
import type { NewStageEligibilityStageRef } from "@/lib/api/slip-new-stage-eligibility";
import { MAXILLARY_SENTINEL } from "../utils/opposingImpressionReadiness";
import {
  addedProductSlotId,
  archAllowsAccordionCollapse,
  countFixedCard0Groups,
} from "../utils/productAccordionFocus";

import {
  AccordionBadge,
  CurrentlyActiveProductBadge,
  EstDaysLabel,
  removableProductTitleBoxClassName,
} from "./AccordionBadge";
import { ProductImagePreview } from "./ProductImagePreview";
import {
  getPreferredLabGumShade,
  getPreferredLabTeethShade,
  canAutoApplyPreferredGum,
} from "@/lib/product-shade-preferences";
import {
  implantOnlySelectionModeForArch,
  mergeProductDefaultToothChartForSlipSvgDisplay,
  resolveSlipDefaultChartProduct,
} from "@/lib/product-default-tooth-chart-slip-display";
import { shouldSkipLegacyDefaultExtractionAutoSelect } from "@/lib/product-default-tooth-chart";

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
  const autoOpenSuppressed = useAutoOpenSuppressed();
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (caseSubmitted || autoOpenSuppressed) return; // never auto-open stage modal in read-only / edit-slip mode
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isStageVisible || !isStageEmpty || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    onOpenStage(productId, arch, toothNumber);
  }, [caseSubmitted, autoOpenSuppressed, isExpanded, isStageVisible, isStageEmpty, productId, arch, toothNumber, onOpenStage]);
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
  firstMissingShadeField,
  storageToothNumber,
  setShadeSelectionState,
  caseSubmitted = false,
  skipAutoOpen = false,
}: {
  arch: Arch;
  productId: string;
  isExpanded: boolean;
  isShadeSectionVisible: boolean;
  stumpShadeEmpty: boolean;
  toothShadeEmpty: boolean;
  firstMissingShadeField?: { id: number; name: string; fieldType: ShadeFieldType } | null;
  storageToothNumber?: number;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
  caseSubmitted?: boolean;
  skipAutoOpen?: boolean;
}) {
  const autoOpenSuppressed = useAutoOpenSuppressed();
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (caseSubmitted || skipAutoOpen || autoOpenSuppressed) return;
    if (!isExpanded) {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (!isShadeSectionVisible || hasAutoOpenedRef.current) return;

    const hasNamedShadeFields = firstMissingShadeField !== undefined;
    const shouldOpen = hasNamedShadeFields
      ? firstMissingShadeField != null
      : stumpShadeEmpty || toothShadeEmpty;
    if (!shouldOpen) return;

    hasAutoOpenedRef.current = true;
    setShadeSelectionState({
      arch,
      productId,
      fieldType: firstMissingShadeField?.fieldType ?? (toothShadeEmpty ? "tooth_shade" : "stump_shade"),
      advanceFieldId: firstMissingShadeField?.id ?? null,
      advanceFieldLabel: firstMissingShadeField?.name ?? null,
      fillMode: "sequence",
      storageToothNumber: storageToothNumber ?? null,
    });
  }, [
    caseSubmitted,
    skipAutoOpen,
    autoOpenSuppressed,
    isExpanded,
    isShadeSectionVisible,
    stumpShadeEmpty,
    toothShadeEmpty,
    firstMissingShadeField,
    arch,
    productId,
    storageToothNumber,
    setShadeSelectionState,
  ]);
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
  blockAutoOpen = false,
}: {
  isExpanded: boolean;
  isImpressionVisible: boolean;
  isImpressionEmpty: boolean;
  onOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  arch: Arch;
  productId: string;
  toothNumber: number;
  caseSubmitted?: boolean;
  blockAutoOpen?: boolean;
}) {
  const autoOpenSuppressed = useAutoOpenSuppressed();
  const hasAutoOpenedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (caseSubmitted || blockAutoOpen || autoOpenSuppressed) return;
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
  }, [caseSubmitted, blockAutoOpen, autoOpenSuppressed, isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
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
/** Returns true if the product is a full-denture type: no TIM extraction, only "Missing teeth" extraction. */
function isFullDentureProduct(extractions: Array<{ code: string; name: string; status: string }> | undefined): boolean {
  if (!extractions || extractions.length === 0) return false;
  const active = extractions.filter((e) => e.status === "Active");
  if (active.length === 0) return false;
  const hasTim = active.some((e) => e.code === "TIM" || (e.name ?? "").toLowerCase().trim() === "teeth in mouth");
  if (hasTim) return false;
  return active.every((e) => e.code === "MT" || (e.name ?? "").toLowerCase().trim() === "missing teeth");
}

function hasAdvanceField(
  step: string,
  advanceFields: Array<{ name: string; field_type: string }> | undefined,
  product?: { has_impression?: "Yes" | "No" | null; has_teeth_shade?: string | null; has_gum_shade?: string | null; is_single_stage?: string | boolean; has_stage?: string | boolean; stages?: unknown[] }
): boolean {
  if (
    (step === "stage" || step === "fixed_stage") &&
    (shouldSkipStageSelection(product) || product?.has_stage === "No")
  ) {
    return false;
  }
  // Removable impression is only shown when the product explicitly supports it
  if (step === "impression") {
    return product?.has_impression === "Yes";
  }
  if (step === "addons" || step === "fixed_addons") {
    return productSupportsAddons(product as ProductApiData);
  }
  const alwaysShow = ["fixed_stage", "fixed_impression", "stage"];
  if (alwaysShow.includes(step)) return true;

  // Shade steps: show when has_* flag is set, regardless of advance_fields
  if (step === "fixed_stump_shade" && product?.has_gum_shade === "Yes") return true;
  if (step === "fixed_shade_trio" && product?.has_teeth_shade === "Yes") return true;

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
      return (
        productHasGrades(product as ProductApiData) || names.some((n) => n.includes("grade"))
      );
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
  advanceFields: Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number;[key: string]: any }> | undefined
): Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number;[key: string]: any }> {
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

        {/* Selected option image shown on the right */}
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

interface MandibularPanelProps {
  /** Wizard arch for the initial card-0 product (upper / lower / both). */
  slipInitialArch?: "maxillary" | "mandibular" | "both";
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;
  /** Add-new-stage / edit-slip preload: auto-acknowledge extractions so Done is skipped on load. */
  preloadInitialSlipState?: boolean;
  /** When true, overlays the panel to prevent interaction until maxillary is complete */
  disabled?: boolean;
  /** When true, the other arch is in the add-product flow (distinct message from maxillary-incomplete). */
  blockedByOppositeAddProduct?: boolean;
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
  initialProductIsRemovable?: boolean;
  initialProductDetailsPending?: boolean;
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
  getSelectedShade: (productId: string, arch: Arch, fieldType: ShadeFieldType, advanceFieldId?: number | null) => string;
  handleShadeSelect: (shade: string) => void;
  /** Direct write into the shade-selection map (fixed products' gum shade must count as stump_shade). */
  setSelectedShades?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleShadeFieldClick: (arch: Arch, fieldType: ShadeFieldType, productId: string, options?: { advanceFieldId?: number | null; advanceFieldLabel?: string | null }) => void;
  migrateFixedShadeProductId?: (fromProductId: string, toProductId: string, arch: Arch) => void;

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
  collapseAllAddedProducts: () => void;
  handleRemoveAddedProduct: (id: number) => void;

  // Active product card tracking
  activeProductCardId: number;
  setActiveProductCardId: (id: number) => void;
  activeAccordionKey: string;
  /** Force this arch's tooth chart interactive even when it doesn't own the active accordion (initial fixed "both" flow). */
  forceOwnArchChartEnabled?: boolean;
  /** Guided both-arch flow: hide this arch's card-0 field content until its fields phase is reached (chart/selection stay visible). */
  guidedHideCard0Fields?: boolean;
  /** Initial (card 0) product name — used for the "Select teeth to replace with …" hint before any teeth are assigned. */
  initialProductName?: string;
  isAccordionExpanded: (slotId: string) => boolean;
  isAccordionEnabled: (slotId: string) => boolean;
  toggleAccordionFocus: (slotId: string, cardId?: number) => void;
  /** Fired once when the card-0 extraction setup is acknowledged ("Done"). Drives the guided cross-arch flow. */
  onExtractionsDone?: () => void;
  /** Guided both-arch flow: fixed retention "Done" on card 0. */
  onRetentionDone?: () => void;
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
  mandibularNoActiveBoxTeeth?: number[];
  setMandibularNoActiveBoxTeeth?: (teeth: number[] | ((prev: number[]) => number[])) => void;
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string, extractions?: import("../types").ProductExtraction[]) => void;
  canUseToothForActiveProduct?: (arch: Arch, toothNumber: number) => boolean;
  selectAllMandibularTeeth: (teeth: number[]) => void;
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
  /** When true, the initial card 0 product is Fixed Restoration AND mandibular teeth with Prep/Pontic exist */
  mandibularHasFixedCard0?: boolean;
  /** When true, the initial card 0 product is a Removable/Ortho AND mandibular teeth have been selected for it */
  mandibularHasRemovablesCard0?: boolean;
  /** Extractions from the initial card 0 product — used as fallback when no teeth are selected yet */
  card0Extractions?: ProductExtraction[];
  /** Full initial card 0 product details — fallback so the removable/ortho card renders
   *  before any tooth has the product assigned (TIM-default products select no teeth). */
  card0InitialProduct?: ProductApiData | null;
  /** Product+arch combos where user chose "Submit, no opposing needed" */
  noOpposingNeeded?: Record<string, boolean>;
  /** Impression selections by key (productId_arch_impressionValue → qty) */
  selectedImpressions?: import("../utils/impressionStorage").SlipImpressionSelections;
  /** When set, renders the opposing product accordion for Removable Restoration products with opposite_extractions */
  opposingProductData?: ProductApiData | null;
  /**
   * Opposing tooth extraction map: toothNumber → extractionCode for the opposing arch.
   * Used to display and collect opposing extraction tooth selections.
   */
  opposingToothExtractionMap?: Record<number, string>;
  opposingClaspTeeth?: number[];
  opposingNoActiveBoxTeeth?: number[];
  setOpposingNoActiveBoxTeeth?: (teeth: number[] | ((prev: number[]) => number[])) => void;
  opposingSelectedTeeth?: number[];
  /** Called when the user toggles a tooth into/out of an opposing extraction box */
  onOpposingExtractionToggle?: (
    toothNumber: number,
    extractionCode: string,
    extractions?: ProductExtraction[]
  ) => void;
  /** Selects all opposing arch teeth for a given opposing extraction */
  onSelectAllOpposingTeeth?: (teeth: number[]) => void;
  /** Called when the checked teeth (checkbox selection) change */
  onCheckedTeethChange?: (teeth: number[]) => void;
  /** Called whenever implant detail data changes for any tooth (so CaseDesignCenter can include it in the slip snapshot). */
  onImplantDetailChange?: (implantDetailByTooth: Record<number, ImplantDetailData>) => void;
  /** Edit-slip preload for saved implant and abutment selections. */
  initialImplantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Called whenever implant completion state changes (so the peer arch can use it for cross-arch mirroring). */
  onImplantDetailCompleteChange?: (completeByTooth: Record<number, boolean>) => void;
  /** Called whenever splint link state changes (so CaseDesignCenter can include it in the slip snapshot). */
  onSplintLinksChange?: (splintLinksByKey: Record<string, number[]>) => void;
  /** Opposite-arch implant details for mirroring when the same product is on both sides. */
  peerImplantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Opposite-arch implant completion state for cross-arch mirroring. */
  peerImplantCompleteByTooth?: Record<number, boolean>;
  /** Navigate back to category selection in the new-case wizard. Invoked after deleting a Fixed Restoration accordion. */
  onBackToCategories?: (arch?: "maxillary" | "mandibular") => void;
  onShowSelectTeethToReplaceChange?: (show: boolean) => void;
  /** Structured add-on selections keyed as `${arch}_${toothNumber}` */
  selectedAddonsByTooth?: Record<string, Array<{ addon_id: number; qty: number }>>;
  /** When true the footer acknowledgement checkbox is checked — accordion header borders turn green; orange when false. */
  confirmDetailsChecked?: boolean;
  addStageStageHistory?: NewStageEligibilityStageRef[];
  /** When true (stage or impression modal is open), disables the teeth SVG. */
  isAnyModalOpen?: boolean;
  /** When true, suppresses auto-open helpers (shade, gum shade, impression) on this panel.
   *  Used when initialArch='both' so the upper side is configured first. */
  suppressAutoOpen?: boolean;
  /** Single-arch slip: opposing accordion shows extractions/impression only, not primary product. */
  opposingOnlyLayout?: boolean;
  showInlineAddProductPicker?: boolean;
  /** Product IDs already selected on this arch; excluded from picker list. */
  excludedProductIds?: number[];
  /** Subcategory IDs already selected on this arch; excluded from picker list. */
  excludedSubcategoryIds?: number[];
  labCustomerId?: number | null;
  onInlineAddProductComplete?: (result: InlineAddProductResult) => void | Promise<void>;
  onInlineAddProductCancel?: () => void;
}

/** Auto-opens the shade picker when this component mounts (i.e. shade field becomes visible) and the field has no value */
function AutoOpenShade({ hasValue, onOpen }: { hasValue: boolean; onOpen: () => void }) {
  const autoOpenSuppressed = useAutoOpenSuppressed();
  const opened = useRef(false);
  useEffect(() => {
    if (autoOpenSuppressed) return;
    if (!hasValue && !opened.current) {
      opened.current = true;
      onOpen();
    }
  }, [autoOpenSuppressed, hasValue, onOpen]);
  return null;
}

function AutoOpenGumShade({ visible, hasValue, onOpen }: { visible: boolean; hasValue: boolean; onOpen: () => void }) {
  const autoOpenSuppressed = useAutoOpenSuppressed();
  const opened = useRef(false);
  useEffect(() => {
    if (autoOpenSuppressed) return;
    if (visible && !hasValue && !opened.current) {
      opened.current = true;
      onOpen();
    }
    if (!visible || hasValue) {
      opened.current = false;
    }
  }, [autoOpenSuppressed, visible, hasValue, onOpen]);
  return null;
}

export function MandibularPanel({
  slipInitialArch = "mandibular",
  activeAccordionKey,
  forceOwnArchChartEnabled = false,
  guidedHideCard0Fields = false,
  initialProductName,
  isAccordionExpanded,
  isAccordionEnabled,
  toggleAccordionFocus,
  onExtractionsDone,
  onRetentionDone,
  showMandibular,
  setShowMandibular,
  showDetails,
  caseSubmitted = false,
  preloadInitialSlipState = false,
  disabled = false,
  blockedByOppositeAddProduct = false,
  mandibularTeeth,
  handleMandibularToothClick,
  mandibularRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  activeProductIsRemovables = false,
  initialProductIsRemovable = false,
  initialProductDetailsPending = false,
  retentionOptions,
  card0Extractions = [],
  card0InitialProduct = null,
  handleSelectRetentionType,
  handleMandibularToothDeselect,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  setSelectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
  setSelectedShades,
  handleShadeFieldClick,
  migrateFixedShadeProductId,
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
  collapseAllAddedProducts,
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
  mandibularNoActiveBoxTeeth = [],
  setMandibularNoActiveBoxTeeth,
  handleToothExtractionToggle,
  canUseToothForActiveProduct,
  selectAllMandibularTeeth,
  onToothStatusValidationChange,
  mandibularHasFixedCard0 = false,
  mandibularHasRemovablesCard0 = false,
  removablesImpressionDone = false,
  noOpposingNeeded = {},
  selectedImpressions = { maxillary: [], mandibular: [] },
  opposingProductData = null,
  opposingToothExtractionMap = {},
  opposingClaspTeeth = [],
  opposingNoActiveBoxTeeth = [],
  setOpposingNoActiveBoxTeeth,
  opposingSelectedTeeth = [],
  onOpposingExtractionToggle,
  onSelectAllOpposingTeeth,
  onCheckedTeethChange,
  onImplantDetailChange,
  initialImplantDetailByTooth = {},
  onImplantDetailCompleteChange,
  onSplintLinksChange,
  peerImplantDetailByTooth,
  peerImplantCompleteByTooth,
  onBackToCategories,
  onShowSelectTeethToReplaceChange,
  confirmDetailsChecked = false,
  addStageStageHistory,
  isAnyModalOpen = false,
  suppressAutoOpen = false,
  opposingOnlyLayout = false,
  showInlineAddProductPicker = false,
  excludedProductIds = [],
  excludedSubcategoryIds = [],
  labCustomerId = null,
  onInlineAddProductComplete,
  onInlineAddProductCancel,
  selectedAddonsByTooth = {},
}: MandibularPanelProps) {
  const productAddOns = useCaseDesignStore((s) => s.productAddOns);
  const MANDIBULAR_ALL_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
  const MANDIBULAR_PRODUCT_SENTINEL = 17;
  const [activeExtractionCode, setActiveExtractionCode] = useState<string | null>(null);
  // Tracks whether any selection mode (extraction box or product plus) is explicitly active.
  // False after Done is clicked; true when extraction box or plus icon is activated.
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);

  const card0SkipsLegacyDefaults = shouldSkipLegacyDefaultExtractionAutoSelect(
    card0InitialProduct as Record<string, unknown> | null,
  );
  const activeProductSkipsChartSetup =
    activeProductCardId === 0
      ? card0SkipsLegacyDefaults
      : shouldSkipLegacyDefaultExtractionAutoSelect(
          (addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "mandibular")
            ?.product ?? null) as Record<string, unknown> | null,
        );

  const teethCount = activeProductCardId !== null
    ? (activeProductCardId !== 0
        ? MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === activeProductCardId).length
        : (activeProductIsRemovables
            ? MANDIBULAR_ALL_TEETH.filter(tn => { const code = mandibularToothExtractionMap[tn]; return code && code !== "TIM"; }).length
            : MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === 0).length
          )
      )
    : 0;

  const activeRemovableExtractionsForHint = (() => {
    if (!activeProductIsRemovables) return undefined;
    if (activeProductCardId !== 0) {
      return addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "mandibular")
        ?.product?.extractions;
    }
    if (card0Extractions?.length) return card0Extractions;
    const card0Tooth = MANDIBULAR_ALL_TEETH.find((tn) => getToothProductCard("mandibular", tn) === 0);
    return card0Tooth
      ? getToothProduct("mandibular", card0Tooth)?.extractions
      : card0InitialProduct?.extractions;
  })();
  const skipsRemovableToothSelectionHint =
    activeProductIsRemovables && !hasConfiguredExtractions(activeRemovableExtractionsForHint);

  const shouldShowSelectTeethToReplace = !caseSubmitted && activeProductCardId !== null && !confirmDetailsChecked && !skipsRemovableToothSelectionHint && !activeProductSkipsChartSetup && (
    teethCount === 0 || isSelectionModeActive
  );

  useEffect(() => {
    onShowSelectTeethToReplaceChange?.(shouldShowSelectTeethToReplace);
    return () => {
      onShowSelectTeethToReplaceChange?.(false);
    };
  }, [shouldShowSelectTeethToReplace, onShowSelectTeethToReplaceChange]);

  // Auto-select single default extraction for removable products (card 0 and added cards)
  useEffect(() => {
    if (!activeProductIsRemovables) return;
    let exts: ProductExtraction[] = [];
    let productForSkip: ProductApiData | null | undefined = card0InitialProduct;
    if (activeProductCardId === 0) {
      exts = card0Extractions ?? [];
    } else {
      const ap = addedProducts.find(
        (p) => p.id === activeProductCardId && p.arch === "mandibular"
      );
      if (!ap) return;
      productForSkip =
        (ap.product as ProductApiData | undefined) ??
        getToothProduct("mandibular", -ap.id);
      const cardTeeth = MANDIBULAR_ALL_TEETH.filter(
        (tn) => getToothProductCard("mandibular", tn) === ap.id
      );
      const repTn =
        cardTeeth.length > 0 ? cardTeeth[0] : -ap.id;
      exts =
        getToothProduct("mandibular", repTn)?.extractions ??
        (ap.product as import("../types").ProductApiData | undefined)?.extractions ??
        [];
    }
    if (shouldSkipLegacyDefaultExtractionAutoSelect(productForSkip)) return;
    if (!isSingleDefaultOnlyExtractionList(exts)) return;
    const active = exts.filter(
      (e) => e.status === "Active" && e.name != null && e.code != null
    );
    if (active.length === 1) {
      setActiveExtractionCode(active[0].code!);
    }
  }, [
    activeProductIsRemovables,
    activeProductCardId,
    card0Extractions,
    card0InitialProduct,
    addedProducts,
    getToothProduct,
    getToothProductCard,
  ]);
  const [activeExtractions, setActiveExtractions] = useState<import("../types").ProductExtraction[]>([]);
  const {
    isExtractionsSetupComplete,
    setExtractionsSetupComplete,
    isFixedRetentionSetupComplete,
    setFixedRetentionSetupComplete,
  } = useExtractionsAcknowledged("mandibular", preloadInitialSlipState);

  // Guided cross-arch flow: notify the parent once the card-0 extraction setup is
  // acknowledged ("Done"). Only meaningful when the product actually needs acknowledgement.
  const card0ExtractionsAcked =
    !caseSubmitted &&
    (card0SkipsLegacyDefaults ||
      (requiresExtractionsAcknowledgement(card0Extractions, card0InitialProduct) &&
        isExtractionsSetupComplete(card0Extractions, 0, caseSubmitted)));
  const prevCard0AckedRef = useRef(card0ExtractionsAcked);
  useEffect(() => {
    if (card0ExtractionsAcked && !prevCard0AckedRef.current) {
      onExtractionsDone?.();
    }
    prevCard0AckedRef.current = card0ExtractionsAcked;
  }, [card0ExtractionsAcked, onExtractionsDone]);

  const card0FixedRetentionAcked =
    !caseSubmitted &&
    !!card0InitialProduct &&
    hasRetentionOptions(card0InitialProduct) &&
    isFixedRetentionSetupComplete(card0InitialProduct, caseSubmitted);
  const prevCard0FixedRetentionAckedRef = useRef(card0FixedRetentionAcked);
  useEffect(() => {
    if (card0FixedRetentionAcked && !prevCard0FixedRetentionAckedRef.current) {
      onRetentionDone?.();
    }
    prevCard0FixedRetentionAckedRef.current = card0FixedRetentionAcked;
  }, [card0FixedRetentionAcked, onRetentionDone]);

  const [toothStatusPopoverTooth, setToothStatusPopoverTooth] = useState<number | null>(null);
  const [toothStatusPopoverExtractions, setToothStatusPopoverExtractions] = useState<ProductExtraction[]>([]);
  const [mandibularCheckedTeeth, setMandibularCheckedTeeth] = useState<number[]>([]);
  const handleMandibularCheckedTeethChange = useCallback((teeth: number[]) => {
    setMandibularCheckedTeeth(teeth);
    onCheckedTeethChange?.(teeth);
  }, [onCheckedTeethChange]);
  /** Tracks implant detail completion per tooth so we can block impression modal until complete. */
  const [implantDetailCompleteByTooth, setImplantDetailCompleteByTooth] = useState<
    Record<number, boolean>
  >(() =>
    Object.fromEntries(
      Object.entries(initialImplantDetailByTooth).map(([tooth, detail]) => [
        Number(tooth),
        isImplantDetailFilled(detail),
      ])
    )
  );
  /** Persists implant detail form data per tooth so it survives accordion collapse/expand. */
  const [implantDetailByTooth, setImplantDetailByTooth] = useState<
    Record<number, ImplantDetailData>
  >(() => initialImplantDetailByTooth);
  /** Only one implant detail accordion open at a time on this arch. */
  const [expandedImplantTooth, setExpandedImplantTooth] = useState<number | undefined>(undefined);
  // Sync peer state to CaseDesignCenter after commit — never from inside setState updaters
  // (that triggers "Cannot update CaseDesignCenter while rendering MandibularPanel").
  const onImplantDetailChangeRef = useRef(onImplantDetailChange);
  onImplantDetailChangeRef.current = onImplantDetailChange;
  const onImplantDetailCompleteChangeRef = useRef(onImplantDetailCompleteChange);
  onImplantDetailCompleteChangeRef.current = onImplantDetailCompleteChange;
  useEffect(() => {
    onImplantDetailChangeRef.current?.(implantDetailByTooth);
  }, [implantDetailByTooth]);
  useEffect(() => {
    onImplantDetailCompleteChangeRef.current?.(implantDetailCompleteByTooth);
  }, [implantDetailCompleteByTooth]);
  /** Active extraction code selected in the opposing ToothStatusBoxes */
  const [opposingActiveExtractionCode, setOpposingActiveExtractionCode] = useState<string | null>(null);
  const [opposingActiveExtractions, setOpposingActiveExtractions] = useState<import("../types").ProductExtraction[]>([]);
  /** Tracks which card 0 fixed product group is active (by product ID) for tooth chart sync */
  const [activeFixedGroupProductId, setActiveFixedGroupProductId] = useState<number | null>(null);
  const activePopoverContextToken = getActiveProductPopoverContextToken({
    arch: "mandibular",
    activeProductCardId,
    activeFixedGroupProductId,
    activeProductIsRemovables,
    hasOpposingProduct: !!opposingProductData,
  });
  const prevPopoverContextRef = useRef(activePopoverContextToken);
  useEffect(() => {
    if (prevPopoverContextRef.current !== activePopoverContextToken) {
      setToothStatusPopoverTooth(null);
      setToothStatusPopoverExtractions([]);
      if (retentionPopoverState.arch === "mandibular") {
        setRetentionPopoverState({ arch: null, toothNumber: null });
      }
    }
    prevPopoverContextRef.current = activePopoverContextToken;
  }, [activePopoverContextToken, retentionPopoverState.arch, setRetentionPopoverState]);
  /** Panel-level gum shade picker state — shown above tooth status boxes */
  const [panelGumShadePicker, setPanelGumShadePicker] = useState<{ toothNumber: number; gumShades: { gum_shade_id: number; name: string; color_code_middle: string; brand: { id: number } }[]; selectedName?: string | null; stepOverride?: import("@/types/field-steps").FieldStep } | null>(null);
  // Mutual exclusion: close gum shade picker when tooth shade picker opens for this arch
  useEffect(() => {
    if (shadeSelectionState.arch === "mandibular" && shadeSelectionState.fieldType !== null) {
      setPanelGumShadePicker(null);
    }
  }, [shadeSelectionState.arch, shadeSelectionState.fieldType]);
  // Mutual exclusion: close tooth shade picker when gum shade picker opens
  useEffect(() => {
    if (panelGumShadePicker !== null) {
      setShadeSelectionState({ arch: null, fieldType: null, productId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelGumShadePicker]);
  // Close both shade pickers when any modal opens
  useEffect(() => {
    if (isAnyModalOpen) {
      setShadeSelectionState({ arch: null, fieldType: null, productId: null });
      setPanelGumShadePicker(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyModalOpen]);
  const safeOpenImpressionModal = useCallback((arch: Arch, productId: string, toothNumber?: number) => {
    if (toothNumber != null) {
      const product = getToothProduct(arch, toothNumber);
      const needsImplantDetail =
        (mandibularRetentionTypes[toothNumber] || []).includes("Implant") ||
        hasImplantRetention([toothNumber], mandibularRetentionTypes, product?.retention_options);
      if (needsImplantDetail && implantDetailCompleteByTooth[toothNumber] !== true) return;
    }
    handleOpenImpressionModal(arch, productId, toothNumber);
  }, [getToothProduct, mandibularRetentionTypes, implantDetailCompleteByTooth, handleOpenImpressionModal]);
  // Auto-select default grade for removable products when product loads
  const autoGradeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MANDIBULAR_ALL_TEETH) {
      const tp = getToothProduct("mandibular", tn);
      if (!tp) continue;
      const key = `mandibular_${tn}`;
      const currentVal = getFieldValue("mandibular", tn, "grade");
      const activeGrades = getActiveGrades(tp.grades);
      const existing = parseGradeDisplayName(currentVal);
      // Product has grades: clear any prior auto/skip value so the user must pick a grade explicitly.
      if (isGradeFieldValueSkipped(currentVal) && activeGrades.length > 0) {
        uncompleteFieldStep("mandibular", tn, "grade");
        continue;
      }
      if (autoGradeApplied.current.has(key)) continue;
      if (currentVal && existing) continue;
      if (currentVal && !isGradeFieldValueSkipped(currentVal)) continue;
      // Only auto-complete (skip) the grade step when the product has NO grades to choose from.
      // When grades exist, leave the field incomplete so the user selects one.
      if (activeGrades.length === 0) {
        if (productHasGrades(tp)) continue;
        autoGradeApplied.current.add(key);
        completeFieldStep("mandibular", tn, "grade", JSON.stringify({ skipped: true }));
      }
    }
  }, [getFieldValue, completeFieldStep, uncompleteFieldStep, getToothProduct]);

  const autoPreferredTeethShadeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MANDIBULAR_ALL_TEETH) {
      const tp = getToothProduct("mandibular", tn);
      if (!tp) continue;
      const key = `mandibular_${tn}`;
      if (autoPreferredTeethShadeApplied.current.has(key)) continue;
      if (getFieldValue("mandibular", tn, "teeth_shade")) continue;
      const pref = getPreferredLabTeethShade(tp);
      if (!pref) continue;
      const teethShadeId = Number((pref as { teeth_shade_id?: number; id?: number }).teeth_shade_id ?? (pref as { id?: number }).id);
      const name = String((pref as { name?: string }).name ?? "");
      if (!teethShadeId || !name) continue;
      const brandRaw = (pref as { brand?: { id?: number } }).brand;
      const brandId = brandRaw?.id ?? 0;
      autoPreferredTeethShadeApplied.current.add(key);
      completeFieldStep(
        "mandibular",
        tn,
        "teeth_shade",
        JSON.stringify({ teeth_shade_id: teethShadeId, brand_id: brandId, name }),
      );
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  const autoPreferredGumShadeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MANDIBULAR_ALL_TEETH) {
      const tp = getToothProduct("mandibular", tn);
      if (!tp) continue;
      const key = `mandibular_${tn}`;
      if (autoPreferredGumShadeApplied.current.has(key)) continue;
      if (getFieldValue("mandibular", tn, "gum_shade")) continue;
      if (!canAutoApplyPreferredGum(tp, () => getFieldValue("mandibular", tn, "teeth_shade"))) continue;
      const pref = getPreferredLabGumShade(tp);
      if (!pref) continue;
      const gumShadeId = Number((pref as { gum_shade_id?: number; id?: number }).gum_shade_id ?? (pref as { id?: number }).id);
      const name = String((pref as { name?: string }).name ?? "");
      const brandId = Number((pref as { brand?: { id?: number } }).brand?.id ?? 0);
      if (!gumShadeId || !name) continue;
      autoPreferredGumShadeApplied.current.add(key);
      completeFieldStep(
        "mandibular",
        tn,
        "gum_shade",
        JSON.stringify({ gum_shade_id: gumShadeId, brand_id: brandId, name }),
      );
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  // Auto-fetch product data for added cards that have no teeth assigned yet.
  // Uses a virtual slot (-ap.id) so each card gets its own isolated product data.
  const addedProductPrefetchRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "mandibular")) {
      if (!ap.productId) continue;
      const hasTeeth = MANDIBULAR_ALL_TEETH.some(tn => getToothProductCard("mandibular", tn) === ap.id);
      if (hasTeeth) continue;
      const virtualSlot = -ap.id;
      if (addedProductPrefetchRef.current.has(ap.id)) continue;
      addedProductPrefetchRef.current.add(ap.id);
      fetchAndAssignProduct("mandibular", virtualSlot, ap.productId);
    }
  }, [addedProducts, fetchAndAssignProduct, getToothProductCard]);

  // Auto-fetch product data for Fixed Restoration added cards whose teeth are assigned but product data is missing.
  const fixedFetchedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "mandibular")) {
      if (!ap.productId) continue;
      if (!hasRetentionOptions(ap.product)) continue;
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
  const isActiveMandibularNonRetention = (() => {
    if (activeProductCardId !== 0) {
      const activeAp = addedProducts.find(
        (p) => p.id === activeProductCardId && (p.arch === "mandibular" || p.arch === "both")
      );
      if (activeAp) {
        const assignedTooth = MANDIBULAR_ALL_TEETH.find(
          (tn) => getToothProductCard("mandibular", tn) === activeProductCardId && !!getToothProduct("mandibular", tn)
        );
        const resolvedProduct =
          (assignedTooth ? getToothProduct("mandibular", assignedTooth) : null) ??
          getToothProduct("mandibular", -activeAp.id) ??
          activeAp.product ??
          null;
        if (resolvedProduct) return !hasRetentionOptions(resolvedProduct);
        return !hasRetentionOptions(activeAp.product);
      }
      // Active card lives on the other arch — clicks here land on this arch's own
      // card-0 product, so fall through to the card-0 resolution below.
      if (!addedProducts.some((p) => p.id === activeProductCardId)) {
        return false;
      }
    }
    if (activeFixedGroupProductId !== null) return false;
    const card0Tn = MANDIBULAR_ALL_TEETH.find(tn => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0) ?? -1;
    const resolvedProduct = getToothProduct("mandibular", card0Tn);
    if (resolvedProduct) return !hasRetentionOptions(resolvedProduct);
    return !!activeProductIsRemovables;
  })();

  /** Bind chart mode to the active card (not merely "any removable on arch"). */
  const useRemovableToothChartPath =
    isActiveMandibularNonRetention &&
    !(activeProductCardId === 0 && activeFixedGroupProductId !== null);

  const mandibularCard0IsRemovable =
    mandibularHasRemovablesCard0 && (initialProductIsRemovable || activeProductIsRemovables);

  const mandibularArchHasRemovables = useMemo(
    () =>
      archHasRemovableProducts("mandibular", {
        card0IsRemovable: mandibularCard0IsRemovable,
        addedProducts,
      }),
    [mandibularCard0IsRemovable, addedProducts]
  );

  const mandibularMergedExtractions = useMemo(() => {
    const sources = collectArchRemovableProductSources(
      "mandibular",
      MANDIBULAR_ALL_TEETH,
      addedProducts,
      getToothProduct,
      getToothProductCard,
      mandibularCard0IsRemovable,
      card0Extractions
    );
    return mergeArchRemovableExtractions(sources);
  }, [
    mandibularCard0IsRemovable,
    addedProducts,
    getToothProduct,
    getToothProductCard,
    card0Extractions,
  ]);

  const mandibularRemovableProductCount = useMemo(() => {
    let count = mandibularCard0IsRemovable ? 1 : 0;
    count += addedProducts.filter(
      (ap) => ap.arch === "mandibular" && ap.product && !hasRetentionOptions(ap.product)
    ).length;
    return count;
  }, [mandibularCard0IsRemovable, addedProducts]);

  const useMandibularArchSharedRemovable = false;

  useEffect(() => {
    if (caseSubmitted || !card0SkipsLegacyDefaults) return;
    setExtractionsSetupComplete(0, true);
    if (!hasRetentionOptions(card0InitialProduct)) {
      setFixedRetentionSetupComplete(true);
    }
    if (useMandibularArchSharedRemovable) {
      setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, true);
    }
  }, [
    caseSubmitted,
    card0SkipsLegacyDefaults,
    card0InitialProduct,
    useMandibularArchSharedRemovable,
    setExtractionsSetupComplete,
    setFixedRetentionSetupComplete,
  ]);

  const mandibularFixedCard0GroupCount = useMemo(
    () =>
      mandibularHasFixedCard0
        ? countFixedCard0Groups(
            "mandibular",
            mandibularRetentionTypes as Record<string, string[]>,
            getToothProductCard,
            getToothProduct
          )
        : 0,
    [mandibularHasFixedCard0, mandibularRetentionTypes, getToothProductCard, getToothProduct]
  );

  const allowAccordionCollapse = archAllowsAccordionCollapse("mandibular", addedProducts, {
    hasRemovablesCard0: mandibularHasRemovablesCard0,
    fixedCard0GroupCount: mandibularFixedCard0GroupCount,
  });

  const isCardAccordionExpanded = useCallback(
    (slotId: string) => !allowAccordionCollapse || isAccordionExpanded(slotId),
    [allowAccordionCollapse, isAccordionExpanded]
  );

  const isCardAccordionInteractionEnabled = useCallback(
    (slotId: string) => !allowAccordionCollapse || isAccordionEnabled(slotId),
    [allowAccordionCollapse, isAccordionEnabled]
  );

  /** Single-product arch: that product's card stays activated for tooth status. */
  const mandibularSingleProductCardId = (() => {
    const archAps = addedProducts.filter(
      (p) => p.arch === "mandibular" || p.arch === "both"
    );
    const hasCard0 = mandibularHasFixedCard0 || mandibularHasRemovablesCard0;
    if (hasCard0 && archAps.length === 0) return 0;
    if (!hasCard0 && archAps.length === 1) return archAps[0].id;
    return null;
  })();

  const isCardActiveForToothStatus = (cardId: number) => {
    // The only product on this arch is always selection-ready — its status boxes
    // and hints stay visible even when the other arch's card holds global focus.
    if (mandibularSingleProductCardId !== null && cardId === mandibularSingleProductCardId) {
      return true;
    }
    if (activeProductCardId !== cardId) return false;
    if (cardId === 0) {
      if (mandibularHasFixedCard0 && !mandibularHasRemovablesCard0) return true;
      return isCardAccordionExpanded("removable0");
    }
    return isCardAccordionExpanded(addedProductSlotId(cardId));
  };

  const handleAddedRemovableAccordionToggle = (ap: AddedProduct) => {
    if (!allowAccordionCollapse) return;
    const slotId = addedProductSlotId(ap.id);
    if (!isAccordionEnabled(slotId)) return;
    if (!isCardAccordionExpanded(slotId)) {
      setShadeSelectionState({ arch: null, fieldType: null, productId: null });
    }
    toggleAccordionFocus(slotId, ap.id);
    setActiveFixedGroupProductId(null);
    setActiveExtractionCode(null);
  };

  const handleAddedProductAccordionToggle = (ap: AddedProduct) => {
    if (!allowAccordionCollapse) return;
    const slotId = addedProductSlotId(ap.id);
    if (!isAccordionEnabled(slotId)) return;
    if (!isCardAccordionExpanded(slotId)) {
      setShadeSelectionState({ arch: null, fieldType: null, productId: null });
    }
    toggleAccordionFocus(slotId, ap.id);
    if (hasRetentionOptions(ap.product)) {
      setActiveFixedGroupProductId(ap.product?.id ?? null);
      setActiveExtractionCode(null);
    } else {
      setActiveFixedGroupProductId(null);
      setActiveExtractionCode(null);
    }
  };

  const handleCard0RemovableAccordionToggle = () => {
    if (!allowAccordionCollapse) return;
    if (!isAccordionEnabled("removable0")) return;
    toggleAccordionFocus("removable0", 0);
    setActiveFixedGroupProductId(null);
    setActiveExtractionCode(null);
  };

  const mandibularArchExtractionsReady = isExtractionsSetupComplete(
    mandibularMergedExtractions,
    ARCH_SHARED_REMOVABLE_ACK_CARD_ID,
    caseSubmitted
  );

  const isActiveMandibularProductDetailPending =
    (activeProductCardId === 0 && initialProductDetailsPending) ||
    (useRemovableToothChartPath &&
      isArchRemovableProductDetailPending(
        "mandibular",
        MANDIBULAR_ALL_TEETH,
        MANDIBULAR_PRODUCT_SENTINEL,
        activeProductCardId,
        addedProducts,
        getToothProduct,
        getToothProductCard,
        isProductLoading
      ));

  useEffect(() => {
    if (!isActiveMandibularProductDetailPending) return;
    setActiveExtractionCode(null);
    setToothStatusPopoverTooth(null);
    setToothStatusPopoverExtractions([]);
    if (retentionPopoverState.arch === "mandibular") {
      setRetentionPopoverState({ arch: null, toothNumber: null });
    }
  }, [
    isActiveMandibularProductDetailPending,
    retentionPopoverState.arch,
    setRetentionPopoverState,
  ]);

  const activeCardMandibularTeeth = (() => {
    if (activeProductCardId !== 0) {
      // Check if the active added card is a removable product
      const activeAp = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular");
      if (activeAp) {
        if (isNonRetentionCategory(activeAp.product)) {
          return mandibularTeeth.filter(tn => getToothProductCard("mandibular", tn) === activeProductCardId);
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

  // ── Splint (auto from retention types + manual overlay) + Wing retainers ──
  // Auto links (Rule S1) derive from retention types; the user's manual add/remove
  // edits are kept as an overlay and combined per SPLINT_RECOMPUTE_MODE.
  const splintKeyForMandibularTooth = useCallback(
    (tooth: number): string => {
      const card = getToothProductCard("mandibular", tooth);
      if (card !== 0) return `card:${card}`;
      const pid = getToothProduct("mandibular", tooth)?.id;
      return pid != null ? `fixed:${pid}` : "card0";
    },
    [getToothProductCard, getToothProduct]
  );
  const isMandibularToothAssigned = (tn: number): boolean => {
    const rt = mandibularRetentionTypes[tn];
    if (rt && rt.length > 0) return true;
    const code = mandibularToothExtractionMap[tn];
    return !!code && code !== "TIM";
  };
  const autoSplintLinksByKey = useMemo(() => {
    const teethByKey: Record<string, number[]> = {};
    for (const tn of mandibularTeeth) {
      if (!(mandibularRetentionTypes[tn]?.length)) continue;
      const key = splintKeyForMandibularTooth(tn);
      (teethByKey[key] ??= []).push(tn);
    }
    const byKey: Record<string, number[]> = {};
    for (const [key, teeth] of Object.entries(teethByKey)) {
      const isSplinted = getToothProduct("mandibular", teeth[0])?.is_splinted === "Yes";
      byKey[key] = isSplinted ? deriveAutoSplintLinks(teeth, mandibularRetentionTypes) : [];
    }
    return byKey;
  }, [mandibularTeeth, mandibularRetentionTypes, splintKeyForMandibularTooth, getToothProduct]);
  const [splintOverlayByKey, setSplintOverlayByKey] = useState<Record<string, SplintOverlay>>({});
  const effectiveSplintLinksByKey = useMemo(() => {
    const keys = new Set([
      ...Object.keys(autoSplintLinksByKey),
      ...Object.keys(splintOverlayByKey),
    ]);
    const out: Record<string, number[]> = {};
    for (const key of keys) {
      const links = combineSplintLinks(autoSplintLinksByKey[key] ?? [], splintOverlayByKey[key]);
      if (links.length > 0) out[key] = links;
    }
    return out;
  }, [autoSplintLinksByKey, splintOverlayByKey]);
  useEffect(() => {
    onSplintLinksChange?.(effectiveSplintLinksByKey);
  }, [effectiveSplintLinksByKey, onSplintLinksChange]);
  const mandibularSplintSummaryFor = useCallback(
    (teeth: number[]): string => {
      if (teeth.length === 0) return "";
      const key = splintKeyForMandibularTooth(teeth[0]);
      return formatSplintGroups(teeth, effectiveSplintLinksByKey[key] ?? []);
    },
    [splintKeyForMandibularTooth, effectiveSplintLinksByKey]
  );
  const activeMandibularProduct = (() => {
    const rep = activeCardMandibularTeeth[0];
    if (rep != null) {
      const p = getToothProduct("mandibular", rep);
      if (p) return p;
    }
    if (activeProductCardId !== 0) {
      return (
        getToothProduct("mandibular", -activeProductCardId) ??
        addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "mandibular")?.product ??
        null
      );
    }
    return null;
  })();
  const activeMandibularProductIsSplinted = activeMandibularProduct?.is_splinted === "Yes";
  // Combined popover (Q2): extraction statuses alongside retention for a "both" product.
  const mandibularRetentionExtractionOptions = useMemo<ExtractionStatusOption[] | undefined>(() => {
    if (activeMandibularProduct?.has_extraction !== "Yes") return undefined;
    const opts = (activeMandibularProduct.extractions ?? [])
      .filter((e) => e.status === "Active" && !!e.code && !!e.name)
      .filter((e) => e.code !== "TIM" && !e.name.toLowerCase().includes("in mouth"))
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .map((e) => ({
        code: e.code,
        name: e.name,
        imageUrl: e.image_url ?? null,
        imagesByTooth: e.images?.length
          ? e.images.reduce<Record<number, string | null>>((m, img) => {
              m[img.tooth_number] = img.image_url;
              return m;
            }, {})
          : undefined,
      }));
    return opts.length > 0 ? opts : undefined;
  }, [activeMandibularProduct]);
  /**
   * Tooth status boxes for fixed ("both") products that also have extractions —
   * same behavior as removables: click a box to activate it, then click teeth on
   * the chart to assign that status directly (mutual exclusivity with retention
   * is enforced in the chart click handler); the combined popover stays the
   * per-tooth assignment path.
   */
  const renderFixedExtractionStatusBoxes = (
    product: ProductApiData | null | undefined,
    groupTeeth: number[]
  ) => {
    if (product?.has_extraction !== "Yes") return undefined;
    const extractions = product.extractions ?? [];
    if (extractions.length === 0) return undefined;
    if (isSingleDefaultOnlyExtractionList(extractions)) return undefined;
    return (
      <ToothStatusBoxes
        extractions={extractions}
        selectedTeeth={buildExtractionScopeTeeth(
          groupTeeth,
          mandibularToothExtractionMap,
          mandibularClaspTeeth,
          MANDIBULAR_ALL_TEETH
        )}
        allArchTeeth={MANDIBULAR_ALL_TEETH}
        toothExtractionMap={mandibularToothExtractionMap}
        claspTeeth={mandibularClaspTeeth}
        activeExtractionCode={activeExtractionCode}
        onActiveExtractionChange={(code, exts) => {
          setActiveExtractionCode(code);
          setActiveExtractions(exts ?? extractions);
          if (code !== null) setIsSelectionModeActive(true);
        }}
        onToothExtractionToggle={(tn, code, exts) =>
          handleToothExtractionToggle("mandibular", tn, code, exts ?? extractions)
        }
        onSelectAllTeeth={() => {}}
        submitted={caseSubmitted}
        hideDefaultBox={true}
        skipDefaultAutoSelect={true}
        disableRequiredValidation={true}
        grayed={isActiveMandibularProductDetailPending}
      />
    );
  };
  const handleToggleMandibularSplint = useCallback(
    (lower: number) => {
      const key = splintKeyForMandibularTooth(lower);
      const auto = autoSplintLinksByKey[key] ?? [];
      setSplintOverlayByKey((prev) => ({
        ...prev,
        [key]: toggleSplintOverlay(prev[key], auto, lower),
      }));
    },
    [splintKeyForMandibularTooth, autoSplintLinksByKey]
  );
  // Drop overlay edits once either tooth of the pair is deselected or reassigned to a
  // different product — so manual edits never resurrect on re-select or leak on submit.
  const mandibularAssignmentSig = mandibularTeeth
    .map((tn) => `${tn}:${getToothProduct("mandibular", tn)?.id ?? ""}`)
    .join(",");
  useEffect(() => {
    setSplintOverlayByKey((prev) => {
      let changed = false;
      const next: Record<string, SplintOverlay> = {};
      for (const [key, ov] of Object.entries(prev)) {
        const validPair = (lower: number): boolean => {
          if (!mandibularTeeth.includes(lower) || !mandibularTeeth.includes(lower + 1)) return false;
          const pa = getToothProduct("mandibular", lower)?.id;
          const pb = getToothProduct("mandibular", lower + 1)?.id;
          if (pa == null || pa !== pb) return false;
          return splintKeyForMandibularTooth(lower) === key;
        };
        const added = ov.added.filter(validPair);
        const removed = ov.removed.filter(validPair);
        if (added.length !== ov.added.length || removed.length !== ov.removed.length) changed = true;
        if (added.length > 0 || removed.length > 0) next[key] = { added, removed };
        else changed = true;
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandibularAssignmentSig]);

  const mandibularDefaultChartProduct = useMemo(
    () =>
      resolveSlipDefaultChartProduct({
        arch: "mandibular",
        activeProduct: activeMandibularProduct as Record<string, unknown> | null,
        card0InitialProduct: card0InitialProduct as Record<string, unknown> | null,
        slipInitialArch,
        isOpposingMirrorPanel: !!opposingProductData,
      }),
    [activeMandibularProduct, card0InitialProduct, slipInitialArch, opposingProductData],
  );

  // Select-only-implant: chart clicks toggle Implant on any tooth directly;
  // extraction statuses stay locked to the product default chart display.
  const mandibularImplantOnlyMode = useMemo(
    () =>
      activeProductCardId === 0 &&
      implantOnlySelectionModeForArch(
        mandibularDefaultChartProduct,
        "mandibular",
        slipInitialArch,
      ),
    [activeProductCardId, mandibularDefaultChartProduct, slipInitialArch],
  );

  const mandibularSlipSvgDisplay = useMemo(
    () =>
      mergeProductDefaultToothChartForSlipSvgDisplay({
        product: mandibularDefaultChartProduct,
        arch: "mandibular",
        userToothExtractionMap: opposingProductData
          ? opposingToothExtractionMap
          : mandibularToothExtractionMap,
        userClaspTeeth: opposingProductData ? opposingClaspTeeth : mandibularClaspTeeth,
        userRetentionTypesByTooth: mandibularRetentionTypes,
      }),
    [
      mandibularDefaultChartProduct,
      opposingProductData,
      opposingToothExtractionMap,
      mandibularToothExtractionMap,
      opposingClaspTeeth,
      mandibularClaspTeeth,
      mandibularRetentionTypes,
    ],
  );

  const activeMandibularSvgState = {
    toothExtractionMap: mandibularSlipSvgDisplay.toothExtractionMap,
    toothStatusByTooth: opposingProductData
      ? opposingToothExtractionMap
      : mandibularToothExtractionMap,
    claspTeeth: mandibularSlipSvgDisplay.claspTeeth,
    retentionTypesByTooth: mandibularSlipSvgDisplay.retentionTypesByTooth,
  };
  const useScopedRetentionMode = shouldUseScopedRetentionMode({
    activeProductCardId,
    activeProductIsRemovables,
    activeFixedGroupProductId,
  });

  const ownArchToothChartEnabled =
    !allowAccordionCollapse ||
    isOwnArchToothChartEnabled("mandibular", activeAccordionKey) ||
    forceOwnArchChartEnabled;
  const opposingToothChartEnabled = !!opposingProductData;
  const toothChartInteractionEnabled = ownArchToothChartEnabled || opposingToothChartEnabled;

  // Splint UI (auto S1 + manual S2) is only available for products flagged splintable.
  // When `is_splinted` is "No", no connector or auto-splint shows even if rules match.
  const mandibularSplintEnabled =
    activeMandibularProductIsSplinted &&
    ownArchToothChartEnabled &&
    !caseSubmitted &&
    !opposingProductData &&
    activeCardMandibularTeeth.length >= 2;
  const mandibularSplintableLinks = (() => {
    if (!mandibularSplintEnabled) return [] as number[];
    const sorted = [...activeCardMandibularTeeth].sort((a, b) => a - b);
    const out: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] !== sorted[i] + 1) continue;
      if (!isMandibularToothAssigned(sorted[i]) || !isMandibularToothAssigned(sorted[i + 1])) continue;
      const pa = getToothProduct("mandibular", sorted[i])?.id;
      const pb = getToothProduct("mandibular", sorted[i + 1])?.id;
      if (pa != null && pa === pb) out.push(sorted[i]);
    }
    return out;
  })();
  // Effective splinted gaps across ALL selected teeth on this arch (auto + manual).
  const mandibularSplintedLinks = useMemo(() => {
    const out: number[] = [];
    for (const links of Object.values(effectiveSplintLinksByKey)) out.push(...links);
    return [...new Set(out)].sort((a, b) => a - b);
  }, [effectiveSplintLinksByKey]);
  // Wing retainers: empty arch neighbors of any pontic (Maryland / cantilever).
  const mandibularWingTeeth = useMemo(
    () => deriveWingTeeth(mandibularRetentionTypes, MANDIBULAR_ALL_TEETH),
    [mandibularRetentionTypes]
  );
  // Pontic is offered only once the tooth's product already has an abutment tooth
  // (Prep/Implant) other than this one — a pontic needs support first.
  const canSelectMandibularPontic = useCallback(
    (toothNumber: number): boolean => {
      const card = getToothProductCard("mandibular", toothNumber);
      const productId = getToothProduct("mandibular", toothNumber)?.id;
      return MANDIBULAR_ALL_TEETH.some((tn) => {
        if (tn === toothNumber) return false;
        if (getToothProductCard("mandibular", tn) !== card) return false;
        const pid = getToothProduct("mandibular", tn)?.id;
        if (productId != null && pid != null && pid !== productId) return false;
        const types = mandibularRetentionTypes[tn] ?? [];
        return types.includes("Prep") || types.includes("Implant");
      });
    },
    [getToothProductCard, getToothProduct, mandibularRetentionTypes]
  );

  const activeMandibularRetentionOptions = (() => {
    if (activeProductCardId !== 0) {
      const activeAp = addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "mandibular");
      const assignedTooth = MANDIBULAR_ALL_TEETH.find(
        (tn) => getToothProductCard("mandibular", tn) === activeProductCardId && !!getToothProduct("mandibular", tn)
      );
      return (
        (assignedTooth ? getToothProduct("mandibular", assignedTooth)?.retention_options : undefined) ??
        (activeAp ? getToothProduct("mandibular", -activeAp.id)?.retention_options : undefined) ??
        activeAp?.product?.retention_options ??
        []
      );
    }

    if (activeFixedGroupProductId !== null) {
      const groupedTooth = MANDIBULAR_ALL_TEETH.find(
        (tn) =>
          getToothProductCard("mandibular", tn) === 0 &&
          getToothProduct("mandibular", tn)?.id === activeFixedGroupProductId
      );
      return groupedTooth ? (getToothProduct("mandibular", groupedTooth)?.retention_options ?? []) : [];
    }

    const card0Tooth = MANDIBULAR_ALL_TEETH.find(
      (tn) => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0
    );
    return card0Tooth
      ? (getToothProduct("mandibular", card0Tooth)?.retention_options ?? retentionOptions ?? [])
      : (retentionOptions ?? []);
  })();

  // Tooth-selection hint descriptor for the mandibular chart. Same split as maxillary:
  // replace/flipper/count above the chart; reference hint above status boxes in the accordion.
  const mandibularToothHint: { kind: "replace" | "reference" | "flipper" | "count"; text: string; className: string } | null = (() => {
    if (!showMandibular) return null;
    if (activeProductSkipsChartSetup) return null;
    if (activeProductIsRemovables) {
      const hintActiveAp = activeProductCardId !== 0
        ? addedProducts.find(ap => ap.id === activeProductCardId && (ap.arch === "mandibular" || ap.arch === "both"))
        : undefined;
      // Active card on the other arch → hint describes this arch's own card-0 product.
      const hintUsesArchCard0 = activeProductCardId === 0 || !hintActiveAp;
      const hintCard0Product = (() => {
        const t = MANDIBULAR_ALL_TEETH.find(tn => getToothProductCard("mandibular", tn) === 0);
        return t ? getToothProduct("mandibular", t) : undefined;
      })();
      const activeExtractions = hintUsesArchCard0
        ? hintCard0Product?.extractions
        : hintActiveAp?.product?.extractions;
      if (isFullDentureProduct(activeExtractions)) return null;
      const hintExtractions = (
        useMandibularArchSharedRemovable
          ? mandibularMergedExtractions
          : ((activeExtractions?.length ? activeExtractions : card0Extractions) as ProductExtraction[])
      );
      if (!hasConfiguredExtractions(hintExtractions)) return null;
      const hintAckCardId = useMandibularArchSharedRemovable
        ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID
        : hintUsesArchCard0 ? 0 : activeProductCardId;
      const hintProduct = hintUsesArchCard0 ? hintCard0Product : hintActiveAp?.product;
      const baseProductName = hintProduct?.name ?? "";
      const hintCustomLabel = resolveProductCustomLabel(
        hintProduct ?? (hintUsesArchCard0 ? card0InitialProduct : undefined),
      );
      if (
        isFlipperOrStayplateProduct(baseProductName) &&
        isRemovableToothStatusPopoverEligible(hintExtractions, activeExtractionCode) &&
        isRemovableToothSelectionFocused({
          caseSubmitted, activeProductCardId, confirmDetailsChecked,
          isCardActive: isCardActiveForToothStatus(activeProductCardId),
          toothChartInteractionEnabled, teethCount: MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === activeProductCardId).length,
          isSelectionModeActive,
        })
      ) {
        if (requiresExtractionsAcknowledgement(hintExtractions) && isExtractionsSetupComplete(hintExtractions, hintAckCardId, caseSubmitted)) {
          return null;
        }
        return { kind: "flipper", text: FLIPPER_STAYPLATE_SELECTION_HINT, className: "text-center font-bold text-sm mb-1 text-red-600" };
      }
      if (activeExtractionCode === null) {
        return { kind: "replace", text: hintCustomLabel ?? `Select teeth to replace${baseProductName ? ` ${baseProductName}` : ""}`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
      }
      return { kind: "reference", text: `Select teeth for reference (not added to ${baseProductName || "product"})`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
    }
    if (opposingProductData && !useScopedRetentionMode) {
      const opposingName = opposingProductData.name ?? "product";
      if (opposingActiveExtractionCode === null) {
        return null;
      }
      return { kind: "reference", text: `Select teeth for reference (not added to ${opposingName})`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
    }
    if (
      !useRemovableToothChartPath &&
      ownArchToothChartEnabled &&
      (!opposingProductData || useScopedRetentionMode) &&
      (isCardActiveForToothStatus(activeProductCardId) || forceOwnArchChartEnabled)
    ) {
      const fixedProduct = activeProductCardId !== 0
        ? addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular")?.product
        : ((() => { const t = MANDIBULAR_ALL_TEETH.find(tn => getToothProductCard("mandibular", tn) === 0 && (activeFixedGroupProductId === null || getToothProduct("mandibular", tn)?.id === activeFixedGroupProductId)); return t ? getToothProduct("mandibular", t) : undefined; })() ?? card0InitialProduct);
      const fixedProductName = (fixedProduct?.name ?? "") || initialProductName || "";
      const fixedCustomLabel = resolveProductCustomLabel(fixedProduct);
      return { kind: "replace", text: fixedCustomLabel ?? `Select teeth to replace${fixedProductName ? ` with ${fixedProductName}` : ""}`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
    }
    const checkedCount = mandibularCheckedTeeth.length;
    const activeProductName = activeProductCardId !== 0
      ? addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular")?.product?.name || ""
      : getToothProduct("mandibular", mandibularTeeth[0])?.name || "";
    return checkedCount > 0
      ? { kind: "count", text: `${checkedCount} ${checkedCount === 1 ? "TOOTH" : "TEETH"} to include in ${activeProductName}`, className: "text-center text-orange-500 font-bold text-sm mb-1" }
      : null;
  })();

  return (
    <div className={`flex-1 min-w-0 px-0 order-3 lg:order-none relative ${disabled ? "invisible" : "visible"}`}>
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
        {showMandibular && (
          <div className="pr-9">
            {mandibularToothHint && mandibularToothHint.kind !== "reference" && (
              <p className={mandibularToothHint.className}>{mandibularToothHint.text}</p>
            )}
            {(() => {
              const currentExtractions = activeProductCardId !== 0
                ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular")?.product?.extractions ?? [])
                : card0Extractions;
              const isSingleDefault = activeProductIsRemovables && isSingleDefaultOnlyExtractionList(currentExtractions);
              return (
                <MandibularTeethSVG
                  selectedTeeth={activeCardMandibularTeeth}
                  willExtractTeeth={[]}
                  missingTeeth={[]}
                  splintEnabled={mandibularSplintEnabled}
                  splintableLinks={mandibularSplintableLinks}
                  splintedLinks={mandibularSplintedLinks}
                  onToggleSplintLink={handleToggleMandibularSplint}
                  wingTeeth={mandibularWingTeeth}
                  canSelectPontic={canSelectMandibularPontic}
                  retentionPopoverExtractionOptions={mandibularRetentionExtractionOptions}
                  onSelectExtractionStatus={(toothNumber, code) => {
                    // Mutual exclusivity (Q1): selecting an extraction status clears
                    // any retention type on this tooth, then sets the status.
                    const current = mandibularRetentionTypes[toothNumber];
                    if (current && current.length > 0) {
                      handleSelectRetentionType("mandibular", toothNumber, current[0]);
                    }
                    handleToothExtractionToggle(
                      "mandibular",
                      toothNumber,
                      code,
                      activeMandibularProduct?.extractions
                    );
                    setRetentionPopoverState({ arch: null, toothNumber: null });
                  }}
                  onToothClick={(toothNumber: number) => {
                    if (!toothChartInteractionEnabled) {
                      return;
                    }

                    // Select-only-implant: bypass every other click path — the
                    // wrapped click handler toggles Implant on the clicked tooth.
                    if (mandibularImplantOnlyMode) {
                      if (!ownArchToothChartEnabled) return;
                      handleMandibularToothClick(toothNumber);
                      return;
                    }

                    // When a non-retention (removable/ortho) card is active, show tooth status popover.
                    if (useRemovableToothChartPath) {
                      if (!ownArchToothChartEnabled) {
                        return;
                      }
                      // Active card on the other arch: land the click on this arch's own
                      // card-0 product and move focus to it.
                      const clickCardAppliesToArch =
                        activeProductCardId === 0 ||
                        addedProducts.some(
                          (p) =>
                            p.id === activeProductCardId &&
                            (p.arch === "mandibular" || p.arch === "both")
                        );
                      const archHasCard0 =
                        mandibularHasRemovablesCard0 || mandibularHasFixedCard0;
                      if (!clickCardAppliesToArch && !archHasCard0) {
                        return;
                      }
                      const effectiveToothStatusCardId = clickCardAppliesToArch
                        ? activeProductCardId
                        : 0;
                      if (!clickCardAppliesToArch) {
                        setActiveProductCardId(0);
                      }
                      // Cross-arch redirect: this arch's lone card-0 product is always
                      // selection-ready, so process the click immediately (single click)
                      // instead of only moving focus and requiring a second click.
                      const cardActiveForClick = clickCardAppliesToArch
                        ? isCardActiveForToothStatus(activeProductCardId)
                        : true;
                      if (!cardActiveForClick) {
                        return;
                      }
                      // If the user has clicked Done (acknowledged), reset Done state so they
                      // can continue editing — the click proceeds normally and Done reappears.
                      const currentAckExtractions = effectiveToothStatusCardId !== 0
                        ? (addedProducts.find(ap => ap.id === effectiveToothStatusCardId && ap.arch === "mandibular")?.product?.extractions ?? [])
                        : card0Extractions;
                      const ackCardId = useMandibularArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : effectiveToothStatusCardId;
                      if (isExtractionsSetupComplete(currentAckExtractions, ackCardId, caseSubmitted)) {
                        setExtractionsSetupComplete(ackCardId, false);
                        setIsSelectionModeActive(true);
                      }
                      // Rule 1: active box selected → assign directly, skip popover.
                      // Skipped on cross-arch clicks — the active box belongs to the other arch.
                      if (activeExtractionCode && clickCardAppliesToArch) {
                        const activeExt = activeExtractions.find((e) => e.code === activeExtractionCode);
                        if (
                          isOverlayExtractionCode(activeExtractionCode, activeExtractions) &&
                          !toothHasTimBaseExtraction(toothNumber, mandibularToothExtractionMap, activeExtractions)
                        ) {
                          return;
                        }
                        const maxTeeth = activeExt?.max_teeth && activeExt.max_teeth > 0 ? activeExt.max_teeth : null;
                        const currentCount = Object.values(mandibularToothExtractionMap).filter((c) => c === activeExtractionCode).length;
                        const alreadyAssigned = mandibularToothExtractionMap[toothNumber] === activeExtractionCode;
                        if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) return;
                        if (alreadyAssigned) {
                          // Already has this status — open popover; removal only via popover Remove.
                        } else {
                        if (
                          !mandibularTeeth.includes(toothNumber) &&
                          shouldAddToProductSelectionOnRemovableClick({
                            activeProductIsRemovables: true,
                            activeExtractionCode,
                          })
                        ) {
                          selectAllMandibularTeeth([toothNumber]);
                        }
                        handleToothExtractionToggle("mandibular", toothNumber, activeExtractionCode, activeExtractions);
                        setMandibularNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                        return;
                        }
                      }
                      // Rule 2: open tooth status popover (also when tooth already has the active status)
                      const exts = resolveRemovablePopoverExtractionsForActiveCard({
                        useArchSharedRemovable: useMandibularArchSharedRemovable,
                        mergedExtractions: mandibularMergedExtractions,
                        activeProductCardId: effectiveToothStatusCardId,
                        addedProducts,
                        arch: "mandibular",
                        allArchTeeth: MANDIBULAR_ALL_TEETH,
                        getToothProduct,
                        getToothProductCard,
                        card0Extractions,
                      });
                      if (isSingleDefaultOnlyExtractionList(exts)) return;
                      if (!hasConfiguredExtractions(exts)) return;
                      if (canUseToothForActiveProduct && !canUseToothForActiveProduct("mandibular", toothNumber)) {
                        return;
                      }
                      setToothStatusPopoverTooth(toothNumber);
                      setToothStatusPopoverExtractions(exts);
                      return;
                    }
                    // When an added Fixed Restoration card is active, bypass opposingProductData routing
                    // so the user can assign teeth to the new product via the retention popover.
                    if (opposingProductData && !useScopedRetentionMode) {
                      const opposingMappedExtractions = mapOppositeExtractionsToProductExtractions(
                        opposingProductData.opposite_extractions,
                        opposingProductData.extractions
                      );
                      if (isSingleDefaultOnlyExtractionList(opposingMappedExtractions)) {
                        return;
                      }
                      if (opposingActiveExtractionCode) {
                        const opposingExt = opposingMappedExtractions.find(
                          (e) => e.code === opposingActiveExtractionCode
                        );
                        if (
                          isOverlayExtractionCode(opposingActiveExtractionCode, opposingMappedExtractions) &&
                          !toothHasTimBaseExtraction(toothNumber, opposingToothExtractionMap, opposingMappedExtractions)
                        ) {
                          return;
                        }
                        const maxTeeth = opposingExt?.max_teeth && opposingExt.max_teeth > 0 ? opposingExt.max_teeth : null;
                        const currentCount = Object.values(opposingToothExtractionMap).filter(
                          (c) => c === opposingActiveExtractionCode
                        ).length;
                        const alreadyAssigned = opposingToothExtractionMap[toothNumber] === opposingActiveExtractionCode;
                        if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                          return;
                        }
                        if (alreadyAssigned) {
                          // Already has this status — open popover; removal only via popover Remove.
                        } else {
                          onOpposingExtractionToggle?.(
                            toothNumber,
                            opposingActiveExtractionCode,
                            opposingMappedExtractions
                          );
                          setOpposingNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                          return;
                        }
                      } else {
                        if (
                          ownArchToothChartEnabled &&
                          canUseToothForActiveProduct &&
                          !canUseToothForActiveProduct("mandibular", toothNumber)
                        ) {
                          return;
                        }
                        setToothStatusPopoverTooth(toothNumber);
                        setToothStatusPopoverExtractions(opposingMappedExtractions);
                      }
                    } else if (activeExtractionCode && !useScopedRetentionMode) {
                      if (!ownArchToothChartEnabled) {
                        return;
                      }
                      // Mirror the removables active-box rules for fixed "both" products.
                      if (
                        isOverlayExtractionCode(activeExtractionCode, activeExtractions) &&
                        !toothHasTimBaseExtraction(toothNumber, mandibularToothExtractionMap, activeExtractions)
                      ) {
                        return;
                      }
                      const activeExt = activeExtractions.find((e) => e.code === activeExtractionCode);
                      const maxTeeth = activeExt?.max_teeth && activeExt.max_teeth > 0 ? activeExt.max_teeth : null;
                      const currentCount = Object.values(mandibularToothExtractionMap).filter((c) => c === activeExtractionCode).length;
                      const alreadyAssigned = mandibularToothExtractionMap[toothNumber] === activeExtractionCode;
                      if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                        return;
                      }
                      if (alreadyAssigned) {
                        // Already has this status — open the combined popover; removal only via popover.
                        setRetentionPopoverState({ arch: "mandibular", toothNumber });
                        return;
                      }
                      // Mutual exclusivity: assigning a status clears any retention type on this tooth.
                      const currentRetention = mandibularRetentionTypes[toothNumber];
                      if (currentRetention && currentRetention.length > 0) {
                        handleSelectRetentionType("mandibular", toothNumber, currentRetention[0]);
                      }
                      if (!mandibularTeeth.includes(toothNumber)) {
                        handleMandibularToothClick(toothNumber);
                      }
                      handleToothExtractionToggle("mandibular", toothNumber, activeExtractionCode, activeExtractions);
                      setMandibularNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                      // The tooth-select above may open the retention popover — keep it closed while assigning.
                      setRetentionPopoverState({ arch: null, toothNumber: null });
                    } else if (ownArchToothChartEnabled) {
                      if (
                        (activeProductCardId !== 0 || activeFixedGroupProductId !== null) &&
                        !isCardActiveForToothStatus(activeProductCardId)
                      ) {
                        return;
                      }
                      handleMandibularToothClick(toothNumber);
                    }
                  }}
                  disabled={
                    isAnyModalOpen ||
                    !!panelGumShadePicker ||
                    (shadeSelectionState.arch === "mandibular" && shadeSelectionState.fieldType !== null) ||
                    isSingleDefault ||
                    isActiveMandibularProductDetailPending ||
                    !toothChartInteractionEnabled
                  }
                  className="w-full"
                  retentionTypesByTooth={activeMandibularSvgState.retentionTypesByTooth}
                  showRetentionPopover={
                    !isActiveMandibularProductDetailPending &&
                    retentionPopoverState.arch === "mandibular" &&
                    !useRemovableToothChartPath &&
                    toothStatusPopoverTooth === null &&
                    (!opposingProductData || useScopedRetentionMode)
                  }
                  retentionPopoverTooth={retentionPopoverState.toothNumber}
                  onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                  onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                  onDeselectTooth={handleMandibularToothDeselect}
                  retentionOptions={activeMandibularRetentionOptions}
                  getRetentionOptionsForTooth={(toothNumber) =>
                    getToothProduct("mandibular", toothNumber)?.retention_options ??
                    (mandibularDefaultChartProduct as ProductApiData | null)?.retention_options ??
                    activeMandibularRetentionOptions
                  }
                  toothExtractionMap={activeMandibularSvgState.toothExtractionMap}
                  hideSelectionIndicators={
                    isActiveMandibularProductDetailPending ||
                    (!!opposingProductData && activeProductCardId === 0) ||
                    useRemovableToothChartPath
                  }
                  showCheckboxes={false}
                  onCheckedTeethChange={handleMandibularCheckedTeethChange}
                  claspTeeth={activeMandibularSvgState.claspTeeth}
                  getAddonValue={(toothNumber) => getFieldValue("mandibular", toothNumber, "addons")}
                  showToothStatusPopover={
                    !isActiveMandibularProductDetailPending &&
                    (useRemovableToothChartPath || (!!opposingProductData && activeProductCardId === 0)) &&
                    toothStatusPopoverTooth !== null
                  }
                  toothStatusPopoverTooth={toothStatusPopoverTooth}
                  toothStatusByTooth={activeMandibularSvgState.toothStatusByTooth}
                  toothStatusOptions={toothStatusPopoverExtractions
                    .filter(e => e.status === "Active")
                    .sort((a, b) => a.sequence - b.sequence)
                    .map(e => ({
                      code: e.code,
                      name: e.name,
                      color: e.color ?? "#aaa",
                      visibilityType: e.visibility_type,
                      imagesByTooth: e.images?.length
                        ? e.images.reduce<Record<number, string | null>>((m, img) => { m[img.tooth_number] = img.image_url; return m }, {})
                        : undefined,
                    }))}
                  extractionsByCode={(() => {
                    const allExts: ProductExtraction[] = [];
                    const defaultChartExts = (mandibularDefaultChartProduct as ProductApiData | null)?.extractions;
                    if (defaultChartExts?.length) allExts.push(...defaultChartExts);
                    for (const tn of MANDIBULAR_ALL_TEETH) {
                      const p = getToothProduct("mandibular", tn);
                      if (p?.extractions) allExts.push(...p.extractions);
                    }
                    for (const ap of addedProducts) {
                      if (ap.arch === "mandibular" && (ap.product as any)?.extractions) {
                        allExts.push(...(ap.product as any).extractions as ProductExtraction[]);
                      }
                    }
                    if (opposingProductData) {
                      allExts.push(
                        ...mapOppositeExtractionsToProductExtractions(
                          opposingProductData.opposite_extractions,
                          opposingProductData.extractions
                        )
                      );
                    }
                    allExts.push(...toothStatusPopoverExtractions);
                    return allExts.reduce<Record<string, { code: string; name: string; visibility_type?: string; color?: string | null; overlay?: string }>>((acc, e) => {
                      acc[e.code] = { code: e.code, name: e.name, visibility_type: e.visibility_type, color: e.color ?? null, overlay: e.overlay };
                      return acc;
                    }, {});
                  })()}
                  extractionImagesByCode={(() => {
                    const allExts: ProductExtraction[] = [];
                    const defaultChartExts = (mandibularDefaultChartProduct as ProductApiData | null)?.extractions;
                    if (defaultChartExts?.length) allExts.push(...defaultChartExts);
                    for (const tn of MANDIBULAR_ALL_TEETH) {
                      const p = getToothProduct("mandibular", tn);
                      if (p?.extractions) allExts.push(...p.extractions);
                    }
                    for (const ap of addedProducts) {
                      if (ap.arch === "mandibular" && (ap.product as any)?.extractions) {
                        allExts.push(...(ap.product as any).extractions as ProductExtraction[]);
                      }
                    }
                    if (opposingProductData) {
                      allExts.push(
                        ...mapOppositeExtractionsToProductExtractions(
                          opposingProductData.opposite_extractions,
                          opposingProductData.extractions
                        )
                      );
                    }
                    allExts.push(...toothStatusPopoverExtractions);
                    return allExts
                      .filter(e => e.images?.length)
                      .reduce<Record<string, Record<number, string | null>>>((acc, e) => {
                        acc[e.code] = e.images.reduce<Record<number, string | null>>((m, img) => { m[img.tooth_number] = img.image_url; return m }, {});
                        return acc;
                      }, {});
                  })()}
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
                    const addedRemovableActive = useRemovableToothChartPath && activeProductCardId !== 0;
                    if (opposingProductData && !addedRemovableActive) {
                      const opposingMappedExtractions = mapOppositeExtractionsToProductExtractions(
                        opposingProductData.opposite_extractions,
                        opposingProductData.extractions
                      );
                      if (
                        isOverlayExtractionCode(code, opposingMappedExtractions) &&
                        !toothHasTimBaseExtraction(toothNumber, opposingToothExtractionMap, opposingMappedExtractions)
                      ) {
                        setToothStatusPopoverTooth(null);
                        return;
                      }
                      if (
                        shouldApplyExtractionOnPopoverSelect(
                          opposingToothExtractionMap[toothNumber],
                          code
                        )
                      ) {
                        onOpposingExtractionToggle?.(toothNumber, code, opposingMappedExtractions);
                      } else {
                        onSelectAllOpposingTeeth?.([toothNumber]);
                      }
                      if (!isOverlayExtractionCode(code, opposingMappedExtractions)) {
                        setOpposingNoActiveBoxTeeth?.((prev) =>
                          prev.includes(toothNumber) ? prev : [...prev, toothNumber]
                        );
                      }
                      setToothStatusPopoverTooth(null);
                      return;
                    }
                    if (
                      isOverlayExtractionCode(code, toothStatusPopoverExtractions) &&
                      !toothHasTimBaseExtraction(toothNumber, mandibularToothExtractionMap, toothStatusPopoverExtractions)
                    ) {
                      setToothStatusPopoverTooth(null);
                      return;
                    }
                    selectAllMandibularTeeth([toothNumber]);
                    if (
                      shouldApplyExtractionOnPopoverSelect(
                        mandibularToothExtractionMap[toothNumber],
                        code
                      )
                    ) {
                      handleToothExtractionToggle("mandibular", toothNumber, code, toothStatusPopoverExtractions);
                    }
                    if (!isOverlayExtractionCode(code, toothStatusPopoverExtractions)) {
                      setMandibularNoActiveBoxTeeth?.((prev) =>
                        prev.includes(toothNumber) ? prev : [...prev, toothNumber]
                      );
                    }
                    setToothStatusPopoverTooth(null);
                  }}
                  onCloseToothStatusPopover={() => setToothStatusPopoverTooth(null)}
                  onRemoveToothStatus={(toothNumber) => {
                    const addedRemovableActive = useRemovableToothChartPath && activeProductCardId !== 0;
                    if (opposingProductData && !addedRemovableActive) {
                      const opposingMappedExtractions = mapOppositeExtractionsToProductExtractions(
                        opposingProductData.opposite_extractions,
                        opposingProductData.extractions
                      );
                      const currentCode = opposingToothExtractionMap[toothNumber];
                      if (currentCode) {
                        onOpposingExtractionToggle?.(toothNumber, currentCode, opposingMappedExtractions);
                      }
                      setOpposingNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                      setToothStatusPopoverTooth(null);
                      return;
                    }
                    const currentCode = mandibularToothExtractionMap[toothNumber];
                    if (currentCode) {
                      handleToothExtractionToggle("mandibular", toothNumber, currentCode, toothStatusPopoverExtractions);
                    }
                    if (mandibularTeeth.includes(toothNumber)) {
                      handleMandibularToothDeselect(toothNumber);
                    }
                    setMandibularNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                    setToothStatusPopoverTooth(null);
                  }}
                  toothHoverTooltip={
                    activeProductIsRemovables && isCardActiveForToothStatus(activeProductCardId)
                      ? activeExtractionCode
                        ? `Click tooth to mark as ${toothStatusPopoverExtractions.find(e => e.code === activeExtractionCode)?.name ?? activeExtractionCode}`
                        : `Click a tooth to add it to ${
                            activeProductCardId !== 0
                              ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular")?.product?.name ?? "the product")
                              : ((() => { const t = MANDIBULAR_ALL_TEETH.find(tn => getToothProductCard("mandibular", tn) === 0); return t ? (getToothProduct("mandibular", t)?.name ?? "the product") : "the product"; })())
                          }`
                      : !useRemovableToothChartPath &&
                        ownArchToothChartEnabled &&
                        (!opposingProductData || useScopedRetentionMode) &&
                        isCardActiveForToothStatus(activeProductCardId)
                        ? `Click a tooth to add it to ${
                            activeProductCardId !== 0
                              ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "mandibular")?.product?.name ?? "the product")
                              : ((() => { const t = MANDIBULAR_ALL_TEETH.find(tn => getToothProductCard("mandibular", tn) === 0 && (activeFixedGroupProductId === null || getToothProduct("mandibular", tn)?.id === activeFixedGroupProductId)); return t ? (getToothProduct("mandibular", t)?.name ?? "the product") : "the product"; })())
                          }`
                        : undefined
                  }
                />
              );
            })()}
          </div>
        )}
      </div>

      {showMandibular && (
        <>
          {/* Shade Selection Guide - Mandibular */}
          {shadeSelectionState.arch === 'mandibular' && (() => {
            const pid = shadeSelectionState.productId ?? "";
            const fixedProductMatch = pid.match(/^fixed_p_(\d+)$/);
            const shadeProduct = fixedProductMatch
              ? (() => {
                  const apiId = Number(fixedProductMatch[1]);
                  for (const tn of MANDIBULAR_ALL_TEETH) {
                    const p = getToothProduct("mandibular", tn);
                    if (p?.id === apiId) return p;
                  }
                  return null;
                })()
              : (() => {
                  const tn = parseInt(pid.replace(/^(fixed_|prep_)/, ""), 10);
                  return !isNaN(tn) ? getToothProduct("mandibular", tn) : null;
                })();
            if (
              isFixedProductShadeStorageId(pid) &&
              shouldUseAccordionOnlyFixedShades(shadeProduct?.advance_fields)
            ) {
              return null;
            }
            return (
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
                advanceFields={shadeProduct?.advance_fields}
                hasGumShadeFlag={shadeProduct?.has_gum_shade === "Yes"}
                hasTeethShadeFlag={shadeProduct?.has_teeth_shade === "Yes"}
                productForShades={shadeProduct}
              />
            );
          })()}

          {/* Panel-level Gum Shade Picker — shown above tooth status boxes when triggered from removable accordion */}
          {panelGumShadePicker && (
            <div className="mt-3">
              <GumShadePicker
                selected={panelGumShadePicker.selectedName ?? null}
                onSelect={(shade) => {
                  const step = panelGumShadePicker.stepOverride ?? "gum_shade";
                  completeFieldStep("mandibular", panelGumShadePicker.toothNumber, step, JSON.stringify({ gum_shade_id: shade.gum_shade_id, brand_id: shade.brand.id, name: shade.name }));
                  // Fixed products gate post-shade fields on getSelectedShade(..., "stump_shade"),
                  // so the gum pick must also land in the shade-selection map.
                  if (step === "fixed_stump_shade" && setSelectedShades) {
                    const shadeProduct = getToothProduct("mandibular", panelGumShadePicker.toothNumber);
                    const shadeProductId = resolveFixedShadeProductId(shadeProduct?.id, panelGumShadePicker.toothNumber);
                    setSelectedShades((prev) => ({
                      ...prev,
                      [buildShadeSelectionKey(shadeProductId, "mandibular", "stump_shade")]: shade.name,
                    }));
                  }
                  setPanelGumShadePicker(null);
                }}
                gumShades={panelGumShadePicker.gumShades}
              />
            </div>
          )}

          {/* Product accordions — scroll with the page; avoid nested overflow scrollbars */}
          <div className="space-y-2 min-w-0 overflow-x-hidden">

            {/* Added product accordions — full field workflow, teeth owned by each card */}
            {showDetails && addedProducts
              .filter(ap => ap.arch === "mandibular")
              .map((ap, apIndex) => {
                // For removable restoration products, use all arch teeth so accordion stays visible when teeth are marked missing
                // Each added product is an independent slot — always show its accordion.
                // Newly added Fixed products have no teeth yet and show an empty state until the user assigns teeth.
                const virtualProduct = getToothProduct("mandibular", -ap.id);
                const initialResolvedProduct = virtualProduct ?? ap.product ?? null;
                const isApRemovables = initialResolvedProduct ? !hasRetentionOptions(initialResolvedProduct) : false;
                const cardTeethSource = isApRemovables ? MANDIBULAR_ALL_TEETH : mandibularTeeth;
                const cardTeeth = cardTeethSource.filter(
                  tn => isApRemovables
                    ? getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === ap.id
                    : getToothProductCard("mandibular", tn) === ap.id
                );
                // All teeth directly assigned to this card, sorted ascending
                const rawAssignedTeeth = isApRemovables
                  ? MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === ap.id).sort((a, b) => a - b)
                  : cardTeeth;
                const cardProduct = resolveAddedCardProductData(
                  "mandibular",
                  ap.id,
                  cardTeeth,
                  getToothProduct,
                  virtualProduct ?? ap.product ?? null
                );
                const apProduct = cardProduct;
                const apProductForStage = resolveProductForStageField(
                  apProduct,
                  "mandibular",
                  getToothProduct
                );
                const assignedTeeth = rawAssignedTeeth;

                const apVariationDisplay = resolveVariationDisplay(apProduct, assignedTeeth.length);
                const cardProductName = apVariationDisplay.name || "Untitled Product";
                // Prefer a matched variation image; otherwise show the lower arch image when configured.
                const cardProductImage = apVariationDisplay.matched
                  ? apVariationDisplay.imageUrl
                  : resolveArchProductImage(apProduct, "mandibular", apVariationDisplay.imageUrl);
                const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
                const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product?.subcategory?.name || ap.product?.subcategory_name || "";
                const removableCardExtractions = (apProduct?.extractions || []).filter(
                  (e) => e.status === "Active"
                );
                const isCurrentlyActiveProduct = isCardActiveForToothStatus(ap.id);
                // For removable cards with no teeth yet, use a negative virtual slot (-ap.id) where product data was pre-fetched
                const apRepTn = resolveAddedCardRepTooth(
                  cardTeeth,
                  ap.id,
                  getToothProduct,
                  "mandibular"
                );
                const hasRushedAp = isProductRushed(
                  rushedProducts,
                  "mandibular",
                  ap.id,
                  apRepTn,
                  hasRetentionOptions(apProduct)
                );
                const apStageKey = hasRetentionOptions(apProduct)
                  ? `mandibular_fixed_${apRepTn}`
                  : `mandibular_prep_${apRepTn}`;
                const apStageVal =
                  selectedStages[apStageKey] ||
                  getFieldValue(
                    "mandibular",
                    apRepTn,
                    hasRetentionOptions(apProduct) ? "fixed_stage" : "stage"
                  ) ||
                  "";
                const apEstDaysText = resolveRemovableEstDaysText(cardProduct, apStageVal);
                const apRemEstDaysText = resolveRemovableEstDaysText(
                  cardProduct,
                  selectedStages[`mandibular_prep_${apRepTn}`] ||
                    getFieldValue("mandibular", apRepTn, "stage") ||
                    ""
                );
                const apLabelOnlyHeader =
                  isApRemovables &&
                  !hasConfiguredExtractions(
                    useMandibularArchSharedRemovable ? mandibularMergedExtractions : apProduct?.extractions
                  );

                // For removable products, compute extractions for header display
                // Use apRepTn (the representative slot where product data was loaded) to get extractions
                const apExtractions = isApRemovables
                  ? (getToothProduct("mandibular", apRepTn)?.extractions ?? [])
                  : [];

                // Full denture detection: only MT extraction, no TIM
                const apIsFullDenture = isApRemovables && isFullDentureProduct(apExtractions);
                const apIsSingleDefaultOnly = isSingleDefaultOnlyExtractionList(apProduct?.extractions);
                const apDisplayTeeth = getRemovableOrangeHeaderTeeth({
                  selectedTeeth: assignedTeeth,
                  toothExtractionMap: mandibularToothExtractionMap,
                  claspTeeth: mandibularClaspTeeth,
                  noActiveBoxTeeth: mandibularNoActiveBoxTeeth,
                  extractions: apProduct?.extractions,
                  isFullDenture: apIsFullDenture,
                  isSingleDefaultOnly: apIsSingleDefaultOnly,
                });
                const cardToothDisplay = apDisplayTeeth.length > 0 ? `#${apDisplayTeeth.join(",")}` : "";
                const statusBoxSelectedTeeth =
                  apIsSingleDefaultOnly || useMandibularArchSharedRemovable
                    ? mandibularTeeth
                    : resolveRemovableStatusBoxSelectedTeeth({
                        cardTeeth: assignedTeeth,
                        toothExtractionMap: mandibularToothExtractionMap,
                        claspTeeth: mandibularClaspTeeth,
                        archTeeth: MANDIBULAR_ALL_TEETH,
                      });
                const apImpressionDone = apRepTn !== 0 && (
                  isFieldCompleted("mandibular", apRepTn, "impression") ||
                  isFieldCompleted("mandibular", apRepTn, "fixed_impression")
                );
                const apSlotId = addedProductSlotId(ap.id);
                const isExpanded = apLabelOnlyHeader || isCardAccordionExpanded(apSlotId);

                return (
                  <ProductAccordionCard
                    key={ap.id}
                    slotId={`added_${ap.id}`}
                    arch="mandibular"
                    isExpanded={isExpanded}
                    interactionEnabled={isCardAccordionInteractionEnabled(apSlotId)}
                    isCurrentlyActive={
                      isExpanded &&
                      (isApRemovables
                        ? isCurrentlyActiveProduct
                        : activeFixedGroupProductId === apProduct?.id)
                    }
                    onToggle={() =>
                      isApRemovables
                        ? handleAddedRemovableAccordionToggle(ap)
                        : handleAddedProductAccordionToggle(ap)
                    }
                    productName={cardProductName}
                    productImageUrl={cardProductImage}
                    toothDisplay={cardToothDisplay}
                    subcategoryName={cardSubcategoryName || undefined}
                    stageName={(() => {
                      if (shouldSkipStageSelection(apProductForStage)) return undefined;
                      const apStageKey = hasRetentionOptions(apProduct)
                        ? `mandibular_fixed_${apRepTn}`
                        : `mandibular_prep_${apRepTn}`;
                      const val =
                        apRepTn > 0
                          ? selectedStages[apStageKey] ||
                            getFieldValue(
                              "mandibular",
                              apRepTn,
                              hasRetentionOptions(apProduct) ? "fixed_stage" : "stage"
                            )
                          : "";
                      return isDisplayableStageValue(val) ? val : undefined;
                    })()}
                    estDaysText={apEstDaysText}
                    hasRush={!!hasRushedAp}
                    canDelete={true}
                    onDelete={() => {
                      const wasFixed = hasRetentionOptions(apProduct);
                      const remainingAdded = addedProducts.filter(p => p.arch === "mandibular").length - 1;
                      const hasCard0 = mandibularHasFixedCard0 || mandibularHasRemovablesCard0;
                      MANDIBULAR_ALL_TEETH.filter(tn => getToothProductCard("mandibular", tn) === ap.id).forEach(tn => {
                        clearToothProgress("mandibular", tn);
                        handleMandibularToothDeselect(tn);
                      });
                      handleRemoveAddedProduct(ap.id);
                      if (wasFixed && remainingAdded === 0 && !hasCard0) onBackToCategories?.("mandibular");
                    }}
                    confirmDetailsChecked={confirmDetailsChecked}
                    caseSubmitted={caseSubmitted}
                    customHeader={
                      isApRemovables ? (
                        <RestorationAccordionHeader
                          isExpanded={isExpanded}
                          caseSubmitted={caseSubmitted}
                          hasRush={!!hasRushedAp}
                          onToggleExpand={() => handleAddedRemovableAccordionToggle(ap)}
                          onPlusClick={
                            apLabelOnlyHeader
                              ? undefined
                              : () => {
                            setActiveExtractionCode(null);
                            // Re-activating product selection resets Done so the button re-appears
                            const ackCardId = useMandibularArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : ap.id;
                            setExtractionsSetupComplete(ackCardId, false);
                            setActiveProductCardId(ap.id);
                            setIsSelectionModeActive(true);
                            if (!isExpanded) {
                              handleAddedRemovableAccordionToggle(ap);
                            }
                          }}
                          allArchTeethSelected={apDisplayTeeth.length >= MANDIBULAR_ALL_TEETH.length}
                          labelOnlyHeader={apLabelOnlyHeader}
                          isProductSelectionActive={activeProductCardId === ap.id && (isSelectionModeActive || activeExtractionCode !== null)}
                          isExtractionActive={activeProductCardId === ap.id && activeExtractionCode !== null}
                          expandEnabled={allowAccordionCollapse && isAccordionEnabled(apSlotId)}
                          productImageUrl={cardProductImage}
                          productName={getRemovableHeaderTitle({
                            productName: cardProductName,
                            hasVariation: apProduct?.has_variation,
                            teethCount: assignedTeeth.length,
                            isFullDenture: apIsFullDenture,
                            hasVariationMatch: apVariationDisplay.matched,
                          })}
                          toothDisplay={cardToothDisplay}
                          splintSummary={mandibularSplintSummaryFor(assignedTeeth)}
                          categoryName={cardCategoryName}
                          subcategoryName={cardSubcategoryName}
                          stageName={
                            isDisplayableStageValue(apStageVal) &&
                            !shouldSkipStageSelection(apProductForStage)
                              ? apStageVal
                              : undefined
                          }
                          stageProduct={apProductForStage}
                          estDaysText={apRemEstDaysText}
                          canDelete={!caseSubmitted}
                          onDelete={() => {
                            const wasFixed = hasRetentionOptions(apProduct);
                            const remainingAdded =
                              addedProducts.filter((p) => p.arch === "mandibular").length - 1;
                            const hasCard0 = mandibularHasFixedCard0 || mandibularHasRemovablesCard0;
                            MANDIBULAR_ALL_TEETH.filter(
                              (tn) => getToothProductCard("mandibular", tn) === ap.id
                            ).forEach((tn) => {
                              clearToothProgress("mandibular", tn);
                              handleMandibularToothDeselect(tn);
                            });
                            handleRemoveAddedProduct(ap.id);
                            if (wasFixed && remainingAdded === 0 && !hasCard0)
                              onBackToCategories?.("mandibular");
                          }}
                          isCurrentlyActive={
                            isExpanded && isCurrentlyActiveProduct
                          }
                          confirmDetailsChecked={confirmDetailsChecked}
                          showHeaderContent={shouldShowRemovableHeaderContent({
                            hasProduct: !!apProduct,
                            hasVariation: apProduct?.has_variation,
                            teethCount: assignedTeeth.length,
                            caseSubmitted,
                          })}
                          showExtractionsDone={requiresExtractionsAcknowledgement(
                            useMandibularArchSharedRemovable
                              ? mandibularMergedExtractions
                              : removableCardExtractions
                          )}
                          extractionsAcknowledged={
                            useMandibularArchSharedRemovable
                              ? mandibularArchExtractionsReady
                              : isExtractionsSetupComplete(
                                  removableCardExtractions,
                                  ap.id,
                                  caseSubmitted
                                )
                          }
                          onExtractionsAcknowledgedChange={(v) =>
                            useMandibularArchSharedRemovable
                              ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                              : setExtractionsSetupComplete(ap.id, v)
                          }
                          middleContent={
                            isCardActiveForToothStatus(ap.id) &&
                            (useMandibularArchSharedRemovable
                              ? mandibularMergedExtractions
                              : apExtractions
                            ).length > 0 &&
                            // Selected teeth, or selection optional (default + optional-only) so
                            // the user can click Done without selecting (e.g. night guard).
                            (mandibularTeeth.length > 0 ||
                              isExtractionSelectionOptional(
                                useMandibularArchSharedRemovable
                                  ? mandibularMergedExtractions
                                  : apExtractions
                              )) ? (
                              <>
                              {mandibularToothHint && mandibularToothHint.kind === "reference" && (
                                <p className={mandibularToothHint.className}>{mandibularToothHint.text}</p>
                              )}
                              <ToothStatusBoxes
                                extractions={
                                  useMandibularArchSharedRemovable
                                    ? mandibularMergedExtractions
                                    : apExtractions
                                }
                                selectedTeeth={statusBoxSelectedTeeth}
                                allArchTeeth={MANDIBULAR_ALL_TEETH}
                                toothExtractionMap={mandibularToothExtractionMap}
                                claspTeeth={mandibularClaspTeeth}
                                skipDefaultAutoSelect={shouldSkipLegacyDefaultExtractionAutoSelect(
                                  apProduct as Record<string, unknown> | null,
                                )}
                                displayTeethByCode={getToothStatusBoxDisplayMap({
                                  extractions: useMandibularArchSharedRemovable
                                    ? mandibularMergedExtractions
                                    : apExtractions,
                                  selectedTeeth: statusBoxSelectedTeeth,
                                  toothExtractionMap: mandibularToothExtractionMap,
                                  claspTeeth: mandibularClaspTeeth,
                                  excludeTeeth: apDisplayTeeth,
                                })}
                                activeExtractionCode={activeExtractionCode}
                                onActiveExtractionChange={(code, exts) => {
                                  setActiveExtractionCode(code);
                                  if (exts) setActiveExtractions(exts);
                                  else if (useMandibularArchSharedRemovable) {
                                    setActiveExtractions(mandibularMergedExtractions);
                                  }
                                  // Re-activating an extraction box resets Done so the button re-appears
                                  if (code !== null) {
                                    const ackCardId = useMandibularArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : ap.id;
                                    setExtractionsSetupComplete(ackCardId, false);
                                    setIsSelectionModeActive(true);
                                  }
                                }}
                                onToothExtractionToggle={(tn, code, extractions) =>
                                  handleToothExtractionToggle(
                                    "mandibular",
                                    tn,
                                    code,
                                    extractions ??
                                      (useMandibularArchSharedRemovable
                                        ? mandibularMergedExtractions
                                        : apExtractions)
                                  )
                                }
                                onSelectAllTeeth={selectAllMandibularTeeth}
                                onRequiredValidationChange={onToothStatusValidationChange}
                                isRemovable={true}
                                submitted={caseSubmitted}
                                hideDefaultBox={true}
                                disableRequiredValidation={true}
                                grayed={
                                  isActiveMandibularProductDetailPending || apIsSingleDefaultOnly
                                }
                                acknowledged={
                                  useMandibularArchSharedRemovable
                                    ? mandibularArchExtractionsReady
                                    : isExtractionsSetupComplete(
                                        removableCardExtractions,
                                        ap.id,
                                        caseSubmitted
                                      )
                                }
                                onAcknowledgedChange={(v) => {
                                  if (v) {
                                    // Done clicked — clear active borders
                                    setActiveExtractionCode(null);
                                    setIsSelectionModeActive(false);
                                  }
                                  useMandibularArchSharedRemovable
                                    ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                                    : setExtractionsSetupComplete(ap.id, v);
                                }}
                              />
                              </>
                            ) : undefined
                          }
                        />
                      ) : hasRetentionOptions(apProduct) ? (
                        <RestorationAccordionHeader
                          isExpanded={isExpanded}
                          caseSubmitted={caseSubmitted}
                          hasRush={!!hasRushedAp}
                          onToggleExpand={() => handleAddedProductAccordionToggle(ap)}
                          onPlusClick={() => {
                            setActiveExtractionCode(null);
                            // Re-activating product selection resets Done so the button re-appears
                            const ackCardId = useMandibularArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : ap.id;
                            setExtractionsSetupComplete(ackCardId, false);
                            setFixedRetentionSetupComplete(false, ap.id);
                            setActiveProductCardId(ap.id);
                            setIsSelectionModeActive(true);
                            if (!isExpanded) {
                              handleAddedProductAccordionToggle(ap);
                            }
                          }}
                          isProductSelectionActive={activeProductCardId === ap.id && (isSelectionModeActive || activeExtractionCode !== null)}
                          isExtractionActive={activeProductCardId === ap.id && activeExtractionCode !== null}
                          expandEnabled={allowAccordionCollapse && isAccordionEnabled(apSlotId)}
                          productImageUrl={cardProductImage}
                          productName={cardProductName}
                          toothDisplay={cardToothDisplay}
                          splintSummary={mandibularSplintSummaryFor(assignedTeeth)}
                          middleContent={renderFixedExtractionStatusBoxes(apProduct, assignedTeeth)}
                          categoryName={cardCategoryName}
                          subcategoryName={cardSubcategoryName}
                          stageName={
                            isDisplayableStageValue(apStageVal) &&
                            !shouldSkipStageSelection(apProductForStage)
                              ? apStageVal
                              : undefined
                          }
                          stageProduct={apProductForStage ?? apProduct}
                          estDaysText={apEstDaysText}
                          canDelete={!caseSubmitted}
                          onDelete={() => {
                            const remainingAdded =
                              addedProducts.filter((p) => p.arch === "mandibular").length - 1;
                            const hasCard0 = mandibularHasFixedCard0 || mandibularHasRemovablesCard0;
                            MANDIBULAR_ALL_TEETH.filter(
                              (tn) => getToothProductCard("mandibular", tn) === ap.id
                            ).forEach((tn) => {
                              clearToothProgress("mandibular", tn);
                              handleMandibularToothDeselect(tn);
                            });
                            handleRemoveAddedProduct(ap.id);
                            if (remainingAdded === 0 && !hasCard0) onBackToCategories?.("mandibular");
                          }}
                          isCurrentlyActive={
                            isExpanded && activeFixedGroupProductId === apProduct?.id
                          }
                          confirmDetailsChecked={confirmDetailsChecked}
                          showHeaderContent={
                            !!apProduct && (assignedTeeth.length > 0 || caseSubmitted)
                          }
                          showRetentionDone={!caseSubmitted}
                          retentionDoneAcknowledged={isFixedRetentionSetupComplete(
                            apProduct,
                            caseSubmitted,
                            ap.id
                          )}
                          onRetentionDoneChange={(value) => {
                            setFixedRetentionSetupComplete(value, ap.id);
                            if (value) {
                              setIsSelectionModeActive(false);
                              setActiveExtractionCode(null);
                              if (apProduct?.id) {
                                setActiveProductCardId(ap.id);
                                setActiveFixedGroupProductId(apProduct.id);
                                if (!isExpanded) handleAddedProductAccordionToggle(ap);
                              }
                            }
                          }}
                        />
                      ) : undefined
                    }
                  >

                    {!isApRemovables && cardTeeth.length === 0 ? null : (() => {
                      const isCardRemovables = apProduct ? !hasRetentionOptions(apProduct) : isApRemovables;
                      // For removable cards with no teeth yet, use the virtual slot (-ap.id) where product data was pre-fetched
                      const repTn = resolveAddedCardRepTooth(
                        cardTeeth,
                        ap.id,
                        getToothProduct,
                        "mandibular"
                      );
                      const toothProduct =
                        getToothProduct("mandibular", repTn) ?? apProduct;
                      const isFixed = hasRetentionOptions(toothProduct);
                      const isRemovables = toothProduct ? !hasRetentionOptions(toothProduct) : isCardRemovables;
                      const fixedChain = isFixed ? getRetentionFieldChain(toothProduct?.advance_fields, toothProduct) : undefined;
                      const removableChain = isRemovables ? getSelectionFieldChain(toothProduct) : undefined;
                      const advFields = toothProduct?.advance_fields;
                      const isF = (step: string) => {
                        if (step === "impression") {
                          return (
                            toothProduct?.has_impression === "Yes" &&
                            isFieldVisible("mandibular", repTn, step as any, isFixed ? fixedChain : removableChain)
                          );
                        }
                        return (
                          hasAdvanceField(step, advFields, toothProduct ?? undefined) &&
                          isFieldVisible("mandibular", repTn, step as any, isFixed ? fixedChain : removableChain)
                        );
                      };
                      const isFComplete = (step: string) => isFieldCompleted("mandibular", repTn, step as any);
                      const fVal = (step: string) => getFieldValue("mandibular", repTn, step as any);

                      if (isCardRemovables) {
                        const productKey = `mandibular_prep_${repTn}`;
                        const impressionModalProductId = ARCH_IMPRESSION_PRODUCT_ID;
                        const apStageVal = fVal("stage") || selectedStages[productKey] || "";
                        const mandibularArchTeeth = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
                        const oppositeMaxillaryTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                        const archGumDonor = findArchProductDonor(
                          "mandibular",
                          toothProduct?.id,
                          getToothProduct,
                          mandibularArchTeeth
                        );
                        const displayGumShades = resolveGumShadesForDisplay(toothProduct, archGumDonor);
                        const stageProduct = resolveProductForStageField(
                          toothProduct ?? apProduct,
                          "mandibular",
                          getToothProduct
                        );
                        const singleStageSkip = shouldSkipStageSelection(stageProduct);
                        const showArchImpression =
                          toothProduct?.has_impression === "Yes" ||
                          removablesImpressionDone ||
                          archHasActiveImpressionSelections(
                            selectedImpressions,
                            ARCH_IMPRESSION_PRODUCT_ID,
                            "mandibular"
                          );
                        const removableImplantTeeth = getImplantTeethInGroup(
                          cardTeeth,
                          mandibularRetentionTypes
                        );
                        const removableImplantDetailReady = areAllImplantDetailsComplete(
                          removableImplantTeeth,
                          implantDetailCompleteByTooth
                        );
                        const apShowRemovableFields = useMandibularArchSharedRemovable
                          ? mandibularArchExtractionsReady
                          : isExtractionsSetupComplete(
                              removableCardExtractions,
                              ap.id,
                              caseSubmitted
                            );
                        if (
                          !apShowRemovableFields &&
                          !useMandibularArchSharedRemovable &&
                          requiresExtractionsAcknowledgement(removableCardExtractions)
                        ) {
                          return null;
                        }
                        return (
                          <>
                            {!singleStageSkip && (
                              <AutoOpenStageIfEmpty
                                productId={productKey}
                                arch="mandibular"
                                toothNumber={repTn}
                                isExpanded={isCardAccordionExpanded(apSlotId) && apShowRemovableFields}
                                isStageVisible={hasAdvanceField("stage", advFields)}
                                isStageEmpty={!isFComplete("stage") && !(selectedStages[productKey])}
                                onOpenStage={handleOpenStageModal}
                                caseSubmitted={caseSubmitted}
                              />
                            )}
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isCardAccordionExpanded(apSlotId) && apShowRemovableFields}
                              isImpressionVisible={showArchImpression && removableImplantDetailReady}
                              isImpressionEmpty={
                                !getImpressionDisplayText(impressionModalProductId, "mandibular", repTn)?.trim() &&
                                !archHasActiveImpressionSelections(
                                  selectedImpressions,
                                  impressionModalProductId,
                                  "mandibular"
                                )
                              }
                              onOpenImpressionModal={safeOpenImpressionModal}
                              arch="mandibular"
                              productId={impressionModalProductId}
                              toothNumber={repTn}
                              caseSubmitted={caseSubmitted}
                              blockAutoOpen={isAnyModalOpen}
                            />
                            {addStageStageHistory && addStageStageHistory.length > 0 ? (
                              <StageHistoryBlock
                                history={addStageStageHistory}
                                className="mx-3 mb-1"
                              />
                            ) : null}
                            <div className="rounded-lg p-3 space-y-3">
                              {/* Row 1: Grade / Stage */}
                              {(isF("grade") || (isF("stage") && !singleStageSkip)) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isF("grade") && (() => {
                                  const gradesDonor = findOppositeArchGradesDonor(
                                    "mandibular",
                                    toothProduct?.id,
                                    getToothProduct,
                                    oppositeMaxillaryTeeth
                                  );
                                  const productGrades = resolveProductGradesForDisplay(toothProduct, gradesDonor);
                                  if (productGrades.length === 0 && !productHasGrades(toothProduct)) return null;
                                  const gradeRaw = fVal("grade") || "";
                                  const gradeVal = parseGradeDisplayName(gradeRaw);
                                  const isGradeComplete = isGradeStepCompleteForDisplay(
                                    gradeRaw,
                                    isFComplete("grade"),
                                    toothProduct
                                  );
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
                                  const stageVal = apStageVal;
                                  const isStageComplete = isFComplete("stage") || !!(stageVal && stageVal.trim());
                                  const showGreen = isStageComplete && !caseSubmitted;
                                  return (
                                    <fieldset
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center pointer-events-auto cursor-pointer hover:bg-gray-50 ${showGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                      onClick={() => !caseSubmitted && handleOpenStageModal(productKey, "mandibular", repTn)}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{parseStageDisplayName(stageVal)}</span>
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
                                    <AutoOpenGumShade
                                      visible={isF("gum_shade")}
                                      hasValue={isFComplete("gum_shade")}
                                      onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: displayGumShades })}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {isF("teeth_shade") && (
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
                                      {isF("gum_shade") && (
                                        <fieldset
                                          className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                          onClick={() => {
                                            if (!caseSubmitted) {
                                              const currentGumShade = fVal("gum_shade");
                                              let currentName: string | null = null;
                                              if (currentGumShade) { try { currentName = JSON.parse(currentGumShade).name ?? null; } catch { } }
                                              setPanelGumShadePicker({ toothNumber: repTn, gumShades: displayGumShades, selectedName: currentName });
                                            }
                                          }}
                                        >
                                          <legend className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("gum_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Gum Shade</legend>
                                          <div className="flex items-center gap-2 w-full">
                                            {(() => {
                                              const raw = fVal("gum_shade");
                                              if (!raw?.trim()) {
                                                return (
                                                  <span className="text-[#CF0202] text-base font-medium">Select Gum Shade</span>
                                                );
                                              }
                                              let displayName = raw;
                                              let color: string | null = null;
                                              try { const p = JSON.parse(raw); displayName = p.name ?? raw; } catch { }
                                              const matchedShade = displayGumShades.find((s) => s.name === displayName);
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

                              {/* Row 3: Impression (one selection per arch) */}
                              {showArchImpression && removableImplantDetailReady && (() => {
                                const impressionDisplay =
                                  getImpressionDisplayText(impressionModalProductId, "mandibular", repTn) ||
                                  fVal("impression");
                                const impressionComplete =
                                  !!impressionDisplay?.trim() ||
                                  archHasActiveImpressionSelections(
                                    selectedImpressions,
                                    impressionModalProductId,
                                    "mandibular"
                                  );
                                return (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => safeOpenImpressionModal("mandibular", impressionModalProductId, repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{impressionDisplay}</span>
                                  {impressionComplete && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                                );
                              })()}

                              {/* Row 4: Add ons — when selected in modal, store, or product defaults.
                                  Not chain-gated (like Impression above): arch-level impression completion
                                  may live on a different tooth than this card's rep tooth, which would
                                  keep auto-populated default add-ons hidden forever. */}
                              {(() => {
                                const addonProduct = resolveAddedCardProductData(
                                  "mandibular",
                                  ap.id,
                                  cardTeeth,
                                  getToothProduct,
                                  apProduct ?? undefined
                                );
                                const addonCtx = buildRemovableAddonFieldContext({
                                  arch: "mandibular",
                                  cardId: ap.id,
                                  cardTeeth,
                                  repTooth: repTn,
                                  product: addonProduct,
                                  getFieldValue,
                                  selectedAddonsByTooth,
                                  productAddOns,
                                });
                                if (!addonCtx.show) return null;
                                const addonItems = parseAddonDisplayItems(addonCtx.display);
                                const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                                const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                                const onClickAddon = () =>
                                  handleOpenAddOnsModal(
                                    "mandibular",
                                    toothProduct?.id?.toString() || `prep_${repTn}`,
                                    repTn
                                  );
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
                      const apFirstTn = resolveAddedCardRepTooth(
                        cardTeeth,
                        ap.id,
                        getToothProduct,
                        "mandibular"
                      );
                      const apToothProduct =
                        getToothProduct("mandibular", apFirstTn) ?? apProduct;
                      const apRetentionTypes = cardTeeth.flatMap(tn => mandibularRetentionTypes[tn] || []);
                      const apGroupStageProductIdFixed = `mandibular_fixed_${apFirstTn}`;
                      // Shared with card 0 — see utils/fixedCardGating.ts
                      const apGating = resolveFixedCardGating({
                        arch: "mandibular",
                        product: apToothProduct,
                        cardProduct: apProduct,
                        cardId: ap.id,
                        toothNumbers: cardTeeth,
                        stageToothNumber: apFirstTn,
                        caseSubmitted,
                        isAnyModalOpen,
                        openShadeFieldType: shadeSelectionState.fieldType,
                        hasSelectedStage: !!selectedStages[apGroupStageProductIdFixed],
                        getSelectedShade,
                        isFieldCompleted,
                        getFieldValue,
                        isFieldVisible,
                        isFixedRetentionSetupComplete,
                      });
                      const apFixedChain = apGating.fixedChain;
                      const apIsFixed = apGating.isFixedStep;
                      const apFixedShadeProductId = apGating.fixedShadeProductId;
                      const apNamedShadeFields = apGating.namedShadeFields;
                      const apFirstMissingShadeField = apGating.firstMissingShadeField;
                      const apNeedsStumpShade = apGating.needsStumpShade;
                      const apNeedsToothShade = apGating.needsToothShade;
                      const apShadeRequired = apGating.shadeRequired;
                      const apFixedShadesComplete = apGating.fixedShadesComplete;
                      const apFixedShadeIncomplete = apGating.fixedShadeIncomplete;
                      const apUsesAccordionShadePicker = apGating.usesAccordionShadePicker;
                      const apRetentionFieldsVisible = apGating.retentionFieldsVisible;

                      return (
                        <>
                          {apRetentionFieldsVisible && (
                            <AutoOpenFirstFixedFieldAfterRetentionDone
                              retentionFieldsVisible={apRetentionFieldsVisible}
                              isExpanded={isCardAccordionExpanded(apSlotId)}
                              caseSubmitted={caseSubmitted}
                              isStageVisible={apGating.stageVisible}
                              isStageEmpty={apGating.stageEmpty}
                              onOpenStage={handleOpenStageModal}
                              stageProductId={apGroupStageProductIdFixed}
                              arch="mandibular"
                              stageToothNumber={apFirstTn}
                              usesAccordionShadePicker={apUsesAccordionShadePicker}
                              firstMissingShadeField={apFirstMissingShadeField}
                              fixedShadeProductId={apFixedShadeProductId}
                              storageToothNumber={apFirstTn}
                              setShadeSelectionState={setShadeSelectionState}
                              isLegacyShadeSectionVisible={
                                apIsFixed("fixed_stump_shade") || apIsFixed("fixed_shade_trio")
                              }
                              legacyStumpShadeEmpty={
                                apNeedsStumpShade &&
                                !getSelectedShade(apFixedShadeProductId, "mandibular", "stump_shade")
                              }
                              legacyToothShadeEmpty={
                                apNeedsToothShade &&
                                !getSelectedShade(apFixedShadeProductId, "mandibular", "tooth_shade")
                              }
                              fixedShadesComplete={apFixedShadesComplete}
                            />
                          )}
                          {/* Same gate as card 0: the retention "Done" acknowledgement comes
                              first — never pop the stage modal on the first tooth click. */}
                          {apRetentionFieldsVisible && (
                            <AutoOpenStageIfEmpty
                              productId={apGroupStageProductIdFixed}
                              arch="mandibular"
                              toothNumber={apFirstTn}
                              isExpanded={isCardAccordionExpanded(apSlotId)}
                              isStageVisible={apGating.stageVisible}
                              isStageEmpty={apGating.stageEmpty}
                              onOpenStage={handleOpenStageModal}
                              caseSubmitted={caseSubmitted}
                            />
                          )}
                          <AutoOpenShadeGuideIfEmpty
                            arch="mandibular"
                            productId={apFixedShadeProductId}
                            isExpanded={isCardAccordionExpanded(apSlotId)}
                            isShadeSectionVisible={apIsFixed("fixed_stump_shade") || apIsFixed("fixed_shade_trio")}
                            stumpShadeEmpty={apNeedsStumpShade && !getSelectedShade(apFixedShadeProductId, "mandibular", "stump_shade")}
                            toothShadeEmpty={apNeedsToothShade && !getSelectedShade(apFixedShadeProductId, "mandibular", "tooth_shade")}
                            firstMissingShadeField={apFirstMissingShadeField}
                            storageToothNumber={apFirstTn}
                            setShadeSelectionState={setShadeSelectionState}
                            caseSubmitted={caseSubmitted}
                            skipAutoOpen={apUsesAccordionShadePicker || apFixedShadesComplete}
                          />
                          <AutoOpenGumShade
                            visible={apGating.gumAutoOpenVisible}
                            hasValue={apGating.gumAutoOpenHasValue}
                            onOpen={() =>
                              setPanelGumShadePicker({
                                toothNumber: apFirstTn,
                                gumShades: apToothProduct?.gum_shades || [],
                                stepOverride: "fixed_stump_shade",
                              })
                            }
                          />
                          <RetentionProductFields
                            arch="mandibular"
                            isExpanded={isCardAccordionExpanded(apSlotId)}
                            firstToothNumber={apFirstTn}
                            groupStageToothNumber={apFirstTn}
                            groupStageProductIdFixed={apGroupStageProductIdFixed}
                            labCustomerId={labCustomerId}
                            selectedProduct={apToothProduct}
                            toothNumbers={cardTeeth}
                            retentionTypes={apRetentionTypes}
                            caseSubmitted={caseSubmitted}
                            fixedShadeIncomplete={apFixedShadeIncomplete}
                            usesAccordionShadePicker={apUsesAccordionShadePicker}
                            shadeSelectionState={shadeSelectionState}
                            setShadeSelectionState={setShadeSelectionState}
                            showShadeGuideDropdown={showShadeGuideDropdown}
                            setShowShadeGuideDropdown={setShowShadeGuideDropdown}
                            setSelectedShadeGuide={setSelectedShadeGuide}
                            shadeGuideOptions={shadeGuideOptions}
                            handleShadeSelect={handleShadeSelect}
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
                            migrateFixedShadeProductId={migrateFixedShadeProductId}
                            handleOpenImpressionModal={safeOpenImpressionModal}
                            handleOpenAddOnsModal={handleOpenAddOnsModal}
                            getImpressionDisplayText={getImpressionDisplayText as (productId: string, arch: string) => string}
                            selectedImpressions={selectedImpressions}
                            setPanelGumShadePicker={(s) => setPanelGumShadePicker({ ...s, stepOverride: "fixed_stump_shade" })}
                            setSelectedShades={setSelectedShades}
                            peerImplantDetailByTooth={peerImplantDetailByTooth}
                            peerImplantCompleteByTooth={peerImplantCompleteByTooth}
                            expandedImplantTooth={expandedImplantTooth}
                            onExpandedImplantToothChange={setExpandedImplantTooth}
                          />
                        </>
                      );
                    })()}

                    <ScrollToBottom />
                  </ProductAccordionCard>
                );
              })
            }

            {showDetails && showInlineAddProductPicker && onInlineAddProductComplete && onInlineAddProductCancel && (
              <div className="relative z-20">
                <InlineAddProductPicker
                  arch="mandibular"
                  labId={labCustomerId}
                  excludedProductIds={excludedProductIds}
                  excludedSubcategoryIds={excludedSubcategoryIds}
                  onComplete={onInlineAddProductComplete}
                  onCancel={onInlineAddProductCancel}
                />
              </div>
            )}

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
                const categoryName = selectedProduct?.subcategory?.category?.name || "";
                const subcategoryName = selectedProduct?.subcategory?.name || "";

                // Skip removables products — they have their own dedicated accordion section
                if (isNonRetentionCategory(selectedProduct)) return null;
                const fixedStageName = selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[`mandibular_fixed_${firstToothNumber}`] || "";
                const fixedStageObj = selectedProduct?.stages?.find(s => s.name === fixedStageName);
                const fixedDays = fixedStageObj?.days_to_process;
                const estDays = fixedDays != null
                  ? `${fixedDays} work day${fixedDays === 1 ? "" : "s"} after submission`
                  : "10 work days after submission";
                const toothNumbers = teeth.map((t) => t.toothNumber);
                const variationDisplay = resolveVariationDisplay(selectedProduct, toothNumbers.length);
                const productName = variationDisplay.name || "Select Product";
                const productImage =
                  variationDisplay.imageUrl ||
                  selectedProduct?.image_url ||
                  "/placeholder.svg?height=48&width=48&query=dental+crown+implant+tooth";
                const headerTeeth = toothNumbers.filter(tn => !!mandibularToothExtractionMap[tn]);
                // Product tooth numbers include extraction-status teeth assigned to this
                // product via the combined popover / status boxes — they stay product-
                // selected (parity with removables), they just have no retention type.
                const statusTeethForProduct = MANDIBULAR_ALL_TEETH.filter(
                  (tn) =>
                    !toothNumbers.includes(tn) &&
                    !!mandibularToothExtractionMap[tn] &&
                    getToothProductCard("mandibular", tn) === 0 &&
                    selectedProduct?.id != null &&
                    getToothProduct("mandibular", tn)?.id === selectedProduct.id
                );
                const displayToothNumbers = [...toothNumbers, ...statusTeethForProduct].sort(
                  (a, b) => a - b
                );
                const toothNumbersDisplay =
                  displayToothNumbers.length > 0 ? `#${displayToothNumbers.join(",")}` : "";
                const retentionTypes = [...new Set(teeth.map((t) => t.retentionType))];
                const rushRepTooth = resolveCardRepToothForRush(toothNumbers);
                const hasRushed = isProductRushed(
                  rushedProducts,
                  "mandibular",
                  0,
                  rushRepTooth,
                  hasRetentionOptions(selectedProduct)
                );

                // Show skeleton while product is loading
                const isLoading = !selectedProduct && teeth.some((t) => isProductLoading("mandibular", t.toothNumber));
                if (isLoading) {
                  return (
                    <div key={`loading-group-${groupKey}`} className="rounded-lg bg-white overflow-hidden mt-4">
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
                const fixedChain = getRetentionFieldChain(selectedProduct?.advance_fields, selectedProduct);
                // Stable key: keep the tooth that already has field progress when a lower tooth joins
                const groupStageToothNumber = resolveGroupStageToothNumber(
                  toothNumbers,
                  "mandibular",
                  fixedChain,
                  isFieldCompleted,
                  getFieldValue
                );
                const groupStageProductIdFixed = `mandibular_fixed_${groupStageToothNumber}`;
                // Shared with added-product cards — see utils/fixedCardGating.ts
                const card0Gating = resolveFixedCardGating({
                  arch: "mandibular",
                  product: selectedProduct,
                  cardProduct: selectedProduct,
                  cardId: 0,
                  toothNumbers,
                  stageToothNumber: groupStageToothNumber,
                  shadeToothNumber: firstToothNumber,
                  caseSubmitted,
                  isAnyModalOpen,
                  openShadeFieldType: shadeSelectionState.fieldType,
                  hasSelectedStage: !!selectedStages[groupStageProductIdFixed],
                  getSelectedShade,
                  isFieldCompleted,
                  getFieldValue,
                  isFieldVisible,
                  isFixedRetentionSetupComplete,
                });
                const isFixed = card0Gating.isFixedStep;
                const _mandFixedShadeProductId = card0Gating.fixedShadeProductId;
                const namedShadeFields = card0Gating.namedShadeFields;
                const firstMissingShadeField = card0Gating.firstMissingShadeField;
                const _needsStumpShade = card0Gating.needsStumpShade;
                const _needsToothShade = card0Gating.needsToothShade;
                const _shadeRequired = card0Gating.shadeRequired;
                const stumpShadeFieldDone = card0Gating.stumpShadeFieldDone;
                const gumShadeFieldDone = card0Gating.stumpShadeFieldDone;
                const toothShadeSatisfiedForGum = card0Gating.toothShadeSatisfiedForGum;
                const fixedShadesComplete = card0Gating.fixedShadesComplete;
                const fixedShadeIncomplete = card0Gating.fixedShadeIncomplete;
                const usesAccordionShadePicker = card0Gating.usesAccordionShadePicker;
                // ---- Product Accordion (progressive step-by-step) ----
                const showFixedActionsMand = hasRetentionOptions(selectedProduct) && isFieldCompleted("mandibular", groupStageToothNumber, "fixed_impression") && !caseSubmitted;
                const showPrepActionsMand = !hasRetentionOptions(selectedProduct) && isFieldCompleted("mandibular", firstToothNumber, "addons") && !caseSubmitted;
                const showActionsMand = showFixedActionsMand || showPrepActionsMand;

                const slotId = `fixed0_${groupKey}`;
                const card0ShowFixedFields = isFixedRetentionSetupComplete(
                  selectedProduct,
                  caseSubmitted
                );
                // Guided both-arch flow: keep the "Done" acknowledgement (card0ShowFixedFields)
                // intact for the header, but suppress the field *content* until this arch's
                // fields phase is reached.
                const card0ShowFixedFieldsContent =
                  card0ShowFixedFields && !guidedHideCard0Fields;
                // Auto-open gate — identical to the added-product cards, so a card 0 whose
                // product is mid-hydration can't jump ahead of its own Done button either.
                const card0AutoOpenReady =
                  card0ShowFixedFieldsContent && card0Gating.retentionFieldsVisible;
                const showFixedRetentionDone =
                  hasRetentionOptions(selectedProduct) &&
                  !caseSubmitted;
                const card0FixedExpanded = isCardAccordionExpanded(slotId);
                return (
                  <ProductAccordionCard
                    key={`prep-pontic-group-${groupKey}`}
                    slotId={slotId}
                    arch="mandibular"
                    isExpanded={card0FixedExpanded}
                    interactionEnabled={isCardAccordionInteractionEnabled(slotId)}
                    isCurrentlyActive={
                      activeFixedGroupProductId === selectedProduct?.id && card0FixedExpanded
                    }
                    onToggle={() => {
                      if (!allowAccordionCollapse) return;
                      if (!isAccordionEnabled(slotId)) return;
                      if (card0FixedExpanded) {
                        setShadeSelectionState({ arch: null, fieldType: null, productId: null });
                      }
                      toggleAccordionFocus(slotId, 0);
                      setActiveFixedGroupProductId(selectedProduct?.id ?? null);
                    }}
                    productName={productName}
                    productImageUrl={productImage || null}
                    toothDisplay={toothNumbersDisplay}
                    subcategoryName={subcategoryName || undefined}
                    stageName={(!isSingleStageNoStages(selectedProduct) && (selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed])) ? (selectedStages[`mandibular_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed]) : undefined}
                    estDaysText={estDays}
                    hasRush={hasRushed}
                    canDelete={!caseSubmitted}
                    onDelete={() => {
                      toothNumbers.forEach((tn) => {
                        clearToothProgress("mandibular", tn);
                        handleMandibularToothDeselect(tn);
                      });
                      const archStillHasTeeth = MANDIBULAR_ALL_TEETH.some((tn) =>
                        getToothProduct("mandibular", tn)
                      );
                      const archHasAdded = addedProducts.some((p) => p.arch === "mandibular");
                      if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("mandibular");
                    }}
                    caseSubmitted={caseSubmitted}
                    customHeader={
                      <RestorationAccordionHeader
                        isExpanded={card0FixedExpanded}
                        caseSubmitted={caseSubmitted}
                        hasRush={hasRushed}
                        onPlusClick={() => {
                          setActiveExtractionCode(null);
                          // Re-activating product selection resets Done so the button re-appears
                          setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, false);
                          setActiveProductCardId(0);
                          setIsSelectionModeActive(true);
                          if (!card0FixedExpanded) {
                            toggleAccordionFocus(slotId, 0);
                            setActiveFixedGroupProductId(selectedProduct?.id ?? null);
                          }
                        }}
                        isProductSelectionActive={activeProductCardId === 0 && (isSelectionModeActive || activeExtractionCode !== null)}
                      isExtractionActive={activeProductCardId === 0 && activeExtractionCode !== null}
                        onToggleExpand={() => {
                          if (!allowAccordionCollapse) return;
                          if (!isAccordionEnabled(slotId)) return;
                          if (card0FixedExpanded) {
                            setShadeSelectionState({ arch: null, fieldType: null, productId: null });
                          }
                          toggleAccordionFocus(slotId, 0);
                          setActiveFixedGroupProductId(selectedProduct?.id ?? null);
                        }}
                        expandEnabled={allowAccordionCollapse && isAccordionEnabled(slotId)}
                        productImageUrl={productImage}
                        productName={productName}
                        toothDisplay={toothNumbersDisplay}
                        splintSummary={mandibularSplintSummaryFor(toothNumbers)}
                        middleContent={renderFixedExtractionStatusBoxes(selectedProduct, toothNumbers)}
                        categoryName={categoryName}
                        subcategoryName={subcategoryName}
                        stageName={
                          !isSingleStageNoStages(selectedProduct) ? fixedStageName || undefined : undefined
                        }
                        stageProduct={selectedProduct}
                        estDaysText={estDays}
                        canDelete={!caseSubmitted}
                        onDelete={() => {
                          toothNumbers.forEach((tn) => {
                            clearToothProgress("mandibular", tn);
                            handleMandibularToothDeselect(tn);
                          });
                          const archStillHasTeeth = MANDIBULAR_ALL_TEETH.some((tn) =>
                            getToothProduct("mandibular", tn)
                          );
                          const archHasAdded = addedProducts.some((p) => p.arch === "mandibular");
                          if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("mandibular");
                        }}
                        isCurrentlyActive={
                          activeFixedGroupProductId === selectedProduct?.id && card0FixedExpanded
                        }
                        confirmDetailsChecked={confirmDetailsChecked}
                        showHeaderContent={
                          !!selectedProduct && (toothNumbers.length > 0 || caseSubmitted)
                        }
                        showRetentionDone={showFixedRetentionDone}
                        retentionDoneAcknowledged={card0ShowFixedFields}
                        onRetentionDoneChange={(value) => {
                          setFixedRetentionSetupComplete(value);
                          if (value) {
                            setIsSelectionModeActive(false);
                            setActiveExtractionCode(null);
                            if (selectedProduct?.id) {
                              if (!card0FixedExpanded) toggleAccordionFocus(slotId, 0);
                              setActiveFixedGroupProductId(selectedProduct.id);
                            }
                          }
                        }}
                      />
                    }
                  >
                    {card0AutoOpenReady && hasRetentionOptions(selectedProduct) && (
                      <AutoOpenFirstFixedFieldAfterRetentionDone
                        retentionFieldsVisible={card0Gating.retentionFieldsVisible}
                        isExpanded={card0FixedExpanded}
                        caseSubmitted={caseSubmitted}
                        isStageVisible={card0Gating.stageVisible}
                        isStageEmpty={card0Gating.stageEmpty}
                        onOpenStage={handleOpenStageModal}
                        stageProductId={groupStageProductIdFixed}
                        arch="mandibular"
                        stageToothNumber={groupStageToothNumber}
                        usesAccordionShadePicker={usesAccordionShadePicker}
                        firstMissingShadeField={firstMissingShadeField}
                        fixedShadeProductId={_mandFixedShadeProductId}
                        storageToothNumber={groupStageToothNumber}
                        setShadeSelectionState={setShadeSelectionState}
                        isLegacyShadeSectionVisible={
                          isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")
                        }
                        legacyStumpShadeEmpty={
                          _needsStumpShade &&
                          !getSelectedShade(_mandFixedShadeProductId, "mandibular", "stump_shade")
                        }
                        legacyToothShadeEmpty={
                          _needsToothShade &&
                          !getSelectedShade(_mandFixedShadeProductId, "mandibular", "tooth_shade")
                        }
                        fixedShadesComplete={fixedShadesComplete}
                      />
                    )}
                    {card0AutoOpenReady && !isSingleStageNoStages(selectedProduct) && (
                      <AutoOpenStageIfEmpty
                        productId={hasRetentionOptions(selectedProduct) ? groupStageProductIdFixed : `mandibular_prep_${firstToothNumber}`}
                        arch="mandibular"
                        toothNumber={hasRetentionOptions(selectedProduct) ? groupStageToothNumber : firstToothNumber}
                        isExpanded={isCardAccordionExpanded(slotId)}
                        isStageVisible={hasRetentionOptions(selectedProduct) ? card0Gating.stageVisible : isFieldVisible("mandibular", firstToothNumber, "stage")}
                        isStageEmpty={hasRetentionOptions(selectedProduct) ? card0Gating.stageEmpty : !(selectedStages[`mandibular_prep_${firstToothNumber}`] || getFieldValue("mandibular", firstToothNumber, "stage"))}
                        onOpenStage={handleOpenStageModal}
                        caseSubmitted={caseSubmitted}
                      />
                    )}
                    {card0AutoOpenReady && hasRetentionOptions(selectedProduct) && (
                      <>
                        <AutoOpenShadeGuideIfEmpty
                          arch="mandibular"
                          productId={_mandFixedShadeProductId}
                          isExpanded={isCardAccordionExpanded(slotId)}
                          isShadeSectionVisible={isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")}
                          stumpShadeEmpty={_needsStumpShade && !getSelectedShade(_mandFixedShadeProductId, "mandibular", "stump_shade")}
                          toothShadeEmpty={_needsToothShade && !getSelectedShade(_mandFixedShadeProductId, "mandibular", "tooth_shade")}
                          firstMissingShadeField={firstMissingShadeField}
                          storageToothNumber={groupStageToothNumber}
                          setShadeSelectionState={setShadeSelectionState}
                          caseSubmitted={caseSubmitted}
                          skipAutoOpen={usesAccordionShadePicker || fixedShadesComplete}
                        />
                        <AutoOpenGumShade
                          visible={card0Gating.gumAutoOpenVisible}
                          hasValue={card0Gating.gumAutoOpenHasValue}
                          onOpen={() =>
                            setPanelGumShadePicker({
                              toothNumber: groupStageToothNumber,
                              gumShades: selectedProduct?.gum_shades || [],
                              stepOverride: "fixed_stump_shade",
                            })
                          }
                        />
                      </>
                    )}

                    {card0ShowFixedFieldsContent && hasRetentionOptions(selectedProduct) ? (
                      <RetentionProductFields
                        arch="mandibular"
                        isExpanded={isCardAccordionExpanded(slotId)}
                        firstToothNumber={groupStageToothNumber}
                        groupStageToothNumber={groupStageToothNumber}
                        groupStageProductIdFixed={groupStageProductIdFixed}
                        labCustomerId={labCustomerId}
                        selectedProduct={selectedProduct}
                        toothNumbers={toothNumbers}
                        retentionTypes={retentionTypes}
                        caseSubmitted={caseSubmitted}
                        fixedShadeIncomplete={fixedShadeIncomplete}
                        usesAccordionShadePicker={usesAccordionShadePicker}
                        shadeSelectionState={shadeSelectionState}
                        setShadeSelectionState={setShadeSelectionState}
                        showShadeGuideDropdown={showShadeGuideDropdown}
                        setShowShadeGuideDropdown={setShowShadeGuideDropdown}
                        setSelectedShadeGuide={setSelectedShadeGuide}
                        shadeGuideOptions={shadeGuideOptions}
                        handleShadeSelect={handleShadeSelect}
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
                        migrateFixedShadeProductId={migrateFixedShadeProductId}
                        handleOpenImpressionModal={safeOpenImpressionModal}
                        handleOpenAddOnsModal={handleOpenAddOnsModal}
                        getImpressionDisplayText={getImpressionDisplayText as (productId: string, arch: string) => string}
                        selectedImpressions={selectedImpressions}
                        setPanelGumShadePicker={(s) => setPanelGumShadePicker({ ...s, stepOverride: "fixed_stump_shade" })}
                        setSelectedShades={setSelectedShades}
                        peerImplantDetailByTooth={peerImplantDetailByTooth}
                        peerImplantCompleteByTooth={peerImplantCompleteByTooth}
                        expandedImplantTooth={expandedImplantTooth}
                        onExpandedImplantToothChange={setExpandedImplantTooth}
                      />
                    ) : card0ShowFixedFieldsContent ? (
                      <SelectionProductFields
                        arch="mandibular"
                        labCustomerId={labCustomerId}
                        firstToothNumber={firstToothNumber}
                        selectedProduct={selectedProduct}
                        toothNumbers={toothNumbers}
                        caseSubmitted={caseSubmitted}
                        retentionTypesMap={mandibularRetentionTypes}
                        implantDetailCompleteByTooth={implantDetailCompleteByTooth}
                        setImplantDetailCompleteByTooth={setImplantDetailCompleteByTooth}
                        implantDetailByTooth={implantDetailByTooth}
                        setImplantDetailByTooth={setImplantDetailByTooth}
                        isExpanded={isCardAccordionExpanded(slotId)}
                        isFieldVisible={isFieldVisible}
                        isFieldCompleted={isFieldCompleted}
                        getFieldValue={getFieldValue}
                        completeFieldStep={completeFieldStep}
                        storeFieldValue={storeFieldValue}
                        uncompleteFieldStep={uncompleteFieldStep}
                        handleOpenStageModal={handleOpenStageModal}
                        handleShadeFieldClick={handleShadeFieldClick}
                        handleOpenImpressionModal={safeOpenImpressionModal}
                        handleOpenAddOnsModal={handleOpenAddOnsModal}
                        setPanelGumShadePicker={setPanelGumShadePicker}
                        noOpposingNeeded={noOpposingNeeded}
                        showProgressiveFields={
                          useMandibularArchSharedRemovable
                            ? mandibularArchExtractionsReady
                            : isExtractionsSetupComplete(
                                selectedProduct?.extractions ?? [],
                                0,
                                caseSubmitted
                              )
                        }
                        peerImplantDetailByTooth={peerImplantDetailByTooth}
                        peerImplantCompleteByTooth={peerImplantCompleteByTooth}
                        expandedImplantTooth={expandedImplantTooth}
                        onExpandedImplantToothChange={setExpandedImplantTooth}
                        productAddOns={productAddOns}
                        selectedAddonsByTooth={selectedAddonsByTooth}
                      />
                    ) : null}
                    <ScrollToBottom />
                  </ProductAccordionCard>
                );
              });
            })()}

            {/* Initial Removables product accordion — show fields when card 0 product is Removable/Ortho AND teeth are assigned to it */}
            {showDetails && mandibularHasRemovablesCard0 && (() => {
              // Use all arch teeth (not just selected) so the accordion stays visible when all teeth are marked missing
              const realCardTeeth = MANDIBULAR_ALL_TEETH.filter(tn => getToothProduct("mandibular", tn) && getToothProductCard("mandibular", tn) === 0);
              // Fallback to the sentinel tooth + initial product details so the card renders
              // immediately for TIM-default removable/ortho products: they select no teeth, and
              // the async per-tooth product assignment may not have landed yet.
              const cardTeeth = realCardTeeth.length > 0 ? realCardTeeth : (card0InitialProduct ? [MANDIBULAR_ALL_TEETH[0]] : []);
              if (cardTeeth.length === 0) return null;
              const getCardToothProduct = (tn: number) => getToothProduct("mandibular", tn) ?? card0InitialProduct;
              const card0Extractions = cardTeeth.flatMap((tn) => getCardToothProduct(tn)?.extractions ?? []);
              const cardProduct = getCardToothProduct(cardTeeth[0]);
              const cardIsFullDenture = isFullDentureProduct(card0Extractions);
              const cardIsSingleDefaultOnly = isSingleDefaultOnlyExtractionList(
                cardProduct?.extractions ?? card0Extractions
              );
              const card0AssignedTeeth = [...mandibularTeeth]
                .filter((tn) => getToothProductCard("mandibular", tn) === 0)
                .sort((a, b) => a - b);
              const rawDisplayTeeth = cardIsFullDenture ? MANDIBULAR_ALL_TEETH : card0AssignedTeeth;
              const displayTeeth = getRemovableOrangeHeaderTeeth({
                selectedTeeth: rawDisplayTeeth,
                toothExtractionMap: mandibularToothExtractionMap,
                claspTeeth: mandibularClaspTeeth,
                noActiveBoxTeeth: mandibularNoActiveBoxTeeth,
                extractions: cardProduct?.extractions ?? card0Extractions,
                isFullDenture: cardIsFullDenture,
                isSingleDefaultOnly: cardIsSingleDefaultOnly,
              });
              const variationDisplay = resolveVariationDisplay(cardProduct, displayTeeth.length);
              const cardProductName = variationDisplay.name;
              // Prefer a matched variation image; otherwise show the lower arch image when configured.
              const cardProductImage = variationDisplay.matched
                ? variationDisplay.imageUrl
                : resolveArchProductImage(cardProduct, "mandibular", variationDisplay.imageUrl);
              const hasVariationMatch = variationDisplay.matched;
              const cardToothDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";
              const statusBoxSelectedTeeth =
                useMandibularArchSharedRemovable || cardIsSingleDefaultOnly
                  ? mandibularTeeth
                  : cardIsFullDenture
                    ? MANDIBULAR_ALL_TEETH
                    : resolveRemovableStatusBoxSelectedTeeth({
                        cardTeeth: rawDisplayTeeth,
                        toothExtractionMap: mandibularToothExtractionMap,
                        claspTeeth: mandibularClaspTeeth,
                        archTeeth: MANDIBULAR_ALL_TEETH,
                      });
              const isCurrentlyActiveProduct = isCardActiveForToothStatus(0);
              // Use the selected missing teeth (matching buildRushArchSlots) so isProductRushed
              // finds the correct key even when all arch teeth have the product on card 0.
              const repTnStage = resolveCardRepToothForRush(
                card0AssignedTeeth.length > 0 ? card0AssignedTeeth : cardTeeth
              );
              const stageVal = selectedStages[`mandibular_prep_${repTnStage}`] || getFieldValue("mandibular", repTnStage, "stage");
              const stageDisplayName = parseStageDisplayName(stageVal);
              const estDays = resolveRemovableEstDaysText(cardProduct, stageDisplayName);
              const hasRushedRemovables = isProductRushed(
                rushedProducts,
                "mandibular",
                0,
                repTnStage,
                hasRetentionOptions(cardProduct)
              );

              // Compute extractions for this removable product
              const cardExtractionsSeen = new Set<number>();
              const cardExtractions = cardTeeth.flatMap((tn) => {
                const product = getCardToothProduct(tn);
                return product?.extractions ?? [];
              }).filter((e) => {
                if (cardExtractionsSeen.has(e.extraction_id)) return false;
                cardExtractionsSeen.add(e.extraction_id);
                return true;
              });
              const SLOT_ID = "removable0";
              const card0LabelOnlyHeader = !hasConfiguredExtractions(
                useMandibularArchSharedRemovable ? mandibularMergedExtractions : cardExtractions
              );
              const card0Expanded = card0LabelOnlyHeader || isCardAccordionExpanded(SLOT_ID);

              return (
                <ProductAccordionCard
                  key="initial-removables-mandibular"
                  slotId={SLOT_ID}
                  arch="mandibular"
                  isExpanded={card0Expanded}
                  interactionEnabled={isCardAccordionInteractionEnabled(SLOT_ID)}
                  isCurrentlyActive={
                    isCurrentlyActiveProduct && card0Expanded
                  }
                  onToggle={handleCard0RemovableAccordionToggle}
                  productName={cardProductName}
                  productImageUrl={cardProductImage}
                  toothDisplay={cardToothDisplay}
                  stageName={
                    isDisplayableStageValue(stageVal) &&
                      !shouldSkipStageSelection(
                        resolveProductForStageField(cardProduct, "mandibular", getToothProduct)
                      )
                      ? stageDisplayName
                      : undefined
                  }
                  estDaysText={estDays}
                  hasRush={!!hasRushedRemovables}
                  canDelete={!caseSubmitted}
                  onDelete={() => {
                    const teethToClear = useMandibularArchSharedRemovable
                      ? displayTeeth
                      : cardTeeth;
                    teethToClear.forEach((tn) => {
                      clearToothProgress("mandibular", tn);
                      handleMandibularToothDeselect(tn);
                    });
                    const archStillHasTeeth = MANDIBULAR_ALL_TEETH.some((tn) =>
                      getToothProduct("mandibular", tn)
                    );
                    const archHasAdded = addedProducts.some((p) => p.arch === "mandibular");
                    if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("mandibular");
                  }}
                  confirmDetailsChecked={confirmDetailsChecked}
                  caseSubmitted={caseSubmitted}
                  customHeader={
                    <RestorationAccordionHeader
                      isExpanded={card0Expanded}
                      caseSubmitted={caseSubmitted}
                      hasRush={!!hasRushedRemovables}
                      onToggleExpand={handleCard0RemovableAccordionToggle}
                      onPlusClick={
                        card0LabelOnlyHeader
                          ? undefined
                          : () => {
                        setActiveExtractionCode(null);
                        // Re-activating product selection resets Done so the button re-appears
                        const ackCardId = useMandibularArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : 0;
                        setExtractionsSetupComplete(ackCardId, false);
                        setActiveProductCardId(0);
                        setIsSelectionModeActive(true);
                        if (!isCardAccordionExpanded(SLOT_ID)) {
                          handleCard0RemovableAccordionToggle();
                        }
                      }}
                      allArchTeethSelected={displayTeeth.length >= MANDIBULAR_ALL_TEETH.length}
                      labelOnlyHeader={card0LabelOnlyHeader}
                      isProductSelectionActive={activeProductCardId === 0 && (isSelectionModeActive || activeExtractionCode !== null)}
                      isExtractionActive={activeProductCardId === 0 && activeExtractionCode !== null}
                      expandEnabled={allowAccordionCollapse && isAccordionEnabled(SLOT_ID)}
                      productImageUrl={cardProductImage}
                      productName={getRemovableHeaderTitle({
                        productName: cardProductName,
                        hasVariation: cardProduct?.has_variation,
                        teethCount: displayTeeth.length,
                        isFullDenture: cardIsFullDenture,
                        hasVariationMatch,
                      })}
                      toothDisplay={cardToothDisplay}
                      splintSummary={mandibularSplintSummaryFor(card0AssignedTeeth)}
                      categoryName={cardProduct?.subcategory?.category?.name}
                      subcategoryName={cardProduct?.subcategory?.name}
                      stageName={
                        isDisplayableStageValue(stageVal) &&
                        !shouldSkipStageSelection(
                          resolveProductForStageField(cardProduct, "mandibular", getToothProduct)
                        )
                          ? stageDisplayName
                          : undefined
                      }
                      stageProduct={resolveProductForStageField(
                        cardProduct,
                        "mandibular",
                        getToothProduct
                      )}
                      estDaysText={estDays}
                      canDelete={!caseSubmitted}
                      onDelete={() => {
                        const teethToClear = useMandibularArchSharedRemovable
                          ? displayTeeth
                          : cardTeeth;
                        teethToClear.forEach((tn) => {
                          clearToothProgress("mandibular", tn);
                          handleMandibularToothDeselect(tn);
                        });
                        const archStillHasTeeth = MANDIBULAR_ALL_TEETH.some((tn) =>
                          getToothProduct("mandibular", tn)
                        );
                        const archHasAdded = addedProducts.some((p) => p.arch === "mandibular");
                        if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("mandibular");
                      }}
                      isCurrentlyActive={
                        isCurrentlyActiveProduct && card0Expanded
                      }
                      confirmDetailsChecked={confirmDetailsChecked}
                      showHeaderContent={shouldShowRemovableHeaderContent({
                        hasProduct: !!cardProduct,
                        hasVariation: cardProduct?.has_variation,
                        teethCount: displayTeeth.length,
                        caseSubmitted,
                      })}
                      showExtractionsDone={requiresExtractionsAcknowledgement(
                        useMandibularArchSharedRemovable
                          ? mandibularMergedExtractions
                          : cardExtractions,
                        card0InitialProduct,
                      )}
                      extractionsAcknowledged={
                        useMandibularArchSharedRemovable
                          ? mandibularArchExtractionsReady
                          : isExtractionsSetupComplete(cardExtractions, 0, caseSubmitted)
                      }
                      onExtractionsAcknowledgedChange={(v) =>
                        useMandibularArchSharedRemovable
                          ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                          : setExtractionsSetupComplete(0, v)
                      }
                      middleContent={
                        isCardActiveForToothStatus(0) &&
                        (useMandibularArchSharedRemovable
                          ? mandibularMergedExtractions
                          : cardExtractions
                        ).length > 0 &&
                        !isSingleDefaultOnlyExtractionList(
                          useMandibularArchSharedRemovable
                            ? mandibularMergedExtractions
                            : cardExtractions
                        ) &&
                        // Show the extraction boxes + Done button once teeth are selected,
                        // or immediately when selection is optional (default + optional-only,
                        // e.g. night guard) so the user can click Done without selecting.
                        (mandibularTeeth.length > 0 ||
                          isExtractionSelectionOptional(
                            useMandibularArchSharedRemovable
                              ? mandibularMergedExtractions
                              : cardExtractions
                          )) ? (
                          <>
                          {mandibularToothHint && mandibularToothHint.kind === "reference" && (
                            <p className={mandibularToothHint.className}>{mandibularToothHint.text}</p>
                          )}
                          <ToothStatusBoxes
                            extractions={
                              useMandibularArchSharedRemovable
                                ? mandibularMergedExtractions
                                : cardExtractions
                            }
                            selectedTeeth={statusBoxSelectedTeeth}
                            allArchTeeth={MANDIBULAR_ALL_TEETH}
                            toothExtractionMap={mandibularToothExtractionMap}
                            claspTeeth={mandibularClaspTeeth}
                            skipDefaultAutoSelect={card0SkipsLegacyDefaults}
                            displayTeethByCode={getToothStatusBoxDisplayMap({
                              extractions: useMandibularArchSharedRemovable
                                ? mandibularMergedExtractions
                                : cardExtractions,
                              selectedTeeth: statusBoxSelectedTeeth,
                              toothExtractionMap: mandibularToothExtractionMap,
                              claspTeeth: mandibularClaspTeeth,
                              excludeTeeth: displayTeeth,
                            })}
                            activeExtractionCode={activeExtractionCode}
                            onActiveExtractionChange={(code, exts) => {
                              setActiveExtractionCode(code);
                              if (exts) setActiveExtractions(exts);
                              else if (useMandibularArchSharedRemovable) {
                                setActiveExtractions(mandibularMergedExtractions);
                              }
                              // Re-activating an extraction box resets Done so the button re-appears
                              if (code !== null) {
                                const ackCardId = useMandibularArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : 0;
                                setExtractionsSetupComplete(ackCardId, false);
                                setIsSelectionModeActive(true);
                              }
                            }}
                            onToothExtractionToggle={(tn, code, extractions) =>
                              handleToothExtractionToggle(
                                "mandibular",
                                tn,
                                code,
                                extractions ??
                                  (useMandibularArchSharedRemovable
                                    ? mandibularMergedExtractions
                                    : cardExtractions)
                              )
                            }
                            onSelectAllTeeth={selectAllMandibularTeeth}
                            onRequiredValidationChange={onToothStatusValidationChange}
                            isRemovable={true}
                            submitted={caseSubmitted}
                            hideDefaultBox={true}
                            disableRequiredValidation={true}
                            grayed={isActiveMandibularProductDetailPending}
                            acknowledged={
                              useMandibularArchSharedRemovable
                                ? mandibularArchExtractionsReady
                                : isExtractionsSetupComplete(cardExtractions, 0, caseSubmitted)
                            }
                            onAcknowledgedChange={(v) => {
                              if (v) {
                                // Done clicked — clear active borders
                                setActiveExtractionCode(null);
                                setIsSelectionModeActive(false);
                              }
                              useMandibularArchSharedRemovable
                                ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                                : setExtractionsSetupComplete(0, v);
                            }}
                          />
                          </>
                        ) : undefined
                      }
                    />
                  }
                >
                  {(() => {
                    const repTn = cardTeeth[0];
                    const toothProduct = getCardToothProduct(repTn);
                    const advFields = toothProduct?.advance_fields;
                    const removableChain = getSelectionFieldChain(toothProduct);
                    const isF = (step: string) =>
                      hasAdvanceField(step, advFields, toothProduct ?? undefined) &&
                      isFieldVisible("mandibular", repTn, step as any, removableChain);
                    const isFComplete = (step: string) => isFieldCompleted("mandibular", repTn, step as any);
                    const fVal = (step: string) => getFieldValue("mandibular", repTn, step as any);
                    const productKey = `mandibular_prep_${repTn}`;
                    const impressionModalProductId = "0";
                    const stageVal = fVal("stage") || selectedStages[productKey] || "";
                    const singleStageSkip = shouldSkipStageSelection(
                      resolveProductForStageField(toothProduct, "mandibular", getToothProduct)
                    );
                    const oppositeMaxillaryTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                    const oppositeProductDonor = findOppositeArchProductDonor(
                      "mandibular",
                      toothProduct?.id,
                      getToothProduct,
                      oppositeMaxillaryTeeth
                    );
                    const displayGumShades = resolveGumShadesForDisplay(toothProduct, oppositeProductDonor);
                    const removableImplantTeeth = getImplantTeethInGroup(
                      cardTeeth,
                      mandibularRetentionTypes
                    );
                    const removableImplantDetailReady = areAllImplantDetailsComplete(
                      removableImplantTeeth,
                      implantDetailCompleteByTooth
                    );
                    const card0ShowRemovableFields = useMandibularArchSharedRemovable
                      ? mandibularArchExtractionsReady
                      : card0SkipsLegacyDefaults ||
                        isExtractionsSetupComplete(cardExtractions, 0, caseSubmitted);
                    // Guided both-arch flow: suppress card-0 field content until this arch's
                    // fields phase (chart + teeth selection above remain visible).
                    if (guidedHideCard0Fields) {
                      return null;
                    }
                    if (
                      !card0ShowRemovableFields &&
                      !useMandibularArchSharedRemovable &&
                      requiresExtractionsAcknowledgement(cardExtractions, card0InitialProduct)
                    ) {
                      return null;
                    }
                    return (
                      <>
                        {!singleStageSkip && !suppressAutoOpen && (
                          <AutoOpenStageIfEmpty
                            productId={productKey}
                            arch="mandibular"
                            toothNumber={repTn}
                            isExpanded={card0Expanded && card0ShowRemovableFields}
                            isStageVisible={isF("stage")}
                            isStageEmpty={!stageVal}
                            onOpenStage={handleOpenStageModal}
                            caseSubmitted={caseSubmitted}
                          />
                        )}
                        {!suppressAutoOpen && (
                          <AutoOpenImpressionIfEmpty
                            isExpanded={card0Expanded && card0ShowRemovableFields}
                            isImpressionVisible={
                              getNextSelectionFieldStep(
                                removableChain,
                                "mandibular",
                                repTn,
                                (a, t, s) => isFieldCompleted(a, t, s)
                              ) === "impression" &&
                              isF("impression") &&
                              removableImplantDetailReady
                            }
                            isImpressionEmpty={
                              !isFComplete("impression") &&
                              !archHasActiveImpressionSelections(
                                selectedImpressions,
                                impressionModalProductId,
                                "mandibular"
                              )
                            }
                            onOpenImpressionModal={safeOpenImpressionModal}
                            arch="mandibular"
                            productId={impressionModalProductId}
                            toothNumber={repTn}
                            caseSubmitted={caseSubmitted}
                            blockAutoOpen={isAnyModalOpen}
                          />
                        )}
                        <div className="rounded-lg p-3 space-y-3">
                          {/* Row 1: Grade / Stage */}
                          {(isF("grade") || (isF("stage") && !singleStageSkip)) && (() => {
                            const gradesDonor = findOppositeArchGradesDonor(
                              "mandibular",
                              toothProduct?.id,
                              getToothProduct,
                              oppositeMaxillaryTeeth
                            );
                            const gradeProducts = resolveProductGradesForDisplay(toothProduct, gradesDonor);
                            const hasGradesRow =
                              gradeProducts.length > 0 || (isF("grade") && productHasGrades(toothProduct));
                            return (
                              <div className={`grid grid-cols-1 ${hasGradesRow ? "sm:grid-cols-2" : ""} gap-3`}>
                                {isF("grade") && (() => {
                                  const productGrades = gradeProducts;
                                  if (productGrades.length === 0 && !productHasGrades(toothProduct)) return null;
                                  const gradeRaw = fVal("grade") || "";
                                  const gradeVal = parseGradeDisplayName(gradeRaw);
                                  const isGradeComplete = isGradeStepCompleteForDisplay(
                                    gradeRaw,
                                    isFComplete("grade"),
                                    toothProduct
                                  );
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
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{parseStageDisplayName(stageVal)}</span>
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
                                {isF("teeth_shade") && !suppressAutoOpen && (
                                  <AutoOpenShade
                                    hasValue={isFComplete("teeth_shade")}
                                    onOpen={() => handleShadeFieldClick("mandibular", "tooth_shade", shadeProductId)}
                                  />
                                )}
                                {!suppressAutoOpen && (
                                  <AutoOpenGumShade
                                    visible={isF("gum_shade")}
                                    hasValue={isFComplete("gum_shade")}
                                    onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: displayGumShades })}
                                  />
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {isF("teeth_shade") && (
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
                                  {isF("gum_shade") && (
                                    <fieldset
                                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isFComplete("gum_shade") && !caseSubmitted ? "border-[#34a853]" : isFComplete("gum_shade") ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                      onClick={() => {
                                        if (!caseSubmitted) {
                                          const currentGumShade = fVal("gum_shade");
                                          let currentName: string | null = null;
                                          if (currentGumShade) { try { currentName = JSON.parse(currentGumShade).name ?? null; } catch { } }
                                          setPanelGumShadePicker({ toothNumber: repTn, gumShades: displayGumShades, selectedName: currentName });
                                        }
                                      }}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${isFComplete("gum_shade") && !caseSubmitted ? "text-[#34a853]" : isFComplete("gum_shade") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Gum Shade</legend>
                                      <div className="flex items-center gap-2 w-full">
                                        {isFComplete("gum_shade") ? (() => {
                                          const raw = fVal("gum_shade");
                                          let displayName = raw;
                                          let color: string | null = null;
                                          try { const p = JSON.parse(raw); displayName = p.name ?? raw; } catch { }
                                          const matchedShade = displayGumShades.find((s) => s.name === displayName);
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
                                        })() : (
                                          <span className="text-[#CF0202] text-base font-medium">Select Gum Shade</span>
                                        )}
                                        {isFComplete("gum_shade") && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
                                      </div>
                                    </fieldset>
                                  )}
                                </div>
                              </>
                            );
                          })()}

                          {/* Row 3: Impression */}
                          {isF("impression") && (() => {
                            const impressionDisplay =
                              getImpressionDisplayText(impressionModalProductId, "mandibular", repTn) ||
                              fVal("impression");
                            const impressionComplete =
                              isFComplete("impression") ||
                              (!!impressionDisplay &&
                                archHasActiveImpressionSelections(
                                  selectedImpressions,
                                  impressionModalProductId,
                                  "mandibular"
                                ));
                            return (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                              onClick={() => safeOpenImpressionModal("mandibular", impressionModalProductId, repTn)}
                            >
                              <legend className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{impressionDisplay}</span>
                              {impressionComplete && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                            </fieldset>
                            );
                          })()}
                          {/* Row 4: Add ons — when selected in modal, store, or product defaults */}
                          {isF("addons") && (() => {
                            const addonCtx = buildRemovableAddonFieldContext({
                              arch: "mandibular",
                              cardId: 0,
                              cardTeeth,
                              repTooth: repTn,
                              product: toothProduct,
                              getFieldValue,
                              selectedAddonsByTooth,
                              productAddOns,
                            });
                            if (!addonCtx.show) return null;
                            const addonItems = parseAddonDisplayItems(addonCtx.display);
                            const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                            const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                            const onClickAddon = () =>
                              handleOpenAddOnsModal(
                                "mandibular",
                                toothProduct?.id?.toString() || `prep_${repTn}`,
                                repTn
                              );
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
                </ProductAccordionCard>
              );
            })()}

            {/* Opposing product accordion — shown only when an opposing impression was selected in the modal */}
            {showDetails && opposingProductData && (opposingProductData.opposite_impression === "Yes" || (opposingProductData.opposite_extractions?.length ?? 0) > 0) && (() => {
              // Impression keys are `${productId}_${arch}_${code}` (e.g. "0_mandibular_<code>" or "12_mandibular_<code>").
              // Legacy keys used "maxillary_prep_<tooth>_mandibular_<code>".
              const hasOpposingImpressionSelected =
                (selectedImpressions.mandibular?.length ?? 0) > 0;
              const isNoOpposing =
                !hasOpposingImpressionSelected &&
                Object.keys(noOpposingNeeded).some(
                  (k) =>
                    /^\d+_maxillary_/.test(k) ||
                    (k.startsWith("maxillary_prep_") && k.includes("_maxillary_"))
                );
              if (!hasOpposingImpressionSelected && !isNoOpposing) return null;
              const opposingImpressionText =
                selectedImpressions.mandibular
                  ?.filter((e) => e.qty > 0)
                  .map((e) => `${e.qty}x ${e.name}`)
                  .join(", ") ?? "";
              return (
                <OpposingRemovableAccordion
                  key="opposing-accordion"
                  opposingArch="mandibular"
                  fieldArch="maxillary"
                  fieldRepTn={MAXILLARY_SENTINEL}
                  opposingProductData={opposingProductData}
                  opposingArchTeeth={[17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]}
                  opposingToothExtractionMap={opposingToothExtractionMap}
                  opposingClaspTeeth={opposingClaspTeeth}
                  opposingNoActiveBoxTeeth={opposingNoActiveBoxTeeth}
                  opposingSelectedTeeth={opposingSelectedTeeth}
                  selectedImpressions={selectedImpressions}
                  opposingImpressionText={opposingImpressionText}
                  confirmDetailsChecked={confirmDetailsChecked}
                  caseSubmitted={caseSubmitted}
                  selectedStages={selectedStages}
                  rushedProducts={rushedProducts}
                  isFieldVisible={isFieldVisible}
                  isFieldCompleted={isFieldCompleted}
                  completeFieldStep={completeFieldStep}
                  getFieldValue={getFieldValue}
                  handleOpenStageModal={handleOpenStageModal}
                  handleShadeFieldClick={handleShadeFieldClick}
                  handleOpenImpressionModal={safeOpenImpressionModal}
                  handleOpenAddOnsModal={handleOpenAddOnsModal}
                  getImpressionDisplayText={
                    getImpressionDisplayText as (productId: string, arch: Arch) => string
                  }
                  setPanelGumShadePicker={setPanelGumShadePicker}
                  opposingActiveExtractionCode={opposingActiveExtractionCode}
                  setOpposingActiveExtractionCode={setOpposingActiveExtractionCode}
                  setOpposingActiveExtractions={setOpposingActiveExtractions}
                  onOpposingExtractionToggle={onOpposingExtractionToggle}
                  onSelectAllOpposingTeeth={onSelectAllOpposingTeeth}
                  onToothStatusValidationChange={onToothStatusValidationChange}
                  opposingOnlyLayout={opposingOnlyLayout}
                />
              );
            })()}

          </div>{/* end scrollable accordion container */}

        </>
      )}

      {/* Block interaction when maxillary is incomplete or adding maxillary product (rendered last so it sits above panel content) */}
      {disabled && blockedByOppositeAddProduct && (
        <OppositeArchAddProductShield active activeArch="maxillary" />
      )}
      {disabled && !blockedByOppositeAddProduct && (
        <div
          className="absolute inset-0 z-[25] rounded-lg flex items-start justify-center pt-12 cursor-not-allowed"
          style={{ backgroundColor: "rgba(245,245,245,0.75)" }}
          title="Complete the Maxillary fields first"
          aria-hidden
        >
          <span className="text-xs text-[#7f7f7f] bg-white border border-[#d9d9d9] rounded px-3 py-1.5 shadow-sm select-none pointer-events-none">
            Complete Maxillary fields first
          </span>
        </div>
      )}

    </div>
  );
}
