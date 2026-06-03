"use client";

import { Children, type ReactNode } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { RushIcon } from "@/components/case-design-center/components/CenterActionIcons";
import type { VirtualSlipHeaderVM } from "@/lib/virtual-slip-view-model";
import { hasDisplayValue } from "@/lib/virtual-slip-display";

/** Inline "Label: Value" pair — omitted when value is empty or N/A. */
function Field({
  label,
  value,
  valueClassName = "text-[#1F2937]",
  allowWrap = false,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  allowWrap?: boolean;
}) {
  if (!hasDisplayValue(value)) return null;

  return (
    <div className={`flex items-center gap-[9px] font-sans ${allowWrap ? "" : "whitespace-nowrap"}`}>
      <span className="shrink-0 text-[12px] text-[#7F7F7F] sm:text-[14px]">{label}:</span>
      <span className={`text-[14px] sm:text-[17px] ${valueClassName} ${allowWrap ? "break-words" : ""}`}>
        {value.trim()}
      </span>
    </div>
  );
}

/** A vertical column of label/value rows; hidden when every row is empty. */
function Column({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter((child) => child != null);
  if (items.length === 0) return null;
  return <div className="flex min-w-0 flex-col gap-[12px] sm:gap-[20px]">{items}</div>;
}

function Avatar({
  src,
  name,
  sizeClass,
}: {
  src: string | null;
  name: string;
  /** Responsive width/height utility classes. */
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
        <span className="text-sm font-bold text-gray-500 sm:text-lg">{initials || "—"}</span>
      )}
    </div>
  );
}

export function VirtualSlipHeader({ header }: { header: VirtualSlipHeaderVM }) {
  const showGenderAge =
    hasDisplayValue(header.gender) || hasDisplayValue(header.age);

  return (
    <div className="bg-white">
      {/* Top logo bar: Office (left) — Lab (right) */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-[#D9D9D9] px-3 py-[10px] sm:px-5">
        <div className="flex min-w-0 items-center gap-[7px]">
          <span className="shrink-0 font-sans text-[14px] font-bold tracking-[-0.02em] text-[#4C4D55] sm:text-[16px]">
            Office:
          </span>
          <div className="relative h-[40px] w-[150px] sm:h-[48px] sm:w-[200px] lg:h-[52px] lg:w-[240px]">
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
        <div className="flex shrink-0 items-center gap-[7px]">
          <span className="font-sans text-[14px] font-bold tracking-[-0.02em] text-[#4C4D55] sm:text-[16px]">
            Lab:
          </span>
          <div className="relative h-[28px] w-[72px] sm:h-[33px] sm:w-[84px]">
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

      {/* Patient info strip: doctor | fields | created by. */}
      <div className="flex flex-wrap items-start justify-between gap-4 border border-[#D9D9D9] px-3 py-[15px] sm:gap-6 sm:px-5 lg:items-center lg:gap-8">
        {/* Doctor */}
        <div className="flex shrink-0 flex-col items-center gap-[7px]">
          <div className="relative">
            <Avatar
              src={header.doctorImage}
              name={header.doctorName || "Doctor"}
              sizeClass="h-[60px] w-[60px] sm:h-[72px] sm:w-[72px] lg:h-[83px] lg:w-[83px]"
            />
            <span className="absolute bottom-0 right-0 rounded-full bg-white p-[2px] text-[#B4B0B0]">
              <Pencil size={11} />
            </span>
          </div>
          {hasDisplayValue(header.doctorName) && (
            <p className="max-w-[120px] text-center font-sans text-[12px] tracking-[-0.02em] text-[#4C4D55] sm:max-w-none sm:text-[13.5px]">
              {header.doctorName.trim()}
            </p>
          )}
        </div>

        {/* Fields — five two-row columns that wrap as space allows */}
        <div className="flex min-w-[240px] flex-1 flex-wrap items-start gap-x-[24px] gap-y-[14px] lg:gap-x-[40px] lg:gap-y-[20px]">
          <Column>
            <Field label="Patient name" value={header.patientName} allowWrap />
            {showGenderAge && (
              <div className="flex flex-wrap items-center gap-x-[24px] gap-y-[12px] sm:gap-x-[36px]">
                <Field label="Gender" value={header.gender} />
                <Field label="Age" value={header.age} />
              </div>
            )}
          </Column>
          <Column>
            <Field label="Slip #" value={header.slipNumber} />
            <Field label="Case #" value={header.caseNumber} valueClassName="text-[#1162A8]" />
          </Column>
          <Column>
            <Field label="Pan #" value={header.panNumber} />
            <Field label="Status" value={header.status} />
          </Column>
          <Column>
            <Field label="Location" value={header.location} allowWrap />
            <Field label="Delivery Time" value={header.deliveryTime} />
          </Column>
          <Column>
            {header.isRush ? (
              <>
                <div className="flex items-center gap-[9px] font-sans">
                  <RushIcon className="h-[18px] w-[18px] shrink-0 sm:h-[20px] sm:w-[20px]" />
                  <Field
                    label="Rush due"
                    value={header.rushDueDate}
                    valueClassName="text-[#CF0202] font-medium"
                  />
                </div>
                <Field label="Normal due" value={header.standardDueDate} />
              </>
            ) : (
              <Field label="Due Date" value={header.dueDate} />
            )}
            <Field label="Pick up date" value={header.pickupDate} />
          </Column>
        </div>

        {/* Created By */}
        {(hasDisplayValue(header.createdByName) || header.createdByImage) && (
          <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:gap-[12px]">
            <Avatar
              src={header.createdByImage}
              name={header.createdByName || "Created"}
              sizeClass="h-[48px] w-[48px] sm:h-[58px] sm:w-[58px]"
            />
            {hasDisplayValue(header.createdByName) && (
              <div className="flex flex-col gap-[3px] font-sans">
                <span className="text-[12px] text-[#7F7F7F] sm:text-[14px]">Created By:</span>
                <span className="text-[14px] text-[#1F2937] sm:text-[17px]">
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
