import { parseCaseIdsParam, parseSlipIdsParam } from "@/app/paper-slip/print/page-helpers";
import {
  isPaperSlipPrintLayout,
  type PaperSlipPrintLayout,
} from "@/lib/paper-slip-print-layout";

type SearchParamValue = string | string[] | undefined;

export interface PaperSlipPrintV2Request {
  slipIds: number[];
  caseIds: number[];
  layout: PaperSlipPrintLayout;
  error: string | null;
}

function firstParam(value: SearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Parse slip_ids / case_ids from the query string. Unlike v1 there is no
 *  serialized `data` payload — v2 always fetches fresh from the two APIs. */
export function resolvePaperSlipPrintV2Request(
  searchParams: Record<string, SearchParamValue>,
): PaperSlipPrintV2Request {
  const slipIds = parseSlipIdsParam(searchParams.slip_ids ?? searchParams.slips);
  const caseIds = parseCaseIdsParam(searchParams.case_ids ?? searchParams.cases);
  const layoutRaw = firstParam(searchParams.layout).trim().toLowerCase();
  const layout: PaperSlipPrintLayout = isPaperSlipPrintLayout(layoutRaw) ? layoutRaw : "full";

  if (slipIds.length === 0 && caseIds.length === 0) {
    return {
      slipIds: [],
      caseIds: [],
      layout,
      error: "No slip or case IDs were provided for paper slip printing.",
    };
  }

  return { slipIds, caseIds, layout, error: null };
}
