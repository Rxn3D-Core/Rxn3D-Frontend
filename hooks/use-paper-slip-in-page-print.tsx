"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintPageShell } from "@/components/paper-slip-print/paper-slip-print-page-shell";

interface PrintJob {
  slipIds: number[];
  caseIds: number[];
}

// ponytail: width ≤1024 covers phones + tablets; avoids UA sniffing
function isMobileOrTablet(): boolean {
  return window.innerWidth <= 1024 ||
    /android|ipad|iphone|ipod|mobile/i.test(navigator.userAgent);
}

const MOBILE_PRINT_ROOT_ID = "paper-slip-mobile-print-root";

// iOS Safari's iframe.contentWindow.print() prints the parent page, not the
// iframe content, so the desktop hidden-iframe flow prints an empty page on
// mobile. Instead, mount the slip on the current page and print the page
// itself, with CSS that hides everything else during print.
//
// Keep the mount invisible on screen so cancel/print doesn't leave a paper-slip
// preview under the virtual slip. Do not remove on afterprint — iOS fires that
// when the sheet re-renders; next print() replaces the node.
function cleanupMobilePrintRoot(): void {
  document.getElementById(MOBILE_PRINT_ROOT_ID)?.remove();
  document.getElementById(`${MOBILE_PRINT_ROOT_ID}-style`)?.remove();
}

function printHtmlInPlace(html: string): void {
  cleanupMobilePrintRoot();

  const style = document.createElement("style");
  style.id = `${MOBILE_PRINT_ROOT_ID}-style`;
  style.textContent = `
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

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>body{margin:0}</style>${styleLinks}${inlineStyles}</head><body>${html}</body></html>`);
  doc.close();

  iframe.onload = () => {
    iframe.style.visibility = "visible";
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 0);
  };
}

export function usePaperSlipInPagePrint() {
  const [job, setJob] = useState<PrintJob | null>(null);
  const mountNodeRef = useRef<HTMLDivElement | null>(null);

  const handleReady = useCallback((html: string) => {
    setJob(null);
    // iOS Safari's iframe.contentWindow.print() prints the parent page, not the
    // iframe content, so mobile prints the current page in place instead.
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
          <PaperSlipPrintPageShell
            caseIds={job.caseIds}
            error={null}
            initialSlips={[]}
            onReady={handleReady}
            slipIds={job.slipIds}
          />,
          mountNodeRef.current,
        )
      : null;

  return { print, portal, isPrinting: job !== null };
}
