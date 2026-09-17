"use client";

import type { ArchVM, ProductVM } from "@/lib/virtual-slip-view-model";
import {
  isEditableVirtualSlipImplant,
  isPendingLabRecommendationImplant,
} from "@/lib/virtual-slip-view-model";
import { VirtualSlipToothChart } from "./VirtualSlipToothChart";
import { VirtualSlipProductSummary } from "./VirtualSlipProductSummary";
import { VirtualSlipOpposingSection } from "./VirtualSlipOpposingSection";

const RESUME_ICON = "/icons/virtual-slip-actions/resume.svg";
const CANCEL_ICON = "/icons/virtual-slip-center/cancel.svg";

export type ArchStatusBanner = {
  /** Display label, e.g. "Upper" / "Lower". */
  label: "Upper" | "Lower";
  variant: "hold" | "cancelled";
  /** Current stage name for hold subtitle, e.g. "Try In". */
  stage?: string | null;
  /** Hold reason text. */
  reason?: string | null;
  /** Other arch label for cancelled subtitle (e.g. "Lower continues"). */
  otherArchLabel?: "Upper" | "Lower" | null;
  onResume?: () => void;
  onCancel?: () => void;
};

/** @deprecated Prefer `statusBanner` with variant "hold". */
export type ArchHoldState = Omit<ArchStatusBanner, "variant"> & {
  variant?: "hold";
};

/** One arch column body: read-only tooth chart + product summaries.
 *  The arch title (MAXILLARY / MANDIBULAR) is rendered by the page; CASE DESIGN CENTER
 *  is absolutely centered over the two-column arch header row.
 *  Hold: cream fill + blue border + resume/cancel (Figma H3b).
 *  Cancelled: pink fill + "history retained" (Figma C3b) — no actions. */
export function VirtualSlipArch({
  data,
  statusBanner,
  holdState,
  onSelectLabImplants,
  onEditLabImplants,
}: {
  data: ArchVM;
  statusBanner?: ArchStatusBanner | null;
  /** @deprecated Use `statusBanner`. */
  holdState?: ArchHoldState | null;
  onSelectLabImplants?: (product: ProductVM) => void;
  onEditLabImplants?: (product: ProductVM) => void;
}) {
  const banner: ArchStatusBanner | null =
    statusBanner ??
    (holdState
      ? { ...holdState, variant: holdState.variant ?? "hold" }
      : null);

  const isOpposingOnly = data.products.length === 0 && data.opposing != null;

  const body = isOpposingOnly ? (
    <>
      <VirtualSlipToothChart
        arch={data.arch}
        teeth={data.teeth}
        selectedTeeth={[]}
        extractionDisplay={data.extractionDisplay}
        splintedLinks={data.splintedLinks}
        wingTeeth={data.wingTeeth}
      />
      {data.opposing && (
        <VirtualSlipOpposingSection opposing={data.opposing} />
      )}
    </>
  ) : (
    <>
      <VirtualSlipToothChart
        arch={data.arch}
        teeth={data.teeth}
        selectedTeeth={data.selectedTeeth}
        toothChartSelectionsByTooth={data.toothChartSelectionsByTooth}
        extractionDisplay={data.extractionDisplay}
        splintedLinks={data.splintedLinks}
        wingTeeth={data.wingTeeth}
      />
      {data.opposing && <VirtualSlipOpposingSection opposing={data.opposing} />}
      {data.products.map((product, i) => {
        const hasPending = product.implants.some(isPendingLabRecommendationImplant);
        const hasEditable = product.implants.some(isEditableVirtualSlipImplant);
        return (
          <VirtualSlipProductSummary
            key={i}
            product={product}
            onSelectLabImplants={
              onSelectLabImplants && hasPending
                ? () => onSelectLabImplants(product)
                : undefined
            }
            onEditLabImplants={
              onEditLabImplants && hasEditable && !hasPending
                ? () => onEditLabImplants(product)
                : undefined
            }
          />
        );
      })}
    </>
  );

  if (!banner) {
    return <section className="min-w-0 flex-1">{body}</section>;
  }

  if (banner.variant === "cancelled") {
    const other = banner.otherArchLabel;
    return (
      <section
        className="min-w-0 flex-1 rounded-sm bg-[#FEE2E2]/90 px-3 pb-3 pt-3"
        aria-label={`${banner.label} cancelled`}
      >
        <div className="mb-3 min-w-0">
          <p className="font-sans text-[18px] font-bold leading-tight text-[#111827]">
            {banner.label} cancelled
          </p>
          <p className="mt-1 font-sans text-[13px] leading-snug text-[#7F1D1D]/80">
            {other
              ? `${banner.label} history retained. ${other} continues.`
              : `${banner.label} history retained.`}
          </p>
        </div>
        {body}
      </section>
    );
  }

  const stage = banner.stage?.trim() || "Stage";
  const reason = banner.reason?.trim() || "On hold";
  const subtitle = `${stage} Paused - ${reason}`;

  return (
    <section
      className="min-w-0 flex-1 rounded-sm border-[3px] border-[#2F80ED] bg-[#FBEFC9]/85 px-3 pb-3 pt-3"
      aria-label={`${banner.label} on hold`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[18px] font-bold leading-tight text-[#111827]">
            {banner.label} on hold
          </p>
          <p className="mt-1 font-sans text-[13px] leading-snug text-[#6B5B3E]">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {banner.onResume ? (
            <button
              type="button"
              aria-label={`Resume ${banner.label}`}
              onClick={banner.onResume}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#43A047]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={RESUME_ICON}
                alt=""
                className="h-11 w-11 object-contain transition-opacity hover:opacity-90"
              />
            </button>
          ) : null}
          {banner.onCancel ? (
            <button
              type="button"
              aria-label={`Cancel ${banner.label}`}
              onClick={banner.onCancel}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CANCEL_ICON}
                alt=""
                className="h-11 w-11 object-contain transition-opacity hover:opacity-90"
              />
            </button>
          ) : null}
        </div>
      </div>
      {body}
    </section>
  );
}
