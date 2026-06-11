import type { SlipCreationResponse } from "@/services/slip-creation-service";

function firstStr(...values: unknown[]): string {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/**
 * Maps virtual-slip / slip-details API payload into the shape PatientHeader expects
 * after case submission (slip number, case number, pan, dates, location).
 */
export function buildSlipResponseDataFromVirtualSlip(
  details: unknown
): SlipCreationResponse["data"] | null {
  if (!details || typeof details !== "object") return null;

  const safe = details as Record<string, unknown>;
  const caseObj = (safe.case ?? {}) as Record<string, unknown>;

  const location = safe.location as
    | { id?: number; name?: string; current?: { id?: number; name?: string } }
    | undefined;
  const casepan =
    (safe.casepan as
      | {
          id?: number;
          number?: string;
          name?: string;
          code?: string;
          color_code?: string;
          type?: string;
        }
      | undefined) ??
    (caseObj.casepan as
      | {
          id?: number;
          number?: string;
          name?: string;
          code?: string;
          color_code?: string;
          type?: string;
        }
      | undefined);
  const delivery = safe.delivery as
    | {
        delivery_date?: string | null;
        delivery_time?: string | null;
        pickup_date?: string | null;
        pickup_time?: string | null;
      }
    | undefined;

  const slipId = typeof safe.id === "number" ? safe.id : 0;
  const caseId = typeof caseObj.id === "number" ? caseObj.id : slipId;
  const locationId = location?.current?.id ?? location?.id;
  const locationName = firstStr(location?.current?.name, location?.name);

  const ageRaw = caseObj.age;
  const ageNum =
    typeof ageRaw === "number"
      ? ageRaw
      : ageRaw != null && String(ageRaw).trim() !== ""
        ? Number(ageRaw)
        : undefined;

  return {
    id: caseId,
    case_number: firstStr(caseObj.case_number),
    patient_name: firstStr(caseObj.patient_name),
    gender: firstStr(caseObj.gender),
    age: Number.isFinite(ageNum) ? ageNum : undefined,
    case_status: firstStr(safe.status, caseObj.case_status),
    created_at: firstStr(safe.created_at, caseObj.created_at),
    updated_at: firstStr(safe.updated_at, caseObj.updated_at),
    slips: [
      {
        id: slipId,
        slip_number: firstStr(safe.slip_number),
        status: firstStr(safe.status, caseObj.case_status),
        location:
          locationName && typeof locationId === "number"
            ? { id: locationId, name: locationName, is_active: true }
            : locationName
              ? { id: 0, name: locationName, is_active: true }
              : null,
        casepan: casepan?.number
          ? {
              id: casepan.id ?? 0,
              number: String(casepan.number),
              name: firstStr(casepan.name),
              code: firstStr(casepan.code),
              color_code: firstStr(casepan.color_code),
              type: firstStr(casepan.type),
            }
          : null,
        delivery: delivery
          ? {
              delivery_date: delivery.delivery_date ?? null,
              delivery_time: delivery.delivery_time ?? null,
              pickup_date: delivery.pickup_date ?? null,
              pickup_time: delivery.pickup_time ?? null,
            }
          : null,
      },
    ],
  };
}

export function resolveCreatedByFromVirtualSlip(details: unknown): {
  name: string | null;
  imageUrl: string | null;
} {
  if (!details || typeof details !== "object") {
    return { name: null, imageUrl: null };
  }
  const safe = details as Record<string, unknown>;
  const caseObj = (safe.case ?? {}) as Record<string, unknown>;
  const createdBy = (safe.created_by ?? caseObj.created_by) as
    | { name?: string; image?: string }
    | undefined;
  const name = firstStr(createdBy?.name) || null;
  const imageUrl = firstStr(createdBy?.image) || null;
  return { name, imageUrl };
}
