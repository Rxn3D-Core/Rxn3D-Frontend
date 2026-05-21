"use client";

import type { Arch, ProductAdvanceField, ShadeFieldType } from "../types";
import { getShadeFieldType } from "../utils/shadeGuideAdvanceFields";
import { ShadeField } from "./fields/ShadeField";

interface ShadeDetailSectionProps {
  arch: Arch;
  fields: ProductAdvanceField[];
  productShadeId: string;
  storageToothNumber: number;
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string;
  onShadeFieldClick: (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string,
    options?: {
      advanceFieldId?: number | null;
      advanceFieldLabel?: string | null;
      storageToothNumber?: number | null;
    }
  ) => void;
  caseSubmitted?: boolean;
  isComplete?: boolean;
  /** Advance field id currently open in the shade picker */
  activeAdvanceFieldId?: number | null;
}

export function ShadeDetailSection({
  arch,
  fields,
  productShadeId,
  storageToothNumber,
  getSelectedShade,
  onShadeFieldClick,
  caseSubmitted = false,
  isComplete = false,
  activeAdvanceFieldId = null,
}: ShadeDetailSectionProps) {
  if (fields.length === 0) return null;

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

  const firstMissing = fields.find(
    (field) => !getSelectedShade(productShadeId, arch, getShadeFieldType(field), field.id)
  );
  const legendLabel = firstMissing ? `Select ${firstMissing.name.toLowerCase()}` : "Shade Detail";

  return (
    <fieldset className={`border rounded-[7.7px] p-0 bg-white mt-3 ${borderColor}`}>
      <legend className={`text-[12.8px] px-1 leading-none ml-2 ${legendColor}`}>
        {legendLabel}
      </legend>
      <div className="p-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {fields.map((field) => {
            const fieldType = getShadeFieldType(field);
            return (
              <ShadeField
                key={field.id}
                label={field.name}
                value={getSelectedShade(productShadeId, arch, fieldType, field.id)}
                shade=""
                isActive={activeAdvanceFieldId != null && field.id === activeAdvanceFieldId}
                onClick={() =>
                  onShadeFieldClick(arch, fieldType, productShadeId, {
                    advanceFieldId: field.id,
                    advanceFieldLabel: field.name,
                    storageToothNumber,
                  })
                }
                submitted={caseSubmitted}
                required
              />
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
