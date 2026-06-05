"use client";

import { useMemo } from "react";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import type { RetentionOptionItem } from "@/components/retention-type-popover";
import type { ExtractionDisplayVM } from "@/lib/virtual-slip-extraction-display";
import {
  chartStatusTeethFromExtractionDisplay,
  hasExtractionChartOverlay,
} from "@/lib/virtual-slip-extraction-display";
import type { ToothVM } from "@/lib/virtual-slip-view-model";

interface VirtualSlipToothChartProps {
  arch: "maxillary" | "mandibular";
  teeth: ToothVM[];
  selectedTeeth: number[];
  toothChartSelectionsByTooth?: Record<
    number,
    { chartType: "Implant" | "Prep" | "Pontic" | null; imageUrl: string | null }
  >;
  extractionDisplay?: ExtractionDisplayVM;
}

/**
 * Read-only dental chart. Reuses the exact same anatomical teeth SVG components
 * used in the slip-creation Case Design Center, driven from the view model's
 * per-tooth statuses. Rendered non-interactive (no click handlers) and wrapped
 * in `pointer-events-none`. Removable product teeth use extraction catalog images
 * (TIM / tooth-chart), not orange gear selection indicators.
 */
export function VirtualSlipToothChart({
  arch,
  teeth,
  selectedTeeth,
  toothChartSelectionsByTooth = {},
  extractionDisplay,
}: VirtualSlipToothChartProps) {
  const useExtractionOverlay = hasExtractionChartOverlay(extractionDisplay);

  const { missingTeeth, willExtractTeeth, retentionTypesByTooth, retentionOptionsByTooth } =
    useMemo(() => {
    const missing: number[] = [];
    const willExtract: number[] = [];
    const retention: Record<number, Array<"Implant" | "Prep" | "Pontic">> = {};
    const optionsByTooth: Record<number, RetentionOptionItem[]> = {};

    if (!useExtractionOverlay) {
      for (const t of teeth) {
        if (t.status === "missing") missing.push(t.number);
        else if (t.status === "will_extract") willExtract.push(t.number);
      }
    } else if (extractionDisplay) {
      const chartStatus = chartStatusTeethFromExtractionDisplay(extractionDisplay);
      missing.push(...chartStatus.missingTeeth);
      willExtract.push(...chartStatus.willExtractTeeth);
    }

    for (const t of teeth) {
      const chartSelection = toothChartSelectionsByTooth[t.number];
      if (chartSelection?.imageUrl) {
        const chartType: "Implant" | "Prep" | "Pontic" = chartSelection.chartType ?? "Prep";
        retention[t.number] = [chartType];
        optionsByTooth[t.number] = [
          {
            id: t.number,
            name: chartType,
            image_url: chartSelection.imageUrl,
            tooth_chart_type: chartType,
            images: [{ tooth_number: t.number, image_url: chartSelection.imageUrl }],
            status: "Active",
            sequence: 1,
          },
        ];
      } else if (t.status === "implant") {
        retention[t.number] = ["Implant"];
      }
    }

    return {
      missingTeeth: missing,
      willExtractTeeth: willExtract,
      retentionTypesByTooth: retention,
      retentionOptionsByTooth: optionsByTooth,
    };
  }, [teeth, toothChartSelectionsByTooth, useExtractionOverlay, extractionDisplay]);

  const chartSelectedTeeth = useExtractionOverlay ? [] : selectedTeeth;

  const commonProps = {
    selectedTeeth: chartSelectedTeeth,
    missingTeeth,
    willExtractTeeth,
    retentionTypesByTooth,
    getRetentionOptionsForTooth: (toothNumber: number) => retentionOptionsByTooth[toothNumber],
    hideSelectionIndicators: true,
    ...(useExtractionOverlay && extractionDisplay
      ? {
          toothExtractionMap: extractionDisplay.toothExtractionMap,
          claspTeeth: extractionDisplay.claspTeeth,
          extractionsByCode: extractionDisplay.extractionsByCode,
          extractionImagesByCode: extractionDisplay.extractionImagesByCode,
        }
      : {}),
  };

  return (
    <div className="pointer-events-none w-full select-none">
      {arch === "maxillary" ? (
        <MaxillaryTeethSVG {...commonProps} />
      ) : (
        <MandibularTeethSVG {...commonProps} />
      )}
    </div>
  );
}
