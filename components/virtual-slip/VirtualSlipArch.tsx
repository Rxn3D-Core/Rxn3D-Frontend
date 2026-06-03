"use client";

import type { ArchVM } from "@/lib/virtual-slip-view-model";
import { VirtualSlipToothChart } from "./VirtualSlipToothChart";
import { VirtualSlipProductSummary } from "./VirtualSlipProductSummary";

/** One arch column body: read-only tooth chart + product summaries.
 *  The arch title (MAXILLARY / MANDIBULAR) is rendered by the page so the two
 *  titles and "CASE DESIGN CENTER" stay aligned on a single row. */
export function VirtualSlipArch({ data }: { data: ArchVM }) {
  return (
    <section className="min-w-0 flex-1">
      <VirtualSlipToothChart
        arch={data.arch}
        teeth={data.teeth}
        selectedTeeth={data.selectedTeeth}
        toothChartSelectionsByTooth={data.toothChartSelectionsByTooth}
      />
      {data.opposingImpression && (
        <p className="mt-1 font-sans text-[13px] text-[#4C4D55]">
          <span className="font-bold">Opposing Impression:</span> {data.opposingImpression}
        </p>
      )}
      {data.products.map((product, i) => (
        <VirtualSlipProductSummary key={i} product={product} />
      ))}
    </section>
  );
}
