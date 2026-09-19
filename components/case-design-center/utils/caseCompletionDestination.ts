import type { SlipCreationResponse } from "@/services/slip-creation-service";

export type CaseSubmissionState = "idle" | "submitting" | "success-transition" | "error";

export interface CaseSubmissionResult {
  slipId: number;
  caseId?: number;
  caseNumber?: string;
  rawResponse: SlipCreationResponse["data"];
}

export function resolveCaseSubmissionResult(
  response: SlipCreationResponse | SlipCreationResponse["data"] | null | undefined,
): CaseSubmissionResult {
  const data = isWrappedResponse(response) ? response.data : response;

  const hasSlips = Array.isArray(data?.slips) && data.slips.length > 0;
  const slipId = data?.slips?.[0]?.id ?? (hasSlips ? 0 : data?.id ?? 0);
  if (!slipId) {
    throw new Error("Unable to resolve created slip id from submission response.");
  }

  const caseId =
    hasSlips && typeof data?.id === "number" && data.id > 0 ? data.id : undefined;

  return {
    slipId,
    caseId,
    caseNumber: data?.case_number ?? undefined,
    rawResponse: data ?? undefined,
  };
}

export function resolveVirtualSlipPath(
  result: Pick<CaseSubmissionResult, "slipId" | "caseId">,
): string {
  if (!result.slipId) {
    throw new Error("Unable to resolve virtual slip path without a slip id.");
  }

  if (result.caseId != null && result.caseId > 0) {
    return `/virtual-slip/${result.caseId}/${result.slipId}`;
  }

  return `/virtual-slip-v2/${result.slipId}`;
}

function isWrappedResponse(
  response: SlipCreationResponse | SlipCreationResponse["data"] | null | undefined,
): response is SlipCreationResponse {
  return Boolean(response && typeof response === "object" && "success" in response);
}
