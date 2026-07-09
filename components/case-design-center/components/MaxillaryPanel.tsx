"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Trash2,
  Paperclip,
} from "lucide-react";
import { Check } from "@/components/ui/custom-check";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import type { RetentionOptionItem, ExtractionStatusOption } from "@/components/retention-type-popover";
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
import { shadeGuideOptions as defaultShadeGuideOptions } from "../constants";
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
} from "../utils/removableSelectionHints";
import {
  hasVisibleAddonDisplay,
  parseAddonDisplayItems,
  productSupportsAddons,
} from "../utils/addonDisplayHelpers";
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
import { AccordionHeaderActions } from "./ExtractionsDoneAcknowledgement";
import { AutoOpenFirstFixedFieldAfterRetentionDone } from "./FixedRetentionFieldAutoOpen";
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
import { hasImplantRetention } from "../utils/implantHelpers";
import {
  areAllImplantDetailsComplete,
  getImplantTeethInGroup,
  resolveGroupStageToothNumber,
} from "../utils/implantDetailHelpers";
import { getActiveProductPopoverContextToken } from "../utils/activeProductPopoverContext.js";
import { shouldUseScopedRetentionMode } from "../utils/activeCardPopoverMode";
import { isOwnArchToothChartEnabled } from "../utils/productAccordionFocus";
import {
  areFixedProductShadesComplete,
  buildShadeSelectionKey,
  getFirstMissingShadeGuideField,
  getShadeFieldType,
  getShadeGuideAdvanceFields,
  isFixedProductShadeStorageId,
  resolveFixedShadeProductId,
  shouldUseAccordionOnlyFixedShades,
} from "../utils/shadeGuideAdvanceFields";
import { shouldAddToProductSelectionOnRemovableClick } from "../utils/removableToothClickMode";
import {
  caseDesignInter,
  removableHeaderTitleClass,
  removableHeaderToothClass,
} from "../case-design-inter-font";
import { resolveRemovableEstDaysText } from "../utils/removableEstDays";
import { getRemovableHeaderTitle, shouldShowRemovableHeaderContent } from "../utils/removableHeaderLabel";
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
import type { ImplantDetailData } from "./ImplantDetailSection";
import { SelectionProductFields, GradeHoverSelector } from "./RemovableRestorationFields";

import {
  AccordionBadge,
  CurrentlyActiveProductBadge,
  EstDaysLabel,
  removableProductTitleBoxClassName,
} from "./AccordionBadge";
import { ProductImagePreview } from "./ProductImagePreview";
import { ProductAccordionCard } from "./ProductAccordionCard";
import { RestorationAccordionHeader } from "./RestorationAccordionHeader";
import { OpposingRemovableAccordion } from "./OpposingRemovableAccordion";
import { StageHistoryBlock } from "./StageHistoryBlock";
import type { NewStageEligibilityStageRef } from "@/lib/api/slip-new-stage-eligibility";
import { MANDIBULAR_SENTINEL } from "../utils/opposingImpressionReadiness";
import {
  addedProductSlotId,
  archAllowsAccordionCollapse,
  countFixedCard0Groups,
} from "../utils/productAccordionFocus";
import {
  getPreferredLabGumShade,
  getPreferredLabTeethShade,
  canAutoApplyPreferredGum,
} from "@/lib/product-shade-preferences";
import {
  mergeProductDefaultToothChartForSlipSvgDisplay,
  resolveSlipDefaultChartProduct,
} from "@/lib/product-default-tooth-chart-slip-display";
import { shouldSkipLegacyDefaultExtractionAutoSelect } from "@/lib/product-default-tooth-chart";

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
  /** Accordion-only shades or all shades already set — do not reopen picker on expand. */
  skipAutoOpen?: boolean;
}) {
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (caseSubmitted || skipAutoOpen) return;
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
  const hasAutoOpenedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (caseSubmitted || blockAutoOpen) return;
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
  }, [caseSubmitted, blockAutoOpen, isExpanded, isImpressionVisible, isImpressionEmpty, onOpenImpressionModal, arch, productId, toothNumber]);
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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MaxillaryPanelProps {
  /** Wizard arch for the initial card-0 product (upper / lower / both). */
  slipInitialArch?: "maxillary" | "mandibular" | "both";
  // Visibility
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;
  showDetails: boolean;
  caseSubmitted?: boolean;
  /** Add-new-stage / edit-slip preload: auto-acknowledge extractions so Done is skipped on load. */
  preloadInitialSlipState?: boolean;
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
  /** Wizard card-0 product is removable (used before initialProductDetails resolves). */
  initialProductIsRemovable?: boolean;
  /** True while the initial product details API request is in flight. */
  initialProductDetailsPending?: boolean;
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
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string;
  handleShadeSelect: (shade: string) => void;
  /** Direct write into the shade-selection map (fixed products' gum shade must count as stump_shade). */
  setSelectedShades?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  migrateFixedShadeProductId?: (fromProductId: string, toProductId: string, arch: Arch) => void;
  handleShadeFieldClick: (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string,
    options?: { advanceFieldId?: number | null; advanceFieldLabel?: string | null }
  ) => void;

  // Expansion
  expandedLeft: boolean;
  setExpandedLeft: (v: boolean) => void;
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
  collapseAllAddedProducts: () => void;
  handleRemoveAddedProduct: (productId: number) => void;

  // Active product card tracking
  activeProductCardId: number;
  setActiveProductCardId: (id: number) => void;
  /** Global single-active accordion key (`arch:slotId`), e.g. `maxillary:added:3`. */
  activeAccordionKey: string;
  /** Force this arch's tooth chart interactive even when it doesn't own the active accordion (initial fixed "both" flow). */
  forceOwnArchChartEnabled?: boolean;
  /** Guided both-arch flow: hide this arch's card-0 field content until its fields phase is reached (chart/selection stay visible). */
  guidedHideCard0Fields?: boolean;
  /** Initial (card 0) product name — used for the "Select teeth to replace with …" hint before any teeth are assigned. */
  initialProductName?: string;
  /** Global single-active accordion (this arch). */
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
  maxillaryToothExtractionMap: Record<number, string>;
  maxillaryClaspTeeth: number[];
  maxillaryNoActiveBoxTeeth?: number[];
  setMaxillaryNoActiveBoxTeeth?: (teeth: number[] | ((prev: number[]) => number[])) => void;
  handleToothExtractionToggle: (arch: Arch, toothNumber: number, extractionCode: string, extractions?: import("../types").ProductExtraction[]) => void;
  canUseToothForActiveProduct?: (arch: Arch, toothNumber: number) => boolean;
  selectAllMaxillaryTeeth: (teeth: number[]) => void;
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
  /** When true, the initial card 0 product is Fixed Restoration AND maxillary teeth with Prep/Pontic exist */
  maxillaryHasFixedCard0?: boolean;
  /** When true, the initial card 0 product is a Removable/Ortho AND maxillary teeth have been selected for it */
  maxillaryHasRemovablesCard0?: boolean;
  /** Extractions from the initial card 0 product — used as fallback when no teeth are selected yet */
  card0Extractions?: ProductExtraction[];
  /** Full initial card 0 product details — fallback so the removable/ortho card renders
   *  before any tooth has the product assigned (TIM-default products select no teeth). */
  card0InitialProduct?: ProductApiData | null;
  /** Product+arch combos where user chose "Submit, no opposing needed" */
  noOpposingNeeded?: Record<string, boolean>;
  /** Impression selections by key (productId_arch_impressionValue → qty) */
  selectedImpressions?: import("../utils/impressionStorage").SlipImpressionSelections;
  /** When set, renders the opposing product accordion for products with opposite_extractions */
  opposingProductData?: ProductApiData | null;
  /** Opposing tooth extraction map: toothNumber → extractionCode for the opposing arch */
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
  selectAllOpposingTeeth?: (teeth: number[]) => void;
  /** Called when the checked teeth (checkbox selection) change */
  onCheckedTeethChange?: (teeth: number[]) => void;
  /** Called whenever implant detail data changes for any tooth (so CaseDesignCenter can include it in the slip snapshot). */
  onImplantDetailChange?: (implantDetailByTooth: Record<number, ImplantDetailData>) => void;
  /** Called whenever splint link state changes (so CaseDesignCenter can include it in the slip snapshot). */
  onSplintLinksChange?: (splintLinksByKey: Record<string, number[]>) => void;
  /** Opposite-arch implant details for mirroring when the same product is on both sides. */
  peerImplantDetailByTooth?: Record<number, ImplantDetailData>;
  /** Navigate back to category selection in the new-case wizard. Invoked after deleting a Fixed Restoration accordion. */
  onBackToCategories?: (arch?: "maxillary" | "mandibular") => void;
  /** When true the footer acknowledgement checkbox is checked — accordion header borders turn green; orange when false. */
  confirmDetailsChecked?: boolean;
  /** Add-new-stage: prior slip stages for maxillary products. */
  addStageStageHistory?: NewStageEligibilityStageRef[];
  /** When true (stage or impression modal is open), disables the teeth SVG. */
  isAnyModalOpen?: boolean;
  /** Single-arch slip: opposing accordion shows extractions/impression only, not primary product. */
  opposingOnlyLayout?: boolean;
  /** When true, blocks interaction while the user adds a product on the other arch. */
  disabled?: boolean;
  /** Inline category/product picker for adding another product on this arch. */
  showInlineAddProductPicker?: boolean;
  /** Product IDs already selected on this arch; excluded from picker list. */
  excludedProductIds?: number[];
  /** Subcategory IDs already selected on this arch; excluded from picker list. */
  excludedSubcategoryIds?: number[];
  labCustomerId?: number | null;
  onInlineAddProductComplete?: (result: InlineAddProductResult) => void | Promise<void>;
  onInlineAddProductCancel?: () => void;
  onShowSelectTeethToReplaceChange?: (show: boolean) => void;
}

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

  // Shade steps: show when the matching has_* flag is set, regardless of advance_fields.
  // Stump shade is gated on gum shade only — a teeth-shade-only product must not show it.
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
  slipInitialArch = "maxillary",
  showMaxillary,
  setShowMaxillary,
  showDetails,
  caseSubmitted = false,
  preloadInitialSlipState = false,
  maxillaryTeeth,
  handleMaxillaryToothClick,
  maxillaryRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  activeProductIsRemovables = false,
  initialProductIsRemovable = false,
  initialProductDetailsPending = false,
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
  setSelectedShades,
  handleShadeFieldClick,
  migrateFixedShadeProductId,
  expandedLeft,
  setExpandedLeft,
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
  collapseAllAddedProducts,
  handleRemoveAddedProduct,
  activeProductCardId,
  setActiveProductCardId,
  activeAccordionKey,
  forceOwnArchChartEnabled = false,
  guidedHideCard0Fields = false,
  initialProductName,
  isAccordionExpanded,
  isAccordionEnabled,
  toggleAccordionFocus,
  onExtractionsDone,
  onRetentionDone,
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
  maxillaryNoActiveBoxTeeth = [],
  setMaxillaryNoActiveBoxTeeth,
  handleToothExtractionToggle,
  canUseToothForActiveProduct,
  selectAllMaxillaryTeeth,
  onToothStatusValidationChange,
  maxillaryHasFixedCard0 = false,
  maxillaryHasRemovablesCard0 = false,
  card0Extractions = [],
  card0InitialProduct = null,
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
  selectAllOpposingTeeth,
  onCheckedTeethChange,
  onImplantDetailChange,
  onSplintLinksChange,
  peerImplantDetailByTooth,
  onBackToCategories,
  onShowSelectTeethToReplaceChange,
  confirmDetailsChecked = false,
  addStageStageHistory,
  isAnyModalOpen = false,
  opposingOnlyLayout = false,
  disabled = false,
  showInlineAddProductPicker = false,
  excludedProductIds = [],
  excludedSubcategoryIds = [],
  labCustomerId = null,
  onInlineAddProductComplete,
  onInlineAddProductCancel,
}: MaxillaryPanelProps) {
  const MAXILLARY_ALL_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const MAXILLARY_PRODUCT_SENTINEL = 1;
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
          (addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "maxillary")
            ?.product ?? null) as Record<string, unknown> | null,
        );

  const teethCount = activeProductCardId !== null
    ? (activeProductCardId !== 0
        ? MAXILLARY_ALL_TEETH.filter(tn => getToothProductCard("maxillary", tn) === activeProductCardId).length
        : (activeProductIsRemovables
            ? MAXILLARY_ALL_TEETH.filter(tn => { const code = maxillaryToothExtractionMap[tn]; return code && code !== "TIM"; }).length
            : MAXILLARY_ALL_TEETH.filter(tn => getToothProductCard("maxillary", tn) === 0).length
          )
      )
    : 0;

  const activeRemovableExtractionsForHint = (() => {
    if (!activeProductIsRemovables) return undefined;
    if (activeProductCardId !== 0) {
      return addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "maxillary")
        ?.product?.extractions;
    }
    if (card0Extractions?.length) return card0Extractions;
    const card0Tooth = MAXILLARY_ALL_TEETH.find((tn) => getToothProductCard("maxillary", tn) === 0);
    return card0Tooth
      ? getToothProduct("maxillary", card0Tooth)?.extractions
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
        (p) => p.id === activeProductCardId && p.arch === "maxillary"
      );
      if (!ap) return;
      productForSkip =
        (ap.product as ProductApiData | undefined) ??
        getToothProduct("maxillary", -ap.id);
      const cardTeeth = MAXILLARY_ALL_TEETH.filter(
        (tn) => getToothProductCard("maxillary", tn) === ap.id
      );
      const repTn =
        cardTeeth.length > 0 ? cardTeeth[0] : -ap.id;
      exts =
        getToothProduct("maxillary", repTn)?.extractions ??
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
  } = useExtractionsAcknowledged("maxillary", preloadInitialSlipState);

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
  /** Active extraction code selected in the opposing ToothStatusBoxes */
  const [opposingActiveExtractionCode, setOpposingActiveExtractionCode] = useState<string | null>(null);
  const [opposingActiveExtractions, setOpposingActiveExtractions] = useState<import("../types").ProductExtraction[]>([]);
  /** Tracks which card 0 fixed product group is active (by product ID) for tooth chart sync */
  const [activeFixedGroupProductId, setActiveFixedGroupProductId] = useState<number | null>(null);
  const activePopoverContextToken = getActiveProductPopoverContextToken({
    arch: "maxillary",
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
      if (retentionPopoverState.arch === "maxillary") {
        setRetentionPopoverState({ arch: null, toothNumber: null });
      }
    }
    prevPopoverContextRef.current = activePopoverContextToken;
  }, [activePopoverContextToken, retentionPopoverState.arch, setRetentionPopoverState]);
  /** Panel-level gum shade picker state — shown above tooth status boxes */
  const [panelGumShadePicker, setPanelGumShadePicker] = useState<{ toothNumber: number; gumShades: { gum_shade_id: number; name: string; color_code_middle: string; brand: { id: number } }[]; selectedName?: string | null; stepOverride?: FieldStep } | null>(null);
  // Mutual exclusion: close gum shade picker when tooth shade picker opens for this arch
  useEffect(() => {
    if (shadeSelectionState.arch === "maxillary" && shadeSelectionState.fieldType !== null) {
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
        (maxillaryRetentionTypes[toothNumber] || []).includes("Implant") ||
        hasImplantRetention([toothNumber], maxillaryRetentionTypes, product?.retention_options);
      if (needsImplantDetail && implantDetailCompleteByTooth[toothNumber] !== true) return;
    }
    handleOpenImpressionModal(arch, productId, toothNumber);
  }, [getToothProduct, maxillaryRetentionTypes, implantDetailCompleteByTooth, handleOpenImpressionModal]);
  // Auto-select default grade for removable products when product loads
  const autoGradeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MAXILLARY_ALL_TEETH) {
      const tp = getToothProduct("maxillary", tn);
      if (!tp) continue;
      const key = `maxillary_${tn}`;
      const currentVal = getFieldValue("maxillary", tn, "grade");
      const activeGrades = getActiveGrades(tp.grades);
      const existing = parseGradeDisplayName(currentVal);
      // Product has grades: clear any prior auto/skip value so the user must pick a grade explicitly.
      if (isGradeFieldValueSkipped(currentVal) && activeGrades.length > 0) {
        uncompleteFieldStep("maxillary", tn, "grade");
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
        completeFieldStep("maxillary", tn, "grade", JSON.stringify({ skipped: true }));
      }
    }
  }, [getFieldValue, completeFieldStep, uncompleteFieldStep, getToothProduct]);

  const autoPreferredTeethShadeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MAXILLARY_ALL_TEETH) {
      const tp = getToothProduct("maxillary", tn);
      if (!tp) continue;
      const key = `maxillary_${tn}`;
      if (autoPreferredTeethShadeApplied.current.has(key)) continue;
      if (getFieldValue("maxillary", tn, "teeth_shade")) continue;
      const pref = getPreferredLabTeethShade(tp);
      if (!pref) continue;
      const teethShadeId = Number((pref as { teeth_shade_id?: number; id?: number }).teeth_shade_id ?? (pref as { id?: number }).id);
      const name = String((pref as { name?: string }).name ?? "");
      if (!teethShadeId || !name) continue;
      const brandRaw = (pref as { brand?: { id?: number } }).brand;
      const brandId = brandRaw?.id ?? 0;
      autoPreferredTeethShadeApplied.current.add(key);
      completeFieldStep(
        "maxillary",
        tn,
        "teeth_shade",
        JSON.stringify({ teeth_shade_id: teethShadeId, brand_id: brandId, name }),
      );
    }
  }, [getFieldValue, completeFieldStep, getToothProduct]);

  const autoPreferredGumShadeApplied = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tn of MAXILLARY_ALL_TEETH) {
      const tp = getToothProduct("maxillary", tn);
      if (!tp) continue;
      const key = `maxillary_${tn}`;
      if (autoPreferredGumShadeApplied.current.has(key)) continue;
      if (getFieldValue("maxillary", tn, "gum_shade")) continue;
      if (!canAutoApplyPreferredGum(tp, () => getFieldValue("maxillary", tn, "teeth_shade"))) continue;
      const pref = getPreferredLabGumShade(tp);
      if (!pref) continue;
      const gumShadeId = Number((pref as { gum_shade_id?: number; id?: number }).gum_shade_id ?? (pref as { id?: number }).id);
      const name = String((pref as { name?: string }).name ?? "");
      const brandId = Number((pref as { brand?: { id?: number } }).brand?.id ?? 0);
      if (!gumShadeId || !name) continue;
      autoPreferredGumShadeApplied.current.add(key);
      completeFieldStep(
        "maxillary",
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
    for (const ap of addedProducts.filter(ap => ap.arch === "maxillary")) {
      if (!ap.productId) continue;
      const hasTeeth = MAXILLARY_ALL_TEETH.some(tn => getToothProductCard("maxillary", tn) === ap.id);
      if (hasTeeth) continue;
      const virtualSlot = -ap.id;
      if (addedProductPrefetchRef.current.has(ap.id)) continue;
      addedProductPrefetchRef.current.add(ap.id);
      fetchAndAssignProduct("maxillary", virtualSlot, ap.productId);
    }
  }, [addedProducts, fetchAndAssignProduct, getToothProductCard]);

  // Auto-fetch product data for Fixed Restoration added cards whose teeth are assigned but product data is missing.
  const fixedFetchedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const ap of addedProducts.filter(ap => ap.arch === "maxillary")) {
      if (!ap.productId) continue;
      if (!hasRetentionOptions(ap.product)) continue;
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
  const isActiveMaxillaryNonRetention = (() => {
    if (activeProductCardId !== 0) {
      const activeAp = addedProducts.find(
        (p) => p.id === activeProductCardId && (p.arch === "maxillary" || p.arch === "both")
      );
      if (!activeAp) return false;
      const assignedTooth = MAXILLARY_ALL_TEETH.find(
        (tn) => getToothProductCard("maxillary", tn) === activeProductCardId && !!getToothProduct("maxillary", tn)
      );
      const resolvedProduct =
        (assignedTooth ? getToothProduct("maxillary", assignedTooth) : null) ??
        getToothProduct("maxillary", -activeAp.id) ??
        activeAp.product ??
        null;
      if (resolvedProduct) return !hasRetentionOptions(resolvedProduct);
      return !hasRetentionOptions(activeAp.product);
    }
    if (activeFixedGroupProductId !== null) return false;
    const card0Tn = MAXILLARY_ALL_TEETH.find(tn => getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0) ?? -1;
    const resolvedProduct = getToothProduct("maxillary", card0Tn);
    if (resolvedProduct) return !hasRetentionOptions(resolvedProduct);
    return !!activeProductIsRemovables;
  })();

  /** Bind chart mode to the active card (not merely "any removable on arch"). */
  const useRemovableToothChartPath =
    isActiveMaxillaryNonRetention &&
    !(activeProductCardId === 0 && activeFixedGroupProductId !== null);

  const maxillaryCard0IsRemovable =
    maxillaryHasRemovablesCard0 && (initialProductIsRemovable || activeProductIsRemovables);

  const maxillaryArchHasRemovables = useMemo(
    () =>
      archHasRemovableProducts("maxillary", {
        card0IsRemovable: maxillaryCard0IsRemovable,
        addedProducts,
      }),
    [maxillaryCard0IsRemovable, addedProducts]
  );

  const maxillaryMergedExtractions = useMemo(() => {
    const sources = collectArchRemovableProductSources(
      "maxillary",
      MAXILLARY_ALL_TEETH,
      addedProducts,
      getToothProduct,
      getToothProductCard,
      maxillaryCard0IsRemovable,
      card0Extractions
    );
    return mergeArchRemovableExtractions(sources);
  }, [
    maxillaryCard0IsRemovable,
    addedProducts,
    getToothProduct,
    getToothProductCard,
    card0Extractions,
  ]);

  const maxillaryRemovableProductCount = useMemo(() => {
    let count = maxillaryCard0IsRemovable ? 1 : 0;
    count += addedProducts.filter(
      (ap) => ap.arch === "maxillary" && ap.product && !hasRetentionOptions(ap.product)
    ).length;
    return count;
  }, [maxillaryCard0IsRemovable, addedProducts]);

  /** Per-product extractions/status when multiple products share one arch (incl. fixed + removable). */
  const useMaxillaryArchSharedRemovable = false;

  useEffect(() => {
    if (caseSubmitted || !card0SkipsLegacyDefaults) return;
    setExtractionsSetupComplete(0, true);
    setFixedRetentionSetupComplete(true);
    if (useMaxillaryArchSharedRemovable) {
      setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, true);
    }
  }, [
    caseSubmitted,
    card0SkipsLegacyDefaults,
    useMaxillaryArchSharedRemovable,
    setExtractionsSetupComplete,
    setFixedRetentionSetupComplete,
  ]);

  const maxillaryFixedCard0GroupCount = useMemo(
    () =>
      maxillaryHasFixedCard0
        ? countFixedCard0Groups(
            "maxillary",
            maxillaryRetentionTypes as Record<string, string[]>,
            getToothProductCard,
            getToothProduct
          )
        : 0,
    [maxillaryHasFixedCard0, maxillaryRetentionTypes, getToothProductCard, getToothProduct]
  );

  const allowAccordionCollapse = archAllowsAccordionCollapse("maxillary", addedProducts, {
    hasRemovablesCard0: maxillaryHasRemovablesCard0,
    fixedCard0GroupCount: maxillaryFixedCard0GroupCount,
  });

  const isCardAccordionExpanded = useCallback(
    (slotId: string) => !allowAccordionCollapse || isAccordionExpanded(slotId),
    [allowAccordionCollapse, isAccordionExpanded]
  );

  const isCardAccordionInteractionEnabled = useCallback(
    (slotId: string) => !allowAccordionCollapse || isAccordionEnabled(slotId),
    [allowAccordionCollapse, isAccordionEnabled]
  );

  /** Expanded accordion that owns chart + tooth-status box interactions. */
  const isCardActiveForToothStatus = (cardId: number) => {
    if (activeProductCardId !== cardId) return false;
    if (cardId === 0) {
      if (maxillaryHasFixedCard0 && !maxillaryHasRemovablesCard0) return true;
      return isCardAccordionExpanded("removable0");
    }
    return isCardAccordionExpanded(addedProductSlotId(cardId));
  };

  const handleAddedRemovableAccordionToggle = (ap: AddedProduct) => {
    if (!allowAccordionCollapse) return;
    const slotId = addedProductSlotId(ap.id);
    if (!isAccordionEnabled(slotId)) return;
    if (!isAccordionExpanded(slotId)) {
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
    if (!isAccordionExpanded(slotId)) {
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

  const maxillaryArchExtractionsReady = isExtractionsSetupComplete(
    maxillaryMergedExtractions,
    ARCH_SHARED_REMOVABLE_ACK_CARD_ID,
    caseSubmitted
  );

  const isActiveMaxillaryProductDetailPending =
    (activeProductCardId === 0 && initialProductDetailsPending) ||
    (useRemovableToothChartPath &&
      isArchRemovableProductDetailPending(
        "maxillary",
        MAXILLARY_ALL_TEETH,
        MAXILLARY_PRODUCT_SENTINEL,
        activeProductCardId,
        addedProducts,
        getToothProduct,
        getToothProductCard,
        isProductLoading
      ));

  useEffect(() => {
    if (!isActiveMaxillaryProductDetailPending) return;
    setActiveExtractionCode(null);
    setToothStatusPopoverTooth(null);
    setToothStatusPopoverExtractions([]);
    if (retentionPopoverState.arch === "maxillary") {
      setRetentionPopoverState({ arch: null, toothNumber: null });
    }
  }, [
    isActiveMaxillaryProductDetailPending,
    retentionPopoverState.arch,
    setRetentionPopoverState,
  ]);

  const activeCardMaxillaryTeeth = (() => {
    if (activeProductCardId !== 0) {
      // Check if the active added card is a removable product
      const activeAp = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary");
      if (activeAp) {
        if (isNonRetentionCategory(activeAp.product)) {
          return maxillaryTeeth.filter(tn => getToothProductCard("maxillary", tn) === activeProductCardId);
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

  // ── Splint (auto from retention types + manual overlay) + Wing retainers ──
  // Splint links are the lower tooth number of a connected adjacent pair (e.g. `6`
  // connects 6 & 7), scoped per product instance. Auto links (Rule S1) are derived
  // from retention types; the user's manual add/remove edits are kept as an overlay
  // and combined per SPLINT_RECOMPUTE_MODE.
  const splintKeyForMaxillaryTooth = useCallback(
    (tooth: number): string => {
      const card = getToothProductCard("maxillary", tooth);
      if (card !== 0) return `card:${card}`;
      const pid = getToothProduct("maxillary", tooth)?.id;
      return pid != null ? `fixed:${pid}` : "card0";
    },
    [getToothProductCard, getToothProduct]
  );
  // A tooth counts as "assigned" for splint/wing purposes once it has a retention
  // type chosen (fixed) or a tooth status assigned (removable) — not on mere click.
  const isMaxillaryToothAssigned = (tn: number): boolean => {
    const rt = maxillaryRetentionTypes[tn];
    if (rt && rt.length > 0) return true;
    const code = maxillaryToothExtractionMap[tn];
    return !!code && code !== "TIM";
  };
  // Auto-splint links (Rule S1) per product key, derived from retention types.
  // Only for products flagged `is_splinted === "Yes"` — if a product is not splintable,
  // no auto-splint (and no connector) even when the pontic+abutment rule would match.
  const autoSplintLinksByKey = useMemo(() => {
    const teethByKey: Record<string, number[]> = {};
    for (const tn of maxillaryTeeth) {
      if (!(maxillaryRetentionTypes[tn]?.length)) continue;
      const key = splintKeyForMaxillaryTooth(tn);
      (teethByKey[key] ??= []).push(tn);
    }
    const byKey: Record<string, number[]> = {};
    for (const [key, teeth] of Object.entries(teethByKey)) {
      const isSplinted = getToothProduct("maxillary", teeth[0])?.is_splinted === "Yes";
      byKey[key] = isSplinted ? deriveAutoSplintLinks(teeth, maxillaryRetentionTypes) : [];
    }
    return byKey;
  }, [maxillaryTeeth, maxillaryRetentionTypes, splintKeyForMaxillaryTooth, getToothProduct]);
  // Manual overlay: user adds/removes on top of the auto links, kept per product key.
  const [splintOverlayByKey, setSplintOverlayByKey] = useState<Record<string, SplintOverlay>>({});
  // Effective links = auto combined with the manual overlay (per recompute mode).
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
  const maxillarySplintSummaryFor = useCallback(
    (teeth: number[]): string => {
      if (teeth.length === 0) return "";
      const key = splintKeyForMaxillaryTooth(teeth[0]);
      return formatSplintGroups(teeth, effectiveSplintLinksByKey[key] ?? []);
    },
    [splintKeyForMaxillaryTooth, effectiveSplintLinksByKey]
  );
  const activeMaxillaryProduct = (() => {
    const rep = activeCardMaxillaryTeeth[0];
    if (rep != null) {
      const p = getToothProduct("maxillary", rep);
      if (p) return p;
    }
    if (activeProductCardId !== 0) {
      return (
        getToothProduct("maxillary", -activeProductCardId) ??
        addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "maxillary")?.product ??
        null
      );
    }
    return null;
  })();
  const activeMaxillaryProductIsSplinted = activeMaxillaryProduct?.is_splinted === "Yes";
  // Combined popover (Q2): when the active product also has extractions, offer its
  // extraction statuses alongside retention types. Excludes the default "teeth in mouth".
  const maxillaryRetentionExtractionOptions = useMemo<ExtractionStatusOption[] | undefined>(() => {
    if (activeMaxillaryProduct?.has_extraction !== "Yes") return undefined;
    const opts = (activeMaxillaryProduct.extractions ?? [])
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
  }, [activeMaxillaryProduct]);
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
          maxillaryToothExtractionMap,
          maxillaryClaspTeeth,
          MAXILLARY_ALL_TEETH
        )}
        allArchTeeth={MAXILLARY_ALL_TEETH}
        toothExtractionMap={maxillaryToothExtractionMap}
        claspTeeth={maxillaryClaspTeeth}
        activeExtractionCode={activeExtractionCode}
        onActiveExtractionChange={(code, exts) => {
          setActiveExtractionCode(code);
          setActiveExtractions(exts ?? extractions);
          if (code !== null) setIsSelectionModeActive(true);
        }}
        onToothExtractionToggle={(tn, code, exts) =>
          handleToothExtractionToggle("maxillary", tn, code, exts ?? extractions)
        }
        onSelectAllTeeth={() => {}}
        submitted={caseSubmitted}
        hideDefaultBox={true}
        skipDefaultAutoSelect={true}
        disableRequiredValidation={true}
        grayed={isActiveMaxillaryProductDetailPending}
      />
    );
  };
  const handleToggleMaxillarySplint = useCallback(
    (lower: number) => {
      const key = splintKeyForMaxillaryTooth(lower);
      const auto = autoSplintLinksByKey[key] ?? [];
      setSplintOverlayByKey((prev) => ({
        ...prev,
        [key]: toggleSplintOverlay(prev[key], auto, lower),
      }));
    },
    [splintKeyForMaxillaryTooth, autoSplintLinksByKey]
  );
  // Drop overlay edits once either tooth of the pair is deselected or reassigned to a
  // different product — so manual edits never resurrect on re-select or leak on submit.
  const maxillaryAssignmentSig = maxillaryTeeth
    .map((tn) => `${tn}:${getToothProduct("maxillary", tn)?.id ?? ""}`)
    .join(",");
  useEffect(() => {
    setSplintOverlayByKey((prev) => {
      let changed = false;
      const next: Record<string, SplintOverlay> = {};
      for (const [key, ov] of Object.entries(prev)) {
        const validPair = (lower: number): boolean => {
          if (!maxillaryTeeth.includes(lower) || !maxillaryTeeth.includes(lower + 1)) return false;
          const pa = getToothProduct("maxillary", lower)?.id;
          const pb = getToothProduct("maxillary", lower + 1)?.id;
          if (pa == null || pa !== pb) return false;
          return splintKeyForMaxillaryTooth(lower) === key;
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
  }, [maxillaryAssignmentSig]);

  const maxillaryDefaultChartProduct = useMemo(
    () =>
      resolveSlipDefaultChartProduct({
        arch: "maxillary",
        activeProduct: activeMaxillaryProduct as Record<string, unknown> | null,
        card0InitialProduct: card0InitialProduct as Record<string, unknown> | null,
        slipInitialArch,
        isOpposingMirrorPanel: !!opposingProductData,
      }),
    [activeMaxillaryProduct, card0InitialProduct, slipInitialArch, opposingProductData],
  );

  const maxillarySlipSvgDisplay = useMemo(
    () =>
      mergeProductDefaultToothChartForSlipSvgDisplay({
        product: maxillaryDefaultChartProduct,
        arch: "maxillary",
        userToothExtractionMap: opposingProductData
          ? opposingToothExtractionMap
          : maxillaryToothExtractionMap,
        userClaspTeeth: opposingProductData ? opposingClaspTeeth : maxillaryClaspTeeth,
        userRetentionTypesByTooth: maxillaryRetentionTypes,
      }),
    [
      maxillaryDefaultChartProduct,
      opposingProductData,
      opposingToothExtractionMap,
      maxillaryToothExtractionMap,
      opposingClaspTeeth,
      maxillaryClaspTeeth,
      maxillaryRetentionTypes,
    ],
  );

  const activeMaxillarySvgState = {
    toothExtractionMap: maxillarySlipSvgDisplay.toothExtractionMap,
    toothStatusByTooth: opposingProductData
      ? opposingToothExtractionMap
      : maxillaryToothExtractionMap,
    claspTeeth: maxillarySlipSvgDisplay.claspTeeth,
    retentionTypesByTooth: maxillarySlipSvgDisplay.retentionTypesByTooth,
    willExtractTeeth: [] as number[],
  };
  const useScopedRetentionMode = shouldUseScopedRetentionMode({
    activeProductCardId,
    activeProductIsRemovables,
    activeFixedGroupProductId,
  });

  const ownArchToothChartEnabled =
    !allowAccordionCollapse ||
    isOwnArchToothChartEnabled("maxillary", activeAccordionKey) ||
    forceOwnArchChartEnabled;
  const opposingToothChartEnabled = !!opposingProductData;
  const toothChartInteractionEnabled = ownArchToothChartEnabled || opposingToothChartEnabled;

  // Splint UI (auto S1 + manual S2) is only available for products flagged splintable.
  // When `is_splinted` is "No", no connector or auto-splint shows even if rules match.
  const maxillarySplintEnabled =
    activeMaxillaryProductIsSplinted &&
    ownArchToothChartEnabled &&
    !caseSubmitted &&
    !opposingProductData &&
    activeCardMaxillaryTeeth.length >= 2;
  // Eligible gaps: adjacent (consecutive) teeth that belong to the same product and
  // are both fully assigned (retention/status selected).
  const maxillarySplintableLinks = (() => {
    if (!maxillarySplintEnabled) return [] as number[];
    const sorted = [...activeCardMaxillaryTeeth].sort((a, b) => a - b);
    const out: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] !== sorted[i] + 1) continue;
      if (!isMaxillaryToothAssigned(sorted[i]) || !isMaxillaryToothAssigned(sorted[i + 1])) continue;
      const pa = getToothProduct("maxillary", sorted[i])?.id;
      const pb = getToothProduct("maxillary", sorted[i + 1])?.id;
      if (pa != null && pa === pb) out.push(sorted[i]);
    }
    return out;
  })();
  // Effective splinted gaps across ALL selected teeth on this arch (auto + manual).
  // Computed over the whole arch so existing splints stay visible when the accordion
  // is collapsed OR the other arch is active.
  const maxillarySplintedLinks = useMemo(() => {
    const out: number[] = [];
    for (const links of Object.values(effectiveSplintLinksByKey)) out.push(...links);
    return [...new Set(out)].sort((a, b) => a - b);
  }, [effectiveSplintLinksByKey]);
  // Wing retainers: empty arch neighbors of any pontic (Maryland / cantilever).
  const maxillaryWingTeeth = useMemo(
    () => deriveWingTeeth(maxillaryRetentionTypes, MAXILLARY_ALL_TEETH),
    [maxillaryRetentionTypes]
  );
  // Pontic is offered only once the tooth's product already has an abutment tooth
  // (Prep/Implant) other than this one — a pontic needs support first.
  const canSelectMaxillaryPontic = useCallback(
    (toothNumber: number): boolean => {
      const card = getToothProductCard("maxillary", toothNumber);
      const productId = getToothProduct("maxillary", toothNumber)?.id;
      return MAXILLARY_ALL_TEETH.some((tn) => {
        if (tn === toothNumber) return false;
        if (getToothProductCard("maxillary", tn) !== card) return false;
        const pid = getToothProduct("maxillary", tn)?.id;
        if (productId != null && pid != null && pid !== productId) return false;
        const types = maxillaryRetentionTypes[tn] ?? [];
        return types.includes("Prep") || types.includes("Implant");
      });
    },
    [getToothProductCard, getToothProduct, maxillaryRetentionTypes]
  );

  const activeMaxillaryRetentionOptions = (() => {
    if (activeProductCardId !== 0) {
      const activeAp = addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === "maxillary");
      const assignedTooth = MAXILLARY_ALL_TEETH.find(
        (tn) => getToothProductCard("maxillary", tn) === activeProductCardId && !!getToothProduct("maxillary", tn)
      );
      return (
        (assignedTooth ? getToothProduct("maxillary", assignedTooth)?.retention_options : undefined) ??
        (activeAp ? getToothProduct("maxillary", -activeAp.id)?.retention_options : undefined) ??
        activeAp?.product?.retention_options ??
        []
      );
    }

    if (activeFixedGroupProductId !== null) {
      const groupedTooth = MAXILLARY_ALL_TEETH.find(
        (tn) =>
          getToothProductCard("maxillary", tn) === 0 &&
          getToothProduct("maxillary", tn)?.id === activeFixedGroupProductId
      );
      return groupedTooth ? (getToothProduct("maxillary", groupedTooth)?.retention_options ?? []) : [];
    }

    const card0Tooth = MAXILLARY_ALL_TEETH.find(
      (tn) => getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0
    );
    return card0Tooth
      ? (getToothProduct("maxillary", card0Tooth)?.retention_options ?? retentionOptions ?? [])
      : (retentionOptions ?? []);
  })();

  // Tooth-selection hint descriptor for the maxillary chart. Computed once here so the
  // same logic can render the "replace"/"flipper"/"count" hints above the tooth chart
  // while the "reference" hint is rendered lower down, just above the product card.
  const maxillaryToothHint: { kind: "replace" | "reference" | "flipper" | "count"; text: string; className: string } | null = (() => {
    if (!showMaxillary) return null;
    if (activeProductSkipsChartSetup) return null;
    if (activeProductIsRemovables) {
      const activeExtractions = activeProductCardId !== 0
        ? addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.extractions
        : (() => {
          const t = MAXILLARY_ALL_TEETH.find(tn => getToothProductCard("maxillary", tn) === 0);
          return t ? getToothProduct("maxillary", t)?.extractions : undefined;
        })();
      if (isFullDentureProduct(activeExtractions)) return null;
      const hintExtractions = (
        useMaxillaryArchSharedRemovable
          ? maxillaryMergedExtractions
          : ((activeExtractions?.length ? activeExtractions : card0Extractions) as ProductExtraction[])
      );
      if (!hasConfiguredExtractions(hintExtractions)) return null;
      const hintAckCardId = useMaxillaryArchSharedRemovable
        ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID
        : activeProductCardId !== 0 ? activeProductCardId : 0;
      const baseProductName = activeProductCardId !== 0
        ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.name ?? "")
        : (() => {
            const t = MAXILLARY_ALL_TEETH.find(tn => getToothProductCard("maxillary", tn) === 0);
            return t ? (getToothProduct("maxillary", t)?.name ?? "") : "";
          })();
      if (
        isFlipperOrStayplateProduct(baseProductName) &&
        isRemovableToothStatusPopoverEligible(hintExtractions, activeExtractionCode) &&
        isRemovableToothSelectionFocused({
          caseSubmitted, activeProductCardId, confirmDetailsChecked,
          isCardActive: isCardActiveForToothStatus(activeProductCardId),
          toothChartInteractionEnabled, teethCount: MAXILLARY_ALL_TEETH.filter(tn => getToothProductCard("maxillary", tn) === activeProductCardId).length,
          isSelectionModeActive,
        })
      ) {
        if (requiresExtractionsAcknowledgement(hintExtractions) && isExtractionsSetupComplete(hintExtractions, hintAckCardId, caseSubmitted)) {
          return null;
        }
        return { kind: "flipper", text: FLIPPER_STAYPLATE_SELECTION_HINT, className: "text-center font-bold text-sm mb-1 text-red-600" };
      }
      if (activeExtractionCode === null) {
        return { kind: "replace", text: `Select teeth to replace${baseProductName ? ` ${baseProductName}` : ""}`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
      }
      return { kind: "reference", text: `Select teeth for reference (not added to ${baseProductName || "product"})`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
    }
    if (opposingProductData && !useScopedRetentionMode) {
      const opposingName = opposingProductData.name ?? "product";
      // Opposing-only arch (no product of its own) — don't prompt "Select teeth to replace";
      // these teeth are reference/opposing only.
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
      const fixedProductName = (activeProductCardId !== 0
        ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.name ?? "")
        : (() => { const t = MAXILLARY_ALL_TEETH.find(tn => getToothProductCard("maxillary", tn) === 0 && (activeFixedGroupProductId === null || getToothProduct("maxillary", tn)?.id === activeFixedGroupProductId)); return t ? (getToothProduct("maxillary", t)?.name ?? "") : ""; })())
        || initialProductName || "";
      return { kind: "replace", text: `Select teeth to replace${fixedProductName ? ` with ${fixedProductName}` : ""}`, className: "text-center font-bold text-sm mb-1 text-orange-500 uppercase" };
    }
    const checkedCount = maxillaryCheckedTeeth.length;
    const activeProductName = activeProductCardId !== 0
      ? addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.name || ""
      : getToothProduct("maxillary", maxillaryTeeth[0])?.name || "";
    return checkedCount > 0
      ? { kind: "count", text: `${checkedCount} ${checkedCount === 1 ? "TOOTH" : "TEETH"} to include in ${activeProductName}`, className: "text-center text-orange-500 font-bold text-sm mb-1" }
      : null;
  })();

  return (
    <div className={`flex-1 min-w-0 px-0 order-1 lg:order-none relative`}>
      {/* Eye toggle hidden — restore by removing false && wrapper */}
      <div className="relative">
        {false && (
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
        )}
        {showMaxillary && (
          <div>
            {/* Non-reference tooth-selection hints render above the chart.
                The "reference" hint is rendered below the chart, just above the product card. */}
            {maxillaryToothHint && maxillaryToothHint.kind !== "reference" && (
              <p className={maxillaryToothHint.className}>{maxillaryToothHint.text}</p>
            )}
            {(() => {
              const currentExtractions = activeProductCardId !== 0
                ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.extractions ?? [])
                : card0Extractions;
              const isSingleDefault = activeProductIsRemovables && isSingleDefaultOnlyExtractionList(currentExtractions);
              return (
                <MaxillaryTeethSVG
                  selectedTeeth={activeCardMaxillaryTeeth}
                  willExtractTeeth={[]}
                  missingTeeth={[]}
                  splintEnabled={maxillarySplintEnabled}
                  splintableLinks={maxillarySplintableLinks}
                  splintedLinks={maxillarySplintedLinks}
                  onToggleSplintLink={handleToggleMaxillarySplint}
                  wingTeeth={maxillaryWingTeeth}
                  canSelectPontic={canSelectMaxillaryPontic}
                  retentionPopoverExtractionOptions={maxillaryRetentionExtractionOptions}
                  onSelectExtractionStatus={(toothNumber, code) => {
                    // Mutual exclusivity (Q1): selecting an extraction status clears
                    // any retention type on this tooth, then sets the status.
                    const current = maxillaryRetentionTypes[toothNumber];
                    if (current && current.length > 0) {
                      handleSelectRetentionType("maxillary", toothNumber, current[0]);
                    }
                    handleToothExtractionToggle(
                      "maxillary",
                      toothNumber,
                      code,
                      activeMaxillaryProduct?.extractions
                    );
                    setRetentionPopoverState({ arch: null, toothNumber: null });
                  }}
                  onToothClick={(toothNumber: number) => {
                    if (!toothChartInteractionEnabled) {
                      return;
                    }

                    // When a non-retention (removable/ortho) card is active, show tooth status popover.
                    if (useRemovableToothChartPath) {
                      if (!ownArchToothChartEnabled) {
                        return;
                      }
                      if (!isCardActiveForToothStatus(activeProductCardId)) {
                        return;
                      }
                      // If the user has clicked Done (acknowledged), reset Done state so they
                      // can continue editing — the click proceeds normally and Done reappears.
                      const currentAckExtractions = activeProductCardId !== 0
                        ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.extractions ?? [])
                        : card0Extractions;
                      const ackCardId = useMaxillaryArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : activeProductCardId;
                      if (isExtractionsSetupComplete(currentAckExtractions, ackCardId, caseSubmitted)) {
                        setExtractionsSetupComplete(ackCardId, false);
                        setIsSelectionModeActive(true);
                      }
                      // Rule 1: active box selected → assign directly, skip popover
                      if (activeExtractionCode) {
                        const activeExt = activeExtractions.find((e) => e.code === activeExtractionCode);
                        if (
                          isOverlayExtractionCode(activeExtractionCode, activeExtractions) &&
                          !toothHasTimBaseExtraction(toothNumber, maxillaryToothExtractionMap, activeExtractions)
                        ) {
                          return;
                        }
                        const maxTeeth = activeExt?.max_teeth && activeExt.max_teeth > 0 ? activeExt.max_teeth : null;
                        const currentCount = Object.values(maxillaryToothExtractionMap).filter((c) => c === activeExtractionCode).length;
                        const alreadyAssigned = maxillaryToothExtractionMap[toothNumber] === activeExtractionCode;
                        if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) return;
                        if (alreadyAssigned) {
                          // Already has this status — open popover; removal only via popover Remove.
                        } else {
                        if (
                          !maxillaryTeeth.includes(toothNumber) &&
                          shouldAddToProductSelectionOnRemovableClick({
                            activeProductIsRemovables: true,
                            activeExtractionCode,
                          })
                        ) {
                          handleMaxillaryToothClick(toothNumber);
                        }
                        handleToothExtractionToggle("maxillary", toothNumber, activeExtractionCode, activeExtractions);
                        // Ensure tooth is NOT in the no-active-box set when assigned via active box
                        setMaxillaryNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                        return;
                        }
                      }
                      // Rule 2: open tooth status popover (also when tooth already has the active status)
                      const exts = resolveRemovablePopoverExtractionsForActiveCard({
                        useArchSharedRemovable: useMaxillaryArchSharedRemovable,
                        mergedExtractions: maxillaryMergedExtractions,
                        activeProductCardId,
                        addedProducts,
                        arch: "maxillary",
                        allArchTeeth: MAXILLARY_ALL_TEETH,
                        getToothProduct,
                        getToothProductCard,
                        card0Extractions,
                      });
                      if (isSingleDefaultOnlyExtractionList(exts)) return;
                      if (!hasConfiguredExtractions(exts)) return;
                      if (canUseToothForActiveProduct && !canUseToothForActiveProduct("maxillary", toothNumber)) {
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
                          !canUseToothForActiveProduct("maxillary", toothNumber)
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
                        !toothHasTimBaseExtraction(toothNumber, maxillaryToothExtractionMap, activeExtractions)
                      ) {
                        return;
                      }
                      const activeExt = activeExtractions.find((e) => e.code === activeExtractionCode);
                      const maxTeeth = activeExt?.max_teeth && activeExt.max_teeth > 0 ? activeExt.max_teeth : null;
                      const currentCount = Object.values(maxillaryToothExtractionMap).filter((c) => c === activeExtractionCode).length;
                      const alreadyAssigned = maxillaryToothExtractionMap[toothNumber] === activeExtractionCode;
                      if (maxTeeth !== null && currentCount >= maxTeeth && !alreadyAssigned) {
                        return;
                      }
                      if (alreadyAssigned) {
                        // Already has this status — open the combined popover; removal only via popover.
                        setRetentionPopoverState({ arch: "maxillary", toothNumber });
                        return;
                      }
                      // Mutual exclusivity: assigning a status clears any retention type on this tooth.
                      const currentRetention = maxillaryRetentionTypes[toothNumber];
                      if (currentRetention && currentRetention.length > 0) {
                        handleSelectRetentionType("maxillary", toothNumber, currentRetention[0]);
                      }
                      if (!maxillaryTeeth.includes(toothNumber)) {
                        handleMaxillaryToothClick(toothNumber);
                      }
                      handleToothExtractionToggle("maxillary", toothNumber, activeExtractionCode, activeExtractions);
                      setMaxillaryNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                      // The tooth-select above may open the retention popover — keep it closed while assigning.
                      setRetentionPopoverState({ arch: null, toothNumber: null });
                    } else if (ownArchToothChartEnabled) {
                      if (
                        (activeProductCardId !== 0 || activeFixedGroupProductId !== null) &&
                        !isCardActiveForToothStatus(activeProductCardId)
                      ) {
                        return;
                      }
                      handleMaxillaryToothClick(toothNumber);
                    }
                  }}
                  disabled={
                    isAnyModalOpen ||
                    !!panelGumShadePicker ||
                    (shadeSelectionState.arch === "maxillary" && shadeSelectionState.fieldType !== null) ||
                    isSingleDefault ||
                    isActiveMaxillaryProductDetailPending ||
                    !toothChartInteractionEnabled
                  }
                  className="w-full"
                  retentionTypesByTooth={activeMaxillarySvgState.retentionTypesByTooth}
                  showRetentionPopover={
                    !isActiveMaxillaryProductDetailPending &&
                    retentionPopoverState.arch === "maxillary" &&
                    !useRemovableToothChartPath &&
                    toothStatusPopoverTooth === null &&
                    (!opposingProductData || useScopedRetentionMode)
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
                  retentionOptions={activeMaxillaryRetentionOptions}
                  getRetentionOptionsForTooth={(toothNumber) =>
                    getToothProduct("maxillary", toothNumber)?.retention_options ??
                    (maxillaryDefaultChartProduct as ProductApiData | null)?.retention_options ??
                    activeMaxillaryRetentionOptions
                  }
                  toothExtractionMap={activeMaxillarySvgState.toothExtractionMap}
                  hideSelectionIndicators={
                    isActiveMaxillaryProductDetailPending ||
                    (!!opposingProductData && activeProductCardId === 0) ||
                    useRemovableToothChartPath
                  }
                  showCheckboxes={false}
                  onCheckedTeethChange={handleMaxillaryCheckedTeethChange}
                  claspTeeth={activeMaxillarySvgState.claspTeeth}
                  getAddonValue={(toothNumber) => getFieldValue("maxillary", toothNumber, "addons")}
                  showToothStatusPopover={
                    !isActiveMaxillaryProductDetailPending &&
                    (useRemovableToothChartPath || (!!opposingProductData && activeProductCardId === 0)) &&
                    toothStatusPopoverTooth !== null
                  }
                  toothStatusPopoverTooth={toothStatusPopoverTooth}
                  toothStatusByTooth={activeMaxillarySvgState.toothStatusByTooth}
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
                    // Collect all extractions from every source so the SVG can classify any tooth
                    const allExts: ProductExtraction[] = [];
                    const defaultChartExts = (maxillaryDefaultChartProduct as ProductApiData | null)?.extractions;
                    if (defaultChartExts?.length) allExts.push(...defaultChartExts);
                    for (const tn of MAXILLARY_ALL_TEETH) {
                      const p = getToothProduct("maxillary", tn);
                      if (p?.extractions) allExts.push(...p.extractions);
                    }
                    for (const ap of addedProducts) {
                      if (ap.arch === "maxillary" && (ap.product as any)?.extractions) {
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
                    // Build image map from all extractions that have per-tooth images
                    const allExts: ProductExtraction[] = [];
                    const defaultChartExts = (maxillaryDefaultChartProduct as ProductApiData | null)?.extractions;
                    if (defaultChartExts?.length) allExts.push(...defaultChartExts);
                    for (const tn of MAXILLARY_ALL_TEETH) {
                      const p = getToothProduct("maxillary", tn);
                      if (p?.extractions) allExts.push(...p.extractions);
                    }
                    for (const ap of addedProducts) {
                      if (ap.arch === "maxillary" && (ap.product as any)?.extractions) {
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
                      const activeCard = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary");
                      return activeCard?.product?.name ?? null;
                    }
                    // Card 0 — get from first assigned tooth's product
                    const card0Teeth = MAXILLARY_ALL_TEETH.filter(tn =>
                      getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0
                    );
                    return card0Teeth.length > 0 ? (getToothProduct("maxillary", card0Teeth[0])?.name ?? null) : null;
                  })()}
                  toothStatusProductImageUrl={(() => {
                    if (opposingProductData) return opposingProductData.image_url ?? null;
                    if (activeProductCardId !== 0) {
                      const activeCard = addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary");
                      return activeCard?.product?.image_url ?? null;
                    }
                    const card0Teeth = MAXILLARY_ALL_TEETH.filter(tn =>
                      getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0
                    );
                    return card0Teeth.length > 0 ? (getToothProduct("maxillary", card0Teeth[0])?.image_url ?? null) : null;
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
                        selectAllOpposingTeeth?.([toothNumber]);
                      }
                      if (!isOverlayExtractionCode(code, opposingMappedExtractions)) {
                        setOpposingNoActiveBoxTeeth?.((prev) =>
                          prev.includes(toothNumber) ? prev : [...prev, toothNumber]
                        );
                      }
                      setToothStatusPopoverTooth(null);
                      return;
                    }
                    const popoverMap = opposingProductData && !addedRemovableActive
                      ? opposingToothExtractionMap
                      : maxillaryToothExtractionMap;
                    if (
                      isOverlayExtractionCode(code, toothStatusPopoverExtractions) &&
                      !toothHasTimBaseExtraction(toothNumber, popoverMap, toothStatusPopoverExtractions)
                    ) {
                      setToothStatusPopoverTooth(null);
                      return;
                    }
                    selectAllMaxillaryTeeth([toothNumber]);
                    if (
                      shouldApplyExtractionOnPopoverSelect(
                        maxillaryToothExtractionMap[toothNumber],
                        code
                      )
                    ) {
                      handleToothExtractionToggle("maxillary", toothNumber, code, toothStatusPopoverExtractions);
                    }
                    if (!isOverlayExtractionCode(code, toothStatusPopoverExtractions)) {
                      setMaxillaryNoActiveBoxTeeth?.((prev) =>
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
                    const currentCode = maxillaryToothExtractionMap[toothNumber];
                    if (currentCode) {
                      handleToothExtractionToggle("maxillary", toothNumber, currentCode, toothStatusPopoverExtractions);
                    }
                    if (maxillaryTeeth.includes(toothNumber)) {
                      handleMaxillaryToothDeselect(toothNumber);
                    }
                    setMaxillaryNoActiveBoxTeeth?.((prev) => prev.filter((t) => t !== toothNumber));
                    setToothStatusPopoverTooth(null);
                  }}
                  toothHoverTooltip={
                    activeProductIsRemovables && isCardActiveForToothStatus(activeProductCardId)
                      ? activeExtractionCode
                        ? `Click tooth to mark as ${toothStatusPopoverExtractions.find(e => e.code === activeExtractionCode)?.name ?? activeExtractionCode}`
                        : `Click a tooth to add it to ${
                            activeProductCardId !== 0
                              ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.name ?? "the product")
                              : ((() => { const t = MAXILLARY_ALL_TEETH.find(tn => getToothProductCard("maxillary", tn) === 0); return t ? (getToothProduct("maxillary", t)?.name ?? "the product") : "the product"; })())
                          }`
                      : !useRemovableToothChartPath &&
                        ownArchToothChartEnabled &&
                        (!opposingProductData || useScopedRetentionMode) &&
                        isCardActiveForToothStatus(activeProductCardId)
                        ? `Click a tooth to add it to ${
                            activeProductCardId !== 0
                              ? (addedProducts.find(ap => ap.id === activeProductCardId && ap.arch === "maxillary")?.product?.name ?? "the product")
                              : ((() => { const t = MAXILLARY_ALL_TEETH.find(tn => getToothProductCard("maxillary", tn) === 0 && (activeFixedGroupProductId === null || getToothProduct("maxillary", tn)?.id === activeFixedGroupProductId)); return t ? (getToothProduct("maxillary", t)?.name ?? "the product") : "the product"; })())
                          }`
                        : undefined
                  }
                />
              );
            })()}
          </div>
        )}
      </div>

      {showMaxillary && (
        <>
          {/* Shade Selection Guide - Maxillary */}
          {shadeSelectionState.arch === "maxillary" && (() => {
            const pid = shadeSelectionState.productId ?? "";
            const fixedProductMatch = pid.match(/^fixed_p_(\d+)$/);
            const shadeProduct = fixedProductMatch
              ? (() => {
                  const apiId = Number(fixedProductMatch[1]);
                  for (const tn of MAXILLARY_ALL_TEETH) {
                    const p = getToothProduct("maxillary", tn);
                    if (p?.id === apiId) return p;
                  }
                  return null;
                })()
              : (() => {
                  const tn = parseInt(pid.replace(/^(fixed_|prep_)/, ""), 10);
                  return !isNaN(tn) ? getToothProduct("maxillary", tn) : null;
                })();
            if (
              isFixedProductShadeStorageId(pid) &&
              shouldUseAccordionOnlyFixedShades(shadeProduct?.advance_fields)
            ) {
              return null;
            }
            return (
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
                  completeFieldStep("maxillary", panelGumShadePicker.toothNumber, step, JSON.stringify({ gum_shade_id: shade.gum_shade_id, brand_id: shade.brand.id, name: shade.name }));
                  // Fixed products gate post-shade fields on getSelectedShade(..., "stump_shade"),
                  // so the gum pick must also land in the shade-selection map.
                  if (step === "fixed_stump_shade" && setSelectedShades) {
                    const shadeProduct = getToothProduct("maxillary", panelGumShadePicker.toothNumber);
                    const shadeProductId = resolveFixedShadeProductId(shadeProduct?.id, panelGumShadePicker.toothNumber);
                    setSelectedShades((prev) => ({
                      ...prev,
                      [buildShadeSelectionKey(shadeProductId, "maxillary", "stump_shade")]: shade.name,
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
              .filter(ap => ap.arch === "maxillary")
              .map((ap) => {
                const slotId = `added_${ap.id}`;
                const virtualProduct = getToothProduct("maxillary", -ap.id);
                const initialResolvedProduct = virtualProduct ?? ap.product ?? null;
                const isApRemovables = initialResolvedProduct ? !hasRetentionOptions(initialResolvedProduct) : false;
                const cardTeethSource = isApRemovables ? MAXILLARY_ALL_TEETH : maxillaryTeeth;
                const cardTeeth = cardTeethSource.filter(
                  tn => isApRemovables
                    ? getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === ap.id
                    : getToothProductCard("maxillary", tn) === ap.id
                );
                const rawAssignedTeeth = isApRemovables
                  ? MAXILLARY_ALL_TEETH.filter(tn => getToothProductCard("maxillary", tn) === ap.id).sort((a, b) => a - b)
                  : cardTeeth;
                const cardProduct = resolveAddedCardProductData(
                  "maxillary",
                  ap.id,
                  cardTeeth,
                  getToothProduct,
                  virtualProduct ?? ap.product ?? null
                );
                const apProduct = cardProduct;
                const apProductForStage = resolveProductForStageField(
                  apProduct,
                  "maxillary",
                  getToothProduct
                );
                const assignedTeeth = rawAssignedTeeth;

                const apVariationDisplay = resolveVariationDisplay(apProduct, assignedTeeth.length);
                const cardProductName = apVariationDisplay.name || "Untitled Product";
                // Prefer a matched variation image; otherwise show the upper arch image when configured.
                const cardProductImage = apVariationDisplay.matched
                  ? apVariationDisplay.imageUrl
                  : resolveArchProductImage(apProduct, "maxillary", apVariationDisplay.imageUrl);
                const cardCategoryName = cardProduct?.subcategory?.category?.name || ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
                const cardSubcategoryName = cardProduct?.subcategory?.name || ap.product?.subcategory?.name || ap.product?.subcategory_name || "";
                const removableIsFullDenture = isApRemovables
                  ? isFullDentureProduct(apProduct?.extractions)
                  : false;
                // Orange box: show teeth with no extraction code (TIM/unassigned) OR teeth added via no-active-box path
                const apIsSingleDefaultOnly = isSingleDefaultOnlyExtractionList(apProduct?.extractions);
                const apDisplayTeeth = getRemovableOrangeHeaderTeeth({
                  selectedTeeth: assignedTeeth,
                  toothExtractionMap: maxillaryToothExtractionMap,
                  claspTeeth: maxillaryClaspTeeth,
                  noActiveBoxTeeth: maxillaryNoActiveBoxTeeth,
                  extractions: apProduct?.extractions,
                  isFullDenture: removableIsFullDenture,
                  isSingleDefaultOnly: apIsSingleDefaultOnly,
                });
                const cardToothDisplay = apDisplayTeeth.length > 0 ? `#${apDisplayTeeth.join(",")}` : "";
                const statusBoxSelectedTeeth =
                  apIsSingleDefaultOnly || useMaxillaryArchSharedRemovable
                    ? maxillaryTeeth
                    : resolveRemovableStatusBoxSelectedTeeth({
                        cardTeeth: assignedTeeth,
                        toothExtractionMap: maxillaryToothExtractionMap,
                        claspTeeth: maxillaryClaspTeeth,
                        archTeeth: MAXILLARY_ALL_TEETH,
                      });
                const removableHasVariationMatch =
                  isApRemovables &&
                  !!apProduct &&
                  assignedTeeth.length > 0 &&
                  resolveVariationDisplay(apProduct, assignedTeeth.length).name === cardProductName;
                const removableCardExtractions = (apProduct?.extractions || []).filter((e) => e.status === "Active");
                const isCurrentlyActiveProduct = isCardActiveForToothStatus(ap.id);
                const apRepTn = resolveAddedCardRepTooth(
                  cardTeeth,
                  ap.id,
                  getToothProduct,
                  "maxillary"
                );
                const hasRushedAp = isProductRushed(
                  rushedProducts,
                  "maxillary",
                  ap.id,
                  apRepTn,
                  hasRetentionOptions(apProduct)
                );
                const apStageKey = hasRetentionOptions(apProduct)
                  ? `maxillary_fixed_${apRepTn}`
                  : `maxillary_prep_${apRepTn}`;
                const apStageVal =
                  selectedStages[apStageKey] ||
                  getFieldValue(
                    "maxillary",
                    apRepTn,
                    hasRetentionOptions(apProduct) ? "fixed_stage" : "stage"
                  ) ||
                  "";
                const apStageObj = cardProduct?.stages?.find(s => s.name === apStageVal);
                const apEstDaysText = resolveRemovableEstDaysText(cardProduct, apStageVal);
                const apLabelOnlyHeader =
                  isApRemovables &&
                  !hasConfiguredExtractions(
                    useMaxillaryArchSharedRemovable ? maxillaryMergedExtractions : apProduct?.extractions
                  );
                const apSlotId = addedProductSlotId(ap.id);
                const isExpanded = apLabelOnlyHeader || isCardAccordionExpanded(apSlotId);

                return (
                  <ProductAccordionCard
                    key={ap.id}
                    slotId={slotId}
                    arch="maxillary"
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
                    subcategoryName={cardSubcategoryName}
                    stageName={
                      isDisplayableStageValue(apStageVal) && !shouldSkipStageSelection(apProductForStage)
                        ? apStageVal
                        : undefined
                    }
                    estDaysText={apEstDaysText}
                    hasRush={!!hasRushedAp}
                    canDelete={true}
                    onDelete={() => {
                      const wasFixed = hasRetentionOptions(apProduct);
                      const remainingAdded = addedProducts.filter(p => p.arch === "maxillary").length - 1;
                      const hasCard0 = maxillaryHasFixedCard0 || maxillaryHasRemovablesCard0;
                      MAXILLARY_ALL_TEETH.filter(tn => getToothProductCard("maxillary", tn) === ap.id).forEach(tn => {
                        clearToothProgress("maxillary", tn);
                        handleMaxillaryToothDeselect(tn);
                      });
                      handleRemoveAddedProduct(ap.id);
                      if (wasFixed && remainingAdded === 0 && !hasCard0) onBackToCategories?.("maxillary");
                    }}
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
                            const ackCardId = useMaxillaryArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : ap.id;
                            setExtractionsSetupComplete(ackCardId, false);
                            setActiveProductCardId(ap.id);
                            setIsSelectionModeActive(true);
                            if (!isExpanded) {
                              handleAddedRemovableAccordionToggle(ap);
                            }
                          }}
                          allArchTeethSelected={apDisplayTeeth.length >= MAXILLARY_ALL_TEETH.length}
                          labelOnlyHeader={apLabelOnlyHeader}
                          isProductSelectionActive={activeProductCardId === ap.id && (isSelectionModeActive || activeExtractionCode !== null)}
                          isExtractionActive={activeProductCardId === ap.id && activeExtractionCode !== null}
                          expandEnabled={allowAccordionCollapse && isAccordionEnabled(apSlotId)}
                          productImageUrl={cardProductImage}
                          productName={getRemovableHeaderTitle({
                            productName: cardProductName,
                            hasVariation: apProduct?.has_variation,
                            teethCount: assignedTeeth.length,
                            isFullDenture: removableIsFullDenture,
                            hasVariationMatch: removableHasVariationMatch,
                          })}
                          toothDisplay={cardToothDisplay}
                          splintSummary={maxillarySplintSummaryFor(assignedTeeth)}
                          categoryName={cardCategoryName}
                          subcategoryName={cardSubcategoryName}
                          stageName={
                            isDisplayableStageValue(apStageVal) &&
                            !shouldSkipStageSelection(apProductForStage)
                              ? apStageVal
                              : undefined
                          }
                          stageProduct={apProductForStage}
                          estDaysText={apEstDaysText}
                          canDelete={!caseSubmitted}
                          onDelete={() => {
                            const wasFixed = hasRetentionOptions(apProduct);
                            const remainingAdded =
                              addedProducts.filter((p) => p.arch === "maxillary").length - 1;
                            const hasCard0 = maxillaryHasFixedCard0 || maxillaryHasRemovablesCard0;
                            MAXILLARY_ALL_TEETH.filter(
                              (tn) => getToothProductCard("maxillary", tn) === ap.id
                            ).forEach((tn) => {
                              clearToothProgress("maxillary", tn);
                              handleMaxillaryToothDeselect(tn);
                            });
                            handleRemoveAddedProduct(ap.id);
                            if (wasFixed && remainingAdded === 0 && !hasCard0)
                              onBackToCategories?.("maxillary");
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
                            useMaxillaryArchSharedRemovable
                              ? maxillaryMergedExtractions
                              : removableCardExtractions
                          )}
                          extractionsAcknowledged={
                            useMaxillaryArchSharedRemovable
                              ? maxillaryArchExtractionsReady
                              : isExtractionsSetupComplete(
                                  removableCardExtractions,
                                  ap.id,
                                  caseSubmitted
                                )
                          }
                          onExtractionsAcknowledgedChange={(v) =>
                            useMaxillaryArchSharedRemovable
                              ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                              : setExtractionsSetupComplete(ap.id, v)
                          }
                          middleContent={
                            isCardActiveForToothStatus(ap.id) &&
                            (useMaxillaryArchSharedRemovable
                              ? maxillaryMergedExtractions
                              : removableCardExtractions
                            ).length > 0 &&
                            // Selected teeth, or selection optional (default + optional-only) so
                            // the user can click Done without selecting (e.g. night guard).
                            (maxillaryTeeth.length > 0 ||
                              isExtractionSelectionOptional(
                                useMaxillaryArchSharedRemovable
                                  ? maxillaryMergedExtractions
                                  : removableCardExtractions
                              )) ? (
                              <ToothStatusBoxes
                                extractions={
                                  useMaxillaryArchSharedRemovable
                                    ? maxillaryMergedExtractions
                                    : removableCardExtractions
                                }
                                selectedTeeth={statusBoxSelectedTeeth}
                                allArchTeeth={MAXILLARY_ALL_TEETH}
                                toothExtractionMap={maxillaryToothExtractionMap}
                                claspTeeth={maxillaryClaspTeeth}
                                skipDefaultAutoSelect={shouldSkipLegacyDefaultExtractionAutoSelect(
                                  apProduct as Record<string, unknown> | null,
                                )}
                                displayTeethByCode={getToothStatusBoxDisplayMap({
                                  extractions: useMaxillaryArchSharedRemovable
                                    ? maxillaryMergedExtractions
                                    : removableCardExtractions,
                                  selectedTeeth: statusBoxSelectedTeeth,
                                  toothExtractionMap: maxillaryToothExtractionMap,
                                  claspTeeth: maxillaryClaspTeeth,
                                  excludeTeeth: apDisplayTeeth,
                                })}
                                activeExtractionCode={activeExtractionCode}
                                onActiveExtractionChange={(code, exts) => {
                                  setActiveExtractionCode(code);
                                  if (exts) setActiveExtractions(exts);
                                  else if (useMaxillaryArchSharedRemovable) {
                                    setActiveExtractions(maxillaryMergedExtractions);
                                  }
                                  // Re-activating an extraction box resets Done so the button re-appears
                                  if (code !== null) {
                                    const ackCardId = useMaxillaryArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : ap.id;
                                    setExtractionsSetupComplete(ackCardId, false);
                                    setIsSelectionModeActive(true);
                                  }
                                }}
                                onToothExtractionToggle={(tn, code, extractions) =>
                                  handleToothExtractionToggle(
                                    "maxillary",
                                    tn,
                                    code,
                                    extractions ??
                                      (useMaxillaryArchSharedRemovable
                                        ? maxillaryMergedExtractions
                                        : removableCardExtractions)
                                  )
                                }
                                onSelectAllTeeth={selectAllMaxillaryTeeth}
                                onRequiredValidationChange={onToothStatusValidationChange}
                                isRemovable={true}
                                submitted={caseSubmitted}
                                hideDefaultBox={true}
                                disableRequiredValidation={true}
                                grayed={
                                  isActiveMaxillaryProductDetailPending || apIsSingleDefaultOnly
                                }
                                acknowledged={
                                  useMaxillaryArchSharedRemovable
                                    ? maxillaryArchExtractionsReady
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
                                  useMaxillaryArchSharedRemovable
                                    ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                                    : setExtractionsSetupComplete(ap.id, v);
                                }}
                              />
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
                            const ackCardId = useMaxillaryArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : ap.id;
                            setExtractionsSetupComplete(ackCardId, false);
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
                          splintSummary={maxillarySplintSummaryFor(assignedTeeth)}
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
                              addedProducts.filter((p) => p.arch === "maxillary").length - 1;
                            const hasCard0 = maxillaryHasFixedCard0 || maxillaryHasRemovablesCard0;
                            MAXILLARY_ALL_TEETH.filter(
                              (tn) => getToothProductCard("maxillary", tn) === ap.id
                            ).forEach((tn) => {
                              clearToothProgress("maxillary", tn);
                              handleMaxillaryToothDeselect(tn);
                            });
                            handleRemoveAddedProduct(ap.id);
                            if (remainingAdded === 0 && !hasCard0) onBackToCategories?.("maxillary");
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
                            caseSubmitted
                          )}
                          onRetentionDoneChange={(value) => {
                            setFixedRetentionSetupComplete(value);
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
                    {!isApRemovables && cardTeeth.length === 0 ? (
                      <p className="text-xs text-[#b4b0b0] text-center py-4">
                        Select teeth from the chart above to assign them to this product.
                      </p>
                    ) : (() => {
                      const isCardRemovables = apProduct ? !hasRetentionOptions(apProduct) : isApRemovables;
                      // For removable cards with no teeth yet, use the virtual slot (-ap.id) where product data was pre-fetched
                      const repTn = resolveAddedCardRepTooth(
                        cardTeeth,
                        ap.id,
                        getToothProduct,
                        "maxillary"
                      );
                      const toothProduct =
                        getToothProduct("maxillary", repTn) ?? apProduct;
                      const isFixed = hasRetentionOptions(toothProduct);
                      const isRemovables = toothProduct ? !hasRetentionOptions(toothProduct) : isCardRemovables;
                      const fixedChain = isFixed ? getRetentionFieldChain(toothProduct?.advance_fields, toothProduct) : undefined;
                      const removableChain = isRemovables ? getSelectionFieldChain(toothProduct) : undefined;
                      const advFields = toothProduct?.advance_fields;
                      const isF = (step: string) => {
                        if (step === "impression") {
                          return (
                            toothProduct?.has_impression === "Yes" &&
                            isFieldVisible("maxillary", repTn, step as any, isFixed ? fixedChain : removableChain)
                          );
                        }
                        return (
                          hasAdvanceField(step, advFields, toothProduct ?? undefined) &&
                          isFieldVisible("maxillary", repTn, step as any, isFixed ? fixedChain : removableChain)
                        );
                      };
                      const isFComplete = (step: string) => isFieldCompleted("maxillary", repTn, step as any);
                      const fVal = (step: string) => getFieldValue("maxillary", repTn, step as any);

                      if (isCardRemovables) {
                        const productKey = `maxillary_prep_${repTn}`;
                        const impressionModalProductId = ARCH_IMPRESSION_PRODUCT_ID;
                        const apStageVal = fVal("stage") || selectedStages[productKey] || "";
                        const maxillaryArchTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                        const oppositeMandibularTeeth = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
                        const archGumDonor = findArchProductDonor(
                          "maxillary",
                          toothProduct?.id,
                          getToothProduct,
                          maxillaryArchTeeth
                        );
                        const displayGumShades = resolveGumShadesForDisplay(toothProduct, archGumDonor);
                        const stageProduct = resolveProductForStageField(
                          toothProduct ?? apProduct,
                          "maxillary",
                          getToothProduct
                        );
                        const singleStageSkip = shouldSkipStageSelection(stageProduct);
                        const showArchImpression =
                          toothProduct?.has_impression === "Yes" ||
                          removablesImpressionDone ||
                          archHasActiveImpressionSelections(
                            selectedImpressions,
                            ARCH_IMPRESSION_PRODUCT_ID,
                            "maxillary"
                          );
                        const removableImplantTeeth = getImplantTeethInGroup(
                          cardTeeth,
                          maxillaryRetentionTypes
                        );
                        const removableImplantDetailReady = areAllImplantDetailsComplete(
                          removableImplantTeeth,
                          implantDetailCompleteByTooth
                        );
                        const apShowRemovableFields = useMaxillaryArchSharedRemovable
                          ? maxillaryArchExtractionsReady
                          : isExtractionsSetupComplete(
                              removableCardExtractions,
                              ap.id,
                              caseSubmitted
                            );
                        if (
                          !apShowRemovableFields &&
                          !useMaxillaryArchSharedRemovable &&
                          requiresExtractionsAcknowledgement(removableCardExtractions)
                        ) {
                          return null;
                        }
                        return (
                          <>
                            {!singleStageSkip && (
                              <AutoOpenStageIfEmpty
                                productId={productKey}
                                arch="maxillary"
                                toothNumber={repTn}
                                isExpanded={isExpanded && apShowRemovableFields}
                                isStageVisible={hasAdvanceField("stage", advFields)}
                                isStageEmpty={!isFComplete("stage") && !(selectedStages[productKey])}
                                onOpenStage={handleOpenStageModal}
                                caseSubmitted={caseSubmitted}
                              />
                            )}
                            <AutoOpenImpressionIfEmpty
                              isExpanded={isExpanded && apShowRemovableFields}
                              isImpressionVisible={showArchImpression && removableImplantDetailReady}
                              isImpressionEmpty={
                                !getImpressionDisplayText(impressionModalProductId, "maxillary", repTn)?.trim() &&
                                !archHasActiveImpressionSelections(
                                  selectedImpressions,
                                  impressionModalProductId,
                                  "maxillary"
                                )
                              }
                              onOpenImpressionModal={safeOpenImpressionModal}
                              arch="maxillary"
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
                                    "maxillary",
                                    toothProduct?.id,
                                    getToothProduct,
                                    oppositeMandibularTeeth
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
                                        onSelect={(g) => completeFieldStep("maxillary", repTn, "grade", JSON.stringify({ grade_id: g.grade_id, name: g.name }))}
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
                                      onClick={() => !caseSubmitted && handleOpenStageModal(productKey, "maxillary", repTn)}
                                    >
                                      <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Stage</legend>
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{parseStageDisplayName(stageVal)}</span>
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
                                    <AutoOpenGumShade
                                      visible={isF("gum_shade")}
                                      hasValue={isFComplete("gum_shade")}
                                      onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: displayGumShades })}
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

                              {/* Row 4: Impression (one selection per arch) */}
                              {showArchImpression && removableImplantDetailReady && (() => {
                                const impressionDisplay =
                                  getImpressionDisplayText(impressionModalProductId, "maxillary", repTn) ||
                                  fVal("impression");
                                const impressionComplete =
                                  !!impressionDisplay?.trim() ||
                                  archHasActiveImpressionSelections(
                                    selectedImpressions,
                                    impressionModalProductId,
                                    "maxillary"
                                  );
                                return (
                                <fieldset
                                  className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                                  onClick={() => safeOpenImpressionModal("maxillary", impressionModalProductId, repTn)}
                                >
                                  <legend className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : "border-[#CF0202]"}`}>Impression</legend>
                                  <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{impressionDisplay}</span>
                                  {impressionComplete && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                                </fieldset>
                                );
                              })()}
                              {/* Row 5: Add ons — only when defaults/API populated (same as card 0) */}
                              {isF("addons") && hasVisibleAddonDisplay(fVal("addons")) && (() => {
                                const addonsVal = fVal("addons") || "";
                                const addonItems = parseAddonDisplayItems(addonsVal);
                                const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                                const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                                const onClickAddon = () =>
                                  handleOpenAddOnsModal(
                                    "maxillary",
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
                      }

                      // Fixed restoration added product — use same FixedRestorationFields as Card 0
                      const apFirstTn = resolveAddedCardRepTooth(
                        cardTeeth,
                        ap.id,
                        getToothProduct,
                        "maxillary"
                      );
                      const apToothProduct =
                        getToothProduct("maxillary", apFirstTn) ?? apProduct;
                      const apFixedChain = getRetentionFieldChain(apToothProduct?.advance_fields, apToothProduct);
                      const apRetentionTypes = cardTeeth.flatMap(tn => maxillaryRetentionTypes[tn] || []);
                      const apIsFixed = (step: FieldStep) =>
                        isFieldVisible("maxillary", apFirstTn, step, apFixedChain);
                      const apFixedShadeProductId = resolveFixedShadeProductId(
                        apToothProduct?.id,
                        apFirstTn
                      );
                      const apNamedShadeFields = getShadeGuideAdvanceFields(apToothProduct?.advance_fields);
                      const apFirstMissingShadeField = getFirstMissingShadeGuideField(
                        apToothProduct?.advance_fields,
                        apFixedShadeProductId,
                        "maxillary",
                        getSelectedShade
                      );
                      const apNeedsStumpShade = apNamedShadeFields.length > 0
                        ? apNamedShadeFields.some((field) => getShadeFieldType(field) === "stump_shade")
                        : apFixedChain.includes("fixed_stump_shade") &&
                        (apToothProduct?.has_gum_shade === "Yes" ||
                          (apToothProduct?.advance_fields || []).some((f) => { const n = (f.name || "").toLowerCase(); return (n.includes("stump") || n.includes("gum")) && n.includes("shade"); }));
                      const apHasLegacyToothShade = apToothProduct?.has_teeth_shade === "Yes" ||
                        (apToothProduct?.advance_fields || []).some((f) => {
                          const n = (f.name || "").toLowerCase();
                          return (n.includes("teeth") || (n.includes("tooth") && !n.includes("stump") && !n.includes("gum"))) && n.includes("shade");
                        });
                      const apHasLegacyTrioShade = apToothProduct?.has_teeth_shade === "Yes" ||
                        (apToothProduct?.advance_fields || []).some((f) => {
                          const n = (f.name || "").toLowerCase();
                          return (n.includes("cervical") || n.includes("incisal") || n.includes("body") || n.includes("crown") || (n.includes("tooth") && !n.includes("stump"))) && n.includes("shade");
                        });
                      const apNeedsToothShade = apNamedShadeFields.length > 0
                        ? apNamedShadeFields.some((field) => getShadeFieldType(field) === "tooth_shade")
                        : (apFixedChain.includes("fixed_stump_shade") && apHasLegacyToothShade) ||
                        (apFixedChain.includes("fixed_shade_trio") && apHasLegacyTrioShade);
                      const apShadeRequired = apNamedShadeFields.length > 0 ? !!apFirstMissingShadeField : (apNeedsStumpShade || apNeedsToothShade);
                      // Gum shade may live only in the fixed_stump_shade field value (picked via
                      // the panel gum picker) — accept it so post-shade fields aren't blocked.
                      const apStumpShadeFieldDone =
                        isFieldCompleted("maxillary", apFirstTn, "fixed_stump_shade") ||
                        !!getFieldValue("maxillary", apFirstTn, "fixed_stump_shade")?.trim();
                      const apFixedShadesComplete = areFixedProductShadesComplete(
                        apToothProduct?.advance_fields,
                        apFixedShadeProductId,
                        "maxillary",
                        getSelectedShade,
                        { needsStumpShade: apNeedsStumpShade && !apStumpShadeFieldDone, needsToothShade: apNeedsToothShade }
                      );
                      const apFixedShadeIncomplete = !apFixedShadesComplete;
                      const apUsesAccordionShadePicker = shouldUseAccordionOnlyFixedShades(
                        apToothProduct?.advance_fields
                      );
                      const apGroupStageProductIdFixed = `maxillary_fixed_${apFirstTn}`;
                      const apRetentionFieldsVisible = isFixedRetentionSetupComplete(
                        apProduct,
                        caseSubmitted
                      );

                      return (
                        <>
                          {apRetentionFieldsVisible && (
                            <AutoOpenFirstFixedFieldAfterRetentionDone
                              retentionFieldsVisible={apRetentionFieldsVisible}
                              isExpanded={isExpanded}
                              caseSubmitted={caseSubmitted}
                              isStageVisible={
                                !isSingleStageNoStages(apToothProduct) && apIsFixed("fixed_stage")
                              }
                              isStageEmpty={
                                !isFieldCompleted("maxillary", apFirstTn, "fixed_stage") &&
                                !selectedStages[apGroupStageProductIdFixed]
                              }
                              onOpenStage={handleOpenStageModal}
                              stageProductId={apGroupStageProductIdFixed}
                              arch="maxillary"
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
                                !getSelectedShade(apFixedShadeProductId, "maxillary", "stump_shade")
                              }
                              legacyToothShadeEmpty={
                                apNeedsToothShade &&
                                !getSelectedShade(apFixedShadeProductId, "maxillary", "tooth_shade")
                              }
                              fixedShadesComplete={apFixedShadesComplete}
                            />
                          )}
                          {!isSingleStageNoStages(apToothProduct) && (
                            <AutoOpenStageIfEmpty
                              productId={apGroupStageProductIdFixed}
                              arch="maxillary"
                              toothNumber={apFirstTn}
                              isExpanded={isExpanded}
                              isStageVisible={apIsFixed("fixed_stage")}
                              isStageEmpty={!isFieldCompleted("maxillary", apFirstTn, "fixed_stage") && !(selectedStages[apGroupStageProductIdFixed])}
                              onOpenStage={handleOpenStageModal}
                              caseSubmitted={caseSubmitted}
                            />
                          )}
                          <AutoOpenShadeGuideIfEmpty
                            arch="maxillary"
                            productId={apFixedShadeProductId}
                            isExpanded={isExpanded}
                            isShadeSectionVisible={apIsFixed("fixed_stump_shade") || apIsFixed("fixed_shade_trio")}
                            stumpShadeEmpty={apNeedsStumpShade && !getSelectedShade(apFixedShadeProductId, "maxillary", "stump_shade")}
                            toothShadeEmpty={apNeedsToothShade && !getSelectedShade(apFixedShadeProductId, "maxillary", "tooth_shade")}
                            firstMissingShadeField={apFirstMissingShadeField}
                            storageToothNumber={apFirstTn}
                            setShadeSelectionState={setShadeSelectionState}
                            caseSubmitted={caseSubmitted}
                            skipAutoOpen={apUsesAccordionShadePicker || apFixedShadesComplete}
                          />
                          <AutoOpenGumShade
                            visible={
                              apNamedShadeFields.length === 0 &&
                              apNeedsStumpShade &&
                              !!getSelectedShade(apFixedShadeProductId, "maxillary", "tooth_shade") &&
                              !getSelectedShade(apFixedShadeProductId, "maxillary", "stump_shade")
                            }
                            hasValue={!!getSelectedShade(apFixedShadeProductId, "maxillary", "stump_shade")}
                            onOpen={() =>
                              setPanelGumShadePicker({
                                toothNumber: apFirstTn,
                                gumShades: apToothProduct?.gum_shades || [],
                                stepOverride: "fixed_stump_shade",
                              })
                            }
                          />
                          <RetentionProductFields
                            arch="maxillary"
                            isExpanded={isExpanded}
                            firstToothNumber={apFirstTn}
                            groupStageToothNumber={apFirstTn}
                            groupStageProductIdFixed={apGroupStageProductIdFixed}
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
                            migrateFixedShadeProductId={migrateFixedShadeProductId}
                            handleOpenImpressionModal={safeOpenImpressionModal}
                            handleOpenAddOnsModal={handleOpenAddOnsModal}
                            getImpressionDisplayText={getImpressionDisplayText as (productId: string, arch: string) => string}
                            selectedImpressions={selectedImpressions}
                            setPanelGumShadePicker={(s) => setPanelGumShadePicker({ ...s, stepOverride: "fixed_stump_shade" })}
                            peerImplantDetailByTooth={peerImplantDetailByTooth}
                          />
                        </>
                      );
                    })()}

                    <ScrollToBottom />
                  </ProductAccordionCard>
                );
              })}

            {showDetails && showInlineAddProductPicker && onInlineAddProductComplete && onInlineAddProductCancel && (
              <div className="relative z-20">
                <InlineAddProductPicker
                  arch="maxillary"
                  labId={labCustomerId}
                  excludedProductIds={excludedProductIds}
                  excludedSubcategoryIds={excludedSubcategoryIds}
                  onComplete={onInlineAddProductComplete}
                  onCancel={onInlineAddProductCancel}
                />
              </div>
            )}

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
                const categoryName = selectedProduct?.subcategory?.category?.name || "";
                const subcategoryName = selectedProduct?.subcategory?.name || "";

                // Skip removables products — they have their own dedicated accordion section
                if (isNonRetentionCategory(selectedProduct)) return null;
                const fixedStageName = selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[`maxillary_fixed_${firstToothNumber}`] || "";
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
                  "/placeholder.svg?height=48&width=48&query=dental+crown+tooth";
                const headerTeeth = toothNumbers.filter(tn => !!maxillaryToothExtractionMap[tn]);
                // Product tooth numbers include extraction-status teeth assigned to this
                // product via the combined popover / status boxes — they stay product-
                // selected (parity with removables), they just have no retention type.
                const statusTeethForProduct = MAXILLARY_ALL_TEETH.filter(
                  (tn) =>
                    !toothNumbers.includes(tn) &&
                    !!maxillaryToothExtractionMap[tn] &&
                    getToothProductCard("maxillary", tn) === 0 &&
                    selectedProduct?.id != null &&
                    getToothProduct("maxillary", tn)?.id === selectedProduct.id
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
                  "maxillary",
                  0,
                  rushRepTooth,
                  hasRetentionOptions(selectedProduct)
                );

                // Show skeleton while product is loading
                const isLoading = !selectedProduct && teeth.some((t) => isProductLoading("maxillary", t.toothNumber));
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
                  "maxillary",
                  fixedChain,
                  isFieldCompleted,
                  getFieldValue
                );
                const groupStageProductIdFixed = `maxillary_fixed_${groupStageToothNumber}`;
                const isFixed = (step: FieldStep) =>
                  isFieldVisible("maxillary", groupStageToothNumber, step, fixedChain);

                // Gate: hide product fields while shade guide is open and incomplete for this product
                const _fixedShadeProductId = resolveFixedShadeProductId(
                  selectedProduct?.id,
                  groupStageToothNumber
                );
                const namedShadeFields = getShadeGuideAdvanceFields(selectedProduct?.advance_fields);
                const firstMissingShadeField = getFirstMissingShadeGuideField(
                  selectedProduct?.advance_fields,
                  _fixedShadeProductId,
                  "maxillary",
                  getSelectedShade
                );
                const _needsStumpShade = namedShadeFields.length > 0
                  ? namedShadeFields.some((field) => getShadeFieldType(field) === "stump_shade")
                  : fixedChain.includes("fixed_stump_shade") &&
                  (selectedProduct?.has_gum_shade === "Yes" ||
                    (selectedProduct?.advance_fields || []).some((f) => { const n = (f.name || "").toLowerCase(); return (n.includes("stump") || n.includes("gum")) && n.includes("shade"); }));
                const hasLegacyToothShade = selectedProduct?.has_teeth_shade === "Yes" ||
                  (selectedProduct?.advance_fields || []).some((f) => {
                    const n = (f.name || "").toLowerCase();
                    return (n.includes("teeth") || (n.includes("tooth") && !n.includes("stump") && !n.includes("gum"))) && n.includes("shade");
                  });
                const hasLegacyTrioShade = selectedProduct?.has_teeth_shade === "Yes" ||
                  (selectedProduct?.advance_fields || []).some((f) => {
                    const n = (f.name || "").toLowerCase();
                    return (n.includes("cervical") || n.includes("incisal") || n.includes("body") || n.includes("crown") || (n.includes("tooth") && !n.includes("stump"))) && n.includes("shade");
                  });
                const _needsToothShade = namedShadeFields.length > 0
                  ? namedShadeFields.some((field) => getShadeFieldType(field) === "tooth_shade")
                  : (fixedChain.includes("fixed_stump_shade") && hasLegacyToothShade) ||
                  (fixedChain.includes("fixed_shade_trio") && hasLegacyTrioShade);
                const _shadeRequired = namedShadeFields.length > 0 ? !!firstMissingShadeField : (_needsStumpShade || _needsToothShade);
                // Gum shade may live only in the fixed_stump_shade field value (picked via
                // the panel gum picker) — accept it so post-shade fields aren't blocked.
                const stumpShadeFieldDone =
                  isFieldCompleted("maxillary", firstToothNumber, "fixed_stump_shade") ||
                  !!getFieldValue("maxillary", firstToothNumber, "fixed_stump_shade")?.trim();
                const fixedShadesComplete = areFixedProductShadesComplete(
                  selectedProduct?.advance_fields,
                  _fixedShadeProductId,
                  "maxillary",
                  getSelectedShade,
                  { needsStumpShade: _needsStumpShade && !stumpShadeFieldDone, needsToothShade: _needsToothShade }
                );
                const fixedShadeIncomplete = !fixedShadesComplete;
                const usesAccordionShadePicker = shouldUseAccordionOnlyFixedShades(
                  selectedProduct?.advance_fields
                );
                const showFixedActions = hasRetentionOptions(selectedProduct) && isFieldCompleted("maxillary", groupStageToothNumber, "fixed_impression") && !caseSubmitted;
                const showPrepActions = !hasRetentionOptions(selectedProduct) && isFieldCompleted("maxillary", firstToothNumber, "addons") && !caseSubmitted;
                const showActions = showFixedActions || showPrepActions;

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
                const showFixedRetentionDone =
                  hasRetentionOptions(selectedProduct) &&
                  !caseSubmitted &&
                  !card0SkipsLegacyDefaults;
                const card0FixedExpanded = isCardAccordionExpanded(slotId);
                return (
                  <ProductAccordionCard
                    key={`prep-pontic-group-${groupKey}`}
                    slotId={slotId}
                    arch="maxillary"
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
                    subcategoryName={subcategoryName}
                    stageName={
                      !isSingleStageNoStages(selectedProduct)
                        ? (selectedStages[`maxillary_prep_${firstToothNumber}`] || selectedStages[groupStageProductIdFixed] || undefined)
                        : undefined
                    }
                    estDaysText={estDays}
                    hasRush={hasRushed}
                    canDelete={!caseSubmitted}
                    onDelete={() => {
                      toothNumbers.forEach((tn) => {
                        clearToothProgress("maxillary", tn);
                        handleMaxillaryToothDeselect(tn);
                      });
                      const archStillHasTeeth = MAXILLARY_ALL_TEETH.some((tn) =>
                        getToothProduct("maxillary", tn)
                      );
                      const archHasAdded = addedProducts.some((p) => p.arch === "maxillary");
                      if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("maxillary");
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
                        splintSummary={maxillarySplintSummaryFor(toothNumbers)}
                        middleContent={renderFixedExtractionStatusBoxes(selectedProduct, toothNumbers)}
                        categoryName={categoryName}
                        subcategoryName={subcategoryName}
                        stageName={
                          !isSingleStageNoStages(selectedProduct)
                            ? fixedStageName || undefined
                            : undefined
                        }
                        stageProduct={selectedProduct}
                        estDaysText={estDays}
                        canDelete={!caseSubmitted}
                        onDelete={() => {
                          toothNumbers.forEach((tn) => {
                            clearToothProgress("maxillary", tn);
                            handleMaxillaryToothDeselect(tn);
                          });
                          const archStillHasTeeth = MAXILLARY_ALL_TEETH.some((tn) =>
                            getToothProduct("maxillary", tn)
                          );
                          const archHasAdded = addedProducts.some((p) => p.arch === "maxillary");
                          if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("maxillary");
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
                    {card0ShowFixedFieldsContent && hasRetentionOptions(selectedProduct) && (
                      <AutoOpenFirstFixedFieldAfterRetentionDone
                        retentionFieldsVisible={card0ShowFixedFields}
                        isExpanded={card0FixedExpanded}
                        caseSubmitted={caseSubmitted}
                        isStageVisible={!isSingleStageNoStages(selectedProduct) && isFixed("fixed_stage")}
                        isStageEmpty={
                          !(selectedStages[groupStageProductIdFixed] ||
                            getFieldValue("maxillary", groupStageToothNumber, "fixed_stage"))
                        }
                        onOpenStage={handleOpenStageModal}
                        stageProductId={groupStageProductIdFixed}
                        arch="maxillary"
                        stageToothNumber={groupStageToothNumber}
                        usesAccordionShadePicker={usesAccordionShadePicker}
                        firstMissingShadeField={firstMissingShadeField}
                        fixedShadeProductId={_fixedShadeProductId}
                        storageToothNumber={groupStageToothNumber}
                        setShadeSelectionState={setShadeSelectionState}
                        isLegacyShadeSectionVisible={
                          isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")
                        }
                        legacyStumpShadeEmpty={
                          _needsStumpShade &&
                          !getSelectedShade(_fixedShadeProductId, "maxillary", "stump_shade")
                        }
                        legacyToothShadeEmpty={
                          _needsToothShade &&
                          !getSelectedShade(_fixedShadeProductId, "maxillary", "tooth_shade")
                        }
                        fixedShadesComplete={fixedShadesComplete}
                      />
                    )}
                    {card0ShowFixedFieldsContent && !isSingleStageNoStages(selectedProduct) && (
                      <AutoOpenStageIfEmpty
                        productId={hasRetentionOptions(selectedProduct) ? groupStageProductIdFixed : `maxillary_prep_${firstToothNumber}`}
                        arch="maxillary"
                        toothNumber={hasRetentionOptions(selectedProduct) ? groupStageToothNumber : firstToothNumber}
                        isExpanded={isCardAccordionExpanded(slotId)}
                        isStageVisible={hasRetentionOptions(selectedProduct) ? isFixed("fixed_stage") : isFieldVisible("maxillary", firstToothNumber, "stage")}
                        isStageEmpty={hasRetentionOptions(selectedProduct) ? !(selectedStages[groupStageProductIdFixed] || getFieldValue("maxillary", groupStageToothNumber, "fixed_stage")) : !(selectedStages[`maxillary_prep_${firstToothNumber}`] || getFieldValue("maxillary", firstToothNumber, "stage"))}
                        onOpenStage={handleOpenStageModal}
                        caseSubmitted={caseSubmitted}
                      />
                    )}
                    {card0ShowFixedFieldsContent && hasRetentionOptions(selectedProduct) && (
                      <>
                        <AutoOpenShadeGuideIfEmpty
                          arch="maxillary"
                          productId={_fixedShadeProductId}
                          isExpanded={isCardAccordionExpanded(slotId)}
                          isShadeSectionVisible={isFixed("fixed_stump_shade") || isFixed("fixed_shade_trio")}
                          stumpShadeEmpty={_needsStumpShade && !getSelectedShade(_fixedShadeProductId, "maxillary", "stump_shade")}
                          toothShadeEmpty={_needsToothShade && !getSelectedShade(_fixedShadeProductId, "maxillary", "tooth_shade")}
                          firstMissingShadeField={firstMissingShadeField}
                          storageToothNumber={groupStageToothNumber}
                          setShadeSelectionState={setShadeSelectionState}
                          caseSubmitted={caseSubmitted}
                          skipAutoOpen={usesAccordionShadePicker || fixedShadesComplete}
                        />
                        <AutoOpenGumShade
                          visible={
                            namedShadeFields.length === 0 &&
                            _needsStumpShade &&
                            !!getSelectedShade(_fixedShadeProductId, "maxillary", "tooth_shade") &&
                            !getSelectedShade(_fixedShadeProductId, "maxillary", "stump_shade")
                          }
                          hasValue={!!getSelectedShade(_fixedShadeProductId, "maxillary", "stump_shade")}
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
                        arch="maxillary"
                        isExpanded={isCardAccordionExpanded(slotId)}
                        firstToothNumber={groupStageToothNumber}
                        groupStageToothNumber={groupStageToothNumber}
                        groupStageProductIdFixed={groupStageProductIdFixed}
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
                        migrateFixedShadeProductId={migrateFixedShadeProductId}
                        handleOpenImpressionModal={safeOpenImpressionModal}
                        handleOpenAddOnsModal={handleOpenAddOnsModal}
                        getImpressionDisplayText={getImpressionDisplayText as (productId: string, arch: string) => string}
                        selectedImpressions={selectedImpressions}
                        setPanelGumShadePicker={(s) => setPanelGumShadePicker({ ...s, stepOverride: "fixed_stump_shade" })}
                        peerImplantDetailByTooth={peerImplantDetailByTooth}
                      />
                    ) : card0ShowFixedFieldsContent ? (
                      <SelectionProductFields
                        arch="maxillary"
                        firstToothNumber={firstToothNumber}
                        selectedProduct={selectedProduct}
                        toothNumbers={toothNumbers}
                        caseSubmitted={caseSubmitted}
                        retentionTypesMap={maxillaryRetentionTypes}
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
                          useMaxillaryArchSharedRemovable
                            ? maxillaryArchExtractionsReady
                            : isExtractionsSetupComplete(
                                selectedProduct?.extractions ?? [],
                                0,
                                caseSubmitted
                              )
                        }
                        peerImplantDetailByTooth={peerImplantDetailByTooth}
                      />
                    ) : null}
                    <ScrollToBottom />
                  </ProductAccordionCard>
                );
              });
            })()}

            {/* Initial Removables product accordion — show fields when card 0 product is Removable/Ortho AND teeth are assigned to it */}
            {showDetails && maxillaryHasRemovablesCard0 && (() => {
              const SLOT_ID = "removable0";
              // Use all arch teeth (not just selected) so the accordion stays visible when all teeth are marked missing
              const realCardTeeth = MAXILLARY_ALL_TEETH.filter(tn => getToothProduct("maxillary", tn) && getToothProductCard("maxillary", tn) === 0);
              // Fallback to the sentinel tooth + initial product details so the card renders
              // immediately for TIM-default removable/ortho products: they select no teeth, and
              // the async per-tooth product assignment may not have landed yet.
              const cardTeeth = realCardTeeth.length > 0 ? realCardTeeth : (card0InitialProduct ? [MAXILLARY_ALL_TEETH[0]] : []);
              if (cardTeeth.length === 0) return null;
              const getCardToothProduct = (tn: number) => getToothProduct("maxillary", tn) ?? card0InitialProduct;
              const card0Extractions = cardTeeth.flatMap((tn) => getCardToothProduct(tn)?.extractions ?? []);
              const cardProduct = getCardToothProduct(cardTeeth[0]);
              const cardIsFullDenture = isFullDentureProduct(card0Extractions);
              const cardIsSingleDefaultOnly = isSingleDefaultOnlyExtractionList(
                cardProduct?.extractions ?? card0Extractions
              );
              const card0AssignedTeeth = [...maxillaryTeeth]
                .filter((tn) => getToothProductCard("maxillary", tn) === 0)
                .sort((a, b) => a - b);
              const rawDisplayTeeth = cardIsFullDenture ? MAXILLARY_ALL_TEETH : card0AssignedTeeth;
              const displayTeeth = getRemovableOrangeHeaderTeeth({
                selectedTeeth: rawDisplayTeeth,
                toothExtractionMap: maxillaryToothExtractionMap,
                claspTeeth: maxillaryClaspTeeth,
                noActiveBoxTeeth: maxillaryNoActiveBoxTeeth,
                extractions: cardProduct?.extractions ?? card0Extractions,
                isFullDenture: cardIsFullDenture,
                isSingleDefaultOnly: cardIsSingleDefaultOnly,
              });
              const variationDisplay = resolveVariationDisplay(cardProduct, displayTeeth.length);
              const cardProductName = variationDisplay.name;
              // Prefer a matched variation image; otherwise show the upper arch image when configured.
              const cardProductImage = variationDisplay.matched
                ? variationDisplay.imageUrl
                : resolveArchProductImage(cardProduct, "maxillary", variationDisplay.imageUrl);
              const hasVariationMatch = variationDisplay.matched;
              const cardToothDisplay = displayTeeth.length > 0 ? `#${displayTeeth.join(",")}` : "";
              const statusBoxSelectedTeeth =
                useMaxillaryArchSharedRemovable || cardIsSingleDefaultOnly
                  ? maxillaryTeeth
                  : cardIsFullDenture
                    ? MAXILLARY_ALL_TEETH
                    : resolveRemovableStatusBoxSelectedTeeth({
                        cardTeeth: rawDisplayTeeth,
                        toothExtractionMap: maxillaryToothExtractionMap,
                        claspTeeth: maxillaryClaspTeeth,
                        archTeeth: MAXILLARY_ALL_TEETH,
                      });
              const isCurrentlyActiveProduct = isCardActiveForToothStatus(0);
              const repTnStage = resolveCardRepToothForRush(cardTeeth);
              const stageVal = selectedStages[`maxillary_prep_${repTnStage}`] || getFieldValue("maxillary", repTnStage, "stage");
              const stageDisplayName = parseStageDisplayName(stageVal);
              const estDays = resolveRemovableEstDaysText(cardProduct, stageDisplayName);
              const hasRushedRemovables = isProductRushed(
                rushedProducts,
                "maxillary",
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
              const card0LabelOnlyHeader = !hasConfiguredExtractions(
                useMaxillaryArchSharedRemovable ? maxillaryMergedExtractions : cardExtractions
              );
              const card0Expanded = card0LabelOnlyHeader || isCardAccordionExpanded(SLOT_ID);

              return (
                <ProductAccordionCard
                  key="initial-removables-maxillary"
                  slotId={SLOT_ID}
                  arch="maxillary"
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
                        resolveProductForStageField(cardProduct, "maxillary", getToothProduct)
                      )
                      ? stageDisplayName
                      : undefined
                  }
                  estDaysText={estDays}
                  hasRush={!!hasRushedRemovables}
                  canDelete={!caseSubmitted}
                  onDelete={() => {
                    const teethToClear = useMaxillaryArchSharedRemovable
                      ? displayTeeth
                      : cardTeeth;
                    teethToClear.forEach((tn) => {
                      clearToothProgress("maxillary", tn);
                      handleMaxillaryToothDeselect(tn);
                    });
                    const archStillHasTeeth = MAXILLARY_ALL_TEETH.some((tn) =>
                      getToothProduct("maxillary", tn)
                    );
                    const archHasAdded = addedProducts.some((p) => p.arch === "maxillary");
                    if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("maxillary");
                  }}
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
                        const ackCardId = useMaxillaryArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : 0;
                        setExtractionsSetupComplete(ackCardId, false);
                        setActiveProductCardId(0);
                        setIsSelectionModeActive(true);
                        if (!isAccordionExpanded(SLOT_ID)) {
                          handleCard0RemovableAccordionToggle();
                        }
                      }}
                      allArchTeethSelected={displayTeeth.length >= MAXILLARY_ALL_TEETH.length}
                      labelOnlyHeader={card0LabelOnlyHeader}
                      isProductSelectionActive={activeProductCardId === 0 && (isSelectionModeActive || activeExtractionCode !== null)}
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
                      splintSummary={maxillarySplintSummaryFor(card0AssignedTeeth)}
                      categoryName={cardProduct?.subcategory?.category?.name}
                      subcategoryName={cardProduct?.subcategory?.name}
                      stageName={
                        isDisplayableStageValue(stageVal) &&
                        !shouldSkipStageSelection(
                          resolveProductForStageField(cardProduct, "maxillary", getToothProduct)
                        )
                          ? stageDisplayName
                          : undefined
                      }
                      stageProduct={resolveProductForStageField(
                        cardProduct,
                        "maxillary",
                        getToothProduct
                      )}
                      estDaysText={estDays}
                      canDelete={!caseSubmitted}
                      onDelete={() => {
                        const teethToClear = useMaxillaryArchSharedRemovable
                          ? displayTeeth
                          : cardTeeth;
                        teethToClear.forEach((tn) => {
                          clearToothProgress("maxillary", tn);
                          handleMaxillaryToothDeselect(tn);
                        });
                        const archStillHasTeeth = MAXILLARY_ALL_TEETH.some((tn) =>
                          getToothProduct("maxillary", tn)
                        );
                        const archHasAdded = addedProducts.some((p) => p.arch === "maxillary");
                        if (!archStillHasTeeth && !archHasAdded) onBackToCategories?.("maxillary");
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
                        useMaxillaryArchSharedRemovable
                          ? maxillaryMergedExtractions
                          : cardExtractions,
                        card0InitialProduct,
                      )}
                      extractionsAcknowledged={
                        useMaxillaryArchSharedRemovable
                          ? maxillaryArchExtractionsReady
                          : isExtractionsSetupComplete(cardExtractions, 0, caseSubmitted)
                      }
                      onExtractionsAcknowledgedChange={(v) =>
                        useMaxillaryArchSharedRemovable
                          ? setExtractionsSetupComplete(ARCH_SHARED_REMOVABLE_ACK_CARD_ID, v)
                          : setExtractionsSetupComplete(0, v)
                      }
                      middleContent={
                        isCardActiveForToothStatus(0) &&
                        (useMaxillaryArchSharedRemovable
                          ? maxillaryMergedExtractions
                          : cardExtractions
                        ).length > 0 &&
                        !isSingleDefaultOnlyExtractionList(
                          useMaxillaryArchSharedRemovable
                            ? maxillaryMergedExtractions
                            : cardExtractions
                        ) &&
                        // Show the extraction boxes + Done button once teeth are selected,
                        // or immediately when selection is optional (default + optional-only,
                        // e.g. night guard) so the user can click Done without selecting.
                        (maxillaryTeeth.length > 0 ||
                          isExtractionSelectionOptional(
                            useMaxillaryArchSharedRemovable
                              ? maxillaryMergedExtractions
                              : cardExtractions
                          )) ? (
                          <>
                          {/* "Select teeth for reference" hint — directly above the status boxes. */}
                          {maxillaryToothHint && maxillaryToothHint.kind === "reference" && (
                            <p className={maxillaryToothHint.className}>{maxillaryToothHint.text}</p>
                          )}
                          <ToothStatusBoxes
                            extractions={
                              useMaxillaryArchSharedRemovable
                                ? maxillaryMergedExtractions
                                : cardExtractions
                            }
                            selectedTeeth={statusBoxSelectedTeeth}
                            allArchTeeth={MAXILLARY_ALL_TEETH}
                            toothExtractionMap={maxillaryToothExtractionMap}
                            claspTeeth={maxillaryClaspTeeth}
                            skipDefaultAutoSelect={card0SkipsLegacyDefaults}
                            displayTeethByCode={getToothStatusBoxDisplayMap({
                              extractions: useMaxillaryArchSharedRemovable
                                ? maxillaryMergedExtractions
                                : cardExtractions,
                              selectedTeeth: statusBoxSelectedTeeth,
                              toothExtractionMap: maxillaryToothExtractionMap,
                              claspTeeth: maxillaryClaspTeeth,
                              excludeTeeth: displayTeeth,
                            })}
                            activeExtractionCode={activeExtractionCode}
                            onActiveExtractionChange={(code, exts) => {
                              setActiveExtractionCode(code);
                              if (exts) setActiveExtractions(exts);
                              else if (useMaxillaryArchSharedRemovable) {
                                setActiveExtractions(maxillaryMergedExtractions);
                              }
                              // Re-activating an extraction box resets Done so the button re-appears
                              if (code !== null) {
                                const ackCardId = useMaxillaryArchSharedRemovable ? ARCH_SHARED_REMOVABLE_ACK_CARD_ID : 0;
                                setExtractionsSetupComplete(ackCardId, false);
                                setIsSelectionModeActive(true);
                              }
                            }}
                            onToothExtractionToggle={(tn, code, extractions) =>
                              handleToothExtractionToggle(
                                "maxillary",
                                tn,
                                code,
                                extractions ??
                                  (useMaxillaryArchSharedRemovable
                                    ? maxillaryMergedExtractions
                                    : cardExtractions)
                              )
                            }
                            onSelectAllTeeth={selectAllMaxillaryTeeth}
                            onRequiredValidationChange={onToothStatusValidationChange}
                            isRemovable={true}
                            submitted={caseSubmitted}
                            hideDefaultBox={true}
                            disableRequiredValidation={true}
                            grayed={isActiveMaxillaryProductDetailPending}
                            acknowledged={
                              useMaxillaryArchSharedRemovable
                                ? maxillaryArchExtractionsReady
                                : isExtractionsSetupComplete(cardExtractions, 0, caseSubmitted)
                            }
                            onAcknowledgedChange={(v) => {
                              if (v) {
                                // Done clicked — clear active borders
                                setActiveExtractionCode(null);
                                setIsSelectionModeActive(false);
                              }
                              useMaxillaryArchSharedRemovable
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
                      isFieldVisible("maxillary", repTn, step as any, removableChain);
                    const isFComplete = (step: string) => isFieldCompleted("maxillary", repTn, step as any);
                    const fVal = (step: string) => getFieldValue("maxillary", repTn, step as any);
                    const productKey = `maxillary_prep_${repTn}`;
                    const impressionModalProductId = "0";
                    const stageVal = fVal("stage") || selectedStages[productKey] || "";
                    const singleStageSkip = shouldSkipStageSelection(
                      resolveProductForStageField(toothProduct, "maxillary", getToothProduct)
                    );
                    const oppositeMandibularTeeth = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
                    const oppositeProductDonor = findOppositeArchProductDonor(
                      "maxillary",
                      toothProduct?.id,
                      getToothProduct,
                      oppositeMandibularTeeth
                    );
                    const displayGumShades = resolveGumShadesForDisplay(toothProduct, oppositeProductDonor);
                    const removableImplantTeeth = getImplantTeethInGroup(
                      cardTeeth,
                      maxillaryRetentionTypes
                    );
                    const removableImplantDetailReady = areAllImplantDetailsComplete(
                      removableImplantTeeth,
                      implantDetailCompleteByTooth
                    );
                    const card0ShowRemovableFields = useMaxillaryArchSharedRemovable
                      ? maxillaryArchExtractionsReady
                      : card0SkipsLegacyDefaults ||
                        isExtractionsSetupComplete(cardExtractions, 0, caseSubmitted);
                    // Guided both-arch flow: suppress card-0 field content until this arch's
                    // fields phase (chart + teeth selection above remain visible).
                    if (guidedHideCard0Fields) {
                      return null;
                    }
                    if (
                      !card0ShowRemovableFields &&
                      !useMaxillaryArchSharedRemovable &&
                      requiresExtractionsAcknowledgement(cardExtractions, card0InitialProduct)
                    ) {
                      return null;
                    }
                    return (
                      <>
                        {!singleStageSkip && (
                          <AutoOpenStageIfEmpty
                            productId={productKey}
                            arch="maxillary"
                            toothNumber={repTn}
                            isExpanded={card0Expanded && card0ShowRemovableFields}
                            isStageVisible={isF("stage")}
                            isStageEmpty={!stageVal}
                            onOpenStage={handleOpenStageModal}
                            caseSubmitted={caseSubmitted}
                          />
                        )}
                        <AutoOpenImpressionIfEmpty
                          isExpanded={card0Expanded && card0ShowRemovableFields}
                          isImpressionVisible={
                            getNextSelectionFieldStep(
                              removableChain,
                              "maxillary",
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
                              "maxillary"
                            )
                          }
                          onOpenImpressionModal={safeOpenImpressionModal}
                          arch="maxillary"
                          productId={impressionModalProductId}
                          toothNumber={repTn}
                          caseSubmitted={caseSubmitted}
                          blockAutoOpen={isAnyModalOpen}
                        />
                        <div className="rounded-lg p-3 space-y-3">
                          {/* Row 1: Grade / Stage */}
                          {(isF("grade") || (isF("stage") && !singleStageSkip)) && (() => {
                            const gradesDonor = findOppositeArchGradesDonor(
                              "maxillary",
                              toothProduct?.id,
                              getToothProduct,
                              oppositeMandibularTeeth
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
                                      <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{parseStageDisplayName(stageVal)}</span>
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
                                  onOpen={() => setPanelGumShadePicker({ toothNumber: repTn, gumShades: displayGumShades })}
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

                          {/* Row 4: Impression */}
                          {isF("impression") && (() => {
                            const impressionDisplay =
                              getImpressionDisplayText(impressionModalProductId, "maxillary", repTn) ||
                              fVal("impression");
                            const impressionComplete =
                              isFComplete("impression") ||
                              (!!impressionDisplay &&
                                archHasActiveImpressionSelections(
                                  selectedImpressions,
                                  impressionModalProductId,
                                  "maxillary"
                                ));
                            return (
                            <fieldset
                              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 ${impressionComplete && !caseSubmitted ? "border-[#34a853]" : impressionComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"}`}
                              onClick={() => safeOpenImpressionModal("maxillary", impressionModalProductId, repTn)}
                            >
                              <legend className={`text-sm px-1 leading-none ${impressionComplete && !caseSubmitted ? "text-[#34a853]" : impressionComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>Impression</legend>
                              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">{impressionDisplay}</span>
                              {impressionComplete && !caseSubmitted && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
                            </fieldset>
                            );
                          })()}
                          {/* Row 5: Add ons — only when defaults/API populated (same as card 0) */}
                          {isF("addons") && hasVisibleAddonDisplay(fVal("addons")) && (() => {
                            const addonsVal = fVal("addons") || "";
                            const addonItems = parseAddonDisplayItems(addonsVal);
                            const borderClass = isFComplete("addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]";
                            const legendClass = isFComplete("addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]";
                            const onClickAddon = () =>
                              handleOpenAddOnsModal(
                                "maxillary",
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


            {/* Opposing product accordion — maxillary opposing when slip is mand-primary (see CaseDesignCenter opposingProductData). */}
            {showDetails && opposingProductData && (opposingProductData.opposite_impression === "Yes" || (opposingProductData.opposite_extractions?.length ?? 0) > 0) && (() => {
              const hasOpposingImpressionSelected =
                (selectedImpressions.maxillary?.length ?? 0) > 0;
              const isNoOpposing =
                !hasOpposingImpressionSelected &&
                Object.keys(noOpposingNeeded).some(
                  (k) =>
                    /^\d+_mandibular_/.test(k) ||
                    (k.startsWith("mandibular_prep_") && k.includes("_mandibular_"))
                );
              if (!hasOpposingImpressionSelected && !isNoOpposing) return null;
              const opposingImpressionText =
                selectedImpressions.maxillary
                  ?.filter((e) => e.qty > 0)
                  .map((e) => `${e.qty}x ${e.name}`)
                  .join(", ") ?? "";
              return (
                <OpposingRemovableAccordion
                  key="opposing-accordion"
                  opposingArch="maxillary"
                  fieldArch="mandibular"
                  fieldRepTn={MANDIBULAR_SENTINEL}
                  opposingProductData={opposingProductData}
                  opposingArchTeeth={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]}
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
                  onSelectAllOpposingTeeth={selectAllOpposingTeeth}
                  onToothStatusValidationChange={onToothStatusValidationChange}
                  opposingOnlyLayout={opposingOnlyLayout}
                />
              );
            })()}

          </div>{/* end scrollable accordion container */}

        </>
      )}

      {/* Block interaction on this arch only while adding a product on the opposite arch */}
      {disabled && (
        <OppositeArchAddProductShield active activeArch="mandibular" />
      )}
    </div>
  );
}
