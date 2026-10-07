/**
 * POST /slip/action/{slipId}/ready-to-send
 * Path is relative to NEXT_PUBLIC_API_BASE_URL (already includes /v1 when configured).
 * Same contract as app/lab-case-management/SlipContext.tsx `readyToSend`.
 */

import { buildApiUrl } from "@/lib/api/client";

export type ReadyToSendResponse = {
  success: boolean;
  message?: string;
};

export type ReadyToSendPayload = {
  signature?: string;
  image?: File | null;
  notes?: string;
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
 * Signature / photo follow lab slip settings:
 * - `require_signature_ready_to_send` → send `signature`
 * - `enable_photo_ready_to_send` → optional/required `image` file
 *
 * When an image is present the request is multipart; otherwise JSON (or empty).
 */
export async function postSlipReadyToSend(
  slipId: number,
  payload?: ReadyToSendPayload | string
): Promise<ReadyToSendResponse> {
  // Back-compat: older callers passed signature as a plain string.
  const normalized: ReadyToSendPayload =
    typeof payload === "string" ? { signature: payload } : payload ?? {};

  const trimmedSignature = normalized.signature?.trim();
  const image = normalized.image ?? null;
  const notes = normalized.notes?.trim();
  const hasImage = Boolean(image);
  const hasBody = Boolean(trimmedSignature) || hasImage || Boolean(notes);

  let requestInit: RequestInit;
  if (hasImage) {
    const form = new FormData();
    if (trimmedSignature) form.append("signature", trimmedSignature);
    if (notes) form.append("notes", notes);
    form.append("image", image as File);
    requestInit = {
      method: "POST",
      headers: getAuthHeaders(false),
      body: form,
    };
  } else if (hasBody) {
    requestInit = {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        ...(trimmedSignature ? { signature: trimmedSignature } : {}),
        ...(notes ? { notes } : {}),
      }),
    };
  } else {
    requestInit = {
      method: "POST",
      headers: getAuthHeaders(false),
    };
  }

  const res = await fetch(
    buildApiUrl(`/slip/action/${slipId}/ready-to-send`),
    requestInit
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
