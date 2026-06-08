"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import { RushIcon } from "@/components/case-design-center/components/CenterActionIcons";
import type { VirtualSlipHeaderVM } from "@/lib/virtual-slip-view-model";
import { hasDisplayValue } from "@/lib/virtual-slip-display";

const HEADER_ICON_BASE = "/icons/virtual-slip-actions";

const FIELD_LABEL =
  "shrink-0 text-[clamp(14px,0.72vw,16px)] font-bold leading-tight text-[#4C4D55]";
const FIELD_VALUE =
  "min-w-0 truncate text-[clamp(14px,0.72vw,16px)] font-normal leading-tight text-[#4C4D55]";
const FIELD_ROW = "flex min-h-[1.15em] min-w-0 items-center gap-[4px] font-sans sm:gap-[6px]";

/** Inline "Label: Value" pair — single line with ellipsis; empty row slot when value missing. */
function Field({
  label,
  value,
  valueClassName = "font-normal text-[#4C4D55]",
  compact = false,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  /** Narrow label column for short IDs (gender, pan, slip, case). */
  compact?: boolean;
}) {
  const labelWidth = compact
    ? "w-[clamp(40px,3.8vw,58px)]"
    : "w-[clamp(52px,5.2vw,96px)]";

  return (
    <div className={FIELD_ROW} title={hasDisplayValue(value) ? value.trim() : undefined}>
      <span className={`${FIELD_LABEL} ${labelWidth}`}>{label}:</span>
      <span className={`${FIELD_VALUE} ${valueClassName}`}>
        {hasDisplayValue(value) ? value.trim() : "\u00A0"}
      </span>
    </div>
  );
}

/** Exactly two field rows — keeps the strip to two lines per column. */
function Column({ row1, row2 }: { row1: ReactNode; row2: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-y-[clamp(8px,1.2vw,16px)]">
      <div className="min-h-[1.15em]">{row1}</div>
      <div className="min-h-[1.15em]">{row2}</div>
    </div>
  );
}

function Avatar({
  src,
  name,
  sizeClass,
}: {
  src: string | null;
  name: string;
  sizeClass: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full bg-gray-200 ${sizeClass}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="text-sm font-bold text-gray-500">{initials || "—"}</span>
      )}
    </div>
  );
}

function HeaderActionButton({
  src,
  label,
  onClick,
}: {
  src: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={!onClick}
      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center transition-opacity hover:opacity-85 disabled:cursor-default disabled:opacity-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden className="h-[38px] w-[38px] object-contain" />
    </button>
  );
}

export interface VirtualSlipHeaderProps {
  header: VirtualSlipHeaderVM;
  onPrint?: () => void;
  onPrintInvoice?: () => void;
  onBackToCaseList?: () => void;
}

export function VirtualSlipHeader({
  header,
  onPrint,
  onPrintInvoice,
  onBackToCaseList,
}: VirtualSlipHeaderProps) {
  const dueDateValue = header.isRush
    ? null
    : [header.dueDate, header.deliveryTime].filter(hasDisplayValue).join(" @ ");

  return (
    <div className="bg-white">
      {/* Top bar: Office (left) — action icons (center) — Lab (right) */}
      <div className="relative flex items-center justify-between border border-[#D9D9D9] px-5 py-[10px]">
        <div className="flex min-w-0 items-center gap-[7px]">
          <span className="shrink-0 font-sans text-[16px] font-bold tracking-[-0.02em] text-[#4C4D55]">
            Office:
          </span>
          <div className="relative h-[52px] w-[240px]">
            <Image
              src={header.officeLogo || "/images/practice-logo.png"}
              alt={header.officeName || "Office"}
              fill
              className="object-contain object-left"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-[18px]">
          <HeaderActionButton
            src={`${HEADER_ICON_BASE}/printer.svg?v=1`}
            label="Print"
            onClick={onPrint}
          />
          <HeaderActionButton
            src={`${HEADER_ICON_BASE}/print-invoice.svg`}
            label="Print invoice"
            onClick={onPrintInvoice}
          />
          <HeaderActionButton
            src={`${HEADER_ICON_BASE}/gobacktoofficereturn.svg`}
            label="Back to case list view"
            onClick={onBackToCaseList}
          />
        </div>

        <div className="flex shrink-0 items-center gap-[7px]">
          <span className="font-sans text-[16px] font-bold tracking-[-0.02em] text-[#4C4D55]">
            Lab:
          </span>
          <div className="relative h-[33px] w-[84px]">
            <Image
              src={header.labLogo || "/images/hmci3-logo.png"}
              alt={header.labName}
              fill
              className="object-contain object-right"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      </div>

      {/* Patient info strip: doctor | five columns (2 rows each) | created by */}
      <div className="flex items-center justify-between gap-3 border border-t-0 border-[#D9D9D9] px-3 py-[8px] sm:gap-4 sm:px-5 lg:gap-6">
        {/* Doctor */}
        <div className="flex w-[clamp(72px,8vw,120px)] shrink-0 flex-col items-center gap-[6px] sm:gap-[8px]">
          <Avatar
            src={header.doctorImage}
            name={header.doctorName || "Doctor"}
            sizeClass="h-[clamp(52px,6.5vw,83px)] w-[clamp(52px,6.5vw,83px)]"
          />
          <div className="flex flex-col items-center gap-[2px] text-center font-sans">
            <span className="text-[clamp(10px,0.65vw,12px)] text-[#7F7F7F]">Doctor</span>
            {hasDisplayValue(header.doctorName) && (
              <p
                className="max-w-[clamp(72px,8vw,120px)] truncate text-[clamp(11px,0.75vw,13.5px)] font-semibold leading-[1.2] tracking-[-0.02em] text-[#1162A8]"
                title={header.doctorName.trim()}
              >
                {header.doctorName.trim()}
              </p>
            )}
          </div>
        </div>

        {/* Field columns — compact width for gender/pan and slip/case (short values) */}
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,0.72fr)_minmax(0,0.62fr)_minmax(0,1.22fr)_minmax(0,1.1fr)] items-center gap-x-[clamp(4px,0.6vw,12px)]">
          <Column
            row1={<Field label="Pt name" value={header.patientName} />}
            row2={<Field label="Age" value={header.age} />}
          />
          <Column
            row1={<Field label="Gender" value={header.gender} compact />}
            row2={<Field label="Pan #" value={header.panNumber} compact />}
          />
          <Column
            row1={<Field label="Slip #" value={header.slipNumber} compact />}
            row2={
              <Field
                label="Case #"
                value={header.caseNumber}
                valueClassName="font-normal text-[#1162A8]"
                compact
              />
            }
          />
          <Column
            row1={<Field label="Location" value={header.location} />}
            row2={<Field label="Status" value={header.status} />}
          />
          <Column
            row1={
              header.isRush && hasDisplayValue(header.rushDueDate) ? (
                <div
                  className={`${FIELD_ROW} min-w-0`}
                  title={header.rushDueDate.trim()}
                >
                  <RushIcon className="h-[clamp(14px,1.1vw,18px)] w-[clamp(14px,1.1vw,18px)] shrink-0" />
                  <span className={`${FIELD_LABEL} w-[clamp(52px,5.2vw,96px)]`}>Rush due:</span>
                  <span className="min-w-0 truncate text-[clamp(10px,0.72vw,16px)] font-medium leading-tight text-[#CF0202]">
                    {header.rushDueDate.trim()}
                  </span>
                </div>
              ) : (
                <Field label="Due Date" value={dueDateValue ?? ""} />
              )
            }
            row2={
              header.isRush ? (
                <Field label="Normal due" value={header.standardDueDate} />
              ) : (
                <Field label="Pick up date" value={header.pickupDate} />
              )
            }
          />
        </div>

        {/* Created By */}
        {(hasDisplayValue(header.createdByName) || header.createdByImage) && (
          <div className="flex w-[clamp(72px,8vw,120px)] shrink-0 flex-col items-center gap-[6px] sm:gap-[8px]">
            <Avatar
              src={header.createdByImage}
              name={header.createdByName || "Created"}
              sizeClass="h-[clamp(40px,5vw,58px)] w-[clamp(40px,5vw,58px)]"
            />
            {hasDisplayValue(header.createdByName) && (
              <div className="flex flex-col items-center gap-[2px] text-center font-sans">
                <span className="text-[clamp(10px,0.65vw,12px)] text-[#7F7F7F]">Created By:</span>
                <span
                  className="max-w-[clamp(72px,8vw,120px)] truncate text-[clamp(11px,0.75vw,13.5px)] font-semibold leading-[1.2] text-[#4C4D55]"
                  title={header.createdByName.trim()}
                >
                  {header.createdByName.trim()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
