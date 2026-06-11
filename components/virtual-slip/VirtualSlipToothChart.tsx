"use client";

import { useMemo } from "react";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import type { RetentionOptionItem } from "@/components/retention-type-popover";
import type { ExtractionDisplayVM } from "@/lib/virtual-slip-extraction-display";
import {
  chartStatusTeethFromExtractionDisplay,
  hasExtractionChartOverlay,
  scopeChartExtractionDisplayForProductTeeth,
} from "@/lib/virtual-slip-extraction-display";
import type { ToothVM } from "@/lib/virtual-slip-view-model";

interface VirtualSlipToothChartProps {
  arch: "maxillary" | "mandibular";
  teeth: ToothVM[];
  selectedTeeth: number[];
  toothChartSelectionsByTooth?: Record<
    number,
    {
      chartType: "Implant" | "Prep" | "Pontic" | null;
      imageUrl: string | null;
      /** When the image is a real extraction/retention visual (not the default
       *  tooth), it fully represents the tooth state — used to avoid drawing a
       *  duplicate missing/will-extract overlay on top. */
      source?: "extraction" | "retention" | "default";
    }
  >;
  extractionDisplay?: ExtractionDisplayVM;
}

/**
 * Read-only dental chart. Reuses the exact same anatomical teeth SVG components
 * used in the slip-creation Case Design Center, driven from the view model's
 * per-tooth statuses. Rendered non-interactive (no click handlers) and wrapped
 * in `pointer-events-none`. The arch chart is driven by grouped extractions (MT /
 * WEOD / clasps). Product `teeth_selection` and catalog images appear in the
 * product summary below, not on this chart.
 */
export function VirtualSlipToothChart({
  arch,
  teeth,
  selectedTeeth,
  toothChartSelectionsByTooth = {},
  extractionDisplay,
}: VirtualSlipToothChartProps) {
  const useExtractionOverlay = hasExtractionChartOverlay(extractionDisplay);

  const chartExtractionDisplay = useMemo(() => {
    if (!useExtractionOverlay || !extractionDisplay) return extractionDisplay;
    return scopeChartExtractionDisplayForProductTeeth(extractionDisplay, selectedTeeth);
  }, [useExtractionOverlay, extractionDisplay, selectedTeeth]);

  const { missingTeeth, willExtractTeeth, retentionTypesByTooth, retentionOptionsByTooth } =
    useMemo(() => {
    const missing: number[] = [];
    const willExtract: number[] = [];
    const retention: Record<number, Array<"Implant" | "Prep" | "Pontic">> = {};
    const optionsByTooth: Record<number, RetentionOptionItem[]> = {};

    if (!useExtractionOverlay) {
      for (const t of teeth) {
        // When a tooth already carries a real extraction/retention chart image,
        // that image fully represents the state. Skip the flat missing/
        // will-extract lists so the SVG doesn't draw a SECOND overlay (the
        // duplicate red-X bug) on top of the image. Default tooth images don't
        // count — those still need the fallback overlay.
        const sel = toothChartSelectionsByTooth[t.number];
        if (sel?.imageUrl && sel.source && sel.source !== "default") continue;
        if (t.status === "missing") missing.push(t.number);
        else if (t.status === "will_extract") willExtract.push(t.number);
      }
    } else if (chartExtractionDisplay) {
      const chartStatus = chartStatusTeethFromExtractionDisplay(chartExtractionDisplay);
      missing.push(...chartStatus.missingTeeth);
      willExtract.push(...chartStatus.willExtractTeeth);
    }

    for (const t of teeth) {
      const chartSelection = toothChartSelectionsByTooth[t.number];
      if (chartSelection?.imageUrl) {
        // Extraction overlay already renders this tooth — avoid stacking a second chart image.
        if (useExtractionOverlay && chartExtractionDisplay) {
          const code = chartExtractionDisplay.toothExtractionMap[t.number];
          if (code && chartExtractionDisplay.extractionImagesByCode[code]?.[t.number]) {
            continue;
          }
        }
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
  }, [teeth, toothChartSelectionsByTooth, useExtractionOverlay, chartExtractionDisplay, selectedTeeth]);

  const chartSelectedTeeth = useExtractionOverlay ? [] : selectedTeeth;

  const commonProps = {
    selectedTeeth: chartSelectedTeeth,
    missingTeeth,
    willExtractTeeth,
    retentionTypesByTooth,
    getRetentionOptionsForTooth: (toothNumber: number) => retentionOptionsByTooth[toothNumber],
    hideSelectionIndicators: true,
    ...(useExtractionOverlay && chartExtractionDisplay
      ? {
          toothExtractionMap: chartExtractionDisplay.toothExtractionMap,
          claspTeeth: chartExtractionDisplay.claspTeeth,
          extractionsByCode: chartExtractionDisplay.extractionsByCode,
          extractionImagesByCode: chartExtractionDisplay.extractionImagesByCode,
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
