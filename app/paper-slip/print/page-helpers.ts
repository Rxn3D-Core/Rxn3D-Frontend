import type { PaperSlipPrintableSlipVM } from "@/lib/paper-slip-print-view-model";

export interface PaperSlipPrintSectionModel {
  key: string;
  slip: PaperSlipPrintableSlipVM;
  pageBreakBefore: boolean;
}

export interface PaperSlipPrintRequest {
  slipIds: number[];
  caseIds: number[];
  initialSlips: PaperSlipPrintableSlipVM[];
  error: string | null;
}

type SearchParamValue = string | string[] | undefined;

function dedupeNumbers(values: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const value of values) {
    if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function parseJsonPayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeSerializedPayload(raw: string): unknown {
  try {
    const decodedUri = parseJsonPayload(decodeURIComponent(raw));
    if (decodedUri !== null) return decodedUri;
  } catch {
    // Fall through to base64 parsing.
  }

  try {
    const decodedBase64 = Buffer.from(raw, "base64").toString("utf8");
    return parseJsonPayload(decodedBase64);
  } catch {
    return null;
  }
}

function isPaperSlipVmArray(value: unknown): value is PaperSlipPrintableSlipVM[] {
  if (!Array.isArray(value)) return false;

  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const slip = entry as Partial<PaperSlipPrintableSlipVM>;
    return Number.isInteger(slip.slipId) && typeof slip.slipNumber === "string" && typeof slip.caseNumber === "string";
  });
}

function parseIdsParam(value: SearchParamValue): number[] {
  const entries = Array.isArray(value) ? value : value ? [value] : [];

  return dedupeNumbers(
    entries.flatMap((entry) =>
      String(entry)
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10)),
    ),
  );
}

export function parseSlipIdsParam(value: SearchParamValue): number[] {
  return parseIdsParam(value);
}

export function parseCaseIdsParam(value: SearchParamValue): number[] {
  return parseIdsParam(value);
}

export function buildPaperSlipSectionModels(slips: PaperSlipPrintableSlipVM[]): PaperSlipPrintSectionModel[] {
  return slips.map((slip, index) => ({
    key: `${slip.slipId}-${slip.slipNumber || index}`,
    slip,
    pageBreakBefore: index > 0,
  }));
}

export function resolvePaperSlipPrintRequest(searchParams: Record<string, SearchParamValue>): PaperSlipPrintRequest {
  const slipIds = parseSlipIdsParam(searchParams.slip_ids ?? searchParams.slips);
  const caseIds = parseCaseIdsParam(searchParams.case_ids ?? searchParams.cases);

  if (slipIds.length === 0 && caseIds.length === 0) {
    return {
      slipIds: [],
      caseIds: [],
      initialSlips: [],
      error: "No slip or case IDs were provided for paper slip printing.",
    };
  }

  const rawData = searchParams.data;
  if (!rawData) {
    return {
      slipIds,
      caseIds,
      initialSlips: [],
      error: null,
    };
  }

  const serialized = Array.isArray(rawData) ? rawData[0] : rawData;
  const decoded = decodeSerializedPayload(serialized);

  if (!isPaperSlipVmArray(decoded)) {
    return {
      slipIds,
      caseIds,
      initialSlips: [],
      error: "Paper slip data could not be decoded for printing.",
    };
  }

  return {
    slipIds,
    caseIds,
    initialSlips: decoded,
    error: null,
  };
}
