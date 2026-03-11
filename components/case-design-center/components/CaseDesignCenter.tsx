"use client";

import { useEffect, useCallback, useMemo } from "react";
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

export function CaseDesignCenter(props: CaseDesignProps) {
  const state = useCaseDesignState(props);

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
  // Include both addedProducts and the initial active product (card 0)
  const maxillaryHasRemovables = isRemovablesCategory("maxillary") || state.activeProductIsRemovablesMaxillary;
  const mandibularHasRemovables = isRemovablesCategory("mandibular") || state.activeProductIsRemovablesMandibular;

  const maxillaryHasRemovablesTeeth =
    maxillaryHasRemovables && state.maxillaryTeeth.length > 0;

  const mandibularHasRemovablesTeeth =
    mandibularHasRemovables && state.mandibularTeeth.length > 0;

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
  // Uses getRemovablesRepTeeth() directly (not the gated maxillaryRemovablesRepTeeth) so it
  // works even before the user has selected any teeth (sentinel tooth has product assigned).
  const maxillaryRemovablesImpressionDone = (() => {
    if (!maxillaryHasRemovables) return false;
    const repTeeth = getRemovablesRepTeeth("maxillary");
    return repTeeth.length > 0 && repTeeth.every((tn) =>
      IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", tn, step))
    );
  })();

  const mandibularRemovablesImpressionDone = (() => {
    if (!mandibularHasRemovables) return false;
    const repTeeth = getRemovablesRepTeeth("mandibular");
    return repTeeth.length > 0 && repTeeth.every((tn) =>
      IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", tn, step))
    );
  })();

  // For Fixed Restoration, impression is stored under the first tooth of the product group.
  // This helper resolves the effective tooth number to check for impression completion.
  const getImpressionOwnerTooth = (arch: "maxillary" | "mandibular", toothNum: number): number => {
    const product = state.getToothProduct(arch, toothNum);
    const isFixed = isFixedCategory(getCategoryName(product));
    if (!isFixed) return toothNum;
    const allTeeth = arch === "maxillary"
      ? Object.keys(state.maxillaryRetentionTypes).map(Number)
      : Object.keys(state.mandibularRetentionTypes || {}).map(Number);
    const productKey = product?.id ?? toothNum;
    const groupTeeth = allTeeth.filter(
      (t) => (state.getToothProduct(arch, t)?.id ?? t) === productKey
    );
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
    const seen = new Map<number, string>();
    // First try from tooth products (most accurate)
    const allTeethKeys = [
      ...Object.keys(state.maxillaryRetentionTypes).map((t) => ({ arch: "maxillary" as const, tn: Number(t) })),
      ...Object.keys(state.mandibularRetentionTypes || {}).map((t) => ({ arch: "mandibular" as const, tn: Number(t) })),
    ];
    for (const { arch, tn } of allTeethKeys) {
      const product = state.getToothProduct(arch, tn);
      if (product?.id && !seen.has(product.id)) {
        seen.set(product.id, product.name);
      }
    }
    // Fallback: include the initial selected product (card 0) if not yet found from teeth
    if (props.selectedProductId && !seen.has(props.selectedProductId) && props.selectedProductName) {
      seen.set(props.selectedProductId, props.selectedProductName);
    }
    // Fallback: also include products from addedProducts (covers cases where toothProducts hasn't loaded yet)
    for (const ap of (props.addedProducts ?? [])) {
      const pid = ap.productId ?? ap.product?.id;
      const pname = ap.product?.name || ap.product?.subcategory?.name || "";
      if (pid && !seen.has(pid) && pname) {
        seen.set(pid, pname);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [state.maxillaryRetentionTypes, state.mandibularRetentionTypes, state.getToothProduct, props.selectedProductId, props.selectedProductName, props.addedProducts]);

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
        if (!state.getSelectedShade(shadeProductId, arch, "stump_shade")) return "Stump Shade";
        if (!state.getSelectedShade(shadeProductId, arch, "tooth_shade")) return "Tooth Shade";
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
          if (!state.getSelectedShade(shadeId, "maxillary", "stump_shade")) return true;
          if (!state.getSelectedShade(shadeId, "maxillary", "tooth_shade")) return true;
        }
      }
      const impressionOwner = getImpressionOwnerTooth("maxillary", n);
      if (!IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", impressionOwner, step))) return true;
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
      state.fetchAndAssignProduct("maxillary", MAXILLARY_SENTINEL, props.selectedProductId);
    }
  }, [state.activeProductIsRemovablesMaxillary, props.selectedProductId]);

  useEffect(() => {
    if (
      state.activeProductIsRemovablesMandibular &&
      props.selectedProductId &&
      !state.getToothProduct("mandibular", MANDIBULAR_SENTINEL)
    ) {
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
          {!props.caseSubmitted && (allMaxillaryAccordionsComplete || allMandibularAccordionsComplete) ? (
            <button
              onClick={() => state.onAddProduct?.("maxillary")}
              className="flex flex-row items-center justify-center px-[10px] py-0 w-[230px] h-[28px] bg-[#1162A8] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] hover:bg-[#0d4a85] cursor-pointer"
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
          {!props.caseSubmitted && (allMaxillaryAccordionsComplete || allMandibularAccordionsComplete) ? (
            <button
              onClick={() => state.onAddProduct?.("mandibular")}
              className="flex flex-row items-center justify-center px-[10px] py-0 w-[230px] h-[28px] bg-[#1162A8] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] hover:bg-[#0d4a85] cursor-pointer"
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
            showMaxillary={state.showMaxillary}
            setShowMaxillary={state.setShowMaxillary}
            showDetails={maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables}
          caseSubmitted={props.caseSubmitted}
          // Tooth selection
          maxillaryTeeth={state.maxillaryTeeth}
          handleMaxillaryToothClick={state.handleMaxillaryToothClick}
          maxillaryRetentionTypes={state.maxillaryRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMaxillary}
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
          removablesImpressionDone={maxillaryRemovablesImpressionDone}
        />

        {/* CENTER NAVIGATION */}
        {/* "Teeth in mouth" pill: visible only when removables are active and no extractions applied yet */}
        {(() => {
          const maxHasExtractions = Object.keys(state.maxillaryToothExtractionMap).length > 0;
          const manHasExtractions = Object.keys(state.mandibularToothExtractionMap).length > 0;
          const hasRemovables = maxillaryHasRemovables || mandibularHasRemovables;
          // Show TIM only when at least one panel is visible and no extractions applied
          const showMaxArrow = state.showMaxillary && !maxHasExtractions;
          const showManArrow = state.showMandibular && !manHasExtractions;
          const showTim = hasRemovables && !maxHasExtractions && !manHasExtractions && (state.showMaxillary || state.showMandibular);
          return (
            <CenterNavigation
              showMaxillary={state.showMaxillary}
              setShowMaxillary={state.setShowMaxillary}
              showMandibular={state.showMandibular}
              setShowMandibular={state.setShowMandibular}
              showTeethInMouth={showTim}
              showMaxillaryArrow={showTim && showMaxArrow}
              showMandibularArrow={showTim && showManArrow}
            />
          );
        })()}

        {/* RIGHT PANEL - MANDIBULAR */}
        <MandibularPanel
          showMandibular={state.showMandibular}
          setShowMandibular={state.setShowMandibular}
          showDetails={maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables}
          caseSubmitted={props.caseSubmitted}
          disabled={maxillaryIncomplete}
          // Tooth selection
          mandibularTeeth={state.mandibularTeeth}
          handleMandibularToothClick={state.handleMandibularToothClick}
          mandibularRetentionTypes={state.mandibularRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMandibular}
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
          removablesImpressionDone={mandibularRemovablesImpressionDone}
        />
      </div>

      </div>

      {/* Case Summary Notes with center action icons floating on top */}
      {(() => {
        const hasImpressionCompleted =
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
        const showIcons = maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables;
        return (
          <div className="relative">
            {/* Center action icons — absolutely centered on top of case summary notes */}
            {showIcons && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <CenterActionIcons
                  visible={true}
                  onEdit={() => {}}
                  onAddProduct={() => {
                    // Use the same wizard-based flow as the MAXILLARY/MANDIBULAR PRODUCT buttons
                    // Determine which arch to add a product for based on existing products
                    const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
                    const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
                    if (maxTeeth.length > 0 || (maxillaryHasRemovables && state.maxillaryTeeth.length > 0)) {
                      state.onAddProduct?.("maxillary");
                    } else if (mandTeeth.length > 0 || (mandibularHasRemovables && state.mandibularTeeth.length > 0)) {
                      state.onAddProduct?.("mandibular");
                    } else {
                      // Default to maxillary if no products exist yet
                      state.onAddProduct?.("maxillary");
                    }
                  }}
                  onRush={() => {
                    // Find the first available product to rush
                    const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
                    const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
                    if (maxTeeth.length > 0) {
                      state.handleOpenRushModal("maxillary", `prep_${Math.min(...maxTeeth)}`);
                    } else if (maxillaryHasRemovables && state.maxillaryTeeth.length > 0) {
                      state.handleOpenRushModal("maxillary", `prep_${state.maxillaryTeeth[0]}`);
                    } else if (mandTeeth.length > 0) {
                      state.handleOpenRushModal("mandibular", `prep_${Math.min(...mandTeeth)}`);
                    } else if (mandibularHasRemovables && state.mandibularTeeth.length > 0) {
                      state.handleOpenRushModal("mandibular", `prep_${state.mandibularTeeth[0]}`);
                    } else {
                      state.setShowRushModal(true);
                    }
                  }}
                  onAttach={() => state.setShowAttachModal(true)}
                  onPhoto={() => {}}
                  onStlFile={() => {}}
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
              getToothProduct={state.getToothProduct}
              getFieldValue={state.getFieldValue}
              getSelectedShade={state.getSelectedShade}
              selectedStages={state.selectedStages}
              getImpressionDisplayText={state.getImpressionDisplayText}
              right1Inclusion={state.right1Inclusion}
              right2Inclusion={state.right2Inclusion}
              addedProducts={state.addedProducts}
              getToothProductCard={state.getToothProductCard}
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
            const product = state.getToothProduct(arch, toothNum);
            const options = productImpressionsToModalOptions(product?.impressions);
            return options.length > 0 ? options : mockImpressions;
          })()
        }
        selectedImpressions={state.selectedImpressions}
        setSelectedImpressions={state.setSelectedImpressions}
        onImpressionConfirm={(displayText) => {
          const toothNum = state.currentImpressionToothNumber;
          const arch = state.currentImpressionArch;
          if (toothNum !== null) {
            const product = state.getToothProduct(arch, toothNum);
            const isFixed = isFixedCategory(getCategoryName(product));
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_impression", displayText);
            } else {
              state.completeFieldStep(arch, toothNum, "impression", displayText);
            }
          }
        }}
        showAddOnsModal={state.showAddOnsModal}
        setShowAddOnsModal={state.setShowAddOnsModal}
        currentAddOnsArch={state.currentAddOnsArch}
        currentAddOnsProductId={state.currentAddOnsProductId}
        currentAddOnsToothNumber={state.currentAddOnsToothNumber}
        addOnsProducts={caseProducts}
        onAddOnsConfirm={(addOns) => {
          const toothNum = state.currentAddOnsToothNumber;
          const arch = state.currentAddOnsArch;
          if (toothNum !== null) {
            // Show qty in front of each name: "1x Name, 2x Other"
            const addonLabels = addOns.map((a) => `${a.qty}x ${a.name}`);
            const maxShow = 2;
            let value: string;
            if (addonLabels.length === 0) {
              value = "0 selected";
            } else if (addonLabels.length <= maxShow) {
              value = addonLabels.join(", ");
            } else {
              value = addonLabels.slice(0, maxShow).join(", ") + ` +${addonLabels.length - maxShow} more`;
            }
            const product = state.getToothProduct(arch, toothNum);
            const isFixed = isFixedCategory(getCategoryName(product));
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_addons", value);
            } else {
              state.completeFieldStep(arch, toothNum, "addons", value);
            }
          }
        }}
        showAttachModal={state.showAttachModal}
        setShowAttachModal={state.setShowAttachModal}
        showRushModal={state.showRushModal}
        setShowRushModal={state.setShowRushModal}
        currentRushArch={state.currentRushArch}
        currentRushProductId={state.currentRushProductId}
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
          }));
        })()}
        handleStageSelect={state.handleStageSelect}
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
          }
        }}
      />
    </div>
  );
}
