import { buildApiUrl } from "@/lib/api/client";

export type NewStageEligibilityStageRef = {
  slip_id: number;
  slip_number: string;
  stage_id: number;
  stage_name: string;
  stage_sequence: number;
  is_releasing_stage: "Yes" | "No" | string;
  completed_on?: string | null;
  due_date?: string | null;
  due_time?: string | null;
};

export type NewStageEligibilityProduct = {
  slip_product_id?: number;
  product_id: number;
  type: "Upper" | "Lower" | string;
  eligible: boolean;
  reason: string | null;
  last_stage: NewStageEligibilityStageRef | null;
  stage_history: NewStageEligibilityStageRef[];
  proposed_stage?: {
    valid: boolean;
    message: string | null;
    stage_id?: number;
    sequence?: number;
  } | null;
};

export type NewStageEligibilityData = {
  eligible: boolean;
  message: string;
  reasons: string[];
  case_id?: number;
  case_status?: string;
  slip_id?: number;
  slip_status?: string;
  has_stage_successor?: boolean;
  products: NewStageEligibilityProduct[];
};

export type NewStageEligibilityResponse = {
  success: boolean;
  message?: string;
  data: NewStageEligibilityData;
};

export type NewStageEligibilityQuery = {
  product_id?: number;
  proposed_stage_id?: number;
};

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchNewStageEligibility(
  slipId: number,
  query?: NewStageEligibilityQuery
): Promise<NewStageEligibilityResponse> {
  const url = new URL(buildApiUrl(`/slip/${slipId}/new-stage-eligibility`));
  if (query?.product_id != null) {
    url.searchParams.set("product_id", String(query.product_id));
  }
  if (query?.proposed_stage_id != null) {
    url.searchParams.set("proposed_stage_id", String(query.proposed_stage_id));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders(),
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
    data: { eligible: false, message: "", reasons: [], products: [] },
  }))) as NewStageEligibilityResponse;

  if (!res.ok && !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}
