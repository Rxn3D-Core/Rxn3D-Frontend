/**
 * Portrait v4 paper slip: fetch base64 HTML from the API, decrypt with atob,
 * and print via a hidden iframe (same pattern as driver label print).
 * Does not use the React paper-slip document.
 */

export type PrintPortraitV4PaperSlipsInput = {
  slipIds?: number[];
  caseIds?: number[];
  /** Defaults to localStorage "token". */
  token?: string | null;
};

export type PrintPortraitV4PaperSlipsResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

/**
 * Decode API `data.paper_slips` (base64 HTML).
 */
export function decryptPaperSlipHtml(base64Html: string): string {
  const trimmed = (base64Html ?? "").trim();
  if (!trimmed) return "";
  const binary = atob(trimmed);
  try {
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return binary;
  }
}

/**
 * Print raw HTML the same way driver labels do: hidden iframe + window.print().
 * Waits for chart/logo images so the tooth chart is not blank/blurry mid-decode.
 */
export function printHtmlViaHiddenIframe(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:absolute;left:-9999px;top:0;width:8.5in;height:11in;border:none;visibility:hidden";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Unable to open print frame.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60_000);
  };

  const doPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  const waitForImages = (): Promise<void> => {
    const images = Array.from(doc.images ?? []);
    if (images.length === 0) return Promise.resolve();
    return Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            window.setTimeout(done, 4000);
          })
      )
    ).then(() => undefined);
  };

  const start = () => {
    waitForImages().then(() => {
      window.setTimeout(doPrint, 200);
    });
  };

  if (doc.readyState === "complete") {
    start();
  } else {
    win.addEventListener("load", start, { once: true });
    window.setTimeout(start, 1500);
  }
}

/**
 * POST /slip/generate-portrait-v4-paper-slips → atob → iframe print.
 */
export async function printPortraitV4PaperSlips(
  input: PrintPortraitV4PaperSlipsInput
): Promise<PrintPortraitV4PaperSlipsResult> {
  const slipIds = (input.slipIds ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const caseIds = (input.caseIds ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);

  if (slipIds.length === 0 && caseIds.length === 0) {
    return { ok: false, error: "Provide slip_ids and/or case_ids." };
  }

  const token =
    input.token !== undefined
      ? input.token
      : typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

  if (!token) {
    return { ok: false, error: "You must be logged in to print paper slips." };
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    return { ok: false, error: "API base URL is not configured." };
  }

  const res = await fetch(`${apiBase}/slip/generate-portrait-v4-paper-slips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...(slipIds.length > 0 ? { slip_ids: slipIds } : {}),
      ...(caseIds.length > 0 ? { case_ids: caseIds } : {}),
    }),
  });

  if (res.status === 401) {
    window.location.href = "/login";
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "Invalid response from paper slip API.", status: res.status };
  }

  if (!res.ok || !json?.success) {
    return {
      ok: false,
      error: json?.message || "Failed to generate paper slip HTML.",
      status: res.status,
    };
  }

  const encoded = json?.data?.paper_slips;
  if (typeof encoded !== "string" || encoded.trim() === "") {
    return { ok: false, error: "No paper slip HTML was returned." };
  }

  const html = decryptPaperSlipHtml(encoded);
  if (!html.trim()) {
    return { ok: false, error: "Decoded paper slip HTML was empty." };
  }

  try {
    printHtmlViaHiddenIframe(html);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to open print dialog.",
    };
  }

  return { ok: true };
}
