"use client";

import type { PaperSlipPrintSectionModel } from "@/app/paper-slip/print/page-helpers";
import type {
  PaperSlipArchVM,
  PaperSlipCallout,
  PaperSlipDetailRow,
  PaperSlipPrintableSlipVM,
} from "@/lib/paper-slip-print-view-model";
import { VirtualSlipToothChart } from "@/components/virtual-slip/VirtualSlipToothChart";

// Canonical row order down the center column of the detail grid, matching the
// Figma paper-slip reference. Labels here must match the `label` values emitted
// by buildDetailFields in the view-model.
const DETAIL_ROW_ORDER = [
  "Restoration",
  "Product",
  "Grade",
  "Stage",
  "Teeth shade",
  "Gum shade",
  "Stump shade",
  "Impression",
  "Retention",
  "Implant brand",
  "Implant platform",
  "Implant size",
  "Abutment type",
  "Abutment option",
  "Add ons",
] as const;

interface DetailGridRow {
  label: string;
  maxillary: string;
  mandibular: string;
}

/** Collapse an arch's product detail rows into a flat label -> value map.
 *  Mixed synthetic rows are excluded; later products win on label collision,
 *  which mirrors the single-value-per-label reference layout. */
function fieldMapForArch(arch: PaperSlipArchVM | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!arch) return map;

  for (const row of arch.detailRows) {
    if (row.kind === "mixed") continue;
    for (const field of row.fields) {
      if (field.value) map.set(field.label, field.value);
    }
  }

  return map;
}

/** Build the shared three-column detail grid (maxillary | label | mandibular).
 *  Only labels present on at least one arch are shown, in canonical order. */
function buildDetailGrid(slip: PaperSlipPrintableSlipVM): DetailGridRow[] {
  const maxFields = fieldMapForArch(slip.arches.maxillary);
  const manFields = fieldMapForArch(slip.arches.mandibular);

  return DETAIL_ROW_ORDER.flatMap((label) => {
    const maxillary = maxFields.get(label) ?? "";
    const mandibular = manFields.get(label) ?? "";
    if (!maxillary && !mandibular) return [];
    return [{ label, maxillary, mandibular }];
  });
}

function calloutVisual(source: PaperSlipCallout["source"]): {
  wrapper: string;
  icon: "missing" | "extraction" | null;
} {
  switch (source) {
    case "extraction":
      return { wrapper: "border-[#e5e7eb] bg-white text-[#6b7280]", icon: "extraction" };
    case "missing":
      return { wrapper: "border-[#e5e7eb] bg-white text-[#6b7280]", icon: "missing" };
    case "retention":
    default:
      return { wrapper: "border-[#e5e7eb] bg-white text-[#4c4d55]", icon: null };
  }
}

function formatCalloutTeeth(callout: PaperSlipCallout): string {
  if (callout.source === "missing" && callout.teethNumbers.length === 0) {
    return "All teeth missing";
  }
  if (callout.teethNumbers.length === 0) return "";
  return `#${callout.teethNumbers.join(",")}`;
}

/** Small tooth/✗ glyph that precedes the chip text, matching the reference. */
function CalloutIcon({ kind }: { kind: "missing" | "extraction" }) {
  if (kind === "extraction") {
    return (
      <span className="flex h-[26px] w-[20px] items-center justify-center text-[16px] font-bold leading-none text-[#c0392b]">
        ✗
      </span>
    );
  }
  return <span className="block h-[26px] w-[16px] rounded-[2px] bg-[#e5e7eb]" aria-hidden />;
}

function PaperSlipCalloutChip({ callout }: { callout: PaperSlipCallout }) {
  const { wrapper, icon } = calloutVisual(callout.source);
  const teeth = formatCalloutTeeth(callout);

  return (
    <div className={`flex items-center gap-2 rounded-[8px] border px-3 py-1.5 ${wrapper}`}>
      {icon ? <CalloutIcon kind={icon} /> : null}
      <div className="text-center leading-tight">
        <div className="text-[10px]">{callout.label}</div>
        {teeth ? <div className="text-[10px]">{teeth}</div> : null}
      </div>
    </div>
  );
}

/** A single arch column: the title, the read-only tooth chart, and its
 *  product/missing/extraction callouts. Detail rows are rendered separately in
 *  the shared three-column grid below the two charts. */
function PaperSlipArchColumn({
  title,
  arch,
}: {
  title: string;
  arch: PaperSlipArchVM | null | undefined;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c4d55]">
        {title}
      </div>
      {arch ? (
        <>
          <VirtualSlipToothChart
            arch={arch.arch}
            selectedTeeth={arch.selectedTeeth}
            teeth={arch.teeth}
            toothChartSelectionsByTooth={arch.toothChartSelectionsByTooth}
          />
          <div className="mt-2 flex flex-wrap items-start justify-center gap-2">
            {arch.callouts.map((callout, index) => (
              <PaperSlipCalloutChip key={`${callout.label}-${index}`} callout={callout} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[8px] border border-dashed border-[#e5e7eb] px-4 py-10 text-center text-[11px] text-[#9ca3af]">
          No {title.toLowerCase()} products
        </div>
      )}
    </section>
  );
}

/** Three-column detail grid: maxillary value (left) · bold label (center) ·
 *  mandibular value (right), matching the Figma reference. */
function PaperSlipDetailGrid({ rows }: { rows: DetailGridRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-3 text-[15px]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <div className="text-right text-[#4c4d55]">{row.maxillary}</div>
          <div className="text-center font-bold text-[#2f3542]">{row.label}</div>
          <div className="text-left text-[#4c4d55]">{row.mandibular}</div>
        </div>
      ))}
    </div>
  );
}

/** Case summary / notes block. Rose-tinted for rush cases, plain white card
 *  (with a border) otherwise. */
function PaperSlipNotes({ slip }: { slip: PaperSlipPrintableSlipVM }) {
  if (slip.notes.length === 0) return null;

  const toneClass = slip.isRush
    ? "bg-[#fdeeee]"
    : "border border-[#e5e7eb] bg-white";

  return (
    <section
      className={`min-h-0 shrink overflow-hidden rounded-[14px] px-5 py-4 text-[14px] leading-6 text-[#2f3542] ${toneClass}`}
    >
      {slip.notes.map((note, index) => (
        <p key={`${slip.slipId}-note-${index}`} className={index > 0 ? "mt-1" : ""}>
          {note}
        </p>
      ))}
    </section>
  );
}

function PaperSlipRelatedSlips({ slip }: { slip: PaperSlipPrintableSlipVM }) {
  const related = slip.footer.relatedSlips ?? [];
  if (related.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[13px] font-bold text-[#2f3542]">Related slips in this case</span>
      <div className="flex flex-wrap gap-2">
        {related.map((relatedSlip) => {
          const isCurrent = relatedSlip === slip.slipNumber;
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

function PaperSlipFooter({ slip }: { slip: PaperSlipPrintableSlipVM }) {
  return (
    <section className="space-y-3">
      <PaperSlipRelatedSlips slip={slip} />

      <div className="border-t border-[#d6d6d6] pt-3 text-right text-[12px] text-[#4c4d55]">
        Doctor&apos;s Signature | License # {slip.header.doctorLicenseNumber || ""}
      </div>

      {(slip.footer.labPhone || slip.footer.labEmail) && (
        <div className="text-center text-[11px] text-[#4c4d55]">
          {slip.footer.labPhone ? `Lab Phone: ${slip.footer.labPhone}` : ""}
          {slip.footer.labPhone && slip.footer.labEmail ? "  •  " : ""}
          {slip.footer.labEmail ? `Email: ${slip.footer.labEmail}` : ""}
        </div>
      )}
    </section>
  );
}

/** Dashed tear line followed by the centered QR code + giant case-pan number. */
function PaperSlipCasePanBlock({ slip }: { slip: PaperSlipPrintableSlipVM }) {
  return (
    <section className="border-t border-dashed border-[#9ca3af] pt-4">
      <div className="text-center text-[10px] uppercase tracking-[0.14em] text-[#4c4d55]">
        Case Pan #
      </div>
      <div className="mt-3 flex items-center justify-center gap-6">
        {slip.header.qrCodeUrl ? (
          <img
            alt="Paper slip QR code"
            className="h-[120px] w-[120px] object-contain"
            src={slip.header.qrCodeUrl}
          />
        ) : (
          <div className="flex h-[120px] w-[120px] items-center justify-center border border-dashed border-[#d6d6d6] text-[11px] text-[#9ca3af]">
            QR
          </div>
        )}
        <div className="text-[96px] font-bold leading-none tracking-[-0.04em] text-[#111827]">
          {slip.header.casePanNumber || ""}
        </div>
      </div>
    </section>
  );
}

function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-bold text-black">{label}</span>
      <span className="text-black">{value}</span>
    </div>
  );
}

function PaperSlipSection({ section }: { section: PaperSlipPrintSectionModel }) {
  const slip = section.slip;
  const detailRows = buildDetailGrid(slip);
  const genderAge = [slip.header.gender, slip.header.age].filter(Boolean).join(" / ");

  return (
    <article
      className={`paper-slip-section relative mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white ${
        section.pageBreakBefore ? "paper-slip-page-break" : ""
      }`}
      data-slip-id={slip.slipId}
    >
      {/* Blue top band */}
      <div className="h-[12px] w-full shrink-0 bg-[#1162A8]" />

      <div className="flex flex-1 flex-col gap-3 px-7 py-4">
        {/* Header: brand lockup + two info columns */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            {slip.header.labLogoUrl ? (
              <img
                alt={`${slip.header.labName || "Lab"} logo`}
                className="h-9 w-9 object-contain"
                src={slip.header.labLogoUrl}
              />
            ) : null}
            <h1 className="text-[26px] font-bold leading-none tracking-[-0.02em] text-black">
              {slip.header.labName || "Paper Slip"}
            </h1>
            {slip.header.labAddress ? (
              <span className="text-[15px] text-black">{slip.header.labAddress}</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-10 text-[14px]">
            <div className="space-y-1">
              <HeaderRow label="Code:" value={slip.header.labCode || ""} />
              <HeaderRow label="Office" value={slip.header.officeName || ""} />
              <HeaderRow label="Dr:" value={slip.header.doctorName || ""} />
              <HeaderRow label="Patient:" value={slip.header.patientName || ""} />
              <HeaderRow label="Gender:" value={genderAge} />
            </div>
            <div className="space-y-1">
              <HeaderRow label="Case #:" value={slip.caseNumber} />
              <HeaderRow label="Slip #:" value={slip.slipNumber} />
              <HeaderRow label="Location:" value={slip.header.locationName || ""} />
              <HeaderRow label="Pick up date:" value={slip.header.pickupDate || ""} />
              <HeaderRow label="Due date" value={slip.header.dueDate || ""} />
            </div>
          </div>
        </header>

        {/* Tooth charts */}
        <div className="grid grid-cols-2 gap-8">
          <PaperSlipArchColumn arch={slip.arches.maxillary} title="MAXILLARY" />
          <PaperSlipArchColumn arch={slip.arches.mandibular} title="MANDIBULAR" />
        </div>

        {/* Shared three-column detail grid */}
        <PaperSlipDetailGrid rows={detailRows} />

        {/* Case summary note */}
        <PaperSlipNotes slip={slip} />

        {/* Related slips + signature + lab contact */}
        <PaperSlipFooter slip={slip} />

        {/* Spacer pushes the case-pan block toward the bottom of the page */}
        <div className="flex-1" />

        {/* Tear line + QR + case pan */}
        <PaperSlipCasePanBlock slip={slip} />
      </div>
    </article>
  );
}

export function PaperSlipPrintDocument({ sections }: { sections: PaperSlipPrintSectionModel[] }) {
  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        /* Always print background colors (blue band, pink note, callouts) even
           when the browser's "Background graphics" option is left unchecked. */
        .paper-slip-section,
        .paper-slip-section * {
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

          .paper-slip-section {
            box-shadow: none !important;
            /* Each slip is exactly one A4 sheet; never split across pages. */
            height: 297mm;
            width: 210mm;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Force a fresh page before every slip except the first. */
          .paper-slip-page-break {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
      <main className="flex flex-col items-center gap-6 bg-[#f4f4f5] p-4 font-sans print:gap-0 print:bg-white print:p-0">
        {sections.map((section) => (
          <PaperSlipSection key={section.key} section={section} />
        ))}
      </main>
    </>
  );
}
