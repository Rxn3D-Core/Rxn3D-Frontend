"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown } from "lucide-react";
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
  defaultCollapsed?: boolean;
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
  defaultCollapsed = true,
  isExpanded: isExpandedProp,
  onExpandedChange,
}: ImplantDetailSectionProps) {
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

  const update = (patch: Partial<ImplantDetailData>) => {
    if (isControlled) {
      onChange({ ...value, ...patch });
    } else {
      setLocalData((prev) => ({ ...prev, ...patch }));
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

  const brandSystemItems: CardGalleryItem[] = apiImplants.map((i) => ({
    value: String(i.id),
    label: i.brand_name,
    subtitle: i.system_name,
    imageUrl: i.image_url,
  }));

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

  const brandSystemComplete = !!brand && !!(systemName || selectedImplant);
  const platformComplete = brandSystemComplete && !!platform;
  const sizeComplete = platformComplete && !!size;
  const inclusionValue = inclusionField
    ? (dynamicFields[inclusionField.id] ?? "No inclusion")
    : inclusions;
  // Inclusion is only required when the product configures an inclusion field.
  const inclusionComplete = inclusionField
    ? sizeComplete && !!inclusionValue.trim()
    : sizeComplete;
  // Abutment is only required when the product actually configures abutments (real
  // product/advance-field data — NOT the legacy fallback). Implant-only products with
  // no abutment skip it entirely, so the flow continues to the next configured field.
  const abutmentApplicable =
    !abutmentConfig.usesLegacyFallback &&
    abutmentConfig.abutmentCategoryOptions.length > 0;
  const abutmentCategoryComplete = inclusionComplete && !!abutmentCategory;
  const abutmentTypeComplete =
    abutmentCategoryComplete && !!abutmentSpecificType;

  const isComplete = abutmentApplicable ? abutmentTypeComplete : inclusionComplete;

  const abutmentTypeOptions = abutmentCategory
    ? abutmentConfig.getAbutmentTypeOptions(abutmentCategory)
    : [];

  useEffect(() => {
    if (brandSystemComplete && !platform) setPlatformDropdownOpen(true);
  }, [brandSystemComplete, platform]);

  useEffect(() => {
    if (platformComplete && !size) setSizeDropdownOpen(true);
  }, [platformComplete, size]);

  useEffect(() => {
    if (abutmentApplicable && inclusionComplete && !abutmentCategory) setAbutmentCategoryOpen(true);
  }, [abutmentApplicable, inclusionComplete, abutmentCategory]);

  useEffect(() => {
    if (abutmentApplicable && abutmentCategoryComplete && !abutmentSpecificType) setAbutmentTypeOpen(true);
  }, [abutmentApplicable, abutmentCategoryComplete, abutmentSpecificType]);

  const onCompleteChangeRef = useRef(onCompleteChange);
  onCompleteChangeRef.current = onCompleteChange;
  useEffect(() => {
    onCompleteChangeRef.current?.(isComplete);
  }, [isComplete]);

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
  const brandSystemDisplay =
    brand && (systemName || selectedImplant?.system_name)
      ? `${brand} - ${systemName || selectedImplant?.system_name}`
      : "";

  const selectBrandSystem = (implantId: string) => {
    const implant = apiImplants.find((i) => String(i.id) === implantId);
    if (!implant) return;
    update({
      brand: implant.brand_name,
      systemName: implant.system_name,
      platform: "",
      size: "",
    });
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
        </span>
        <ChevronDown
          size={18}
          className={`text-[#7f7f7f] flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div
          className={`border-t ${borderColor} flex flex-col sm:flex-row${caseSubmitted ? " pointer-events-none select-none" : ""}`}
        >
          <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
            <span className="text-xl text-[#7f7f7f] text-center">#{toothNumber}</span>
          </div>

          <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">
            {/* —— Implant (4 fields) —— */}
            {!brandSystemComplete && (
              <CardGallery
                options={brandSystemItems}
                value={selectedImplant ? String(selectedImplant.id) : ""}
                onChange={selectBrandSystem}
              />
            )}

            {brandSystemComplete && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CardSelectorField
                  label={labels.brandSystem}
                  value={brandSystemDisplay}
                  caseSubmitted={caseSubmitted}
                  onClick={() =>
                    update({ brand: "", systemName: "", platform: "", size: "" })
                  }
                />
                {platformComplete ? (
                  <CardSelectorField
                    label={labels.platform}
                    value={platform}
                    caseSubmitted={caseSubmitted}
                    onClick={() => update({ platform: "", size: "" })}
                  />
                ) : (
                  <SelectField
                    label={labels.platform}
                    emptyLabel={`Select ${labels.platform.toLowerCase()}`}
                    value={platform}
                    options={platformOptions}
                    caseSubmitted={caseSubmitted}
                    onChange={(v) => {
                      update({ platform: v, size: "" });
                      setPlatformDropdownOpen(false);
                    }}
                    open={platformDropdownOpen}
                    onOpenChange={setPlatformDropdownOpen}
                  />
                )}
              </div>
            )}

            {platformComplete && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sizeComplete ? (
                  <CardSelectorField
                    label={labels.size}
                    value={size}
                    caseSubmitted={caseSubmitted}
                    onClick={() => update({ size: "" })}
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
                      update({ size: v });
                      setSizeDropdownOpen(false);
                    }}
                    open={sizeDropdownOpen}
                    onOpenChange={setSizeDropdownOpen}
                  />
                )}
                {sizeComplete &&
                  (inclusionField ? (
                    <ImplantInclusionsField
                      label={labels.inclusion}
                      value={dynamicFields[inclusionField.id] ?? "No inclusion"}
                      quantity={inclusionQty}
                      options={getActiveOptions(inclusionField).map((o) => o.name)}
                      onChange={(v) =>
                        update({
                          dynamicFields: { ...dynamicFields, [inclusionField.id]: v },
                          inclusions: v,
                        })
                      }
                      onQuantityChange={(q) => update({ inclusionQty: q })}
                      autoOpenWhenVisible
                      caseSubmitted={caseSubmitted}
                    />
                  ) : (
                    <ImplantInclusionsField
                      label={labels.inclusion}
                      value={inclusions}
                      quantity={inclusionQty}
                      onChange={(v) => update({ inclusions: v })}
                      onQuantityChange={(q) => update({ inclusionQty: q })}
                      autoOpenWhenVisible
                      caseSubmitted={caseSubmitted}
                    />
                  ))}
              </div>
            )}

            {/* —— Abutment (2 fields) — only when the product configures abutments —— */}
            {inclusionComplete && abutmentApplicable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {abutmentCategoryComplete ? (
                  <CardSelectorField
                    label={labels.abutment}
                    value={abutmentCategory}
                    caseSubmitted={caseSubmitted}
                    onClick={() =>
                      update({ abutmentType: "", abutmentDetail: "" })
                    }
                  />
                ) : (
                  <SelectField
                    label={labels.abutment}
                    emptyLabel={`Select ${labels.abutment.toLowerCase()}`}
                    value={abutmentCategory}
                    options={abutmentConfig.abutmentCategoryOptions}
                    caseSubmitted={caseSubmitted}
                    onChange={(v) => {
                      update({ abutmentType: v, abutmentDetail: "" });
                      setAbutmentCategoryOpen(false);
                    }}
                    open={abutmentCategoryOpen}
                    onOpenChange={setAbutmentCategoryOpen}
                  />
                )}
                {abutmentCategoryComplete &&
                  (abutmentTypeComplete ? (
                    <CardSelectorField
                      label={labels.abutmentType}
                      value={abutmentSpecificType}
                      caseSubmitted={caseSubmitted}
                      onClick={() => update({ abutmentDetail: "" })}
                    />
                  ) : (
                    <SelectField
                      label={labels.abutmentType}
                      emptyLabel={`Select ${labels.abutmentType.toLowerCase()}`}
                      value={abutmentSpecificType}
                      options={abutmentTypeOptions}
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => {
                        update({ abutmentDetail: v });
                        setAbutmentTypeOpen(false);
                      }}
                      open={abutmentTypeOpen}
                      onOpenChange={setAbutmentTypeOpen}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
