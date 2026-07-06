"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { buildPaperSlipSectionModels } from "@/app/paper-slip/print/page-helpers";
import { Button } from "@/components/ui/button";
import { PaperSlipPrintDocument } from "@/components/paper-slip-print/paper-slip-print-document";
import { waitForImageLikes } from "@/lib/paper-slip-image-readiness";
import { buildPaperSlipPrintSlipVM, type PaperSlipPrintableSlipVM } from "@/lib/paper-slip-print-view-model";
import { buildPaperSlipPrintActionState } from "@/components/paper-slip-print/paper-slip-print-page-shell-state";
import { isEmbeddedWebView } from "@/lib/webview-detect";

function PaperSlipStateCard({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: string;
  tone?: "default" | "error";
}) {
  const toneClasses =
    tone === "error"
      ? "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]"
      : "border-[#d6d6d6] bg-white text-[#2f3542]";

  return (
    <div className="min-h-screen bg-[#f4f4f5] px-4 py-10">
      <div className={`mx-auto max-w-[760px] rounded-[28px] border p-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ${toneClasses}`}>
        <div className="text-[12px] font-semibold uppercase tracking-[0.22em] opacity-70">Paper Slip Print</div>
        <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-3 text-[14px] leading-6 opacity-90">{body}</p>
      </div>
    </div>
  );
}

function mapSlipPrintRecords(records: unknown[]): PaperSlipPrintableSlipVM[] {
  return records.map((record) => buildPaperSlipPrintSlipVM(record));
}

export function PaperSlipPrintPageShell({
  error,
  caseIds,
  initialSlips,
  slipIds,
  onReady,
}: {
  error: string | null;
  caseIds: number[];
  initialSlips: PaperSlipPrintableSlipVM[];
  slipIds: number[];
  /** When provided, called with the rendered HTML instead of postMessage/window.print. */
  onReady?: (html: string) => void;
}) {
  const [slips, setSlips] = useState<PaperSlipPrintableSlipVM[]>(initialSlips);
  const [loading, setLoading] = useState(initialSlips.length === 0 && !error);
  const [fetchError, setFetchError] = useState<string | null>(error);
  const [printed, setPrinted] = useState(false);
  const hasRequestedFetch = useRef(false);
  const printRootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "[data-accessibility-widget] { display: none !important; }";
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const { showPrintButton } = buildPaperSlipPrintActionState({
    fetchError,
    loading,
    slipCount: slips.length,
  });

  const handlePrint = () => {
    setPrinted(true);
    window.print();
  };

  useEffect(() => {
    if (fetchError || slips.length > 0 || hasRequestedFetch.current) return;
    if (slipIds.length === 0 && caseIds.length === 0) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setFetchError("You must be logged in to print paper slips.");
      setLoading(false);
      return;
    }

    hasRequestedFetch.current = true;
    setLoading(true);

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/paper-slip-print-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...(slipIds.length > 0 ? { slip_ids: slipIds } : {}),
        ...(caseIds.length > 0 ? { case_ids: caseIds } : {}),
      }),
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/login";
          return null;
        }

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load paper slip print data.");
        }

        return json?.data ?? [];
      })
      .then((data) => {
        if (!data) return;
        setSlips(mapSlipPrintRecords(Array.isArray(data) ? data : []));
        setFetchError(null);
      })
      .catch((fetchFailure) => {
        setFetchError(fetchFailure instanceof Error ? fetchFailure.message : "Failed to load paper slip print data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [caseIds, fetchError, slipIds, slips.length]);

  useEffect(() => {
    if (printed || loading || slips.length === 0) return;
    let cancelled = false;

    const schedulePrint = async () => {
      const timer = window.setTimeout(() => undefined, 150);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      window.clearTimeout(timer);

      const root = printRootRef.current;
      const images = root ? Array.from(root.querySelectorAll("img")) : [];
      await waitForImageLikes(images, 5000);

      if (cancelled) return;
      setPrinted(true);

      const html = printRootRef.current?.innerHTML ?? "";
      if (onReady) {
        onReady(html);
      } else if (window.opener) {
        window.opener.postMessage({ type: "PAPER_SLIP_PRINT_READY", html }, window.location.origin);
        window.close();
      } else if (isEmbeddedWebView()) {
        // App WebViews can't print(); just leave the document visible and let
        // the native shell's share/print handle output.
      } else {
        if (typeof window.print === "function") window.print();
        window.close();
      }
    };

    void schedulePrint();
    return () => {
      cancelled = true;
    };
  }, [loading, printed, slips.length]);

  if (fetchError) {
    return <PaperSlipStateCard body={fetchError} title="Unable to prepare paper slip document" tone="error" />;
  }

  if (loading) {
    return (
      <PaperSlipStateCard
        body={`Preparing printable paper-slip data for ${slipIds.length > 0 ? `slip ID${slipIds.length === 1 ? "" : "s"} ${slipIds.join(", ")}` : `case ID${caseIds.length === 1 ? "" : "s"} ${caseIds.join(", ")}`}.`}
        title="Preparing printable paper slips"
      />
    );
  }

  if (slips.length === 0) {
    return (
      <PaperSlipStateCard
        body="No printable paper slip data was returned for the requested selection."
        title="No paper slips found"
        tone="error"
      />
    );
  }

  return (
    // ponytail: invisible until print fires; print media ignores visibility
    <div ref={printRootRef} className={printed ? undefined : "invisible"}>
      {/* ponytail: window.print() is a no-op in app WebViews — hide the dead button there */}
      {showPrintButton && !isEmbeddedWebView() ? (
        <div className="fixed right-6 top-6 z-50 print:hidden">
          <Button
            className="shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      ) : null}
      <PaperSlipPrintDocument sections={buildPaperSlipSectionModels(slips)} />
    </div>
  );
}
