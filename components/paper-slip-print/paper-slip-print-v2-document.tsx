"use client";

import type {
  PaperSlipPrintV2SectionModel,
  PaperSlipPrintV2SlipVM,
} from "@/lib/paper-slip-print-v2-view-model";
import type { ArchVM, ProductVM } from "@/lib/virtual-slip-view-model";
import {
  chunkPaperSlipSectionsForHalfPage,
  type PaperSlipPrintLayout,
} from "@/lib/paper-slip-print-layout";
import { buildVirtualSlipStatusBoxProps } from "@/lib/virtual-slip-extraction-display";
import {
  formatImplantAccordionLabel,
  groupVirtualSlipImplants,
} from "@/lib/virtual-slip-implant-groups";
import {
  truncateTextToMaxLines,
  truncateTextToMaxWords,
} from "@/lib/paper-slip-notes-display";
import { VirtualSlipToothChart } from "@/components/virtual-slip/VirtualSlipToothChart";
import { VirtualSlipExtractionStatusBoxes } from "@/components/virtual-slip/VirtualSlipExtractionStatusBoxes";
import { VirtualSlipOpposingSection } from "@/components/virtual-slip/VirtualSlipOpposingSection";

/**
 * Paper slip print v2 — sizes/spacing from Figma frame "PS - Partial one arch"
 * (628×890). Tooth-chart props and dynamic values are unchanged.
 */

/** Figma artboard size (CSS px). */
const SLIP_W = 628;
const SLIP_H = 890;
const BLUE_TOP = 28;

/**
 * Physical size of the artboard at 96 CSS px/in — used in @media print so WebKit
 * does not treat `890px` as ~12.3in (pt) and spill onto blank pages 2–3.
 */
const SLIP_W_MM = ((SLIP_W / 96) * 25.4).toFixed(2);
const SLIP_H_MM = ((SLIP_H / 96) * 25.4).toFixed(2);
const SLIP_W_IN = SLIP_W / 96;
const SLIP_H_IN = SLIP_H / 96;

/**
 * Full-page portrait: scale the artboard up to fill Letter as much as possible
 * without exceeding one page. Letter aspect is wider than the slip, so height
 * is the limiter — that removes the large bottom gap and tightens L/R.
 * Small inset avoids Chrome “Default” margin / rounding creating page 2.
 */
const FULL_PAGE_W_IN = 8.5;
const FULL_PAGE_H_IN = 11;
const FULL_PAGE_INSET_IN = 0.08;
const FULL_SCALE = Math.min(
  (FULL_PAGE_W_IN - FULL_PAGE_INSET_IN * 2) / SLIP_W_IN,
  (FULL_PAGE_H_IN - FULL_PAGE_INSET_IN * 2) / SLIP_H_IN,
).toFixed(4);

/**
 * Half-page slot on landscape Letter: 5.5in × 8.5in. Scale the portrait artboard
 * to fit so after cutting, each half reads as a portrait slip.
 */
const HALF_SLOT_W_IN = 5.5;
const HALF_SLOT_H_IN = 8.5;
const HALF_SCALE = Math.min(
  HALF_SLOT_W_IN / SLIP_W_IN,
  HALF_SLOT_H_IN / SLIP_H_IN,
).toFixed(4);

const DETAIL_ROW_ORDER = [
  "Restoration",
  "Product",
  "Grade",
  "Stage",
  "Teeth shade",
  "Gum shade",
  "Stump shade",
  "Impression",
  "Add ons",
] as const;

interface DetailGridRow {
  label: string;
  maxillary: string;
  mandibular: string;
}

interface LabelValueRow {
  label: string;
  value: string;
}

function fieldMapForArch(arch: ArchVM | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!arch) return map;

  for (const product of arch.products) {
    const set = (label: string, value: string) => {
      if (value && value.trim()) map.set(label, value.trim());
    };
    set("Restoration", product.restoration);
    set("Product", product.productName);
    set("Grade", product.grade);
    set("Stage", product.stage);
    set("Teeth shade", product.teethShade);
    set("Gum shade", product.gumShade);
    set("Stump shade", product.stumpShade);
    set("Impression", product.impression);
    set("Add ons", product.addOns.join(", "));
  }

  return map;
}

function buildDetailGrid(slip: PaperSlipPrintV2SlipVM): DetailGridRow[] {
  const maxFields = fieldMapForArch(slip.vm.arches.maxillary);
  const manFields = fieldMapForArch(slip.vm.arches.mandibular);

  return DETAIL_ROW_ORDER.flatMap((label) => {
    const maxillary = maxFields.get(label) ?? "";
    const mandibular = manFields.get(label) ?? "";
    if (!maxillary && !mandibular) return [];
    return [{ label, maxillary, mandibular }];
  });
}

function formatDetailLabel(label: string): string {
  return label
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function materialFromProduct(product: ProductVM): string {
  const fromAdvance = product.advanceFields.find((f) =>
    /^material$/i.test(f.label.trim()),
  );
  if (fromAdvance?.value?.trim()) return fromAdvance.value.trim();
  return product.restoration?.trim() || "";
}

function buildImplantProductRows(slip: PaperSlipPrintV2SlipVM): LabelValueRow[] {
  const products = [
    ...(slip.vm.arches.maxillary?.products ?? []),
    ...(slip.vm.arches.mandibular?.products ?? []),
  ].filter((p) => p.isImplant);
  const product = products[0];
  if (!product) return [];

  const retention =
    product.implants.find((i) => i.retentionMechanism?.trim())?.retentionMechanism ??
    "";

  const rows: LabelValueRow[] = [];
  const push = (label: string, value: string) => {
    rows.push({ label, value: value?.trim() ? value.trim() : "-" });
  };
  push("Retention", retention);
  push("Stage", product.stage);
  push("Tooth Shade", product.teethShade);
  push("Gum Shade", product.gumShade);
  push("Material", materialFromProduct(product));
  return rows;
}

/** Product callout — width near arch column so tooth #s don't wrap early. */
function PaperSlipV2ProductBox({ title, teethLabel }: { title: string; teethLabel: string }) {
  return (
    <div
      className="mx-auto flex w-full flex-col items-center justify-center gap-[6px] border border-[#D3D3D3] bg-white px-2 py-1.5"
      style={{ borderRadius: 4 }}
    >
      <div
        className="text-center font-medium text-[#666666]"
        style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 11.5, lineHeight: "12px", letterSpacing: "0.01em" }}
      >
        {title}
      </div>
      {teethLabel ? (
        <div
          className="text-center font-normal text-[#666666]"
          style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 11.5, lineHeight: "12px", letterSpacing: "-0.02em" }}
        >
          {teethLabel}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Arch column — wider than Figma 280px so the tooth chart reads larger in print.
 */
function PaperSlipV2ArchColumn({
  title,
  arch,
}: {
  title: string;
  arch: ArchVM | null | undefined;
}) {
  if (!arch) {
    return (
      <section className="flex w-[298px] shrink-0 flex-col items-center gap-[2px]">
        <div
          className="flex h-[18.64px] items-center justify-center font-bold text-[#4C4D55]"
          style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 8.63608, lineHeight: "9px", letterSpacing: "-0.02em" }}
        >
          {title}
        </div>
        <div className="rounded border border-dashed border-[#D3D3D3] px-3 py-6 text-center text-[10px] text-[#9ca3af]">
          No {title.toLowerCase()} products
        </div>
      </section>
    );
  }

  return (
    <section className="flex w-[298px] shrink-0 flex-col items-center gap-[2px]">
      <div
        className="flex h-[18.64px] w-full items-center justify-center font-bold text-[#4C4D55]"
        style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 8.63608, lineHeight: "9px", letterSpacing: "-0.02em" }}
      >
        {title}
      </div>

      {/* Dynamic tooth chart — scaled up for print; props/logic unchanged */}
      <div className="paper-slip-v2-arch-chart w-full origin-top">
        <VirtualSlipToothChart
          arch={arch.arch}
          teeth={arch.teeth}
          selectedTeeth={arch.selectedTeeth}
          toothChartSelectionsByTooth={arch.toothChartSelectionsByTooth}
          extractionDisplay={arch.extractionDisplay}
          splintedLinks={arch.splintedLinks}
          wingTeeth={arch.wingTeeth}
        />
      </div>

      {arch.products.length > 0 ? (
        <div className="mt-4 flex w-full flex-col gap-[2px]">
          {arch.products.map((product, index) => (
            <PaperSlipV2ProductBox
              key={`product-${index}`}
              title={product.title}
              teethLabel={product.teethLabel}
            />
          ))}
        </div>
      ) : null}

      {arch.products.map((product, index) => {
        const statusBoxProps = buildVirtualSlipStatusBoxProps(
          product.extractionDisplay,
          product.arch,
          { apiProduct: product.apiProduct },
        );
        if (!statusBoxProps) return null;
        return (
          <div key={`status-${index}`} className="mt-[2.54px] w-full origin-top scale-[0.95]">
            <VirtualSlipExtractionStatusBoxes boxProps={statusBoxProps} />
          </div>
        );
      })}

      {arch.opposing ? <VirtualSlipOpposingSection opposing={arch.opposing} /> : null}
    </section>
  );
}

/**
 * Figma detail grid: Verdana 12.0286px / 22px, columns ~176px,
 * value right | label center | value left, row pitch 27px.
 */
function PaperSlipV2DetailGrid({ rows }: { rows: DetailGridRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div
      className="mx-auto grid w-[550.05px] grid-cols-[176.02px_176.02px_176.02px] justify-center"
      style={{ rowGap: 4 }}
    >
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <div
            className="h-[23px] text-right font-normal text-[#4C4D55]"
            style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "22px", letterSpacing: "-0.02em" }}
          >
            {row.maxillary || "\u00a0"}
          </div>
          <div
            className="h-[23px] text-center font-bold text-[#4C4D55]"
            style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "22px", letterSpacing: "-0.02em" }}
          >
            {formatDetailLabel(row.label)}
          </div>
          <div
            className="h-[23px] text-left font-normal text-[#4C4D55]"
            style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "22px", letterSpacing: "-0.02em" }}
          >
            {row.mandibular || "\u00a0"}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaperSlipV2LabelValueColumn({ rows }: { rows: LabelValueRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-[7.52px] gap-y-0.5">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <span
            className="font-bold text-[#4C4D55]"
            style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "normal", letterSpacing: "-0.02em" }}
          >
            {row.label}:
          </span>
          <span
            className="font-normal text-[#4C4D55]"
            style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "normal", letterSpacing: "-0.02em" }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaperSlipV2ImplantPanel({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  const implants = [
    ...(slip.vm.arches.maxillary?.products ?? []),
    ...(slip.vm.arches.mandibular?.products ?? []),
  ]
    .filter((product) => product.isImplant)
    .flatMap((product) => product.implants);

  const groups = groupVirtualSlipImplants(implants);
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const header = formatImplantAccordionLabel(group.toothNumbers, group.retentionHeader);
        const fields: LabelValueRow[] = [];
        const maybePush = (label: string, value: string) => {
          if (value && value.trim()) fields.push({ label, value: value.trim() });
        };
        maybePush("Implant Brand", group.brand);
        maybePush("Implant Platform", group.platform);
        maybePush("Implant Size", group.size);
        maybePush("Abutment Type", group.abutmentType);
        maybePush("Abutment Option", group.abutmentOption);

        const retentionType = group.retentionHeader?.trim() || "";

        return (
          <div key={group.id}>
            {header ? (
              <div
                className="mb-0.5 font-bold text-[#4C4D55]"
                style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "normal", letterSpacing: "-0.02em" }}
              >
                {header}
              </div>
            ) : null}
            <PaperSlipV2LabelValueColumn rows={fields} />
            {retentionType ? (
              <div className="mt-0.5 grid grid-cols-[max-content_1fr] gap-x-[7.52px]">
                <span
                  className="font-bold text-[#4C4D55]"
                  style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "normal", letterSpacing: "-0.02em" }}
                >
                  Retention Type:
                </span>
                <span
                  className="font-normal text-[#4C4D55]"
                  style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.0286, lineHeight: "normal", letterSpacing: "-0.02em" }}
                >
                  {retentionType}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function hasImplantPanel(slip: PaperSlipPrintV2SlipVM): boolean {
  const implants = [
    ...(slip.vm.arches.maxillary?.products ?? []),
    ...(slip.vm.arches.mandibular?.products ?? []),
  ]
    .filter((product) => product.isImplant)
    .flatMap((product) => product.implants);
  return groupVirtualSlipImplants(implants).length > 0;
}

/** Figma notes: #FFE3E3, radius 7px, padding 15px, Arial 12/14. */
function PaperSlipV2Notes({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  const notes = slip.vm.notes.trim();
  if (!notes) return null;

  const isRush = slip.vm.header.isRush;

  return (
    <section
      className="mx-auto flex w-[570px] items-center justify-center px-[15px] py-[15px]"
      style={{
        background: isRush ? "#FFE3E3" : "#FFFFFF",
        borderRadius: 7,
        border: isRush ? undefined : "1px solid #D3D3D3",
        minHeight: 72,
      }}
    >
      <p
        className="w-full whitespace-pre-line font-normal text-[#4C4D55]"
        style={{ fontFamily: "Arial, sans-serif", fontSize: 12, lineHeight: "14px" }}
      >
        {truncateTextToMaxLines(truncateTextToMaxWords(notes, 100), 8)}
      </p>
    </section>
  );
}

function PaperSlipV2RelatedSlips({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  const related = slip.vm.relatedSlips ?? [];
  if (related.length === 0) return null;

  return (
    <div className="flex w-full items-center gap-[6px] px-[15px]">
      <span
        className="shrink-0 font-bold text-[#0A0B0E]"
        style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 10, lineHeight: "12px" }}
      >
        Related slips in this case
      </span>
      <div className="flex flex-wrap gap-[6px]">
        {related.map((relatedSlip) => {
          const isCurrent = relatedSlip === slip.vm.header.slipNumber;
          return (
            <span
              key={relatedSlip}
              className="inline-flex h-[21px] min-w-[76px] items-center justify-center rounded-[10px] border px-1 text-center font-semibold"
              style={{
                fontFamily: "Inter, Arial, sans-serif",
                fontSize: 8.5,
                lineHeight: "10px",
                background: isCurrent ? "#0A0B0E" : "#FFFFFF",
                borderColor: isCurrent ? "#0A0B0E" : "#B3B3B3",
                color: isCurrent ? "#FFFFFF" : "#1F2129",
              }}
            >
              {relatedSlip}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PaperSlipV2Footer({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  const { extras } = slip;
  return (
    <div className="flex w-full flex-col items-stretch gap-[5px]">
      <div className="mx-auto h-px w-[586px] bg-[#B3B3B3]" />

      <PaperSlipV2RelatedSlips slip={slip} />

      <div className="flex w-full justify-end px-[15px] pt-[20px]">
        <div className="relative w-[206px]">
          <div className="h-px w-full bg-[#B3B3B3]" />
          <div
            className="mt-[7px] text-center font-normal text-[#0A0B0E]"
            style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 7, lineHeight: "8px" }}
          >
            Doctor&apos;s Signature | License # {extras.doctorLicenseNumber || ""}
          </div>
        </div>
      </div>

      {(extras.labPhone || extras.labEmail) && (
        <div
          className="flex h-[28px] items-center justify-center px-[15px] text-center font-normal text-[#0A0B0E]"
          style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 7, lineHeight: "8px" }}
        >
          {extras.labPhone ? `Lab Phone: ${extras.labPhone}` : ""}
          {extras.labPhone && extras.labEmail ? "  •  " : ""}
          {extras.labEmail ? `Email: ${extras.labEmail}` : ""}
        </div>
      )}
    </div>
  );
}

function PaperSlipV2CasePanBlock({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  return (
    <div className="flex w-full flex-col items-stretch gap-[5px]">
      <div
        className="mx-auto h-px w-[586px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #B3B3B3 0, #B3B3B3 4px, transparent 4px, transparent 8px)",
        }}
      />
      <div
        className="flex h-[8px] items-center justify-center font-normal text-[#0A0B0E]"
        style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 7, lineHeight: "8px" }}
      >
        CASE PAN #
      </div>
      <div className="flex h-[116px] items-center justify-center gap-[10px]">
        {slip.extras.qrCodeUrl ? (
          <img
            alt="Paper slip QR code"
            className="h-[106.73px] w-[120.41px] shrink-0 object-contain"
            src={slip.extras.qrCodeUrl}
          />
        ) : (
          <div className="flex h-[106.73px] w-[120.41px] shrink-0 items-center justify-center border border-dashed border-[#B3B3B3] text-[10px] text-[#9ca3af]">
            QR
          </div>
        )}
        <div
          className="min-w-[177px] text-center font-normal text-[#0A0B0E]"
          style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 96, lineHeight: "116px" }}
        >
          {slip.vm.header.panNumber || ""}
        </div>
      </div>
    </div>
  );
}

/** Figma header row: Arial 11.7002 / 14.2073, gap 7.52px. */
function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[15.88px] items-center gap-[7.52px]">
      <span
        className="shrink-0 font-bold text-black"
        style={{ fontFamily: "Arial, sans-serif", fontSize: 11.7002, lineHeight: "12px" }}
      >
        {label}
      </span>
      <span
        className="font-normal text-black"
        style={{ fontFamily: "Arial, sans-serif", fontSize: 14.2073, lineHeight: "15px" }}
      >
        {value}
      </span>
    </div>
  );
}

function PaperSlipV2Section({ section }: { section: PaperSlipPrintV2SectionModel }) {
  const slip = section.slip;
  const header = slip.vm.header;
  const detailRows = buildDetailGrid(slip);
  const genderAge = [header.gender, header.age].filter(Boolean).join(" / ");
  const showImplant = hasImplantPanel(slip);
  const implantProductRows = showImplant ? buildImplantProductRows(slip) : [];
  const dueDisplay = [header.dueDate, header.deliveryTime].filter(Boolean).join(" @ ");

  return (
    <article
      className="paper-slip-v2-section relative mx-auto flex flex-col items-center overflow-hidden"
      data-slip-id={slip.slipId}
      style={{
        width: SLIP_W,
        height: SLIP_H,
        background: "#1162A8",
        border: "1px solid #7F7F7F",
        paddingTop: BLUE_TOP,
        gap: 5,
      }}
    >
      <div
        className="flex w-full flex-1 flex-col items-center overflow-hidden bg-white"
        style={{ gap: 5 }}
      >
        {/* Brand lockup — Verdana 18 / 12.6 */}
        <div className="flex h-[20.48px] w-full items-center justify-between px-[15px]">
          <div className="flex items-center gap-[7.79px]">
            {header.labLogo ? (
              <img
                alt=""
                className="h-[11.76px] w-[21.29px] object-contain"
                src={header.labLogo}
              />
            ) : null}
            <h1
              className="font-bold text-black"
              style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 18, lineHeight: "20px", letterSpacing: "-0.02em" }}
            >
              {header.labName || "Paper Slip"}
            </h1>
            {slip.extras.labAddress ? (
              <span
                className="font-normal text-black"
                style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 12.6, lineHeight: "20px", letterSpacing: "-0.02em" }}
              >
                {slip.extras.labAddress}
              </span>
            ) : null}
          </div>
        </div>

        {/* Two-column header meta — gap 4.18 between rows */}
        <div className="flex w-full justify-center gap-[10px] py-[5px]">
          <div className="flex w-[299.19px] flex-col items-start" style={{ gap: 4.18 }}>
            <HeaderRow label="Code:" value={slip.extras.labCode || ""} />
            <HeaderRow label="Office" value={header.officeName || ""} />
            <HeaderRow label="Dr:" value={header.doctorName || ""} />
            <HeaderRow label="Patient:" value={header.patientName || ""} />
            <HeaderRow label="Gender:" value={genderAge} />
          </div>
          <div className="flex w-[218.52px] flex-col items-start" style={{ gap: 4.18 }}>
            <HeaderRow label="Case #:" value={header.caseNumber} />
            <HeaderRow label="Slip #:" value={header.slipNumber} />
            <HeaderRow label="Location:" value={header.location || ""} />
            <HeaderRow label="Pick up date:" value={header.pickupDate || ""} />
            <HeaderRow label="Due date" value={dueDisplay} />
          </div>
        </div>

        {/* Arch charts — Figma row, padding 0 15 15, gap 20 */}
        <div className="flex w-full justify-center gap-[20px] px-[15px] pb-[15px]">
          <PaperSlipV2ArchColumn arch={slip.vm.arches.maxillary} title="MAXILLARY" />
          <PaperSlipV2ArchColumn arch={slip.vm.arches.mandibular} title="MANDIBULAR" />
        </div>

        {showImplant ? (
          <div className="flex w-full justify-center gap-[40px] px-[15px]">
            <PaperSlipV2LabelValueColumn rows={implantProductRows} />
            <PaperSlipV2ImplantPanel slip={slip} />
          </div>
        ) : (
          <PaperSlipV2DetailGrid rows={detailRows} />
        )}

        {showImplant ? (
          <p
            className="px-[15px] text-center italic text-[#4C4D55]"
            style={{ fontFamily: "Arial, sans-serif", fontSize: 11, lineHeight: "14px" }}
          >
            Scan QR / open virtual slip for advanced configuration details.
          </p>
        ) : null}

        <PaperSlipV2Notes slip={slip} />
        <PaperSlipV2Footer slip={slip} />
        <PaperSlipV2CasePanBlock slip={slip} />
      </div>
    </article>
  );
}

function sharedPrintChromeCss(): string {
  return `
        .paper-slip-v2-section,
        .paper-slip-v2-section * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .paper-slip-v2-arch-chart {
          margin-bottom: 4px;
          overflow: hidden;
          width: 100%;
        }
        .paper-slip-v2-arch-chart > div {
          max-width: 100% !important;
          transform: scale(1.12);
          transform-origin: top center;
          margin-bottom: -6%;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
            max-height: none !important;
            overflow: hidden !important;
          }

          main {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            background: #ffffff !important;
            display: block !important;
          }
        }
  `;
}

function fullPagePrintCss(): string {
  return `
        @page {
          size: auto;
          margin: 0;
        }

        ${sharedPrintChromeCss()}

        .paper-slip-v2-sheet {
          width: ${SLIP_W}px;
          margin-left: auto;
          margin-right: auto;
        }

        @media print {
          /* Fixed Letter frame + overflow clip keeps scaled slip on exactly 1 page. */
          .paper-slip-v2-sheet {
            box-sizing: border-box;
            width: ${FULL_PAGE_W_IN}in !important;
            max-width: 100% !important;
            height: ${FULL_PAGE_H_IN}in !important;
            max-height: ${FULL_PAGE_H_IN}in !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            position: relative !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .paper-slip-v2-sheet + .paper-slip-v2-sheet {
            break-before: page !important;
            page-break-before: always !important;
          }

          .paper-slip-v2-section {
            box-shadow: none !important;
            box-sizing: border-box !important;
            width: ${SLIP_W_MM}mm !important;
            height: ${SLIP_H_MM}mm !important;
            max-width: none !important;
            max-height: none !important;
            overflow: hidden !important;
            position: relative !important;
            flex-shrink: 0;
            transform: scale(${FULL_SCALE}) !important;
            transform-origin: top center !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
  `;
}

function halfPagePrintCss(): string {
  return `
        /* Landscape Letter: two portrait slips side by side; cut on the dashed line. */
        @page {
          size: letter landscape;
          margin: 0;
        }

        ${sharedPrintChromeCss()}

        .paper-slip-v2-landscape-page {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 11in;
          max-width: 100%;
          margin: 0 auto 24px;
          background: #fff;
          border: 1px solid #d4d4d8;
        }

        .paper-slip-v2-half-slot {
          box-sizing: border-box;
          width: 50%;
          min-height: ${HALF_SLOT_H_IN}in;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 8px;
        }

        .paper-slip-v2-half-slot + .paper-slip-v2-half-slot {
          border-left: 1px dashed #9ca3af;
        }

        .paper-slip-v2-half-slot .paper-slip-v2-section {
          transform: scale(${HALF_SCALE});
          transform-origin: center center;
          flex-shrink: 0;
        }

        @media print {
          .paper-slip-v2-landscape-page {
            box-sizing: border-box;
            width: 11in !important;
            height: 8.5in !important;
            max-height: 8.5in !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .paper-slip-v2-landscape-page + .paper-slip-v2-landscape-page {
            break-before: page !important;
            page-break-before: always !important;
          }

          .paper-slip-v2-half-slot {
            width: ${HALF_SLOT_W_IN}in !important;
            height: ${HALF_SLOT_H_IN}in !important;
            max-height: ${HALF_SLOT_H_IN}in !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .paper-slip-v2-half-slot .paper-slip-v2-section {
            box-shadow: none !important;
            box-sizing: border-box !important;
            width: ${SLIP_W_MM}mm !important;
            height: ${SLIP_H_MM}mm !important;
            overflow: hidden !important;
            position: relative !important;
            transform: scale(${HALF_SCALE}) !important;
            transform-origin: center center !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
  `;
}

export function PaperSlipPrintV2Document({
  sections,
  layout = "full",
}: {
  sections: PaperSlipPrintV2SectionModel[];
  layout?: PaperSlipPrintLayout;
}) {
  const isHalf = layout === "half";
  const halfPages = isHalf ? chunkPaperSlipSectionsForHalfPage(sections) : [];

  return (
    <>
      <style>{isHalf ? halfPagePrintCss() : fullPagePrintCss()}</style>
      <main
        data-print-layout={layout}
        className="flex flex-col items-center gap-6 bg-[#f4f4f5] p-4 print:gap-0 print:bg-white print:p-0"
      >
        {isHalf
          ? halfPages.map((pair, pageIndex) => (
              <div
                key={`half-page-${pair[0]?.key ?? pageIndex}`}
                className="paper-slip-v2-landscape-page"
              >
                <div className="paper-slip-v2-half-slot">
                  {pair[0] ? <PaperSlipV2Section section={pair[0]} /> : null}
                </div>
                <div className="paper-slip-v2-half-slot">
                  {pair[1] ? <PaperSlipV2Section section={pair[1]} /> : null}
                </div>
              </div>
            ))
          : sections.map((section) => (
              <div key={section.key} className="paper-slip-v2-sheet">
                <PaperSlipV2Section section={section} />
              </div>
            ))}
      </main>
    </>
  );
}
