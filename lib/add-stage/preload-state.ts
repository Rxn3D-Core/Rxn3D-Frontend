import type {
  AddedProduct,
  VirtualSlipInitialState,
} from "@/components/case-design-center/types";
import {
  isFixedRestorationProduct,
  resolveProductForRetentionCheck,
} from "@/components/case-design-center/utils/categoryHelpers";
import { emptyImpressionSelections } from "@/components/case-design-center/utils/impressionStorage";
import {
  buildVirtualSlipInitialState,
  determineInitialArch,
  parseProductTeeth,
} from "@/lib/virtual-slip-transformer";
import type { AddStageSelections } from "./session";
import { resolveDoctorImageUrl } from "@/utils/avatar-utils";

const IMPRESSION_FIELD_STEPS = new Set(["impression", "fixed_impression"]);

/** Drop prior-slip impression selections and completion so the new stage must choose. */
function clearPreloadedImpressions(base: VirtualSlipInitialState): {
  selectedImpressions: VirtualSlipInitialState["selectedImpressions"];
  fieldValues: VirtualSlipInitialState["fieldValues"];
  completedFields: VirtualSlipInitialState["completedFields"];
} {
  const fieldValues: VirtualSlipInitialState["fieldValues"] = {};
  for (const [toothKey, values] of Object.entries(base.fieldValues ?? {})) {
    const next: Record<string, string> = {};
    for (const [step, value] of Object.entries(values ?? {})) {
      if (!IMPRESSION_FIELD_STEPS.has(step)) next[step] = value;
    }
    fieldValues[toothKey] = next;
  }

  const completedFields: VirtualSlipInitialState["completedFields"] = {};
  for (const [toothKey, steps] of Object.entries(base.completedFields ?? {})) {
    completedFields[toothKey] = (steps ?? []).filter(
      (step) => !IMPRESSION_FIELD_STEPS.has(step)
    );
  }

  return {
    selectedImpressions: emptyImpressionSelections(),
    fieldValues,
    completedFields,
  };
}

function archFromType(type: string | null | undefined): "maxillary" | "mandibular" {
  return type?.toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

function isNonFixedSlipProduct(apiProduct: Record<string, unknown>): boolean {
  return !isFixedRestorationProduct(resolveProductForRetentionCheck(apiProduct));
}

/**
 * Apply per-arch stage picks onto preloaded slip state so CDC opens with the chosen stages.
 * Prior-slip impressions are intentionally cleared — each new stage must choose
 * New Impression or No Impression in the impression modal.
 */
export function buildAddStagePreload(
  apiProducts: unknown[],
  selections: AddStageSelections
): {
  initialSlipState: VirtualSlipInitialState;
  initialArch: "maxillary" | "mandibular" | "both";
} {
  const base = buildVirtualSlipInitialState(apiProducts);
  const cleared = clearPreloadedImpressions(base);
  const selectedStages = { ...base.selectedStages };
  const fieldValues = { ...cleared.fieldValues };
  const completedFields = { ...cleared.completedFields };

  if (!Array.isArray(apiProducts)) {
    return {
      initialSlipState: {
        ...base,
        ...cleared,
      },
      initialArch: determineInitialArch(apiProducts),
    };
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

    const removable = isNonFixedSlipProduct(apiProduct);
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
      selectedImpressions: cleared.selectedImpressions,
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

export function coercePositiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  return null;
}

function firstPositiveId(...values: unknown[]): number | null {
  for (const value of values) {
    const id = coercePositiveId(value);
    if (id) return id;
  }
  return null;
}

export function resolveLabIdFromSlipDetails(details: unknown): number | null {
  if (!details || typeof details !== "object") return null;
  const d = details as {
    case?: { lab_id?: unknown; lab?: { id?: unknown } };
    lab_id?: unknown;
    lab?: { id?: unknown };
  };
  return firstPositiveId(d.case?.lab_id, d.case?.lab?.id, d.lab_id, d.lab?.id);
}

/** Office customer id only — never the lab id. Used for `GET /v1/slip/office/{id}/doctors`. */
export function resolveOfficeIdFromSlipDetails(details: unknown): number | null {
  if (!details || typeof details !== "object") return null;
  const d = details as {
    case?: { office_id?: unknown; office?: { id?: unknown } };
    office_id?: unknown;
    office?: { id?: unknown };
  };
  return firstPositiveId(
    d.case?.office_id,
    d.case?.office?.id,
    d.office_id,
    d.office?.id
  );
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
      doctor?: {
        id?: number
        name?: string
        image?: string
        profile_image?: string
        avatar?: string
        signature_url?: string
      };
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
