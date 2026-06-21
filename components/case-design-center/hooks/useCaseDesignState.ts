"use client";

import { useState, useCallback, useRef, useEffect, useMemo, type SetStateAction } from "react";
import type { CaseDesignProps, Arch, RetentionType, ProductApiData, ProductExtraction, ProductTeethShade } from "../types";
import { mockImpressions } from "../constants";
import { useToothSelection } from "./useToothSelection";
import { useShadeSelection } from "./useShadeSelection";
import { useModalState } from "./useModalState";
import { useProductManagement } from "./useProductManagement";
import { useImplantState } from "./useImplantState";
import {
  useToothFieldProgress,
  FIXED_SHADE_FIELD_TO_STEP,
  getRetentionFieldChain,
  getSelectionFieldChain,
  type FieldStep,
} from "./useToothFieldProgress";
import {
  findArchTeethForProductId,
  FIXED_MIRROR_STEPS,
  isFixedMirrorStep,
  mirrorFixedShadeSelections,
  mirrorFixedStageKey,
  mirrorImpressionSelections,
  resolveFixedGroupRepTooth,
  resolveFixedMirrorTarget,
} from "../utils/fixedArchMirror";
import {
  hasRetentionOptions,
  getResolvedStageName,
  resolveStageSelection,
  shouldSkipStageSelection,
  SKIPPED_STAGE_LABEL,
  productHasSelectableStages,
  serializeStageSelectionFromProduct,
} from "../utils/categoryHelpers";
import { addedProductAppliesToArch } from "../utils/activeProductChartMode";
import {
  isSingleDefaultOnlyExtractionList,
  shouldAutoSelectArchForDefaultExtraction,
} from "../utils/extractionHelpers";
import { productSupportsAddons } from "../utils/addonDisplayHelpers";
import {
  getRepToothForRemovableCard,
  listRemovableCardIdsOnArch,
} from "../utils/archSharedRemovable";
import {
  findArchProductDonor,
  findOppositeArchProductDonor,
  getActiveGrades,
  isGradeFieldValueSkipped,
  mergeEnrichedProductFromDonor,
  productHasGrades,
} from "../utils/gradeHelpers";
import {
  addedProductSlotId,
  defaultActiveAccordionKey,
  firstPreloadedAccordionFocus,
  guidedPhaseAllowsArch,
  productAccordionKey,
  type GuidedBothArchPhase,
} from "../utils/productAccordionFocus";
import { buildShadeSelectionKey } from "../utils/shadeGuideAdvanceFields";
import {
  getOpposingArchTeeth,
  mapOppositeExtractionsToProductExtractions,
  toggleOpposingToothExtraction,
} from "../utils/opposingExtractionHelpers";
import {
  buildToothOwnershipConflictMessage,
  filterTeethAvailableForActiveProduct,
  isToothLockedByAnotherProduct,
  resolveProductCardDisplayName,
} from "../utils/archToothOwnership";
import { isHydratedProductApiData } from "../utils/resolveAddedCardProduct";
import {
  buildImpressionDisplayText,
  getImpressionOptionsForProduct,
  reconcileArchSelectionsWithCatalog,
  resolveImpressionName,
  resolveProductForImpression,
} from "../utils/impressionFieldSync";
import {
  emptyImpressionSelections,
  isSlipImpressionSelections,
  migrateLegacyFlatImpressions,
} from "../utils/impressionStorage";
import {
  buildFixedShadeProductId,
  getDefaultShadeGuideFromProduct,
  getShadeGuideAdvanceFields,
  getShadeFieldType,
  getShadeGuideOptionsFromProduct,
  resolveProductForShadeStorageId,
  shouldUseAccordionOnlyFixedShades,
} from "../utils/shadeGuideAdvanceFields";
import { ProductApi } from "../../../lib/api-service";
import { resolveLibraryCustomerId } from "../utils/libraryCustomerId";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface TeethShadeEntry {
  id: number;
  teeth_shade_id: number;
  name: string;
  brand?: { id: number } | null;
}

/** Fetch teeth shade catalog once for ID resolution at shade selection time.
 *  Uses /v1/library/teeth-shade-brands which returns brands with nested shades. */
let _teethShadeCatalogCache: TeethShadeEntry[] | null = null;
let _teethShadeCatalogPromise: Promise<TeethShadeEntry[]> | null = null;

async function fetchTeethShadeCatalog(): Promise<TeethShadeEntry[]> {
  if (_teethShadeCatalogCache) return _teethShadeCatalogCache;
  if (_teethShadeCatalogPromise) return _teethShadeCatalogPromise;

  _teethShadeCatalogPromise = (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return [];
      const url = new URL("/v1/library/teeth-shade-brands", API_BASE_URL);
      url.searchParams.set("lang", "en");
      url.searchParams.set("per_page", "100");
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const json = await res.json();
      // API returns { data: { data: TeethShadeBrand[], pagination: ... } }
      // Each brand has brand.shades[] (not brand.teeth_shades[])
      const brands: any[] = json.data?.data ?? json.data ?? [];
      const entries: TeethShadeEntry[] = [];
      for (const brand of brands) {
        const shades: any[] = brand.shades ?? brand.teeth_shades ?? brand.teethShades ?? [];
        for (const shade of shades) {
          entries.push({
            id: shade.id,
            teeth_shade_id: shade.id,
            name: shade.name ?? "",
            brand: brand.id ? { id: brand.id } : null,
          });
        }
      }
      _teethShadeCatalogCache = entries;
      return entries;
    } catch {
      return [];
    } finally {
      _teethShadeCatalogPromise = null;
    }
  })();

  return _teethShadeCatalogPromise;
}

/** Module-level cache & in-flight dedup for product details to avoid duplicate API calls */
const _productDetailsCache = new Map<string, ProductApiData>();
const _productDetailsInflight = new Map<string, Promise<ProductApiData | null>>();

/** Fetch full product details (stages, impressions, gum_shades, etc.) */
async function fetchProductDetails(productId: number, customerId: number): Promise<ProductApiData | null> {
  const cacheKey = `${productId}_${customerId}`;

  // Return from cache if available
  const cached = _productDetailsCache.get(cacheKey);
  if (cached) return cached;

  // Deduplicate in-flight requests for the same product
  const inflight = _productDetailsInflight.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const url = new URL(`/v1/library/products/${productId}`, API_BASE_URL);
      url.searchParams.set("lang", "en");
      url.searchParams.set("customer_id", String(customerId));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return null;

      const json = await res.json();
      const data = json.data || null;
      if (data) _productDetailsCache.set(cacheKey, data);
      return data;
    } catch {
      return null;
    } finally {
      _productDetailsInflight.delete(cacheKey);
    }
  })();

  _productDetailsInflight.set(cacheKey, promise);
  return promise;
}

export function useCaseDesignState(props: CaseDesignProps) {
  // 0 = initial product; any other value = AddedProduct.id
  const [activeProductCardId, setActiveProductCardId] = useState<number>(() => {
    if (!props.preloadInitialSlipState) return 0;
    const focus = firstPreloadedAccordionFocus(props.initialArch, props.addedProducts);
    return focus?.productCardId ?? 0;
  });

  // Expansion states
  const [expandedCard, setExpandedCard] = useState(true);
  const [expandedLeft, setExpandedLeft] = useState(true);
  const [expandedLeft2, setExpandedLeft2] = useState(false);
  const [expandedRight2, setExpandedRight2] = useState(false);
  // Prep/Pontic cards (maxillary): which tooth cards are expanded. Default open (true).
  const [expandedPrepPontic, setExpandedPrepPontic] = useState<Record<number, boolean>>({});

  const togglePrepPonticExpanded = (toothNumber: number) => {
    setExpandedPrepPontic((prev) => {
      const currentlyExpanded = prev[toothNumber] !== false;
      if (currentlyExpanded) {
        return { ...prev, [toothNumber]: false };
      }
      const allCollapsed: Record<number, boolean> = {};
      for (const key of Object.keys(prev)) {
        allCollapsed[Number(key)] = false;
      }
      return { ...allCollapsed, [toothNumber]: true };
    });
  };
  const isPrepPonticExpanded = (toothNumber: number) => expandedPrepPontic[toothNumber] !== false;
  // In read-only (virtual slip) mode, always show both arches regardless of initialArch.
  const [showMaxillary, setShowMaxillary] = useState(props.caseSubmitted ? true : props.initialArch !== "mandibular");
  const [showMandibular, setShowMandibular] = useState(props.caseSubmitted ? true : props.initialArch !== "maxillary");
  const [showDetails, setShowDetails] = useState(false);

  // Opposing arch extraction map: toothNumber → extractionCode
  const [opposingToothExtractionMap, setOpposingToothExtractionMap] = useState<Record<number, string>>({});
  const [opposingClaspTeeth, setOpposingClaspTeeth] = useState<number[]>([]);
  const [opposingNoActiveBoxTeeth, setOpposingNoActiveBoxTeeth] = useState<number[]>([]);
  const [opposingSelectedTeeth, setOpposingSelectedTeeth] = useState<number[]>([]);

  // Structured addon selections: keyed as `${arch}_${toothNumber}` → [{addon_id, qty}]
  const [selectedAddonsByTooth, setSelectedAddonsByTooth] = useState<Record<string, Array<{ addon_id: number; qty: number }>>>({});

  const handleOpposingExtractionToggle = useCallback(
    (toothNumber: number, extractionCode: string, extractions?: ProductExtraction[]) => {
      setOpposingSelectedTeeth((prev) =>
        prev.includes(toothNumber) ? prev : [...prev, toothNumber]
      );
      toggleOpposingToothExtraction({
        toothNumber,
        extractionCode,
        extractions,
        toothExtractionMap: opposingToothExtractionMap,
        setToothExtractionMap: setOpposingToothExtractionMap,
        setClaspTeeth: setOpposingClaspTeeth,
      });
    },
    [opposingToothExtractionMap]
  );

  const selectAllOpposingTeeth = useCallback((teeth: number[]) => {
    setOpposingSelectedTeeth((prev) => [...new Set([...prev, ...teeth])]);
  }, []);

  // Fetch initial product details (for retention_options used by retention popover)
  const [initialProductDetails, setInitialProductDetails] = useState<ProductApiData | null>(null);
  const [initialProductDetailsPending, setInitialProductDetailsPending] = useState(
    () => !!props.selectedProductId
  );

  // Cache product data so we only fetch from API once (supports multiple products).
  // Must be declared before isActiveNonRetentionProduct / enrichProductWithGrades.
  const cachedProductRef = useRef<Map<number, ProductApiData>>(new Map());

  const MAXILLARY_ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const MANDIBULAR_ALL = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

  const isActiveNonRetentionProduct = (arch: Arch): boolean => {
    if (activeProductCardId === 0) {
      if (initialProductDetails === null) return false;
      if (hasRetentionOptions(initialProductDetails)) return false;
      if (props.initialArch === "maxillary" && arch === "mandibular") return false;
      if (props.initialArch === "mandibular" && arch === "maxillary") return false;
      return true;
    }
    const ap = (props.addedProducts ?? []).find((p) => p.id === activeProductCardId);
    if (!addedProductAppliesToArch(ap, arch)) return false;
    if (hasRetentionOptions(ap?.product)) return false;
    if (ap?.productId) {
      const cached = cachedProductRef.current.get(ap.productId);
      if (cached) return !hasRetentionOptions(cached);
    }
    return !hasRetentionOptions(ap?.product);
  };

  // Only treat the arch as selection-only when the ACTIVE product card has no retention options.
  // Previously this was true when ANY product in the arch was removable, which broke
  // tooth selection for non-removable products (e.g. Fixed Restoration) on the same arch.
  const treatArchAsSelectionOnly = {
    maxillary: isActiveNonRetentionProduct("maxillary"),
    mandibular: isActiveNonRetentionProduct("mandibular"),
  };

  const teeth = useToothSelection(props.addedProducts ?? [], treatArchAsSelectionOnly);
  const shades = useShadeSelection();
  const modals = useModalState();
  const products = useProductManagement(props.addedProducts, props.onProductsChange);

  /** Only one product accordion (upper or lower) is expanded and interactive at a time. */
  const [activeAccordionKey, setActiveAccordionKey] = useState<string>(() =>
    props.preloadInitialSlipState
      ? defaultActiveAccordionKey(props.initialArch, props.addedProducts)
      : defaultActiveAccordionKey(props.initialArch)
  );

  /** Both-arch slip creation: upper selection → lower selection → upper fields → lower fields. */
  const guidedBothArches = props.initialArch === "both" && !props.caseSubmitted;
  const [guidedBothArchPhase, setGuidedBothArchPhase] =
    useState<GuidedBothArchPhase>("upper-selection");
  const crossArchFlowRef = useRef({
    upperDoneJumped: false,
    lowerDoneJumped: false,
    upperFieldsDoneJumped: false,
  });

  const isGuidedArchInteractive = useCallback(
    (arch: Arch) => {
      if (!guidedBothArches) return true;
      return guidedPhaseAllowsArch(guidedBothArchPhase, arch);
    },
    [guidedBothArches, guidedBothArchPhase]
  );

  const syncAddedExpanded = useCallback(
    (arch: Arch | null, productId: number | null) => {
      products.setOnlyExpandedAddedProduct(arch, productId);
    },
    [products.setOnlyExpandedAddedProduct]
  );

  const focusAccordion = useCallback(
    (arch: Arch, slotId: string, cardId?: number) => {
      setActiveAccordionKey(productAccordionKey(arch, slotId));
      if (cardId !== undefined) {
        setActiveProductCardId(cardId);
      } else if (slotId === "removable0") {
        setActiveProductCardId(0);
      } else if (slotId.startsWith("added:")) {
        const id = Number(slotId.slice(6));
        if (!Number.isNaN(id)) setActiveProductCardId(id);
      }
      if (slotId.startsWith("added:")) {
        const id = Number(slotId.slice(6));
        syncAddedExpanded(arch, id);
      } else {
        syncAddedExpanded(null, null);
      }
      if (arch === "maxillary") setShowMaxillary(true);
      else setShowMandibular(true);
    },
    [syncAddedExpanded]
  );

  const toggleAccordionFocus = useCallback(
    (arch: Arch, slotId: string, cardId?: number) => {
      if (guidedBothArches && !guidedPhaseAllowsArch(guidedBothArchPhase, arch)) {
        return;
      }
      const key = productAccordionKey(arch, slotId);
      if (activeAccordionKey === key) {
        setActiveAccordionKey("");
        syncAddedExpanded(null, null);
        return;
      }
      focusAccordion(arch, slotId, cardId);
    },
    [activeAccordionKey, focusAccordion, guidedBothArches, guidedBothArchPhase, syncAddedExpanded]
  );

  const isAccordionExpanded = useCallback(
    (arch: Arch, slotId: string) => activeAccordionKey === productAccordionKey(arch, slotId),
    [activeAccordionKey]
  );

  const isAccordionEnabled = useCallback(
    (arch: Arch, slotId: string) => {
      const key = productAccordionKey(arch, slotId);
      if (
        guidedBothArches &&
        !guidedPhaseAllowsArch(guidedBothArchPhase, arch)
      ) {
        return false;
      }
      if (!activeAccordionKey || activeAccordionKey === key) return true;
      // Card 0 fixed uses fixed0_* while default focus is still removable0 (no removable on arch).
      if (
        slotId.startsWith("fixed0_") &&
        activeAccordionKey === productAccordionKey(arch, "removable0")
      ) {
        return true;
      }
      return false;
    },
    [activeAccordionKey, guidedBothArches, guidedBothArchPhase]
  );

  const preloadAccordionFocusDoneRef = useRef(false);
  useEffect(() => {
    if (!props.preloadInitialSlipState || preloadAccordionFocusDoneRef.current) return;
    const added = props.addedProducts ?? [];
    if (added.length === 0) return;
    const focus = firstPreloadedAccordionFocus(props.initialArch, added);
    if (!focus) return;
    preloadAccordionFocusDoneRef.current = true;
    focusAccordion(focus.arch, addedProductSlotId(focus.productCardId), focus.productCardId);
  }, [props.preloadInitialSlipState, props.addedProducts, props.initialArch, focusAccordion]);

  const prevAddedProductsLengthRef = useRef((props.addedProducts ?? []).length);
  useEffect(() => {
    const addedProducts = props.addedProducts ?? [];
    if (addedProducts.length > prevAddedProductsLengthRef.current) {
      const newest = addedProducts[0];
      if (newest) {
        focusAccordion(newest.arch as Arch, addedProductSlotId(newest.id), newest.id);
      }
    } else if (addedProducts.length < prevAddedProductsLengthRef.current) {
      setActiveProductCardId((prev) => {
        const stillExists = addedProducts.some((ap) => ap.id === prev);
        return stillExists ? prev : 0;
      });
    }
    prevAddedProductsLengthRef.current = addedProducts.length;
  }, [props.addedProducts, focusAccordion]);

  const implants = useImplantState();
  const toothFieldProgress = useToothFieldProgress();

  // ── Guided cross-arch flow (both arches, card 0 — all product categories) ──
  //   1. Upper tooth/status selection → Done → lower selection
  //   2. Lower selection → Done → upper fields
  //   3. Upper fields complete → lower fields
  const focusArchCard0 = useCallback(
    (arch: Arch) => {
      focusAccordion(arch, "removable0", 0);
    },
    [focusAccordion]
  );

  const advanceGuidedSelectionDone = useCallback(
    (arch: Arch) => {
      if (!guidedBothArches) return;
      if (arch === "maxillary") {
        if (crossArchFlowRef.current.upperDoneJumped) return;
        crossArchFlowRef.current.upperDoneJumped = true;
        setGuidedBothArchPhase("lower-selection");
        focusArchCard0("mandibular");
      } else {
        if (crossArchFlowRef.current.lowerDoneJumped) return;
        crossArchFlowRef.current.lowerDoneJumped = true;
        setGuidedBothArchPhase("upper-fields");
        focusArchCard0("maxillary");
      }
    },
    [guidedBothArches, focusArchCard0]
  );

  const handleArchExtractionsDone = useCallback(
    (arch: Arch) => {
      advanceGuidedSelectionDone(arch);
    },
    [advanceGuidedSelectionDone]
  );

  const handleArchRetentionDone = useCallback(
    (arch: Arch) => {
      advanceGuidedSelectionDone(arch);
    },
    [advanceGuidedSelectionDone]
  );

  const findCard0RepTooth = useCallback(
    (arch: Arch): number | null => {
      const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const selectedTeeth =
        arch === "maxillary" ? teeth.maxillaryTeeth : (teeth.mandibularTeeth ?? []);
      const fromSelected = selectedTeeth
        .filter(
          (tn) =>
            toothFieldProgress.getToothProductCard(arch, tn) === 0 &&
            toothFieldProgress.getToothProduct(arch, tn)
        )
        .sort((a, b) => a - b)[0];
      if (fromSelected != null) return fromSelected;

      const retentionTypes =
        arch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes ?? {};
      for (const tn of allTeeth) {
        const types = retentionTypes[tn];
        if (!types?.length) continue;
        if (toothFieldProgress.getToothProductCard(arch, tn) !== 0) continue;
        if (!toothFieldProgress.getToothProduct(arch, tn)) continue;
        return tn;
      }
      return null;
    },
    [
      MAXILLARY_ALL,
      MANDIBULAR_ALL,
      teeth.maxillaryTeeth,
      teeth.mandibularTeeth,
      teeth.maxillaryRetentionTypes,
      teeth.mandibularRetentionTypes,
      toothFieldProgress.getToothProduct,
      toothFieldProgress.getToothProductCard,
    ]
  );

  const upperCard0FieldsComplete = useMemo(() => {
    if (!guidedBothArches) return false;
    const repTooth = findCard0RepTooth("maxillary");
    if (repTooth == null) return false;
    const product = toothFieldProgress.getToothProduct("maxillary", repTooth);
    if (!product) return false;
    const chain = hasRetentionOptions(product)
      ? getRetentionFieldChain(product.advance_fields, product)
      : getSelectionFieldChain(product);
    // Optional steps (add-ons) don't block completion — the user normally never opens
    // that modal, so requiring them would stall the upper→lower-fields phase transition.
    const requiredChain = chain.filter(
      (step) => step !== "addons" && step !== "fixed_addons"
    );
    if (requiredChain.length === 0) return false;
    const impressionStep = requiredChain.includes("fixed_impression")
      ? ("fixed_impression" as FieldStep)
      : requiredChain.includes("impression")
      ? ("impression" as FieldStep)
      : null;
    // User-requested behavior: once upper impression is selected/completed,
    // treat upper card-0 fields as complete so lower-side fields can appear.
    if (impressionStep) {
      return toothFieldProgress.isFieldCompleted(
        "maxillary",
        repTooth,
        impressionStep
      );
    }
    return requiredChain.every((step) =>
      toothFieldProgress.isFieldCompleted("maxillary", repTooth, step as FieldStep)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    guidedBothArches,
    findCard0RepTooth,
    toothFieldProgress.completedFields,
    toothFieldProgress.fieldValues,
    toothFieldProgress.toothProducts,
    toothFieldProgress.toothProductCardMap,
    teeth.maxillaryRetentionTypes,
  ]);

  useEffect(() => {
    if (!guidedBothArches) return;
    if (!upperCard0FieldsComplete) return;
    if (crossArchFlowRef.current.upperFieldsDoneJumped) return;
    if (!crossArchFlowRef.current.lowerDoneJumped) return;
    crossArchFlowRef.current.upperFieldsDoneJumped = true;
    setGuidedBothArchPhase("lower-fields");
    focusArchCard0("mandibular");
  }, [guidedBothArches, upperCard0FieldsComplete, focusArchCard0]);

  // ── Auto-copy between arches for removable restoration "both arches" ──
  // When user selects "both arches", configuring one side auto-copies to the other.
  // The primary flow is upper-first: user fills maxillary, values copy to mandibular.
  // Reverse (mandibular → maxillary) also works to cover auto-select race conditions
  // and manual mandibular-first edits.

  /** Removable field steps that should be mirrored when both arches are selected */
  const REMOVABLE_MIRROR_STEPS = new Set<string>([
    "grade",
    "stage",
    "teeth_shade",
    "gum_shade",
    "impression",
    "addons",
  ]);

  const isCard0RemovableOnArch = useCallback(
    (arch: Arch): boolean => {
      if (!initialProductDetails || hasRetentionOptions(initialProductDetails)) return false;
      if (props.initialArch === "maxillary" && arch === "mandibular") return false;
      if (props.initialArch === "mandibular" && arch === "maxillary") return false;
      return true;
    },
    [initialProductDetails, props.initialArch]
  );

  const enrichProductWithGrades = useCallback(
    (arch: Arch, product: ProductApiData): ProductApiData => {
      const oppositeTeeth = arch === "maxillary" ? MANDIBULAR_ALL : MAXILLARY_ALL;
      const archTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const donor =
        findOppositeArchProductDonor(
          arch,
          product.id,
          toothFieldProgress.getToothProduct,
          oppositeTeeth
        ) ??
        findArchProductDonor(arch, product.id, toothFieldProgress.getToothProduct, archTeeth);
      if (donor) return mergeEnrichedProductFromDonor(product, donor);
      for (const cached of cachedProductRef.current.values()) {
        if (cached.id === product.id) {
          return mergeEnrichedProductFromDonor(product, cached);
        }
      }
      if (initialProductDetails?.id === product.id) {
        return mergeEnrichedProductFromDonor(product, initialProductDetails);
      }
      return product;
    },
    [initialProductDetails, toothFieldProgress.getToothProduct]
  );

  const handleOpenImpressionModal = useCallback(
    (arch: Arch, productId: string, toothNumber?: number) => {
      modals.handleOpenImpressionModal(arch, productId, toothNumber);
    },
    [modals.handleOpenImpressionModal]
  );

  /** Mirror grade / stage / shades / addons to other removable products on the same arch. */
  const applySameArchRemovableMirror = useCallback(
    (
      sourceArch: Arch,
      sourceTooth: number,
      step: FieldStep,
      apply: (targetArch: Arch, targetTooth: number) => void
    ) => {
      if (!REMOVABLE_MIRROR_STEPS.has(step)) return;
      const sourceProduct = toothFieldProgress.getToothProduct(sourceArch, sourceTooth);
      if (sourceProduct && hasRetentionOptions(sourceProduct)) return;

      const sourceCardId = toothFieldProgress.getToothProductCard(sourceArch, sourceTooth) ?? 0;
      const allTeeth = sourceArch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const cardIds = listRemovableCardIdsOnArch(
        sourceArch,
        props.addedProducts ?? [],
        isCard0RemovableOnArch(sourceArch)
      );
      if (cardIds.length <= 1) return;

      if (step === "grade") {
        const sourceGradeVal = toothFieldProgress.getFieldValue(sourceArch, sourceTooth, step);
        if (isGradeFieldValueSkipped(sourceGradeVal)) return;
      }

      for (const cardId of cardIds) {
        if (cardId === sourceCardId) continue;
        const repTooth = getRepToothForRemovableCard(
          sourceArch,
          cardId,
          allTeeth,
          toothFieldProgress.getToothProductCard,
          toothFieldProgress.getToothProduct
        );
        if (repTooth === sourceTooth) continue;
        if (!toothFieldProgress.isFieldCompleted(sourceArch, sourceTooth, step)) continue;
        if (!toothFieldProgress.isFieldCompleted(sourceArch, repTooth, step)) {
          apply(sourceArch, repTooth);
        }
      }

      if (step === "stage") {
        const sourceKey = `${sourceArch}_prep_${sourceTooth}`;
        const stageVal = modals.selectedStages[sourceKey];
        if (!stageVal) return;
        modals.setSelectedStages((prev) => {
          let next = prev;
          for (const cardId of cardIds) {
            if (cardId === sourceCardId) continue;
            const repTooth = getRepToothForRemovableCard(
              sourceArch,
              cardId,
              allTeeth,
              toothFieldProgress.getToothProductCard,
              toothFieldProgress.getToothProduct
            );
            const targetKey = `${sourceArch}_prep_${repTooth}`;
            if (!next[targetKey]) {
              next = { ...next, [targetKey]: stageVal };
            }
          }
          return next;
        });
      }

    },
    [
      props.addedProducts,
      isCard0RemovableOnArch,
      toothFieldProgress,
      modals.selectedStages,
      modals.setSelectedStages,
    ]
  );

  /** Returns all mandibular tooth numbers that belong to card 0 */
  const getMandibularCard0Teeth = useCallback((): number[] => {
    return MANDIBULAR_ALL.filter(
      (tn) => (toothFieldProgress.toothProductCardMap[`mandibular_${tn}`] ?? 0) === 0 &&
              toothFieldProgress.toothProducts[`mandibular_${tn}`]
    );
  }, [toothFieldProgress.toothProductCardMap, toothFieldProgress.toothProducts]);

  /** Returns all maxillary tooth numbers that belong to card 0 */
  const getMaxillaryCard0Teeth = useCallback((): number[] => {
    return MAXILLARY_ALL.filter(
      (tn) => (toothFieldProgress.toothProductCardMap[`maxillary_${tn}`] ?? 0) === 0 &&
              toothFieldProgress.toothProducts[`maxillary_${tn}`]
    );
  }, [toothFieldProgress.toothProductCardMap, toothFieldProgress.toothProducts]);

  /**
   * Check if a field completion should be mirrored to the other arch.
   * Returns the target arch to mirror to, or null if no mirroring needed.
   */
  const getMirrorTargetArch = useCallback(
    (arch: "maxillary" | "mandibular", toothNumber: number, step: string): "maxillary" | "mandibular" | null => {
      if (props.initialArch !== "both") return null;
      if (!REMOVABLE_MIRROR_STEPS.has(step)) return null;
      // Only mirror when the initial product (card 0) is a removable
      if (hasRetentionOptions(initialProductDetails)) return null;
      // Only mirror card-0 teeth
      const cardId = toothFieldProgress.toothProductCardMap[`${arch}_${toothNumber}`] ?? 0;
      if (cardId !== 0) return null;
      // Return the opposite arch
      return arch === "maxillary" ? "mandibular" : "maxillary";
    },
    [props.initialArch, initialProductDetails, toothFieldProgress.toothProductCardMap]
  );

  /** Get the card-0 teeth for a given arch */
  const getCard0TeethForArch = useCallback(
    (arch: "maxillary" | "mandibular"): number[] => {
      return arch === "mandibular" ? getMandibularCard0Teeth() : getMaxillaryCard0Teeth();
    },
    [getMandibularCard0Teeth, getMaxillaryCard0Teeth]
  );

  const mirrorFixedAuxiliaryState = useCallback(
    (
      sourceArch: Arch,
      sourceRepTooth: number,
      targetArch: Arch,
      targetRepTooth: number,
      productApiId: number,
      impressionProductId?: string
    ) => {
      const sourceRetentionTypes =
        sourceArch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes;

      const nextStages = mirrorFixedStageKey(
        sourceArch,
        sourceRepTooth,
        targetArch,
        targetRepTooth,
        modals.selectedStages
      );
      if (nextStages) modals.setSelectedStages(nextStages);

      const impressionId =
        impressionProductId ?? productApiId.toString();
      const nextImpressions = mirrorImpressionSelections(
        impressionId,
        sourceArch,
        targetArch,
        modals.selectedImpressions
      );
      if (nextImpressions) modals.setSelectedImpressions(nextImpressions);

      const sourceAddonKey = `${sourceArch}_${sourceRepTooth}`;
      const targetAddonKey = `${targetArch}_${targetRepTooth}`;
      if (
        selectedAddonsByTooth[sourceAddonKey]?.length &&
        !selectedAddonsByTooth[targetAddonKey]?.length
      ) {
        setSelectedAddonsByTooth((prev) => ({
          ...prev,
          [targetAddonKey]: [...(prev[sourceAddonKey] ?? [])],
        }));
      }

      const nextShades = mirrorFixedShadeSelections(
        productApiId,
        sourceArch,
        targetArch,
        shades.selectedShades
      );
      if (nextShades) shades.setSelectedShades(nextShades);
    },
    [
      teeth.maxillaryRetentionTypes,
      teeth.mandibularRetentionTypes,
      modals.selectedStages,
      modals.setSelectedStages,
      modals.selectedImpressions,
      modals.setSelectedImpressions,
      selectedAddonsByTooth,
      setSelectedAddonsByTooth,
      shades.selectedShades,
      shades.setSelectedShades,
    ]
  );

  /** Bulk-copy existing fixed field progress from the opposite arch (same product id). */
  const mirrorAllExistingFixedProgress = useCallback(
    (targetArch: Arch, targetRepTooth: number, productApiId: number) => {
      const sourceArch: Arch = targetArch === "maxillary" ? "mandibular" : "maxillary";
      const sourceRetentionTypes =
        sourceArch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes;
      const sourceTeeth = findArchTeethForProductId(
        sourceArch,
        productApiId,
        sourceRetentionTypes,
        toothFieldProgress.getToothProduct
      );
      if (sourceTeeth.length === 0) return;

      const sourceRepTooth = resolveFixedGroupRepTooth(
        sourceArch,
        sourceTeeth,
        toothFieldProgress.getToothProduct,
        toothFieldProgress.isFieldCompleted,
        toothFieldProgress.getFieldValue
      );
      if (sourceRepTooth == null) return;

      for (const step of FIXED_MIRROR_STEPS) {
        const fieldStep = step as FieldStep;
        if (
          toothFieldProgress.isFieldCompleted(sourceArch, sourceRepTooth, fieldStep) &&
          !toothFieldProgress.isFieldCompleted(targetArch, targetRepTooth, fieldStep)
        ) {
          const value =
            toothFieldProgress.getFieldValue(sourceArch, sourceRepTooth, fieldStep) || "";
          toothFieldProgress.completeFieldStep(targetArch, targetRepTooth, fieldStep, value);
        }
      }

      mirrorFixedAuxiliaryState(
        sourceArch,
        sourceRepTooth,
        targetArch,
        targetRepTooth,
        productApiId
      );
    },
    [
      teeth.maxillaryRetentionTypes,
      teeth.mandibularRetentionTypes,
      toothFieldProgress,
      mirrorFixedAuxiliaryState,
    ]
  );

  const applyCrossArchFieldMirror = useCallback(
    (
      sourceArch: Arch,
      sourceTooth: number,
      step: FieldStep,
      apply: (targetArch: Arch, targetTooth: number) => void
    ) => {
      const removableTarget = getMirrorTargetArch(sourceArch, sourceTooth, step);
      if (removableTarget) {
        for (const tn of getCard0TeethForArch(removableTarget)) {
          if (!toothFieldProgress.isFieldCompleted(removableTarget, tn, step)) {
            apply(removableTarget, tn);
          }
        }
        return;
      }

      if (!isFixedMirrorStep(step)) return;

      const mirrorTarget = resolveFixedMirrorTarget(
        sourceArch,
        sourceTooth,
        teeth.maxillaryRetentionTypes,
        teeth.mandibularRetentionTypes,
        toothFieldProgress.getToothProduct,
        toothFieldProgress.isFieldCompleted,
        toothFieldProgress.getFieldValue
      );
      if (!mirrorTarget) return;

      const { targetArch, targetRepTooth, productApiId } = mirrorTarget;
      if (!toothFieldProgress.isFieldCompleted(targetArch, targetRepTooth, step)) {
        apply(targetArch, targetRepTooth);
      }

      const sourceRetentionTypes =
        sourceArch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes;
      const sourceTeeth = findArchTeethForProductId(
        sourceArch,
        productApiId,
        sourceRetentionTypes,
        toothFieldProgress.getToothProduct
      );
      const sourceRepTooth = resolveFixedGroupRepTooth(
        sourceArch,
        sourceTeeth,
        toothFieldProgress.getToothProduct,
        toothFieldProgress.isFieldCompleted,
        toothFieldProgress.getFieldValue
      );
      if (sourceRepTooth != null) {
        mirrorFixedAuxiliaryState(
          sourceArch,
          sourceRepTooth,
          targetArch,
          targetRepTooth,
          productApiId
        );
      }
    },
    [
      getMirrorTargetArch,
      getCard0TeethForArch,
      toothFieldProgress,
      teeth.maxillaryRetentionTypes,
      teeth.mandibularRetentionTypes,
      mirrorFixedAuxiliaryState,
    ]
  );

  /** Wrapped completeFieldStep: cross-arch copy for card-0 "both arches" only (not same-arch multi-product). */
  const mirroredCompleteFieldStep = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep, value: string) => {
      toothFieldProgress.completeFieldStep(arch, toothNumber, step, value);
      const skipGradeMirror = step === "grade" && isGradeFieldValueSkipped(value);
      if (skipGradeMirror) return;
      applyCrossArchFieldMirror(arch, toothNumber, step, (targetArch, targetTooth) => {
        toothFieldProgress.completeFieldStep(targetArch, targetTooth, step, value);
      });
    },
    [toothFieldProgress.completeFieldStep, applyCrossArchFieldMirror]
  );

  /** Wrapped storeFieldValue: cross-arch copy for card-0 "both arches" only. */
  const mirroredStoreFieldValue = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep, value: string) => {
      toothFieldProgress.storeFieldValue(arch, toothNumber, step, value);
      applyCrossArchFieldMirror(arch, toothNumber, step, (targetArch, targetTooth) => {
        toothFieldProgress.storeFieldValue(targetArch, targetTooth, step, value);
      });
    },
    [toothFieldProgress.storeFieldValue, applyCrossArchFieldMirror]
  );

  /** Wrapped uncompleteFieldStep: auto-copies removable + fixed uncomplete to the other arch */
  const mirroredUncompleteFieldStep = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep) => {
      toothFieldProgress.uncompleteFieldStep(arch, toothNumber, step);
      const removableTarget = getMirrorTargetArch(arch, toothNumber, step);
      if (removableTarget) {
        for (const tn of getCard0TeethForArch(removableTarget)) {
          toothFieldProgress.uncompleteFieldStep(removableTarget, tn, step);
        }
        return;
      }
      if (!isFixedMirrorStep(step)) return;
      const mirrorTarget = resolveFixedMirrorTarget(
        arch,
        toothNumber,
        teeth.maxillaryRetentionTypes,
        teeth.mandibularRetentionTypes,
        toothFieldProgress.getToothProduct,
        toothFieldProgress.isFieldCompleted,
        toothFieldProgress.getFieldValue
      );
      if (mirrorTarget) {
        toothFieldProgress.uncompleteFieldStep(
          mirrorTarget.targetArch,
          mirrorTarget.targetRepTooth,
          step
        );
      }
    },
    [
      toothFieldProgress.uncompleteFieldStep,
      getMirrorTargetArch,
      getCard0TeethForArch,
      teeth.maxillaryRetentionTypes,
      teeth.mandibularRetentionTypes,
      toothFieldProgress.getToothProduct,
      toothFieldProgress.isFieldCompleted,
      toothFieldProgress.getFieldValue,
    ]
  );

  // Auto-activate the newest added product so teeth clicks assign to it.
  // New products are prepended (first in the array), so check current[0].
  const prevAddedCountRef = useRef((props.addedProducts ?? []).length);
  useEffect(() => {
    const current = props.addedProducts ?? [];
    if (current.length > prevAddedCountRef.current) {
      // A new product was just added (prepended at index 0) — activate it
      const newest = current[0];
      setActiveProductCardId(newest.id);
      // Collapse card 0 Fixed accordion(s)
      setExpandedPrepPontic({});
    }
    prevAddedCountRef.current = current.length;
  }, [props.addedProducts]);

  // Fetch initial product details (for retention_options used by retention popover)
  // Debounced by 300ms to prevent duplicate calls when selectedProductId changes rapidly
  useEffect(() => {
    if (!props.selectedProductId) {
      setInitialProductDetails(null);
      setInitialProductDetailsPending(false);
      return;
    }
    setInitialProductDetailsPending(true);
    setInitialProductDetails(null);
    // Prefer the same customer_id that loaded the product list (props.labCustomerId),
    // falling back to the role-based localStorage value. Office/doctor profiles select
    // a lab, so deriving the id from localStorage alone can resolve to NaN here and leave
    // initialProductDetails null — which hides the retention popover and extraction boxes.
    // props.labCustomerId is the reliable source and matches the product-list fetch.
    const customerId = props.labCustomerId ?? resolveLibraryCustomerId();
    if (!customerId) {
      setInitialProductDetailsPending(false);
      return;
    }
    const timer = setTimeout(() => {
      fetchProductDetails(props.selectedProductId!, customerId)
        .then(async (data) => {
          if (!data) return;
          // The product details endpoint may omit impressions. The impression-modal catalog
          // for a card-0 product is built solely from initialProductDetails.impressions, so
          // without this the catalog is empty, the modal shows mock options, and selecting one
          // collapses the list to just that entry. Fetch impressions separately when missing,
          // mirroring fetchAndAssignProduct.
          let enriched = data;
          if (!data.impressions?.length) {
            const impressions = await ProductApi.getImpressions(props.selectedProductId!);
            if (impressions.length > 0) {
              enriched = { ...data, impressions: impressions as unknown as ProductApiData["impressions"] };
            }
          }
          setInitialProductDetails(enriched);
          cachedProductRef.current.set(props.selectedProductId!, enriched);
        })
        .finally(() => {
          setInitialProductDetailsPending(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [props.selectedProductId, props.labCustomerId]);

  // Teeth shade catalog — prefetched when shade picker opens; enriched after optimistic complete
  const teethShadeCatalogRef = useRef<TeethShadeEntry[]>([]);

  const prefetchTeethShadeCatalog = useCallback(() => {
    if (teethShadeCatalogRef.current.length > 0) return;
    void fetchTeethShadeCatalog().then((catalog) => {
      teethShadeCatalogRef.current = catalog;
    });
  }, []);

  const handleShadeFieldClick = useCallback(
    (
      arch: Arch,
      fieldType: import("../types").ShadeFieldType,
      productId: string,
      options?: {
        advanceFieldId?: number | null;
        advanceFieldLabel?: string | null;
        fillMode?: import("../types").ShadeSelectionFillMode;
        storageToothNumber?: number | null;
      }
    ) => {
      prefetchTeethShadeCatalog();
      shades.handleShadeFieldClick(arch, fieldType, productId, options);
    },
    [prefetchTeethShadeCatalog, shades.handleShadeFieldClick]
  );

  /**
   * Auto-select all teeth on an arch when a product has an extraction
   * with `is_default: "Yes"` (e.g., "Missing teeth" / code "MT").
   *
   * Uses the stable `setMaxillaryTeeth` / `setMandibularTeeth` useState setters
   * (not the unmemoized `selectAllMaxillaryTeeth` helper) so the effect reliably
   * fires after `initialProductDetails` resolves. Guarded per (productId, arch)
   * so the user can manually deselect without the effect re-overriding them.
   */
  const autoSelectedArchKeysRef = useRef<Set<string>>(new Set());
  /** One-time setup per added card (default extractions + tooth binding). */
  const addedProductSetupDoneRef = useRef<Set<string>>(new Set());
  const preloadCardHydrationDoneRef = useRef<Set<string>>(new Set());
  const {
    setMaxillaryToothExtractionMap,
    setMandibularToothExtractionMap,
    setMaxillaryTeeth,
    setMandibularTeeth,
  } = teeth;

  const runMissingTeethAutoSelect = useCallback(
    (product: ProductApiData | null | undefined, arch: string | undefined) => {
      if (!product?.id || !arch) return;

      const isSingleDefaultOnly = isSingleDefaultOnlyExtractionList(product.extractions);
      const shouldAutoDefault = shouldAutoSelectArchForDefaultExtraction(product.extractions);
      if (!isSingleDefaultOnly && !shouldAutoDefault) return;

      const matched = product.extractions?.find(
        (ext) =>
          String(ext?.is_default ?? "").trim().toLowerCase() === "yes"
      );
      if (!matched || !matched.code) return;

      const extractionCode = matched.code;
      const isTeethInMouthDefault =
        extractionCode === "TIM" ||
        (matched.name ?? "").toLowerCase().trim() === "teeth in mouth";

      const archesToFill = arch === "both" ? ["maxillary", "mandibular"] : [arch];
      for (const a of archesToFill) {
        const key = `${product.id}_${a}`;
        if (autoSelectedArchKeysRef.current.has(key)) continue;
        autoSelectedArchKeysRef.current.add(key);

        const archTeeth = a === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
        const mapSetter =
          a === "maxillary"
            ? setMaxillaryToothExtractionMap
            : setMandibularToothExtractionMap;
        const selectionSetter =
          a === "maxillary" ? setMaxillaryTeeth : setMandibularTeeth;

        // For non-TIM defaults (e.g. "Missing teeth" / MT on full dentures),
        // stamp each unassigned tooth with the default code so the code-keyed
        // status box is populated. For TIM, leave the map empty — TIM is
        // the "unassigned" bucket by convention.
        if (!isTeethInMouthDefault) {
          mapSetter((prev) => {
            const next = { ...prev };
            for (const tn of archTeeth) {
              if (next[tn] === undefined) next[tn] = extractionCode;
            }
            return next;
          });
        }

        // Preselect the full arch when there is only one default status (no
        // other tooth-status choice) or a non-TIM default requires it.
        if (isSingleDefaultOnly || shouldAutoDefault) {
          selectionSetter((prev) => [...new Set([...prev, ...archTeeth])]);
        }
      }
    },
    [
      setMaxillaryToothExtractionMap,
      setMandibularToothExtractionMap,
      setMaxillaryTeeth,
      setMandibularTeeth,
    ]
  );

  /**
   * Added removable with a single default extraction (or non-TIM default): mirror
   * initial-product behavior — preselect arch teeth, stamp the map, and bind the card.
   */
  const applyAddedProductDefaultExtractions = useCallback(
    (product: ProductApiData, arch: Arch, cardId: number) => {
      if (!product?.id || props.caseSubmitted) return;

      runMissingTeethAutoSelect(product, arch);

      const isSingleDefault = isSingleDefaultOnlyExtractionList(product.extractions);
      const shouldAutoDefault = shouldAutoSelectArchForDefaultExtraction(
        product.extractions
      );
      if (!isSingleDefault && !shouldAutoDefault) return;

      const archTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const virtualTn = -cardId;
      const virtualProduct =
        toothFieldProgress.getToothProduct(arch, virtualTn) ?? product;

      for (const tn of archTeeth) {
        toothFieldProgress.setToothProductCard(arch, tn, cardId);
        if (!toothFieldProgress.getToothProduct(arch, tn)) {
          toothFieldProgress.setToothProduct(arch, tn, virtualProduct);
        }
      }
    },
    [
      props.caseSubmitted,
      runMissingTeethAutoSelect,
      toothFieldProgress.getToothProduct,
      toothFieldProgress.setToothProduct,
      toothFieldProgress.setToothProductCard,
    ]
  );

  const opposingAutoSelectedRef = useRef(false);
  const runOpposingExtractionsAutoSelect = useCallback(
    (product: ProductApiData | null | undefined, primaryArch: string | undefined) => {
      if (!product?.id || !primaryArch || primaryArch === "both") return;

      const opposingExts = mapOppositeExtractionsToProductExtractions(
        product.opposite_extractions,
        product.extractions
      );
      if (opposingExts.length === 0) return;

      const isSingleDefaultOnly = isSingleDefaultOnlyExtractionList(opposingExts);
      const shouldAutoDefault = shouldAutoSelectArchForDefaultExtraction(opposingExts);
      if (!isSingleDefaultOnly && !shouldAutoDefault) return;
      if (opposingAutoSelectedRef.current) return;
      opposingAutoSelectedRef.current = true;

      const archTeeth = getOpposingArchTeeth(primaryArch as "maxillary" | "mandibular");
      if (archTeeth.length === 0) return;

      const matched = opposingExts.find(
        (ext) => String(ext?.is_default ?? "").trim().toLowerCase() === "yes"
      );
      if (!matched?.code) return;

      const extractionCode = matched.code;
      const isTeethInMouthDefault =
        extractionCode === "TIM" ||
        (matched.name ?? "").toLowerCase().trim() === "teeth in mouth";

      if (!isTeethInMouthDefault) {
        setOpposingToothExtractionMap((prev) => {
          const next = { ...prev };
          for (const tn of archTeeth) {
            if (next[tn] === undefined) next[tn] = extractionCode;
          }
          return next;
        });
      }

      if (isSingleDefaultOnly || shouldAutoDefault) {
        setOpposingSelectedTeeth((prev) => [...new Set([...prev, ...archTeeth])]);
      }
    },
    []
  );

  // Initial product
  useEffect(() => {
    if (!initialProductDetails || props.caseSubmitted) return;
    runMissingTeethAutoSelect(initialProductDetails, props.initialArch);
    if ((initialProductDetails.opposite_extractions?.length ?? 0) > 0) {
      runOpposingExtractionsAutoSelect(initialProductDetails, props.initialArch);
    }
  }, [
    initialProductDetails,
    props.initialArch,
    props.caseSubmitted,
    runMissingTeethAutoSelect,
    runOpposingExtractionsAutoSelect,
  ]);

  // Added products — cache detail; apply default-extraction auto-select per card when applicable.
  useEffect(() => {
    if (props.caseSubmitted) return;
    const list = props.addedProducts ?? [];
    for (const ap of list) {
      if (!ap.productId || !ap.arch) continue;
      if (ap.arch !== "maxillary" && ap.arch !== "mandibular") continue;
      const arch = ap.arch as Arch;
      const key = `${ap.productId}_${arch}`;
      const stubProduct = ap.product as ProductApiData | undefined;
      const embedded =
        stubProduct?.extractions && isHydratedProductApiData(stubProduct)
          ? stubProduct
          : null;

      const setupKey = `${arch}_${ap.id}`;
      const applyIfReady = (product: ProductApiData) => {
        if (!addedProductSetupDoneRef.current.has(setupKey)) {
          addedProductSetupDoneRef.current.add(setupKey);
          applyAddedProductDefaultExtractions(product, arch, ap.id);
          if (!autoSelectedArchKeysRef.current.has(key)) {
            autoSelectedArchKeysRef.current.add(key);
          }
        }
        const virtualTooth = -ap.id;
        const existingVirtual = toothFieldProgress.getToothProduct(arch, virtualTooth);
        if (
          !existingVirtual ||
          existingVirtual.id !== product.id ||
          !isHydratedProductApiData(existingVirtual)
        ) {
          toothFieldProgress.setToothProduct(arch, virtualTooth, product);
        }
        if (props.preloadInitialSlipState) {
          const hydrationKey = `${arch}_${ap.id}`;
          if (!preloadCardHydrationDoneRef.current.has(hydrationKey)) {
            const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
            const cardTeeth = allTeeth.filter(
              (tn) => (toothFieldProgress.getToothProductCard(arch, tn) ?? -1) === ap.id
            );
            if (cardTeeth.length > 0) {
              for (const tn of cardTeeth) {
                const existingOnTooth = toothFieldProgress.getToothProduct(arch, tn);
                if (
                  existingOnTooth?.id === product.id &&
                  isHydratedProductApiData(existingOnTooth)
                ) {
                  continue;
                }
                toothFieldProgress.setToothProduct(arch, tn, product);
              }
              preloadCardHydrationDoneRef.current.add(hydrationKey);
            }
          }
        }
      };

      if (embedded) {
        const merged = enrichProductWithGrades(arch, embedded);
        cachedProductRef.current.set(ap.productId, merged);
        applyIfReady(merged);
        continue;
      }

      const cached = cachedProductRef.current.get(ap.productId);
      if (cached && isHydratedProductApiData(cached)) {
        applyIfReady(cached);
        continue;
      }

      const customerId = props.labCustomerId ?? resolveLibraryCustomerId();
      if (!customerId) return;

      fetchProductDetails(ap.productId, customerId).then((product) => {
        if (!product || !ap.productId) return;
        if (ap.arch !== "maxillary" && ap.arch !== "mandibular") return;
        const merged = enrichProductWithGrades(arch, product);
        cachedProductRef.current.set(ap.productId, merged);
        applyIfReady(merged);
        const catalog = getImpressionOptionsForProduct(merged);
        if (catalog.length > 0) {
          modals.setSelectedImpressions((prev) =>
            reconcileArchSelectionsWithCatalog(prev, arch, catalog)
          );
        }
      });
    }
  }, [
    props.addedProducts,
    props.caseSubmitted,
    props.preloadInitialSlipState,
    enrichProductWithGrades,
    modals.setSelectedImpressions,
    applyAddedProductDefaultExtractions,
    toothFieldProgress.getToothProduct,
    toothFieldProgress.getToothProductCard,
    toothFieldProgress.setToothProduct,
  ]);

  /**
   * Shade-guide dropdown options derived from the active tooth's product detail.
   * Produces unique `brand.system_name` values from `product.teeth_shades`.
   * Falls back to an empty array when no product is resolvable (UI then shows no options).
   */
  const shadeGuideOptions = useMemo<string[]>(() => {
    const { arch, productId, storageToothNumber } = shades.shadeSelectionState;
    if (!arch || !productId) return [];

    const archToothNumbers =
      arch === "maxillary"
        ? Object.keys(teeth.maxillaryRetentionTypes).map(Number)
        : Object.keys(teeth.mandibularRetentionTypes).map(Number);

    const product = resolveProductForShadeStorageId(
      productId,
      arch,
      toothFieldProgress.getToothProduct,
      { storageToothNumber, archToothNumbers }
    );
    return getShadeGuideOptionsFromProduct(product);
  }, [
    shades.shadeSelectionState,
    teeth.maxillaryRetentionTypes,
    teeth.mandibularRetentionTypes,
    toothFieldProgress.getToothProduct,
  ]);

  // Auto-select the default shade guide when options load
  useEffect(() => {
    if (!shadeGuideOptions.length || shades.selectedShadeGuide) return;
    const { arch, productId, storageToothNumber } = shades.shadeSelectionState;
    if (!arch || !productId) return;

    const archToothNumbers =
      arch === "maxillary"
        ? Object.keys(teeth.maxillaryRetentionTypes).map(Number)
        : Object.keys(teeth.mandibularRetentionTypes).map(Number);

    const product = resolveProductForShadeStorageId(
      productId,
      arch,
      toothFieldProgress.getToothProduct,
      { storageToothNumber, archToothNumbers }
    );
    const defaultGuide = getDefaultShadeGuideFromProduct(product);
    if (defaultGuide) {
      shades.setSelectedShadeGuide(defaultGuide);
    }
  }, [
    shadeGuideOptions,
    shades.selectedShadeGuide,
    shades.shadeSelectionState,
    teeth.maxillaryRetentionTypes,
    teeth.mandibularRetentionTypes,
    toothFieldProgress.getToothProduct,
    shades.setSelectedShadeGuide,
  ]);

  const buildStageSelectionKey = useCallback(
    (arch: Arch, toothNumber: number, isFixed: boolean) =>
      isFixed ? `${arch}_fixed_${toothNumber}` : `${arch}_prep_${toothNumber}`,
    []
  );

  /** Apply skip/auto stage rules so the field chain advances without blocking the user. */
  const applyResolvedStage = useCallback(
    (arch: Arch, toothNumber: number, product: ProductApiData, stageKeyOverride?: string) => {
      if (shouldSkipStageSelection(product)) return false;
      const stageName = getResolvedStageName(product);
      if (!stageName) return false;

      const isFixed = hasRetentionOptions(product);
      const stageStep = isFixed ? ("fixed_stage" as const) : ("stage" as const);
      const serializedStage = serializeStageSelectionFromProduct(product, stageName);
      toothFieldProgress.completeFieldStep(arch, toothNumber, stageStep, serializedStage);
      const stageKey = stageKeyOverride ?? buildStageSelectionKey(arch, toothNumber, isFixed);
      modals.setSelectedStages((prev: Record<string, string>) => ({ ...prev, [stageKey]: stageName }));
      return true;
    },
    [buildStageSelectionKey, toothFieldProgress, modals]
  );

  const resolveStageToothNumber = useCallback(
    (productId: string, toothNumber?: number): number | null => {
      if (toothNumber != null) return toothNumber;
      const prepMatch = productId.match(/prep_(-?\d+)$/);
      if (prepMatch) return parseInt(prepMatch[1], 10);
      const fixedMatch = productId.match(/(?:^|_)fixed_(-?\d+)$/);
      if (fixedMatch) return parseInt(fixedMatch[1], 10);
      return null;
    },
    []
  );

  const handleOpenStageModal = useCallback(
    (productId: string, arch?: Arch, toothNumber?: number) => {
      const resolvedArch = arch ?? "maxillary";
      const resolvedTooth = resolveStageToothNumber(productId, toothNumber);
      if (resolvedTooth != null) {
        const product = toothFieldProgress.getToothProduct(resolvedArch, resolvedTooth);
        if (product) {
          const isFixed = hasRetentionOptions(product);
          const stageStep = isFixed ? ("fixed_stage" as const) : ("stage" as const);
          const stageKey =
            productId.includes("_prep_") || productId.includes("_fixed_")
              ? productId
              : buildStageSelectionKey(resolvedArch, resolvedTooth, isFixed);
          const hasExistingStage =
            toothFieldProgress.isFieldCompleted(resolvedArch, resolvedTooth, stageStep) ||
            Boolean(modals.selectedStages?.[stageKey]) ||
            Boolean(modals.selectedStages?.[productId]);

          // Stage already set — open picker only when this product supports multiple stages.
          if (hasExistingStage) {
            if (!shouldSkipStageSelection(product)) {
              modals.handleOpenStageModal(productId, arch, toothNumber);
            }
            return;
          }

          if (productHasSelectableStages(product)) {
            modals.handleOpenStageModal(productId, arch, toothNumber);
            return;
          }
          const resolution = resolveStageSelection(product);
          if (resolution.kind === "skip") {
            applyResolvedStage(resolvedArch, resolvedTooth, product, productId);
            return;
          }
          if (resolution.kind === "auto") {
            applyResolvedStage(resolvedArch, resolvedTooth, product, productId);
            return;
          }
        }
      }
      modals.handleOpenStageModal(productId, arch, toothNumber);
    },
    [
      applyResolvedStage,
      buildStageSelectionKey,
      modals,
      resolveStageToothNumber,
      toothFieldProgress,
    ]
  );

  // Auto-populate addon field with product's is_default addons when field not yet set
  const autoPopulateDefaultAddons = useCallback(
    (arch: Arch, toothNumber: number, product: ProductApiData) => {
      if (!productSupportsAddons(product)) return;
      const defaultAddons = (product.addons ?? []).filter(
        (a) => String(a.is_default ?? "").trim().toLowerCase() === "yes" &&
               String(a.status ?? "Active").trim().toLowerCase() === "active"
      );
      if (defaultAddons.length === 0) return;
      const isFixed = hasRetentionOptions(product);
      const addonStep = isFixed ? "fixed_addons" as const : "addons" as const;
      if (toothFieldProgress.isFieldCompleted(arch, toothNumber, addonStep)) return;
      const value = defaultAddons.map((a) => `${a.quantity ?? 1}x ${a.name}`).join(", ");
      toothFieldProgress.completeFieldStep(arch, toothNumber, addonStep, value);
      const key = `${arch}_${toothNumber}`;
      setSelectedAddonsByTooth((prev) => ({
        ...prev,
        [key]: defaultAddons.map((a) => ({ addon_id: a.id, qty: a.quantity ?? 1 })),
      }));
    },
    [toothFieldProgress, setSelectedAddonsByTooth]
  );

  const maybeMirrorFixedProgressFromOpposite = useCallback(
    (targetArch: Arch, product: ProductApiData) => {
      if (!hasRetentionOptions(product) || product.id == null) return;
      const targetRetentionTypes =
        targetArch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes;
      const targetTeeth = findArchTeethForProductId(
        targetArch,
        product.id,
        targetRetentionTypes,
        toothFieldProgress.getToothProduct
      );
      if (targetTeeth.length === 0) return;
      const targetRepTooth = resolveFixedGroupRepTooth(
        targetArch,
        targetTeeth,
        toothFieldProgress.getToothProduct,
        toothFieldProgress.isFieldCompleted,
        toothFieldProgress.getFieldValue
      );
      if (targetRepTooth == null) return;
      mirrorAllExistingFixedProgress(targetArch, targetRepTooth, product.id);
    },
    [
      teeth.maxillaryRetentionTypes,
      teeth.mandibularRetentionTypes,
      toothFieldProgress,
      mirrorAllExistingFixedProgress,
    ]
  );

  // Fetch and assign product details when retention type is selected
  const fetchAndAssignProduct = useCallback(
    async (arch: Arch, toothNumber: number, productId: number) => {
      // If we already fetched full product details, reuse the cache (skip wizard stubs).
      const cached = cachedProductRef.current.get(productId);
      if (cached && isHydratedProductApiData(cached)) {
        const merged = enrichProductWithGrades(arch, cached);
        if (merged !== cached) {
          cachedProductRef.current.set(productId, merged);
        }
        toothFieldProgress.setToothProduct(arch, toothNumber, merged);
        applyResolvedStage(arch, toothNumber, merged);
        autoPopulateDefaultAddons(arch, toothNumber, merged);
        maybeMirrorFixedProgressFromOpposite(arch, merged);
        if (toothNumber < 0) {
          applyAddedProductDefaultExtractions(merged, arch, -toothNumber);
        }
        const catalog = getImpressionOptionsForProduct(merged);
        if (catalog.length > 0) {
          modals.setSelectedImpressions((prev) =>
            reconcileArchSelectionsWithCatalog(prev, arch, catalog)
          );
        }
        return;
      }

      const customerId = props.labCustomerId ?? resolveLibraryCustomerId();
      if (!customerId) return;

      toothFieldProgress.setProductLoading(arch, toothNumber, true);
      const product = await fetchProductDetails(productId, customerId);
      if (product) {
        // If the product details endpoint didn't include impressions, fetch them separately
        let enrichedProduct = product;
        if (!product.impressions?.length) {
          const impressions = await ProductApi.getImpressions(productId);
          if (impressions.length > 0) {
            enrichedProduct = { ...product, impressions: impressions as unknown as ProductApiData["impressions"] };
          }
        }
        const merged = enrichProductWithGrades(arch, enrichedProduct);
        cachedProductRef.current.set(productId, merged);
        toothFieldProgress.setToothProduct(arch, toothNumber, merged);
        applyResolvedStage(arch, toothNumber, merged);
        autoPopulateDefaultAddons(arch, toothNumber, merged);
        maybeMirrorFixedProgressFromOpposite(arch, merged);
        if (toothNumber < 0) {
          applyAddedProductDefaultExtractions(merged, arch, -toothNumber);
        }
        const catalog = getImpressionOptionsForProduct(merged);
        if (catalog.length > 0) {
          modals.setSelectedImpressions((prev) =>
            reconcileArchSelectionsWithCatalog(prev, arch, catalog)
          );
        }
      }
      toothFieldProgress.setProductLoading(arch, toothNumber, false);
    },
    [
      toothFieldProgress,
      applyResolvedStage,
      autoPopulateDefaultAddons,
      maybeMirrorFixedProgressFromOpposite,
      enrichProductWithGrades,
      modals.setSelectedImpressions,
      applyAddedProductDefaultExtractions,
    ]
  );

  // Auto-assign initial non-fixed product (Removable/Orthodontics) to all teeth when initialArch === "both".
  // runMissingTeethAutoSelect adds teeth to the selection but doesn't call setToothProduct,
  // so the accordion body (which requires getToothProduct to return data) would stay empty.
  // We assign the product to each arch's first tooth so the accordion renders with fields.
  const autoAssignedBothRef = useRef(false);
  useEffect(() => {
    if (autoAssignedBothRef.current) return;
    if (!initialProductDetails || props.caseSubmitted) return;
    if (props.initialArch !== "both") return;
    if (hasRetentionOptions(initialProductDetails)) return;
    autoAssignedBothRef.current = true;
    // Assign to first tooth of each arch so getToothProduct returns data and accordions render
    toothFieldProgress.setToothProductCard("maxillary", MAXILLARY_ALL[0], 0);
    toothFieldProgress.setToothProductCard("mandibular", MANDIBULAR_ALL[0], 0);
    fetchAndAssignProduct("maxillary", MAXILLARY_ALL[0], initialProductDetails.id);
    fetchAndAssignProduct("mandibular", MANDIBULAR_ALL[0], initialProductDetails.id);
  }, [initialProductDetails, props.initialArch, props.caseSubmitted, fetchAndAssignProduct, toothFieldProgress]);

  // Helper: determine the target product ID for the active card
  const getActiveProductId = () =>
    activeProductCardId !== 0
      ? products.addedProducts.find((ap) => ap.id === activeProductCardId)?.productId
      : props.selectedProductId;

  const toothOwnershipContext = useCallback(
    () => ({
      activeProductCardId,
      getToothProductCard: toothFieldProgress.getToothProductCard,
      maxillaryTeeth: teeth.maxillaryTeeth,
      mandibularTeeth: teeth.mandibularTeeth,
    }),
    [
      activeProductCardId,
      teeth.maxillaryTeeth,
      teeth.mandibularTeeth,
      toothFieldProgress.getToothProductCard,
    ]
  );

  const notifyToothOwnershipConflict = useCallback(
    (arch: Arch, toothNumber: number) => {
      const ownerCardId = toothFieldProgress.getToothProductCard(arch, toothNumber);
      const ownerName = resolveProductCardDisplayName({
        cardId: ownerCardId,
        arch,
        addedProducts: props.addedProducts ?? [],
        selectedProductName: props.selectedProductName,
      });
      const message = buildToothOwnershipConflictMessage(toothNumber, ownerName);
      if (props.onToothOwnershipConflict) {
        props.onToothOwnershipConflict(message);
      } else if (typeof window !== "undefined") {
        window.alert(message);
      }
    },
    [
      props.addedProducts,
      props.onToothOwnershipConflict,
      props.selectedProductName,
      toothFieldProgress,
    ]
  );

  const canModifyToothForActiveProduct = useCallback(
    (arch: Arch, toothNumber: number): boolean => {
      if (
        !isToothLockedByAnotherProduct({
          arch,
          toothNumber,
          ...toothOwnershipContext(),
        })
      ) {
        return true;
      }
      notifyToothOwnershipConflict(arch, toothNumber);
      return false;
    },
    [notifyToothOwnershipConflict, toothOwnershipContext]
  );

  /**
   * When a removable added product had values mirrored while still on virtual slot (-cardId),
   * copy those values to its first real tooth as soon as the user assigns one.
   * Keeps "derive from previous product" behavior even when product 2 is added later.
   */
  const migrateRemovableVirtualProgressToTooth = useCallback(
    (arch: Arch, cardId: number, targetTooth: number) => {
      if (cardId === 0) return;
      const virtualTooth = -cardId;
      if (virtualTooth === targetTooth) return;

      for (const step of REMOVABLE_MIRROR_STEPS) {
        const fieldStep = step as FieldStep;
        const sourceValue = toothFieldProgress.getFieldValue(arch, virtualTooth, fieldStep);
        const sourceCompleted = toothFieldProgress.isFieldCompleted(arch, virtualTooth, fieldStep);
        const targetValue = toothFieldProgress.getFieldValue(arch, targetTooth, fieldStep);
        const targetCompleted = toothFieldProgress.isFieldCompleted(arch, targetTooth, fieldStep);

        if (sourceCompleted && !targetCompleted) {
          toothFieldProgress.completeFieldStep(arch, targetTooth, fieldStep, sourceValue || "");
          continue;
        }
        if (sourceValue && !targetValue) {
          toothFieldProgress.storeFieldValue(arch, targetTooth, fieldStep, sourceValue);
        }
      }

      const sourceStageKey = `${arch}_prep_${virtualTooth}`;
      const targetStageKey = `${arch}_prep_${targetTooth}`;
      const sourceStage = modals.selectedStages[sourceStageKey];
      if (sourceStage && !modals.selectedStages[targetStageKey]) {
        modals.setSelectedStages((prev) => ({ ...prev, [targetStageKey]: sourceStage }));
      }
    },
    [modals.selectedStages, modals.setSelectedStages, toothFieldProgress]
  );

  /** Whether a backfill step should copy from donor → target (addons use API defaults only). */
  const shouldBackfillRemovableStep = useCallback(
    (
      step: FieldStep,
      donorValue: string,
      targetProduct: ProductApiData | null | undefined
    ): boolean => {
      if (step === "addons" || step === "impression") return false;
      if (step === "stage" && shouldSkipStageSelection(targetProduct)) return false;
      if (
        step === "grade" &&
        isGradeFieldValueSkipped(donorValue) &&
        productHasGrades(targetProduct)
      ) {
        return false;
      }
      return true;
    },
    []
  );

  /**
   * Backfill removable fields for a newly-added product from an already-configured
   * removable product on the same arch (derive defaults; target can still override).
   */
  const backfillRemovableFromExistingCard = useCallback(
    (arch: Arch, targetCardId: number, targetTooth: number) => {
      if (targetCardId === 0) return;
      const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const cardIds = listRemovableCardIdsOnArch(
        arch,
        props.addedProducts ?? [],
        isCard0RemovableOnArch(arch)
      ).filter((id) => id !== targetCardId);
      if (cardIds.length === 0) return;

      const targetStageKey = `${arch}_prep_${targetTooth}`;

      for (const donorCardId of cardIds) {
        const donorTooth = getRepToothForRemovableCard(
          arch,
          donorCardId,
          allTeeth,
          toothFieldProgress.getToothProductCard,
          toothFieldProgress.getToothProduct
        );

        for (const step of REMOVABLE_MIRROR_STEPS) {
          const fieldStep = step as FieldStep;
          const targetCompleted = toothFieldProgress.isFieldCompleted(arch, targetTooth, fieldStep);
          const targetValue = toothFieldProgress.getFieldValue(arch, targetTooth, fieldStep);
          if (targetCompleted || targetValue) continue;

          const donorCompleted = toothFieldProgress.isFieldCompleted(arch, donorTooth, fieldStep);
          const donorValue = toothFieldProgress.getFieldValue(arch, donorTooth, fieldStep);
          if (!donorCompleted && !donorValue) continue;
          const targetProduct = toothFieldProgress.getToothProduct(arch, targetTooth);
          if (!shouldBackfillRemovableStep(fieldStep, donorValue || "", targetProduct)) {
            continue;
          }

          if (donorCompleted) {
            toothFieldProgress.completeFieldStep(arch, targetTooth, fieldStep, donorValue || "");
          } else if (donorValue) {
            toothFieldProgress.storeFieldValue(arch, targetTooth, fieldStep, donorValue);
          }
        }

        const donorStageKey = `${arch}_prep_${donorTooth}`;
        const donorStage = modals.selectedStages[donorStageKey];
        const targetProduct = toothFieldProgress.getToothProduct(arch, targetTooth);
        if (
          donorStage &&
          donorStage !== SKIPPED_STAGE_LABEL &&
          !modals.selectedStages[targetStageKey] &&
          !shouldSkipStageSelection(targetProduct)
        ) {
          modals.setSelectedStages((prev) => ({ ...prev, [targetStageKey]: donorStage }));
        }

      }
    },
    [
      MANDIBULAR_ALL,
      MAXILLARY_ALL,
      REMOVABLE_MIRROR_STEPS,
      isCard0RemovableOnArch,
      modals.selectedStages,
      modals.setSelectedStages,
      props.addedProducts,
      toothFieldProgress,
      shouldBackfillRemovableStep,
    ]
  );

  /**
   * Backfill removable fields from the opposite arch (upper <-> lower) for both-arch cases.
   * This keeps teeth/gum shade (and related removable defaults) mirrored when adding products later.
   */
  const backfillRemovableFromOppositeArch = useCallback(
    (arch: Arch, targetTooth: number) => {
      const oppositeArch: Arch = arch === "maxillary" ? "mandibular" : "maxillary";
      const sourceAllTeeth = oppositeArch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const sourceCardIds = listRemovableCardIdsOnArch(
        oppositeArch,
        props.addedProducts ?? [],
        isCard0RemovableOnArch(oppositeArch)
      );
      if (sourceCardIds.length === 0) return;

      for (const sourceCardId of sourceCardIds) {
        const sourceTooth = getRepToothForRemovableCard(
          oppositeArch,
          sourceCardId,
          sourceAllTeeth,
          toothFieldProgress.getToothProductCard,
          toothFieldProgress.getToothProduct
        );
        if (sourceTooth == null) continue;

        for (const step of REMOVABLE_MIRROR_STEPS) {
          const fieldStep = step as FieldStep;
          const targetCompleted = toothFieldProgress.isFieldCompleted(arch, targetTooth, fieldStep);
          const targetValue = toothFieldProgress.getFieldValue(arch, targetTooth, fieldStep);
          if (targetCompleted || targetValue) continue;

          const sourceCompleted = toothFieldProgress.isFieldCompleted(oppositeArch, sourceTooth, fieldStep);
          const sourceValue = toothFieldProgress.getFieldValue(oppositeArch, sourceTooth, fieldStep);
          if (!sourceCompleted && !sourceValue) continue;
          const targetProduct = toothFieldProgress.getToothProduct(arch, targetTooth);
          if (!shouldBackfillRemovableStep(fieldStep, sourceValue || "", targetProduct)) {
            continue;
          }

          if (sourceCompleted) {
            toothFieldProgress.completeFieldStep(arch, targetTooth, fieldStep, sourceValue || "");
          } else if (sourceValue) {
            toothFieldProgress.storeFieldValue(arch, targetTooth, fieldStep, sourceValue);
          }
        }

        const sourceStageKey = `${oppositeArch}_prep_${sourceTooth}`;
        const targetStageKey = `${arch}_prep_${targetTooth}`;
        const sourceStage = modals.selectedStages[sourceStageKey];
        const targetProduct = toothFieldProgress.getToothProduct(arch, targetTooth);
        if (
          sourceStage &&
          sourceStage !== SKIPPED_STAGE_LABEL &&
          !modals.selectedStages[targetStageKey] &&
          !shouldSkipStageSelection(targetProduct)
        ) {
          modals.setSelectedStages((prev) => ({ ...prev, [targetStageKey]: sourceStage }));
        }

      }
    },
    [
      props.initialArch,
      props.addedProducts,
      MAXILLARY_ALL,
      MANDIBULAR_ALL,
      REMOVABLE_MIRROR_STEPS,
      isCard0RemovableOnArch,
      activeProductCardId,
      toothFieldProgress,
      shouldBackfillRemovableStep,
    ]
  );

  /** Seed defaults onto virtual slot when an added removable card is created (before teeth assigned). */
  const seededRemovableVirtualRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (props.caseSubmitted) return;
    for (const ap of props.addedProducts ?? []) {
      if (!ap.productId || (ap.arch !== "maxillary" && ap.arch !== "mandibular")) continue;
      if (ap.product && hasRetentionOptions(ap.product)) continue;
      const arch = ap.arch as Arch;
      const seedKey = `${arch}_${ap.id}`;
      if (seededRemovableVirtualRef.current.has(seedKey)) continue;

      const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
      const hasAssignedTeeth = allTeeth.some(
        (tn) => (toothFieldProgress.getToothProductCard(arch, tn) ?? 0) === ap.id
      );
      if (hasAssignedTeeth) {
        seededRemovableVirtualRef.current.add(seedKey);
        continue;
      }

      const virtualTooth = -ap.id;
      const hasVirtualProduct = Boolean(toothFieldProgress.getToothProduct(arch, virtualTooth));
      if (!hasVirtualProduct) continue;

      seededRemovableVirtualRef.current.add(seedKey);
      backfillRemovableFromExistingCard(arch, ap.id, virtualTooth);
      backfillRemovableFromOppositeArch(arch, virtualTooth);
    }
  }, [
    props.addedProducts,
    props.caseSubmitted,
    backfillRemovableFromExistingCard,
    backfillRemovableFromOppositeArch,
    toothFieldProgress.toothProducts,
    toothFieldProgress.getToothProductCard,
  ]);

  const assignToothToActiveProduct = useCallback(
    (arch: Arch, toothNumber: number) => {
      const isRemovableActive = isActiveNonRetentionProduct(arch);

      if (activeProductCardId !== 0) {
        const ap = (props.addedProducts ?? []).find((p) => p.id === activeProductCardId);
        if (!ap?.productId || !addedProductAppliesToArch(ap, arch)) return;

        toothFieldProgress.setToothProductCard(arch, toothNumber, activeProductCardId);

        if (isRemovableActive) {
          migrateRemovableVirtualProgressToTooth(arch, activeProductCardId, toothNumber);
          void fetchAndAssignProduct(arch, toothNumber, ap.productId).then(() => {
            backfillRemovableFromExistingCard(arch, activeProductCardId, toothNumber);
            backfillRemovableFromOppositeArch(arch, toothNumber);
          });
        } else {
          void fetchAndAssignProduct(arch, toothNumber, ap.productId);
        }
        return;
      }

      if (!props.selectedProductId) return;

      toothFieldProgress.setToothProductCard(arch, toothNumber, 0);
      void fetchAndAssignProduct(arch, toothNumber, props.selectedProductId).then(() => {
        if (isRemovableActive) {
          backfillRemovableFromOppositeArch(arch, toothNumber);
        }
      });
    },
    [
      activeProductCardId,
      fetchAndAssignProduct,
      backfillRemovableFromExistingCard,
      backfillRemovableFromOppositeArch,
      isActiveNonRetentionProduct,
      migrateRemovableVirtualProgressToTooth,
      props.addedProducts,
      props.selectedProductId,
      toothFieldProgress,
    ]
  );

  const handleToothExtractionToggle = useCallback(
    (arch: Arch, toothNumber: number, extractionCode: string, extractions?: ProductExtraction[]) => {
      if (!isGuidedArchInteractive(arch)) return;
      if (!canModifyToothForActiveProduct(arch, toothNumber)) return;
      teeth.handleToothExtractionToggle(arch, toothNumber, extractionCode, extractions);
    },
    [canModifyToothForActiveProduct, teeth]
  );

  const handleMaxillaryToothClick = (toothNumber: number) => {
    if (!isGuidedArchInteractive("maxillary")) return;
    if (!canModifyToothForActiveProduct("maxillary", toothNumber)) return;
    const isAdding = !teeth.maxillaryTeeth.includes(toothNumber);
    teeth.handleMaxillaryToothClick(toothNumber);
    if (isAdding) {
      assignToothToActiveProduct("maxillary", toothNumber);
    }
  };

  const handleMandibularToothClick = (toothNumber: number) => {
    if (!isGuidedArchInteractive("mandibular")) return;
    if (!canModifyToothForActiveProduct("mandibular", toothNumber)) return;
    const isAdding = !teeth.mandibularTeeth.includes(toothNumber);
    teeth.handleMandibularToothClick(toothNumber);
    if (isAdding) {
      assignToothToActiveProduct("mandibular", toothNumber);
    }
  };

  const selectAllMaxillaryTeeth = useCallback(
    (toothNumbers: number[]) => {
      if (!isGuidedArchInteractive("maxillary")) return;
      const { allowed, blocked } = filterTeethAvailableForActiveProduct(
        "maxillary",
        toothNumbers,
        toothOwnershipContext()
      );
      if (blocked.length > 0) {
        notifyToothOwnershipConflict("maxillary", blocked[0]);
      }
      if (allowed.length === 0) return;
      teeth.selectAllMaxillaryTeeth(allowed);
      if (isActiveNonRetentionProduct("maxillary")) {
        for (const tn of allowed) {
          assignToothToActiveProduct("maxillary", tn);
        }
      }
    },
    [
      assignToothToActiveProduct,
      isActiveNonRetentionProduct,
      isGuidedArchInteractive,
      notifyToothOwnershipConflict,
      teeth,
      toothOwnershipContext,
    ]
  );

  const selectAllMandibularTeeth = useCallback(
    (toothNumbers: number[]) => {
      if (!isGuidedArchInteractive("mandibular")) return;
      const { allowed, blocked } = filterTeethAvailableForActiveProduct(
        "mandibular",
        toothNumbers,
        toothOwnershipContext()
      );
      if (blocked.length > 0) {
        notifyToothOwnershipConflict("mandibular", blocked[0]);
      }
      if (allowed.length === 0) return;
      teeth.selectAllMandibularTeeth(allowed);
      if (isActiveNonRetentionProduct("mandibular")) {
        for (const tn of allowed) {
          assignToothToActiveProduct("mandibular", tn);
        }
      }
    },
    [
      assignToothToActiveProduct,
      isActiveNonRetentionProduct,
      isGuidedArchInteractive,
      notifyToothOwnershipConflict,
      teeth,
      toothOwnershipContext,
    ]
  );

  // Wrap handleSelectRetentionType to auto-assign product for Prep/Pontic/Implant
  // Also handles tooth ownership transfer when a tooth already belongs to another product card.
  const originalHandleSelectRetentionType = teeth.handleSelectRetentionType;
  const handleSelectRetentionType = (arch: Arch, toothNumber: number, type: RetentionType) => {
    if (!isGuidedArchInteractive(arch)) return;
    const currentTypes = arch === "maxillary"
      ? teeth.maxillaryRetentionTypes[toothNumber]
      : teeth.mandibularRetentionTypes[toothNumber];
    const isDeselecting = currentTypes?.includes(type);

    // Block before the retention-selection flow starts (before toggling popover choice).
    if (!isDeselecting && (type === "Prep" || type === "Pontic" || type === "Implant")) {
      if (!canModifyToothForActiveProduct(arch, toothNumber)) return;
      // Both-arch guided flow: always upper selection first — do not switch active arch on first click.
    }

    originalHandleSelectRetentionType(arch, toothNumber, type);

    if (type === "Prep" || type === "Pontic" || type === "Implant") {
      if (!isDeselecting) {
        // Do not clear field progress when adding retention type — keep already-filled fields (Stage, shades, etc.) as done
        // Assign ownership to the currently active product card
        toothFieldProgress.setToothProductCard(arch, toothNumber, activeProductCardId);

        // Determine which product ID to fetch: active card's product or the initial product
        const targetProductId = getActiveProductId();

        if (targetProductId) {
          fetchAndAssignProduct(arch, toothNumber, targetProductId);
        }

        // Migrate Fixed Restoration stage key if the new tooth becomes the new min
        // (e.g. adding tooth #7 to an existing group [#8, #9] changes min from 8 to 7)
        const retTypes = arch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes;
        const targetProductId2 = getActiveProductId();
        const targetProduct = targetProductId2 ? cachedProductRef.current.get(targetProductId2) : undefined;
        if (hasRetentionOptions(targetProduct) && targetProduct?.id) {
          const siblingTeeth = Object.keys(retTypes)
            .map(Number)
            .filter((tn) => {
              const p = toothFieldProgress.getToothProduct(arch, tn);
              return p?.id === targetProduct.id;
            });
          if (siblingTeeth.length > 0) {
            const stableShadeId = buildFixedShadeProductId(targetProduct.id);
            for (const tn of siblingTeeth) {
              shades.migrateFixedShadeProductId(`fixed_${tn}`, stableShadeId, arch);
            }
            const priorSiblings = siblingTeeth.filter((tn) => tn !== toothNumber);
            if (priorSiblings.length > 0) {
              const oldMin = Math.min(...priorSiblings);
              const newMin = Math.min(...siblingTeeth);
              if (newMin !== oldMin) {
                const prefix = `${arch}_fixed_`;
                modals.migrateStageKey(`${prefix}${oldMin}`, `${prefix}${newMin}`);
                toothFieldProgress.migrateToothProgress(arch, oldMin, newMin);
              }
            }
          }
        }
      }
    }
  };

  // --- Fixed Restoration stage key migration on tooth deselect ---
  // When a tooth is deselected, if it was the min tooth of a Fixed Restoration group,
  // migrate the stage value (in selectedStages and fieldValues) to the new min tooth.
  const migrateFixedStageIfNeeded = useCallback(
    (arch: Arch, deselectedTooth: number) => {
      // Check if this tooth belongs to a Fixed Restoration product
      const product = toothFieldProgress.getToothProduct(arch, deselectedTooth);
      const isFixed = hasRetentionOptions(product);
      if (!isFixed || !product?.id) return;

      // Find all other teeth in this arch with the same product (same group)
      const retentionTypes = arch === "maxillary" ? teeth.maxillaryRetentionTypes : teeth.mandibularRetentionTypes;
      const siblingTeeth = Object.keys(retentionTypes)
        .map(Number)
        .filter((tn) => {
          if (tn === deselectedTooth) return false;
          const p = toothFieldProgress.getToothProduct(arch, tn);
          return p?.id === product.id;
        });

      if (siblingTeeth.length === 0) return; // No remaining teeth in this group

      const allTeethIncluding = [deselectedTooth, ...siblingTeeth];
      const oldMin = Math.min(...allTeethIncluding);
      const newMin = Math.min(...siblingTeeth);

      if (oldMin === deselectedTooth && oldMin !== newMin) {
        // The deselected tooth was the min — migrate stage keys
        const prefix = `${arch}_fixed_`;
        modals.migrateStageKey(`${prefix}${oldMin}`, `${prefix}${newMin}`);
        toothFieldProgress.migrateToothProgress(arch, oldMin, newMin);
        const stableShadeId = buildFixedShadeProductId(product.id);
        shades.migrateFixedShadeProductId(`fixed_${oldMin}`, stableShadeId, arch);
        shades.migrateFixedShadeProductId(`fixed_${newMin}`, stableShadeId, arch);
      }
    },
    [teeth.maxillaryRetentionTypes, teeth.mandibularRetentionTypes, toothFieldProgress, modals]
  );

  // Wrap deselect handlers to include stage migration
  const originalHandleMaxillaryToothDeselect = teeth.handleMaxillaryToothDeselect;
  const handleMaxillaryToothDeselect = useCallback(
    (toothNumber: number) => {
      if (!canModifyToothForActiveProduct("maxillary", toothNumber)) return;
      migrateFixedStageIfNeeded("maxillary", toothNumber);
      originalHandleMaxillaryToothDeselect(toothNumber);
    },
    [
      canModifyToothForActiveProduct,
      migrateFixedStageIfNeeded,
      originalHandleMaxillaryToothDeselect,
    ]
  );

  const originalHandleMandibularToothDeselect = teeth.handleMandibularToothDeselect;
  const handleMandibularToothDeselect = useCallback(
    (toothNumber: number) => {
      if (!canModifyToothForActiveProduct("mandibular", toothNumber)) return;
      migrateFixedStageIfNeeded("mandibular", toothNumber);
      originalHandleMandibularToothDeselect(toothNumber);
    },
    [
      canModifyToothForActiveProduct,
      migrateFixedStageIfNeeded,
      originalHandleMandibularToothDeselect,
    ]
  );

  // When user selects a shade, mark the corresponding advance-field step completed so the next field shows
  // Also store JSON { teeth_shade_id, brand_id, name } so IDs are available at submit time without extra API calls
  const buildTeethShadeJson = useCallback((shadeName: string, matched?: TeethShadeEntry | null) => {
    return JSON.stringify({
      teeth_shade_id: matched?.teeth_shade_id ?? matched?.id ?? 0,
      brand_id: matched?.brand?.id ?? 0,
      name: shadeName,
    });
  }, []);

  const enrichTeethShadeFieldValue = useCallback(
    (arch: Arch, toothNumber: number, step: FieldStep, shadeName: string) => {
      void (async () => {
        if (teethShadeCatalogRef.current.length === 0) {
          teethShadeCatalogRef.current = await fetchTeethShadeCatalog();
        }
        const matched = teethShadeCatalogRef.current.find((s) => s.name === shadeName);
        if (!matched) return;
        const enriched = buildTeethShadeJson(shadeName, matched);
        if (toothFieldProgress.getFieldValue(arch, toothNumber, step)) {
          mirroredStoreFieldValue(arch, toothNumber, step, enriched);
        }
      })();
    },
    [buildTeethShadeJson, mirroredStoreFieldValue, toothFieldProgress]
  );

  const handleShadeSelect = useCallback(
    (shade: string) => {
      const { arch, fieldType, productId } = shades.shadeSelectionState;
      shades.handleShadeSelect(shade);
      if (!arch || !productId || !fieldType) return;

      // Complete immediately so the next step (e.g. gum shade) opens without waiting on the catalog API
      prefetchTeethShadeCatalog();

      const prepMatch = productId.match(/^prep_(-?\d+)$/);
      let matchedTeethShade: TeethShadeEntry | null = null;
      if (prepMatch && fieldType === "tooth_shade") {
        const toothNumber = parseInt(prepMatch[1], 10);
        const rawProduct = toothFieldProgress.getToothProduct(arch, toothNumber);
        const product = rawProduct ? enrichProductWithGrades(arch, rawProduct) : null;
        const productShades = (product?.teeth_shades ?? []) as ProductTeethShade[];
        const fromProduct = productShades.find((s) => s.name === shade);
        if (fromProduct) {
          matchedTeethShade = {
            teeth_shade_id: Number(fromProduct.teeth_shade_id ?? fromProduct.id ?? 0),
            id: Number(fromProduct.id ?? 0),
            name: fromProduct.name,
            brand: fromProduct.brand ? { id: fromProduct.brand.id } : null,
          };
        } else if (teethShadeCatalogRef.current.length > 0) {
          matchedTeethShade =
            teethShadeCatalogRef.current.find((s) => s.name === shade) ?? null;
        }
      }
      const shadeJson = buildTeethShadeJson(shade, matchedTeethShade);

      // Fixed products: fixed_p_{productId} or legacy fixed_NN
      const fixedProductMatch = productId.match(/^fixed_p_(\d+)$/);
      const fixedLegacyMatch = productId.match(/^fixed_(\d+)$/);
      if (fixedProductMatch || fixedLegacyMatch) {
        const toothNumber =
          shades.shadeSelectionState.storageToothNumber ??
          (fixedLegacyMatch ? parseInt(fixedLegacyMatch[1], 10) : null);
        if (toothNumber == null) return;
        const product = toothFieldProgress.getToothProduct(arch, toothNumber);
        const shadeGuideFields = getShadeGuideAdvanceFields(product?.advance_fields);
        const selectedAdvanceFieldId = shades.shadeSelectionState.advanceFieldId ?? null;

        if (selectedAdvanceFieldId != null && shadeGuideFields.length > 0) {
          const step = FIXED_SHADE_FIELD_TO_STEP[fieldType];
          if (step) {
            const relevantFields = shadeGuideFields.filter(
              (field) => getShadeFieldType(field) === fieldType
            );
            const currentRaw = toothFieldProgress.getFieldValue(arch, toothNumber, step);
            let currentSelections: Record<string, { name: string; advanceFieldId: number; teeth_shade_id: number; brand_id: number }> = {};
            try {
              if (currentRaw && currentRaw.startsWith("{")) {
                currentSelections = JSON.parse(currentRaw);
              }
            } catch {}

            const updatedSelections: Record<string, { name: string; advanceFieldId: number; teeth_shade_id: number; brand_id: number }> = {
              ...currentSelections,
              [String(selectedAdvanceFieldId)]: {
                name: shade,
                advanceFieldId: selectedAdvanceFieldId,
                teeth_shade_id: 0,
                brand_id: 0,
              },
            };
            const allFilled = relevantFields.every((field) => updatedSelections[String(field.id)]);
            const nextValue = JSON.stringify(updatedSelections);

            if (allFilled) {
              mirroredCompleteFieldStep(arch, toothNumber, step, nextValue);
            } else {
              mirroredStoreFieldValue(arch, toothNumber, step, nextValue);
              mirroredUncompleteFieldStep(arch, toothNumber, step);
            }
          }
        } else {
          const step = FIXED_SHADE_FIELD_TO_STEP[fieldType];
          if (step) {
            mirroredCompleteFieldStep(arch, toothNumber, step, shadeJson);
            enrichTeethShadeFieldValue(arch, toothNumber, step, shade);
          }
        }

        if (
          shouldUseAccordionOnlyFixedShades(product?.advance_fields) &&
          selectedAdvanceFieldId != null
        ) {
          const emptyState = {
            arch: null,
            fieldType: null,
            productId: null,
            advanceFieldId: null,
            advanceFieldLabel: null,
            fillMode: null,
            storageToothNumber: null,
          } as const;

          if (shades.shadeSelectionState.fillMode === "edit") {
            shades.setShadeSelectionState(emptyState);
          } else {
            const nextMissing = shadeGuideFields.find((field) => {
              const ft = getShadeFieldType(field);
              const val =
                field.id === selectedAdvanceFieldId
                  ? shade
                  : shades.getSelectedShade(productId, arch, ft, field.id);
              return !val;
            });
            if (nextMissing) {
              shades.setShadeSelectionState({
                arch,
                productId,
                fieldType: getShadeFieldType(nextMissing),
                advanceFieldId: nextMissing.id,
                advanceFieldLabel: nextMissing.name,
                fillMode: "sequence",
                storageToothNumber: toothNumber,
              });
            } else {
              shades.setShadeSelectionState(emptyState);
            }
          }
        }

        if (product?.id) {
          const mirrorTarget = resolveFixedMirrorTarget(
            arch,
            toothNumber,
            teeth.maxillaryRetentionTypes,
            teeth.mandibularRetentionTypes,
            toothFieldProgress.getToothProduct,
            toothFieldProgress.isFieldCompleted,
            toothFieldProgress.getFieldValue
          );
          if (mirrorTarget) {
            const nextShades = mirrorFixedShadeSelections(
              product.id,
              arch,
              mirrorTarget.targetArch,
              shades.selectedShades
            );
            if (nextShades) shades.setSelectedShades(nextShades);
          }
        }
        return;
      }

      // Removable / other products: prep_NN (also handles negative virtual slots like prep_-5)
      if (prepMatch) {
        const toothNumber = parseInt(prepMatch[1], 10);
        if (fieldType === "tooth_shade") {
          mirroredCompleteFieldStep(arch, toothNumber, "teeth_shade", shadeJson);
          if (!matchedTeethShade) {
            enrichTeethShadeFieldValue(arch, toothNumber, "teeth_shade", shade);
          }
        }
      }

      // Mirror selectedShades entry for "both arches" removable (bidirectional)
      if (
        props.initialArch === "both" &&
        !hasRetentionOptions(initialProductDetails)
      ) {
        const targetArch = arch === "maxillary" ? "mandibular" : "maxillary";
        const targetTeeth = arch === "maxillary" ? getMandibularCard0Teeth() : getMaxillaryCard0Teeth();
        for (const tn of targetTeeth) {
          const targetProductId = productId.replace(/^prep_-?\d+$/, `prep_${tn}`);
          const targetKey = `${targetProductId}_${targetArch}_${fieldType}`;
          shades.setSelectedShades((prev: Record<string, string>) => {
            // Only mirror shade if it's the first time (i.e. not already selected on target)
            if (!prev[targetKey]) {
              return { ...prev, [targetKey]: shade };
            }
            return prev;
          });
        }
      }
    },
    [
      shades.shadeSelectionState,
      shades.handleShadeSelect,
      shades.selectedShadeGuide,
      shades.setSelectedShades,
      buildTeethShadeJson,
      prefetchTeethShadeCatalog,
      enrichTeethShadeFieldValue,
      enrichProductWithGrades,
      mirroredCompleteFieldStep,
      mirroredStoreFieldValue,
      mirroredUncompleteFieldStep,
      toothFieldProgress,
      getMandibularCard0Teeth,
      getMaxillaryCard0Teeth,
      props.initialArch,
      initialProductDetails,
    ]
  );

  // Arch-wide impression display (shared across all products on the same arch).
  const getImpressionDisplayText = useCallback(
    (productId: string, arch: Arch, toothNumber?: number) => {
      const product = resolveProductForImpression(
        arch,
        productId,
        toothFieldProgress.getToothProduct,
        initialProductDetails,
        toothNumber
      );
      const options = getImpressionOptionsForProduct(product);
      const list = options.length > 0 ? options : mockImpressions;
      void product;
      void list;
      return buildImpressionDisplayText(modals.selectedImpressions, arch);
    },
    [
      toothFieldProgress.getToothProduct,
      initialProductDetails,
      modals.selectedImpressions,
    ]
  );

  // ── Virtual slip read-only hydration ──────────────────────────────────────
  // When this component mounts in read-only mode (caseSubmitted=true) with pre-built
  // state from the API response, hydrate all sub-hooks in a single effect.
  // The empty dep array is intentional: we only want to hydrate once on mount.
  // Interactive flows use preloadInitialSlipState (add-new-stage); read-only virtual slip uses caseSubmitted.
  useEffect(() => {
    const s = props.initialSlipState;
    if (!s) return;
    if (!props.caseSubmitted && !props.preloadInitialSlipState) return;

    // Teeth selection
    teeth.setMaxillaryTeeth(s.maxillaryTeeth);
    teeth.setMandibularTeeth(s.mandibularTeeth);

    // Retention types (drives Prep/Pontic badges on teeth)
    teeth.setMaxillaryRetentionTypes(s.maxillaryRetentionTypes);
    teeth.setMandibularRetentionTypes(s.mandibularRetentionTypes);

    // Tooth-status extraction selections (Missing, Will-extract, clasps, etc.).
    // Only for editable preload flows (add-new-stage / edit-slip): the read-only
    // virtual slip renders extractions through its own display path, so leave it
    // untouched there to avoid double-applying state.
    if (props.preloadInitialSlipState) {
      if (Object.keys(s.maxillaryToothExtractionMap ?? {}).length > 0) {
        teeth.setMaxillaryToothExtractionMap(s.maxillaryToothExtractionMap);
      }
      if (Object.keys(s.mandibularToothExtractionMap ?? {}).length > 0) {
        teeth.setMandibularToothExtractionMap(s.mandibularToothExtractionMap);
      }
      if ((s.maxillaryClaspTeeth ?? []).length > 0) {
        teeth.setMaxillaryClaspTeeth(s.maxillaryClaspTeeth);
      }
      if ((s.mandibularClaspTeeth ?? []).length > 0) {
        teeth.setMandibularClaspTeeth(s.mandibularClaspTeeth);
      }
      // Removable product teeth that carry a status code — keep them in the orange header.
      if ((s.maxillaryNoActiveBoxTeeth ?? []).length > 0) {
        teeth.setMaxillaryNoActiveBoxTeeth(s.maxillaryNoActiveBoxTeeth);
      }
      if ((s.mandibularNoActiveBoxTeeth ?? []).length > 0) {
        teeth.setMandibularNoActiveBoxTeeth(s.mandibularNoActiveBoxTeeth);
      }
    }

    // Tooth→product mapping and card ownership
    if (Object.keys(s.toothProducts).length > 0) {
      toothFieldProgress.setToothProducts(s.toothProducts);
    }
    if (Object.keys(s.toothProductCards).length > 0) {
      toothFieldProgress.setToothProductCardMap(s.toothProductCards);
    }

    // Shade selections
    if (Object.keys(s.selectedShades).length > 0) {
      shades.setSelectedShades(s.selectedShades);
    }

    // Stage selections
    if (Object.keys(s.selectedStages).length > 0) {
      modals.setSelectedStages((prev: Record<string, string>) => ({ ...prev, ...s.selectedStages }));
    }

    // Impression selections (arch lists; migrate legacy flat keys from API)
    if (s.selectedImpressions) {
      const raw = s.selectedImpressions;
      const hydrated = isSlipImpressionSelections(raw)
        ? raw
        : migrateLegacyFlatImpressions(raw as Record<string, number>);
      if (
        hydrated.maxillary.length > 0 ||
        hydrated.mandibular.length > 0
      ) {
        modals.setSelectedImpressions(hydrated);
      }
    }

    // Completed fields and field values
    if (Object.keys(s.completedFields).length > 0) {
      toothFieldProgress.setCompletedFields(
        Object.fromEntries(
          Object.entries(s.completedFields).map(([key, steps]) => [key, new Set(steps as FieldStep[])])
        )
      );
    }
    if (Object.keys(s.fieldValues).length > 0) {
      toothFieldProgress.setFieldValues(s.fieldValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only — intentional empty deps

  return {
    // Active product card tracking (0 = initial product, other = AddedProduct.id)
    activeProductCardId,
    setActiveProductCardId,
    activeAccordionKey,
    isAccordionExpanded,
    isAccordionEnabled,
    toggleAccordionFocus,
    focusAccordion,
    handleArchExtractionsDone,
    handleArchRetentionDone,
    guidedBothArches,
    guidedBothArchPhase,
    // Expansion
    expandedCard,
    setExpandedCard,
    expandedLeft,
    setExpandedLeft,
    expandedLeft2,
    setExpandedLeft2,
    expandedRight2,
    setExpandedRight2,
    expandedPrepPontic,
    togglePrepPonticExpanded,
    isPrepPonticExpanded,
    showMaxillary,
    setShowMaxillary,
    showMandibular,
    setShowMandibular,
    showDetails,
    setShowDetails,
    // Composed hooks
    ...teeth,
    selectAllMaxillaryTeeth,
    selectAllMandibularTeeth,
    handleToothExtractionToggle,
    canUseToothForActiveProduct: canModifyToothForActiveProduct,
    handleMaxillaryToothClick, // Override: also fetch product for Removables on tooth add
    handleMandibularToothClick, // Override: also fetch product for Removables on tooth add
    handleSelectRetentionType, // Override with wrapped version
    handleMaxillaryToothDeselect, // Override: migrate Fixed Restoration stage key before deselect
    handleMandibularToothDeselect, // Override: migrate Fixed Restoration stage key before deselect
    ...shades,
    handleShadeFieldClick, // Override: prefetch teeth-shade catalog when picker opens
    shadeGuideOptions, // Override: derived from the active tooth's product.teeth_shades brand.system_name
    handleShadeSelect, // Override: mark shade steps completed immediately (catalog IDs enriched in background)
    ...modals,
    setSelectedImpressions: modals.setSelectedImpressions,
    handleOpenImpressionModal,
    handleOpenStageModal, // Override: skip modal when product has no selectable stages
    getImpressionDisplayText, // Override: arch-wide shared impressions
    ...products,
    ...implants,
    ...toothFieldProgress,
    completeFieldStep: mirroredCompleteFieldStep, // Override: auto-copy maxillary→mandibular for removable "both arches"
    storeFieldValue: mirroredStoreFieldValue, // Override: auto-copy maxillary→mandibular for removable "both arches"
    uncompleteFieldStep: mirroredUncompleteFieldStep, // Override: auto-copy maxillary→mandibular for removable "both arches"
    fetchAndAssignProduct,
    // Hide retention popover when active product is Removables (so panel can pass showRetentionPopover = false)
    activeProductIsRemovablesMaxillary: treatArchAsSelectionOnly.maxillary,
    activeProductIsRemovablesMandibular: treatArchAsSelectionOnly.mandibular,
    // Initial product details (for retention_options used by retention popover)
    initialProductDetails,
    initialProductDetailsPending,
    // Opposing arch extraction state
    opposingToothExtractionMap,
    opposingClaspTeeth,
    opposingNoActiveBoxTeeth,
    setOpposingNoActiveBoxTeeth,
    opposingSelectedTeeth,
    handleOpposingExtractionToggle,
    selectAllOpposingTeeth,
    // Structured addon selections per tooth
    selectedAddonsByTooth,
    setSelectedAddonsByTooth,
    // Mirroring helpers
    getMaxillaryCard0Teeth,
    getMandibularCard0Teeth,
    // Props pass-through
    ...props,
  };
}
