/**
 * Slip Custom Delivery Date API — create and list read-only delivery date log entries.
 */

import { buildApiUrl } from "@/lib/api/client";

export type CustomDeliveryDateCreatedBy = {
  id: number;
  name: string;
  email?: string;
};

export type CustomDeliveryDateEntry = {
  id: number;
  slip_id: number;
  delivery_date: string;
  delivery_time: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  formatted_delivery_date?: string;
  formatted_delivery_time?: string;
  full_delivery_datetime?: string;
  is_upcoming?: boolean;
  is_past?: boolean;
  is_today?: boolean;
  created_by: CustomDeliveryDateCreatedBy;
};

export type CreateCustomDeliveryDatePayload = {
  delivery_date: string;
  delivery_time: string;
  notes?: string;
};

export type SlipCustomDeliveryDateListResponse = {
  success: boolean;
  message?: string;
  data?: CustomDeliveryDateEntry[];
  pagination?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
};

export type CreateCustomDeliveryDateResponse = {
  success: boolean;
  message?: string;
  data?: CustomDeliveryDateEntry;
  errors?: Record<string, string[]>;
};

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function redirectUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/** Normalize API time (`14:30:00`, ISO, or `5:00 PM`) to `HH:MM` for `<input type="time">`. */
export function normalizeDeliveryTimeForInput(raw: string | null | undefined): string {
  if (!raw) return "17:00";
  const trimmed = raw.trim();
  const hms = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (hms) {
    return `${hms[1].padStart(2, "0")}:${hms[2]}`;
  }
  const iso = /T(\d{2}):(\d{2})/.exec(trimmed);
  if (iso) {
    return `${iso[1]}:${iso[2]}`;
  }
  const twelve = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (twelve) {
    let h = parseInt(twelve[1], 10);
    const m = twelve[2];
    const pm = twelve[3].toUpperCase() === "PM";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return "17:00";
}

export async function getSlipCustomDeliveryDates(
  slipId: number,
  params?: {
    date_from?: string;
    date_to?: string;
    created_by?: number;
    status?: "upcoming" | "past" | "today";
    per_page?: number;
  }
): Promise<SlipCustomDeliveryDateListResponse> {
  const qs = new URLSearchParams();
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.created_by != null) qs.set("created_by", String(params.created_by));
  if (params?.status) qs.set("status", params.status);
  if (params?.per_page != null) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(
    buildApiUrl(`/slip/custom-delivery-dates/${slipId}${query}`),
    { method: "GET", headers: getAuthHeaders() }
  );

  if (res.status === 401) {
    redirectUnauthorized();
    throw new Error("Unauthorized");
  }

  const json: SlipCustomDeliveryDateListResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}

export async function createSlipCustomDeliveryDate(
  slipId: number,
  payload: CreateCustomDeliveryDatePayload
): Promise<CreateCustomDeliveryDateResponse> {
  const res = await fetch(
    buildApiUrl(`/slip/custom-delivery-dates/${slipId}/create`),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        delivery_date: payload.delivery_date,
        delivery_time: payload.delivery_time,
        notes: payload.notes ?? "",
      }),
    }
  );

  if (res.status === 401) {
    redirectUnauthorized();
    throw new Error("Unauthorized");
  }

  const json: CreateCustomDeliveryDateResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok || !json.success) {
    const detail =
      json.errors && Object.values(json.errors).flat().join(" ");
    throw new Error(detail || json.message || `Request failed (${res.status})`);
  }

  return json;
}
