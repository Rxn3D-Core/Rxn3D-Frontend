"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintV2PageShell } from "@/components/paper-slip-print/paper-slip-print-v2-page-shell";
import { isPaperSlipV2HtmlPreviewEnabled } from "@/lib/paper-slip-v2-html-preview";

interface PrintJob {
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
// iframe content, so mount the slip visibly on the current page and print the
// page itself, hiding everything else during print.
function printHtmlInPlace(html: string): void {
  document.getElementById(MOBILE_PRINT_ROOT_ID)?.remove();
  document.getElementById(`${MOBILE_PRINT_ROOT_ID}-style`)?.remove();

  const style = document.createElement("style");
  style.id = `${MOBILE_PRINT_ROOT_ID}-style`;
  style.textContent = `
    @media print {
      body > :not(#${MOBILE_PRINT_ROOT_ID}) { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = MOBILE_PRINT_ROOT_ID;
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

  const print = useCallback((slipIds: number[], caseIds: number[]) => {
    mountNodeRef.current = ensureMountNode(htmlPreview);
    setJob({ slipIds, caseIds });
  }, [htmlPreview]);

  const portal =
    job && mountNodeRef.current
      ? createPortal(
          htmlPreview ? (
            <div className="min-h-full">
              <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-[#d4d4d8] bg-white px-4 py-2 shadow-sm">
                <div className="text-[13px] font-medium text-[#3f3f46]">
                  Paper slip HTML preview
                  <span className="ml-2 font-normal text-[#71717a]">
                    (NEXT_PUBLIC_PAPER_SLIP_V2_HTML_PREVIEW=true)
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
                slipIds={job.slipIds}
                viewOnly
              />
            </div>
          ) : (
            <PaperSlipPrintV2PageShell
              caseIds={job.caseIds}
              error={null}
              onReady={handleReady}
              slipIds={job.slipIds}
            />
          ),
          mountNodeRef.current,
        )
      : null;

  return { print, portal, isPrinting: job !== null };
}
