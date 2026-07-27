"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import type { CaseDesignProps } from "../types";
import type { ImplantDetailData } from "./ImplantDetailSection";
import { useCaseDesignState } from "../hooks/useCaseDesignState";
import { IMPRESSION_STEP_NAMES, getRetentionFieldChain } from "../hooks/useToothFieldProgress";
import {
  isImplantDetailFilled,
  resolveGroupStageToothNumber,
} from "../utils/implantDetailHelpers";
import { MaxillaryPanel } from "./MaxillaryPanel";
import { MandibularPanel } from "./MandibularPanel";
import { AutoOpenSuppressionContext } from "./auto-open-suppression";
import { CenterNavigation } from "./CenterNavigation";
import { ModalOrchestrator } from "./ModalOrchestrator";
import { mockImpressions } from "../constants";
import { hasRetentionOptions, isNonRetentionCategory, serializeStageFieldValue, serializeStageSelectionFromProduct } from "../utils/categoryHelpers";
import { resolveProductForStageField } from "../utils/gradeHelpers";
import { hasAdvanceField } from "./FixedRestorationFields";
import {
  getCardRepresentativeTooth,
  getPrimaryCardRepresentativeTooth,
  getRepresentativeTeethByCard,
} from "../utils/productSelectionReadiness";
import { BackToProductsControl, CaseDesignHeaderActions } from "./CaseDesignHeaderActions";
import { ChangeProductConfirmModal } from "./ChangeProductConfirmModal";
import { CaseDesignSummarySection } from "./CaseDesignSummarySection";
import { useSlipProductCollector } from "../hooks/useSlipProductCollector";
import { getFirstMissingShadeGuideField, getShadeGuideAdvanceFields } from "../utils/shadeGuideAdvanceFields";
import {
  getOpposingImpressionRequirement,
  isOppositeImpressionEnabled,
} from "../utils/opposingImpressionReadiness";
import {
  buildImpressionModalOptions,
  collectImpressionCatalogForArch,
  collectSlipWideImpressionCatalog,
  getImpressionOptionsForProduct,
  resolveImpressionName,
  resolveProductForImpression,
} from "../utils/impressionFieldSync";
import { buildImpressionDisplayText } from "../utils/impressionStorage";
import {
  getRepToothForRemovableCard,
  listRemovableCardIdsOnArch,
} from "../utils/archSharedRemovable";
import { canShowAddProductButton } from "../utils/archAddProductReadiness";
import { computeSlipValidationComplete } from "../utils/caseSummaryVisibility";
import { isArchAtProductLimit } from "../utils/archProductLimits";
import { shouldShowOpposingProductMirror } from "../utils/oppositeArchDedicatedProduct";
import { buildRushArchSlots } from "../utils/rushModalContext";
import { useRushSlotDeliveryDates } from "../hooks/useRushSlotDeliveryDates";
import { productSupportsAddons } from "../utils/addonDisplayHelpers";
import { canSkipExtractionToothSelection, getDefaultExtractionStrict } from "../utils/extractionHelpers";
import { shouldSkipLegacyDefaultExtractionAutoSelect } from "@/lib/product-default-tooth-chart";
import { getExtractionTypeColor } from "@/lib/extraction-type-colors";
import {
  findOppositeArchProductDonor,
  resolveProductStagesForDisplay,
} from "../utils/gradeHelpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddStageStagePrompt } from "@/components/add-new-stage/useAddStageStagePrompt";

const MAXILLARY_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export function CaseDesignCenter(props: CaseDesignProps) {
  const [toothOwnershipWarning, setToothOwnershipWarning] = useState<string | null>(null);
  const [hasToothStatusValidation, setHasToothStatusValidation] = useState(false);
  const handleToothStatusValidationChange = useCallback(
    (hasValidation: boolean) => {
      setHasToothStatusValidation(hasValidation);
      props.onToothStatusValidationChange?.(hasValidation);
    },
    [props.onToothStatusValidationChange]
  );
  const handleToothOwnershipConflict = useCallback((message: string) => {
    setToothOwnershipWarning(message);
  }, []);
  const state = useCaseDesignState({
    ...props,
    onToothOwnershipConflict: handleToothOwnershipConflict,
  });
  const initialMaxillaryImplants =
    props.initialSlipState?.maxillaryImplantDetailsByTooth ?? {};
  const initialMandibularImplants =
    props.initialSlipState?.mandibularImplantDetailsByTooth ?? {};
  const maxillaryImplantDetailRef =
    useRef<Record<number, ImplantDetailData>>(initialMaxillaryImplants);
  const mandibularImplantDetailRef =
    useRef<Record<number, ImplantDetailData>>(initialMandibularImplants);
  const maxillarySplintLinksRef = useRef<Record<string, number[]>>({});
  const mandibularSplintLinksRef = useRef<Record<string, number[]>>({});
  const [maxillaryImplantDetailPeer, setMaxillaryImplantDetailPeer] = useState<
    Record<number, ImplantDetailData>
  >(initialMaxillaryImplants);
  const [mandibularImplantDetailPeer, setMandibularImplantDetailPeer] = useState<
    Record<number, ImplantDetailData>
  >(initialMandibularImplants);
  const [maxillaryImplantCompletePeer, setMaxillaryImplantCompletePeer] = useState<
    Record<number, boolean>
  >(() =>
    Object.fromEntries(
      Object.entries(initialMaxillaryImplants).map(([tooth, detail]) => [
        Number(tooth),
        isImplantDetailFilled(detail),
      ])
    )
  );
  const [mandibularImplantCompletePeer, setMandibularImplantCompletePeer] = useState<
    Record<number, boolean>
  >(() =>
    Object.fromEntries(
      Object.entries(initialMandibularImplants).map(([tooth, detail]) => [
        Number(tooth),
        isImplantDetailFilled(detail),
      ])
    )
  );
  // Tracks when the user explicitly hides the mandibular panel while it's force-shown by the opposing condition.
  const [userHidMandibular, setUserHidMandibular] = useState(false);
  const [showSelectTeethToReplaceMaxillary, setShowSelectTeethToReplaceMaxillary] = useState(false);
  const [showSelectTeethToReplaceMandibular, setShowSelectTeethToReplaceMandibular] = useState(false);
  const getMissingFixedShadeField = useCallback(
    (product: any, shadeProductId: string, arch: "maxillary" | "mandibular") => {
      const missingNamedField = getFirstMissingShadeGuideField(
        product?.advance_fields,
        shadeProductId,
        arch,
        state.getSelectedShade
      );
      if (missingNamedField) return missingNamedField.name;

      const shadeGuideFields = getShadeGuideAdvanceFields(product?.advance_fields);
      if (shadeGuideFields.length > 0) return null;
      if (hasAdvanceField("fixed_stump_shade", product?.advance_fields) && !state.getSelectedShade(shadeProductId, arch, "stump_shade")) {
        return "Stump Shade";
      }
      if (hasAdvanceField("fixed_shade_trio", product?.advance_fields) && !state.getSelectedShade(shadeProductId, arch, "tooth_shade")) {
        return "Tooth Shade";
      }
      return null;
    },
    [state.getSelectedShade]
  );

  const isAnyModalOpen =
    state.showImpressionModal ||
    state.isStageModalOpen ||
    state.showAddOnsModal ||
    state.showRushModal ||
    toothOwnershipWarning !== null;
  const onAnyModalOpenChangeRef = useRef(props.onAnyModalOpenChange);
  onAnyModalOpenChangeRef.current = props.onAnyModalOpenChange;
  useEffect(() => {
    onAnyModalOpenChangeRef.current?.(isAnyModalOpen);
  }, [isAnyModalOpen]);

  useAddStageStagePrompt({
    enabled: Boolean(
      props.preloadInitialSlipState && props.addStageContext?.promptStagesOnLoad
    ),
    addedProducts: props.addedProducts ?? [],
    maxillaryTeeth: state.maxillaryTeeth,
    mandibularTeeth: state.mandibularTeeth,
    focusAccordion: state.focusAccordion,
    handleOpenStageModal: state.handleOpenStageModal,
    isStageModalOpen: state.isStageModalOpen,
    getToothProduct: state.getToothProduct,
  });

  const addStageStageHistoryForModal =
    props.addStageContext?.historyByArch?.[state.currentStageArch] ?? undefined;

  // Unified setter used by both CenterNavigation and MandibularPanel so the override state stays in sync.
  const handleSetShowMandibular = useCallback((v: boolean) => {
    state.setShowMandibular(v);
    setUserHidMandibular(!v);
  }, [state.setShowMandibular]);

  const maxillaryHasImpression = Object.keys(state.maxillaryRetentionTypes).some((toothNum) => {
    const n = Number(toothNum);
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
  });

  const mandibularHasImpression = Object.keys(state.mandibularRetentionTypes || {}).some((toothNum) => {
    const n = Number(toothNum);
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
  });

  // True when any arch has a non-fixed product (Removable/Ortho): no retention_options
  const hasSelectionOnlyProductForArch = (arch: "maxillary" | "mandibular") =>
    (props.addedProducts ?? []).some((ap) => {
      if (ap.arch !== arch) return false;
      return !hasRetentionOptions(ap.product);
    });

  // Show panels/accordion as soon as a removables product exists (no teeth required)
  // Include both addedProducts and the initial active product (card 0).
  // Use stable props-derived flags (not activeProductCardId-dependent state) so that
  // activating a different product card does not flicker maxillaryHasRemovables off/on,
  // which would cascade into maxillaryRemovablesImpressionDone = false and hide the opposing accordion.
  const initialProductIsNonFixed = !hasRetentionOptions(state.initialProductDetails);
  // When tooth selection is optional for the card-0 product, there is nothing the
  // user is required to select on the chart — either because the only extraction is
  // the default (e.g. orthodontics "Teeth in mouth") or because every non-default
  // extraction is optional (e.g. night guard with optional "Missing tooth"). The
  // default extraction applies to all teeth. Such a product must count as "placed"
  // without an explicit tooth selection, and the "select a tooth to proceed" gate
  // must not apply.
  const card0ExtractionSelectionOptional = canSkipExtractionToothSelection(
    state.initialProductDetails?.extractions,
    state.initialProductDetails as Record<string, unknown> | null | undefined,
  );
  const card0DefaultToothChartEnabled = shouldSkipLegacyDefaultExtractionAutoSelect(
    state.initialProductDetails as Record<string, unknown> | null | undefined,
  );

  // Center badge: show the product's default extraction (name + its color) when one is
  // configured; otherwise fall back to the neutral "Teeth in mouth" beige badge.
  const centerDefaultExtraction = getDefaultExtractionStrict(
    state.initialProductDetails?.extractions
  );
  const centerBadgeLabel = centerDefaultExtraction?.name?.trim() || "Teeth in mouth";
  const centerBadgeColor = centerDefaultExtraction
    ? centerDefaultExtraction.color?.trim() ||
      getExtractionTypeColor(centerDefaultExtraction.name ?? "")
    : "#F3EBD7";
  const maxillaryHasRemovables = hasSelectionOnlyProductForArch("maxillary") ||
    (initialProductIsNonFixed && (props.initialArch === "maxillary" || props.initialArch === "both") && !!props.selectedProductId);
  const mandibularHasRemovables = hasSelectionOnlyProductForArch("mandibular") ||
    (initialProductIsNonFixed && (props.initialArch === "mandibular" || props.initialArch === "both") && !!props.selectedProductId);

  // Show panels/accordion as soon as a Fixed Restoration added product exists
  const maxillaryHasFixedAdded = (props.addedProducts ?? []).some((ap) => {
    if (ap.arch !== "maxillary") return false;
    return hasRetentionOptions(ap.product);
  });
  const mandibularHasFixedAdded = (props.addedProducts ?? []).some((ap) => {
    if (ap.arch !== "mandibular") return false;
    return hasRetentionOptions(ap.product);
  });

  // Show accordion when card 0 initial product is Fixed Restoration AND teeth have been selected
  const activeProductIsFixed = hasRetentionOptions(state.initialProductDetails);
  const activeProductIsRemovable = initialProductIsNonFixed;
  const maxillaryHasFixedCard0 =
    activeProductIsFixed &&
    ((card0DefaultToothChartEnabled &&
      !!props.selectedProductId &&
      (props.initialArch === "maxillary" || props.initialArch === "both")) ||
      Object.keys(state.maxillaryRetentionTypes).some(
        (tn) => state.getToothProductCard("maxillary", Number(tn)) === 0,
      ));
  const mandibularHasFixedCard0 =
    activeProductIsFixed &&
    ((card0DefaultToothChartEnabled &&
      !!props.selectedProductId &&
      (props.initialArch === "mandibular" || props.initialArch === "both")) ||
      Object.keys(state.mandibularRetentionTypes || {}).some(
        (tn) => state.getToothProductCard("mandibular", Number(tn)) === 0,
      ));
  // Both-arch slip creation: guided upper-first flow (one active chart at a time).
  // Disabled for preloaded states (add-new-stage / edit-slip) where teeth and fields are
  // already configured — both panels must be visible and interactive from the start.
  const guidedBothArchSlipCreation =
    !props.caseSubmitted && props.initialArch === "both" && !!props.selectedProductId && !props.preloadInitialSlipState;
  const guidedBothArchPhase = state.guidedBothArchPhase;
  const guidedSelectionPhase =
    guidedBothArchPhase === "upper-selection" ||
    guidedBothArchPhase === "lower-selection";
  // Guided visibility gating: do both arches' tooth selections first, then reveal upper
  // fields, then lower fields.
  const guidedHideMaxillaryCard0Fields =
    guidedBothArchSlipCreation && guidedSelectionPhase;
  const guidedHideMandibularCard0Fields =
    guidedBothArchSlipCreation &&
    guidedBothArchPhase !== "lower-fields" &&
    guidedBothArchPhase !== "both-active";
  // Show accordion when card 0 initial product is Removable/Ortho — show immediately once product is selected,
  // no need to wait for teeth to be assigned (the accordion lets the user select teeth).
  // Gate each panel to its own arch so the opposite panel doesn't show a duplicate card 0 accordion
  // when the initial arch is single-sided and the other arch has its own added-product removable.
  const maxillaryHasRemovablesCard0 =
    activeProductIsRemovable &&
    !!props.selectedProductId &&
    (props.initialArch === "maxillary" || props.initialArch === "both");
  const mandibularHasRemovablesCard0 =
    activeProductIsRemovable &&
    !!props.selectedProductId &&
    (props.initialArch === "mandibular" || props.initialArch === "both");

  const maxillaryHasRemovablesTeeth =
    maxillaryHasRemovables &&
    (state.maxillaryTeeth.length > 0 ||
      (maxillaryHasRemovablesCard0 && card0ExtractionSelectionOptional));

  const mandibularHasRemovablesTeeth =
    mandibularHasRemovables &&
    (state.mandibularTeeth.length > 0 ||
      (mandibularHasRemovablesCard0 && card0ExtractionSelectionOptional));

  // Count teeth with real extraction codes (not TIM) — mirrors the red-label condition in the panels.
  // Used to disable the + Product buttons when the user hasn't selected any teeth yet.
  const MAXILLARY_ALL_TEETH_CDC = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const MANDIBULAR_ALL_TEETH_CDC = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  const maxillaryRemovableTeethSelected = maxillaryHasRemovablesCard0
    ? MAXILLARY_ALL_TEETH_CDC.filter(tn => { const code = state.maxillaryToothExtractionMap[tn]; return code && code !== "TIM"; }).length
    : 0;
  const mandibularRemovableTeethSelected = mandibularHasRemovablesCard0
    ? MANDIBULAR_ALL_TEETH_CDC.filter(tn => { const code = state.mandibularToothExtractionMap[tn]; return code && code !== "TIM"; }).length
    : 0;

  // Check removable teeth impression completion.
  // For Removables, fields (grade, stage, shade, impression) are stored under the representative
  // tooth (first tooth per product card), NOT every individual tooth. So we check completion
  // per product card rather than per tooth.
  const MAXILLARY_ALL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const MANDIBULAR_ALL = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  const MAXILLARY_SENTINEL = 1;
  const MANDIBULAR_SENTINEL = 17;

  /** Same tooth the accordion/readiness use for impression — not an unselected sentinel or wrong arch slot. */
  const resolveRemovableImpressionTooth = useCallback(
    (arch: "maxillary" | "mandibular", preferredTooth: number | null) => {
      const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const selectedTeeth = arch === "maxillary" ? state.maxillaryTeeth : state.mandibularTeeth;

      if (preferredTooth != null) {
        const cardId = state.getToothProductCard(arch, preferredTooth);
        const fromCard = getCardRepresentativeTooth({
          allTeeth,
          cardId,
          getToothProduct: state.getToothProduct,
          getToothProductCard: state.getToothProductCard,
          arch,
        });
        if (fromCard != null) return fromCard;
      }

      const primary = getPrimaryCardRepresentativeTooth({
        allTeeth,
        selectedTeeth,
        getToothProduct: state.getToothProduct,
        getToothProductCard: state.getToothProductCard,
        arch,
      });
      return primary ?? (arch === "maxillary" ? MAXILLARY_SENTINEL : MANDIBULAR_SENTINEL);
    },
    [state.maxillaryTeeth, state.mandibularTeeth, state.getToothProduct, state.getToothProductCard]
  );

  const getRepresentativeTeethForArch = (arch: "maxillary" | "mandibular") => {
    const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
    const selectedTeeth = arch === "maxillary" ? state.maxillaryTeeth : state.mandibularTeeth;
    return getRepresentativeTeethByCard({
      allTeeth,
      selectedTeeth,
      getToothProduct: state.getToothProduct,
      getToothProductCard: state.getToothProductCard,
      arch,
    });
  };

  // Use product assignment (incl. sentinel) — not only chart-selected teeth in maxillaryTeeth[]
  const maxillaryRepresentativeTeeth = maxillaryHasRemovables ? getRepresentativeTeethForArch("maxillary") : [];
  const mandibularRepresentativeTeeth = mandibularHasRemovables ? getRepresentativeTeethForArch("mandibular") : [];

  const hasRemovableAssignedOnArch = (arch: "maxillary" | "mandibular") =>
    (arch === "maxillary" ? maxillaryHasRemovables : mandibularHasRemovables) &&
    getRepresentativeTeethForArch(arch).length > 0;

  // True when the slip has at least one designed tooth/product assignment
  const hasAnyTooth =
    Object.keys(state.maxillaryRetentionTypes).length > 0 ||
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 ||
    maxillaryHasRemovablesTeeth ||
    mandibularHasRemovablesTeeth ||
    hasRemovableAssignedOnArch("maxillary") ||
    hasRemovableAssignedOnArch("mandibular");

  const allMaxillaryRemovablesComplete =
    !maxillaryHasRemovables ||
    maxillaryRepresentativeTeeth.every((tn) => state.isFieldCompleted("maxillary", tn, "impression"));

  const allMandibularRemovablesComplete =
    !mandibularHasRemovables ||
    mandibularRepresentativeTeeth.every((tn) => state.isFieldCompleted("mandibular", tn, "impression"));

  // True once the sentinel/rep tooth for removables card 0 has impression complete.
  // Only checks card 0 — added product cards having incomplete impressions must not block
  // the opposing product accordion from appearing.
  const getInitialRepresentativeTooth = (arch: "maxillary" | "mandibular"): number | null => {
    const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
    const selectedTeeth = arch === "maxillary" ? state.maxillaryTeeth : state.mandibularTeeth;
    return getPrimaryCardRepresentativeTooth({
      allTeeth,
      selectedTeeth,
      getToothProduct: state.getToothProduct,
      getToothProductCard: state.getToothProductCard,
      arch,
    });
  };

  const maxillaryRemovablesImpressionDone = (() => {
    if (!maxillaryHasRemovables) return false;
    const card0Rep = getInitialRepresentativeTooth("maxillary");
    if (card0Rep === null) return false;
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", card0Rep, step));
  })();

  const mandibularRemovablesImpressionDone = (() => {
    if (!mandibularHasRemovables) return false;
    const card0Rep = getInitialRepresentativeTooth("mandibular");
    if (card0Rep === null) return false;
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", card0Rep, step));
  })();

  // Gate for showing the opposing panel/accordion: teeth selected is enough, no need to wait for impression.
  const maxillaryTeethSelected = state.maxillaryTeeth.length > 0;
  const mandibularTeethSelected = state.mandibularTeeth.length > 0;

  // When both arches already have their own removables products, the opposing accordion is redundant.
  const bothArchesHaveProducts = maxillaryHasRemovables && mandibularHasRemovables;

  const slipHasMaxillaryProducts =
    Object.keys(state.maxillaryRetentionTypes).length > 0 ||
    maxillaryHasRemovables ||
    maxillaryHasFixedAdded ||
    maxillaryHasFixedCard0;

  const slipHasMandibularProducts =
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 ||
    mandibularHasRemovables ||
    mandibularHasFixedAdded ||
    mandibularHasRemovablesCard0;

  /** Multi-product slips: show maxillary + mandibular impression grids whenever both arches have work. */
  const slipHasProductsOnBothArches =
    slipHasMaxillaryProducts && slipHasMandibularProducts;

  // True when the initial product has an opposing section — either via opposite_impression flag
  // or via opposite_extractions being populated. Uses both signals so the panel shows even when
  // lab-specific opposite_extractions haven't been configured but the flag is set.
  const initialProductHasOppositeSection =
    state.initialProductDetails?.opposite_impression === "Yes" ||
    (state.initialProductDetails?.opposite_extractions?.length ?? 0) > 0;

  const opposingImpressionRequirement = getOpposingImpressionRequirement({
    initialArch: props.initialArch ?? "maxillary",
    hasOppositeSection: initialProductHasOppositeSection,
    oppositeImpressionEnabled: isOppositeImpressionEnabled(state.initialProductDetails),
    noOpposingNeeded: state.noOpposingNeeded ?? {},
    getCard0TeethForArch: (arch) =>
      arch === "maxillary" ? state.getMaxillaryCard0Teeth() : state.getMandibularCard0Teeth(),
  });

  const opposingImpressionComplete =
    !opposingImpressionRequirement.required ||
    opposingImpressionRequirement.arch == null ||
    opposingImpressionRequirement.tooth == null ||
    IMPRESSION_STEP_NAMES.some((step) =>
      state.isFieldCompleted(
        opposingImpressionRequirement.arch!,
        opposingImpressionRequirement.tooth!,
        step
      )
    );

  // For Fixed Restoration, impression is stored under a stable tooth in the product
  // group (the tooth that already has field progress, not always the lowest number).
  const getImpressionOwnerTooth = (arch: "maxillary" | "mandibular", toothNum: number): number => {
    const product = state.getToothProduct(arch, toothNum);
    const isFixed = hasRetentionOptions(product);
    if (!isFixed) return toothNum;
    const currentCard = state.getToothProductCard(arch, toothNum);
    const allTeeth = arch === "maxillary"
      ? Object.keys(state.maxillaryRetentionTypes).map(Number)
      : Object.keys(state.mandibularRetentionTypes || {}).map(Number);
    const productKey = product?.id ?? toothNum;
    const groupTeeth = allTeeth.filter((t) => {
      if (state.getToothProductCard(arch, t) !== currentCard) return false;
      return (state.getToothProduct(arch, t)?.id ?? t) === productKey;
    });
    if (groupTeeth.length === 0) return toothNum;
    const fixedChain = getRetentionFieldChain(product?.advance_fields, product);
    return resolveGroupStageToothNumber(
      groupTeeth,
      arch,
      fixedChain,
      state.isFieldCompleted,
      state.getFieldValue
    );
  };

  const applyImpressionCompletion = useCallback(
    (
      arch: "maxillary" | "mandibular",
      displayText: string,
      preferredTooth: number | null
    ) => {
      let product: ReturnType<typeof state.getToothProduct> = null;
      const lookupTooth =
        preferredTooth ?? resolveRemovableImpressionTooth(arch, null);
      product = state.getToothProduct(arch, lookupTooth);
      if (!product && state.currentImpressionProductId) {
        const archKeys =
          arch === "maxillary"
            ? Object.keys(state.maxillaryRetentionTypes || {})
            : Object.keys(state.mandibularRetentionTypes || {});
        for (const k of archKeys) {
          const p = state.getToothProduct(arch, Number(k));
          if (p?.id?.toString() === state.currentImpressionProductId) {
            product = p;
            break;
          }
        }
      }
      if (
        !product &&
        isNonRetentionCategory(state.initialProductDetails) &&
        state.initialProductDetails &&
        (state.initialProductDetails.id?.toString() ===
          state.currentImpressionProductId ||
          state.currentImpressionProductId === "0")
      ) {
        product = state.initialProductDetails;
      }

      const isFixed = hasRetentionOptions(product);
      if (isFixed) {
        if (preferredTooth === null) return;
        const ownerTooth = getImpressionOwnerTooth(arch, preferredTooth);
        state.completeFieldStep(arch, ownerTooth, "fixed_impression", displayText);
        return;
      }

      const impressionTooth = resolveRemovableImpressionTooth(arch, preferredTooth);
      const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      let needsStaleClear = false;
      for (const tn of allTeeth) {
        if (tn === impressionTooth) continue;
        const tnProduct = state.getToothProduct(arch, tn);
        if (
          !hasRetentionOptions(tnProduct) &&
          IMPRESSION_STEP_NAMES.some((step) =>
            state.isFieldCompleted(arch, tn, step)
          )
        ) {
          needsStaleClear = true;
          break;
        }
      }
      const alreadyOnRep = IMPRESSION_STEP_NAMES.some((step) =>
        state.isFieldCompleted(arch, impressionTooth, step)
      );
      const currentVal = state.getFieldValue(arch, impressionTooth, "impression");
      if (alreadyOnRep && currentVal === displayText && !needsStaleClear) {
        return;
      }
      for (const tn of allTeeth) {
        if (tn === impressionTooth) continue;
        const tnProduct = state.getToothProduct(arch, tn);
        if (
          !hasRetentionOptions(tnProduct) &&
          IMPRESSION_STEP_NAMES.some((step) =>
            state.isFieldCompleted(arch, tn, step)
          )
        ) {
          state.uncompleteFieldStep(arch, tn, "impression");
        }
      }
      state.completeFieldStep(arch, impressionTooth, "impression", displayText);
    },
    [
      state.completeFieldStep,
      state.uncompleteFieldStep,
      state.getToothProduct,
      state.isFieldCompleted,
      state.getFieldValue,
      resolveRemovableImpressionTooth,
      getImpressionOwnerTooth,
      state.currentImpressionProductId,
      state.initialProductDetails,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
    ]
  );

  const clearImpressionCompletion = useCallback(
    (arch: "maxillary" | "mandibular", preferredTooth: number | null) => {
      const lookupTooth =
        preferredTooth ?? resolveRemovableImpressionTooth(arch, null);
      let product = state.getToothProduct(arch, lookupTooth);
      if (!product && state.currentImpressionProductId) {
        const archKeys =
          arch === "maxillary"
            ? Object.keys(state.maxillaryRetentionTypes || {})
            : Object.keys(state.mandibularRetentionTypes || {});
        for (const k of archKeys) {
          const p = state.getToothProduct(arch, Number(k));
          if (p?.id?.toString() === state.currentImpressionProductId) {
            product = p;
            break;
          }
        }
      }

      const isFixed = hasRetentionOptions(product);
      if (isFixed) {
        if (preferredTooth === null) return;
        const ownerTooth = getImpressionOwnerTooth(arch, preferredTooth);
        state.uncompleteFieldStep(arch, ownerTooth, "fixed_impression");
        return;
      }
      const impressionTooth = resolveRemovableImpressionTooth(arch, preferredTooth);
      state.uncompleteFieldStep(arch, impressionTooth, "impression");
    },
    [
      state.getToothProduct,
      state.uncompleteFieldStep,
      resolveRemovableImpressionTooth,
      getImpressionOwnerTooth,
      state.currentImpressionProductId,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
    ]
  );

  const resolveImpressionLabelForArch = useCallback(
    (arch: "maxillary" | "mandibular", productId: string, code: string) => {
      const repTooth = resolveRemovableImpressionTooth(arch, null);
      const product = resolveProductForImpression(
        arch,
        productId,
        state.getToothProduct,
        state.initialProductDetails,
        repTooth
      );
      const catalog = collectImpressionCatalogForArch(
        arch,
        state.getToothProduct,
        arch === "maxillary"
          ? state.maxillaryRetentionTypes
          : state.mandibularRetentionTypes,
        props.addedProducts,
        state.initialProductDetails,
        props.initialArch
      );
      const options = buildImpressionModalOptions(
        arch,
        state.selectedImpressions,
        catalog,
        mockImpressions
      );
      return resolveImpressionName(code, options);
    },
    [
      resolveRemovableImpressionTooth,
      state.getToothProduct,
      state.initialProductDetails,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
      props.addedProducts,
      props.initialArch,
      state.selectedImpressions,
    ]
  );

  /** Dual-grid impression modal (maxillary + mandibular sections). */
  const impressionModalShowsDualArches = useMemo(() => {
    if (slipHasProductsOnBothArches) return true;
    if (
      props.initialArch === "both" &&
      isNonRetentionCategory(state.initialProductDetails)
    ) {
      return true;
    }
    return (
      props.initialArch !== "both" &&
      isNonRetentionCategory(state.initialProductDetails) &&
      initialProductHasOppositeSection &&
      isOppositeImpressionEnabled(state.initialProductDetails)
    );
  }, [
    slipHasProductsOnBothArches,
    props.initialArch,
    state.initialProductDetails,
    initialProductHasOppositeSection,
  ]);

  const slipWideImpressionCatalog = useMemo(
    () =>
      collectSlipWideImpressionCatalog(
        state.getToothProduct,
        state.maxillaryRetentionTypes,
        state.mandibularRetentionTypes,
        props.addedProducts,
        state.initialProductDetails,
        props.initialArch
      ),
    [
      state.getToothProduct,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
      props.addedProducts,
      state.initialProductDetails,
      props.initialArch,
    ]
  );

  const impressionModalCatalog = useMemo(() => {
    if (impressionModalShowsDualArches) {
      return slipWideImpressionCatalog;
    }
    const arch = state.currentImpressionArch;
    return collectImpressionCatalogForArch(
      arch,
      state.getToothProduct,
      arch === "maxillary"
        ? state.maxillaryRetentionTypes
        : state.mandibularRetentionTypes,
      props.addedProducts,
      state.initialProductDetails,
      props.initialArch
    );
  }, [
    impressionModalShowsDualArches,
    slipWideImpressionCatalog,
    state.currentImpressionArch,
    state.getToothProduct,
    state.maxillaryRetentionTypes,
    state.mandibularRetentionTypes,
    props.addedProducts,
    state.initialProductDetails,
    props.initialArch,
  ]);

  const impressionModalOptions = useMemo(
    () =>
      buildImpressionModalOptions(
        state.currentImpressionArch,
        state.selectedImpressions,
        impressionModalCatalog,
        mockImpressions
      ),
    [
      state.currentImpressionArch,
      state.selectedImpressions,
      impressionModalCatalog,
    ]
  );

  const oppositeImpressionModalOptions = useMemo(() => {
    const arch = state.currentImpressionArch;
    const opposingArch = arch === "maxillary" ? "mandibular" : "maxillary";
    const catalog = impressionModalShowsDualArches
      ? slipWideImpressionCatalog
      : collectImpressionCatalogForArch(
          opposingArch,
          state.getToothProduct,
          opposingArch === "maxillary"
            ? state.maxillaryRetentionTypes
            : state.mandibularRetentionTypes,
          props.addedProducts,
          state.initialProductDetails,
          props.initialArch
        );
    return buildImpressionModalOptions(
      opposingArch,
      state.selectedImpressions,
      catalog,
      mockImpressions
    );
  }, [
    impressionModalShowsDualArches,
    slipWideImpressionCatalog,
    state.currentImpressionArch,
    state.getToothProduct,
    state.maxillaryRetentionTypes,
    state.mandibularRetentionTypes,
    props.addedProducts,
    state.initialProductDetails,
    props.initialArch,
    state.selectedImpressions,
  ]);

  // Re-attach impression completion when representative teeth move (e.g. after extractions).
  const maxillaryRepKey = maxillaryRepresentativeTeeth.join(",");
  const mandibularRepKey = mandibularRepresentativeTeeth.join(",");

  const primarySlipArch: "maxillary" | "mandibular" =
    props.initialArch === "mandibular" ? "mandibular" : "maxillary";
  const isSingleArchRemovableWithOpposing =
    props.initialArch !== "both" &&
    isNonRetentionCategory(state.initialProductDetails) &&
    initialProductHasOppositeSection;

  /** Opposing-row impressions on a single-arch slip store field progress on the primary arch. */
  const resolveImpressionCompletionTarget = useCallback(
    (modalArch: "maxillary" | "mandibular", preferredTooth: number | null) => {
      if (isSingleArchRemovableWithOpposing && modalArch !== primarySlipArch) {
        return {
          arch: primarySlipArch,
          tooth: resolveRemovableImpressionTooth(primarySlipArch, null),
        };
      }
      return { arch: modalArch, tooth: preferredTooth };
    },
    [isSingleArchRemovableWithOpposing, primarySlipArch, resolveRemovableImpressionTooth]
  );

  const isCard0RemovableOnArch = useCallback(
    (arch: "maxillary" | "mandibular") => {
      if (
        !state.initialProductDetails ||
        hasRetentionOptions(state.initialProductDetails)
      ) {
        return false;
      }
      if (props.initialArch === "maxillary" && arch === "mandibular") return false;
      if (props.initialArch === "mandibular" && arch === "maxillary") return false;
      return true;
    },
    [props.initialArch, state.initialProductDetails]
  );

  const applyArchWideImpressionCompletion = useCallback(
    (
      modalArch: "maxillary" | "mandibular",
      displayText: string,
      preferredTooth: number | null
    ) => {
      const { arch: completionArch } = resolveImpressionCompletionTarget(
        modalArch,
        preferredTooth
      );
      const allTeeth =
        completionArch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const cardIds = listRemovableCardIdsOnArch(
        completionArch,
        props.addedProducts ?? [],
        isCard0RemovableOnArch(completionArch)
      );
      for (const cardId of cardIds) {
        const repTooth = getRepToothForRemovableCard(
          completionArch,
          cardId,
          allTeeth,
          state.getToothProductCard,
          state.getToothProduct
        );
        applyImpressionCompletion(completionArch, displayText, repTooth);
      }

      const retentionTypes =
        completionArch === "maxillary"
          ? state.maxillaryRetentionTypes
          : state.mandibularRetentionTypes ?? {};
      const seenFixedOwners = new Set<number>();
      for (const tn of Object.keys(retentionTypes).map(Number)) {
        const product = state.getToothProduct(completionArch, tn);
        if (!hasRetentionOptions(product)) continue;
        const owner = getImpressionOwnerTooth(completionArch, tn);
        if (seenFixedOwners.has(owner)) continue;
        seenFixedOwners.add(owner);
        applyImpressionCompletion(completionArch, displayText, owner);
      }
    },
    [
      resolveImpressionCompletionTarget,
      props.addedProducts,
      isCard0RemovableOnArch,
      state.getToothProductCard,
      state.getToothProduct,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
      applyImpressionCompletion,
      getImpressionOwnerTooth,
    ]
  );

  const applyArchWideImpressionClear = useCallback(
    (
      modalArch: "maxillary" | "mandibular",
      preferredTooth: number | null
    ) => {
      const { arch: completionArch } = resolveImpressionCompletionTarget(
        modalArch,
        preferredTooth
      );
      const allTeeth =
        completionArch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const cardIds = listRemovableCardIdsOnArch(
        completionArch,
        props.addedProducts ?? [],
        isCard0RemovableOnArch(completionArch)
      );
      for (const cardId of cardIds) {
        const repTooth = getRepToothForRemovableCard(
          completionArch,
          cardId,
          allTeeth,
          state.getToothProductCard,
          state.getToothProduct
        );
        clearImpressionCompletion(completionArch, repTooth);
      }

      const retentionTypes =
        completionArch === "maxillary"
          ? state.maxillaryRetentionTypes
          : state.mandibularRetentionTypes ?? {};
      const seenFixedOwners = new Set<number>();
      for (const tn of Object.keys(retentionTypes).map(Number)) {
        const product = state.getToothProduct(completionArch, tn);
        if (!hasRetentionOptions(product)) continue;
        const owner = getImpressionOwnerTooth(completionArch, tn);
        if (seenFixedOwners.has(owner)) continue;
        seenFixedOwners.add(owner);
        clearImpressionCompletion(completionArch, owner);
      }
    },
    [
      resolveImpressionCompletionTarget,
      props.addedProducts,
      isCard0RemovableOnArch,
      state.getToothProductCard,
      state.getToothProduct,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
      clearImpressionCompletion,
      getImpressionOwnerTooth,
    ]
  );

  const applyImpressionCompletionRef = useRef(applyArchWideImpressionCompletion);
  applyImpressionCompletionRef.current = applyArchWideImpressionCompletion;
  const resolveImpressionLabelForArchRef = useRef(resolveImpressionLabelForArch);
  resolveImpressionLabelForArchRef.current = resolveImpressionLabelForArch;
  const resolveImpressionCompletionTargetRef = useRef(resolveImpressionCompletionTarget);
  resolveImpressionCompletionTargetRef.current = resolveImpressionCompletionTarget;

  useEffect(() => {
    // Only re-attach when representative teeth move — saves go through onImpressionConfirm.
    if (state.showImpressionModal) return;

    for (const arch of ["maxillary", "mandibular"] as const) {
      if ((state.selectedImpressions[arch]?.length ?? 0) === 0) {
        continue;
      }

      const displayText = buildImpressionDisplayText(state.selectedImpressions, arch);
      if (!displayText) continue;
      applyImpressionCompletionRef.current(arch, displayText, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-attach when rep teeth move; saves use onImpressionConfirm
  }, [maxillaryRepKey, mandibularRepKey]);

  const hasMaxillaryProducts =
    Object.keys(state.maxillaryRetentionTypes).length > 0 || maxillaryHasRemovablesTeeth;

  const hasMandibularProducts =
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 || mandibularHasRemovablesTeeth;

  const hasMaxillaryArchImpressionSelected =
    (state.selectedImpressions.maxillary?.length ?? 0) > 0;
  const hasMandibularArchImpressionSelected =
    (state.selectedImpressions.mandibular?.length ?? 0) > 0;

  // Main-side validation only: opposing impressions are optional and never blocking.
  const requireMaxillaryImpression =
    hasMaxillaryProducts &&
    (props.initialArch === "maxillary" || props.initialArch === "both");
  const requireMandibularImpression =
    hasMandibularProducts &&
    (props.initialArch === "mandibular" || props.initialArch === "both");

  const allTeethImpressionComplete =
    hasAnyTooth &&
    (!requireMaxillaryImpression || hasMaxillaryArchImpressionSelected) &&
    (!requireMandibularImpression || hasMandibularArchImpressionSelected);

  // Impression incomplete check is driven by common arch impression model.
  const hasIncompleteAccordion =
    (requireMaxillaryImpression && !hasMaxillaryArchImpressionSelected) ||
    (requireMandibularImpression && !hasMandibularArchImpressionSelected);

  // Build unique products list for add-ons/rush modal tabs
  const caseProducts = useMemo(() => {
    const seen = new Map<number, { name: string; addons?: import("../types").ProductAddon[] }>();
    // First try from tooth products (most accurate — includes addons)
    const allTeethKeys = [
      ...Object.keys(state.maxillaryRetentionTypes).map((t) => ({ arch: "maxillary" as const, tn: Number(t) })),
      ...Object.keys(state.mandibularRetentionTypes || {}).map((t) => ({ arch: "mandibular" as const, tn: Number(t) })),
    ];
    for (const { arch, tn } of allTeethKeys) {
      const product = state.getToothProduct(arch, tn);
      if (product?.id && !seen.has(product.id)) {
        seen.set(product.id, { name: product.name, addons: product.addons });
      }
    }
    // Fallback: include the initial selected product (card 0) if not yet found from teeth
    if (props.selectedProductId && !seen.has(props.selectedProductId) && props.selectedProductName) {
      seen.set(props.selectedProductId, { name: props.selectedProductName });
    }
    // Fallback: also include products from addedProducts (covers cases where toothProducts hasn't loaded yet)
    for (const ap of (props.addedProducts ?? [])) {
      const pid = ap.productId ?? ap.product?.id;
      const pname = ap.product?.name || ap.product?.subcategory?.name || "";
      if (pid && !seen.has(pid) && pname) {
        seen.set(pid, { name: pname, addons: ap.product?.addons });
      }
    }
    return Array.from(seen.entries()).map(([id, { name, addons }]) => ({ id, name, addons }));
  }, [state.maxillaryRetentionTypes, state.mandibularRetentionTypes, state.getToothProduct, props.selectedProductId, props.selectedProductName, props.addedProducts]);

  const rushArchSlots = useMemo(
    () =>
      buildRushArchSlots({
        getToothProduct: state.getToothProduct,
        getToothProductCard: state.getToothProductCard,
        maxillaryRetentionTypes: state.maxillaryRetentionTypes,
        mandibularRetentionTypes: state.mandibularRetentionTypes ?? {},
        maxillaryTeeth: state.maxillaryTeeth,
        mandibularTeeth: state.mandibularTeeth ?? [],
        selectedStages: state.selectedStages,
        getFieldValue: state.getFieldValue,
      }),
    [
      state.getToothProduct,
      state.getToothProductCard,
      state.maxillaryRetentionTypes,
      state.mandibularRetentionTypes,
      state.maxillaryTeeth,
      state.mandibularTeeth,
      state.selectedStages,
      state.getFieldValue,
    ]
  );

  const rushSlotDeliveryDates = useRushSlotDeliveryDates(rushArchSlots);

  const rushArchSlotsWithDelivery = useMemo(
    () =>
      rushArchSlots.map((slot) => {
        const apiDate = rushSlotDeliveryDates[slot.rushKey];
        return apiDate ? { ...slot, actualDeliveryDate: apiDate } : slot;
      }),
    [rushArchSlots, rushSlotDeliveryDates]
  );

  const addOnArchSlots = useMemo(
    () =>
      rushArchSlots.filter((slot) =>
        productSupportsAddons(state.getToothProduct(slot.arch, slot.repTooth))
      ),
    [rushArchSlots, state.getToothProduct]
  );

  const caseHasAddons = addOnArchSlots.length > 0;

  // Collect unique stage names from all tooth products for the attachment modal
  const caseStages = useMemo(() => {
    const stageSet = new Set<string>();
    const allTeethKeys = [
      ...Object.keys(state.maxillaryRetentionTypes).map((t) => ({ arch: "maxillary" as const, tn: Number(t) })),
      ...Object.keys(state.mandibularRetentionTypes || {}).map((t) => ({ arch: "mandibular" as const, tn: Number(t) })),
    ];
    for (const { arch, tn } of allTeethKeys) {
      const product = state.getToothProduct(arch, tn);
      if (product?.stages) {
        for (const s of product.stages) {
          if (s.name) stageSet.add(s.name);
        }
      }
    }
    return Array.from(stageSet);
  }, [state.maxillaryRetentionTypes, state.mandibularRetentionTypes, state.getToothProduct]);

  // Compute a human-readable label for the first incomplete required field across all teeth.
  // For Fixed Restoration, shades are stored per product group (under fixed_${firstToothNumber}), not per tooth — validate once per group.
  const incompleteFieldLabel = (() => {
    const allArchTeeth: Array<{ arch: "maxillary" | "mandibular"; toothNum: number }> = [
      ...Object.keys(state.maxillaryRetentionTypes).map((t) => ({ arch: "maxillary" as const, toothNum: Number(t) })),
      ...Object.keys(state.mandibularRetentionTypes || {}).map((t) => ({ arch: "mandibular" as const, toothNum: Number(t) })),
    ];
    // Group teeth by arch and product so we check shade once per group (using first tooth in group)
    const processedGroups = new Set<string>();
    for (const { arch, toothNum } of allArchTeeth) {
      const product = state.getToothProduct(arch, toothNum);
      const isFixedRestoration = hasRetentionOptions(product);
      const productKey = product?.id ?? toothNum;
      const groupKey = `${arch}_${productKey}`;

      if (isFixedRestoration && !processedGroups.has(groupKey)) {
        processedGroups.add(groupKey);
        // Find all teeth in this arch with the same product; shade is stored under fixed_${firstTooth}
        const teethInGroup = allArchTeeth.filter(
          (t) => t.arch === arch && (state.getToothProduct(t.arch, t.toothNum)?.id ?? t.toothNum) === productKey
        ).map((t) => t.toothNum);
        const shadeProductId = product?.id
          ? `fixed_p_${product.id}`
          : `fixed_${Math.min(...teethInGroup)}`;
        const missingShadeField = getMissingFixedShadeField(product, shadeProductId, arch);
        if (missingShadeField) return missingShadeField;
      }

      const hasArchImpression =
        arch === "maxillary"
          ? hasMaxillaryArchImpressionSelected
          : hasMandibularArchImpressionSelected;
      const isRequiredArch =
        arch === "maxillary" ? requireMaxillaryImpression : requireMandibularImpression;
      if (isRequiredArch && !hasArchImpression) return "Impression";
    }

    if (requireMaxillaryImpression && !hasMaxillaryArchImpressionSelected) return "Impression";
    if (requireMandibularImpression && !hasMandibularArchImpressionSelected) return "Impression";

    return null;
  })();

  // True when any maxillary tooth has an incomplete required field (shade or impression).
  // For Fixed Restoration, shades are per product group (fixed_${firstToothInGroup}).
  const maxillaryIncomplete = (() => {
    const maxillaryTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
    const processedShadeGroups = new Set<string>();
    for (const n of maxillaryTeeth) {
      const product = state.getToothProduct("maxillary", n);
      if (hasRetentionOptions(product)) {
        const productKey = String(product?.id ?? n);
        if (!processedShadeGroups.has(productKey)) {
          processedShadeGroups.add(productKey);
          const shadeId = product?.id
            ? `fixed_p_${product.id}`
            : `fixed_${Math.min(
                ...maxillaryTeeth.filter(
                  (t) => String(state.getToothProduct("maxillary", t)?.id ?? t) === productKey
                )
              )}`;
          if (getMissingFixedShadeField(product, shadeId, "maxillary")) return true;
        }
      }
      // Fixed restoration products use fixed_impression field step (not arch-level selectedImpressions)
      if (requireMaxillaryImpression && !hasMaxillaryArchImpressionSelected && !hasRetentionOptions(product)) return true;
    }
    return false;
  })();

  const mandibularIncomplete = (() => {
    const mandibularTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
    const processedShadeGroups = new Set<string>();
    for (const n of mandibularTeeth) {
      const product = state.getToothProduct("mandibular", n);
      if (hasRetentionOptions(product)) {
        const productKey = String(product?.id ?? n);
        if (!processedShadeGroups.has(productKey)) {
          processedShadeGroups.add(productKey);
          const shadeId = product?.id
            ? `fixed_p_${product.id}`
            : `fixed_${Math.min(
                ...mandibularTeeth.filter(
                  (t) => String(state.getToothProduct("mandibular", t)?.id ?? t) === productKey
                )
              )}`;
          if (getMissingFixedShadeField(product, shadeId, "mandibular")) return true;
        }
      }
      // Fixed restoration products use fixed_impression field step (not arch-level selectedImpressions)
      if (requireMandibularImpression && !hasMandibularArchImpressionSelected && !hasRetentionOptions(product)) return true;
    }
    return false;
  })();

  // True when the arch has products AND all of them have completed their accordion fields.
  // The "+ Add Product" button only shows after the first product accordion is fully complete.
  // Fixed-restoration-only arches don't use the arch-level impression modal (they have fixed_impression
  // field steps instead), so skip the arch impression check when there are no removable teeth.
  const allMaxillaryAccordionsComplete =
    hasMaxillaryProducts &&
    (!requireMaxillaryImpression || !maxillaryHasRemovablesTeeth || hasMaxillaryArchImpressionSelected);

  const allMandibularAccordionsComplete =
    hasMandibularProducts &&
    (!requireMandibularImpression || !mandibularHasRemovablesTeeth || hasMandibularArchImpressionSelected);

  // ── Removable restoration: pre-assign sentinel tooth so accordion shows immediately ──
  // When a removables product is active and no teeth have been assigned yet, assign the
  // sentinel tooth to card 0 so the accordion renders without requiring the user to click teeth.
  //
  // Gate on the SAME flag the card-0 accordion render uses (`*HasRemovablesCard0`) rather than
  // `activeProductIsRemovables*`. The latter additionally requires `activeProductCardId === 0`,
  // so when another card is active the sentinel was never assigned and the card silently failed
  // to render. Removables with a non-TIM default mask this (they auto-select all teeth), but
  // TIM-default products (orthodontics, sport/night guards) never auto-select, so the card-0
  // accordion never appeared. Fall back to the initial product id when no explicit id is set.
  const card0RemovableProductId = props.selectedProductId ?? state.initialProductDetails?.id;
  // Assign the sentinel tooth to card 0 so the accordion renders without the user
  // clicking teeth. When the initial product details are already loaded, assign them
  // synchronously (so the card appears immediately, not after the async fetch resolves),
  // then call fetchAndAssignProduct to enrich (stage/addons/impressions). This makes
  // TIM-default products (orthodontics, sport/night guards) render their card exactly
  // like removables, which always have a product on card 0.
  const assignCard0Sentinel = useCallback(
    (arch: "maxillary" | "mandibular", sentinel: number) => {
      if (card0RemovableProductId == null) return;
      if (state.getToothProduct(arch, sentinel)) return;
      state.setToothProductCard(arch, sentinel, 0);
      if (state.initialProductDetails) {
        state.setToothProduct(arch, sentinel, state.initialProductDetails);
      }
      state.fetchAndAssignProduct(arch, sentinel, card0RemovableProductId);
    },
    [
      card0RemovableProductId,
      state.getToothProduct,
      state.setToothProductCard,
      state.setToothProduct,
      state.fetchAndAssignProduct,
      state.initialProductDetails,
    ]
  );

  useEffect(() => {
    if (maxillaryHasRemovablesCard0) assignCard0Sentinel("maxillary", MAXILLARY_SENTINEL);
  }, [maxillaryHasRemovablesCard0, assignCard0Sentinel]);

  useEffect(() => {
    if (mandibularHasRemovablesCard0) assignCard0Sentinel("mandibular", MANDIBULAR_SENTINEL);
  }, [mandibularHasRemovablesCard0, assignCard0Sentinel]);

  // ── Catch-up: assign product to card 0 teeth that have retention types but no product ──
  // This handles cases where teeth were clicked before the product was ready, or rapid clicks
  // caused some teeth to miss the fetchAndAssignProduct call in handleSelectRetentionType.
  useEffect(() => {
    if (!props.selectedProductId) return;
    const allRetentionTeeth = [
      ...Object.keys(state.maxillaryRetentionTypes).map((t) => ({ arch: "maxillary" as const, tn: Number(t) })),
      ...Object.keys(state.mandibularRetentionTypes).map((t) => ({ arch: "mandibular" as const, tn: Number(t) })),
    ];
    for (const { arch, tn } of allRetentionTeeth) {
      if (state.getToothProductCard(arch, tn) !== 0) continue; // only card 0
      if (state.getToothProduct(arch, tn)) continue; // already has product
      state.fetchAndAssignProduct(arch, tn, props.selectedProductId);
    }
  }, [state.maxillaryRetentionTypes, state.mandibularRetentionTypes, props.selectedProductId]);

  // ── Note: no sentinel tooth assignment for added removable products ──
  // Added removable product accordions render even with 0 teeth assigned
  // (the `!isApRemovables && cardTeeth.length === 0` guard in the panels skips only fixed products).
  // Product data for display comes from `ap.product` in the addedProducts array.
  // Teeth get assigned to the added card when the user clicks them on the chart while the card is active.

  useEffect(() => {
    props.onIncompleteFieldChange?.(incompleteFieldLabel);
  }, [incompleteFieldLabel]);

  const productFieldsVisible =
    maxillaryHasImpression ||
    mandibularHasImpression ||
    maxillaryHasRemovables ||
    mandibularHasRemovables ||
    maxillaryHasFixedAdded ||
    mandibularHasFixedAdded ||
    maxillaryHasFixedCard0 ||
    mandibularHasFixedCard0 ||
    (initialProductHasOppositeSection &&
      props.initialArch === "mandibular" &&
      mandibularTeethSelected) ||
    (initialProductHasOppositeSection &&
      props.initialArch === "maxillary" &&
      maxillaryTeethSelected);

  const slipHeaderCompact = !props.caseSubmitted && productFieldsVisible;

  useEffect(() => {
    props.onSlipHeaderCompactChange?.(slipHeaderCompact);
  }, [slipHeaderCompact, props.onSlipHeaderCompactChange]);

  const showProductDetails = props.caseSubmitted || productFieldsVisible;

  const maxillaryRemovableBlocked =
    maxillaryHasRemovablesCard0 &&
    maxillaryRemovableTeethSelected === 0 &&
    !card0ExtractionSelectionOptional;
  const mandibularRemovableBlocked =
    mandibularHasRemovablesCard0 &&
    mandibularRemovableTeethSelected === 0 &&
    !card0ExtractionSelectionOptional;

  const maxillarySideReady =
    hasMaxillaryProducts &&
    allMaxillaryAccordionsComplete &&
    !maxillaryIncomplete &&
    !maxillaryRemovableBlocked;

  const mandibularSideReady =
    hasMandibularProducts &&
    allMandibularAccordionsComplete &&
    !mandibularIncomplete &&
    !mandibularRemovableBlocked;

  const slipValidationComplete = computeSlipValidationComplete({
    hasMaxillaryProducts,
    hasMandibularProducts,
    maxillarySideReady,
    mandibularSideReady,
    hasToothStatusValidation,
  });

  // Notify parent whenever slip validation changes (summary + submit visibility)
  useEffect(() => {
    props.onReadinessChange?.(slipValidationComplete);
  }, [slipValidationComplete]);

  // When maxillary shade/impression completes (maxillaryIncomplete: true → false) in any
  // both-arch case, advance to the lower-fields phase or focus the mandibular accordion.
  const prevMaxillaryIncompleteRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = prevMaxillaryIncompleteRef.current;
    prevMaxillaryIncompleteRef.current = maxillaryIncomplete;
    if (prev !== true || maxillaryIncomplete) return;
    if (props.initialArch !== "both" || !hasMandibularProducts) return;
    if (state.guidedBothArches) {
      // Guided create-slip flow: advance from "upper-fields" → "lower-fields" and focus mandibular.
      state.triggerLowerFieldsPhase();
    } else {
      // Preloaded flow (add-new-stage): both panels already visible — just focus mandibular.
      state.focusAccordion("mandibular", "removable0", 0);
    }
  }, [maxillaryIncomplete, props.initialArch, hasMandibularProducts, state.guidedBothArches, state.triggerLowerFieldsPhase, state.focusAccordion]);

  const maxillaryAtProductLimit = isArchAtProductLimit("maxillary", {
    initialArch: props.initialArch,
    selectedProductId: props.selectedProductId,
    addedProducts: props.addedProducts,
  });
  const mandibularAtProductLimit = isArchAtProductLimit("mandibular", {
    initialArch: props.initialArch,
    selectedProductId: props.selectedProductId,
    addedProducts: props.addedProducts,
  });

  const showMaxillaryProductButton = canShowAddProductButton({
    arch: "maxillary",
    initialArch: props.initialArch,
    hasProductsOnArch: hasMaxillaryProducts,
    allAccordionsCompleteOnArch: allMaxillaryAccordionsComplete,
    archIncomplete: maxillaryIncomplete,
    removableCard0Blocked: maxillaryRemovableBlocked,
    oppositeArchHasProducts: hasMandibularProducts,
    oppositeArchReady: mandibularSideReady,
    inlineAddProductArch: props.inlineAddProductArch ?? null,
    caseSubmitted: props.caseSubmitted,
    atProductLimit: maxillaryAtProductLimit,
  });

  const showMandibularProductButton = canShowAddProductButton({
    arch: "mandibular",
    initialArch: props.initialArch,
    hasProductsOnArch: hasMandibularProducts,
    allAccordionsCompleteOnArch: allMandibularAccordionsComplete,
    archIncomplete: mandibularIncomplete,
    removableCard0Blocked: mandibularRemovableBlocked,
    oppositeArchHasProducts: hasMaxillaryProducts,
    oppositeArchReady: maxillarySideReady,
    inlineAddProductArch: props.inlineAddProductArch ?? null,
    caseSubmitted: props.caseSubmitted,
    atProductLimit: mandibularAtProductLimit,
  });

  const maxillaryExcludedProductIds = useMemo(() => {
    const ids = new Set<number>();
    if (
      props.selectedProductId &&
      (props.initialArch === "maxillary" || props.initialArch === "both")
    ) {
      ids.add(props.selectedProductId);
    }
    for (const ap of props.addedProducts ?? []) {
      if (ap.arch !== "maxillary") continue;
      if (ap.productId) ids.add(ap.productId);
    }
    return [...ids];
  }, [props.selectedProductId, props.initialArch, props.addedProducts]);

  const maxillaryExcludedSubcategoryIds = useMemo(() => {
    const ids = new Set<number>();
    const initialSubId = Number(state.initialProductDetails?.subcategory?.id);
    if (
      Number.isFinite(initialSubId) &&
      initialSubId > 0 &&
      (props.initialArch === "maxillary" || props.initialArch === "both")
    ) {
      ids.add(initialSubId);
    }
    for (const ap of props.addedProducts ?? []) {
      if (ap.arch !== "maxillary") continue;
      const sid = Number(ap.product?.subcategory?.id);
      if (Number.isFinite(sid) && sid > 0) ids.add(sid);
    }
    return [...ids];
  }, [state.initialProductDetails, props.initialArch, props.addedProducts]);

  const mandibularExcludedProductIds = useMemo(() => {
    const ids = new Set<number>();
    if (
      props.selectedProductId &&
      (props.initialArch === "mandibular" || props.initialArch === "both")
    ) {
      ids.add(props.selectedProductId);
    }
    for (const ap of props.addedProducts ?? []) {
      if (ap.arch !== "mandibular") continue;
      if (ap.productId) ids.add(ap.productId);
    }
    return [...ids];
  }, [props.selectedProductId, props.initialArch, props.addedProducts]);

  const mandibularExcludedSubcategoryIds = useMemo(() => {
    const ids = new Set<number>();
    const initialSubId = Number(state.initialProductDetails?.subcategory?.id);
    if (
      Number.isFinite(initialSubId) &&
      initialSubId > 0 &&
      (props.initialArch === "mandibular" || props.initialArch === "both")
    ) {
      ids.add(initialSubId);
    }
    for (const ap of props.addedProducts ?? []) {
      if (ap.arch !== "mandibular") continue;
      const sid = Number(ap.product?.subcategory?.id);
      if (Number.isFinite(sid) && sid > 0) ids.add(sid);
    }
    return [...ids];
  }, [state.initialProductDetails, props.initialArch, props.addedProducts]);

  useSlipProductCollector({
    state,
    props,
    maxillaryImplantDetail: maxillaryImplantDetailRef.current,
    mandibularImplantDetail: mandibularImplantDetailRef.current,
    maxillarySplintLinksRef,
    mandibularSplintLinksRef,
  });

  const inlineAddProductArch = props.inlineAddProductArch ?? null;
  const isAddingMaxillaryProduct = inlineAddProductArch === "maxillary";
  const isAddingMandibularProduct = inlineAddProductArch === "mandibular";
  const [showChangeProductConfirm, setShowChangeProductConfirm] = useState(false);
  const onBackToProducts = props.onBackToProducts;
  return (
    <>
    <ChangeProductConfirmModal
      open={showChangeProductConfirm}
      onCancel={() => setShowChangeProductConfirm(false)}
      onConfirm={() => {
        setShowChangeProductConfirm(false);
        onBackToProducts?.();
      }}
    />
    <div className="relative">
      {!props.caseSubmitted && props.onBackToProducts && (
        <BackToProductsControl
          onBackToProducts={() => setShowChangeProductConfirm(true)}
          hasIncompleteAccordion={hasIncompleteAccordion}
          className="absolute left-0 top-0 z-30"
        />
      )}
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10">
      <CaseDesignHeaderActions
        caseSubmitted={props.caseSubmitted}
        onAddMaxillaryProduct={() => props.onAddProduct?.("maxillary")}
        onAddMandibularProduct={() => props.onAddProduct?.("mandibular")}
        showMaxillaryProductButton={showMaxillaryProductButton}
        showMandibularProductButton={showMandibularProductButton}
        maxillaryHasExistingProducts={hasMaxillaryProducts}
        mandibularHasExistingProducts={hasMandibularProducts}
        showSelectTeethToReplaceMaxillary={showSelectTeethToReplaceMaxillary}
        showSelectTeethToReplaceMandibular={showSelectTeethToReplaceMandibular}
      />

        {/* Main two-panel layout - responsive */}
        <div className="relative">
        <AutoOpenSuppressionContext.Provider value={Boolean(props.suppressFieldAutoOpen)}>
        <div className="flex flex-col lg:flex-row">
          {/* LEFT PANEL - MAXILLARY */}
        <MaxillaryPanel
          slipInitialArch={props.initialArch ?? "maxillary"}
          activeAccordionKey={state.activeAccordionKey}
          forceOwnArchChartEnabled={false}
          guidedHideCard0Fields={guidedHideMaxillaryCard0Fields}
          initialProductName={state.initialProductDetails?.name}
          isAccordionExpanded={(slotId) => state.isAccordionExpanded("maxillary", slotId)}
          isAccordionEnabled={(slotId) => state.isAccordionEnabled("maxillary", slotId)}
          toggleAccordionFocus={(slotId, cardId) =>
            state.toggleAccordionFocus("maxillary", slotId, cardId)
          }
          onExtractionsDone={() => state.handleArchExtractionsDone("maxillary")}
          onRetentionDone={() => state.handleArchRetentionDone("maxillary")}
          showMaxillary={
              state.showMaxillary ||
              guidedBothArchSlipCreation ||
              (props.caseSubmitted && (state.maxillaryTeeth.length > 0 || Object.keys(state.maxillaryRetentionTypes).length > 0)) ||
              (initialProductHasOppositeSection && props.initialArch === "mandibular" && mandibularTeethSelected)
            }
            setShowMaxillary={state.setShowMaxillary}
            showDetails={showProductDetails}
          caseSubmitted={props.caseSubmitted}
          preloadInitialSlipState={props.preloadInitialSlipState}
          disabled={!props.caseSubmitted && isAddingMandibularProduct}
          // Tooth selection
          maxillaryTeeth={state.maxillaryTeeth}
          handleMaxillaryToothClick={state.handleMaxillaryToothClick}
          maxillaryRetentionTypes={state.maxillaryRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMaxillary}
          initialProductIsRemovable={
            initialProductIsNonFixed &&
            (props.initialArch === "maxillary" || props.initialArch === "both") &&
            !!props.selectedProductId
          }
          initialProductDetailsPending={state.initialProductDetailsPending}
          retentionOptions={state.initialProductDetails?.retention_options}
          card0Extractions={state.initialProductDetails?.extractions ?? []}
          card0InitialProduct={state.initialProductDetails}
          handleSelectRetentionType={state.handleSelectRetentionType}
          handleMaxillaryToothDeselect={state.handleMaxillaryToothDeselect}
          // Shade
          shadeSelectionState={state.shadeSelectionState}
          setShadeSelectionState={state.setShadeSelectionState}
          selectedShadeGuide={state.selectedShadeGuide}
          setSelectedShadeGuide={state.setSelectedShadeGuide}
          showShadeGuideDropdown={state.showShadeGuideDropdown}
          setShowShadeGuideDropdown={state.setShowShadeGuideDropdown}
          shadeGuideOptions={state.shadeGuideOptions}
          getSelectedShade={state.getSelectedShade}
          handleShadeSelect={state.handleShadeSelect}
          setSelectedShades={state.setSelectedShades}
          handleShadeFieldClick={state.handleShadeFieldClick}
          migrateFixedShadeProductId={state.migrateFixedShadeProductId}
          // Expansion
          expandedLeft={state.expandedLeft}
          setExpandedLeft={state.setExpandedLeft}
          // Rush
          rushedProducts={state.rushedProducts}
          // Modals
          handleOpenImpressionModal={state.handleOpenImpressionModal}
          handleOpenAddOnsModal={state.handleOpenAddOnsModal}
          handleOpenRushModal={state.handleOpenRushModal}
          handleOpenStageModal={state.handleOpenStageModal}
          setShowAttachModal={state.setShowAttachModal}
          getImpressionDisplayText={state.getImpressionDisplayText}
          selectedStages={state.selectedStages}
          // Added products
          addedProducts={state.addedProducts}
          toggleAddedProductExpanded={state.toggleAddedProductExpanded}
          collapseAllAddedProducts={state.collapseAllAddedProducts}
          handleRemoveAddedProduct={state.handleRemoveAddedProduct}
          // Active product card tracking
          activeProductCardId={state.activeProductCardId}
          setActiveProductCardId={state.setActiveProductCardId}
          getToothProductCard={state.getToothProductCard}
          // Tooth field progress (Prep/Pontic step-by-step)
          isFieldVisible={state.isFieldVisible}
          isFieldCompleted={state.isFieldCompleted}
          completeFieldStep={state.completeFieldStep}
          storeFieldValue={state.storeFieldValue}
          uncompleteFieldStep={state.uncompleteFieldStep}
          getFieldValue={state.getFieldValue}
          clearToothProgress={state.clearToothProgress}
          setToothProduct={state.setToothProduct}
          getToothProduct={state.getToothProduct}
          isProductLoading={state.isProductLoading}
          fetchAndAssignProduct={state.fetchAndAssignProduct}
          maxillaryToothExtractionMap={state.maxillaryToothExtractionMap}
          maxillaryClaspTeeth={state.maxillaryClaspTeeth}
          maxillaryNoActiveBoxTeeth={state.maxillaryNoActiveBoxTeeth}
          setMaxillaryNoActiveBoxTeeth={state.setMaxillaryNoActiveBoxTeeth}
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          canUseToothForActiveProduct={state.canUseToothForActiveProduct}
          selectAllMaxillaryTeeth={state.selectAllMaxillaryTeeth}
          onToothStatusValidationChange={handleToothStatusValidationChange}
          maxillaryHasFixedCard0={maxillaryHasFixedCard0}
          maxillaryHasRemovablesCard0={maxillaryHasRemovablesCard0}
          removablesImpressionDone={maxillaryRemovablesImpressionDone}
          noOpposingNeeded={state.noOpposingNeeded}
          selectedImpressions={state.selectedImpressions}
          opposingProductData={
            shouldShowOpposingProductMirror({
              initialProductHasOppositeSection,
              hostMatchesInitialArch: props.initialArch === "mandibular",
              primaryArchTeethSelected: mandibularTeethSelected,
              oppositeArch: "maxillary",
              initialArch: props.initialArch,
              selectedProductId: props.selectedProductId,
              addedProducts: props.addedProducts,
              bothArchesHaveRemovables: bothArchesHaveProducts,
            })
              ? state.initialProductDetails
              : null
          }
          opposingToothExtractionMap={state.opposingToothExtractionMap}
          opposingClaspTeeth={state.opposingClaspTeeth}
          opposingNoActiveBoxTeeth={state.opposingNoActiveBoxTeeth}
          setOpposingNoActiveBoxTeeth={state.setOpposingNoActiveBoxTeeth}
          opposingSelectedTeeth={state.opposingSelectedTeeth}
          onOpposingExtractionToggle={state.handleOpposingExtractionToggle}
          selectAllOpposingTeeth={state.selectAllOpposingTeeth}
          onImplantDetailChange={(detail) => {
            maxillaryImplantDetailRef.current = detail;
            setMaxillaryImplantDetailPeer(detail);
          }}
          initialImplantDetailByTooth={initialMaxillaryImplants}
          onImplantDetailCompleteChange={(complete) => setMaxillaryImplantCompletePeer(complete)}
          onSplintLinksChange={(linksByKey) => {
            maxillarySplintLinksRef.current = linksByKey;
          }}
          peerImplantDetailByTooth={mandibularImplantDetailPeer}
          peerImplantCompleteByTooth={mandibularImplantCompletePeer}
          onBackToCategories={props.onBackToCategories}
          confirmDetailsChecked={props.confirmDetailsChecked}
          addStageStageHistory={props.addStageContext?.historyByArch?.maxillary}
          isAnyModalOpen={state.showImpressionModal || state.isStageModalOpen}
          opposingOnlyLayout={props.initialArch !== "both"}
          showInlineAddProductPicker={props.inlineAddProductArch === "maxillary"}
          excludedProductIds={maxillaryExcludedProductIds}
          excludedSubcategoryIds={maxillaryExcludedSubcategoryIds}
          labCustomerId={props.labCustomerId}
          onInlineAddProductComplete={props.onInlineAddProductComplete}
          onInlineAddProductCancel={props.onInlineAddProductCancel}
          onShowSelectTeethToReplaceChange={setShowSelectTeethToReplaceMaxillary}
          selectedAddonsByTooth={state.selectedAddonsByTooth}
        />

        {/* CENTER NAVIGATION — default-extraction badge between arch panels */}
        <CenterNavigation label={centerBadgeLabel} backgroundColor={centerBadgeColor} />

        {/* RIGHT PANEL - MANDIBULAR */}
        <MandibularPanel
          slipInitialArch={props.initialArch ?? "maxillary"}
          activeAccordionKey={state.activeAccordionKey}
          forceOwnArchChartEnabled={false}
          guidedHideCard0Fields={guidedHideMandibularCard0Fields}
          initialProductName={state.initialProductDetails?.name}
          isAccordionExpanded={(slotId) => state.isAccordionExpanded("mandibular", slotId)}
          isAccordionEnabled={(slotId) => state.isAccordionEnabled("mandibular", slotId)}
          toggleAccordionFocus={(slotId, cardId) =>
            state.toggleAccordionFocus("mandibular", slotId, cardId)
          }
          onExtractionsDone={() => state.handleArchExtractionsDone("mandibular")}
          onRetentionDone={() => state.handleArchRetentionDone("mandibular")}
          showMandibular={
            // Guided both-arch creation: keep the lower chart hidden until the upper tooth
            // selection is done (phase advances past upper-selection); after that it stays
            // visible through the remaining phases. Ignore the default state.showMandibular
            // here so both arches don't appear up front.
            (guidedBothArchSlipCreation
              ? guidedBothArchPhase !== "upper-selection"
              : state.showMandibular) ||
            (props.caseSubmitted && (state.mandibularTeeth.length > 0 || Object.keys(state.mandibularRetentionTypes || {}).length > 0)) ||
            (initialProductHasOppositeSection && props.initialArch === "maxillary" && maxillaryTeethSelected && !userHidMandibular)
          }
          setShowMandibular={handleSetShowMandibular}
          showDetails={showProductDetails}
          preloadInitialSlipState={props.preloadInitialSlipState}
          caseSubmitted={props.caseSubmitted}
          disabled={
            props.caseSubmitted
              ? false
              : maxillaryIncomplete || isAddingMaxillaryProduct
          }
          blockedByOppositeAddProduct={isAddingMaxillaryProduct}
          // Tooth selection
          mandibularTeeth={state.mandibularTeeth}
          handleMandibularToothClick={state.handleMandibularToothClick}
          mandibularRetentionTypes={state.mandibularRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMandibular}
          initialProductIsRemovable={
            initialProductIsNonFixed &&
            (props.initialArch === "mandibular" || props.initialArch === "both") &&
            !!props.selectedProductId
          }
          initialProductDetailsPending={state.initialProductDetailsPending}
          retentionOptions={state.initialProductDetails?.retention_options}
          card0Extractions={state.initialProductDetails?.extractions ?? []}
          card0InitialProduct={state.initialProductDetails}
          handleSelectRetentionType={state.handleSelectRetentionType}
          handleMandibularToothDeselect={state.handleMandibularToothDeselect}
          // Shade
          shadeSelectionState={state.shadeSelectionState}
          setShadeSelectionState={state.setShadeSelectionState}
          selectedShadeGuide={state.selectedShadeGuide}
          setSelectedShadeGuide={state.setSelectedShadeGuide}
          showShadeGuideDropdown={state.showShadeGuideDropdown}
          setShowShadeGuideDropdown={state.setShowShadeGuideDropdown}
          shadeGuideOptions={state.shadeGuideOptions}
          getSelectedShade={state.getSelectedShade}
          handleShadeSelect={state.handleShadeSelect}
          setSelectedShades={state.setSelectedShades}
          handleShadeFieldClick={state.handleShadeFieldClick}
          migrateFixedShadeProductId={state.migrateFixedShadeProductId}
          // Rush
          rushedProducts={state.rushedProducts}
          // Modals
          handleOpenImpressionModal={state.handleOpenImpressionModal}
          getImpressionDisplayText={state.getImpressionDisplayText}
          handleOpenAddOnsModal={state.handleOpenAddOnsModal}
          selectedStages={state.selectedStages}
          handleOpenRushModal={state.handleOpenRushModal}
          handleOpenStageModal={state.handleOpenStageModal}
          setShowAttachModal={state.setShowAttachModal}
          // Added products
          addedProducts={state.addedProducts}
          toggleAddedProductExpanded={state.toggleAddedProductExpanded}
          collapseAllAddedProducts={state.collapseAllAddedProducts}
          handleRemoveAddedProduct={state.handleRemoveAddedProduct}
          // Active product card tracking
          activeProductCardId={state.activeProductCardId}
          setActiveProductCardId={state.setActiveProductCardId}
          getToothProductCard={state.getToothProductCard}
          // Tooth field progress (Prep/Pontic step-by-step)
          isFieldVisible={state.isFieldVisible}
          isFieldCompleted={state.isFieldCompleted}
          completeFieldStep={state.completeFieldStep}
          storeFieldValue={state.storeFieldValue}
          uncompleteFieldStep={state.uncompleteFieldStep}
          getFieldValue={state.getFieldValue}
          clearToothProgress={state.clearToothProgress}
          setToothProduct={state.setToothProduct}
          getToothProduct={state.getToothProduct}
          isProductLoading={state.isProductLoading}
          fetchAndAssignProduct={state.fetchAndAssignProduct}
          mandibularToothExtractionMap={state.mandibularToothExtractionMap}
          mandibularClaspTeeth={state.mandibularClaspTeeth}
          mandibularNoActiveBoxTeeth={state.mandibularNoActiveBoxTeeth}
          setMandibularNoActiveBoxTeeth={state.setMandibularNoActiveBoxTeeth}
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          canUseToothForActiveProduct={state.canUseToothForActiveProduct}
          selectAllMandibularTeeth={state.selectAllMandibularTeeth}
          onToothStatusValidationChange={handleToothStatusValidationChange}
          mandibularHasFixedCard0={mandibularHasFixedCard0}
          mandibularHasRemovablesCard0={mandibularHasRemovablesCard0}
          removablesImpressionDone={mandibularRemovablesImpressionDone}
          noOpposingNeeded={state.noOpposingNeeded}
          selectedImpressions={state.selectedImpressions}
          opposingProductData={
            shouldShowOpposingProductMirror({
              initialProductHasOppositeSection,
              hostMatchesInitialArch: props.initialArch === "maxillary",
              primaryArchTeethSelected: maxillaryTeethSelected,
              oppositeArch: "mandibular",
              initialArch: props.initialArch,
              selectedProductId: props.selectedProductId,
              addedProducts: props.addedProducts,
              bothArchesHaveRemovables: bothArchesHaveProducts,
            })
              ? state.initialProductDetails
              : null
          }
          opposingToothExtractionMap={state.opposingToothExtractionMap}
          opposingClaspTeeth={state.opposingClaspTeeth}
          opposingNoActiveBoxTeeth={state.opposingNoActiveBoxTeeth}
          setOpposingNoActiveBoxTeeth={state.setOpposingNoActiveBoxTeeth}
          opposingSelectedTeeth={state.opposingSelectedTeeth}
          onOpposingExtractionToggle={state.handleOpposingExtractionToggle}
          onSelectAllOpposingTeeth={state.selectAllOpposingTeeth}
          onImplantDetailChange={(detail) => {
            mandibularImplantDetailRef.current = detail;
            setMandibularImplantDetailPeer(detail);
          }}
          initialImplantDetailByTooth={initialMandibularImplants}
          onImplantDetailCompleteChange={(complete) => setMandibularImplantCompletePeer(complete)}
          onSplintLinksChange={(linksByKey) => {
            mandibularSplintLinksRef.current = linksByKey;
          }}
          peerImplantDetailByTooth={maxillaryImplantDetailPeer}
          peerImplantCompleteByTooth={maxillaryImplantCompletePeer}
          onBackToCategories={props.onBackToCategories}
          confirmDetailsChecked={props.confirmDetailsChecked}
          addStageStageHistory={props.addStageContext?.historyByArch?.mandibular}
          isAnyModalOpen={state.showImpressionModal || state.isStageModalOpen}
          suppressAutoOpen={
            // When both arches selected, suppress mandibular auto-opens until maxillary impression is done
            props.initialArch === "both" &&
            isNonRetentionCategory(state.initialProductDetails) &&
            !maxillaryRemovablesImpressionDone
          }
          opposingOnlyLayout={props.initialArch !== "both"}
          showInlineAddProductPicker={props.inlineAddProductArch === "mandibular"}
          excludedProductIds={mandibularExcludedProductIds}
          excludedSubcategoryIds={mandibularExcludedSubcategoryIds}
          labCustomerId={props.labCustomerId}
          onInlineAddProductComplete={props.onInlineAddProductComplete}
          onInlineAddProductCancel={props.onInlineAddProductCancel}
          onShowSelectTeethToReplaceChange={setShowSelectTeethToReplaceMandibular}
          selectedAddonsByTooth={state.selectedAddonsByTooth}
        />
      </div>
        </AutoOpenSuppressionContext.Provider>

      </div>
    </div>
    </div>

      <CaseDesignSummarySection
        state={state}
        caseSubmitted={props.caseSubmitted}
        rushCasesEnabled={props.rushCasesEnabled}
        allProductsComplete={slipValidationComplete}
        maxillaryHasRemovables={maxillaryHasRemovables}
        mandibularHasRemovables={mandibularHasRemovables}
        maxillaryImplantDetailByTooth={maxillaryImplantDetailPeer}
        mandibularImplantDetailByTooth={mandibularImplantDetailPeer}
        rushArchSlots={rushArchSlotsWithDelivery}
        caseHasAddons={caseHasAddons}
        onCaseSummaryNotesChange={(text) => {
          if (props.caseSummaryNotesRef) {
            props.caseSummaryNotesRef.current = text;
          }
        }}
      />

      {/* All Modals */}
      <ModalOrchestrator
        showImpressionModal={state.showImpressionModal}
        setShowImpressionModal={state.setShowImpressionModal}
        currentImpressionArch={state.currentImpressionArch}
        currentImpressionProductId={state.currentImpressionProductId}
        currentImpressionToothNumber={state.currentImpressionToothNumber}
        impressionOptions={impressionModalOptions}
        oppositeImpressions={oppositeImpressionModalOptions}
        currentImpressionOppositeImpression={
          (() => {
            // Multi-product / mixed arch: always show both impression grids.
            if (slipHasProductsOnBothArches) {
              return "Yes";
            }
            // Removable + both arches: one dialog with maxillary and mandibular sections (no mirroring).
            if (
              props.initialArch === "both" &&
              isNonRetentionCategory(state.initialProductDetails)
            ) {
              return "Yes";
            }
            // Single-arch removable with opposing scan: same dual-grid + Skip Opposing flow as primary product.
            if (
              props.initialArch !== "both" &&
              isNonRetentionCategory(state.initialProductDetails) &&
              initialProductHasOppositeSection &&
              (() => {
                const oi = state.initialProductDetails?.opposite_impression as unknown;
                return oi === "Yes" || oi === true || oi === 1;
              })()
            ) {
              return "Yes";
            }
            const toothNum = state.currentImpressionToothNumber;
            const arch = state.currentImpressionArch;
            if (toothNum === null) return undefined;
            let product = state.getToothProduct(arch, toothNum);
            if (!product && state.currentImpressionProductId) {
              const archKeys = arch === "maxillary"
                ? Object.keys(state.maxillaryRetentionTypes || {})
                : Object.keys(state.mandibularRetentionTypes || {});
              for (const k of archKeys) {
                const p = state.getToothProduct(arch, Number(k));
                if (p?.id?.toString() === state.currentImpressionProductId) { product = p; break; }
              }
            }
            // Fallback to initialProductDetails for removable products (not stored in retentionTypes)
            if (!product && state.initialProductDetails?.id?.toString() === state.currentImpressionProductId) {
              product = state.initialProductDetails;
            }
            if (
              !product &&
              isNonRetentionCategory(state.initialProductDetails) &&
              state.initialProductDetails &&
              (state.initialProductDetails.id?.toString() === state.currentImpressionProductId ||
                state.currentImpressionProductId === "0")
            ) {
              product = state.initialProductDetails;
            }
            const oi = product?.opposite_impression as unknown;
            return (oi === "Yes" || oi === true || oi === 1) ? "Yes" : "No";
          })()
        }
        selectedImpressions={state.selectedImpressions}
        setSelectedImpressions={state.setSelectedImpressions}
        onImpressionConfirm={(displayText, targetArch) => {
          const modalArch = targetArch || state.currentImpressionArch;
          const preferredTooth =
            modalArch === state.currentImpressionArch ? state.currentImpressionToothNumber : null;
          applyArchWideImpressionCompletion(modalArch, displayText, preferredTooth);
        }}
        onImpressionClear={(targetArch) => {
          const modalArch = targetArch || state.currentImpressionArch;
          const preferredTooth =
            modalArch === state.currentImpressionArch ? state.currentImpressionToothNumber : null;
          applyArchWideImpressionClear(modalArch, preferredTooth);
        }}
        onSubmitNoOpposing={() => {
          const toothNum = state.currentImpressionToothNumber;
          const arch = state.currentImpressionArch;
          const productId = state.currentImpressionProductId;
          if (toothNum !== null) {
            const key = `${productId}_${arch}_${toothNum}`;
            state.setNoOpposingNeeded((prev: Record<string, boolean>) => ({ ...prev, [key]: true }));
          }
        }}
        hideSkipOpposing={
          slipHasProductsOnBothArches ||
          (props.initialArch === "both" &&
            isNonRetentionCategory(state.initialProductDetails))
        }
        impressionModalHeading={
          slipHasProductsOnBothArches ||
          (props.initialArch === "both" &&
            isNonRetentionCategory(state.initialProductDetails))
            ? "Impressions"
            : undefined
        }
        dualImpressionPrimaryArch={
          slipHasMandibularProducts && !slipHasMaxillaryProducts
            ? "mandibular"
            : "maxillary"
        }
        showAddOnsModal={state.showAddOnsModal}
        setShowAddOnsModal={state.setShowAddOnsModal}
        currentAddOnsArch={state.currentAddOnsArch}
        currentAddOnsProductId={state.currentAddOnsProductId}
        currentAddOnsToothNumber={state.currentAddOnsToothNumber}
        addOnsProducts={(() => {
          const toothNum = state.currentAddOnsToothNumber;
          const arch = state.currentAddOnsArch;
          const currentProduct = toothNum !== null ? state.getToothProduct(arch, toothNum) : null;
          return caseProducts.map((p) => ({
            ...p,
            addons: (currentProduct?.id === p.id ? currentProduct?.addons : p.addons) ?? p.addons,
          }));
        })()}
        addOnsVisibleArches={[
          ...(state.maxillaryTeeth.length > 0 ? ["maxillary" as const] : []),
          ...(state.mandibularTeeth.length > 0 ? ["mandibular" as const] : []),
        ]}
        addOnArchSlots={addOnArchSlots}
        onAddOnsConfirm={(addOns, confirmArch, meta) => {
          const arch = meta?.arch ?? confirmArch ?? state.currentAddOnsArch;
          const repTooth =
            meta?.repTooth ??
            state.currentAddOnsToothNumber ??
            (arch === "maxillary"
              ? state.maxillaryTeeth[0]
              : state.mandibularTeeth[0]);
          if (repTooth == null || Number.isNaN(repTooth)) return;

          const baseTooth = repTooth;
          const openedFromCard0 =
            meta?.cardId === 0 ||
            (state.toothProductCardMap[`${arch}_${baseTooth}`] ?? 0) === 0;

          let toothNum = baseTooth;
          if (
            !meta &&
            openedFromCard0 &&
            props.initialArch === "both" &&
            isNonRetentionCategory(state.initialProductDetails)
          ) {
            const card0 =
              arch === "maxillary" ? state.getMaxillaryCard0Teeth() : state.getMandibularCard0Teeth();
            if (card0.length > 0) toothNum = card0[0];
          }

          const addonLabels = addOns
            .filter((a) => a.qty > 0 && a.name)
            .map((a) => `${a.qty}x ${a.name}`);
          const value = addonLabels.length === 0 ? "0 selected" : addonLabels.join(", ");
          const product = state.getToothProduct(arch, toothNum);
          const isFixed = meta?.isFixed ?? hasRetentionOptions(product);
          const addonStep = isFixed ? "fixed_addons" : "addons";

          const cardId =
            meta?.cardId ??
            state.toothProductCardMap[`${arch}_${toothNum}`] ??
            0;
          const allArchTeeth =
            arch === "maxillary" ? state.maxillaryTeeth : state.mandibularTeeth;
          const cardTeeth = (allArchTeeth ?? []).filter(
            (tn) => (state.toothProductCardMap[`${arch}_${tn}`] ?? 0) === cardId
          );
          const virtualTooth = cardId === 0 ? -0 : -cardId;
          const teethToWrite = Array.from(
            new Set([toothNum, virtualTooth, ...cardTeeth].filter((tn) => tn != null && !Number.isNaN(tn)))
          );

          for (const tn of teethToWrite) {
            state.completeFieldStep(arch, tn, addonStep, value);
          }

          const structuredAddons = addOns
            .filter((a) => a.qty > 0)
            .map((a) => ({ addon_id: a.addon_id, qty: a.qty }));
          state.setSelectedAddonsByTooth((prev: Record<string, Array<{ addon_id: number; qty: number }>>) => {
            const next = { ...prev };
            for (const tn of teethToWrite) {
              next[`${arch}_${tn}`] = structuredAddons;
            }
            return next;
          });
        }}
        showAttachModal={state.showAttachModal}
        setShowAttachModal={state.setShowAttachModal}
        attachmentStages={caseStages}
        onAttachFileCountsChange={(photoCount, stlCount) => {
          state.setAttachedPhotoCount(photoCount);
          state.setAttachedStlCount(stlCount);
        }}
        attachmentDoctorName={props.attachmentDoctorName}
        attachmentPatientName={props.attachmentPatientName}
        attachmentCaseId={props.attachmentCaseId}
        attachmentSlipId={props.attachmentSlipId}
        showRushModal={state.showRushModal}
        setShowRushModal={state.setShowRushModal}
        currentRushArch={state.currentRushArch}
        currentRushProductId={state.currentRushProductId}
        currentRushMaxProductId={state.currentRushMaxProductId}
        currentRushMandProductId={state.currentRushMandProductId}
        handleRushConfirm={state.handleRushConfirm}
        rushedProducts={state.rushedProducts}
        handleRemoveRush={state.handleRemoveRush}
        rushArchSlots={rushArchSlotsWithDelivery}
        rushCaseSchedule={props.rushCaseSchedule ?? null}
        labBusinessHours={props.labBusinessHours ?? null}
        isStageModalOpen={state.isStageModalOpen}
        setIsStageModalOpen={state.setIsStageModalOpen}
        selectedStages={state.selectedStages}
        currentStageProductId={state.currentStageProductId}
        currentStageArch={state.currentStageArch}
        currentStageToothNumber={state.currentStageToothNumber}
        currentStageProduct={(() => {
          const toothNum = state.currentStageToothNumber;
          const arch = state.currentStageArch;
          if (toothNum === null) return null;
          return state.getToothProduct(arch, toothNum) ?? null;
        })()}
        currentStageOptions={(() => {
          const toothNum = state.currentStageToothNumber;
          const arch = state.currentStageArch;
          if (toothNum === null) return null;
          const product = state.getToothProduct(arch, toothNum);
          const oppositeTeeth = arch === "maxillary" ? MANDIBULAR_TEETH : MAXILLARY_TEETH;
          const donor = findOppositeArchProductDonor(
            arch,
            product?.id,
            state.getToothProduct,
            oppositeTeeth
          );
          const stages = resolveProductStagesForDisplay(product, donor);
          if (!stages.length) return null;
          return stages.map((s) => ({
            name: s.name,
            letter: s.code?.charAt(0)?.toUpperCase() || s.name.charAt(0).toUpperCase(),
            is_default: s.is_default,
            image_url: s.image_url ?? null,
            stage_id: s.stage_id ?? s.id,
            sequence: s.sequence,
          }));
        })()}
        handleStageSelect={state.handleStageSelect}
        stageHistory={addStageStageHistoryForModal}
        disableStageAutoSelect={Boolean(props.addStageContext?.promptStagesOnLoad)}
        caseSubmitted={props.caseSubmitted}
        onStageConfirm={(stageName, stageId) => {
          const arch = state.currentStageArch;
          let toothNum = state.currentStageToothNumber;
          if (toothNum === null) {
            const pid = state.currentStageProductId;
            const prepMatch = pid.match(/prep_(-?\d+)$/);
            if (prepMatch) toothNum = parseInt(prepMatch[1], 10);
            else {
              const fixedMatch = pid.match(/fixed_(-?\d+)$/);
              if (fixedMatch) toothNum = parseInt(fixedMatch[1], 10);
            }
          }
          if (toothNum !== null) {
            const product = resolveProductForStageField(
              state.getToothProduct(arch, toothNum),
              arch,
              state.getToothProduct
            );
            const isFixed = hasRetentionOptions(product);
            const serializedStage =
              stageId && stageId > 0
                ? serializeStageFieldValue({ name: stageName, stage_id: stageId })
                : serializeStageSelectionFromProduct(product, stageName);
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_stage", serializedStage);
            } else {
              state.completeFieldStep(arch, toothNum, "stage", serializedStage);
            }
            // Cross-arch stage sync for both-arch removables is handled only inside
            // mirroredCompleteFieldStep (first time the opposite arch has no stage yet),
            // not here — unconditional copy would overwrite the other arch on every change.
          }
        }}
      />
      <Dialog
        open={toothOwnershipWarning !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToothOwnershipWarning(null);
          }
        }}
      >
        <DialogContent
          className="max-w-[520px]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Tooth already selected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#333]">
              {toothOwnershipWarning}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setToothOwnershipWarning(null)}
                className="px-4 py-2 rounded-md bg-[#1162A8] text-white hover:bg-[#0d4d85] transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
