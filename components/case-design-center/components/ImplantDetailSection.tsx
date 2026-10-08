"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search, Upload } from "lucide-react";
import { CardGallery, type CardGalleryItem } from "./fields/CardGallery";
import { CardSelectorField } from "./fields/CardSelectorField";
import { SelectField } from "./fields/SelectField";
import { ImplantInclusionsField } from "./fields/ImplantInclusionsField";
import type { ProductAdvanceField } from "../types";
import {
  fetchProductImplants,
  type ProductAbutment,
  type ProductImplant,
} from "@/services/implant-api";
import { getImplantDetailAbutmentOptions } from "../utils/implantDetailAbutmentOptions";
import { getImplantDetailFieldLabels } from "../utils/implantDetailFieldLabels";
import {
  isImplantFieldVisible,
  type ImplantFieldSettings,
} from "@/lib/api/category-implant-settings";

export const LAB_RECOMMENDATION_VALUE = "__lab_recommendation__";

/** Shrink large phone photos before storing as data-URL in React state. */
async function compressImageToDataUrl(
  file: File,
  maxEdge = 1600,
  quality = 0.72
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface ImplantDetailData {
  brand: string;
  /** Implant system name (paired with brand in field 1). */
  systemName: string;
  platform: string;
  size: string;
  inclusions: string;
  inclusionQty: number;
  /** Abutment category, e.g. Office Provided. */
  abutmentType: string;
  /** Specific abutment type, e.g. Stock Abutment. */
  abutmentDetail: string;
  dynamicFields: Record<number, string>;
  labRecommendationRequested?: boolean;
  referencePhotoUrl?: string | null;
  referencePhoto?: string | null;
  /**
   * Edit-slip preload may only have catalog IDs from slip details.
   * ImplantDetailSection resolves these to brand/platform/size names once the
   * product implant catalog loads.
   */
  implantId?: number | null;
  platformId?: number | null;
  sizeId?: number | null;
  abutmentId?: number | null;
  abutmentOptionId?: number | null;
}

export const defaultImplantDetailData = (): ImplantDetailData => ({
  brand: "",
  systemName: "",
  platform: "",
  size: "",
  inclusions: "No inclusion",
  inclusionQty: 0,
  abutmentDetail: "",
  abutmentType: "",
  dynamicFields: {},
  labRecommendationRequested: false,
  referencePhotoUrl: null,
  referencePhoto: null,
  implantId: null,
  platformId: null,
  sizeId: null,
  abutmentId: null,
  abutmentOptionId: null,
});

interface ImplantDetailSectionProps {
  toothNumber: number;
  value?: ImplantDetailData;
  onChange?: (data: ImplantDetailData) => void;
  onCompleteChange?: (complete: boolean) => void;
  caseSubmitted?: boolean;
  advanceFields?: ProductAdvanceField[];
  productId?: number;
  customerId?: number;
  /** From product details payload (`abutments`); no separate API call. */
  productAbutments?: ProductAbutment[];
  fieldSettings?: ImplantFieldSettings;
  defaultCollapsed?: boolean;
  /** Hide the "Request Lab Recommendation" card (lab fill-in flow). */
  hideLabRecommendation?: boolean;
  /**
   * Stack completed fields in one column (lab modal / narrow containers).
   * Default grid is 1 col on xs and 2 cols from sm up.
   */
  stackFields?: boolean;
  /** When set with onExpandedChange, expansion is controlled by the parent (single-open accordion). */
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

function getActiveOptions(field: ProductAdvanceField): Array<{ id: number; name: string }> {
  return (field.options || []).filter(
    (o: { status?: string }) => !o.status || o.status === "Active"
  );
}

export function ImplantDetailSection({
  toothNumber,
  value,
  onChange,
  onCompleteChange,
  caseSubmitted = false,
  advanceFields,
  productId,
  customerId,
  productAbutments = [],
  fieldSettings,
  defaultCollapsed = true,
  hideLabRecommendation = false,
  stackFields = false,
  isExpanded: isExpandedProp,
  onExpandedChange,
}: ImplantDetailSectionProps) {
  const fieldsGridClass = stackFields
    ? "grid grid-cols-1 gap-3 min-w-0"
    : "grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0";
  const [internalExpanded, setInternalExpanded] = useState(!defaultCollapsed);
  const isExpansionControlled = isExpandedProp !== undefined && onExpandedChange !== undefined;
  const isExpanded = isExpansionControlled ? isExpandedProp : internalExpanded;
  const setIsExpanded = (next: boolean | ((prev: boolean) => boolean)) => {
    if (isExpansionControlled) {
      const resolved = typeof next === "function" ? next(isExpandedProp!) : next;
      onExpandedChange!(resolved);
    } else {
      setInternalExpanded(next);
    }
  };
  const [localData, setLocalData] = useState(defaultImplantDetailData());
  const isControlled = value !== undefined && onChange !== undefined;
  const data = isControlled ? value : localData;
  const dataRef = useRef(data);
  dataRef.current = data;

  const update = (patch: Partial<ImplantDetailData>) => {
    if (isControlled) {
      // Merge + sync ref immediately so rapid field clicks (inclusion → abutment)
      // never apply a stale snapshot that drops inclusions/qty.
      const next = { ...dataRef.current, ...patch };
      dataRef.current = next;
      onChange(next);
    } else {
      setLocalData((prev) => {
        const next = { ...prev, ...patch };
        dataRef.current = next;
        return next;
      });
    }
  };

  const [apiImplants, setApiImplants] = useState<ProductImplant[]>([]);

  useEffect(() => {
    if (!productId || !customerId) return;
    fetchProductImplants(productId, customerId).then(setApiImplants).catch(() => setApiImplants([]));
  }, [productId, customerId]);

  // Edit-slip: slip details often store implant/platform/size IDs without nested names.
  // Resolve those IDs against the product implant catalog so the form shows the saved values.
  useEffect(() => {
    if (!apiImplants.length) return;
    if (!data.implantId && !data.platformId && !data.sizeId) return;

    const implant =
      (data.implantId
        ? apiImplants.find((row) => row.id === data.implantId)
        : null) ??
      (data.brand
        ? apiImplants.find(
            (row) =>
              row.brand_name === data.brand &&
              (!data.systemName || row.system_name === data.systemName)
          )
        : null);
    if (!implant) return;

    const platform =
      (data.platformId
        ? implant.platforms?.find((row) => row.id === data.platformId)
        : null) ??
      (data.platform
        ? implant.platforms?.find((row) => row.name === data.platform)
        : null);
    const size =
      (data.sizeId
        ? platform?.sizes?.find((row) => row.id === data.sizeId)
        : null) ??
      (data.size
        ? platform?.sizes?.find((row) => row.label === data.size)
        : null);

    const nextBrand = implant.brand_name || data.brand;
    const nextSystem = implant.system_name || data.systemName;
    const nextPlatform = platform?.name || data.platform;
    const nextSize = size?.label || data.size;
    if (
      nextBrand === data.brand &&
      nextSystem === data.systemName &&
      nextPlatform === data.platform &&
      nextSize === data.size
    ) {
      return;
    }

    update({
      brand: nextBrand,
      systemName: nextSystem,
      platform: nextPlatform,
      size: nextSize,
      implantId: implant.id,
      platformId: platform?.id ?? data.platformId ?? null,
      sizeId: size?.id ?? data.sizeId ?? null,
    });
  }, [
    apiImplants,
    data.implantId,
    data.platformId,
    data.sizeId,
    data.brand,
    data.systemName,
    data.platform,
    data.size,
  ]);

  // Edit-slip: resolve abutment category/type names from saved abutment IDs.
  useEffect(() => {
    if (!productAbutments?.length) return;
    if (!data.abutmentId && !data.abutmentOptionId) return;

    const abutment =
      (data.abutmentId
        ? productAbutments.find((row) => row.id === data.abutmentId)
        : null) ??
      (data.abutmentType
        ? productAbutments.find((row) => row.type === data.abutmentType)
        : null);
    if (!abutment) return;

    const option =
      (data.abutmentOptionId
        ? abutment.options?.find((row) => row.id === data.abutmentOptionId)
        : null) ??
      (data.abutmentDetail
        ? abutment.options?.find((row) => row.name === data.abutmentDetail)
        : null);

    const nextType = abutment.type || data.abutmentType;
    const nextDetail = option?.name || data.abutmentDetail;
    if (nextType === data.abutmentType && nextDetail === data.abutmentDetail) return;

    update({
      abutmentType: nextType,
      abutmentDetail: nextDetail,
      abutmentId: abutment.id,
      abutmentOptionId: option?.id ?? data.abutmentOptionId ?? null,
    });
  }, [
    productAbutments,
    data.abutmentId,
    data.abutmentOptionId,
    data.abutmentType,
    data.abutmentDetail,
  ]);

  const labels = useMemo(() => getImplantDetailFieldLabels(advanceFields), [advanceFields]);
  const { inclusionField } = labels;

  const abutmentConfig = useMemo(
    () => getImplantDetailAbutmentOptions({ advanceFields, productAbutments }),
    [advanceFields, productAbutments]
  );

  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [abutmentCategoryOpen, setAbutmentCategoryOpen] = useState(false);
  const [abutmentTypeOpen, setAbutmentTypeOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(false);
  const [editingSize, setEditingSize] = useState(false);
  const [editingAbutment, setEditingAbutment] = useState(false);
  const [editingAbutmentType, setEditingAbutmentType] = useState(false);
  // Sticky unlock: progressive reveal still gates the first pass, but once a
  // step has appeared we keep it visible even while earlier fields are re-edited.
  const [unlockedBrandPlatform, setUnlockedBrandPlatform] = useState(false);
  const [unlockedSizeRow, setUnlockedSizeRow] = useState(false);
  const [unlockedInclusion, setUnlockedInclusion] = useState(false);
  const [unlockedAbutment, setUnlockedAbutment] = useState(false);
  const [implantSearch, setImplantSearch] = useState("");
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const brand = data.brand;
  const systemName = data.systemName;
  const platform = data.platform;
  const size = data.size;
  const inclusions = data.inclusions;
  const inclusionQty = data.inclusionQty;
  const abutmentCategory = data.abutmentType;
  const abutmentSpecificType = data.abutmentDetail;
  const dynamicFields = data.dynamicFields ?? {};

  const selectedImplant = useMemo(
    () =>
      (data.implantId
        ? apiImplants.find((i) => i.id === data.implantId)
        : null) ??
      apiImplants.find(
        (i) => i.brand_name === brand && i.system_name === (systemName || i.system_name)
      ) ??
      null,
    [apiImplants, brand, systemName, data.implantId]
  );

  useEffect(() => {
    if (!brand || systemName || !apiImplants.length) return;
    const match = apiImplants.find((i) => i.brand_name === brand);
    if (match?.system_name) update({ systemName: match.system_name });
  }, [brand, systemName, apiImplants]);

  const brandSystemItems: CardGalleryItem[] = useMemo(() => {
    const implants = apiImplants.map((i) => ({
      value: String(i.id),
      label: i.brand_name,
      subtitle: i.system_name,
      imageUrl: i.image_url,
    }));
    if (hideLabRecommendation) return implants;
    return [
      {
        value: LAB_RECOMMENDATION_VALUE,
        label: "Request Lab Recommendation",
        variant: "upload" as const,
      },
      ...implants,
    ];
  }, [apiImplants, hideLabRecommendation]);

  const filteredBrandSystemItems = useMemo(() => {
    const labRec = hideLabRecommendation
      ? null
      : brandSystemItems.find((item) => item.value === LAB_RECOMMENDATION_VALUE) ?? null;
    const implants = brandSystemItems.filter((item) => item.value !== LAB_RECOMMENDATION_VALUE);
    const q = implantSearch.trim().toLowerCase();
    const filteredImplants = !q
      ? implants
      : implants.filter((item) => {
          const label = item.label.toLowerCase();
          const subtitle = (item.subtitle ?? "").toLowerCase();
          return label.includes(q) || subtitle.includes(q);
        });
    return labRec ? [labRec, ...filteredImplants] : filteredImplants;
  }, [brandSystemItems, implantSearch, hideLabRecommendation]);

  const platformOptions: string[] = selectedImplant
    ? (selectedImplant.platforms ?? [])
        .filter((p) => p.status === "Active")
        .map((p) => p.name)
    : [];

  const sizeOptions: string[] =
    brand && platform
      ? (selectedImplant?.platforms ?? [])
          .filter((p) => p.status === "Active" && p.name === platform)
          .flatMap((p) => p.sizes.filter((s) => s.status === "Active").map((s) => s.label))
      : [];

  const implantSizeFallback = ["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"];
  const labRecommendationRequested = !!data.labRecommendationRequested;
  const labRecommendationComplete =
    labRecommendationRequested && !!(data.referencePhoto || data.referencePhotoUrl);

  const showBrand = isImplantFieldVisible(fieldSettings, "implant_brand_system");
  const showPlatform = isImplantFieldVisible(fieldSettings, "implant_platform");
  const showSize = isImplantFieldVisible(fieldSettings, "implant_size");
  const showInclusion = isImplantFieldVisible(fieldSettings, "implant_inclusion");
  const showAbutment = isImplantFieldVisible(fieldSettings, "abutment");
  const showAbutmentType = isImplantFieldVisible(fieldSettings, "abutment_type");

  const brandSystemComplete =
    labRecommendationRequested ||
    !showBrand ||
    (!!brand && !!(systemName || selectedImplant));
  // Hidden fields still wait on the previous step so later fields never jump ahead.
  const platformComplete =
    labRecommendationRequested ||
    (brandSystemComplete && (!showPlatform || !!platform));
  const sizeComplete =
    labRecommendationRequested ||
    (platformComplete && (!showSize || !!size));
  const inclusionValue = inclusionField
    ? (dynamicFields[inclusionField.id] ?? inclusions ?? "No inclusion")
    : inclusions;
  const inclusionComplete =
    labRecommendationRequested ||
    (sizeComplete && (!showInclusion || !!inclusionValue.trim()));
  const abutmentApplicable =
    showAbutment &&
    !abutmentConfig.usesLegacyFallback &&
    abutmentConfig.abutmentCategoryOptions.length > 0;
  const abutmentCategoryComplete =
    labRecommendationRequested ||
    !abutmentApplicable ||
    (inclusionComplete && !!abutmentCategory);
  const abutmentTypeOptions = abutmentCategory
    ? abutmentConfig.getAbutmentTypeOptions(abutmentCategory)
    : [];
  const hasAbutmentTypeChoices = abutmentTypeOptions.length > 0;
  const abutmentTypeComplete =
    labRecommendationRequested ||
    !abutmentApplicable ||
    !showAbutmentType ||
    !hasAbutmentTypeChoices ||
    (abutmentCategoryComplete && !!abutmentSpecificType);

  const isComplete = labRecommendationRequested
    ? labRecommendationComplete
    : abutmentTypeComplete && inclusionComplete && sizeComplete && platformComplete && brandSystemComplete;

  // Latch progressive unlock — never hide a step that was already shown.
  useEffect(() => {
    if (brandSystemComplete) setUnlockedBrandPlatform(true);
  }, [brandSystemComplete]);
  useEffect(() => {
    if (platformComplete && (showSize || showInclusion)) setUnlockedSizeRow(true);
  }, [platformComplete, showSize, showInclusion]);
  useEffect(() => {
    if (sizeComplete && showInclusion) setUnlockedInclusion(true);
  }, [sizeComplete, showInclusion]);
  useEffect(() => {
    if (inclusionComplete && abutmentApplicable) setUnlockedAbutment(true);
  }, [inclusionComplete, abutmentApplicable]);

  // Prefill unlock when editing an already-filled row (e.g. lab modal / edit slip).
  useEffect(() => {
    if (brand || data.implantId) setUnlockedBrandPlatform(true);
    if (platform || size) setUnlockedSizeRow(true);
    if (
      (inclusions?.trim() && inclusions !== "No inclusion") ||
      Object.values(dynamicFields).some((v) => String(v ?? "").trim())
    ) {
      setUnlockedInclusion(true);
      setUnlockedSizeRow(true);
    }
    if (abutmentCategory || abutmentSpecificType || data.abutmentId) {
      setUnlockedAbutment(true);
      setUnlockedInclusion(true);
      setUnlockedSizeRow(true);
    }
  }, [
    brand,
    data.implantId,
    platform,
    size,
    inclusions,
    dynamicFields,
    abutmentCategory,
    abutmentSpecificType,
    data.abutmentId,
  ]);

  const showBrandGallery =
    !labRecommendationRequested &&
    showBrand &&
    (!brandSystemComplete || editingBrand);
  const showBrandPlatformRow =
    !labRecommendationRequested && (brandSystemComplete || unlockedBrandPlatform);
  const showSizeInclusionRow =
    !labRecommendationRequested &&
    (showSize || showInclusion) &&
    (platformComplete || unlockedSizeRow);
  const showAbutmentRow =
    !labRecommendationRequested &&
    abutmentApplicable &&
    (inclusionComplete || unlockedAbutment);

  useEffect(() => {
    if (labRecommendationRequested) return;
    if (brandSystemComplete && showPlatform && !platform && !editingBrand) {
      setPlatformDropdownOpen(true);
    }
  }, [labRecommendationRequested, brandSystemComplete, showPlatform, platform, editingBrand]);

  useEffect(() => {
    if (!showSize) return;
    if (platformComplete && !size && !editingPlatform) setSizeDropdownOpen(true);
  }, [showSize, platformComplete, size, editingPlatform]);

  useEffect(() => {
    if (abutmentApplicable && inclusionComplete && !abutmentCategory && !editingSize) {
      setAbutmentCategoryOpen(true);
    }
  }, [abutmentApplicable, inclusionComplete, abutmentCategory, editingSize]);

  useEffect(() => {
    if (!showAbutmentType) return;
    if (
      abutmentApplicable &&
      abutmentCategoryComplete &&
      !abutmentSpecificType &&
      !editingAbutment
    ) {
      setAbutmentTypeOpen(true);
    }
  }, [
    showAbutmentType,
    abutmentApplicable,
    abutmentCategoryComplete,
    abutmentSpecificType,
    editingAbutment,
  ]);

  const onCompleteChangeRef = useRef(onCompleteChange);
  onCompleteChangeRef.current = onCompleteChange;
  useEffect(() => {
    onCompleteChangeRef.current?.(isComplete);
  }, [
    isComplete,
    data.brand,
    data.platform,
    data.size,
    data.inclusions,
    data.abutmentType,
    data.abutmentDetail,
    data.labRecommendationRequested,
    data.referencePhoto,
    data.referencePhotoUrl,
  ]);

  const borderColor =
    isComplete && !caseSubmitted
      ? "border-[#34a853]"
      : isComplete
        ? "border-[#b4b0b0]"
        : "border-[#CF0202]";
  const legendColor =
    isComplete && !caseSubmitted
      ? "text-[#34a853]"
      : isComplete
        ? "text-[#7f7f7f]"
        : "text-[#CF0202]";

  const headerTitle = `Implant Detail #${toothNumber}`;
  const headerSubtitle = labRecommendationRequested ? "Lab recommendation requested" : "";
  const brandSystemDisplay =
    brand && (systemName || selectedImplant?.system_name)
      ? `${brand} - ${systemName || selectedImplant?.system_name}`
      : "";

  const selectBrandSystem = (implantId: string) => {
    if (implantId === LAB_RECOMMENDATION_VALUE) {
      setImplantSearch("");
      setEditingBrand(false);
      update({
        labRecommendationRequested: true,
        brand: "",
        systemName: "",
        platform: "",
        size: "",
        implantId: null,
        platformId: null,
        sizeId: null,
      });
      setPhotoModalOpen(true);
      return;
    }
    const implant = apiImplants.find((i) => String(i.id) === implantId);
    if (!implant) return;
    setImplantSearch("");
    setEditingBrand(false);

    const current = dataRef.current;
    const matchingPlatform =
      (current.platformId
        ? implant.platforms?.find((p) => p.id === current.platformId)
        : null) ??
      (current.platform
        ? implant.platforms?.find((p) => p.name === current.platform && p.status === "Active")
        : null);
    const matchingSize =
      (current.sizeId
        ? matchingPlatform?.sizes?.find((s) => s.id === current.sizeId)
        : null) ??
      (current.size
        ? matchingPlatform?.sizes?.find((s) => s.label === current.size && s.status === "Active")
        : null);

    update({
      labRecommendationRequested: false,
      referencePhoto: null,
      brand: implant.brand_name,
      systemName: implant.system_name,
      implantId: implant.id,
      // Keep platform/size when they still exist on the newly chosen implant.
      platform: matchingPlatform?.name ?? "",
      size: matchingSize?.label ?? "",
      platformId: matchingPlatform?.id ?? null,
      sizeId: matchingSize?.id ?? null,
    });
  };

  const readPhotoFile = async (file: File) => {
    try {
      const referencePhoto = await compressImageToDataUrl(file);
      update({
        labRecommendationRequested: true,
        referencePhoto,
        referencePhotoUrl: null,
      });
      setPhotoModalOpen(false);
    } catch {
      // Fall back to raw FileReader if canvas compress fails (rare).
      const reader = new FileReader();
      reader.onload = () => {
        update({
          labRecommendationRequested: true,
          referencePhoto: typeof reader.result === "string" ? reader.result : null,
          referencePhotoUrl: null,
        });
        setPhotoModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`rounded-[7.7px] bg-white overflow-hidden border ${borderColor}`}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50/80 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className={`text-[12.8px] font-normal leading-none ${legendColor}`}>
          {headerTitle}
          {headerSubtitle ? (
            <span className="ml-2 italic text-[11px] text-[#7f7f7f]">{headerSubtitle}</span>
          ) : null}
        </span>
        <ChevronDown
          size={18}
          className={`text-[#7f7f7f] flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div
          className={`border-t ${borderColor}${caseSubmitted ? " pointer-events-none select-none" : ""}`}
        >
          <div className="flex flex-col p-2.5 gap-3 flex-1 min-w-0">
            {/* —— Implant (4 fields) —— */}
            {labRecommendationRequested && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-[#d9d9d9] px-3 py-2">
                <p className="text-sm text-gray-800">Lab recommendation requested</p>
                <button
                  type="button"
                  className="text-xs text-[#1162a8] underline"
                  onClick={() =>
                    update({
                      labRecommendationRequested: false,
                      referencePhoto: null,
                      referencePhotoUrl: null,
                    })
                  }
                >
                  Change
                </button>
              </div>
            )}
            {!labRecommendationRequested && showBrandGallery && (
              <>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ba5b7] pointer-events-none"
                  />
                  <input
                    type="search"
                    value={implantSearch}
                    onChange={(e) => setImplantSearch(e.target.value)}
                    placeholder="Search implant brand or system..."
                    aria-label="Search implant brands"
                    className="w-full h-9 pl-8 pr-3 rounded-md border border-[#d9d9d9] bg-white text-sm text-[#000000] placeholder:text-[#9ba5b7] focus:outline-none focus:ring-2 focus:ring-[#1162a8]/30 focus:border-[#1162a8]"
                  />
                </div>
                {filteredBrandSystemItems.length > 0 ? (
                  <CardGallery
                    options={filteredBrandSystemItems}
                    value={selectedImplant ? String(selectedImplant.id) : ""}
                    onChange={selectBrandSystem}
                  />
                ) : (
                  <p className="text-sm text-[#7f7f7f] px-1 py-2">
                    {brandSystemItems.length === 0
                      ? "No implants available for this product."
                      : "No implants match your search."}
                  </p>
                )}
                {editingBrand && brandSystemComplete ? (
                  <button
                    type="button"
                    className="text-xs text-[#1162a8] underline self-start"
                    onClick={() => {
                      setEditingBrand(false);
                      setImplantSearch("");
                    }}
                  >
                    Keep current brand
                  </button>
                ) : null}
              </>
            )}

            {showBrandPlatformRow && (
              <div className={fieldsGridClass}>
                {showBrand && !editingBrand && brandSystemComplete && (
                  <CardSelectorField
                    label={labels.brandSystem}
                    value={brandSystemDisplay}
                    caseSubmitted={caseSubmitted}
                    onClick={() => {
                      setImplantSearch("");
                      setEditingBrand(true);
                    }}
                  />
                )}
                {showPlatform &&
                  (platform && !editingPlatform ? (
                    <CardSelectorField
                      label={labels.platform}
                      value={platform}
                      caseSubmitted={caseSubmitted}
                      onClick={() => {
                        setEditingPlatform(true);
                        setPlatformDropdownOpen(true);
                      }}
                    />
                  ) : (
                    <SelectField
                      label={labels.platform}
                      emptyLabel={`Select ${labels.platform.toLowerCase()}`}
                      value={platform}
                      options={platformOptions}
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => {
                        const plat = selectedImplant?.platforms?.find((p) => p.name === v);
                        const currentSize = dataRef.current.size;
                        const matchingSize = currentSize
                          ? plat?.sizes?.find(
                              (s) => s.label === currentSize && s.status === "Active"
                            )
                          : null;
                        update({
                          platform: v,
                          platformId: plat?.id ?? null,
                          // Keep size when it exists on the new platform.
                          size: matchingSize?.label ?? "",
                          sizeId: matchingSize?.id ?? null,
                        });
                        setEditingPlatform(false);
                        setPlatformDropdownOpen(false);
                      }}
                      open={platformDropdownOpen}
                      onOpenChange={(open) => {
                        setPlatformDropdownOpen(open);
                        if (!open && platform) setEditingPlatform(false);
                      }}
                    />
                  ))}
              </div>
            )}

            {showSizeInclusionRow && (
              <div className={fieldsGridClass}>
                {showSize &&
                  (size && !editingSize ? (
                    <CardSelectorField
                      label={labels.size}
                      value={size}
                      caseSubmitted={caseSubmitted}
                      onClick={() => {
                        setEditingSize(true);
                        setSizeDropdownOpen(true);
                      }}
                    />
                  ) : (
                    <SelectField
                      label={labels.size}
                      emptyLabel={`Select ${labels.size.toLowerCase()}`}
                      value={size}
                      options={
                        sizeOptions.length > 0 ? sizeOptions : implantSizeFallback
                      }
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => {
                        const plat =
                          selectedImplant?.platforms?.find((p) => p.name === platform) ??
                          selectedImplant?.platforms?.find((p) => p.id === data.platformId);
                        const sz = plat?.sizes?.find((s) => s.label === v);
                        update({ size: v, sizeId: sz?.id ?? null });
                        setEditingSize(false);
                        setSizeDropdownOpen(false);
                      }}
                      open={sizeDropdownOpen}
                      onOpenChange={(open) => {
                        setSizeDropdownOpen(open);
                        if (!open && size) setEditingSize(false);
                      }}
                    />
                  ))}
                {showInclusion &&
                  (sizeComplete || unlockedInclusion) &&
                  (inclusionField ? (
                    <ImplantInclusionsField
                      label={labels.inclusion}
                      value={dynamicFields[inclusionField.id] ?? inclusions ?? "No inclusion"}
                      quantity={inclusionQty}
                      options={getActiveOptions(inclusionField).map((o) => o.name)}
                      onChange={({ value: v, quantity: q }) =>
                        update({
                          dynamicFields: {
                            ...(dataRef.current.dynamicFields ?? {}),
                            [inclusionField.id]: v,
                          },
                          inclusions: v,
                          inclusionQty: q,
                        })
                      }
                      autoOpenWhenVisible={!inclusionValue.trim() || inclusionValue === "No inclusion"}
                      caseSubmitted={caseSubmitted}
                    />
                  ) : (
                    <ImplantInclusionsField
                      label={labels.inclusion}
                      value={inclusions}
                      quantity={inclusionQty}
                      onChange={({ value: v, quantity: q }) =>
                        update({ inclusions: v, inclusionQty: q })
                      }
                      autoOpenWhenVisible={!inclusions.trim() || inclusions === "No inclusion"}
                      caseSubmitted={caseSubmitted}
                    />
                  ))}
              </div>
            )}

            {showAbutmentRow && (
              <div className={fieldsGridClass}>
                {abutmentCategory && !editingAbutment ? (
                  <CardSelectorField
                    label={labels.abutment}
                    value={abutmentCategory}
                    caseSubmitted={caseSubmitted}
                    onClick={() => {
                      setEditingAbutment(true);
                      setAbutmentCategoryOpen(true);
                    }}
                  />
                ) : (
                  <SelectField
                    label={labels.abutment}
                    emptyLabel={`Select ${labels.abutment.toLowerCase()}`}
                    value={abutmentCategory}
                    options={abutmentConfig.abutmentCategoryOptions}
                    caseSubmitted={caseSubmitted}
                    onChange={(v) => {
                      const match = productAbutments.find((a) => a.type === v);
                      const currentDetail = dataRef.current.abutmentDetail;
                      const matchingOption = currentDetail
                        ? match?.options?.find((o) => o.name === currentDetail)
                        : null;
                      update({
                        abutmentType: v,
                        abutmentId: match?.id ?? null,
                        // Keep abutment type when it still exists under the new category.
                        abutmentDetail: matchingOption?.name ?? "",
                        abutmentOptionId: matchingOption?.id ?? null,
                      });
                      setEditingAbutment(false);
                      setAbutmentCategoryOpen(false);
                    }}
                    open={abutmentCategoryOpen}
                    onOpenChange={(open) => {
                      setAbutmentCategoryOpen(open);
                      if (!open && abutmentCategory) setEditingAbutment(false);
                    }}
                  />
                )}
                {showAbutmentType &&
                  hasAbutmentTypeChoices &&
                  (abutmentCategoryComplete || unlockedAbutment) &&
                  (abutmentSpecificType && !editingAbutmentType ? (
                    <CardSelectorField
                      label={labels.abutmentType}
                      value={abutmentSpecificType}
                      caseSubmitted={caseSubmitted}
                      onClick={() => {
                        setEditingAbutmentType(true);
                        setAbutmentTypeOpen(true);
                      }}
                    />
                  ) : (
                    <SelectField
                      label={labels.abutmentType}
                      emptyLabel={`Select ${labels.abutmentType.toLowerCase()}`}
                      value={abutmentSpecificType}
                      options={abutmentTypeOptions}
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => {
                        const abutment = productAbutments.find((a) => a.type === abutmentCategory);
                        const option = abutment?.options?.find((o) => o.name === v);
                        update({
                          abutmentDetail: v,
                          abutmentOptionId: option?.id ?? null,
                        });
                        setEditingAbutmentType(false);
                        setAbutmentTypeOpen(false);
                      }}
                      open={abutmentTypeOpen}
                      onOpenChange={(open) => {
                        setAbutmentTypeOpen(open);
                        if (!open && abutmentSpecificType) setEditingAbutmentType(false);
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Attachment</h3>
            <p className="text-sm text-gray-600 mb-4">Attach reference photo for your implant</p>
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-10 cursor-pointer hover:border-[#1162a8]">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500 text-center">
                Drag & drop files here or click to browse files.
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readPhotoFile(file);
                }}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm border rounded-md"
                onClick={() => {
                  setPhotoModalOpen(false);
                  if (!data.referencePhoto && !data.referencePhotoUrl) {
                    update({ labRecommendationRequested: false });
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-[#1162a8] text-white"
                onClick={() => photoInputRef.current?.click()}
              >
                Attach Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
