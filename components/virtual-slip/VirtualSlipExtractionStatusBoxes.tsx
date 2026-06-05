"use client";

import { ToothStatusBoxes } from "@/components/case-design-center/components/ToothStatusBoxes";
import type { VirtualSlipStatusBoxProps } from "@/lib/virtual-slip-extraction-display";

const noop = () => {};

/** Read-only extraction status boxes (same design as slip creation / CDC). */
export function VirtualSlipExtractionStatusBoxes({
  boxProps,
}: {
  boxProps: VirtualSlipStatusBoxProps;
}) {
  return (
    <ToothStatusBoxes
      extractions={boxProps.extractions}
      selectedTeeth={boxProps.selectedTeeth}
      allArchTeeth={boxProps.allArchTeeth}
      toothExtractionMap={boxProps.toothExtractionMap}
      claspTeeth={boxProps.claspTeeth}
      displayTeethByCode={boxProps.displayTeethByCode}
      activeExtractionCode={null}
      onActiveExtractionChange={noop}
      onToothExtractionToggle={noop}
      onSelectAllTeeth={noop}
      isRemovable
      submitted
      hideDefaultBox
      disableRequiredValidation
    />
  );
}
