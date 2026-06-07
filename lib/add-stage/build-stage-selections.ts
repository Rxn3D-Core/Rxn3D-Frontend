import {
  resolveStageSelection,
  shouldSkipStageSelection,
  SKIPPED_STAGE_LABEL,
} from "@/components/case-design-center/utils/categoryHelpers";
import { findSlipProductForEligibility } from "@/lib/virtual-slip-products";
import type { NewStageEligibilityProduct } from "@/lib/api/slip-new-stage-eligibility";
import { findApiProductForArch } from "./preload-state";
import type { AddStageHistoryByArch, AddStageSelections } from "./session";
import { archToSlipType, slipTypeToArch } from "./session";

type ProductStageRow = {
  id?: number;
  stage_id?: number;
  name?: string;
  sequence?: number;
};

type ProductForStageSkip = {
  has_stage?: unknown;
  is_single_stage?: unknown;
  stages?: unknown[];
} | null;

function stageRowId(row: ProductStageRow): number {
  return Number(row.stage_id ?? row.id ?? 0);
}

/**
 * Pick the initial stage from slip/eligibility context.
 * Dropdown options in CDC still come from the full product details API.
 */
export function resolveDefaultStageSelection(
  eligibilityProduct: NewStageEligibilityProduct,
  productStages: ProductStageRow[] | undefined,
  productForSkip?: ProductForStageSkip
): { stageId: number; stageName: string } | null {
  if (shouldSkipStageSelection(productForSkip)) {
    return { stageId: 0, stageName: SKIPPED_STAGE_LABEL };
  }

  const auto = resolveStageSelection(productForSkip);
  if (auto.kind === "auto") {
    const stages = Array.isArray(productStages) ? productStages : [];
    const match = stages.find((s) => (s.name ?? "").trim() === auto.stageName);
    return {
      stageId: match ? stageRowId(match) : 0,
      stageName: auto.stageName,
    };
  }

  const stages = Array.isArray(productStages) ? [...productStages] : [];
  const last = eligibilityProduct.last_stage;
  const lastSeq = last?.stage_sequence ?? 0;

  if (eligibilityProduct.proposed_stage?.valid && eligibilityProduct.proposed_stage.stage_id) {
    const proposedId = eligibilityProduct.proposed_stage.stage_id;
    const match = stages.find((s) => stageRowId(s) === proposedId);
    if (match?.name) {
      return { stageId: proposedId, stageName: match.name.trim() };
    }
  }

  const sorted = stages
    .filter((s) => stageRowId(s) && (s.name ?? "").trim())
    .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));

  const forward = sorted.find((s) => {
    const id = stageRowId(s);
    const seq = Number(s.sequence ?? 0);
    return seq > lastSeq && id !== last?.stage_id;
  });
  if (forward?.name) {
    return { stageId: stageRowId(forward), stageName: forward.name.trim() };
  }

  if (last?.stage_id && last.stage_name) {
    return { stageId: last.stage_id, stageName: last.stage_name };
  }

  const first = sorted[0];
  if (first?.name) {
    return { stageId: stageRowId(first), stageName: first.name.trim() };
  }

  return null;
}

export type BuildAddStageInitResult = {
  selections: AddStageSelections;
  historyByArch: AddStageHistoryByArch;
  matchedCount: number;
};

/** Match eligible arches to slip lines, fetch product API for each, and build default stage picks. */
export async function buildAddStageInitFromProductApi(params: {
  eligibleProducts: NewStageEligibilityProduct[];
  apiProducts: unknown[];
  fetchProductDetails: (productId: number, labId?: number) => Promise<unknown>;
  labId: number | null;
}): Promise<BuildAddStageInitResult> {
  const { eligibleProducts, apiProducts, fetchProductDetails, labId } = params;
  const selections: AddStageSelections = {};
  const historyByArch: AddStageHistoryByArch = {};
  let matchedCount = 0;

  for (const ep of eligibleProducts) {
    const arch = slipTypeToArch(ep.type);
    if (!arch || !ep.product_id) continue;

    const apiRow =
      findSlipProductForEligibility(ep, apiProducts) ??
      findApiProductForArch(apiProducts, arch);
    if (!apiRow) continue;

    const details = (await fetchProductDetails(
      ep.product_id,
      labId ?? undefined
    )) as ProductForStageSkip & { stages?: ProductStageRow[] } | null;
    if (!details) continue;

    const pick = resolveDefaultStageSelection(ep, details.stages, details);
    if (!pick?.stageName && !shouldSkipStageSelection(details)) continue;

    matchedCount++;
    historyByArch[arch] = ep.stage_history ?? [];

    const entry = {
      productId: ep.product_id,
      slipProductId: ep.slip_product_id,
      type: archToSlipType(arch),
      stageId: pick?.stageId ?? 0,
      stageName: pick?.stageName ?? "",
    };

    if (arch === "maxillary") {
      selections.maxillary = entry;
    } else {
      selections.mandibular = entry;
    }
  }

  return { selections, historyByArch, matchedCount };
}
