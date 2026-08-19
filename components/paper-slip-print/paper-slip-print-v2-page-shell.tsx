"use client";

import { useEffect, useRef, useState } from "react";
import { PaperSlipPrintV2Document } from "@/components/paper-slip-print/paper-slip-print-v2-document";
import { waitForImageLikes } from "@/lib/paper-slip-image-readiness";
import {
  buildPaperSlipPrintV2Sections,
  buildPaperSlipPrintV2SlipVM,
  extractPaperSlipPrintV2Extras,
  type PaperSlipPrintV2SlipVM,
} from "@/lib/paper-slip-print-v2-view-model";
import {
  defaultDeliveryTimeForSlipDetails,
  fetchDefaultDeliveryTimeByLabId,
} from "@/lib/slip-default-delivery-time";

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

/**
 * Paper Slip v2 shell — two-API mix:
 *   1. POST /slip/paper-slip-print-data -> records (slip ids + QR + print extras)
 *   2. GET  /v1/slip/slip/{id}/details  -> per-slip body (in parallel)
 * Each pair is merged via buildPaperSlipPrintV2SlipVM so the printed body is
 * identical to the on-screen virtual slip while the QR comes from the paper API.
 */
/**
 * The tooth chart renders tooth / extraction / missing overlays as SVG <image>
 * elements (not <img>), which waitForImageLikes can't observe. Preload every
 * <img src> AND SVG <image href> through HTMLImageElement so the browser caches
 * them; the print iframe's re-fetch is then served from cache and the overlays
 * paint before print fires.
 */
function collectPrintImageLoaders(root: HTMLElement | null): HTMLImageElement[] {
  if (!root) return [];
  const urls = new Set<string>();

  root.querySelectorAll("img").forEach((img) => {
    const src = (img as HTMLImageElement).src;
    if (src) urls.add(src);
  });

  root.querySelectorAll("image").forEach((node) => {
    const href = node.getAttribute("href") ?? node.getAttribute("xlink:href") ?? "";
    if (!href || href.startsWith("data:")) return;
    try {
      urls.add(new URL(href, window.location.href).href);
    } catch {
      /* ignore malformed href */
    }
  });

  return Array.from(urls).map((src) => {
    const image = new Image();
    image.src = src;
    return image;
  });
}

export function PaperSlipPrintV2PageShell({
  error,
  caseIds,
  slipIds,
  onReady,
  viewOnly = false,
}: {
  error: string | null;
  caseIds: number[];
  slipIds: number[];
  /** When provided, called with the rendered HTML instead of postMessage/window.print. */
  onReady?: (html: string) => void;
  /** Render the slip on-screen for review and skip the auto-print/close handoff. */
  viewOnly?: boolean;
}) {
  const [slips, setSlips] = useState<PaperSlipPrintV2SlipVM[]>([]);
  const [loading, setLoading] = useState(!error);
  const [fetchError, setFetchError] = useState<string | null>(error);
  const [printed, setPrinted] = useState(false);
  const hasRequestedFetch = useRef(false);
  const printRootRef = useRef<HTMLDivElement | null>(null);
  // The document is only hidden while a SEPARATE printer takes over: the in-page
  // hook (onReady) or a popup opened with window.opener. A directly-opened tab
  // prints itself, so it (and view mode) must render visibly right away —
  // otherwise the page reads blank until the print handoff completes.
  const [isHiddenHandoff] = useState(
    () => Boolean(onReady) || (typeof window !== "undefined" && Boolean(window.opener)),
  );

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "[data-accessibility-widget] { display: none !important; }";
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

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

    const authHeaders = { Authorization: `Bearer ${token}` };
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

    (async () => {
      // 1. Paper-slip-print-data: slip ids + QR + print-only header extras.
      const printDataRes = await fetch(`${apiBase}/slip/paper-slip-print-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...(slipIds.length > 0 ? { slip_ids: slipIds } : {}),
          ...(caseIds.length > 0 ? { case_ids: caseIds } : {}),
        }),
      });

      if (printDataRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      const printDataJson = await printDataRes.json().catch(() => null);
      if (!printDataRes.ok || !printDataJson?.success) {
        throw new Error(printDataJson?.message || "Failed to load paper slip print data.");
      }

      const records: unknown[] = Array.isArray(printDataJson?.data) ? printDataJson.data : [];
      const extrasList = records
        .map((record) => extractPaperSlipPrintV2Extras(record))
        .filter((extras) => extras.slipId > 0);

      // 2. Per-slip details (virtual-slip source of truth) fetched in parallel,
      //    preserving the paper-slip-print-data ordering.
      const detailsList = await Promise.all(
        extrasList.map(async (extras) => {
          try {
            // NEXT_PUBLIC_API_BASE_URL already includes the `/v1` prefix (same as
            // the paper-slip-print-data call above) — do NOT add another `/v1`.
            const detailsRes = await fetch(
              `${apiBase}/slip/slip/${extras.slipId}/details`,
              { headers: authHeaders },
            );
            if (detailsRes.status === 401) {
              window.location.href = "/login";
              return null;
            }
            const detailsJson = await detailsRes.json().catch(() => null);
            return detailsJson?.data ?? null;
          } catch {
            return null;
          }
        }),
      );

      const defaultTimeByLab = await fetchDefaultDeliveryTimeByLabId(
        detailsList.filter((details) => details != null),
      );

      // 3. Merge: skip any slip whose details failed to load (fail-soft).
      const combined = extrasList
        .map((extras, index) =>
          detailsList[index]
            ? buildPaperSlipPrintV2SlipVM(detailsList[index], extras, {
                defaultDeliveryTime: defaultDeliveryTimeForSlipDetails(
                  detailsList[index],
                  defaultTimeByLab,
                ),
              })
            : null,
        )
        .filter((slip): slip is PaperSlipPrintV2SlipVM => slip !== null);

      setSlips(combined);
      setFetchError(null);
    })()
      .catch((failure) => {
        setFetchError(failure instanceof Error ? failure.message : "Failed to load paper slip print data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [caseIds, fetchError, slipIds, slips.length]);

  useEffect(() => {
    if (printed || loading || slips.length === 0) return;
    // View mode: reveal the rendered slip for on-screen review; no print/close.
    if (viewOnly) {
      setPrinted(true);
      return;
    }
    let cancelled = false;

    const schedulePrint = async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));

      // Preload <img> + SVG <image> overlays so the printed PDF renders the tooth
      // chart's extraction / missing visuals (they load lazily on screen).
      const loaders = collectPrintImageLoaders(printRootRef.current);
      await waitForImageLikes(loaders, 8000);

      if (cancelled) return;
      setPrinted(true);

      const html = printRootRef.current?.innerHTML ?? "";
      if (onReady) {
        onReady(html);
      } else if (window.opener) {
        window.opener.postMessage({ type: "PAPER_SLIP_PRINT_READY", html }, window.location.origin);
        window.close();
      } else {
        if (typeof window.print === "function") window.print();
        window.close();
      }
    };

    void schedulePrint();
    return () => {
      cancelled = true;
    };
  }, [loading, printed, slips.length, onReady, viewOnly]);

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

  // Show the document immediately for view mode + directly-opened tabs; only the
  // hidden-handoff paths stay invisible until print fires (print ignores visibility).
  const showDocument = viewOnly || printed || !isHiddenHandoff;

  return (
    <div ref={printRootRef} className={showDocument ? undefined : "invisible"}>
      <PaperSlipPrintV2Document sections={buildPaperSlipPrintV2Sections(slips)} />
    </div>
  );
}
