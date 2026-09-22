import { apiClient } from "@/lib/api/client";
import { resolveVirtualSlipCaseId } from "@/lib/virtual-slip-case-id";

export type SlipQrIdentifyResult = {
  caseId: number;
  slipId: number;
  locationId?: number;
  location: string;
  patientName: string;
  slipNumber: string;
  officeLabel: string;
  status: string;
};

function firstStr(...values: unknown[]): string {
  for (const v of values) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function unwrapDetailsPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    return root.data as Record<string, unknown>;
  }
  return root;
}

/**
 * Lightweight identify for QR chooser — reads slip details without creating a
 * driver session or changing location.
 */
export async function fetchSlipQrIdentify(
  slipId: number,
  fallbackCaseId?: number,
): Promise<SlipQrIdentifyResult> {
  const { data } = await apiClient.get<unknown>(`/slip/slip/${slipId}/details`);
  const details = unwrapDetailsPayload(data) ?? {};
  const caseObj =
    details.case && typeof details.case === "object"
      ? (details.case as Record<string, unknown>)
      : {};
  const locationObj =
    details.location && typeof details.location === "object"
      ? (details.location as Record<string, unknown>)
      : {};
  const locationCurrent =
    locationObj.current && typeof locationObj.current === "object"
      ? (locationObj.current as Record<string, unknown>)
      : null;

  const resolvedCaseId =
    resolveVirtualSlipCaseId(details) ??
    (typeof fallbackCaseId === "number" && fallbackCaseId > 0 ? fallbackCaseId : null);

  if (!resolvedCaseId) {
    throw new Error("Could not resolve case for this slip QR code.");
  }

  const locationIdRaw =
    locationCurrent?.id ?? locationObj.id ?? details.location_id;
  const locationId =
    typeof locationIdRaw === "number"
      ? locationIdRaw
      : Number(locationIdRaw);
  const office =
    caseObj.office && typeof caseObj.office === "object"
      ? (caseObj.office as Record<string, unknown>)
      : {};

  return {
    caseId: resolvedCaseId,
    slipId,
    locationId: Number.isFinite(locationId) && locationId > 0 ? locationId : undefined,
    location: firstStr(
      locationCurrent?.name,
      locationObj.name,
      details.location_name,
    ),
    patientName: firstStr(caseObj.patient_name, details.patient_name),
    slipNumber: firstStr(details.slip_number, details.number),
    officeLabel: firstStr(office.code, office.name),
    status: firstStr(caseObj.case_status, details.status),
  };
}
