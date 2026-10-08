/**
 * POST /slip/action/{slipId}/undo-location — lab_admin / superadmin only.
 */

import { buildApiUrl } from "@/lib/api/client";

export type UndoLocationResponse = {
  success: boolean;
  message?: string;
  data?: {
    from_location_id: number;
    to_location_id: number;
    effects: string[];
  };
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

export async function postSlipUndoLocation(
  slipId: number,
  notes?: string
): Promise<UndoLocationResponse> {
  const trimmed = notes?.trim();
  const res = await fetch(buildApiUrl(`/slip/action/${slipId}/undo-location`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(trimmed ? { notes: trimmed } : {}),
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json: UndoLocationResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}
