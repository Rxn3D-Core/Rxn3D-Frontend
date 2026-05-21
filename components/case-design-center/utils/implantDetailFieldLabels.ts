import type { ProductAdvanceField } from "../types";

function isImplantLibraryField(f: ProductAdvanceField) {
  return f.field_type === "implant_library";
}

function isInclusionField(f: ProductAdvanceField) {
  return (
    f.field_type === "dropdown" &&
    (f.name || "").toLowerCase().includes("inclusion")
  );
}

export function getImplantDetailFieldLabels(advanceFields?: ProductAdvanceField[]) {
  const implantLibFields = (advanceFields ?? [])
    .filter(isImplantLibraryField)
    .sort(
      (a, b) =>
        (a.link_sequence ?? a.sequence ?? 0) - (b.link_sequence ?? b.sequence ?? 0)
    );
  const inclusionField = (advanceFields ?? []).find(isInclusionField);

  return {
    brandSystem:
      implantLibFields.length >= 2
        ? `${implantLibFields[0]?.name ?? "Implant Brand"} - ${implantLibFields[1]?.name ?? "Implant System"}`
        : "Implant Brand - Implant System",
    platform: "Implant Platform",
    size: "Implant Size",
    inclusion: inclusionField?.name ?? "Implant Inclusions",
    abutment: "Abutment",
    abutmentType: "Abutment Type",
    inclusionField,
  };
}
