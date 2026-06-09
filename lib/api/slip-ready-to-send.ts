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

function getAuthHeaders(includeJsonContentType: boolean): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Mark a slip ready to send.
 *
 * `signature` is the receiver/sender signature captured in the UI. The backend
 * does not accept a body yet, so it is forwarded as `{ notes }` and is a no-op
 * until the endpoint reads it. Rename the key here once the backend is ready.
 */
export async function postSlipReadyToSend(
  slipId: number,
  signature?: string
): Promise<ReadyToSendResponse> {
  const trimmedSignature = signature?.trim();
  const hasBody = Boolean(trimmedSignature);

  const res = await fetch(
    buildApiUrl(`/slip/action/${slipId}/ready-to-send`),
    {
      method: "POST",
      headers: getAuthHeaders(hasBody),
      ...(hasBody ? { body: JSON.stringify({ notes: trimmedSignature }) } : {}),
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
