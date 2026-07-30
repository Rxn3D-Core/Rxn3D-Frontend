import { PaperSlipPrintV2PageShell } from "@/components/paper-slip-print/paper-slip-print-v2-page-shell";
import { resolvePaperSlipPrintV2Request } from "./page-helpers";

export default function PaperSlipPrintV2Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams ?? {};
  const request = resolvePaperSlipPrintV2Request(params);
  // `?view=1` (or `?preview=1`) renders the slip on-screen for review instead of
  // auto-printing — handy for QA without triggering the print dialog.
  const viewOnly = params.view != null || params.preview != null;

  return (
    <PaperSlipPrintV2PageShell
      error={request.error}
      caseIds={request.caseIds}
      slipIds={request.slipIds}
      viewOnly={viewOnly}
    />
  );
}
