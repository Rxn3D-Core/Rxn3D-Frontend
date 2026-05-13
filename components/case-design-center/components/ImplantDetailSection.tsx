"use client";

import { useState, useEffect, useRef } from "react";
import { CardGallery, type CardGalleryItem } from "./fields/CardGallery";
import { CardSelectorField } from "./fields/CardSelectorField";
import { SelectField } from "./fields/SelectField";
import { ImplantInclusionsField } from "./fields/ImplantInclusionsField";
import type { ProductAdvanceField } from "../types";
import {
  fetchProductImplants,
  type ProductImplant,
} from "@/services/implant-api";
import { getImplantDetailAbutmentOptions } from "../utils/implantDetailAbutmentOptions";

export interface ImplantDetailData {
  brand: string;
  platform: string;
  size: string;
  inclusions: string;
  inclusionQty: number;
  abutmentDetail: string;
  abutmentType: string;
  dynamicFields: Record<number, string>;
}

export const defaultImplantDetailData = (): ImplantDetailData => ({
  brand: "",
  platform: "",
  size: "",
  inclusions: "No inclusion",
  inclusionQty: 0,
  abutmentDetail: "",
  abutmentType: "",
  dynamicFields: {},
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
}

function getActiveOptions(field: ProductAdvanceField): Array<{ id: number; name: string }> {
  return (field.options || []).filter(
    (o: any) => !o.status || o.status === "Active"
  );
}

function isImplantLibraryField(f: ProductAdvanceField) {
  return f.field_type === "implant_library";
}

function isAbutmentField(f: ProductAdvanceField) {
  return f.field_type === "dropdown" && f.advance_subcategory_id === 27;
}

function isInclusionField(f: ProductAdvanceField) {
  return (
    f.field_type === "dropdown" &&
    (f.name || "").toLowerCase().includes("inclusion")
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
}: ImplantDetailSectionProps) {
  const [localData, setLocalData] = useState<ImplantDetailData>(defaultImplantDetailData);
  const isControlled = value !== undefined && onChange !== undefined;
  const data = isControlled ? value : localData;

  const update = (patch: Partial<ImplantDetailData>) => {
    if (isControlled) {
      onChange({ ...value, ...patch });
    } else {
      setLocalData((prev) => ({ ...prev, ...patch }));
    }
  };

  const updateDynamic = (fieldId: number, val: string) => {
    const dynamicFields = { ...(data.dynamicFields ?? {}), [fieldId]: val };
    update({ dynamicFields });
  };

  const [apiImplants, setApiImplants] = useState<ProductImplant[]>([]);

  useEffect(() => {
    if (!productId || !customerId) return;
    fetchProductImplants(productId, customerId).then(setApiImplants).catch(() => setApiImplants([]));
  }, [productId, customerId]);

  const hasAdvanceFields = advanceFields && advanceFields.length > 0;

  const implantLibFields = hasAdvanceFields
    ? advanceFields!.filter(isImplantLibraryField).sort((a, b) => (a.link_sequence ?? a.sequence ?? 0) - (b.link_sequence ?? b.sequence ?? 0))
    : [];

  const abutmentFields = hasAdvanceFields
    ? advanceFields!.filter(isAbutmentField).sort((a, b) => (a.link_sequence ?? a.sequence ?? 0) - (b.link_sequence ?? b.sequence ?? 0))
    : [];

  const inclusionField = hasAdvanceFields ? advanceFields!.find(isInclusionField) ?? null : null;

  const implantSizeFallback = ["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"];

  const brandField = implantLibFields[0] ?? null;
  const systemField = implantLibFields[1] ?? null;
  const sizeField = implantLibFields[2] ?? null;

  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [abutmentDropdownOpen, setAbutmentDropdownOpen] = useState<Record<number, boolean>>({});
  const [legacyAbutmentDetailOpen, setLegacyAbutmentDetailOpen] = useState(false);
  const [legacyAbutmentTypeOpen, setLegacyAbutmentTypeOpen] = useState(false);

  const brand = data.brand;
  const platform = data.platform;
  const size = data.size;
  const inclusions = data.inclusions;
  const inclusionQty = data.inclusionQty;
  const abutmentDetail = data.abutmentDetail;
  const abutmentType = data.abutmentType;
  const dynamicFields = data.dynamicFields ?? {};

  // Derive brand items with image and system name for rich cards
  const brandItems: CardGalleryItem[] = apiImplants.map((i) => ({
    value: i.brand_name,
    label: i.brand_name,
    subtitle: i.system_name,
    imageUrl: i.image_url,
  }));


  const platformList: string[] = brand
    ? (apiImplants.find((i) => i.brand_name === brand)?.platforms ?? [])
        .filter((p) => p.status === "Active")
        .map((p) => p.name)
    : [];

  const apiSizesForPlatform: string[] = brand && platform
    ? (apiImplants.find((i) => i.brand_name === brand)?.platforms ?? [])
        .filter((p) => p.status === "Active" && p.name === platform)
        .flatMap((p) => p.sizes.filter((s) => s.status === "Active").map((s) => s.label))
    : [];

  const { abutmentTypeOptions, abutmentDetailOptions } = getImplantDetailAbutmentOptions({
    advanceFields,
  });

  // Progressive visibility
  const row1Complete = hasAdvanceFields
    ? (implantLibFields.length === 0 || (!!brand && !!platform && !!size))
    : (!!brand && !!platform && !!size);

  const row2Visible = row1Complete;
  const inclusionValue = inclusionField ? (dynamicFields[inclusionField.id] ?? "No inclusion") : inclusions;
  const row2Complete = row1Complete && !!inclusionValue.trim();
  const row3Visible = row2Complete;
  const activeAbutmentFieldId = abutmentFields.find((f) => !(dynamicFields[f.id] ?? ""))?.id ?? null;

  const abutmentComplete = abutmentFields.length > 0
    ? abutmentFields.every((f) => !!(dynamicFields[f.id] ?? ""))
    : !!abutmentDetail && !!abutmentType;

  const isComplete = row2Complete && abutmentComplete;

  useEffect(() => {
    if (brand && platform && !size) setSizeDropdownOpen(true);
  }, [brand, platform, size]);

  useEffect(() => {
    if (!hasAdvanceFields && row2Complete && !abutmentType) setLegacyAbutmentTypeOpen(true);
  }, [hasAdvanceFields, row2Complete, abutmentType]);

  useEffect(() => {
    if (!hasAdvanceFields && row2Complete && abutmentType && !abutmentDetail) setLegacyAbutmentDetailOpen(true);
  }, [hasAdvanceFields, row2Complete, abutmentType, abutmentDetail]);

  useEffect(() => {
    if (!hasAdvanceFields || !row3Visible) return;
    for (const f of abutmentFields) {
      if (!(dynamicFields[f.id] ?? "")) {
        setAbutmentDropdownOpen((prev) => ({ ...prev, [f.id]: true }));
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row3Visible, JSON.stringify(dynamicFields)]);

  const onCompleteChangeRef = useRef(onCompleteChange);
  onCompleteChangeRef.current = onCompleteChange;
  useEffect(() => {
    onCompleteChangeRef.current?.(isComplete);
  }, [isComplete]);

  const borderColor = isComplete && !caseSubmitted ? "border-[#34a853]" : isComplete ? "border-[#b4b0b0]" : "border-[#CF0202]";
  const legendColor = isComplete && !caseSubmitted ? "text-[#34a853]" : isComplete ? "text-[#7f7f7f]" : "text-[#CF0202]";

  const legendLabel = !brand && implantLibFields.length > 0
    ? `Select ${brandField?.name ?? "implant brand"}`
    : !platform && systemField
    ? `Select ${systemField?.name ?? "implant system"}`
    : "Implant Detail";

  return (
    <fieldset className={`border rounded-[7.7px] p-0 bg-white ${borderColor}`}>
      <legend className={`text-[12.8px] px-1 leading-none ml-2 ${legendColor}`}>
        {legendLabel}
      </legend>
      <div className="flex flex-col sm:flex-row">
        <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
          <span className="text-xl text-[#7f7f7f] text-center">#{toothNumber}</span>
        </div>

        <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">

          {hasAdvanceFields ? (
            <>
              {brandField && !brand && (
                <CardGallery
                  options={brandItems}
                  value={brand}
                  onChange={(v) => update({ brand: v, platform: "", size: "" })}
                />
              )}

              {systemField && brand && !platform && (
                <CardGallery
                  options={platformList}
                  value={platform}
                  onChange={(v) => update({ platform: v, size: "" })}
                />
              )}

              {brand && platform && (
                <div className={`grid gap-3 ${sizeField ? "grid-cols-2" : "grid-cols-1"}`}>
                  <CardSelectorField
                    label={`${brandField?.name ?? "Implant Brand"} - ${systemField?.name ?? "System"}`}
                    value={`${brand} - ${platform}`}
                    caseSubmitted={caseSubmitted}
                    onClick={() => update({ brand: "", platform: "", size: "" })}
                  />
                  {sizeField && (
                    <SelectField
                      label={sizeField.name}
                      value={size}
                      options={
                        apiSizesForPlatform.length > 0
                          ? apiSizesForPlatform
                          : getActiveOptions(sizeField).map((o) => o.name).length > 0
                          ? getActiveOptions(sizeField).map((o) => o.name)
                          : implantSizeFallback
                      }
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => { update({ size: v }); setSizeDropdownOpen(false); }}
                      open={sizeDropdownOpen}
                      onOpenChange={setSizeDropdownOpen}
                    />
                  )}
                </div>
              )}

              {row2Visible && inclusionField && (
                <ImplantInclusionsField
                  label={inclusionField.name}
                  value={dynamicFields[inclusionField.id] ?? "No inclusion"}
                  quantity={inclusionQty}
                  options={getActiveOptions(inclusionField).map((o) => o.name)}
                  onChange={(v) => updateDynamic(inclusionField.id, v)}
                  onQuantityChange={(q) => update({ inclusionQty: q })}
                  autoOpenWhenVisible
                  caseSubmitted={caseSubmitted}
                />
              )}

              {row3Visible && abutmentFields.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {abutmentFields
                    .filter((f) => !!(dynamicFields[f.id] ?? "") || f.id === activeAbutmentFieldId)
                    .map((f) => (
                    <SelectField
                      key={f.id}
                      label={f.name}
                      emptyLabel={`Select ${f.name.toLowerCase()}`}
                      value={dynamicFields[f.id] ?? ""}
                      options={getActiveOptions(f).map((o) => o.name)}
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => {
                        updateDynamic(f.id, v);
                        setAbutmentDropdownOpen((prev) => ({ ...prev, [f.id]: false }));
                      }}
                      open={abutmentDropdownOpen[f.id] ?? false}
                      onOpenChange={(open) => setAbutmentDropdownOpen((prev) => ({ ...prev, [f.id]: open }))}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Legacy mode — no advance_fields, use API data */}

              {!brand && (
                <CardGallery
                  options={brandItems}
                  value={brand}
                  onChange={(v) => update({ brand: v, platform: "", size: "" })}
                />
              )}

              {brand && !platform && (
                <CardGallery
                  options={platformList}
                  value={platform}
                  onChange={(v) => update({ platform: v, size: "" })}
                />
              )}

              {brand && platform && (
                <div className="grid grid-cols-2 gap-3">
                  <CardSelectorField
                    label="Implant Brand - Platform"
                    value={`${brand} - ${platform}`}
                    caseSubmitted={caseSubmitted}
                    onClick={() => update({ brand: "", platform: "", size: "" })}
                  />
                  <SelectField
                    label="Implant Size"
                    value={size}
                    options={apiSizesForPlatform.length > 0 ? apiSizesForPlatform : implantSizeFallback}
                    caseSubmitted={caseSubmitted}
                    onChange={(v) => { update({ size: v }); setSizeDropdownOpen(false); }}
                    open={sizeDropdownOpen}
                    onOpenChange={setSizeDropdownOpen}
                  />
                </div>
              )}

              {row2Visible && (
                <ImplantInclusionsField
                  label="Implant inclusions"
                  value={inclusions}
                  quantity={inclusionQty}
                  onChange={(v) => update({ inclusions: v })}
                  onQuantityChange={(q) => update({ inclusionQty: q })}
                  autoOpenWhenVisible
                  caseSubmitted={caseSubmitted}
                />
              )}

              {row3Visible && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <SelectField
                    label="Abutment Type"
                    emptyLabel="Select abutment type"
                    value={abutmentType}
                    options={abutmentTypeOptions}
                    caseSubmitted={caseSubmitted}
                    onChange={(v) => { update({ abutmentType: v, abutmentDetail: "" }); setLegacyAbutmentTypeOpen(false); }}
                    open={legacyAbutmentTypeOpen}
                    onOpenChange={setLegacyAbutmentTypeOpen}
                  />
                  {abutmentType && (
                    <SelectField
                      label="Abutment Detail"
                      emptyLabel="Select abutment detail"
                      value={abutmentDetail}
                      options={abutmentDetailOptions}
                      caseSubmitted={caseSubmitted}
                      onChange={(v) => { update({ abutmentDetail: v }); setLegacyAbutmentDetailOpen(false); }}
                      open={legacyAbutmentDetailOpen}
                      onOpenChange={setLegacyAbutmentDetailOpen}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </fieldset>
  );
}
