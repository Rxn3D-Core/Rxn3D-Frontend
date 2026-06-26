"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSlipPrintPageShell } from "@/components/paper-slip-print/paper-slip-print-page-shell";

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
