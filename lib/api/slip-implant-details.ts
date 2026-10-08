import { buildApiUrl } from "@/lib/api/client";

export type CompleteSlipImplantDetail = {
  id?: number | null;
  tooth_number: number;
  implant_id: number;
  implant_platform_id?: number;
  implant_platform_size_id?: number;
  custom_size?: string;
};

export type CompleteSlipAbutmentDetail = {
  id?: number | null;
  tooth_number: number;
  abutment_type_id: number;
  abutment_option_id?: number;
};

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** PUT /slip/{slipId}/implant-details — lab fills implant rows that requested a recommendation. */
export async function putSlipImplantDetails(
  slipId: number,
  payload: {
    implant_details: CompleteSlipImplantDetail[];
    abutment_details?: CompleteSlipAbutmentDetail[];
  }
): Promise<void> {
  const res = await fetch(buildApiUrl(`/slip/${slipId}/implant-details`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { message?: string }).message || "Failed to save implant details"
    );
  }
}
