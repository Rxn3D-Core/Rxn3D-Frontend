"use client";

import type { ArchVM } from "@/lib/virtual-slip-view-model";
import { VirtualSlipToothChart } from "./VirtualSlipToothChart";
import { VirtualSlipProductSummary } from "./VirtualSlipProductSummary";
import { VirtualSlipOpposingSection } from "./VirtualSlipOpposingSection";

/** One arch column body: read-only tooth chart + product summaries.
 *  The arch title (MAXILLARY / MANDIBULAR) is rendered by the page; CASE DESIGN CENTER
 *  is absolutely centered over the two-column arch header row. */
export function VirtualSlipArch({ data }: { data: ArchVM }) {
  const isOpposingOnly = data.products.length === 0 && data.opposing != null;

  if (isOpposingOnly) {
    return (
      <section className="min-w-0 flex-1">
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
      </section>
    );
  }

  return (
    <section className="min-w-0 flex-1">
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
      {data.products.map((product, i) => (
        <VirtualSlipProductSummary key={i} product={product} />
      ))}
    </section>
  );
}
