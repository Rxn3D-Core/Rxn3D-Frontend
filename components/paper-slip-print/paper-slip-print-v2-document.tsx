"use client";

import type {
  PaperSlipPrintV2SectionModel,
  PaperSlipPrintV2SlipVM,
} from "@/lib/paper-slip-print-v2-view-model";
import type { ArchVM } from "@/lib/virtual-slip-view-model";
import { buildVirtualSlipStatusBoxProps } from "@/lib/virtual-slip-extraction-display";
import {
  formatImplantAccordionLabel,
  groupVirtualSlipImplants,
} from "@/lib/virtual-slip-implant-groups";
import { truncateTextToMaxLines } from "@/lib/paper-slip-notes-display";
import { VirtualSlipToothChart } from "@/components/virtual-slip/VirtualSlipToothChart";
import { VirtualSlipExtractionStatusBoxes } from "@/components/virtual-slip/VirtualSlipExtractionStatusBoxes";
import { VirtualSlipOpposingSection } from "@/components/virtual-slip/VirtualSlipOpposingSection";

// Canonical row order for the shared detail grid — matches v1
// (paper-slip-print-document.tsx) so the printed layout is unchanged.
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

/** Collapse an arch's product view-models into a flat label -> value map.
 *  Later products win on label collision (mirrors v1's single-value-per-label). */
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

/** Prominent product box: "{product title}" with the selected teeth below,
 *  matching the v1 reference (e.g. "Stay plate 4 teeth to replace · #7,8,9,10"). */
function PaperSlipV2ProductBox({ title, teethLabel }: { title: string; teethLabel: string }) {
  return (
    <div className="rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2 text-center text-[#4c4d55]">
      <div className="text-[13px] font-medium leading-tight">{title}</div>
      {teethLabel ? <div className="text-[12px] leading-tight">{teethLabel}</div> : null}
    </div>
  );
}

/** A single arch column: read-only tooth chart (driven by the virtual-slip VM),
 *  product boxes, extraction status boxes, and the opposing block. Product detail
 *  fields are rendered separately in the shared grid below the two charts. */
function PaperSlipV2ArchColumn({
  title,
  arch,
}: {
  title: string;
  arch: ArchVM | null | undefined;
}) {
  if (!arch) {
    return (
      <section className="min-w-0">
        <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c4d55]">
          {title}
        </div>
        <div className="rounded-[8px] border border-dashed border-[#e5e7eb] px-4 py-10 text-center text-[11px] text-[#9ca3af]">
          No {title.toLowerCase()} products
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c4d55]">
        {title}
      </div>
      {/* Same shared chart component the on-screen virtual slip uses, with the
          FULL prop set (extractionDisplay / splintedLinks / wingTeeth) that the
          v1 paper slip omitted — this is the fix that makes print match screen. */}
      <div className="scale-[0.9] origin-top">
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
        <div className="mt-2 flex flex-col items-stretch gap-2">
          {arch.products.map((product, index) => (
            <PaperSlipV2ProductBox
              key={`product-${index}`}
              title={product.title}
              teethLabel={product.teethLabel}
            />
          ))}
        </div>
      ) : null}

      {/* Extraction status boxes — reuse the virtual-slip status summary so the
          missing / will-extract / clasp chips match the screen exactly. */}
      {arch.products.map((product, index) => {
        const statusBoxProps = buildVirtualSlipStatusBoxProps(
          product.extractionDisplay,
          product.arch,
          { apiProduct: product.apiProduct },
        );
        if (!statusBoxProps) return null;
        return (
          <div key={`status-${index}`} className="mt-3 origin-top scale-[0.85]">
            <VirtualSlipExtractionStatusBoxes boxProps={statusBoxProps} />
          </div>
        );
      })}

      {arch.opposing ? <VirtualSlipOpposingSection opposing={arch.opposing} /> : null}
    </section>
  );
}

/** Two-column label -> value grid (label / value), matching v1. */
function PaperSlipV2DetailGrid({ rows, noTopMargin }: { rows: DetailGridRow[]; noTopMargin?: boolean }) {
  if (rows.length === 0) return null;

  return (
    <div className={`${noTopMargin ? "" : "mt-3 "}grid grid-cols-[max-content_1fr] gap-x-4 gap-y-[6px] text-[13px]`}>
      {rows.map((row) => {
        const value =
          row.maxillary && row.mandibular
            ? `${row.maxillary} / ${row.mandibular}`
            : row.maxillary || row.mandibular;
        return (
          <div key={row.label} className="contents">
            <div className="font-bold text-[#2f3542] whitespace-nowrap">{row.label}:</div>
            <div className="text-[#4c4d55]">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Right-side implant panel. Groups teeth by identical implant/abutment spec
 *  via the shared virtual-slip grouping, rendered expanded (print can't expand
 *  an accordion). Matches v1's PaperSlipImplantPanel visual. */
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
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const header = formatImplantAccordionLabel(group.toothNumbers, group.retentionHeader);
        const fields: Array<{ label: string; value: string }> = [];
        const maybePush = (label: string, value: string) => {
          if (value && value.trim()) fields.push({ label, value: value.trim() });
        };
        maybePush("Implant Brand", group.brand);
        maybePush("Implant Platform", group.platform);
        maybePush("Implant Size", group.size);
        maybePush("Abutment Type", group.abutmentType);
        maybePush("Abutment Option", group.abutmentOption);

        return (
          <div key={group.id}>
            {header ? (
              <div className="mb-1 text-[13px] font-bold text-[#2f3542]">{header}</div>
            ) : null}
            <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-[6px] text-[13px]">
              {fields.map((field) => (
                <div key={field.label} className="contents">
                  <span className="font-bold text-[#2f3542] whitespace-nowrap">{field.label}:</span>
                  <span className="text-[#4c4d55] whitespace-nowrap">{field.value}</span>
                </div>
              ))}
            </div>
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

/** Case summary / notes block. Rose-tinted for rush cases, plain card otherwise. */
function PaperSlipV2Notes({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  const notes = slip.vm.notes.trim();
  if (!notes) return null;

  const toneClass = slip.vm.header.isRush ? "bg-[#fdeeee]" : "border border-[#e5e7eb] bg-white";

  return (
    <section
      className={`min-h-0 shrink overflow-hidden rounded-[14px] px-5 py-4 text-[14px] leading-6 text-[#2f3542] ${toneClass}`}
    >
      <p className="whitespace-pre-line">{truncateTextToMaxLines(notes, 8)}</p>
    </section>
  );
}

function PaperSlipV2RelatedSlips({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  const related = slip.vm.relatedSlips ?? [];
  if (related.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[13px] font-bold text-[#2f3542]">Related slips in this case</span>
      <div className="flex flex-wrap gap-2">
        {related.map((relatedSlip) => {
          const isCurrent = relatedSlip === slip.vm.header.slipNumber;
          return (
            <span
              key={relatedSlip}
              className={`rounded-full border px-4 py-1 text-[13px] ${
                isCurrent
                  ? "border-[#111827] bg-[#111827] text-white"
                  : "border-[#d6d6d6] bg-white text-[#4c4d55]"
              }`}
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
    <section className="space-y-3">
      <PaperSlipV2RelatedSlips slip={slip} />

      <div className="mt-8 flex justify-end">
        <div className="w-[260px] flex flex-col items-end">
          <div className="w-[220px] border-t border-[#d6d6d6] pt-[10px] text-center font-sans text-[9px] font-normal leading-[11px] text-[#0A0B0E]">
            Doctor&apos;s Signature | License # {extras.doctorLicenseNumber || ""}
          </div>
        </div>
      </div>

      {(extras.labPhone || extras.labEmail) && (
        <div className="text-center text-[11px] text-[#4c4d55]">
          {extras.labPhone ? `Lab Phone: ${extras.labPhone}` : ""}
          {extras.labPhone && extras.labEmail ? "  •  " : ""}
          {extras.labEmail ? `Email: ${extras.labEmail}` : ""}
        </div>
      )}
    </section>
  );
}

/** Dashed tear line followed by the centered QR code + giant case-pan number. */
function PaperSlipV2CasePanBlock({ slip }: { slip: PaperSlipPrintV2SlipVM }) {
  return (
    <section className="pt-4">
      <div
        className="h-px w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #9ca3af 0, #9ca3af 6px, transparent 6px, transparent 12px)",
        }}
      />
      <div className="mt-4 text-center text-[10px] uppercase tracking-[0.14em] text-[#4c4d55]">
        Case Pan #
      </div>
      <div className="mt-3 flex items-center justify-center gap-6">
        {slip.extras.qrCodeUrl ? (
          <img
            alt="Paper slip QR code"
            className="h-[120px] w-[120px] object-contain"
            src={slip.extras.qrCodeUrl}
          />
        ) : (
          <div className="flex h-[120px] w-[120px] items-center justify-center border border-dashed border-[#d6d6d6] text-[11px] text-[#9ca3af]">
            QR
          </div>
        )}
        <div className="text-center font-sans text-[96px] font-normal leading-[100%] tracking-[0] text-[#111827]">
          {slip.vm.header.panNumber || ""}
        </div>
      </div>
    </section>
  );
}

function HeaderRow({
  label,
  value,
  labelWidthClass = "min-w-[88px]",
}: {
  label: string;
  value: string;
  labelWidthClass?: string;
}) {
  return (
    <div className="flex min-h-[16px] items-center gap-[12px]">
      <span className={`${labelWidthClass} shrink-0 text-[11.7002px] font-bold leading-[12px] text-black`}>
        {label}
      </span>
      <span className="text-[14.2073px] font-normal leading-[15px] text-black">{value}</span>
    </div>
  );
}

function PaperSlipV2Section({ section }: { section: PaperSlipPrintV2SectionModel }) {
  const slip = section.slip;
  const header = slip.vm.header;
  const detailRows = buildDetailGrid(slip);
  const genderAge = [header.gender, header.age].filter(Boolean).join(" / ");
  const showImplant = hasImplantPanel(slip);

  return (
    <article
      className={`paper-slip-v2-section relative mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white ${
        section.pageBreakBefore ? "paper-slip-v2-page-break" : ""
      }`}
      data-slip-id={slip.slipId}
    >
      {/* Blue top band */}
      <div className="h-[12px] w-full shrink-0 bg-[#1162A8]" />

      <div className="flex flex-1 flex-col gap-2 px-7 py-3">
        {/* Header: brand lockup + two info columns */}
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            {header.labLogo ? (
              <img
                alt={`${header.labName || "Lab"} logo`}
                className="h-9 w-9 object-contain"
                src={header.labLogo}
              />
            ) : null}
            <h1 className="text-[26px] font-bold leading-none tracking-[-0.02em] text-black">
              {header.labName || "Paper Slip"}
            </h1>
            {slip.extras.labAddress ? (
              <span className="text-[15px] text-black">{slip.extras.labAddress}</span>
            ) : null}
          </div>

          <div className="flex justify-center py-[2px]">
            <div className="flex w-full max-w-[680px] items-start justify-between gap-[28px] px-[18px]">
              <div className="flex min-h-[80px] w-[360px] flex-col items-start gap-[4px]">
                <HeaderRow label="Code:" value={slip.extras.labCode || ""} />
                <HeaderRow label="Office" value={header.officeName || ""} />
                <HeaderRow label="Dr:" value={header.doctorName || ""} />
                <HeaderRow label="Patient:" value={header.patientName || ""} />
                <HeaderRow label="Gender:" value={genderAge} />
              </div>
              <div className="flex min-h-[80px] w-[290px] flex-col items-start gap-[4px]">
                <HeaderRow label="Case #:" value={header.caseNumber} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Slip #:" value={header.slipNumber} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Location:" value={header.location || ""} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Pick up date:" value={header.pickupDate || ""} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Due date" value={header.dueDate || ""} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Delivery time:" value={header.deliveryTime || ""} labelWidthClass="min-w-[92px]" />
              </div>
            </div>
          </div>
        </header>

        {/* Tooth charts */}
        <div className="grid grid-cols-2 gap-2">
          <PaperSlipV2ArchColumn arch={slip.vm.arches.maxillary} title="MAXILLARY" />
          <PaperSlipV2ArchColumn arch={slip.vm.arches.mandibular} title="MANDIBULAR" />
        </div>

        {/* Detail section: general fields left, implant panel + note right (when present) */}
        {showImplant ? (
          <div className="mt-2 grid grid-cols-2 gap-4 items-start">
            <div>
              <PaperSlipV2DetailGrid rows={detailRows} noTopMargin />
            </div>
            <div className="flex flex-col gap-3">
              <PaperSlipV2ImplantPanel slip={slip} />
              <div className="rounded-[6px] border border-[#d1d5db] px-4 py-3 text-[12px] text-[#4c4d55] leading-relaxed">
                <span className="font-bold text-[#2f3542]">Note:</span> Scan QR / open virtual slip for implant details, abutment details and advance configuration.
              </div>
            </div>
          </div>
        ) : (
          <PaperSlipV2DetailGrid rows={detailRows} />
        )}

        {/* Case summary note */}
        <PaperSlipV2Notes slip={slip} />

        {/* Related slips + signature + lab contact */}
        <PaperSlipV2Footer slip={slip} />

        {/* Tear line + QR + case pan */}
        <PaperSlipV2CasePanBlock slip={slip} />

        {/* Spacer absorbs remaining sheet height so the article fills one A4 page. */}
        <div className="flex-1" />
      </div>
    </article>
  );
}

export function PaperSlipPrintV2Document({ sections }: { sections: PaperSlipPrintV2SectionModel[] }) {
  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        .paper-slip-v2-section,
        .paper-slip-v2-section * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .paper-slip-v2-section {
            box-shadow: none !important;
            height: 297mm;
            width: 210mm;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .paper-slip-v2-page-break {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
      <main className="flex flex-col items-center gap-6 bg-[#f4f4f5] p-4 font-sans print:gap-0 print:bg-white print:p-0">
        {sections.map((section) => (
          <PaperSlipV2Section key={section.key} section={section} />
        ))}
      </main>
    </>
  );
}
