import { PaperSlipPrintV2PageShell } from "@/components/paper-slip-print/paper-slip-print-v2-page-shell";
import { isPaperSlipV2HtmlPreviewEnabled } from "@/lib/paper-slip-v2-html-preview";
import { resolvePaperSlipPrintV2Request } from "./page-helpers";

export default function PaperSlipPrintV2Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams ?? {};
  const request = resolvePaperSlipPrintV2Request(params);
  // HTML on-screen review: env flag OR `?view=1` / `?preview=1` (no print dialog).
  const viewOnly =
    isPaperSlipV2HtmlPreviewEnabled() ||
    params.view != null ||
    params.preview != null;

  return (
    <PaperSlipPrintV2PageShell
      error={request.error}
      caseIds={request.caseIds}
      layout={request.layout}
      slipIds={request.slipIds}
      viewOnly={viewOnly}
    />
  );
}
