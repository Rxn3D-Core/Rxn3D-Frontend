"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintV2PageShell } from "@/components/paper-slip-print/paper-slip-print-v2-page-shell";
import { PaperSlipPrintLayoutDialog } from "@/components/paper-slip-print/paper-slip-print-layout-dialog";
import { isPaperSlipV2HtmlPreviewEnabled } from "@/lib/paper-slip-v2-html-preview";
import {
  readStoredPaperSlipPrintLayout,
  shouldOfferPaperSlipPrintLayoutChoice,
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

/** Phones/tablets, narrow windows, and desktop Safari (iframe.print is flaky). */
function prefersInPlacePrint(): boolean {
  if (window.innerWidth <= 1024) return true;
  if (/android|ipad|iphone|ipod|mobile/i.test(navigator.userAgent)) return true;
  const ua = navigator.userAgent;
  // Desktop Safari: has Safari but not Chrome/Chromium/Edge/Firefox iOS wrappers.
  return /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg/i.test(ua);
}

/** True iPhone/iPad — keep unscaled print to avoid AirPrint blank pages. */
function isIOSDevice(): boolean {
  return shouldOfferPaperSlipPrintLayoutChoice({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

/**
 * Wrap slip HTML for the print target (classes live in the document styles):
 * - iOS: `paper-slip-v2-print-ios` — sheets get Letter-portrait aspect so
 *   AirPrint's fit-to-width can't spill one slip onto 2–3 pages.
 * - Other: `paper-slip-v2-print-fill` — desktop zoom-to-fill.
 */
function withDesktopPrintFill(html: string): string {
  if (isIOSDevice()) return `<div class="paper-slip-v2-print-ios">${html}</div>`;
  return `<div class="paper-slip-v2-print-fill">${html}</div>`;
}

// iOS + desktop Safari: iframe.contentWindow.print() is unreliable (onload may
// never fire after document.write; removing the iframe cancels the sheet).
// Mount the slip on the current page and print the page itself instead.
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
      /* Zero page margin — Safari often omits URL/date headers & footers when margins are 0. */
      @page {
        margin: 0 !important;
        size: auto;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        overflow: visible !important;
        height: auto !important;
      }
      body > :not(#${MOBILE_PRINT_ROOT_ID}) { display: none !important; }
      #${MOBILE_PRINT_ROOT_ID} {
        display: block !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
        /* Never cap the root — that clipped slip #2+ and invented blank pages. */
        max-height: none !important;
        overflow: visible !important;
        clip: auto !important;
        clip-path: none !important;
        pointer-events: auto !important;
        visibility: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Per-sheet page breaks live in document CSS; do not force avoid on sheets. */
      #${MOBILE_PRINT_ROOT_ID} .paper-slip-v2-section {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = MOBILE_PRINT_ROOT_ID;
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = withDesktopPrintFill(html);
  document.body.appendChild(root);

  // Let Safari finish layout/paint of the injected slip before opening the sheet.
  window.setTimeout(() => {
    window.print();
  }, 50);

  // Desktop/Android: remove inject on cancel/complete so listing returns.
  // iOS: skip — afterprint can fire when the sheet re-renders (paper size).
  if (!isIOSDevice()) {
    const cleanup = () => {
      cleanupMobilePrintRoot();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 60_000);
  }
}

function collectPrintDocumentChrome(): { styleLinks: string; inlineStyles: string; rootClass: string } {
  const styleLinks = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"))
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join("");
  const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
    .map((s) => `<style>${s.textContent ?? ""}</style>`)
    .join("");
  return { styleLinks, inlineStyles, rootClass: document.documentElement.className || "" };
}

/**
 * iOS Safari ignores window.print() once the Full/Half tap's user gesture has
 * ended (slip fetch + image wait). Open the print tab synchronously on that
 * tap, then write the slip into it and print from that tab's load handler.
 */
function openIosPrintWindow(): Window | null {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return null;
  printWindow.document.open();
  printWindow.document.write(
    "<!DOCTYPE html><html><head><title>Paper slip</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body style=\"font-family:sans-serif;padding:24px;color:#18181b\">Preparing paper slip…</body></html>",
  );
  printWindow.document.close();
  return printWindow;
}

function printHtmlInIosWindow(printWindow: Window, html: string): void {
  const { styleLinks, inlineStyles, rootClass } = collectPrintDocumentChrome();
  const closeTag = "</scr" + "ipt>";
  printWindow.document.open();
  printWindow.document.write(
    `<!DOCTYPE html><html class="${rootClass}"><head><title>Paper slip</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{margin:0;size:auto}html,body{margin:0;padding:0;background:#fff}</style>${styleLinks}${inlineStyles}</head><body class="font-sans">${withDesktopPrintFill(html)}<script>(function(){function go(){window.focus();window.print();}if(document.readyState==="complete"){go();}else{window.addEventListener("load",go);}window.addEventListener("afterprint",function(){setTimeout(function(){window.close();},200);});})();${closeTag}</body></html>`,
  );
  printWindow.document.close();
}

function printHtmlInIframe(html: string): void {
  const styleLinks = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"))
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join("");
  const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
    .map((s) => `<style>${s.textContent}</style>`)
    .join("");

  const iframe = document.createElement("iframe");
  // Keep hidden for the whole print session. Making it full-screen visible
  // covered the listing after cancel and looked like a stuck paper-slip page.
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  // Carry the app's next/font variable classes (e.g. `--font-inter`) onto the
  // iframe <html>; the copied @font-face + variable-class CSS then resolves so
  // Tailwind's `font-sans` renders in Inter (matching the virtual slip) instead
  // of the browser's default sans fallback.
  const rootClass = document.documentElement.className || "";

  const doc = iframe.contentDocument;
  if (!doc || !iframe.contentWindow) {
    iframe.remove();
    printHtmlInPlace(html);
    return;
  }

  let didPrint = false;
  let cleaned = false;
  const removeIframe = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
    window.removeEventListener("afterprint", removeIframe);
    iframe.contentWindow?.removeEventListener("afterprint", removeIframe);
  };

  const printAndCleanup = () => {
    if (didPrint) return;
    didPrint = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      removeIframe();
      printHtmlInPlace(html);
      return;
    }
    // Cancel or finish → restore listing (do not leave slip covering the page).
    window.addEventListener("afterprint", removeIframe);
    iframe.contentWindow?.addEventListener("afterprint", removeIframe);
    window.setTimeout(removeIframe, 60_000);
  };

  const runWhenReady = () => {
    const fonts = iframe.contentDocument?.fonts;
    if (fonts?.ready) {
      const timeout = window.setTimeout(printAndCleanup, 2500);
      fonts.ready
        .then(() => {
          window.clearTimeout(timeout);
          printAndCleanup();
        })
        .catch(printAndCleanup);
    } else {
      printAndCleanup();
    }
  };

  // Assign onload BEFORE write/close. Safari often skips onload if the handler
  // is attached after document.write when readyState is already "complete".
  iframe.onload = () => {
    runWhenReady();
  };

  doc.open();
  doc.write(
    `<!DOCTYPE html><html class="${rootClass}"><head><title> </title><style>@page{margin:0!important;size:auto}body{margin:0}</style>${styleLinks}${inlineStyles}</head><body class="font-sans">${withDesktopPrintFill(html)}</body></html>`,
  );
  doc.close();

  if (doc.readyState === "complete") {
    window.setTimeout(runWhenReady, 0);
  }
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
  const iosPrintWindowRef = useRef<Window | null>(null);
  const htmlPreview = isPaperSlipV2HtmlPreviewEnabled();

  const closeIosPrintWindow = useCallback(() => {
    const printWindow = iosPrintWindowRef.current;
    iosPrintWindowRef.current = null;
    if (printWindow && !printWindow.closed) printWindow.close();
  }, []);

  // Print the same React/SVG slip the screen uses (VirtualSlipToothChart +
  // pattern tooth PNGs). Do not rasterize to PDF — that drops tooth images.
  const handleReady = useCallback((html: string) => {
    const iosWindow = iosPrintWindowRef.current;
    iosPrintWindowRef.current = null;
    setJob(null);
    if (iosWindow && !iosWindow.closed) {
      printHtmlInIosWindow(iosWindow, html);
      return;
    }
    if (prefersInPlacePrint()) {
      printHtmlInPlace(html);
    } else {
      printHtmlInIframe(html);
    }
  }, []);

  const handlePrintError = useCallback(() => {
    const printWindow = iosPrintWindowRef.current;
    iosPrintWindowRef.current = null;
    if (printWindow && !printWindow.closed) {
      printWindow.document.body.textContent = "Unable to prepare the paper slip. You can close this tab.";
    }
    setJob(null);
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
    // Full vs half is iPhone/iPad only. Mac, Android, and desktop print full page.
    if (!isIOSDevice()) {
      startPrintJob(slipIds, caseIds, "full");
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
      // Must run in this tap — iOS only allows a print tab opened from the gesture.
      if (isIOSDevice()) {
        closeIosPrintWindow();
        iosPrintWindowRef.current = openIosPrintWindow();
      }
      setPending(null);
      startPrintJob(slipIds, caseIds, layout);
    },
    [closeIosPrintWindow, pending, startPrintJob],
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
              onError={handlePrintError}
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
