/**
 * When true, paper-slip v2 renders as an on-screen HTML page instead of
 * opening the browser print dialog. Toggle via frontend `.env` and restart Next.
 */
export function isPaperSlipV2HtmlPreviewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAPER_SLIP_V2_HTML_PREVIEW === "true";
}
