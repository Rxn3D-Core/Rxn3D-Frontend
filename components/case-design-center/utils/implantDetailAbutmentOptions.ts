import type { ProductAdvanceField } from "../types";

export const LEGACY_ABUTMENT_DETAIL_OPTIONS = [
  "Office provided",
  "Lab provided",
  "Custom",
];

export const LEGACY_ABUTMENT_TYPE_OPTIONS = [
  "Stock Abutment",
  "Custom Abutment",
  "Multi-Unit abutment",
];

function isActiveOption(option: any) {
  return !option?.status || option.status === "Active";
}

function isAdvanceAbutmentField(field: ProductAdvanceField) {
  return field.field_type === "dropdown" && field.advance_subcategory_id === 27;
}

function getAdvanceFieldOptions(field: ProductAdvanceField | undefined) {
  return (field?.options || [])
    .filter(isActiveOption)
    .map((option: any) => option.name)
    .filter(Boolean);
}

export function getImplantDetailAbutmentOptions({
  advanceFields,
}: {
  advanceFields?: ProductAdvanceField[];
}) {
  const abutmentFields = (advanceFields || []).filter(isAdvanceAbutmentField);
  const usesLegacyFallback = abutmentFields.length === 0;

  if (usesLegacyFallback) {
    return {
      abutmentTypeOptions: LEGACY_ABUTMENT_TYPE_OPTIONS,
      abutmentDetailOptions: LEGACY_ABUTMENT_DETAIL_OPTIONS,
      usesLegacyFallback,
    };
  }

  return {
    abutmentTypeOptions: getAdvanceFieldOptions(abutmentFields[0]),
    abutmentDetailOptions: getAdvanceFieldOptions(abutmentFields[1]),
    usesLegacyFallback,
  };
}
