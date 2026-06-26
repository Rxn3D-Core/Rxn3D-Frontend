import { PaperSlipPrintPageShell } from "@/components/paper-slip-print/paper-slip-print-page-shell";
import { resolvePaperSlipPrintRequest } from "./page-helpers";

export default function PaperSlipPrintPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const request = resolvePaperSlipPrintRequest(searchParams ?? {});

  return (
    <PaperSlipPrintPageShell
      error={request.error}
      caseIds={request.caseIds}
      initialSlips={request.initialSlips}
      slipIds={request.slipIds}
    />
  );
}
