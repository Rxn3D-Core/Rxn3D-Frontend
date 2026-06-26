import type { SlipProductSnapshot } from "../types";
import {
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

export async function buildAddStageSubmissionPayloadAsync(
  params: BuildAddStagePayloadParams
): Promise<AddStageToSlipPayload> {
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

  products.forEach((product) => {
    const { jsonFields } = partitionAdvanceFieldsForMultipart(
      product.advance_fields,
      0,
      0
    );
    product.advance_fields = jsonFields;
  });

  clearProductNotesWhenUsingCaseSummary(products, caseSummaryNotes);
  const slipNotes = buildSlipLevelNotes(products, caseSummaryNotes, 0);

  const userId =
    createdBy ??
    (typeof window !== "undefined"
      ? Number(localStorage.getItem("userId")) || undefined
      : undefined);

  const slipNotesFromProducts = slipNotes;

  return {
    ...(sourceSlipLocationId ? { location_id: sourceSlipLocationId } : {}),
    status: "In Progress",
    ...(userId ? { created_by: userId } : {}),
    products,
    ...(slipNotesFromProducts.length > 0 ? { notes: slipNotesFromProducts } : {}),
  };
}
