import { buildVirtualSlipVM, type VirtualSlipVM } from "@/lib/virtual-slip-view-model";

/**
 * Paper Slip v2 view model.
 *
 * Unlike lib/paper-slip-print-view-model.ts (which re-derives the tooth chart /
 * product content with its own, thinner logic), v2 reuses the authoritative
 * virtual-slip view model (buildVirtualSlipVM) for the whole body and only keeps
 * a handful of print-only "extras" that the virtual slip does not carry — most
 * importantly the QR code, which lives only on the paper-slip-print-data record.
 *
 * Data flow (see paper-slip-print-v2-page-shell.tsx):
 *   1. POST /slip/paper-slip-print-data  -> records (slip id + print extras + QR)
 *   2. GET  /v1/slip/slip/{id}/details   -> full slip details (per slip)
 *   3. buildPaperSlipPrintV2SlipVM(details, extras) merges the two.
 */

/** Print-only header fields sourced from the paper-slip-print-data record. */
export interface PaperSlipPrintV2Extras {
  slipId: number;
  /** QR code image URL — present only on the paper-slip-print-data record. */
  qrCodeUrl: string | null;
  labAddress: string;
  labCode: string;
  doctorLicenseNumber: string;
  labPhone: string;
  labEmail: string;
}

export interface PaperSlipPrintV2SlipVM {
  slipId: number;
  extras: PaperSlipPrintV2Extras;
  /** Authoritative body: identical to what /virtual-slip-v2/{id} renders. */
  vm: VirtualSlipVM;
}

export interface PaperSlipPrintV2SectionModel {
  key: string;
  slip: PaperSlipPrintV2SlipVM;
  pageBreakBefore: boolean;
}

function firstStr(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function nonEmptyUrl(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function joinAddress(parts: unknown[]): string {
  return parts
    .map((part) => firstStr(part))
    .filter(Boolean)
    .join(", ");
}

/**
 * Pull the print-only extras from a single paper-slip-print-data record.
 * Field paths mirror buildPaperSlipPrintSlipVM in lib/paper-slip-print-view-model.ts
 * so the header/footer render identically to v1.
 */
export function extractPaperSlipPrintV2Extras(record: any): PaperSlipPrintV2Extras {
  const caseData = record?.case ?? {};
  const lab = caseData?.lab ?? record?.lab ?? {};
  const doctor = caseData?.doctor ?? caseData?.doctor_details ?? record?.doctor ?? {};

  return {
    slipId: Number(record?.id ?? 0),
    qrCodeUrl: nonEmptyUrl(record?.qr_code_url),
    labAddress: joinAddress([lab?.address, lab?.city, lab?.state, lab?.postal_code]),
    labCode: firstStr(lab?.code, caseData?.lab_code),
    doctorLicenseNumber: firstStr(doctor?.license_number, doctor?.license_no),
    labPhone: firstStr(lab?.phone, lab?.phone_number),
    labEmail: firstStr(lab?.email),
  };
}

/** Merge slip details (body) with the print-only extras (QR + header bits). */
export function buildPaperSlipPrintV2SlipVM(
  details: any,
  extras: PaperSlipPrintV2Extras,
  options?: { defaultDeliveryTime?: string | null },
): PaperSlipPrintV2SlipVM {
  return {
    slipId: extras.slipId,
    extras,
    vm: buildVirtualSlipVM(details, {
      defaultDeliveryTime: options?.defaultDeliveryTime,
    }),
  };
}

export function buildPaperSlipPrintV2Sections(
  slips: PaperSlipPrintV2SlipVM[],
): PaperSlipPrintV2SectionModel[] {
  return slips.map((slip, index) => ({
    key: `${slip.slipId}-${slip.vm.header.slipNumber || index}`,
    slip,
    pageBreakBefore: index > 0,
  }));
}
