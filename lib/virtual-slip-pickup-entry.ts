/**
 * Build a single pickup/dropoff row from slip details already loaded on virtual slip.
 * Avoids POST /slip/pickup-delivery-slips when opening pick up from virtual slip.
 */

export type PickupDeliveryEntry = {
  id: string;
  office: string;
  labName: string;
  patientName: string;
  location: string;
  isChecked: boolean;
  case_id?: number;
  slip_id?: number;
  case_number?: string;
  slip_number?: string;
  casepan_number?: string;
  location_id?: number;
  customer_code?: string;
  customer_id?: number;
};

function firstStr(...values: unknown[]): string {
  for (const v of values) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function firstNum(...values: unknown[]): number | undefined {
  for (const v of values) {
    const n = typeof v === "number" ? v : Number(v);
    if (typeof n === "number" && !Number.isNaN(n) && n > 0) return n;
  }
  return undefined;
}

/** Map virtual slip details (or listing row) to one pre-checked delivery entry. */
export function buildPickupDeliveryEntryFromSlip(slip: unknown): PickupDeliveryEntry | null {
  if (slip == null) return null;

  const raw = typeof slip === "number" ? { id: slip, slip_id: slip } : (slip as Record<string, unknown>);
  const slipId = firstNum(raw.slip_id, raw.id);
  if (!slipId) return null;

  const caseObj = (raw.case as Record<string, unknown> | undefined) ?? {};
  const office = (caseObj.office as Record<string, unknown> | undefined) ?? (raw.office as Record<string, unknown> | undefined);
  const lab = (caseObj.lab as Record<string, unknown> | undefined) ?? (raw.lab as Record<string, unknown> | undefined);
  const locationObj = (raw.location as Record<string, unknown> | undefined) ?? {};
  const locationCurrent = (locationObj.current as Record<string, unknown> | undefined) ?? {};

  const locationName = firstStr(
    locationCurrent.name,
    locationObj.name,
    raw.location,
    raw.current_driver_location
  );

  const locationId = firstNum(
    locationCurrent.id,
    locationObj.id,
    raw.location_id,
    raw.locationId
  );

  // Office: prefer an office code, then the office name. The flat pickup response
  // can carry the lab's code in customer_code, so it must never take priority over
  // the real office fields — it is only an absolute last resort for display.
  const officeCode = firstStr(
    raw.office_code,
    office?.code,
    office?.customer_code,
    caseObj.office_code
  );
  const officeName = firstStr(
    raw.office_name,
    office?.name,
    caseObj.office_name
  );
  const officeDisplay = firstStr(
    officeCode,
    officeName,
    raw.customer_code,
    caseObj.customer_code
  );

  const customerId = firstNum(raw.customer_id, office?.id, caseObj.customer_id);

  // Lab: prefer a code, fall back to the full name.
  const labName = firstStr(
    raw.lab_code,
    lab?.code,
    raw.lab_name,
    lab?.name,
    caseObj.lab_name
  );

  return {
    id: `virtual-slip-${slipId}`,
    office: officeDisplay,
    labName,
    patientName: firstStr(raw.patient_name, raw.patient, caseObj.patient_name),
    location: locationName,
    isChecked: true,
    case_id: firstNum(raw.case_id, caseObj.id, caseObj.case_id),
    slip_id: slipId,
    case_number: firstStr(raw.case_number, caseObj.case_number),
    slip_number: firstStr(raw.slip_number, raw.slipNumber),
    casepan_number: firstStr(
      raw.casepan_number,
      (raw.casepan as Record<string, unknown> | undefined)?.number,
      (caseObj.casepan as Record<string, unknown> | undefined)?.number
    ),
    location_id: locationId,
    customer_code: officeCode || undefined,
    customer_id: customerId,
  };
}
