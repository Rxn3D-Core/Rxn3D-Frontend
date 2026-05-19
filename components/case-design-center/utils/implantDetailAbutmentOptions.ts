import type { ProductAbutment } from "@/services/implant-api";
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

function isActiveOption(option: { status?: string }) {
  return !option?.status || option.status === "Active";
}

function isActiveAbutment(entry: ProductAbutment) {
  return !entry?.status || entry.status === "Active";
}

function isAdvanceAbutmentField(field: ProductAdvanceField) {
  return field.field_type === "dropdown" && field.advance_subcategory_id === 27;
}

function getAdvanceFieldOptions(field: ProductAdvanceField | undefined) {
  return (field?.options || [])
    .filter(isActiveOption)
    .map((option: { name: string }) => option.name)
    .filter(Boolean);
}

/** Abutment category + specific type from product details `abutments` array. */
export function getProductAbutmentFieldOptions(productAbutments: ProductAbutment[]) {
  const active = productAbutments.filter(isActiveAbutment);
  return {
    usesApiAbutments: active.length > 0,
    categoryOptions: active.map((a) => a.type),
    getTypeOptionsForCategory: (category: string) => {
      const match = active.find((a) => a.type === category);
      return (match?.options ?? [])
        .filter(isActiveOption)
        .map((o) => o.name)
        .filter(Boolean);
    },
  };
}

export function getImplantDetailAbutmentOptions({
  advanceFields,
  productAbutments,
}: {
  advanceFields?: ProductAdvanceField[];
  productAbutments?: ProductAbutment[];
}) {
  const fromProduct = getProductAbutmentFieldOptions(productAbutments ?? []);
  if (fromProduct.usesApiAbutments) {
    return {
      usesApiAbutments: true,
      usesLegacyFallback: false,
      abutmentCategoryOptions: fromProduct.categoryOptions,
      getAbutmentTypeOptions: fromProduct.getTypeOptionsForCategory,
    };
  }

  const abutmentFields = (advanceFields || []).filter(isAdvanceAbutmentField);
  if (abutmentFields.length >= 2) {
    return {
      usesApiAbutments: false,
      usesLegacyFallback: false,
      abutmentCategoryOptions: getAdvanceFieldOptions(abutmentFields[0]),
      getAbutmentTypeOptions: (_category: string) =>
        getAdvanceFieldOptions(abutmentFields[1]),
    };
  }

  return {
    usesApiAbutments: false,
    usesLegacyFallback: true,
    abutmentCategoryOptions: LEGACY_ABUTMENT_DETAIL_OPTIONS,
    getAbutmentTypeOptions: (_category: string) => LEGACY_ABUTMENT_TYPE_OPTIONS,
  };
}

/** @deprecated Use abutmentCategoryOptions */
export function getLegacyAbutmentTypeOptions(advanceFields?: ProductAdvanceField[]) {
  return getImplantDetailAbutmentOptions({ advanceFields }).abutmentCategoryOptions;
}
