"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { VirtualSlipHeaderVM } from "@/lib/virtual-slip-view-model";
import { hasDisplayValue } from "@/lib/virtual-slip-display";
import {
  VirtualSlipLocationAction,
  type VirtualSlipLocationActionProps,
} from "@/components/virtual-slip/VirtualSlipLocationAction";

const HEADER_ICON_BASE = "/icons/virtual-slip-actions";

const FIELD_LABEL =
  "shrink-0 text-[clamp(13px,0.68vw,15px)] font-bold leading-tight text-[#4C4D55]";
const FIELD_VALUE =
  "min-w-0 truncate text-[clamp(13px,0.68vw,15px)] font-normal leading-tight text-[#4C4D55]";
type HeaderField = {
  label: string;
  value: string;
  valueClassName?: string;
  valueNode?: React.ReactNode;
};

/** Label/value rows â€” grid keeps values vertically aligned within each column. */
function Column({ fields }: { fields: HeaderField[] }) {
  return (
    <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-[4px] gap-y-[clamp(3px,0.45vw,7px)] font-sans sm:gap-x-[6px]">
      {fields.map((field) => (
        <div key={field.label} className="contents">
          <span className={`${FIELD_LABEL} whitespace-nowrap`}>{field.label}:</span>
          <span
            className={`${FIELD_VALUE} ${field.valueClassName ?? ""} inline-flex items-center gap-1`}
            title={hasDisplayValue(field.value) ? field.value.trim() : undefined}
          >
            {field.valueNode ?? (hasDisplayValue(field.value) ? field.value.trim() : "\u00A0")}
          </span>
        </div>
      ))}
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
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const showImage = Boolean(src) && !failed;
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full bg-gray-200 ${sizeClass}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-sm font-bold text-gray-500">{initials || "â€”"}</span>
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
  locationAction?: VirtualSlipLocationActionProps;
}

export function VirtualSlipHeader({
  header,
  onPrint,
  onPrintInvoice,
  locationAction,
}: VirtualSlipHeaderProps) {
  return (
    <div className="border border-[#D9D9D9] bg-white">
      <div className="flex items-stretch gap-3 px-3 py-[4px] sm:gap-4 sm:px-5 lg:gap-6">
        {/* Doctor â€” avatar spans top (logos/actions) + bottom (fields) rows */}
        <div className="flex w-[clamp(72px,8vw,120px)] shrink-0 flex-col items-center justify-center gap-[4px] self-stretch py-1">
          <Avatar
            src={header.doctorImage}
            name={header.doctorName || "Doctor"}
            sizeClass="h-[clamp(88px,10.5vw,118px)] w-[clamp(88px,10.5vw,118px)]"
          />
          {hasDisplayValue(header.doctorName) && (
            <p
              className="max-w-[clamp(72px,8vw,120px)] truncate text-center font-sans text-[clamp(11px,0.75vw,13.5px)] font-semibold leading-[1.2] tracking-[-0.02em] text-[#1162A8]"
              title={header.doctorName.trim()}
            >
              {header.doctorName.trim()}
            </p>
          )}
        </div>

        {/* Center: office/actions/lab row + patient field columns */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[#D9D9D9] px-1 py-[6px]">
            <div className="relative h-[40px] w-[clamp(120px,16vw,200px)] shrink-0">
              <Image
                src={header.officeLogo || "/images/practice-logo.png"}
                alt={header.officeName || "Office"}
                fill
                className="object-contain object-center"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <div className="flex shrink-0 items-center gap-[18px]">
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
            </div>

            <div className="relative h-[28px] w-[clamp(64px,8vw,84px)] shrink-0">
              <Image
                src={header.labLogo || "/images/hmci3-logo.png"}
                alt={header.labName}
                fill
                className="object-contain object-center"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-5 items-center gap-x-[clamp(16px,1.4vw,28px)] py-[4px]">
            <Column
              fields={[
                { label: "Pt name", value: header.patientName },
                { label: "Gender", value: header.gender },
                { label: "Age", value: header.age },
              ]}
            />
            <Column
              fields={[
                { label: "Pan", value: header.panNumber },
                {
                  label: "Case",
                  value: header.caseNumber,
                  valueClassName: "font-normal text-[#1162A8]",
                },
                { label: "Slip", value: header.slipNumber },
              ]}
            />
            
            <div className="flex min-w-0 flex-col items-center justify-center gap-y-[clamp(4px,0.5vw,8px)] self-stretch px-1">
              {hasDisplayValue(header.location) ? (
                <p
                  className="w-full min-w-0 truncate px-1 text-center font-sans text-[clamp(13px,0.68vw,15px)] font-bold leading-tight text-[#4C4D55]"
                  title={header.location.trim()}
                >
                  {header.location.trim()}
                </p>
              ) : null}
              {locationAction ? (
                <VirtualSlipLocationAction {...locationAction} />
              ) : null}
            </div>
            <Column
              fields={[
                { label: "Case status", value: header.caseStatus },
                { label: "Slip status", value: header.slipStatus },
              ]}
            />

            <Column
              fields={[
                { label: "Pickup date", value: header.pickupDate },
                {
                  label: "Delivery date",
                  value: header.dueDate,
                  valueClassName: header.isRush ? "text-red-600 font-bold" : undefined,
                  valueNode: header.isRush ? (
                    <>
                      {header.dueDate}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/virtual-slip-center/rush.svg"
                        alt="Rush"
                        width={16}
                        height={16}
                        className="inline-block h-4 w-4 shrink-0 object-contain"
                      />
                    </>
                  ) : undefined,
                },
                { label: "Delivery time", value: header.deliveryTime },
              ]}
            />
          </div>
        </div>

        {/* Created By â€” avatar spans both center rows */}
        {(hasDisplayValue(header.createdByName) || header.createdByImage) && (
          <div className="flex w-[clamp(72px,8vw,120px)] shrink-0 flex-col items-center justify-center gap-[4px] self-stretch py-1">
            <Avatar
              src={header.createdByImage}
              name={header.createdByName || "Created"}
              sizeClass="h-[clamp(88px,10.5vw,118px)] w-[clamp(88px,10.5vw,118px)]"
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
