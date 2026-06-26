"use client";

import type { PaperSlipPrintSectionModel } from "@/app/paper-slip/print/page-helpers";
import type {
  PaperSlipArchVM,
  PaperSlipCallout,
  PaperSlipDetailRow,
  PaperSlipOpposingVM,
  PaperSlipPrintableSlipVM,
} from "@/lib/paper-slip-print-view-model";
import { getPaperSlipCalloutVisual } from "@/lib/paper-slip-callout-layout";
import { truncateTextToMaxLines } from "@/lib/paper-slip-notes-display";
import { VirtualSlipToothChart } from "@/components/virtual-slip/VirtualSlipToothChart";

// Canonical row order down the center column of the detail grid, matching the
// Figma paper-slip reference. Labels here must match the `label` values emitted
// by buildDetailFields in the view-model.
// General fields only — implant/abutment fields are rendered in the right panel.
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

function formatCalloutTeeth(callout: PaperSlipCallout): string {
  if (callout.source === "missing" && callout.teethNumbers.length === 0) {
    return "";
  }
  if (callout.teethNumbers.length === 0) return "";
  return `#${callout.teethNumbers.join(",")}`;
}


/** Prominent product box: "{product label}" with the selected teeth below,
 *  matching the reference (e.g. "Stay plate 4 teeth to replace · #7,8,9,10").
 *  When subtitle is provided it replaces the teeth line (used for "All teeth missing"). */
function PaperSlipProductBox({ callout, subtitle }: { callout: PaperSlipCallout; subtitle?: string }) {
  const teeth = callout.teethNumbers.length > 0 ? `#${callout.teethNumbers.join(",")}` : "";
  const secondLine = subtitle ?? teeth;
  return (
    <div className="rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2 text-center text-[#4c4d55]">
      <div className="text-[13px] font-medium leading-tight">{callout.label}</div>
      {secondLine ? <div className="text-[12px] leading-tight">{secondLine}</div> : null}
    </div>
  );
}

/** One callout chip: tooth image sits outside-left, overlapping the box edge.
 *  The wrapper uses overflow-visible so the image is never clipped. */
function PaperSlipCalloutChip({ callout }: { callout: PaperSlipCallout }) {
  const { icon } = getPaperSlipCalloutVisual(callout.source);
  const teeth = formatCalloutTeeth(callout);
  const hasIcon = icon != null && callout.iconUrl != null;
  // Image is 40px wide, sits halfway outside: 20px overlap into the box.
  const imgW = 40;
  const overlap = 20;

  return (
    // overflow-visible ensures the absolutely-placed image is never cropped.
    <div className="relative overflow-visible" style={{ marginLeft: hasIcon ? imgW - overlap : 0 }}>
      {hasIcon ? (
        <img
          alt=""
          aria-hidden
          src={callout.iconUrl!}
          className="absolute z-10 object-contain"
          style={{
            left: -(imgW - overlap),
            top: "50%",
            transform: "translateY(-50%)",
            width: imgW,
            height: 60,
            filter: "drop-shadow(0.75px 2.62px 2.99px rgba(35,31,32,0.15))",
          }}
        />
      ) : null}
      <div
        className="flex flex-col items-center justify-center border border-[#D3D3D3] bg-white"
        style={{
          borderRadius: 10,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: hasIcon ? overlap + 8 : 16,
          paddingRight: 16,
          minHeight: 56,
          minWidth: 100,
        }}
      >
        <span
          style={{
            fontFamily: "Verdana, Arial, sans-serif",
            fontSize: 11,
            fontWeight: 400,
            lineHeight: 1.3,
            textAlign: "center",
            letterSpacing: "-0.02em",
            color: "#666666",
            display: "block",
            whiteSpace: "nowrap",
          }}
        >
          {callout.label}
        </span>
        {teeth ? (
          <span
            style={{
              fontFamily: "Verdana, Arial, sans-serif",
              fontSize: 10,
              fontWeight: 400,
              lineHeight: 1.3,
              textAlign: "center",
              letterSpacing: "-0.02em",
              color: "#666666",
              display: "block",
              marginTop: 4,
            }}
          >
            {teeth}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** One row of callout chips, side by side, centered. */
function PaperSlipStatusRow({ callouts }: { callouts: PaperSlipCallout[] }) {
  if (callouts.length === 0) return null;
  return (
    <div className="mt-3 flex flex-row items-center justify-center gap-6 px-6">
      {callouts.map((callout, index) => (
        <PaperSlipCalloutChip key={`${callout.label}-${index}`} callout={callout} />
      ))}
    </div>
  );
}

/** "Opposing" block: opposite-jaw impression + opposite-extraction callouts,
 *  shown under an arch that has no direct products (mirrors the virtual slip). */
function PaperSlipOpposingBlock({ opposing }: { opposing: PaperSlipOpposingVM }) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-center text-[12px] font-medium tracking-[-0.02em] text-[#7f7f7f]">
        Opposing
      </div>
      <PaperSlipStatusRow callouts={opposing.callouts} />
      {opposing.impression ? (
        <div className="mt-2 flex items-center justify-center gap-2 text-[13px] text-[#4c4d55]">
          <span className="font-bold">Impression:</span>
          <span>{opposing.impression}</span>
        </div>
      ) : null}
    </div>
  );
}

/** A single arch column: the title, the read-only tooth chart, and its
 *  product/missing/extraction callouts. Detail rows are rendered separately in
 *  the shared three-column grid below the two charts. When the arch has no
 *  products but has opposing work, the opposing block fills the column. */
function PaperSlipArchColumn({
  title,
  arch,
  opposing,
}: {
  title: string;
  arch: PaperSlipArchVM | null | undefined;
  opposing?: PaperSlipOpposingVM | null;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c4d55]">
        {title}
      </div>
      {arch ? (
        <>
          <div className="scale-[1.2] origin-top">
            <VirtualSlipToothChart
              arch={arch.arch}
              selectedTeeth={arch.selectedTeeth}
              teeth={arch.teeth}
              toothChartSelectionsByTooth={arch.toothChartSelectionsByTooth}
              splintedLinks={arch.splintedLinks}
            />
          </div>
          {arch.productCallouts.length > 0 ? (
            <div className="mt-2 flex flex-col items-stretch gap-2">
              {arch.productCallouts.map((callout, index) => (
                <PaperSlipProductBox
                  key={`product-${callout.label}-${index}`}
                  callout={callout}
                  subtitle={arch.allMissing ? "All teeth missing" : undefined}
                />
              ))}
            </div>
          ) : null}
          <PaperSlipStatusRow callouts={arch.callouts} />
          {opposing ? <PaperSlipOpposingBlock opposing={opposing} /> : null}
        </>
      ) : opposing ? (
        <PaperSlipOpposingBlock opposing={opposing} />
      ) : (
        <div className="rounded-[8px] border border-dashed border-[#e5e7eb] px-4 py-10 text-center text-[11px] text-[#9ca3af]">
          No {title.toLowerCase()} products
        </div>
      )}
    </section>
  );
}

/** Two-column label → value grid, left-aligned.
 *  Bold label on the left, plain value on the right.
 *  When both arches have a value for the same label, they are joined with " / ". */
function PaperSlipDetailGrid({ rows, noTopMargin }: { rows: DetailGridRow[]; noTopMargin?: boolean }) {
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

/** Right-side implant panel shown when the arch has implant_retention products.
 *  Renders one block per product: a bold "#teeth RetentionType" header followed
 *  by Implant Brand / Platform / Size / Abutment Type / Option rows. */
function PaperSlipImplantPanel({ rows }: { rows: PaperSlipDetailRow[] }) {
  const allGroups = rows
    .filter((r) => r.kind === "implant_retention")
    .flatMap((r) => r.implantGroups)
    .filter((g) => g.fields.length > 0 || g.toothNumbers.length > 0 || g.retentionHeader);

  if (allGroups.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {allGroups.map((group, i) => {
        const teethStr = group.toothNumbers.length > 0
          ? group.toothNumbers.map((n) => `#${n}`).join(", ") + " "
          : "";
        const header = `${teethStr}${group.retentionHeader}`.trim();
        return (
          <div key={i}>
            {header ? (
              <div className="mb-1 text-[13px] font-bold text-[#2f3542]">{header}</div>
            ) : null}
            <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-[6px] text-[13px]">
              {group.fields.map((field) => (
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
        <p
          key={`${slip.slipId}-note-${index}`}
          className={`whitespace-pre-line ${index > 0 ? "mt-1" : ""}`}
        >
          {truncateTextToMaxLines(note, 4)}
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

      {/* Signature line: short rule on the right, with clear space above so it
          doesn't crowd the related-slips pills. */}
      <div className="mt-8 flex justify-end">
        <div className="w-[260px] flex flex-col items-end">
          <div className="w-[220px] border-t border-[#d6d6d6] pt-[10px] text-center font-sans text-[9px] font-normal leading-[11px] text-[#0A0B0E]">
            Doctor&apos;s Signature | License # {slip.header.doctorLicenseNumber || ""}
          </div>
        </div>
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
    <section className="pt-4">
      {/* Even short-dash tear line (CSS border-dashed renders long, sparse dashes
          at full page width, so use a repeating gradient for consistent dashes). */}
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
        <div className="text-center font-sans text-[96px] font-normal leading-[100%] tracking-[0] text-[#111827]">
          {slip.header.casePanNumber || ""}
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
    <div className="flex min-h-[16px] items-center gap-[12px] [font-family:Arial,sans-serif]">
      <span
        className={`${labelWidthClass} shrink-0 text-[11.7002px] font-bold leading-[12px] text-black`}
      >
        {label}
      </span>
      <span className="text-[14.2073px] font-normal leading-[15px] text-black">
        {value}
      </span>
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

      <div className="flex flex-1 flex-col gap-2 px-7 py-3">
        {/* Header: brand lockup + two info columns */}
        <header className="space-y-1">
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

          <div className="flex justify-center py-[2px]">
            <div className="flex w-full max-w-[680px] items-start justify-between gap-[28px] px-[18px]">
              <div className="flex min-h-[80px] w-[360px] flex-col items-start gap-[4px]">
                <HeaderRow label="Code:" value={slip.header.labCode || ""} />
                <HeaderRow label="Office" value={slip.header.officeName || ""} />
                <HeaderRow label="Dr:" value={slip.header.doctorName || ""} />
                <HeaderRow label="Patient:" value={slip.header.patientName || ""} />
                <HeaderRow label="Gender:" value={genderAge} />
              </div>
              <div className="flex min-h-[80px] w-[290px] flex-col items-start gap-[4px]">
                <HeaderRow label="Case #:" value={slip.caseNumber} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Slip #:" value={slip.slipNumber} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Location:" value={slip.header.locationName || ""} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Pick up date:" value={slip.header.pickupDate || ""} labelWidthClass="min-w-[92px]" />
                <HeaderRow label="Due date" value={slip.header.dueDate || ""} labelWidthClass="min-w-[92px]" />
              </div>
            </div>
          </div>
        </header>

        {/* Tooth charts */}
        <div className="grid grid-cols-2 gap-2">
          <PaperSlipArchColumn
            arch={slip.arches.maxillary}
            opposing={slip.opposing.maxillary}
            title="MAXILLARY"
          />
          <PaperSlipArchColumn
            arch={slip.arches.mandibular}
            opposing={slip.opposing.mandibular}
            title="MANDIBULAR"
          />
        </div>

        {/* Detail section: general fields left, implant panel + note right (when present) */}
        {(() => {
          const allDetailRows = [
            ...(slip.arches.maxillary?.detailRows ?? []),
            ...(slip.arches.mandibular?.detailRows ?? []),
          ];
          const hasImplant =
            slip.arches.maxillary?.hasImplantNote || slip.arches.mandibular?.hasImplantNote;

          if (!hasImplant) return <PaperSlipDetailGrid rows={detailRows} />;

          return (
            <div className="mt-2 grid grid-cols-2 gap-4 items-start">
              <div>
                <PaperSlipDetailGrid rows={detailRows} noTopMargin />
              </div>
              <div className="flex flex-col gap-3">
                <PaperSlipImplantPanel rows={allDetailRows} />
                <div className="rounded-[6px] border border-[#d1d5db] px-4 py-3 text-[12px] text-[#4c4d55] leading-relaxed">
                  <span className="font-bold text-[#2f3542]">Note:</span> Scan QR / open virtual slip for implant details, abutment details and advance configuration.
                </div>
              </div>
            </div>
          );
        })()}

        {/* Case summary note */}
        <PaperSlipNotes slip={slip} />

        {/* Related slips + signature + lab contact */}
        <PaperSlipFooter slip={slip} />

        {/* Tear line + QR + case pan — flows directly under the footer (matches
            Figma), no large gap above the tear line. */}
        <PaperSlipCasePanBlock slip={slip} />

        {/* Spacer absorbs the remaining sheet height below the case-pan block so
            the article still fills one A4 page. */}
        <div className="flex-1" />
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
