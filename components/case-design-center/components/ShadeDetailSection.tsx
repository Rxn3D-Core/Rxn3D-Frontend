"use client";

import type { Arch, ProductAdvanceField, ShadeFieldType } from "../types";
import { getShadeFieldType } from "../utils/shadeGuideAdvanceFields";
import { ShadeField } from "./fields/ShadeField";

function formatShadeGuideName(raw: string): string {
  if (!raw) return raw;
  return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  /** Selected shade guide name (e.g. "VITA_CLASSICAL") — shown as main text in each field */
  selectedShadeGuide?: string;
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
  selectedShadeGuide = "",
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
    <fieldset className={`border rounded-[7.7px] p-0 bg-white mt-3 min-w-0 ${borderColor}`}>
      <legend className={`text-[12.8px] px-1 leading-none ml-2 ${legendColor}`}>
        {legendLabel}
      </legend>
      <div className="p-2.5 min-w-0">
        <div
          className="grid gap-3 min-w-0"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 168px), 1fr))",
          }}
        >
          {fields.map((field) => {
            const fieldType = getShadeFieldType(field);
            const shadeCode = getSelectedShade(productShadeId, arch, fieldType, field.id);
            return (
              <ShadeField
                key={field.id}
                className="min-w-0"
                label={field.name}
                // Guide name as main text, shade code only on the tooth SVG
                value={shadeCode ? formatShadeGuideName(selectedShadeGuide || shadeCode) : ""}
                shade={shadeCode}
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
