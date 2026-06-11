import type {
  AddedProduct,
  VirtualSlipInitialState,
} from "@/components/case-design-center/types";
import {
  buildVirtualSlipInitialState,
  determineInitialArch,
  parseProductTeeth,
} from "@/lib/virtual-slip-transformer";
import type { AddStageSelections } from "./session";
import { resolveDoctorImageUrl } from "@/utils/avatar-utils";

function archFromType(type: string | null | undefined): "maxillary" | "mandibular" {
  return type?.toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

function isRemovableCategory(apiProduct: Record<string, unknown>): boolean {
  const product = (apiProduct.product ?? {}) as Record<string, unknown>;
  const categoryName = String(
    (apiProduct.category as { name?: string } | undefined)?.name ??
      (product.subcategory as { category?: { name?: string } } | undefined)?.category
        ?.name ??
      product.category_name ??
      ""
  ).toLowerCase();
  return categoryName.includes("removable");
}

/**
 * Apply per-arch stage picks onto preloaded slip state so CDC opens with the chosen stages.
 */
export function buildAddStagePreload(
  apiProducts: unknown[],
  selections: AddStageSelections
): {
  initialSlipState: VirtualSlipInitialState;
  initialArch: "maxillary" | "mandibular" | "both";
} {
  const base = buildVirtualSlipInitialState(apiProducts);
  const selectedStages = { ...base.selectedStages };
  const fieldValues = { ...base.fieldValues };
  const completedFields = { ...base.completedFields };

  if (!Array.isArray(apiProducts)) {
    return { initialSlipState: base, initialArch: determineInitialArch(apiProducts) };
  }

  for (let i = 0; i < apiProducts.length; i++) {
    const apiProduct = apiProducts[i] as Record<string, unknown>;
    const arch = archFromType(apiProduct.type as string);
    const pick =
      arch === "maxillary" ? selections.maxillary : selections.mandibular;
    if (!pick?.stageName) continue;

    const teeth = parseProductTeeth(apiProduct);
    const repTooth = teeth[0];
    if (repTooth == null) continue;

    const removable = isRemovableCategory(apiProduct);
    const stageKey = removable
      ? `${arch}_prep_${repTooth}`
      : `${arch}_fixed_${repTooth}`;
    selectedStages[stageKey] = pick.stageName;

    const toothKey = `${arch}_${repTooth}`;
    const existingValues = { ...(fieldValues[toothKey] ?? {}) };
    if (removable) {
      existingValues.stage = pick.stageName;
    } else {
      existingValues.fixed_stage = pick.stageName;
    }
    fieldValues[toothKey] = existingValues;

    const steps = new Set(completedFields[toothKey] ?? []);
    steps.add(removable ? "stage" : "fixed_stage");
    completedFields[toothKey] = [...steps];
  }

  return {
    initialSlipState: {
      ...base,
      selectedStages,
      fieldValues,
      completedFields,
    },
    initialArch: determineInitialArch(apiProducts),
  };
}

export function findApiProductForArch(
  apiProducts: unknown[],
  arch: "maxillary" | "mandibular"
): Record<string, unknown> | null {
  if (!Array.isArray(apiProducts)) return null;
  const want = arch === "maxillary" ? "upper" : "lower";
  const row = apiProducts.find((p) => {
    const type = String((p as { type?: string }).type ?? "").toLowerCase();
    return type === want;
  });
  return row ? (row as Record<string, unknown>) : null;
}

export function resolveLabIdFromSlipDetails(details: unknown): number | null {
  if (!details || typeof details !== "object") return null;
  const d = details as {
    case?: { lab_id?: number; lab?: { id?: number } };
    lab_id?: number;
    lab?: { id?: number };
  };
  const id =
    d.case?.lab_id ??
    d.case?.lab?.id ??
    d.lab_id ??
    d.lab?.id ??
    null;
  return typeof id === "number" && id > 0 ? id : null;
}

export function resolveOfficeIdFromSlipDetails(details: unknown): number | null {
  if (!details || typeof details !== "object") return null;
  const d = details as {
    case?: { office_id?: number; office?: { id?: number } };
    office_id?: number;
    office?: { id?: number };
  };
  const id =
    d.case?.office_id ??
    d.case?.office?.id ??
    d.office_id ??
    d.office?.id ??
    null;
  return typeof id === "number" && id > 0 ? id : null;
}

export type AddStageWizardSeed = {
  patientName: string;
  gender: string;
  age: string;
  doctor: { id: number; name: string; img?: string } | null;
  lab: { id: number; name: string; logo?: string } | null;
};

export function buildWizardSeedFromSlipDetails(details: unknown): AddStageWizardSeed {
  if (!details || typeof details !== "object") {
    return { patientName: "", gender: "", age: "", doctor: null, lab: null };
  }
  const d = details as {
    case?: {
      patient_name?: string;
      gender?: string;
      age?: number | string;
      doctor?: { id?: number; name?: string; image?: string; signature_url?: string };
      office?: { id?: number; name?: string; logo_url?: string; image?: string };
      lab?: { id?: number; name?: string; logo_url?: string; image?: string };
    };
  };
  const c = d.case ?? {};
  const doctor = c.doctor;
  const office = c.office;
  const lab = c.lab;
  return {
    patientName: c.patient_name ?? "",
    gender: c.gender ?? "",
    age: c.age != null ? String(c.age) : "",
    doctor:
      doctor?.id && doctor?.name
        ? {
            id: doctor.id,
            name: doctor.name,
            img: resolveDoctorImageUrl(doctor) || undefined,
          }
        : null,
    lab:
      (lab?.id && lab?.name
        ? { id: lab.id, name: lab.name, logo: lab.logo_url ?? lab.image }
        : null) ??
      (office?.id && office?.name
        ? { id: office.id, name: office.name, logo: office.logo_url ?? office.image }
        : null),
  };
}

/** Re-export for consumers that need added products list. */
export { buildAddedProducts } from "@/lib/virtual-slip-transformer";
