"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import type { CaseDesignProps, SlipProductSnapshot } from "../types";
import { productImpressionsToModalOptions } from "../types";
import { useCaseDesignState } from "../hooks/useCaseDesignState";
import { IMPRESSION_STEP_NAMES } from "../hooks/useToothFieldProgress";
import { MaxillaryPanel } from "./MaxillaryPanel";
import { MandibularPanel } from "./MandibularPanel";
import { CenterNavigation } from "./CenterNavigation";
import { CenterActionIcons } from "./CenterActionIcons";
import { ModalOrchestrator } from "./ModalOrchestrator";
import { CaseSummaryNotes } from "./CaseSummaryNotes";
import { mockImpressions } from "../constants";
import { isRemovableCategory, isFixedCategory, getCategoryName } from "../utils/categoryHelpers";
import { hasAdvanceField } from "./FixedRestorationFields";

export function CaseDesignCenter(props: CaseDesignProps) {
  const state = useCaseDesignState(props);
  const maxillaryImplantDetailRef = useRef<Record<number, import("./ImplantDetailSection").ImplantDetailData>>({});
  const mandibularImplantDetailRef = useRef<Record<number, import("./ImplantDetailSection").ImplantDetailData>>({});
  // Tracks when the user explicitly hides the mandibular panel while it's force-shown by the opposing condition.
  const [userHidMandibular, setUserHidMandibular] = useState(false);

  const isAnyModalOpen = state.showImpressionModal || state.isStageModalOpen || state.showAddOnsModal || state.showRushModal;
  const onAnyModalOpenChangeRef = useRef(props.onAnyModalOpenChange);
  onAnyModalOpenChangeRef.current = props.onAnyModalOpenChange;
  useEffect(() => {
    onAnyModalOpenChangeRef.current?.(isAnyModalOpen);
  }, [isAnyModalOpen]);

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

  // True when any arch has a Removables/Removables Restoration product
  const isRemovablesCategory = (arch: "maxillary" | "mandibular") =>
    (props.addedProducts ?? []).some((ap) => {
      if (ap.arch !== arch) return false;
      const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
      return isRemovableCategory(name);
    });

  // Show panels/accordion as soon as a removables product exists (no teeth required)
  // Include both addedProducts and the initial active product (card 0).
  // Use stable props-derived flags (not activeProductCardId-dependent state) so that
  // activating a different product card does not flicker maxillaryHasRemovables off/on,
  // which would cascade into maxillaryRemovablesImpressionDone = false and hide the opposing accordion.
  const initialProductIsRemovable = isRemovableCategory(props.selectedProductCategoryName || "");
  const maxillaryHasRemovables = isRemovablesCategory("maxillary") ||
    (initialProductIsRemovable && (props.initialArch === "maxillary" || props.initialArch === "both") && !!props.selectedProductId);
  const mandibularHasRemovables = isRemovablesCategory("mandibular") ||
    (initialProductIsRemovable && (props.initialArch === "mandibular" || props.initialArch === "both") && !!props.selectedProductId);

  // Show panels/accordion as soon as a Fixed Restoration added product exists
  const maxillaryHasFixedAdded = (props.addedProducts ?? []).some((ap) => {
    if (ap.arch !== "maxillary") return false;
    const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
    return isFixedCategory(name);
  });
  const mandibularHasFixedAdded = (props.addedProducts ?? []).some((ap) => {
    if (ap.arch !== "mandibular") return false;
    const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
    return isFixedCategory(name);
  });

  // Show accordion when card 0 initial product is Fixed Restoration AND teeth have been selected
  const activeProductIsFixed = isFixedCategory(props.selectedProductCategoryName || "");
  const activeProductIsRemovable = initialProductIsRemovable;
  const maxillaryHasFixedCard0 = activeProductIsFixed && Object.keys(state.maxillaryRetentionTypes)
    .some(tn => state.getToothProductCard("maxillary", Number(tn)) === 0);
  const mandibularHasFixedCard0 = activeProductIsFixed && Object.keys(state.mandibularRetentionTypes || {})
    .some(tn => state.getToothProductCard("mandibular", Number(tn)) === 0);
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
    maxillaryHasRemovables && state.maxillaryTeeth.length > 0;

  const mandibularHasRemovablesTeeth =
    mandibularHasRemovables && state.mandibularTeeth.length > 0;

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

  // True only when at least one tooth exists AND every tooth has impression complete
  const hasAnyTooth =
    Object.keys(state.maxillaryRetentionTypes).length > 0 ||
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 ||
    maxillaryHasRemovablesTeeth ||
    mandibularHasRemovablesTeeth;

  // Check removable teeth impression completion.
  // For Removables, fields (grade, stage, shade, impression) are stored under the representative
  // tooth (first tooth per product card), NOT every individual tooth. So we check completion
  // per product card rather than per tooth.
  const MAXILLARY_ALL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const MANDIBULAR_ALL = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];

  const getRemovablesRepTeeth = (arch: "maxillary" | "mandibular") => {
    const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
    const cardToRepTooth = new Map<number, number>();
    for (const tn of allTeeth) {
      if (!state.getToothProduct(arch, tn)) continue;
      const card = state.getToothProductCard(arch, tn);
      if (card != null && !cardToRepTooth.has(card)) {
        cardToRepTooth.set(card, tn);
      }
    }
    return [...cardToRepTooth.values()];
  };

  const maxillaryRemovablesRepTeeth = maxillaryHasRemovablesTeeth ? getRemovablesRepTeeth("maxillary") : [];
  const mandibularRemovablesRepTeeth = mandibularHasRemovablesTeeth ? getRemovablesRepTeeth("mandibular") : [];

  const allMaxillaryRemovablesComplete =
    !maxillaryHasRemovablesTeeth ||
    maxillaryRemovablesRepTeeth.every((tn) => state.isFieldCompleted("maxillary", tn, "impression"));

  const allMandibularRemovablesComplete =
    !mandibularHasRemovablesTeeth ||
    mandibularRemovablesRepTeeth.every((tn) => state.isFieldCompleted("mandibular", tn, "impression"));

  // True once the sentinel/rep tooth for removables card 0 has impression complete.
  // Only checks card 0 — added product cards having incomplete impressions must not block
  // the opposing product accordion from appearing.
  const getCard0RepTooth = (arch: "maxillary" | "mandibular"): number | null => {
    const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
    for (const tn of allTeeth) {
      if (!state.getToothProduct(arch, tn)) continue;
      if (state.getToothProductCard(arch, tn) === 0) return tn;
    }
    return null;
  };

  const maxillaryRemovablesImpressionDone = (() => {
    if (!maxillaryHasRemovables) return false;
    const card0Rep = getCard0RepTooth("maxillary");
    if (card0Rep === null) return false;
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", card0Rep, step));
  })();

  const mandibularRemovablesImpressionDone = (() => {
    if (!mandibularHasRemovables) return false;
    const card0Rep = getCard0RepTooth("mandibular");
    if (card0Rep === null) return false;
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", card0Rep, step));
  })();

  // True when the initial product has an opposing section — either via opposite_impression flag
  // or via opposite_extractions being populated. Uses both signals so the panel shows even when
  // lab-specific opposite_extractions haven't been configured but the flag is set.
  const initialProductHasOppositeSection =
    state.initialProductDetails?.opposite_impression === "Yes" ||
    (state.initialProductDetails?.opposite_extractions?.length ?? 0) > 0;

  // For Fixed Restoration, impression is stored under the first tooth of the
  // product group. This helper resolves the effective tooth number to check
  // for impression completion. It scopes the group to the same product-card
  // (AP.id or 0 for initial) so impressions on one card don't leak into
  // another AP that happens to share the same product.id.
  const getImpressionOwnerTooth = (arch: "maxillary" | "mandibular", toothNum: number): number => {
    const product = state.getToothProduct(arch, toothNum);
    const isFixed = isFixedCategory(getCategoryName(product));
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
    return groupTeeth.length > 0 ? Math.min(...groupTeeth) : toothNum;
  };

  const allTeethImpressionComplete =
    hasAnyTooth &&
    Object.keys(state.maxillaryRetentionTypes).every((toothNum) => {
      const n = getImpressionOwnerTooth("maxillary", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
    }) &&
    Object.keys(state.mandibularRetentionTypes || {}).every((toothNum) => {
      const n = getImpressionOwnerTooth("mandibular", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
    }) &&
    allMaxillaryRemovablesComplete &&
    allMandibularRemovablesComplete;

  // True if ANY tooth has a retention type but hasn't completed impression yet
  const hasIncompleteAccordion =
    Object.keys(state.maxillaryRetentionTypes).some((toothNum) => {
      const n = getImpressionOwnerTooth("maxillary", Number(toothNum));
      return !IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
    }) ||
    Object.keys(state.mandibularRetentionTypes || {}).some((toothNum) => {
      const n = getImpressionOwnerTooth("mandibular", Number(toothNum));
      return !IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
    }) ||
    (maxillaryHasRemovables && !maxillaryRemovablesImpressionDone) ||
    (mandibularHasRemovables && !mandibularRemovablesImpressionDone);

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
      const isFixedRestoration = isFixedCategory(getCategoryName(product));
      const productKey = product?.id ?? toothNum;
      const groupKey = `${arch}_${productKey}`;

      if (isFixedRestoration && !processedGroups.has(groupKey)) {
        processedGroups.add(groupKey);
        // Find all teeth in this arch with the same product; shade is stored under fixed_${firstTooth}
        const teethInGroup = allArchTeeth.filter(
          (t) => t.arch === arch && (state.getToothProduct(t.arch, t.toothNum)?.id ?? t.toothNum) === productKey
        ).map((t) => t.toothNum);
        const firstToothInGroup = Math.min(...teethInGroup);
        const shadeProductId = `fixed_${firstToothInGroup}`;
        const advFields = product?.advance_fields;
        if (hasAdvanceField("fixed_stump_shade", advFields) && !state.getSelectedShade(shadeProductId, arch, "stump_shade")) return "Stump Shade";
        if (hasAdvanceField("fixed_shade_trio", advFields) && !state.getSelectedShade(shadeProductId, arch, "tooth_shade")) return "Tooth Shade";
      }

      const impressionOwner = getImpressionOwnerTooth(arch, toothNum);
      const hasImpression = IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted(arch, impressionOwner, step));
      if (!hasImpression) return "Impression";
    }
    return null;
  })();

  // True when any maxillary tooth has an incomplete required field (shade or impression).
  // For Fixed Restoration, shades are per product group (fixed_${firstToothInGroup}).
  const maxillaryIncomplete = (() => {
    const maxillaryTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
    const processedShadeGroups = new Set<string>();
    for (const n of maxillaryTeeth) {
      const product = state.getToothProduct("maxillary", n);
      if (isFixedCategory(getCategoryName(product))) {
        const productKey = String(product?.id ?? n);
        const firstToothInGroup = Math.min(
          ...maxillaryTeeth.filter(
            (t) => String(state.getToothProduct("maxillary", t)?.id ?? t) === productKey
          )
        );
        if (!processedShadeGroups.has(productKey)) {
          processedShadeGroups.add(productKey);
          const shadeId = `fixed_${firstToothInGroup}`;
          const advFields = product?.advance_fields;
          if (hasAdvanceField("fixed_stump_shade", advFields) && !state.getSelectedShade(shadeId, "maxillary", "stump_shade")) return true;
          if (hasAdvanceField("fixed_shade_trio", advFields) && !state.getSelectedShade(shadeId, "maxillary", "tooth_shade")) return true;
        }
      }
      const impressionOwner = getImpressionOwnerTooth("maxillary", n);
      if (!IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", impressionOwner, step))) return true;
    }
    return false;
  })();

  const mandibularIncomplete = (() => {
    const mandibularTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
    const processedShadeGroups = new Set<string>();
    for (const n of mandibularTeeth) {
      const product = state.getToothProduct("mandibular", n);
      if (isFixedCategory(getCategoryName(product))) {
        const productKey = String(product?.id ?? n);
        const firstToothInGroup = Math.min(
          ...mandibularTeeth.filter(
            (t) => String(state.getToothProduct("mandibular", t)?.id ?? t) === productKey
          )
        );
        if (!processedShadeGroups.has(productKey)) {
          processedShadeGroups.add(productKey);
          const shadeId = `fixed_${firstToothInGroup}`;
          const advFields = product?.advance_fields;
          if (hasAdvanceField("fixed_stump_shade", advFields) && !state.getSelectedShade(shadeId, "mandibular", "stump_shade")) return true;
          if (hasAdvanceField("fixed_shade_trio", advFields) && !state.getSelectedShade(shadeId, "mandibular", "tooth_shade")) return true;
        }
      }
      const impressionOwner = getImpressionOwnerTooth("mandibular", n);
      if (!IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", impressionOwner, step))) return true;
    }
    return false;
  })();

  const hasMaxillaryProducts =
    Object.keys(state.maxillaryRetentionTypes).length > 0 || maxillaryHasRemovablesTeeth;

  const hasMandibularProducts =
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 || mandibularHasRemovablesTeeth;

  // True when the arch has products AND all of them have completed their accordion fields.
  // The "+ Add Product" button only shows after the first product accordion is fully complete.
  const allMaxillaryAccordionsComplete =
    hasMaxillaryProducts &&
    Object.keys(state.maxillaryRetentionTypes).every((toothNum) => {
      const n = getImpressionOwnerTooth("maxillary", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
    }) &&
    allMaxillaryRemovablesComplete;

  const allMandibularAccordionsComplete =
    hasMandibularProducts &&
    Object.keys(state.mandibularRetentionTypes || {}).every((toothNum) => {
      const n = getImpressionOwnerTooth("mandibular", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
    }) &&
    allMandibularRemovablesComplete;

  // ── Removable restoration: pre-assign sentinel tooth so accordion shows immediately ──
  // When a removables product is active and no teeth have been assigned yet, assign the
  // sentinel tooth to card 0 so the accordion renders without requiring the user to click teeth.
  const MAXILLARY_SENTINEL = 1;
  const MANDIBULAR_SENTINEL = 17;

  useEffect(() => {
    if (
      state.activeProductIsRemovablesMaxillary &&
      props.selectedProductId &&
      !state.getToothProduct("maxillary", MAXILLARY_SENTINEL)
    ) {
      state.setToothProductCard("maxillary", MAXILLARY_SENTINEL, 0);
      state.fetchAndAssignProduct("maxillary", MAXILLARY_SENTINEL, props.selectedProductId);
    }
  }, [state.activeProductIsRemovablesMaxillary, props.selectedProductId]);

  useEffect(() => {
    if (
      state.activeProductIsRemovablesMandibular &&
      props.selectedProductId &&
      !state.getToothProduct("mandibular", MANDIBULAR_SENTINEL)
    ) {
      state.setToothProductCard("mandibular", MANDIBULAR_SENTINEL, 0);
      state.fetchAndAssignProduct("mandibular", MANDIBULAR_SENTINEL, props.selectedProductId);
    }
  }, [state.activeProductIsRemovablesMandibular, props.selectedProductId]);

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

  // Notify parent whenever readiness changes
  useEffect(() => {
    props.onReadinessChange?.(allTeethImpressionComplete);
  }, [allTeethImpressionComplete]);

  useEffect(() => {
    props.onIncompleteFieldChange?.(incompleteFieldLabel);
  }, [incompleteFieldLabel]);

  // Build a snapshot of all product selections for the slip payload.
  // Groups teeth by (arch × product card) so each unique product+arch combo becomes one entry.
  const collectSlipProducts = useCallback((): SlipProductSnapshot[] => {
    const MAXILLARY_ALL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    const MANDIBULAR_ALL = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];

    const snapshots: SlipProductSnapshot[] = [];

    const processArch = (arch: "maxillary" | "mandibular", type: "Upper" | "Lower", allTeeth: number[]) => {
      // Group teeth by product card ID
      const cardGroups = new Map<number, number[]>();
      for (const tn of allTeeth) {
        if (!state.getToothProduct(arch, tn) && !state.maxillaryTeeth.includes(tn) && !state.mandibularTeeth?.includes(tn)) {
          // Check retention types too
          const hasRetention = arch === "maxillary"
            ? Object.prototype.hasOwnProperty.call(state.maxillaryRetentionTypes, tn)
            : Object.prototype.hasOwnProperty.call(state.mandibularRetentionTypes || {}, tn);
          if (!hasRetention) continue;
        }
        const cardId = state.getToothProductCard(arch, tn);
        // Only include teeth that have a product assigned OR are part of a removables selection
        const toothProduct = state.getToothProduct(arch, tn);
        const isInRetentionTypes = arch === "maxillary"
          ? Object.prototype.hasOwnProperty.call(state.maxillaryRetentionTypes, tn)
          : Object.prototype.hasOwnProperty.call(state.mandibularRetentionTypes || {}, tn);
        const isInRemovables = arch === "maxillary"
          ? state.maxillaryTeeth.includes(tn)
          : (state.mandibularTeeth ?? []).includes(tn);
        if (!toothProduct && !isInRetentionTypes && !isInRemovables) continue;
        // Skip sentinel teeth (auto-assigned by the effect) that the user never selected
        if (toothProduct && !isInRetentionTypes && !isInRemovables) continue;
        const existing = cardGroups.get(cardId);
        if (existing) {
          existing.push(tn);
        } else {
          cardGroups.set(cardId, [tn]);
        }
      }

      const HEADER_EXTRACTION_CODES = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
      const extractionMap = arch === "maxillary"
        ? state.maxillaryToothExtractionMap
        : state.mandibularToothExtractionMap;

      cardGroups.forEach((teethNums, cardId) => {
        const sortedTeeth = [...teethNums].sort((a, b) => a - b);

        // Use the first tooth that has productApiData as representative (panel stores fields there)
        const repTooth = sortedTeeth.find((tn) => !!state.getToothProduct(arch, tn)) ?? sortedTeeth[0];
        const productApiData = state.getToothProduct(arch, repTooth);
        const productId = productApiData?.id
          ?? (props.addedProducts?.find((ap) => ap.id === cardId)?.productId)
          ?? props.selectedProductId
          ?? 0;

        const fieldValues: Record<string, string> = {};
        const allSteps = [
          "grade", "stage", "teeth_shade", "gum_shade", "impression", "addons",
          "fixed_stage", "fixed_stump_shade", "fixed_shade_trio", "fixed_characterization",
          "fixed_contact_icons", "fixed_margin", "fixed_metal", "fixed_proximal_contact",
          "fixed_impression", "fixed_addons", "fixed_notes",
        ] as const;
        for (const step of allSteps) {
          const val = state.getFieldValue(arch, repTooth, step as any);
          if (val) fieldValues[step] = val;
        }

        // Stage: look up from selectedStages using the product key format used in the panels
        const isFixed = isFixedCategory(getCategoryName(productApiData));
        const stageKey = isFixed
          ? `${arch}_fixed_${repTooth}`
          : `${arch}_prep_${repTooth}`;
        const stageName = state.selectedStages?.[stageKey] ?? fieldValues["stage"] ?? fieldValues["fixed_stage"] ?? null;

        // teeth_selection: use only teeth with extraction codes (matching accordion header display)
        // If none have extraction codes, fall back to all selected teeth
        const filteredByExtraction = sortedTeeth.filter((tn) => {
          const code = extractionMap?.[tn];
          return code && HEADER_EXTRACTION_CODES.has(code);
        });
        const teethSelection = filteredByExtraction.length > 0 ? filteredByExtraction : sortedTeeth;

        // Impressions: filter selectedImpressions for this product+arch
        const impressionPrefix = `${cardId}_${arch}_`;
        const impressions: Record<string, number> = {};
        Object.entries(state.selectedImpressions ?? {}).forEach(([key, qty]) => {
          if (key.startsWith(impressionPrefix) && qty > 0) {
            const code = key.slice(impressionPrefix.length);
            impressions[code] = qty;
          }
        });

        // Rush: look up from rushedProducts
        const rushKey = `${arch}_${cardId}`;
        const rush = state.rushedProducts?.[rushKey] ?? null;

        // Opposing extractions: collected from the opposing arch extraction map
        // Group toothNumber entries by extraction code → extraction_id lookup via productApiData
        let oppositeExtractions: Array<{ extraction_id: number; teeth_numbers: number[] }> | undefined;
        if (
          Object.keys(state.opposingToothExtractionMap).length > 0 &&
          productApiData?.opposite_extractions?.length
        ) {
          const grouped = new Map<string, number[]>();
          Object.entries(state.opposingToothExtractionMap).forEach(([tn, code]) => {
            const existing = grouped.get(code);
            if (existing) {
              existing.push(Number(tn));
            } else {
              grouped.set(code, [Number(tn)]);
            }
          });
          oppositeExtractions = Array.from(grouped.entries()).map(([code, toothNums]) => {
            const opExt = productApiData.opposite_extractions!.find((e) => e.code === code);
            return { extraction_id: opExt?.id ?? 0, teeth_numbers: toothNums.sort((a, b) => a - b) };
          }).filter((e) => e.extraction_id !== 0);
        }

        const implantDetailMap = arch === "maxillary"
          ? maxillaryImplantDetailRef.current
          : mandibularImplantDetailRef.current;
        // Only include implant detail entries that have actual data
        const relevantImplantDetail: Record<number, import("./ImplantDetailSection").ImplantDetailData> = {};
        for (const tn of teethSelection) {
          const detail = implantDetailMap[tn];
          if (detail && (detail.brand || detail.platform || detail.size)) {
            relevantImplantDetail[tn] = detail;
          }
        }
        const hasImplantDetail = Object.keys(relevantImplantDetail).length > 0;

        snapshots.push({
          type,
          productId,
          productApiData: productApiData ?? null,
          teethNumbers: teethSelection,
          repToothNumber: repTooth,
          fieldValues,
          stageName,
          impressions,
          rush,
          cardId,
          selectedShades: { ...(state.selectedShades ?? {}) },
          shadeGuide: state.selectedShadeGuide ?? "Vita Classical",
          ...(oppositeExtractions ? { oppositeExtractions } : {}),
          ...(hasImplantDetail ? { implantDetailByTooth: relevantImplantDetail } : {}),
          selectedAddonsByTooth: { ...(state.selectedAddonsByTooth ?? {}) },
        });
      });
    };

    processArch("maxillary", "Upper", MAXILLARY_ALL);
    processArch("mandibular", "Lower", MANDIBULAR_ALL);

    return snapshots;
  }, [
    state.getToothProduct,
    state.getToothProductCard,
    state.getFieldValue,
    state.maxillaryRetentionTypes,
    state.mandibularRetentionTypes,
    state.maxillaryTeeth,
    state.mandibularTeeth,
    state.selectedStages,
    state.selectedImpressions,
    state.rushedProducts,
    state.maxillaryToothExtractionMap,
    state.mandibularToothExtractionMap,
    state.opposingToothExtractionMap,
    state.selectedAddonsByTooth,
    props.addedProducts,
    props.selectedProductId,
  ]);

  // Assign collector to ref so parent can call it at submit time
  useEffect(() => {
    if (props.slipCollectorRef) {
      props.slipCollectorRef.current = collectSlipProducts;
    }
  });

  return (
    <div className="px-2 md:px-4 py-2">
      {/* Title row - Back to Products | MAXILLARY | CASE DESIGN CENTER | MANDIBULAR */}
      <div className="relative flex items-center mb-1 md:mb-2 px-4 sm:px-16 md:px-32 lg:px-64">
        {props.onBackToProducts && !props.caseSubmitted && (
          <button
            onClick={!hasIncompleteAccordion ? props.onBackToProducts : undefined}
            title={hasIncompleteAccordion ? "Complete all required fields before going back" : undefined}
            className={`absolute left-3 text-sm font-semibold ${hasIncompleteAccordion ? "text-[#b4b0b0] cursor-not-allowed" : "text-[#1162A8] hover:underline cursor-pointer"}`}
          >
            ← Back to Products
          </button>
        )}
        <div className="flex-1 flex items-center justify-center">
          {!props.caseSubmitted ? (
            <button
              onClick={() => state.onAddProduct?.("maxillary")}
              disabled={!allMaxillaryAccordionsComplete || maxillaryIncomplete || (maxillaryHasRemovablesCard0 && maxillaryRemovableTeethSelected === 0)}
              className={`flex flex-row items-center justify-center px-[10px] py-0 w-[230px] h-[28px] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] ${!allMaxillaryAccordionsComplete || maxillaryIncomplete || (maxillaryHasRemovablesCard0 && maxillaryRemovableTeethSelected === 0) ? "bg-[#b4b0b0] cursor-not-allowed" : "bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="font-[Verdana] font-normal text-[14px] leading-[22px] text-center tracking-[-0.02em] text-white">MAXILLARY PRODUCT</span>
            </button>
          ) : (
            <span className="text-[16px] sm:text-xl text-[#1d1d1b] tracking-wide">MAXILLARY</span>
          )}
        </div>
        <h2 className="flex-1 text-center text-xl font-bold text-[#1d1d1b] tracking-wide">
          CASE DESIGN CENTER
        </h2>
        <div className="flex-1 flex items-center justify-center">
          {!props.caseSubmitted ? (
            <button
              onClick={() => state.onAddProduct?.("mandibular")}
              disabled={!allMandibularAccordionsComplete || mandibularIncomplete || (mandibularHasRemovablesCard0 && mandibularRemovableTeethSelected === 0)}
              className={`flex flex-row items-center justify-center px-[10px] py-0 w-[230px] h-[28px] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] ${!allMandibularAccordionsComplete || mandibularIncomplete || (mandibularHasRemovablesCard0 && mandibularRemovableTeethSelected === 0) ? "bg-[#b4b0b0] cursor-not-allowed" : "bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="font-[Verdana] font-normal text-[14px] leading-[22px] text-center tracking-[-0.02em] text-white">MANDIBULAR PRODUCT</span>
            </button>
          ) : (
            <span className="text-[16px] sm:text-xl text-[#1d1d1b] tracking-wide">MANDIBULAR</span>
          )}
        </div>
      </div>

        {/* Main two-panel layout - responsive */}
        <div className="relative">
        <div className="flex flex-col lg:flex-row lg:gap-0 gap-4">
          {/* LEFT PANEL - MAXILLARY */}
          <MaxillaryPanel
            showMaxillary={
              state.showMaxillary ||
              (props.caseSubmitted && (state.maxillaryTeeth.length > 0 || Object.keys(state.maxillaryRetentionTypes).length > 0)) ||
              (initialProductHasOppositeSection && props.initialArch === "mandibular" && mandibularRemovablesImpressionDone)
            }
            setShowMaxillary={state.setShowMaxillary}
            showDetails={props.caseSubmitted ||
              maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables ||
              maxillaryHasFixedAdded || mandibularHasFixedAdded ||
              maxillaryHasFixedCard0 || mandibularHasFixedCard0 ||
              (initialProductHasOppositeSection && props.initialArch === "mandibular" && mandibularRemovablesImpressionDone)
            }
          caseSubmitted={props.caseSubmitted}
          // Tooth selection
          maxillaryTeeth={state.maxillaryTeeth}
          handleMaxillaryToothClick={state.handleMaxillaryToothClick}
          maxillaryRetentionTypes={state.maxillaryRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMaxillary}
          retentionOptions={state.initialProductDetails?.retention_options}
          card0Extractions={state.initialProductDetails?.extractions ?? []}
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
          handleShadeFieldClick={state.handleShadeFieldClick}
          // Expansion
          expandedLeft={state.expandedLeft}
          setExpandedLeft={state.setExpandedLeft}
          isPrepPonticExpanded={state.isPrepPonticExpanded}
          togglePrepPonticExpanded={state.togglePrepPonticExpanded}
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
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          selectAllMaxillaryTeeth={state.selectAllMaxillaryTeeth}
          onToothStatusValidationChange={props.onToothStatusValidationChange}
          maxillaryHasFixedCard0={maxillaryHasFixedCard0}
          maxillaryHasRemovablesCard0={maxillaryHasRemovablesCard0}
          removablesImpressionDone={maxillaryRemovablesImpressionDone}
          noOpposingNeeded={state.noOpposingNeeded}
          selectedImpressions={state.selectedImpressions}
          opposingProductData={
            initialProductHasOppositeSection &&
            props.initialArch === "mandibular" &&
            mandibularRemovablesImpressionDone
              ? state.initialProductDetails
              : null
          }
          opposingToothExtractionMap={state.opposingToothExtractionMap}
          onOpposingExtractionToggle={state.handleOpposingExtractionToggle}
          onImplantDetailChange={(detail) => { maxillaryImplantDetailRef.current = detail; }}
          onBackToCategories={props.onBackToCategories}
          confirmDetailsChecked={props.confirmDetailsChecked}
          isAnyModalOpen={state.showImpressionModal || state.isStageModalOpen}
        />

        {/* CENTER NAVIGATION */}
        {/* "Teeth in mouth" pill: visible only when removables are active and no extractions applied yet */}
        {(() => {
          const maxHasExtractions = Object.keys(state.maxillaryToothExtractionMap).length > 0;
          const manHasExtractions = Object.keys(state.mandibularToothExtractionMap).length > 0;
          const opposingHasExtractions = Object.keys(state.opposingToothExtractionMap).length > 0;
          const hasOpposing = initialProductHasOppositeSection;
          const hasRemovables = maxillaryHasRemovables || mandibularHasRemovables || hasOpposing;
          // Effective panel visibility accounts for force-shown opposing panel (only after primary impression done)
          const effectiveShowMax = state.showMaxillary || (hasOpposing && props.initialArch === "mandibular" && mandibularRemovablesImpressionDone);
          const effectiveShowMan = state.showMandibular || (hasOpposing && props.initialArch === "maxillary" && maxillaryRemovablesImpressionDone && !userHidMandibular);
          // Show TIM only when at least one panel is visible and no extractions applied
          const showMaxArrow = effectiveShowMax && !maxHasExtractions && (props.initialArch !== "mandibular" || !opposingHasExtractions);
          const showManArrow = effectiveShowMan && !manHasExtractions && (props.initialArch !== "maxillary" || !opposingHasExtractions);
          const showTim = hasRemovables && (effectiveShowMax || effectiveShowMan);
          return (
            <CenterNavigation
              showMaxillary={effectiveShowMax}
              setShowMaxillary={state.setShowMaxillary}
              showMandibular={effectiveShowMan}
              setShowMandibular={handleSetShowMandibular}
              showTeethInMouth={showTim}
              showMaxillaryArrow={showTim && showMaxArrow}
              showMandibularArrow={showTim && showManArrow}
            />
          );
        })()}

        {/* RIGHT PANEL - MANDIBULAR */}
        <MandibularPanel
          showMandibular={
            state.showMandibular ||
            (props.caseSubmitted && (state.mandibularTeeth.length > 0 || Object.keys(state.mandibularRetentionTypes || {}).length > 0)) ||
            (initialProductHasOppositeSection && props.initialArch === "maxillary" && maxillaryRemovablesImpressionDone && !userHidMandibular)
          }
          setShowMandibular={handleSetShowMandibular}
          showDetails={props.caseSubmitted ||
            maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables ||
            maxillaryHasFixedAdded || mandibularHasFixedAdded ||
            maxillaryHasFixedCard0 || mandibularHasFixedCard0 ||
            (initialProductHasOppositeSection && props.initialArch === "maxillary" && maxillaryRemovablesImpressionDone)
          }
          caseSubmitted={props.caseSubmitted}
          disabled={props.caseSubmitted ? false : maxillaryIncomplete}
          // Tooth selection
          mandibularTeeth={state.mandibularTeeth}
          handleMandibularToothClick={state.handleMandibularToothClick}
          mandibularRetentionTypes={state.mandibularRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMandibular}
          retentionOptions={state.initialProductDetails?.retention_options}
          card0Extractions={state.initialProductDetails?.extractions ?? []}
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
          handleShadeFieldClick={state.handleShadeFieldClick}
          // Expansion
          isPrepPonticExpanded={state.isPrepPonticExpanded}
          togglePrepPonticExpanded={state.togglePrepPonticExpanded}
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
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          selectAllMandibularTeeth={state.selectAllMandibularTeeth}
          onToothStatusValidationChange={props.onToothStatusValidationChange}
          mandibularHasFixedCard0={mandibularHasFixedCard0}
          mandibularHasRemovablesCard0={mandibularHasRemovablesCard0}
          removablesImpressionDone={mandibularRemovablesImpressionDone}
          noOpposingNeeded={state.noOpposingNeeded}
          selectedImpressions={state.selectedImpressions}
          opposingProductData={
            initialProductHasOppositeSection &&
            props.initialArch === "maxillary" &&
            maxillaryRemovablesImpressionDone
              ? state.initialProductDetails
              : null
          }
          opposingToothExtractionMap={state.opposingToothExtractionMap}
          onOpposingExtractionToggle={state.handleOpposingExtractionToggle}
          onImplantDetailChange={(detail) => { mandibularImplantDetailRef.current = detail; }}
          onBackToCategories={props.onBackToCategories}
          confirmDetailsChecked={props.confirmDetailsChecked}
          isAnyModalOpen={state.showImpressionModal || state.isStageModalOpen}
          suppressAutoOpen={
            // When both arches selected, suppress mandibular auto-opens until maxillary finishes
            props.initialArch === "both" &&
            isRemovableCategory(props.selectedProductCategoryName || "") &&
            !state.isFieldCompleted("maxillary", MAXILLARY_SENTINEL, "impression")
          }
        />
      </div>

      </div>

      {/* Case Summary Notes with center action icons floating on top */}
      {(() => {
        const hasImpressionCompleted =
          // Show notes whenever any teeth are selected
          state.maxillaryTeeth.length > 0 ||
          state.mandibularTeeth.length > 0 ||
          Object.keys(state.maxillaryRetentionTypes).length > 0 ||
          Object.keys(state.mandibularRetentionTypes || {}).length > 0 ||
          // In read-only mode show notes whenever there are any hydrated products/teeth
          (props.caseSubmitted && (
            Object.keys(state.maxillaryRetentionTypes).length > 0 ||
            Object.keys(state.mandibularRetentionTypes || {}).length > 0 ||
            state.maxillaryTeeth.length > 0 ||
            state.mandibularTeeth.length > 0
          )) ||
          Object.entries(state.maxillaryRetentionTypes).some(([toothNum]) => {
            const n = Number(toothNum);
            return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
          }) ||
          Object.entries(state.mandibularRetentionTypes || {}).some(([toothNum]) => {
            const n = Number(toothNum);
            return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
          }) ||
          (maxillaryHasRemovables && state.maxillaryTeeth.some((tn) =>
            state.isFieldCompleted("maxillary", tn, "impression")
          )) ||
          (mandibularHasRemovables && state.mandibularTeeth.some((tn) =>
            state.isFieldCompleted("mandibular", tn, "impression")
          ));
        if (!hasImpressionCompleted) return null;
        // Hide interactive icons in read-only mode
        const showIcons = !props.caseSubmitted && (maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables);
        return (
          <div className="relative">
            {/* Center action icons — absolutely centered on top of case summary notes */}
            {showIcons && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <CenterActionIcons
                  visible={true}
                  onEdit={() => {}}
                  onAddProduct={() => {
                    // Open the Add Ons modal — determine arch and product based on existing products
                    const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
                    const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
                    if (maxTeeth.length > 0) {
                      state.handleOpenAddOnsModal("maxillary", `prep_${Math.min(...maxTeeth)}`, Math.min(...maxTeeth));
                    } else if (maxillaryHasRemovables && state.maxillaryTeeth.length > 0) {
                      state.handleOpenAddOnsModal("maxillary", `prep_${state.maxillaryTeeth[0]}`, state.maxillaryTeeth[0]);
                    } else if (mandTeeth.length > 0) {
                      state.handleOpenAddOnsModal("mandibular", `prep_${Math.min(...mandTeeth)}`, Math.min(...mandTeeth));
                    } else if (mandibularHasRemovables && state.mandibularTeeth.length > 0) {
                      state.handleOpenAddOnsModal("mandibular", `prep_${state.mandibularTeeth[0]}`, state.mandibularTeeth[0]);
                    } else {
                      // Default to maxillary if no products exist yet
                      state.handleOpenAddOnsModal("maxillary", "prep_0");
                    }
                  }}
                  onRush={props.rushCasesEnabled === false ? undefined : () => {
                    // Determine product IDs for both arches
                    const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
                    const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
                    const maxPid = maxTeeth.length > 0
                      ? `prep_${Math.min(...maxTeeth)}`
                      : (maxillaryHasRemovables && state.maxillaryTeeth.length > 0)
                        ? `prep_${state.maxillaryTeeth[0]}`
                        : "";
                    const mandPid = mandTeeth.length > 0
                      ? `prep_${Math.min(...mandTeeth)}`
                      : (mandibularHasRemovables && state.mandibularTeeth.length > 0)
                        ? `prep_${state.mandibularTeeth[0]}`
                        : "";
                    // Open modal with the first available arch, passing both product IDs
                    if (maxPid) {
                      state.handleOpenRushModal("maxillary", maxPid, maxPid, mandPid);
                    } else if (mandPid) {
                      state.handleOpenRushModal("mandibular", mandPid, maxPid, mandPid);
                    } else {
                      state.setShowRushModal(true);
                    }
                  }}
                  onAttach={() => state.setShowAttachModal(true)}
                  onPhoto={() => state.setShowAttachModal(true)}
                  onStlFile={() => state.setShowAttachModal(true)}
                  hasPhotos={state.attachedPhotoCount > 0}
                  hasStlFiles={state.attachedStlCount > 0}
                />
              </div>
            )}
            <CaseSummaryNotes
              right1Brand={state.right1Brand}
              right1Platform={state.right1Platform}
              right2Brand={state.right2Brand}
              right2Platform={state.right2Platform}
              maxillaryRetentionTypes={state.maxillaryRetentionTypes}
              mandibularRetentionTypes={state.mandibularRetentionTypes}
              maxillaryTeeth={state.maxillaryTeeth}
              mandibularTeeth={state.mandibularTeeth}
              maxillaryToothExtractionMap={state.maxillaryToothExtractionMap}
              mandibularToothExtractionMap={state.mandibularToothExtractionMap}
              getToothProduct={state.getToothProduct}
              getFieldValue={state.getFieldValue}
              getSelectedShade={state.getSelectedShade}
              selectedStages={state.selectedStages}
              getImpressionDisplayText={state.getImpressionDisplayText}
              right1Inclusion={state.right1Inclusion}
              right2Inclusion={state.right2Inclusion}
              addedProducts={state.addedProducts}
              getToothProductCard={state.getToothProductCard}
              fieldValues={state.fieldValues}
              toothProducts={state.toothProducts}
              toothProductCardMap={state.toothProductCardMap}
              selectedShades={state.selectedShades}
              selectedImpressions={state.selectedImpressions}
            />
          </div>
        );
      })()}

      {/* All Modals */}
      <ModalOrchestrator
        showImpressionModal={state.showImpressionModal}
        setShowImpressionModal={state.setShowImpressionModal}
        currentImpressionArch={state.currentImpressionArch}
        currentImpressionProductId={state.currentImpressionProductId}
        currentImpressionToothNumber={state.currentImpressionToothNumber}
        impressionOptions={
          (() => {
            const toothNum = state.currentImpressionToothNumber;
            const arch = state.currentImpressionArch;
            if (toothNum === null) return mockImpressions;
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
            // Single-arch removable: mandibular opposing impressions may run before any mand tooth product row exists
            if (
              !product &&
              isRemovableCategory(props.selectedProductCategoryName || "") &&
              state.initialProductDetails &&
              (state.initialProductDetails.id?.toString() === state.currentImpressionProductId ||
                state.currentImpressionProductId === "0")
            ) {
              product = state.initialProductDetails;
            }
            const options = productImpressionsToModalOptions(product?.impressions);
            return options.length > 0 ? options : mockImpressions;
          })()
        }
        oppositeImpressions={productImpressionsToModalOptions(state.initialProductDetails?.impressions)}
        currentImpressionOppositeImpression={
          (() => {
            // Removable + both arches: one dialog with maxillary and mandibular sections (no mirroring).
            if (
              props.initialArch === "both" &&
              isRemovableCategory(props.selectedProductCategoryName || "")
            ) {
              return "Yes";
            }
            // Single-arch removable with opposing scan: same dual-grid + Skip Opposing flow as primary product.
            if (
              props.initialArch !== "both" &&
              isRemovableCategory(props.selectedProductCategoryName || "") &&
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
              isRemovableCategory(props.selectedProductCategoryName || "") &&
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
          const arch = targetArch || state.currentImpressionArch;
          let toothNum = state.currentImpressionToothNumber;
          
          // Resolve card-0 rep tooth when committing the "other" arch in dual impression flows
          // (both-arches removable, or single-arch removable with opposing scan).
          if (
            isRemovableCategory(props.selectedProductCategoryName || "") &&
            arch !== state.currentImpressionArch &&
            (props.initialArch === "both" ||
              (props.initialArch === "maxillary" && initialProductHasOppositeSection) ||
              (props.initialArch === "mandibular" && initialProductHasOppositeSection))
          ) {
            const card0Teeth = arch === "maxillary" ? state.getMaxillaryCard0Teeth() : state.getMandibularCard0Teeth();
            toothNum = card0Teeth.length > 0 ? card0Teeth[0] : (arch === "maxillary" ? MAXILLARY_SENTINEL : MANDIBULAR_SENTINEL);
          }

          if (toothNum !== null) {
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
            if (
              !product &&
              isRemovableCategory(props.selectedProductCategoryName || "") &&
              state.initialProductDetails &&
              (state.initialProductDetails.id?.toString() === state.currentImpressionProductId ||
                state.currentImpressionProductId === "0")
            ) {
              product = state.initialProductDetails;
            }
            const isFixed = isFixedCategory(getCategoryName(product));
            if (isFixed) {
              // Store impression on the group's owner tooth (min tooth in group) so that
              // getImpressionOwnerTooth resolves to the same tooth when checking completion.
              const ownerTooth = getImpressionOwnerTooth(arch, toothNum);
              state.completeFieldStep(arch, ownerTooth, "fixed_impression", displayText);
            } else {
              state.completeFieldStep(arch, toothNum, "impression", displayText);
            }
          }
        }}
        onImpressionClear={(targetArch) => {
          const arch = targetArch || state.currentImpressionArch;
          let toothNum = state.currentImpressionToothNumber;
          
          if (
            isRemovableCategory(props.selectedProductCategoryName || "") &&
            arch !== state.currentImpressionArch &&
            (props.initialArch === "both" ||
              (props.initialArch === "maxillary" && initialProductHasOppositeSection) ||
              (props.initialArch === "mandibular" && initialProductHasOppositeSection))
          ) {
            const card0Teeth = arch === "maxillary" ? state.getMaxillaryCard0Teeth() : state.getMandibularCard0Teeth();
            toothNum = card0Teeth.length > 0 ? card0Teeth[0] : (arch === "maxillary" ? MAXILLARY_SENTINEL : MANDIBULAR_SENTINEL);
          }

          if (toothNum !== null) {
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
            const isFixed = isFixedCategory(getCategoryName(product));
            const ownerTooth = isFixed ? getImpressionOwnerTooth(arch, toothNum) : toothNum;
            const step = isFixed ? "fixed_impression" : "impression";
            state.uncompleteFieldStep(arch, ownerTooth, step);
          }
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
          props.initialArch === "both" &&
          isRemovableCategory(props.selectedProductCategoryName || "")
        }
        impressionModalHeading={
          props.initialArch === "both" &&
          isRemovableCategory(props.selectedProductCategoryName || "")
            ? "Impressions"
            : undefined
        }
        dualImpressionPrimaryArch={
          props.initialArch === "mandibular" ? "mandibular" : "maxillary"
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
        onAddOnsConfirm={(addOns, confirmArch) => {
          const arch = confirmArch ?? state.currentAddOnsArch;
          const baseTooth = state.currentAddOnsToothNumber;
          if (baseTooth === null) return;

          const openedFromCard0 =
            (state.toothProductCardMap[`${state.currentAddOnsArch}_${baseTooth}`] ?? 0) === 0;

          let toothNum = baseTooth;
          if (
            openedFromCard0 &&
            props.initialArch === "both" &&
            isRemovableCategory(props.selectedProductCategoryName || "")
          ) {
            const card0 =
              arch === "maxillary" ? state.getMaxillaryCard0Teeth() : state.getMandibularCard0Teeth();
            if (card0.length > 0) toothNum = card0[0];
          }

          // Show qty in front of each name: "1x Name, 2x Other"
          const addonLabels = addOns.map((a) => `${a.qty}x ${a.name}`);
          const value = addonLabels.length === 0 ? "0 selected" : addonLabels.join(", ");
          const product = state.getToothProduct(arch, toothNum);
          const isFixed = isFixedCategory(getCategoryName(product));
          if (isFixed) {
            state.completeFieldStep(arch, toothNum, "fixed_addons", value);
          } else {
            state.completeFieldStep(arch, toothNum, "addons", value);
          }
          const structuredAddons = addOns.filter((a) => a.qty > 0).map((a) => ({ addon_id: a.addon_id, qty: a.qty }));
          const addonKey = `${arch}_${toothNum}`;
          state.setSelectedAddonsByTooth((prev: Record<string, Array<{ addon_id: number; qty: number }>>) => ({
            ...prev,
            [addonKey]: structuredAddons,
          }));
        }}
        showAttachModal={state.showAttachModal}
        setShowAttachModal={state.setShowAttachModal}
        attachmentStages={caseStages}
        onAttachFileCountsChange={(photoCount, stlCount) => {
          state.setAttachedPhotoCount(photoCount);
          state.setAttachedStlCount(stlCount);
        }}
        showRushModal={state.showRushModal}
        setShowRushModal={state.setShowRushModal}
        currentRushArch={state.currentRushArch}
        currentRushProductId={state.currentRushProductId}
        currentRushMaxProductId={state.currentRushMaxProductId}
        currentRushMandProductId={state.currentRushMandProductId}
        handleRushConfirm={state.handleRushConfirm}
        rushedProducts={state.rushedProducts}
        handleRemoveRush={state.handleRemoveRush}
        isStageModalOpen={state.isStageModalOpen}
        setIsStageModalOpen={state.setIsStageModalOpen}
        selectedStages={state.selectedStages}
        currentStageProductId={state.currentStageProductId}
        currentStageArch={state.currentStageArch}
        currentStageToothNumber={state.currentStageToothNumber}
        currentStageOptions={(() => {
          const toothNum = state.currentStageToothNumber;
          const arch = state.currentStageArch;
          if (toothNum === null) return null;
          const product = state.getToothProduct(arch, toothNum);
          if (!product?.stages?.length) return null;
          return product.stages.map((s) => ({
            name: s.name,
            letter: s.code?.charAt(0)?.toUpperCase() || s.name.charAt(0).toUpperCase(),
            is_default: s.is_default,
          }));
        })()}
        handleStageSelect={state.handleStageSelect}
        caseSubmitted={props.caseSubmitted}
        onStageConfirm={(stageName) => {
          const toothNum = state.currentStageToothNumber;
          const arch = state.currentStageArch;
          if (toothNum !== null) {
            const product = state.getToothProduct(arch, toothNum);
            const isFixed = isFixedCategory(getCategoryName(product));
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_stage", stageName);
            } else {
              state.completeFieldStep(arch, toothNum, "stage", stageName);
            }
            // Cross-arch stage sync for both-arch removables is handled only inside
            // mirroredCompleteFieldStep (first time the opposite arch has no stage yet),
            // not here — unconditional copy would overwrite the other arch on every change.
          }
        }}
      />
    </div>
  );
}
