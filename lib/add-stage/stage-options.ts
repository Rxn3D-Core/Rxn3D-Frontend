import type { NewStageEligibilityProduct } from "@/lib/api/slip-new-stage-eligibility";

export type StagePickerOption = {
  stageId: number;
  stageName: string;
  sequence: number;
  /** User-facing label (includes Repeat prefix when repeating last stage). */
  label: string;
  isRepeatLast: boolean;
};

type ProductStageRow = {
  id?: number;
  stage_id?: number;
  name?: string;
  sequence?: number;
};

function stageRowId(row: ProductStageRow): number {
  return Number(row.stage_id ?? row.id ?? 0);
}

function stageRowSequence(row: ProductStageRow): number {
  return Number(row.sequence ?? 0);
}

/** Build per-arch stage choices: repeat last completed stage + any later configured stages. */
export function buildStagePickerOptions(
  eligibilityProduct: NewStageEligibilityProduct,
  productStages: ProductStageRow[] | undefined
): StagePickerOption[] {
  const last = eligibilityProduct.last_stage;
  const lastSeq = last?.stage_sequence ?? 0;
  const stages = Array.isArray(productStages) ? productStages : [];
  const byId = new Map<number, StagePickerOption>();

  if (last?.stage_id && last.stage_name) {
    byId.set(last.stage_id, {
      stageId: last.stage_id,
      stageName: last.stage_name,
      sequence: lastSeq,
      label: `Repeat: ${last.stage_name}`,
      isRepeatLast: true,
    });
  }

  for (const row of stages) {
    const stageId = stageRowId(row);
    const name = (row.name ?? "").trim();
    if (!stageId || !name) continue;
    const sequence = stageRowSequence(row);
    if (sequence <= lastSeq && stageId !== last?.stage_id) continue;
    if (byId.has(stageId)) continue;
    byId.set(stageId, {
      stageId,
      stageName: name,
      sequence,
      label: name,
      isRepeatLast: stageId === last?.stage_id,
    });
  }

  for (const hist of eligibilityProduct.stage_history ?? []) {
    const stageId = Number(hist.stage_id ?? 0);
    const name = (hist.stage_name ?? "").trim();
    const sequence = Number(hist.stage_sequence ?? 0);
    if (!stageId || !name) continue;
    if (sequence <= lastSeq && stageId !== last?.stage_id) continue;
    if (byId.has(stageId)) continue;
    byId.set(stageId, {
      stageId,
      stageName: name,
      sequence,
      label: stageId === last?.stage_id ? `Repeat: ${name}` : name,
      isRepeatLast: stageId === last?.stage_id,
    });
  }

  return [...byId.values()].sort((a, b) => a.sequence - b.sequence);
}
