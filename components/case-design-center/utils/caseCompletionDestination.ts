import type { SlipCreationResponse } from "@/services/slip-creation-service";

export type CaseSubmissionState = "idle" | "submitting" | "success-transition" | "error";

export interface CaseSubmissionResult {
  slipId: number;
  caseNumber?: string;
  rawResponse: SlipCreationResponse["data"];
}

export function resolveCaseSubmissionResult(
  response: SlipCreationResponse | SlipCreationResponse["data"] | null | undefined,
): CaseSubmissionResult {
  const data = isWrappedResponse(response) ? response.data : response;

  const slipId = data?.slips?.[0]?.id ?? data?.id ?? 0;
  if (!slipId) {
    throw new Error("Unable to resolve created slip id from submission response.");
  }

  return {
    slipId,
    caseNumber: data?.case_number ?? undefined,
    rawResponse: data ?? undefined,
  };
}

export function resolveVirtualSlipPath(result: Pick<CaseSubmissionResult, "slipId">): string {
  if (!result.slipId) {
    throw new Error("Unable to resolve virtual slip path without a slip id.");
  }

  return `/virtual-slip/${result.slipId}`;
}

function isWrappedResponse(
  response: SlipCreationResponse | SlipCreationResponse["data"] | null | undefined,
): response is SlipCreationResponse {
  return Boolean(response && typeof response === "object" && "success" in response);
}
