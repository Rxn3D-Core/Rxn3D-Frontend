"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintV2PageShell } from "@/components/paper-slip-print/paper-slip-print-v2-page-shell";

interface PrintJob {
  slipIds: number[];
  caseIds: number[];
}

// width ≤1024 covers phones + tablets; avoids UA sniffing
function isMobileOrTablet(): boolean {
  return window.innerWidth <= 1024 || /android|ipad|iphone|ipod|mobile/i.test(navigator.userAgent);
}

const MOBILE_PRINT_ROOT_ID = "paper-slip-v2-mobile-print-root";

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

export function usePaperSlipInPagePrintV2() {
  const [job, setJob] = useState<PrintJob | null>(null);
  const mountNodeRef = useRef<HTMLDivElement | null>(null);

  const handleReady = useCallback((html: string) => {
    setJob(null);
    if (isMobileOrTablet()) {
      printHtmlInPlace(html);
    } else {
      printHtmlInIframe(html);
    }
  }, []);

  const print = useCallback((slipIds: number[], caseIds: number[]) => {
    if (!mountNodeRef.current) {
      const node = document.createElement("div");
      node.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
      document.body.appendChild(node);
      mountNodeRef.current = node;
    }
    setJob({ slipIds, caseIds });
  }, []);

  const portal =
    job && mountNodeRef.current
      ? createPortal(
          <PaperSlipPrintV2PageShell
            caseIds={job.caseIds}
            error={null}
            onReady={handleReady}
            slipIds={job.slipIds}
          />,
          mountNodeRef.current,
        )
      : null;

  return { print, portal, isPrinting: job !== null };
}
