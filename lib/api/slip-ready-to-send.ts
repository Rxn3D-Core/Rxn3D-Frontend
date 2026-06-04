/**
 * POST /slip/action/{slipId}/ready-to-send — no body.
 * Path is relative to NEXT_PUBLIC_API_BASE_URL (already includes /v1 when configured).
 * Same contract as app/lab-case-management/SlipContext.tsx `readyToSend`.
 */

import { buildApiUrl } from "@/lib/api/client";

export type ReadyToSendResponse = {
  success: boolean;
  message?: string;
};

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function postSlipReadyToSend(
  slipId: number
): Promise<ReadyToSendResponse> {
  const res = await fetch(
    buildApiUrl(`/slip/action/${slipId}/ready-to-send`),
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json: ReadyToSendResponse = await res.json().catch(() => ({
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
