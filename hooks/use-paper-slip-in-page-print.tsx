"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintPageShell } from "@/components/paper-slip-print/paper-slip-print-page-shell";
import { isEmbeddedWebView } from "@/lib/webview-detect";

export function buildPaperSlipPrintRoute(slipIds: number[], caseIds: number[]): string {
  const params = new URLSearchParams();
  if (slipIds.length > 0) params.set("slip_ids", slipIds.join(","));
  if (caseIds.length > 0) params.set("case_ids", caseIds.join(","));
  return `/paper-slip/print?${params.toString()}`;
}

interface PrintJob {
  slipIds: number[];
  caseIds: number[];
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
    printHtmlInIframe(html);
  }, []);

  const print = useCallback((slipIds: number[], caseIds: number[]) => {
    // App WebViews (WKWebView/Android WebView) implement window.print() as a
    // no-op, so the hidden-iframe flow shows nothing. Navigate to the
    // standalone document page so the slip is at least visible; printing there
    // goes through the native shell's share/print.
    if (isEmbeddedWebView()) {
      window.location.href = buildPaperSlipPrintRoute(slipIds, caseIds);
      return;
    }

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
