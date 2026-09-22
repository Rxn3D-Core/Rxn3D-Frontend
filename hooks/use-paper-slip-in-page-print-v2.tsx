"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintV2PageShell } from "@/components/paper-slip-print/paper-slip-print-v2-page-shell";
import { PaperSlipPrintLayoutDialog } from "@/components/paper-slip-print/paper-slip-print-layout-dialog";
import { isPaperSlipV2HtmlPreviewEnabled } from "@/lib/paper-slip-v2-html-preview";
import {
  readStoredPaperSlipPrintLayout,
  storePaperSlipPrintLayout,
  type PaperSlipPrintLayout,
} from "@/lib/paper-slip-print-layout";

interface PrintJob {
  slipIds: number[];
  caseIds: number[];
  layout: PaperSlipPrintLayout;
}

interface PendingPrint {
  slipIds: number[];
  caseIds: number[];
}

const MOBILE_PRINT_ROOT_ID = "paper-slip-v2-mobile-print-root";
const HTML_PREVIEW_ROOT_ID = "paper-slip-v2-html-preview-root";

// width ≤1024 covers phones + tablets; avoids UA sniffing
function isMobileOrTablet(): boolean {
  return window.innerWidth <= 1024 || /android|ipad|iphone|ipod|mobile/i.test(navigator.userAgent);
}

// iOS Safari's iframe.contentWindow.print() prints the parent page, not the
// iframe content, so mount the slip on the current page and print the page
// itself, hiding everything else during print.
//
// Keep the mount invisible on screen so cancel/print doesn't leave a paper-slip
// preview under the virtual slip. Do not remove on afterprint — iOS fires that
// when the sheet re-renders (e.g. paper size); next print() replaces the node.
function cleanupMobilePrintRoot(): void {
  document.getElementById(MOBILE_PRINT_ROOT_ID)?.remove();
  document.getElementById(`${MOBILE_PRINT_ROOT_ID}-style`)?.remove();
}

function printHtmlInPlace(html: string): void {
  cleanupMobilePrintRoot();

  const style = document.createElement("style");
  style.id = `${MOBILE_PRINT_ROOT_ID}-style`;
  style.textContent = `
    /* Screen: never show the injected slip (cancel must restore the page). */
    #${MOBILE_PRINT_ROOT_ID} {
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      clip-path: inset(50%) !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        overflow: hidden !important;
        height: auto !important;
      }
      body > :not(#${MOBILE_PRINT_ROOT_ID}) { display: none !important; }
      #${MOBILE_PRINT_ROOT_ID} {
        display: block !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
        clip: auto !important;
        clip-path: none !important;
        pointer-events: auto !important;
        visibility: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = MOBILE_PRINT_ROOT_ID;
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = html;
  document.body.appendChild(root);

  window.print();
}

function printHtmlInIframe(html: string): void {
  const styleLinks = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"))
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join("");
  const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
    .map((s) => `<style>${s.textContent}</style>`)
    .join("");

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:none;z-index:99999;visibility:hidden;";
  document.body.appendChild(iframe);

  // Carry the app's next/font variable classes (e.g. `--font-inter`) onto the
  // iframe <html>; the copied @font-face + variable-class CSS then resolves so
  // Tailwind's `font-sans` renders in Inter (matching the virtual slip) instead
  // of the browser's default sans fallback.
  const rootClass = document.documentElement.className || "";

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html><html class="${rootClass}"><head><style>body{margin:0}</style>${styleLinks}${inlineStyles}</head><body class="font-sans">${html}</body></html>`);
  doc.close();

  iframe.onload = () => {
    iframe.style.visibility = "visible";
    const printAndCleanup = () => {
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 0);
    };
    // Wait for the iframe's fonts to be ready so the first (print) paint uses
    // Inter rather than the fallback face.
    const fonts = iframe.contentDocument?.fonts;
    if (fonts?.ready) {
      fonts.ready.then(printAndCleanup).catch(printAndCleanup);
    } else {
      printAndCleanup();
    }
  };
}

function ensureMountNode(htmlPreview: boolean): HTMLDivElement {
  const existing = document.getElementById(HTML_PREVIEW_ROOT_ID) as HTMLDivElement | null;
  if (existing) {
    existing.style.cssText = htmlPreview
      ? "position:fixed;inset:0;z-index:99999;overflow:auto;background:#f4f4f5;"
      : "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    return existing;
  }

  const node = document.createElement("div");
  node.id = HTML_PREVIEW_ROOT_ID;
  node.style.cssText = htmlPreview
    ? "position:fixed;inset:0;z-index:99999;overflow:auto;background:#f4f4f5;"
    : "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
  document.body.appendChild(node);
  return node;
}

export function usePaperSlipInPagePrintV2() {
  const [job, setJob] = useState<PrintJob | null>(null);
  const [pending, setPending] = useState<PendingPrint | null>(null);
  const [chooserLayout, setChooserLayout] = useState<PaperSlipPrintLayout>("full");
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const htmlPreview = isPaperSlipV2HtmlPreviewEnabled();

  const handleReady = useCallback((html: string) => {
    setJob(null);
    if (isMobileOrTablet()) {
      printHtmlInPlace(html);
    } else {
      printHtmlInIframe(html);
    }
  }, []);

  const closeHtmlPreview = useCallback(() => {
    setJob(null);
    const node = document.getElementById(HTML_PREVIEW_ROOT_ID);
    if (node) {
      node.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    }
  }, []);

  const startPrintJob = useCallback(
    (slipIds: number[], caseIds: number[], layout: PaperSlipPrintLayout) => {
      storePaperSlipPrintLayout(layout);
      mountNodeRef.current = ensureMountNode(htmlPreview);
      setJob({ slipIds, caseIds, layout });
    },
    [htmlPreview],
  );

  const print = useCallback((slipIds: number[], caseIds: number[]) => {
    // HTML preview skips the chooser so layout can be inspected without prompts.
    if (htmlPreview) {
      startPrintJob(slipIds, caseIds, readStoredPaperSlipPrintLayout());
      return;
    }
    setChooserLayout(readStoredPaperSlipPrintLayout());
    setPending({ slipIds, caseIds });
  }, [htmlPreview, startPrintJob]);

  const cancelChooser = useCallback(() => {
    setPending(null);
  }, []);

  const confirmChooser = useCallback(
    (layout: PaperSlipPrintLayout) => {
      if (!pending) return;
      const { slipIds, caseIds } = pending;
      setPending(null);
      startPrintJob(slipIds, caseIds, layout);
    },
    [pending, startPrintJob],
  );

  const chooser = (
    <PaperSlipPrintLayoutDialog
      open={pending !== null}
      initialLayout={chooserLayout}
      onCancel={cancelChooser}
      onConfirm={confirmChooser}
    />
  );

  const portal =
    job && mountNodeRef.current
      ? createPortal(
          htmlPreview ? (
            <div className="min-h-full">
              <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-[#d4d4d8] bg-white px-4 py-2 shadow-sm">
                <div className="text-[13px] font-medium text-[#3f3f46]">
                  Paper slip HTML preview
                  <span className="ml-2 font-normal text-[#71717a]">
                    (NEXT_PUBLIC_PAPER_SLIP_V2_HTML_PREVIEW=true · layout={job.layout})
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-[#d4d4d8] bg-white px-3 py-1.5 text-[13px] font-medium text-[#18181b] hover:bg-[#f4f4f5]"
                  onClick={closeHtmlPreview}
                >
                  Close
                </button>
              </div>
              <PaperSlipPrintV2PageShell
                caseIds={job.caseIds}
                error={null}
                layout={job.layout}
                slipIds={job.slipIds}
                viewOnly
              />
            </div>
          ) : (
            <PaperSlipPrintV2PageShell
              caseIds={job.caseIds}
              error={null}
              layout={job.layout}
              onReady={handleReady}
              slipIds={job.slipIds}
            />
          ),
          mountNodeRef.current,
        )
      : null;

  return {
    print,
    portal: (
      <>
        {chooser}
        {portal}
      </>
    ),
    // Only while fetching/rendering the slip — not while the layout chooser is open,
    // or LoadingOverlay covers the Full/Half dialog.
    isPrinting: job !== null,
  };
}
