/**
 * Slip Driver History API — GET history, POST change-location.
 * @see Slip Driver History API documentation
 */

import { buildApiUrl } from "@/lib/api/client";

export type SlipDriverHistoryLocation = {
  id: number;
  name: string;
  description?: string;
};

export type SlipDriverHistoryDriver = {
  id: number;
  name: string;
  email?: string;
};

/** Nested history row (documented API shape). */
export type SlipDriverHistoryEntry = {
  id: number;
  slip_id: number;
  from_location: SlipDriverHistoryLocation;
  to_location: SlipDriverHistoryLocation;
  action_date_time: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  driver?: SlipDriverHistoryDriver;
  driver_id?: number;
  driver_name?: string;
  location_transition?: string;
  /** First linked pickup/drop photo URL (or null). */
  image_url?: string | null;
  /** Full list of files linked to this history entry. */
  attachments?: Array<{
    id?: number;
    slip_id?: number;
    slip_driver_history_id?: number | null;
    file_name?: string;
    file_path?: string;
  }>;
};

/** Flat history row returned by GET /slip/driver-history/slip/{id} in production. */
export type SlipDriverHistoryRecord = SlipDriverHistoryEntry & {
  slip_number?: string;
  case_id?: number;
  case_number?: string;
  patient_name?: string;
  case_status?: string;
  office_id?: number;
  office_name?: string;
  office_code?: string;
  doctor_id?: number;
  doctor_name?: string;
  stage_name?: string;
  stage_code?: string;
  product_name?: string;
  final_delivery_dates?: {
    is_rush?: boolean;
    formatted_delivery_date?: string;
    formatted_delivery_time?: string;
  };
};

export type SlipDriverHistorySlip = {
  id: number;
  slip_number: string;
  current_location: SlipDriverHistoryLocation;
};

export type GetSlipDriverHistoryResponse = {
  success: boolean;
  message?: string;
  data?:
    | SlipDriverHistoryRecord[]
    | {
        slip: SlipDriverHistorySlip;
        driver_history: SlipDriverHistoryEntry[];
      };
};

export type NormalizedSlipDriverHistory = {
  slipId: number;
  slipNumber: string;
  currentLocation: string;
  officeName?: string;
  officeCode?: string;
  patientName?: string;
  caseNumber?: string;
  stageName?: string;
  deliveryDateLabel?: string;
  isRush?: boolean;
  timeline: Array<{
    timestamp: string;
    location: string;
    user: string;
    receiver: string;
    imageUrl: string | null;
  }>;
};

function formatHistoryTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timelineLocation(entry: SlipDriverHistoryEntry): string {
  // Show only the originating location (the part before the arrow), not the
  // full "A → B" transition.
  if (entry.from_location?.name?.trim()) return entry.from_location.name.trim();
  if (entry.location_transition?.trim()) {
    return entry.location_transition.split(/→|->/)[0].trim();
  }
  return entry.to_location?.name?.trim() || "—";
}

function receiverFromNotes(notes?: string | null): string {
  const text = notes?.trim();
  if (!text) return "—";
  const m = text.match(/^signature:\s*(.+)$/i);
  return m ? m[1].trim() : text;
}

function deliveryLabel(dates?: SlipDriverHistoryRecord["final_delivery_dates"]): string | undefined {
  if (!dates) return undefined;
  const date = dates.formatted_delivery_date?.trim();
  const time = dates.formatted_delivery_time?.trim();
  if (date && time) return `${date} @ ${time}`;
  return date || time;
}

export function mapTimelineRow(entry: SlipDriverHistoryEntry) {
  return {
    timestamp: formatHistoryTimestamp(entry.action_date_time),
    location: timelineLocation(entry),
    user: entry.driver_name ?? entry.driver?.name ?? "—",
    receiver: receiverFromNotes(entry.notes),
    imageUrl: entry.image_url ?? entry.attachments?.[0]?.file_path ?? null,
  };
}

/** Supports flat `data[]` (production) and nested `{ slip, driver_history }` (docs). */
export function normalizeSlipDriverHistoryPayload(
  data: GetSlipDriverHistoryResponse["data"],
  fallbackSlipId?: number
): NormalizedSlipDriverHistory | null {
  if (data == null) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return {
        slipId: fallbackSlipId ?? 0,
        slipNumber: "—",
        currentLocation: "—",
        timeline: [],
      };
    }

    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.action_date_time).getTime() - new Date(b.action_date_time).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const meta = data[0];

    return {
      slipId: meta.slip_id ?? fallbackSlipId ?? 0,
      slipNumber: meta.slip_number ?? "—",
      currentLocation: latest.to_location?.name ?? "—",
      officeName: meta.office_name,
      officeCode: meta.office_code,
      patientName: meta.patient_name,
      caseNumber: meta.case_number,
      stageName: meta.stage_name,
      deliveryDateLabel: deliveryLabel(meta.final_delivery_dates),
      isRush: meta.final_delivery_dates?.is_rush,
      timeline: sorted.map(mapTimelineRow),
    };
  }

  const slip = data.slip;
  const history = data.driver_history ?? [];
  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.action_date_time).getTime() - new Date(b.action_date_time).getTime()
  );
  const latest = sorted[sorted.length - 1];

  return {
    slipId: slip?.id ?? fallbackSlipId ?? 0,
    slipNumber: slip?.slip_number ?? "—",
    currentLocation: slip?.current_location?.name ?? latest?.to_location?.name ?? "—",
    timeline: sorted.map(mapTimelineRow),
  };
}

export type ChangeLocationRequest = {
  slip_ids: number[];
  to_location_id: number;
  action_date_time?: string;
  notes?: string;
  /**
   * Optional drop-off proof photos keyed by slip id. When present the request
   * is sent as multipart/form-data with each file under `images[{slip_id}]`
   * (one image per slip; jpeg/jpg/png/gif/webp, max 10MB).
   */
  images?: Record<number, File>;
};

export type ChangeLocationProcessedSlip = {
  slip_id: number;
  slip_number?: string;
  previous_location?: SlipDriverHistoryLocation;
  new_location?: SlipDriverHistoryLocation;
  location_history_id?: number;
  action_date_time?: string;
  driver?: SlipDriverHistoryDriver;
  status?: string;
};

export type ChangeLocationResponse = {
  success: boolean;
  message?: string;
  data?: {
    processed_slips?: ChangeLocationProcessedSlip[];
    total_processed?: number;
    total_requested?: number;
    errors?: string[];
  };
  errors?: string[];
};

function getAuthHeaders(includeJsonContentType = true): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    // Omit Content-Type for multipart so the browser sets the boundary.
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleUnauthorized(res: Response): Promise<void> {
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
}

export async function getSlipDriverHistory(
  slipId: number
): Promise<GetSlipDriverHistoryResponse> {
  const res = await fetch(buildApiUrl(`/slip/driver-history/slip/${slipId}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  await handleUnauthorized(res);

  const json: GetSlipDriverHistoryResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok && !json.success) {
    return {
      success: false,
      message: json.message || `Request failed (${res.status})`,
    };
  }

  return json;
}

/* -------------------- Case-level driver history -------------------- */

export type CaseDriverHistorySlip = {
  id: number;
  slip_number: string;
  current_location: SlipDriverHistoryLocation;
  driver_history: SlipDriverHistoryEntry[];
};

export type GetCaseDriverHistoryResponse = {
  success: boolean;
  message?: string;
  data?: {
    case: { id: number; case_number: string; patient_name: string };
    summary: { total_history_count: number; slip_count: number };
    all_driver_history: (SlipDriverHistoryEntry & { slip_number?: string; slip_status?: string })[];
    slips: CaseDriverHistorySlip[];
  };
};

export async function getCaseDriverHistory(
  caseId: number
): Promise<GetCaseDriverHistoryResponse> {
  const res = await fetch(buildApiUrl(`/slip/case/${caseId}/driver-history`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  await handleUnauthorized(res);

  const json: GetCaseDriverHistoryResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok && !json.success) {
    return {
      success: false,
      message: json.message || `Request failed (${res.status})`,
    };
  }

  return json;
}

export async function postSlipDriverHistoryChangeLocation(
  body: ChangeLocationRequest
): Promise<ChangeLocationResponse> {
  const imageEntries = body.images ? Object.entries(body.images) : [];
  const hasImages = imageEntries.length > 0;

  let requestInit: RequestInit;
  if (hasImages) {
    // multipart/form-data — required to attach photo files (images[{slip_id}]).
    const form = new FormData();
    body.slip_ids.forEach((id) => form.append("slip_ids[]", String(id)));
    form.append("to_location_id", String(body.to_location_id));
    if (body.action_date_time) form.append("action_date_time", body.action_date_time);
    if (body.notes) form.append("notes", body.notes);
    for (const [slipId, file] of imageEntries) {
      form.append(`images[${slipId}]`, file);
    }
    requestInit = { method: "POST", headers: getAuthHeaders(false), body: form };
  } else {
    const { images: _images, ...jsonBody } = body;
    requestInit = {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(jsonBody),
    };
  }

  const res = await fetch(
    buildApiUrl("/slip/driver-history/change-location"),
    requestInit
  );

  await handleUnauthorized(res);

  const json: ChangeLocationResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok && !json.success) {
    const errList = json.errors ?? json.data?.errors;
    const detail =
      Array.isArray(errList) && errList.length > 0
        ? errList.join("; ")
        : json.message;
    return {
      success: false,
      message: detail || `Request failed (${res.status})`,
      errors: errList,
    };
  }

  return json;
}
