/**
 * Slip case status actions — hold, resume, cancel, soft-delete.
 * Paths are relative to NEXT_PUBLIC_API_BASE_URL (already includes /v1 when configured).
 *
 * Scope: case (whole slip) or arch (Upper / Lower only).
 */

import { buildApiUrl } from "@/lib/api/client";

export type SlipActionScope = "case" | "arch";
export type SlipArchType = "Upper" | "Lower";

export type SlipCaseActionOptions = {
  scope?: SlipActionScope;
  arch?: SlipArchType;
};

export type SlipCaseActionResponse = {
  success: boolean;
  message?: string;
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

function buildActionBody(reason: string, options?: SlipCaseActionOptions) {
  const body: Record<string, string> = { reason };
  const scope = options?.scope ?? "case";
  body.scope = scope;
  if (scope === "arch") {
    if (!options?.arch) {
      throw new Error("arch is required when scope is arch");
    }
    body.arch = options.arch;
  }
  return body;
}

async function postSlipCaseAction(
  slipId: number,
  action: "hold" | "resume" | "cancel" | "soft-delete" | "restore",
  reason: string,
  options?: SlipCaseActionOptions
): Promise<SlipCaseActionResponse> {
  const res = await fetch(buildApiUrl(`/slip/action/${slipId}/${action}`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(
      action === "restore"
        ? { reason }
        : buildActionBody(reason, options)
    ),
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json: SlipCaseActionResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}

export function postSlipHold(
  slipId: number,
  reason: string,
  options?: SlipCaseActionOptions
) {
  return postSlipCaseAction(slipId, "hold", reason, options);
}

export function postSlipResume(
  slipId: number,
  reason: string,
  options?: SlipCaseActionOptions
) {
  return postSlipCaseAction(slipId, "resume", reason, options);
}

export function postSlipCancel(
  slipId: number,
  reason: string,
  options?: SlipCaseActionOptions
) {
  return postSlipCaseAction(slipId, "cancel", reason, options);
}

export function postSlipSoftDelete(
  slipId: number,
  reason: string,
  options?: SlipCaseActionOptions
) {
  return postSlipCaseAction(slipId, "soft-delete", reason, options);
}

export function postSlipRestore(slipId: number, reason: string = "Restored to In Progress") {
  return postSlipCaseAction(slipId, "restore", reason);
}

/**
 * POST /slip/action/{slipId}/send-back-to-office — lab returns slip to office workflow.
 */
export async function postSlipSendBackToOffice(
  slipId: number,
  reason: string
): Promise<SlipCaseActionResponse> {
  const res = await fetch(
    buildApiUrl(`/slip/action/${slipId}/send-back-to-office`),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    }
  );

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json: SlipCaseActionResponse = await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}
