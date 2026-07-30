import { parseCaseIdsParam, parseSlipIdsParam } from "@/app/paper-slip/print/page-helpers";

type SearchParamValue = string | string[] | undefined;

export interface PaperSlipPrintV2Request {
  slipIds: number[];
  caseIds: number[];
  error: string | null;
}

/** Parse slip_ids / case_ids from the query string. Unlike v1 there is no
 *  serialized `data` payload — v2 always fetches fresh from the two APIs. */
export function resolvePaperSlipPrintV2Request(
  searchParams: Record<string, SearchParamValue>,
): PaperSlipPrintV2Request {
  const slipIds = parseSlipIdsParam(searchParams.slip_ids ?? searchParams.slips);
  const caseIds = parseCaseIdsParam(searchParams.case_ids ?? searchParams.cases);

  if (slipIds.length === 0 && caseIds.length === 0) {
    return {
      slipIds: [],
      caseIds: [],
      error: "No slip or case IDs were provided for paper slip printing.",
    };
  }

  return { slipIds, caseIds, error: null };
}
