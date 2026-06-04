import type { Arch } from "@/components/case-design-center/types";
import type { NewStageEligibilityStageRef } from "@/lib/api/slip-new-stage-eligibility";

export const ADD_STAGE_SOURCE_SLIP_KEY = "addStageSourceSlipId";
export const ADD_STAGE_SELECTIONS_KEY = "addStageSelections";
export const ADD_STAGE_HISTORY_KEY = "addStageHistoryByArch";

export type AddStageHistoryByArch = Partial<
  Record<Arch, NewStageEligibilityStageRef[]>
>;

export type AddStageDesignContext = {
  historyByArch: AddStageHistoryByArch;
  /** Open stage picker for each arch in order when CDC first loads. */
  promptStagesOnLoad?: boolean;
};

export type AddStageArchSelection = {
  productId: number;
  slipProductId?: number;
  type: "Upper" | "Lower";
  stageId: number;
  stageName: string;
};

export type AddStageSelections = {
  maxillary?: AddStageArchSelection;
  mandibular?: AddStageArchSelection;
};

export function saveAddStageSession(
  sourceSlipId: number,
  selections: AddStageSelections,
  historyByArch?: AddStageHistoryByArch
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADD_STAGE_SOURCE_SLIP_KEY, String(sourceSlipId));
  sessionStorage.setItem(ADD_STAGE_SELECTIONS_KEY, JSON.stringify(selections));
  if (historyByArch && Object.keys(historyByArch).length > 0) {
    sessionStorage.setItem(ADD_STAGE_HISTORY_KEY, JSON.stringify(historyByArch));
  } else {
    sessionStorage.removeItem(ADD_STAGE_HISTORY_KEY);
  }
}

export function readAddStageSession(): {
  sourceSlipId: number | null;
  selections: AddStageSelections | null;
  historyByArch: AddStageHistoryByArch | null;
} {
  if (typeof window === "undefined") {
    return { sourceSlipId: null, selections: null, historyByArch: null };
  }
  const rawId = sessionStorage.getItem(ADD_STAGE_SOURCE_SLIP_KEY);
  const rawSel = sessionStorage.getItem(ADD_STAGE_SELECTIONS_KEY);
  const rawHist = sessionStorage.getItem(ADD_STAGE_HISTORY_KEY);
  const sourceSlipId = rawId ? Number(rawId) : NaN;
  if (!rawId || Number.isNaN(sourceSlipId)) {
    return { sourceSlipId: null, selections: null, historyByArch: null };
  }
  try {
    const selections = rawSel
      ? (JSON.parse(rawSel) as AddStageSelections)
      : null;
    const historyByArch = rawHist
      ? (JSON.parse(rawHist) as AddStageHistoryByArch)
      : null;
    return { sourceSlipId, selections, historyByArch };
  } catch {
    return { sourceSlipId, selections: null, historyByArch: null };
  }
}

export function clearAddStageSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADD_STAGE_SOURCE_SLIP_KEY);
  sessionStorage.removeItem(ADD_STAGE_SELECTIONS_KEY);
  sessionStorage.removeItem(ADD_STAGE_HISTORY_KEY);
}

export function archToSlipType(arch: Arch): "Upper" | "Lower" {
  return arch === "maxillary" ? "Upper" : "Lower";
}

export function slipTypeToArch(type: string | null | undefined): Arch | null {
  if (!type) return null;
  return type.toLowerCase() === "lower" ? "mandibular" : "maxillary";
}
