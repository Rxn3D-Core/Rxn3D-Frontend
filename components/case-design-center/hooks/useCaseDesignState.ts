"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CaseDesignProps, Arch, RetentionType, ProductApiData } from "../types";
import { productImpressionsToModalOptions } from "../types";
import { mockImpressions } from "../constants";
import { useToothSelection, isRemovablesCategoryName } from "./useToothSelection";
import { useShadeSelection } from "./useShadeSelection";
import { useModalState } from "./useModalState";
import { useProductManagement } from "./useProductManagement";
import { useImplantState } from "./useImplantState";
import { useToothFieldProgress, FIXED_SHADE_FIELD_TO_STEP } from "./useToothFieldProgress";
import { isRemovableCategory, isFixedCategory, getCategoryName } from "../utils/categoryHelpers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface TeethShadeEntry {
  id: number;
  teeth_shade_id: number;
  name: string;
  brand?: { id: number } | null;
}

/** Fetch teeth shade catalog once for ID resolution at shade selection time */
async function fetchTeethShadeCatalog(): Promise<TeethShadeEntry[]> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return [];
    const url = new URL("/v1/slip/teeth-shades", API_BASE_URL);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

/** Fetch full product details (stages, impressions, gum_shades, etc.) */
async function fetchProductDetails(productId: number, customerId: number): Promise<ProductApiData | null> {
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
    return json.data || null;
  } catch {
    return null;
  }
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
    setExpandedPrepPontic((prev) => ({ ...prev, [toothNumber]: !(prev[toothNumber] !== false) }));
  };
  const isPrepPonticExpanded = (toothNumber: number) => expandedPrepPontic[toothNumber] !== false;
  const [showMaxillary, setShowMaxillary] = useState(props.initialArch !== "mandibular");
  const [showMandibular, setShowMandibular] = useState(props.initialArch !== "maxillary");
  const [showDetails, setShowDetails] = useState(false);

  // When active product is Removables (from addedProducts or initial selected product), treat arch as removables so tooth click only toggles (no retention popover)
  const hasRemovablesInAddedProducts = (arch: Arch) =>
    (props.addedProducts ?? []).some((ap) => {
      if (ap.arch !== arch) return false;
      const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
      return isRemovableCategory(name);
    });

  const isActiveProductRemovables = (arch: Arch): boolean => {
    if (activeProductCardId === 0) {
      if (!isRemovablesCategoryName(props.selectedProductCategoryName)) return false;
      // Respect the arch selection from the wizard (e.g. user chose "maxillary" only)
      if (props.initialArch === "maxillary" && arch === "mandibular") return false;
      if (props.initialArch === "mandibular" && arch === "maxillary") return false;
      return true;
    }
    const ap = (props.addedProducts ?? []).find((p) => p.id === activeProductCardId);
    if (!ap || ap.arch !== arch) return false;
    const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
    return isRemovableCategory(name);
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

  // Teeth shade catalog — fetched once on mount for ID resolution at selection time
  const teethShadeCatalogRef = useRef<TeethShadeEntry[]>([]);
  useEffect(() => {
    fetchTeethShadeCatalog().then((catalog) => {
      teethShadeCatalogRef.current = catalog;
    });
  }, []);

  // Fetch and assign product details when retention type is selected
  const fetchAndAssignProduct = useCallback(
    async (arch: Arch, toothNumber: number, productId: number) => {
      // If we already fetched this product, reuse the cached data
      const cached = cachedProductRef.current.get(productId);
      if (cached) {
        toothFieldProgress.setToothProduct(arch, toothNumber, cached);
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
        cachedProductRef.current.set(productId, product);
        toothFieldProgress.setToothProduct(arch, toothNumber, product);
      }
      toothFieldProgress.setProductLoading(arch, toothNumber, false);
    },
    [toothFieldProgress]
  );

  // Helper: determine the target product ID for the active card
  const getActiveProductId = () =>
    activeProductCardId !== 0
      ? products.addedProducts.find((ap) => ap.id === activeProductCardId)?.productId
      : props.selectedProductId;

  // Helper: find the removables AddedProduct for a given arch (if any)
  const getRemovablesProduct = (arch: Arch) =>
    products.addedProducts.find((ap) => {
      if (ap.arch !== arch) return false;
      const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || "";
      return isRemovableCategory(name);
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
        if (isFixedCategory(getCategoryName(targetProduct)) && targetProduct?.id) {
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
      const isFixed = isFixedCategory(getCategoryName(product));
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
    (shade: string) => {
      const { arch, fieldType, productId } = shades.shadeSelectionState;
      shades.handleShadeSelect(shade);
      if (!arch || !productId || !fieldType) return;

      // Resolve shade ID from catalog
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
          toothFieldProgress.completeFieldStep(arch, toothNumber, step, shadeJson);
        }
        return;
      }

      // Removable / other products: prep_NN
      const prepMatch = productId.match(/^prep_(\d+)$/);
      if (prepMatch) {
        const toothNumber = parseInt(prepMatch[1], 10);
        if (fieldType === "tooth_shade") {
          toothFieldProgress.completeFieldStep(arch, toothNumber, "teeth_shade", shadeJson);
        }
      }
    },
    [shades.shadeSelectionState, shades.handleShadeSelect, shades.selectedShadeGuide, toothFieldProgress.completeFieldStep]
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
    handleShadeSelect, // Override: mark fixed_stump_shade completed when shade is selected so next fields show
    ...modals,
    getImpressionDisplayText, // Override: use product impressions when toothNumber provided
    ...products,
    ...implants,
    ...toothFieldProgress,
    fetchAndAssignProduct,
    // Hide retention popover when active product is Removables (so panel can pass showRetentionPopover = false)
    activeProductIsRemovablesMaxillary: treatArchAsRemovables.maxillary,
    activeProductIsRemovablesMandibular: treatArchAsRemovables.mandibular,
    // Props pass-through
    ...props,
  };
}
