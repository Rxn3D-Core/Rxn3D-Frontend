import { buildApiUrl } from "@/lib/api/client";
import type { SlipCreationNote, SlipCreationProduct } from "@/services/slip-creation-service";

export type AddStageToSlipPayload = {
  location_id?: number;
  status?: string;
  created_by?: number;
  products: SlipCreationProduct[];
  notes?: SlipCreationNote[];
};

export type AddStageToSlipResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
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

export async function postAddStageToSlip(
  sourceSlipId: number,
  payload: AddStageToSlipPayload
): Promise<AddStageToSlipResponse> {
  const res = await fetch(buildApiUrl(`/slip/${sourceSlipId}/add-stage`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json = (await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }))) as AddStageToSlipResponse;

  if (!res.ok && !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}
