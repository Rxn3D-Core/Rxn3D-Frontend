import type { SlipProductSnapshot } from "../types";
import {
  groupProductsIntoSlips,
  partitionAdvanceFieldsForMultipart,
  prefetchImplantCatalogsForSnapshots,
} from "./slipPayloadMappers";
import { snapshotToProduct } from "./caseSubmissionPayload";
import {
  buildSlipLevelNotes,
  clearProductNotesWhenUsingCaseSummary,
} from "./caseSummaryNotesPayload";
import type { AddStageToSlipPayload } from "@/lib/api/slip-add-stage";

export interface BuildAddStagePayloadParams {
  snapshots: SlipProductSnapshot[];
  sourceSlipLocationId?: number | null;
  labCustomerId?: number;
  createdBy?: number;
  caseSummaryNotes?: string;
}

export async function buildAddStageSubmissionPayloadsAsync(
  params: BuildAddStagePayloadParams
): Promise<AddStageToSlipPayload[]> {
  const { snapshots, sourceSlipLocationId, labCustomerId, createdBy, caseSummaryNotes } = params;

  const filteredSnapshots = snapshots.filter(
    (s) => s.teethNumbers.length > 0 || s.productId > 0
  );

  const implantCatalogs = await prefetchImplantCatalogsForSnapshots(
    filteredSnapshots,
    labCustomerId ?? 0
  );

  const products = filteredSnapshots.map((snap) =>
    snapshotToProduct(snap, implantCatalogs.get(snap.productId))
  );

  const slipProductGroups = groupProductsIntoSlips(products);
  const totalSlips = slipProductGroups.length;

  const userId =
    createdBy ??
    (typeof window !== "undefined"
      ? Number(localStorage.getItem("userId")) || undefined
      : undefined);

  return slipProductGroups.map((slipProducts, slipIndex) => {
    slipProducts.forEach((product, productIndex) => {
      const { jsonFields } = partitionAdvanceFieldsForMultipart(
        product.advance_fields,
        slipIndex,
        productIndex
      );
      product.advance_fields = jsonFields;
    });

    clearProductNotesWhenUsingCaseSummary(slipProducts, caseSummaryNotes, totalSlips);
    const slipNotes = buildSlipLevelNotes(slipProducts, caseSummaryNotes, slipIndex, totalSlips);

    return {
      ...(sourceSlipLocationId ? { location_id: sourceSlipLocationId } : {}),
      status: "In Progress",
      ...(userId ? { created_by: userId } : {}),
      products: slipProducts,
      ...(slipNotes.length > 0 ? { notes: slipNotes } : {}),
    };
  });
}

/** @deprecated Use buildAddStageSubmissionPayloadsAsync for grouped add-stage slips */
export async function buildAddStageSubmissionPayloadAsync(
  params: BuildAddStagePayloadParams
): Promise<AddStageToSlipPayload> {
  const payloads = await buildAddStageSubmissionPayloadsAsync(params);
  if (payloads.length === 0) {
    return { status: "In Progress", products: [] };
  }
  return payloads[0];
}
