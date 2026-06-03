"use client";

import { useMemo } from "react";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import type { RetentionOptionItem } from "@/components/retention-type-popover";
import type { ToothVM } from "@/lib/virtual-slip-view-model";

interface VirtualSlipToothChartProps {
  arch: "maxillary" | "mandibular";
  teeth: ToothVM[];
  selectedTeeth: number[];
  toothChartSelectionsByTooth?: Record<
    number,
    { chartType: "Implant" | "Prep" | "Pontic" | null; imageUrl: string | null }
  >;
}

/**
 * Read-only dental chart. Reuses the exact same anatomical teeth SVG components
 * used in the slip-creation Case Design Center, driven from the view model's
 * per-tooth statuses. Rendered non-interactive (no click handlers, selection
 * indicators hidden) and wrapped in `pointer-events-none` so it stays a pure
 * display — without the dimming that the SVG's own `disabled` prop applies.
 */
export function VirtualSlipToothChart({
  arch,
  teeth,
  selectedTeeth,
  toothChartSelectionsByTooth = {},
}: VirtualSlipToothChartProps) {
  const { missingTeeth, willExtractTeeth, retentionTypesByTooth, retentionOptionsByTooth } =
    useMemo(() => {
    const missing: number[] = [];
    const willExtract: number[] = [];
    const retention: Record<number, Array<"Implant" | "Prep" | "Pontic">> = {};
    const optionsByTooth: Record<number, RetentionOptionItem[]> = {};

    for (const t of teeth) {
      if (t.status === "missing") missing.push(t.number);
      else if (t.status === "will_extract") willExtract.push(t.number);

      const chartSelection = toothChartSelectionsByTooth[t.number];
      if (chartSelection?.imageUrl) {
        // Use the stored chartType when available (retention: Implant/Prep/Pontic).
        // Fall back to "Prep" as a carrier type for extraction images (chart_type "Yes")
        // so the image still flows through the retention image render path.
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
  }, [teeth, toothChartSelectionsByTooth]);

  const commonProps = {
    selectedTeeth,
    missingTeeth,
    willExtractTeeth,
    retentionTypesByTooth,
    getRetentionOptionsForTooth: (toothNumber: number) => retentionOptionsByTooth[toothNumber],
    hideSelectionIndicators: true,
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
