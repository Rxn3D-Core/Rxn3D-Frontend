import type { ArchPickerRow } from "@/components/add-new-stage/AddNewStageStagePicker";
import type { AddStageSelections } from "./session";
import { archToSlipType } from "./session";

/** Default per-arch stage picks (prefer next stage over repeat) for CDC preload. */
export function selectionsFromPickerRows(rows: ArchPickerRow[]): AddStageSelections {
  const selections: AddStageSelections = {};

  for (const row of rows) {
    const forward = row.options.find((o) => !o.isRepeatLast);
    const pick = forward ?? row.options[0];
    if (!pick) continue;

    const entry = {
      productId: row.eligibilityProduct.product_id,
      slipProductId: row.eligibilityProduct.slip_product_id,
      type: archToSlipType(row.arch),
      stageId: pick.stageId,
      stageName: pick.stageName,
    };

    if (row.arch === "maxillary") {
      selections.maxillary = entry;
    } else {
      selections.mandibular = entry;
    }
  }

  return selections;
}
