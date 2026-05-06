"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { CaseDesignProps, Arch, RetentionType, ProductApiData } from "../types";
import { productImpressionsToModalOptions } from "../types";
import { mockImpressions } from "../constants";
import { useToothSelection } from "./useToothSelection";
import { useShadeSelection } from "./useShadeSelection";
import { useModalState } from "./useModalState";
import { useProductManagement } from "./useProductManagement";
import { useImplantState } from "./useImplantState";
import { useToothFieldProgress, FIXED_SHADE_FIELD_TO_STEP } from "./useToothFieldProgress";
import { hasRetentionOptions, isSingleStageNoStages } from "../utils/categoryHelpers";
import { ProductApi } from "../../../lib/api-service";

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
  const [activeProductCardId, setActiveProductCardId] = useState<number>(0);

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

  // Structured addon selections: keyed as `${arch}_${toothNumber}` → [{addon_id, qty}]
  const [selectedAddonsByTooth, setSelectedAddonsByTooth] = useState<Record<string, Array<{ addon_id: number; qty: number }>>>({});

  const handleOpposingExtractionToggle = useCallback((toothNumber: number, extractionCode: string) => {
    setOpposingToothExtractionMap((prev) => {
      if (prev[toothNumber] === extractionCode) {
        const { [toothNumber]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [toothNumber]: extractionCode };
    });
  }, []);

  // Auto-activate newly added product cards; reset to 0 when active card is removed
  const prevAddedProductsLengthRef = useRef((props.addedProducts ?? []).length);
  useEffect(() => {
    const addedProducts = props.addedProducts ?? [];
    if (addedProducts.length > prevAddedProductsLengthRef.current) {
      // A new product was added — it is always prepended with expanded: true
      const newest = addedProducts[0];
      if (newest) {
        setActiveProductCardId(newest.id);
        // Auto-show the panel for the arch of the newly added product so the tooth chart is always visible.
        // This ensures the eye icon stays on for Fixed Restoration, Removable Restoration, and Orthodontics.
        if (newest.arch === "maxillary") {
          setShowMaxillary(true);
        } else if (newest.arch === "mandibular") {
          setShowMandibular(true);
        }
      }
    } else if (addedProducts.length < prevAddedProductsLengthRef.current) {
      // A product was removed — if it was active, reset to card 0
      setActiveProductCardId((prev) => {
        const stillExists = addedProducts.some((ap) => ap.id === prev);
        return stillExists ? prev : 0;
      });
    }
    prevAddedProductsLengthRef.current = addedProducts.length;
  }, [props.addedProducts]);

  // Fetch initial product details (for retention_options used by retention popover)
  // Declared here so isActiveProductRemovables and getMirrorTargetArch can reference it.
  const [initialProductDetails, setInitialProductDetails] = useState<ProductApiData | null>(null);

  // When active product is Removables (from addedProducts or initial selected product), treat arch as removables so tooth click only toggles (no retention popover)
  const hasRemovablesInAddedProducts = (arch: Arch) =>
    (props.addedProducts ?? []).some((ap) => {
      if (ap.arch !== arch) return false;
      return !hasRetentionOptions(ap.product);
    });

  const isActiveProductRemovables = (arch: Arch): boolean => {
    if (activeProductCardId === 0) {
      if (hasRetentionOptions(initialProductDetails)) return false;
      // Respect the arch selection from the wizard (e.g. user chose "maxillary" only)
      if (props.initialArch === "maxillary" && arch === "mandibular") return false;
      if (props.initialArch === "mandibular" && arch === "maxillary") return false;
      return true;
    }
    const ap = (props.addedProducts ?? []).find((p) => p.id === activeProductCardId);
    if (!ap || ap.arch !== arch) return false;
    return !hasRetentionOptions(ap.product);
  };

  // Only treat the arch as removables when the ACTIVE product card is a removable product.
  // Previously this was true when ANY product in the arch was removable, which broke
  // tooth selection for non-removable products (e.g. Fixed Restoration) on the same arch.
  const treatArchAsRemovables = {
    maxillary: isActiveProductRemovables("maxillary"),
    mandibular: isActiveProductRemovables("mandibular"),
  };

  const teeth = useToothSelection(props.addedProducts ?? [], treatArchAsRemovables);
  const shades = useShadeSelection();
  const modals = useModalState();
  const products = useProductManagement(props.addedProducts, props.onProductsChange);
  const implants = useImplantState();
  const toothFieldProgress = useToothFieldProgress();

  // ── Auto-copy between arches for removable restoration "both arches" ──
  // When user selects "both arches", configuring one side auto-copies to the other.
  // The primary flow is upper-first: user fills maxillary, values copy to mandibular.
  // Reverse (mandibular → maxillary) also works to cover auto-select race conditions
  // and manual mandibular-first edits.

  /** Removable field steps that should be mirrored when both arches are selected */
  const REMOVABLE_MIRROR_STEPS = new Set<string>(["grade", "stage", "teeth_shade", "gum_shade", "addons"]);

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

  /** Wrapped completeFieldStep: auto-copies removable fields to the other arch */
  const mirroredCompleteFieldStep = useCallback(
    (arch: "maxillary" | "mandibular", toothNumber: number, step: any, value: string) => {
      toothFieldProgress.completeFieldStep(arch, toothNumber, step, value);
      const targetArch = getMirrorTargetArch(arch, toothNumber, step);
      if (targetArch) {
        for (const tn of getCard0TeethForArch(targetArch)) {
          // Only copy if the field on the target arch is NOT already completed (first time only)
          if (!toothFieldProgress.isFieldCompleted(targetArch, tn, step)) {
            toothFieldProgress.completeFieldStep(targetArch, tn, step, value);
          }
        }
      }
    },
    [toothFieldProgress.completeFieldStep, toothFieldProgress.isFieldCompleted, getMirrorTargetArch, getCard0TeethForArch]
  );

  /** Wrapped storeFieldValue: auto-copies removable fields to the other arch */
  const mirroredStoreFieldValue = useCallback(
    (arch: "maxillary" | "mandibular", toothNumber: number, step: any, value: string) => {
      toothFieldProgress.storeFieldValue(arch, toothNumber, step, value);
      const targetArch = getMirrorTargetArch(arch, toothNumber, step);
      if (targetArch) {
        for (const tn of getCard0TeethForArch(targetArch)) {
          // Only copy if the field on the target arch is NOT already completed (first time only)
          if (!toothFieldProgress.isFieldCompleted(targetArch, tn, step)) {
            toothFieldProgress.storeFieldValue(targetArch, tn, step, value);
          }
        }
      }
    },
    [toothFieldProgress.storeFieldValue, toothFieldProgress.isFieldCompleted, getMirrorTargetArch, getCard0TeethForArch]
  );

  /** Wrapped uncompleteFieldStep: auto-copies removable uncomplete to the other arch */
  const mirroredUncompleteFieldStep = useCallback(
    (arch: "maxillary" | "mandibular", toothNumber: number, step: any) => {
      toothFieldProgress.uncompleteFieldStep(arch, toothNumber, step);
      const targetArch = getMirrorTargetArch(arch, toothNumber, step);
      if (targetArch) {
        for (const tn of getCard0TeethForArch(targetArch)) {
          toothFieldProgress.uncompleteFieldStep(targetArch, tn, step);
        }
      }
    },
    [toothFieldProgress.uncompleteFieldStep, getMirrorTargetArch, getCard0TeethForArch]
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

  // Cache product data so we only fetch from API once (supports multiple products)
  const cachedProductRef = useRef<Map<number, ProductApiData>>(new Map());

  // Fetch initial product details (for retention_options used by retention popover)
  // Debounced by 300ms to prevent duplicate calls when selectedProductId changes rapidly
  useEffect(() => {
    if (!props.selectedProductId) return;
    const role = localStorage.getItem("role");
    const customerId = Number(
      role === "office_admin" || role === "doctor"
        ? localStorage.getItem("selectedLabId")
        : localStorage.getItem("customerId")
    );
    if (!customerId) return;
    const timer = setTimeout(() => {
      fetchProductDetails(props.selectedProductId!, customerId).then((data) => {
        if (data) {
          setInitialProductDetails(data);
          cachedProductRef.current.set(props.selectedProductId!, data);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [props.selectedProductId]);

  // Teeth shade catalog — fetched lazily on first shade selection (not on mount)
  const teethShadeCatalogRef = useRef<TeethShadeEntry[]>([]);

  /**
   * Auto-select all teeth on an arch when a product has an extraction
   * with `is_default: "Yes"` (e.g., "Missing teeth" / code "MT").
   *
   * Uses the stable `setMaxillaryTeeth` / `setMandibularTeeth` useState setters
   * (not the unmemoized `selectAllMaxillaryTeeth` helper) so the effect reliably
   * fires after `initialProductDetails` resolves. Guarded per (productId, arch)
   * so the user can manually deselect without the effect re-overriding them.
   */
  const MAXILLARY_ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const MANDIBULAR_ALL = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
  const autoSelectedArchKeysRef = useRef<Set<string>>(new Set());
  const {
    setMaxillaryToothExtractionMap,
    setMandibularToothExtractionMap,
    setMaxillaryTeeth,
    setMandibularTeeth,
  } = teeth;

  const runMissingTeethAutoSelect = useCallback(
    (product: ProductApiData | null | undefined, arch: string | undefined) => {
      if (!product?.id || !arch) return;
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

        // Always add the teeth to the arch selection so the accordion renders,
        // status boxes show populated teethForBox, and the required-validation
        // banner does not fire. User may still manually deselect individuals.
        selectionSetter((prev) => [...new Set([...prev, ...archTeeth])]);
      }
    },
    [
      setMaxillaryToothExtractionMap,
      setMandibularToothExtractionMap,
      setMaxillaryTeeth,
      setMandibularTeeth,
    ]
  );

  // Initial product
  useEffect(() => {
    if (!initialProductDetails || props.caseSubmitted) return;
    runMissingTeethAutoSelect(initialProductDetails, props.initialArch);
  }, [initialProductDetails, props.initialArch, props.caseSubmitted, runMissingTeethAutoSelect]);

  // Added products — fetch detail and apply, honoring the (productId, arch) guard
  useEffect(() => {
    if (props.caseSubmitted) return;
    const list = props.addedProducts ?? [];
    for (const ap of list) {
      if (!ap.productId || !ap.arch) continue;
      const key = `${ap.productId}_${ap.arch}`;
      if (autoSelectedArchKeysRef.current.has(key)) continue;

      const embedded = (ap.product && (ap.product as ProductApiData).extractions)
        ? (ap.product as ProductApiData)
        : null;
      if (embedded) {
        runMissingTeethAutoSelect(embedded, ap.arch);
        continue;
      }

      const cached = cachedProductRef.current.get(ap.productId);
      if (cached) {
        runMissingTeethAutoSelect(cached, ap.arch);
        continue;
      }

      const role = localStorage.getItem("role");
      const customerId = Number(
        role === "office_admin" || role === "doctor"
          ? localStorage.getItem("selectedLabId")
          : localStorage.getItem("customerId")
      ) || 1;

      fetchProductDetails(ap.productId, customerId).then((product) => {
        if (!product || !ap.productId) return;
        cachedProductRef.current.set(ap.productId, product);
        runMissingTeethAutoSelect(product, ap.arch);
      });
    }
  }, [props.addedProducts, props.caseSubmitted, runMissingTeethAutoSelect]);

  /**
   * Shade-guide dropdown options derived from the active tooth's product detail.
   * Produces unique `brand.system_name` values from `product.teeth_shades`.
   * Falls back to an empty array when no product is resolvable (UI then shows no options).
   */
  const shadeGuideOptions = useMemo<string[]>(() => {
    const { arch, productId } = shades.shadeSelectionState;
    if (!arch || !productId) return [];

    const fixedMatch = productId.match(/^fixed_(\d+)$/);
    const prepMatch = productId.match(/^prep_(-?\d+)$/);
    const toothNumber = fixedMatch
      ? parseInt(fixedMatch[1], 10)
      : prepMatch
        ? parseInt(prepMatch[1], 10)
        : null;
    if (toothNumber == null) return [];

    const product = toothFieldProgress.getToothProduct(arch, toothNumber);
    const teethShades = product?.teeth_shades;
    if (!teethShades || teethShades.length === 0) return [];

    const systemNames: string[] = [];
    const seen = new Set<string>();
    for (const shade of teethShades) {
      const systemName = shade.brand?.system_name;
      if (systemName && !seen.has(systemName)) {
        seen.add(systemName);
        systemNames.push(systemName);
      }
    }
    return systemNames;
  }, [shades.shadeSelectionState, toothFieldProgress.getToothProduct]);

  // Auto-select the default shade guide when options load
  useEffect(() => {
    if (!shadeGuideOptions.length || shades.selectedShadeGuide) return;
    const { arch, productId } = shades.shadeSelectionState;
    if (!arch || !productId) return;
    const fixedMatch = productId.match(/^fixed_(\d+)$/);
    const prepMatch = productId.match(/^prep_(-?\d+)$/);
    const toothNumber = fixedMatch
      ? parseInt(fixedMatch[1], 10)
      : prepMatch
        ? parseInt(prepMatch[1], 10)
        : null;
    if (toothNumber == null) return;
    const product = toothFieldProgress.getToothProduct(arch, toothNumber);
    const teethShades = product?.teeth_shades;
    if (!teethShades) return;
    const defaultShade = teethShades.find(
      (s) => String(s.brand?.default ?? "").trim().toLowerCase() === "yes"
    );
    if (defaultShade?.brand?.system_name) {
      shades.setSelectedShadeGuide(defaultShade.brand.system_name);
    }
  }, [shadeGuideOptions, shades.selectedShadeGuide, shades.shadeSelectionState, toothFieldProgress.getToothProduct, shades.setSelectedShadeGuide]);

  // Auto-complete stage step when product is single-stage with no stage options
  const autoCompleteSingleStage = useCallback(
    (arch: Arch, toothNumber: number, product: ProductApiData) => {
      if (!isSingleStageNoStages(product)) return;
      const isFixed = hasRetentionOptions(product);
      const stageStep = isFixed ? "fixed_stage" as const : "stage" as const;
      // Auto-complete the stage field so the chain advances past it
      toothFieldProgress.completeFieldStep(arch, toothNumber, stageStep, "Single Stage");
      // Also set the selectedStages value so the badge/display shows correctly
      const stageKey = isFixed
        ? `${arch}_fixed_${toothNumber}`
        : `${arch}_prep_${toothNumber}`;
      modals.setSelectedStages((prev: Record<string, string>) => ({ ...prev, [stageKey]: "Single Stage" }));
    },
    [toothFieldProgress, modals]
  );

  // Auto-populate addon field with product's is_default addons when field not yet set
  const autoPopulateDefaultAddons = useCallback(
    (arch: Arch, toothNumber: number, product: ProductApiData) => {
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

  // Fetch and assign product details when retention type is selected
  const fetchAndAssignProduct = useCallback(
    async (arch: Arch, toothNumber: number, productId: number) => {
      // If we already fetched this product, reuse the cached data
      const cached = cachedProductRef.current.get(productId);
      if (cached) {
        toothFieldProgress.setToothProduct(arch, toothNumber, cached);
        autoCompleteSingleStage(arch, toothNumber, cached);
        autoPopulateDefaultAddons(arch, toothNumber, cached);
        return;
      }

      const role = localStorage.getItem("role");
      const customerId = Number(
        role === "office_admin" || role === "doctor"
          ? localStorage.getItem("selectedLabId")
          : localStorage.getItem("customerId")
      ) || 1;

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
        cachedProductRef.current.set(productId, enrichedProduct);
        toothFieldProgress.setToothProduct(arch, toothNumber, enrichedProduct);
        autoCompleteSingleStage(arch, toothNumber, enrichedProduct);
        autoPopulateDefaultAddons(arch, toothNumber, enrichedProduct);
      }
      toothFieldProgress.setProductLoading(arch, toothNumber, false);
    },
    [toothFieldProgress, autoCompleteSingleStage, autoPopulateDefaultAddons]
  );

  // Auto-assign initial removable product to all teeth when initialArch === "both".
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

  // Helper: find the removables AddedProduct for a given arch (if any)
  const getRemovablesProduct = (arch: Arch) =>
    products.addedProducts.find((ap) => {
      if (ap.arch !== arch) return false;
      return !hasRetentionOptions(ap.product);
    }) ?? null;

  // Wrap tooth click handlers: for Removables arches, assign tooth to the ACTIVE product and fetch so fields/accordion show.
  // Only auto-assigns when the currently active product card is a removable product.
  const handleRemovableToothAdd = (arch: Arch, toothNumber: number) => {
    if (!isActiveProductRemovables(arch)) return;

    if (activeProductCardId !== 0) {
      const ap = (props.addedProducts ?? []).find((p) => p.id === activeProductCardId);
      if (ap?.productId && ap.arch === arch) {
        toothFieldProgress.setToothProductCard(arch, toothNumber, activeProductCardId);
        fetchAndAssignProduct(arch, toothNumber, ap.productId);
      }
    } else if (props.selectedProductId) {
      toothFieldProgress.setToothProductCard(arch, toothNumber, 0);
      fetchAndAssignProduct(arch, toothNumber, props.selectedProductId);
    }
  };

  const handleMaxillaryToothClick = (toothNumber: number) => {
    const isAdding = !teeth.maxillaryTeeth.includes(toothNumber);
    teeth.handleMaxillaryToothClick(toothNumber);
    if (isAdding) {
      handleRemovableToothAdd("maxillary", toothNumber);
    }
  };

  const handleMandibularToothClick = (toothNumber: number) => {
    const isAdding = !teeth.mandibularTeeth.includes(toothNumber);
    teeth.handleMandibularToothClick(toothNumber);
    if (isAdding) {
      handleRemovableToothAdd("mandibular", toothNumber);
    }
  };

  // Wrap handleSelectRetentionType to auto-assign product for Prep/Pontic/Implant
  // Also handles tooth ownership transfer when a tooth already belongs to another product card.
  const originalHandleSelectRetentionType = teeth.handleSelectRetentionType;
  const handleSelectRetentionType = (arch: Arch, toothNumber: number, type: RetentionType) => {
    originalHandleSelectRetentionType(arch, toothNumber, type);

    if (type === "Prep" || type === "Pontic" || type === "Implant") {
      const currentTypes = arch === "maxillary"
        ? teeth.maxillaryRetentionTypes[toothNumber]
        : teeth.mandibularRetentionTypes[toothNumber];
      const isDeselecting = currentTypes?.includes(type);

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
            const oldMin = Math.min(...siblingTeeth);
            const newMin = Math.min(toothNumber, ...siblingTeeth);
            if (newMin !== oldMin) {
              const prefix = `${arch}_fixed_`;
              modals.migrateStageKey(`${prefix}${oldMin}`, `${prefix}${newMin}`);
              toothFieldProgress.migrateToothProgress(arch, oldMin, newMin);
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
      }
    },
    [teeth.maxillaryRetentionTypes, teeth.mandibularRetentionTypes, toothFieldProgress, modals]
  );

  // Wrap deselect handlers to include stage migration
  const originalHandleMaxillaryToothDeselect = teeth.handleMaxillaryToothDeselect;
  const handleMaxillaryToothDeselect = useCallback(
    (toothNumber: number) => {
      migrateFixedStageIfNeeded("maxillary", toothNumber);
      originalHandleMaxillaryToothDeselect(toothNumber);
    },
    [migrateFixedStageIfNeeded, originalHandleMaxillaryToothDeselect]
  );

  const originalHandleMandibularToothDeselect = teeth.handleMandibularToothDeselect;
  const handleMandibularToothDeselect = useCallback(
    (toothNumber: number) => {
      migrateFixedStageIfNeeded("mandibular", toothNumber);
      originalHandleMandibularToothDeselect(toothNumber);
    },
    [migrateFixedStageIfNeeded, originalHandleMandibularToothDeselect]
  );

  // When user selects a shade, mark the corresponding advance-field step completed so the next field shows
  // Also store JSON { teeth_shade_id, brand_id, name } so IDs are available at submit time without extra API calls
  const handleShadeSelect = useCallback(
    async (shade: string) => {
      const { arch, fieldType, productId } = shades.shadeSelectionState;
      shades.handleShadeSelect(shade);
      if (!arch || !productId || !fieldType) return;

      // Resolve shade ID from catalog — lazy-fetch on first use
      if (teethShadeCatalogRef.current.length === 0) {
        teethShadeCatalogRef.current = await fetchTeethShadeCatalog();
      }
      const catalog = teethShadeCatalogRef.current;
      const matched = catalog.find((s) => s.name === shade);
      const shadeJson = JSON.stringify({
        teeth_shade_id: matched?.teeth_shade_id ?? matched?.id ?? 0,
        brand_id: matched?.brand?.id ?? 0,
        name: shade,
      });

      // Fixed products: fixed_NN
      const fixedMatch = productId.match(/^fixed_(\d+)$/);
      if (fixedMatch) {
        const toothNumber = parseInt(fixedMatch[1], 10);
        const step = FIXED_SHADE_FIELD_TO_STEP[fieldType];
        if (step) {
          mirroredCompleteFieldStep(arch, toothNumber, step, shadeJson);
        }
        return;
      }

      // Removable / other products: prep_NN (also handles negative virtual slots like prep_-5)
      const prepMatch = productId.match(/^prep_(-?\d+)$/);
      if (prepMatch) {
        const toothNumber = parseInt(prepMatch[1], 10);
        if (fieldType === "tooth_shade") {
          mirroredCompleteFieldStep(arch, toothNumber, "teeth_shade", shadeJson);
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
    [shades.shadeSelectionState, shades.handleShadeSelect, shades.selectedShadeGuide, shades.setSelectedShades, mirroredCompleteFieldStep, getMandibularCard0Teeth, getMaxillaryCard0Teeth, props.initialArch, initialProductDetails]
  );

  // Use product impressions from get product response when toothNumber provided; otherwise fall back to modal's mock-based resolution
  const getImpressionDisplayText = useCallback(
    (productId: string, arch: Arch, toothNumber?: number) => {
      const product = toothNumber != null ? toothFieldProgress.getToothProduct(arch, toothNumber) : null;
      const options = productImpressionsToModalOptions(product?.impressions);
      const list = options.length > 0 ? options : mockImpressions;
      const prefix = `${productId}_${arch}_`;
      const entries = Object.entries(modals.selectedImpressions).filter(
        ([key, qty]) => key.startsWith(prefix) && qty > 0
      );
      if (entries.length === 0) return "";
      return entries
        .map(([key, qty]) => {
          const identifier = key.replace(prefix, "");
          const impression = list.find((i) => i.value === identifier);
          return `${qty}x ${impression?.name || identifier}`;
        })
        .join(", ");
    },
    [toothFieldProgress, modals.selectedImpressions]
  );

  // ── Virtual slip read-only hydration ──────────────────────────────────────
  // When this component mounts in read-only mode (caseSubmitted=true) with pre-built
  // state from the API response, hydrate all sub-hooks in a single effect.
  // The empty dep array is intentional: we only want to hydrate once on mount.
  // Interactive (non-submitted) flows never provide initialSlipState, so this is a no-op for them.
  useEffect(() => {
    const s = props.initialSlipState;
    if (!props.caseSubmitted || !s) return;

    // Teeth selection
    teeth.setMaxillaryTeeth(s.maxillaryTeeth);
    teeth.setMandibularTeeth(s.mandibularTeeth);

    // Retention types (drives Prep/Pontic badges on teeth)
    teeth.setMaxillaryRetentionTypes(s.maxillaryRetentionTypes);
    teeth.setMandibularRetentionTypes(s.mandibularRetentionTypes);

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

    // Impression quantities
    if (Object.keys(s.selectedImpressions).length > 0) {
      modals.setSelectedImpressions(s.selectedImpressions);
    }

    // Completed fields and field values
    if (Object.keys(s.completedFields).length > 0) {
      toothFieldProgress.setCompletedFields(
        Object.fromEntries(
          Object.entries(s.completedFields).map(([key, steps]) => [key, new Set(steps)])
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
    handleMaxillaryToothClick, // Override: also fetch product for Removables on tooth add
    handleMandibularToothClick, // Override: also fetch product for Removables on tooth add
    handleSelectRetentionType, // Override with wrapped version
    handleMaxillaryToothDeselect, // Override: migrate Fixed Restoration stage key before deselect
    handleMandibularToothDeselect, // Override: migrate Fixed Restoration stage key before deselect
    ...shades,
    shadeGuideOptions, // Override: derived from the active tooth's product.teeth_shades brand.system_name
    handleShadeSelect, // Override: mark fixed_stump_shade completed when shade is selected so next fields show
    ...modals,
    getImpressionDisplayText, // Override: use product impressions when toothNumber provided
    ...products,
    ...implants,
    ...toothFieldProgress,
    completeFieldStep: mirroredCompleteFieldStep, // Override: auto-copy maxillary→mandibular for removable "both arches"
    storeFieldValue: mirroredStoreFieldValue, // Override: auto-copy maxillary→mandibular for removable "both arches"
    uncompleteFieldStep: mirroredUncompleteFieldStep, // Override: auto-copy maxillary→mandibular for removable "both arches"
    fetchAndAssignProduct,
    // Hide retention popover when active product is Removables (so panel can pass showRetentionPopover = false)
    activeProductIsRemovablesMaxillary: treatArchAsRemovables.maxillary,
    activeProductIsRemovablesMandibular: treatArchAsRemovables.mandibular,
    // Initial product details (for retention_options used by retention popover)
    initialProductDetails,
    // Opposing arch extraction state
    opposingToothExtractionMap,
    handleOpposingExtractionToggle,
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
