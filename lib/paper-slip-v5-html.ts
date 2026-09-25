/**
 * Portrait v5 paper slip: same letter layout as Blade v4, built in the browser
 * from the virtual slip already on screen. The tooth chart is plain SVG that
 * points at image URLs the page has already loaded. It does not call the
 * paper-slip API and it does not rasterize a JPEG.
 */

import QRCode from "qrcode";
import { getClaspOverlayImageUrl } from "@/components/case-design-center/utils/claspOverlayImage";
import type { ArchVM, ProductVM, VirtualSlipVM } from "@/lib/virtual-slip-view-model";
import { printHtmlViaHiddenIframe } from "@/lib/print-paper-slip-v4-html";
import { PAPER_SLIP_V5_CSS } from "@/lib/paper-slip-v5-css";

export type PaperSlipV5Input = {
  vm: VirtualSlipVM;
  caseId: number;
  slipId: number;
  /** Raw GET slip details, already loaded for the virtual slip page. */
  details?: unknown;
};

type Rect = { x: number; y: number; w: number; h: number; num: number; tx: number };

const MAXILLARY_RECTS: Rect[] = [
  { x: 0, y: 0, w: 44, h: 141, num: 1, tx: 22 },
  { x: 44, y: 0, w: 50, h: 141, num: 2, tx: 69 },
  { x: 94, y: 0, w: 54, h: 141, num: 3, tx: 121 },
  { x: 148, y: 0, w: 38, h: 141, num: 4, tx: 166 },
  { x: 186, y: 0, w: 37, h: 141, num: 5, tx: 203 },
  { x: 223, y: 0, w: 40, h: 141, num: 6, tx: 242 },
  { x: 263, y: 0, w: 36, h: 141, num: 7, tx: 280 },
  { x: 299, y: 0, w: 49, h: 141, num: 8, tx: 322 },
  { x: 348, y: 0, w: 49, h: 141, num: 9, tx: 371 },
  { x: 397, y: 0, w: 36, h: 141, num: 10, tx: 414 },
  { x: 433, y: 0, w: 40, h: 141, num: 11, tx: 452 },
  { x: 473, y: 0, w: 37, h: 141, num: 12, tx: 490 },
  { x: 510, y: 0, w: 37, h: 141, num: 13, tx: 528 },
  { x: 547, y: 0, w: 54, h: 141, num: 14, tx: 574 },
  { x: 601, y: 0, w: 50, h: 141, num: 15, tx: 626 },
  { x: 651, y: 0, w: 44, h: 141, num: 16, tx: 673 },
];

const MANDIBULAR_RECTS: Rect[] = (() => {
  const slots: Rect[] = [
    { x: 0, y: 0, w: 43, h: 135, num: 17, tx: 22 },
    { x: 43, y: 0, w: 51, h: 135, num: 18, tx: 70 },
    { x: 94, y: 0, w: 54, h: 135, num: 19, tx: 122 },
    { x: 148, y: 0, w: 38, h: 135, num: 20, tx: 168 },
    { x: 186, y: 0, w: 36, h: 135, num: 21, tx: 206 },
    { x: 222, y: 0, w: 34, h: 135, num: 22, tx: 244 },
    { x: 256, y: 0, w: 31, h: 135, num: 23, tx: 270 },
    { x: 287, y: 0, w: 26, h: 135, num: 24, tx: 300 },
    { x: 313, y: 0, w: 26, h: 135, num: 25, tx: 330 },
    { x: 339, y: 0, w: 30, h: 135, num: 26, tx: 350 },
    { x: 369, y: 0, w: 34, h: 135, num: 27, tx: 385 },
    { x: 403, y: 0, w: 36, h: 135, num: 28, tx: 418 },
    { x: 439, y: 0, w: 38, h: 135, num: 29, tx: 452 },
    { x: 477, y: 0, w: 53, h: 135, num: 30, tx: 495 },
    { x: 530, y: 0, w: 51, h: 135, num: 31, tx: 550 },
    { x: 581, y: 0, w: 43, h: 135, num: 32, tx: 595 },
  ];
  const reversed = [...slots.map((slot) => slot.num)].reverse();
  return slots.map((slot, index) => ({
    ...slot,
    num: reversed[index],
    tx: slot.x + slot.w / 2,
  }));
})();

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function limit(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function uniqJoin(values: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.join(" / ");
}

function addonLabel(products: ProductVM[]): string {
  return uniqJoin(
    products.map((product) => {
      if (product.addOns.length === 0) return "";
      if (product.addOns.length === 1) return product.addOns[0];
      return `${product.addOns[0]} (+${product.addOns.length - 1})`;
    })
  );
}

function implantLabel(
  products: ProductVM[],
  pick: (row: ProductVM["implants"][number]) => string
): string {
  return uniqJoin(products.flatMap((product) => product.implants.map(pick)));
}

function detailRows(maxillary: ProductVM[], mandibular: ProductVM[]): Array<{ label: string; left: string; right: string; shade?: boolean }> {
  const rows = [
    { label: "Grade", left: uniqJoin(maxillary.map((p) => p.grade)), right: uniqJoin(mandibular.map((p) => p.grade)) },
    { label: "Stage", left: uniqJoin(maxillary.map((p) => p.stage)), right: uniqJoin(mandibular.map((p) => p.stage)) },
    { label: "Teeth Shade", left: uniqJoin(maxillary.map((p) => p.teethShade)), right: uniqJoin(mandibular.map((p) => p.teethShade)), shade: true },
    { label: "Gum Shade", left: uniqJoin(maxillary.map((p) => p.gumShade)), right: uniqJoin(mandibular.map((p) => p.gumShade)), shade: true },
    { label: "Impression", left: uniqJoin(maxillary.map((p) => p.impression)), right: uniqJoin(mandibular.map((p) => p.impression)) },
    { label: "Add ons", left: addonLabel(maxillary), right: addonLabel(mandibular) },
    {
      label: "Implant Brand",
      left: implantLabel(maxillary, (row) => row.brand),
      right: implantLabel(mandibular, (row) => row.brand),
    },
    {
      label: "Implant System",
      left: implantLabel(maxillary, (row) => row.systemName || row.platform),
      right: implantLabel(mandibular, (row) => row.systemName || row.platform),
    },
    {
      label: "Abutment type",
      left: implantLabel(maxillary, (row) => row.abutmentType || row.abutmentOption),
      right: implantLabel(mandibular, (row) => row.abutmentType || row.abutmentOption),
    },
  ];
  return rows.filter((row) => row.left !== "" || row.right !== "");
}

/** "System - A2" → shade stays beside the center label; the system sits on the outside. */
function shadePieces(value: string): Array<{ system: string; shade: string }> {
  return value
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.lastIndexOf(" - ");
      if (at === -1) return { system: "", shade: part };
      return { system: part.slice(0, at), shade: part.slice(at + 3) };
    });
}

function plainSide(value: string, side: "l" | "r"): string {
  if (!value) return "";
  return `<span class="ps-clip ps-clip-${side}"><span class="ps-clip-text">${esc(value)}</span></span>`;
}

function shadeSide(value: string, side: "l" | "r"): string {
  const pairs = shadePieces(value)
    .map(({ system, shade }) => {
      const sys = system ? `<span class="ps-sys">${esc(system)}</span>` : "";
      const code = `<span class="ps-shade">${esc(shade)}</span>`;
      return `<span class="ps-shade-pair">${side === "l" ? `${sys}${code}` : `${code}${sys}`}</span>`;
    })
    .join(`<span class="ps-shade-sep">/</span>`);
  if (!pairs) return "";
  return `<span class="ps-shade-line ps-shade-line-${side}">${pairs}</span>`;
}

function detailRowHtml(row: { label: string; left: string; right: string; shade?: boolean }): string {
  const left = row.shade ? shadeSide(row.left, "l") : plainSide(row.left, "l");
  const right = row.shade ? shadeSide(row.right, "r") : plainSide(row.right, "r");
  return `<div class="val-l">${left}</div><div class="lbl">${esc(row.label)}</div><div class="val-r">${right}</div>`;
}

function defaultToothUrl(tooth: number): string {
  const arch = tooth <= 16 ? "maxillary" : "mandibular";
  return `/images/teeth/${arch}/tooth-${tooth}.png?v=4`;
}

function toothImageUrl(arch: ArchVM | null, tooth: number): string {
  const display = arch?.extractionDisplay;
  const code = display?.toothExtractionMap?.[tooth];
  const extractionUrl = code ? display?.extractionImagesByCode?.[code]?.[tooth] : null;
  if (extractionUrl) return extractionUrl;
  const selected = arch?.toothChartSelectionsByTooth?.[tooth]?.imageUrl;
  if (selected) return selected;
  return defaultToothUrl(tooth);
}

function willExtractTeeth(arch: ArchVM | null): Set<number> {
  const teeth = new Set<number>();
  for (const tooth of arch?.teeth ?? []) {
    if (tooth.status === "will_extract") teeth.add(tooth.number);
  }
  for (const product of arch?.products ?? []) {
    for (const tooth of product.willExtractTeeth) teeth.add(tooth);
  }
  return teeth;
}

function chartSvg(type: "maxillary" | "mandibular", arch: ArchVM | null): string {
  const isMaxillary = type === "maxillary";
  const rects = isMaxillary ? MAXILLARY_RECTS : MANDIBULAR_RECTS;
  const toothHeight = isMaxillary ? 141 : 135;
  const viewBoxWidth = isMaxillary ? 695 : 624;
  const viewBoxHeight = toothHeight + 4;
  const numberY = Math.round(toothHeight * 0.68);
  const prefix = isMaxillary ? "v5max" : "v5mand";
  const label = isMaxillary ? "MAXILLARY" : "MANDIBULAR";
  const willExtract = willExtractTeeth(arch);
  const display = arch?.extractionDisplay;

  const patterns = rects
    .map((rect) => {
      const href = esc(toothImageUrl(arch, rect.num));
      return `<pattern id="${prefix}${rect.num}" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${href}" xlink:href="${href}" width="1" height="1" preserveAspectRatio="none" /></pattern>`;
    })
    .join("");

  const fills = rects
    .map(
      (rect) =>
        `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="url(#${prefix}${rect.num})" />`
    )
    .join("");

  const marks = rects
    .filter((rect) => willExtract.has(rect.num))
    .map((rect) => {
      const cx = rect.x + rect.w / 2;
      const cy = toothHeight * 0.42;
      const arm = Math.min(rect.w * 0.28, 14);
      return `<g stroke="#E11D48" stroke-width="3" stroke-linecap="round"><line x1="${cx - arm}" y1="${cy - arm}" x2="${cx + arm}" y2="${cy + arm}" /><line x1="${cx + arm}" y1="${cy - arm}" x2="${cx - arm}" y2="${cy + arm}" /></g>`;
    })
    .join("");

  const clasps = rects
    .map((rect) => {
      const href = getClaspOverlayImageUrl({
        toothNumber: rect.num,
        claspTeeth: display?.claspTeeth ?? [],
        toothExtractionMap: display?.toothExtractionMap,
        extractionImagesByCode: display?.extractionImagesByCode,
        extractionsByCode: display?.extractionsByCode,
      });
      if (!href) return "";
      const claspW = Math.max(rect.w, 20);
      const claspH = Math.round(claspW * (17 / 41));
      const safe = esc(href);
      return `<image href="${safe}" xlink:href="${safe}" x="${rect.x}" y="80" width="${claspW}" height="${claspH}" preserveAspectRatio="xMidYMid meet" />`;
    })
    .join("");

  const numbers = rects
    .map(
      (rect) =>
        `<text x="${rect.tx}" y="${numberY}" font-family="Verdana, sans-serif" font-size="16" font-weight="700" fill="#4C4D55" text-anchor="middle">${rect.num}</text>`
    )
    .join("");

  return `<div class="chart-label">${label}</div><div class="teeth-row"><svg width="290" height="96" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs>${patterns}</defs>${fills}${marks}${clasps}${numbers}</svg></div>`;
}

function productBoxes(products: ProductVM[]): string {
  return products
    .filter((product) => product.title.trim() !== "")
    .map(
      (product) =>
        `<div class="ps-product-box"><div class="ps-product-title">${esc(product.title)}</div><div class="ps-product-teeth">${esc(product.teethLabel)}</div></div>`
    )
    .join("");
}

function productSummary(products: ProductVM[]): string {
  return limit(uniqJoin(products.map((product) => product.title).filter(Boolean)).replace(/ \/ /g, ", "), 48);
}

function oldestNote(details: any, vm: VirtualSlipVM): string {
  const notes = details?.notes;
  if (Array.isArray(notes) && notes.length > 0) {
    const sorted = [...notes]
      .filter((note) => text(note?.note) !== "")
      .sort((a, b) => text(a?.created_at ?? a?.id).localeCompare(text(b?.created_at ?? b?.id)));
    if (sorted[0]) return text(sorted[0].note);
  }
  return text(vm.notes).split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

function existingQr(details: any): string {
  return text(details?.print_qr_code_url || details?.qr_code_url || details?.qr_code);
}

export function buildPaperSlipV5Html(input: PaperSlipV5Input, qrCodeUrl = ""): string {
  const { vm } = input;
  const details = (input.details ?? {}) as any;
  const header = vm.header;
  const maxillary = vm.arches.maxillary?.products ?? [];
  const mandibular = vm.arches.mandibular?.products ?? [];
  const office = details?.case?.office ?? details?.office ?? {};
  const doctor = details?.case?.doctor ?? details?.doctor ?? {};
  const officeCode = text(office.code || office.unique_code);
  const license = text(doctor.license_number);
  const genderAge = [header.gender, header.age ? `Age ${header.age}` : ""].filter(Boolean).join(", ");
  const delivery = [header.dueDate, header.deliveryTime].filter(Boolean).join(" • ");
  const note = oldestNote(details, vm);
  const maxSummary = productSummary(maxillary);
  const mandSummary = productSummary(mandibular);
  const qr = qrCodeUrl || existingQr(details);
  const rows = detailRows(maxillary, mandibular).map(detailRowHtml).join("");

  const logo = header.labLogo
    ? `<img class="ps-logo" src="${esc(header.labLogo)}" alt="Lab logo">`
    : "";
  const qrHtml = qr
    ? `<img class="ps-qr" src="${esc(qr)}" alt="QR">`
    : `<div class="ps-qr-missing"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Paper Slip — ${esc(header.labName || "Rxn3D")}</title>
  <style>${PAPER_SLIP_V5_CSS}</style>
</head>
<body>
<div class="ps-page">
  <div class="ps-main">
    <div class="ps-header">
      <div class="ps-brand-wrap">
        ${logo}
        <div class="ps-brand">
          <div class="ps-lab-name">${esc(header.labName || "Lab")}</div>
        </div>
      </div>
      <div class="ps-delivery">
        <div class="ps-delivery-label">Delivery Date</div>
        <div class="ps-delivery-value">${esc(delivery || "—")}</div>
      </div>
    </div>
    <div class="ps-ids">
      <div class="ps-ids-row">
        <div class="ps-id">Office<br><span>${esc(header.officeName)}</span></div>
        <div class="ps-id">Dr<br><span>${esc(header.doctorName)}</span></div>
        <div class="ps-id">Patient<br><span>${esc(header.patientName)}</span></div>
        <div class="ps-id">Gender<br><span>${esc(genderAge)}</span></div>
      </div>
      <div class="ps-ids-row">
        <div class="ps-id">Code<br><span>${esc(officeCode)}</span></div>
        <div class="ps-id">Case #<br><span>${esc(header.caseNumber)}</span></div>
        <div class="ps-id">Slip #<br><span>${esc(header.slipNumber)}</span></div>
        <div class="ps-id">Pick up date<br><span>${esc(header.pickupDate)}</span></div>
      </div>
    </div>
    <div class="ps-legend">
      <div class="ps-legend-item"><span class="ps-swatch ps-swatch-tim"></span>Teeth in mouth</div>
      <div class="ps-legend-item"><span class="ps-swatch ps-swatch-missing"></span>Missing teeth</div>
      <div class="ps-legend-item"><span class="ps-swatch ps-swatch-wed"></span>Will extract</div>
    </div>
    <div class="ps-charts">
      <div class="ps-arch">${chartSvg("maxillary", vm.arches.maxillary)}${productBoxes(maxillary)}</div>
      <div class="ps-arch">${chartSvg("mandibular", vm.arches.mandibular)}${productBoxes(mandibular)}</div>
    </div>
    <div class="ps-details">${rows}</div>
    <div class="ps-qr-note">Scan QR / open virtual slip for full details.</div>
    ${note ? `<div class="ps-notes">${esc(note)}</div>` : ""}
    <div class="ps-sig-wrap">
      <div class="ps-sig">
        <div class="ps-sig-line"></div>
        <div class="ps-sig-label">Doctor's Signature | License # ${esc(license)}</div>
      </div>
    </div>
  </div>
  <div class="ps-detach">
    <div class="ps-cut"></div>
    <div class="ps-stub">
      <div class="ps-stub-top">
        ${qrHtml}
        <div class="ps-pan">${esc(header.panNumber || "—")}</div>
      </div>
      <div class="ps-stub-bottom">
        <div class="ps-stub-office">
          <div><span class="ps-k">OFC:</span> <span class="ps-v">${esc(officeCode)}</span></div>
          <div><span class="ps-k">CASE:</span> <span class="ps-v">${esc(header.caseNumber)}</span></div>
          <div><span class="ps-k">SLIP:</span> <span class="ps-v">${esc(header.slipNumber)}</span></div>
          <div><span class="ps-k">PT:</span> <span class="ps-v">${esc(limit(header.patientName, 32))}</span></div>
        </div>
        <div class="ps-stub-arches">
          ${maxSummary ? `<div><span class="ps-k">Maxillary:</span> <span class="ps-v">${esc(maxSummary)}</span></div>` : ""}
          ${mandSummary ? `<div><span class="ps-k">Mandibular:</span> <span class="ps-v">${esc(mandSummary)}</span></div>` : ""}
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

const IOS_PRINT_ROOT_ID = "paper-slip-v5-print-root";

function qrTarget(caseId: number, slipId: number): string {
  if (!caseId || !slipId || typeof window === "undefined") return "";
  return `${window.location.origin}/case/${caseId}?slips=${slipId}`;
}

const QR_OPTIONS = { margin: 0, width: 264, errorCorrectionLevel: "L" as const };

async function qrDataUrl(caseId: number, slipId: number): Promise<string> {
  const target = qrTarget(caseId, slipId);
  if (!target) return "";
  try {
    return await QRCode.toDataURL(target, QR_OPTIONS);
  } catch {
    return "";
  }
}

/** Callback form runs in the same turn, so iPhone print stays inside the tap. */
function qrDataUrlSync(caseId: number, slipId: number): string {
  const target = qrTarget(caseId, slipId);
  if (!target) return "";
  let url = "";
  try {
    QRCode.toDataURL(target, QR_OPTIONS, (error, dataUrl) => {
      if (!error && dataUrl) url = dataUrl;
    });
  } catch {
    return "";
  }
  return url;
}

function cleanupIosPrintRoot(): void {
  document.getElementById(IOS_PRINT_ROOT_ID)?.remove();
  document.getElementById(`${IOS_PRINT_ROOT_ID}-style`)?.remove();
}

/**
 * Print on this page. The slip is invisible on screen, so cancel or print
 * leaves the virtual slip in place. Slip CSS is print-only so it does not
 * restyle the page underneath.
 */
function printHtmlInCurrentWindow(html: string): void {
  cleanupIosPrintRoot();

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const slipCss = parsed.querySelector("style")?.textContent ?? "";

  const style = document.createElement("style");
  style.id = `${IOS_PRINT_ROOT_ID}-style`;
  style.textContent = `
    #${IOS_PRINT_ROOT_ID} {
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    @media print {
      ${slipCss}
      html, body {
        width: 8.5in !important;
        height: 11in !important;
        max-height: 11in !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        overflow: hidden !important;
      }
      body > :not(#${IOS_PRINT_ROOT_ID}) { display: none !important; }
      #${IOS_PRINT_ROOT_ID} {
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
        position: relative !important;
        width: 8.5in !important;
        height: 11in !important;
        max-height: 11in !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        clip: auto !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = IOS_PRINT_ROOT_ID;
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = parsed.body.innerHTML;
  document.body.appendChild(root);
  root.getBoundingClientRect();
  window.print();

  const media = window.matchMedia("print");
  let sawPrint = media.matches;
  let removed = false;
  const finish = () => {
    if (removed) return;
    removed = true;
    media.removeEventListener("change", onChange);
    window.removeEventListener("afterprint", onAfterPrint);
    cleanupIosPrintRoot();
  };
  const onChange = (event: MediaQueryListEvent) => {
    if (event.matches) sawPrint = true;
    else if (sawPrint) finish();
  };
  const onAfterPrint = () => {
    if (sawPrint && !media.matches) finish();
  };
  media.addEventListener("change", onChange);
  window.addEventListener("afterprint", onAfterPrint);
  window.setTimeout(finish, 120_000);
}

/** Build the slip from data already on the page and open the browser print dialog. */
export async function printPaperSlipV5(input: PaperSlipV5Input): Promise<void> {
  const isIos =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const details = input.details as { print_qr_code_url?: string; qr_code_url?: string; qr_code?: string } | undefined;
  if (isIos) {
    const qr = existingQr(details) || qrDataUrlSync(input.caseId, input.slipId);
    printHtmlInCurrentWindow(buildPaperSlipV5Html(input, qr));
    return;
  }
  const qr = existingQr(details) || (await qrDataUrl(input.caseId, input.slipId));
  printHtmlViaHiddenIframe(buildPaperSlipV5Html(input, qr));
}
