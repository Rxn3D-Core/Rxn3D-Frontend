/**
 * Portrait v5 paper slip as a one-page letter PDF.
 * The layout is the same HTML as the on-screen slip. It is captured and
 * embedded with jsPDF, the same library the driver labels use.
 * Print stays on this page: closing the sheet returns to the virtual slip.
 */

import type { jsPDF } from "jspdf";
import type { VirtualSlipVM } from "@/lib/virtual-slip-view-model";
import {
  buildPaperSlipV5Html,
  renderV5ArchChartDataUrl,
  resolvePaperSlipV5Qr,
  type PaperSlipV5Input,
} from "@/lib/paper-slip-v5-html";

const ARTBOARD_W = 628;
const ARTBOARD_H = 890;

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function withInlineLogo(vm: VirtualSlipVM): Promise<VirtualSlipVM> {
  const src = vm.header.labLogo;
  if (!src || src.startsWith("data:")) return vm;
  try {
    const res = await fetch(src);
    if (!res.ok) return vm;
    const data = await blobToDataUrl(await res.blob());
    if (!data) return vm;
    return { ...vm, header: { ...vm.header, labLogo: data } };
  } catch {
    return vm;
  }
}

function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const points: Array<[number, number]> = [
    [24, 24],
    [Math.floor(canvas.width / 2), 40],
    [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)],
    [40, Math.floor(canvas.height - 40)],
  ];
  for (const [x, y] of points) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[3] > 0 && (pixel[0] < 250 || pixel[1] < 250 || pixel[2] < 250)) return true;
  }
  return false;
}

function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  return Promise.all(
    images.map(
      (img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
    ),
  ).then(() => undefined);
}

async function captureSlipCanvas(html: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${ARTBOARD_W}px;height:${ARTBOARD_H}px;border:0;opacity:0;pointer-events:none;z-index:-1;`;
  const ready = new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("Could not render the paper slip."));
  });
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  try {
    await ready;
    const page = iframe.contentDocument?.querySelector(".ps-page");
    if (!page || !(page instanceof HTMLElement) || !iframe.contentDocument) {
      throw new Error("Could not render the paper slip.");
    }
    await waitForImages(iframe.contentDocument);
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: ARTBOARD_W,
      height: ARTBOARD_H,
      windowWidth: ARTBOARD_W,
      windowHeight: ARTBOARD_H,
      useCORS: true,
      logging: false,
    });
    if (!canvasHasInk(canvas)) throw new Error("Could not render the paper slip.");
    return canvas;
  } finally {
    iframe.remove();
  }
}

async function buildLetterPdf(canvas: HTMLCanvasElement): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 9;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const ratio = canvas.width / canvas.height;
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  doc.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    (pageW - width) / 2,
    (pageH - height) / 2,
    width,
    height,
  );
  return doc;
}

function isIosDevice(): boolean {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Show the PDF on this page and print it. Closing the sheet, or Back,
 * returns to the virtual slip. No extra browser tab.
 */
function printPdfHere(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.title = "Paper slip";
  frame.src = url;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    frame.remove();
    bar.remove();
    URL.revokeObjectURL(url);
  };

  const bar = document.createElement("div");
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back";
  back.onclick = cleanup;
  bar.appendChild(back);

  if (isIosDevice()) {
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.textContent = "Print";
    printBtn.onclick = () => {
      const file = new File([blob], "paper-slip.pdf", { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        void navigator.share({ files: [file], title: "Paper slip" }).then(cleanup).catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") cleanup();
          else {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
          }
        });
        return;
      }
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
    bar.appendChild(printBtn);
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;justify-content:space-between;gap:8px;padding:8px 12px;background:#fff;border-bottom:1px solid #e5e5e5;";
    frame.style.cssText =
      "position:fixed;top:52px;left:0;width:100%;height:calc(100% - 52px);border:0;z-index:2147483646;background:#fff;";
  } else {
    bar.style.cssText = "display:none;";
    frame.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;border:0;";
  }

  const buttonStyle = "font:600 16px/1 sans-serif;padding:8px 14px;border:1px solid #ccc;border-radius:8px;background:#fff;";
  for (const button of bar.querySelectorAll("button")) button.style.cssText = buttonStyle;

  document.body.append(bar, frame);

  let didPrint = false;
  const printFrame = () => {
    if (didPrint || !frame.isConnected) return;
    const win = frame.contentWindow;
    if (!win) return;
    didPrint = true;
    try {
      win.focus();
      win.print();
      const media = win.matchMedia("print");
      let sawPrint = media.matches;
      const finish = () => cleanup();
      media.addEventListener("change", (event) => {
        if (event.matches) sawPrint = true;
        else if (sawPrint) finish();
      });
      win.addEventListener("afterprint", () => {
        if (!isIosDevice() || (sawPrint && !media.matches)) finish();
      });
    } catch {
      if (!isIosDevice()) cleanup();
    }
  };
  frame.onload = () => window.setTimeout(printFrame, 300);
  window.setTimeout(printFrame, 1000);
  if (!isIosDevice()) window.setTimeout(cleanup, 60_000);
}

export async function printPaperSlipV5Pdf(input: PaperSlipV5Input): Promise<void> {
  const vm = await withInlineLogo(input.vm);
  const [qr, maxillary, mandibular] = await Promise.all([
    resolvePaperSlipV5Qr(input),
    renderV5ArchChartDataUrl("maxillary", vm.arches.maxillary),
    renderV5ArchChartDataUrl("mandibular", vm.arches.mandibular),
  ]);
  const html = buildPaperSlipV5Html({ ...input, vm }, qr, { maxillary, mandibular });
  const canvas = await captureSlipCanvas(html);
  const doc = await buildLetterPdf(canvas);
  printPdfHere(doc.output("blob"));
}
