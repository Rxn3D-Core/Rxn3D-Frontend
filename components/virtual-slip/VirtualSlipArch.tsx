"use client";

import type { ArchVM, ProductVM } from "@/lib/virtual-slip-view-model";
import {
  isEditableVirtualSlipImplant,
  isPendingLabRecommendationImplant,
} from "@/lib/virtual-slip-view-model";
import { VirtualSlipToothChart } from "./VirtualSlipToothChart";
import { VirtualSlipProductSummary } from "./VirtualSlipProductSummary";
import { VirtualSlipOpposingSection } from "./VirtualSlipOpposingSection";

/** One arch column body: read-only tooth chart + product summaries.
 *  The arch title (MAXILLARY / MANDIBULAR) is rendered by the page; CASE DESIGN CENTER
 *  is absolutely centered over the two-column arch header row. */
export function VirtualSlipArch({
  data,
  onSelectLabImplants,
  onEditLabImplants,
}: {
  data: ArchVM;
  onSelectLabImplants?: (product: ProductVM) => void;
  onEditLabImplants?: (product: ProductVM) => void;
}) {
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
    </section>
  );
}
