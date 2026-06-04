import type { SlipProductSnapshot } from "../types";
import {
  partitionAdvanceFieldsForMultipart,
  prefetchImplantCatalogsForSnapshots,
} from "./slipPayloadMappers";
import { snapshotToProduct } from "./caseSubmissionPayload";
import type { AddStageToSlipPayload } from "@/lib/api/slip-add-stage";
import type { SlipCreationProduct } from "@/services/slip-creation-service";

export interface BuildAddStagePayloadParams {
  snapshots: SlipProductSnapshot[];
  sourceSlipLocationId?: number | null;
  labCustomerId?: number;
  createdBy?: number;
}

function requireStageId(product: SlipCreationProduct, archLabel: string): SlipCreationProduct {
  const stage_id = product.stage_id;
  if (!stage_id || stage_id <= 0) {
    throw new Error(`Stage is required for ${archLabel} before creating the new stage slip.`);
  }
  return product;
}

export async function buildAddStageSubmissionPayloadAsync(
  params: BuildAddStagePayloadParams
): Promise<AddStageToSlipPayload> {
  const { snapshots, sourceSlipLocationId, labCustomerId, createdBy } = params;

  const filteredSnapshots = snapshots.filter(
    (s) => s.teethNumbers.length > 0 || s.productId > 0
  );

  const implantCatalogs = await prefetchImplantCatalogsForSnapshots(
    filteredSnapshots,
    labCustomerId ?? 0
  );

  const products = filteredSnapshots.map((snap) => {
    const built = snapshotToProduct(
      snap,
      implantCatalogs.get(snap.productId)
    );
    return requireStageId(built, snap.type);
  });

  products.forEach((product) => {
    const { jsonFields } = partitionAdvanceFieldsForMultipart(
      product.advance_fields,
      0,
      0
    );
    product.advance_fields = jsonFields;
  });

  const userId =
    createdBy ??
    (typeof window !== "undefined"
      ? Number(localStorage.getItem("userId")) || undefined
      : undefined);

  const slipNotes = products
    .map((p) => p.notes)
    .filter((note): note is string => Boolean(note))
    .map((note) => ({ note }));

  return {
    ...(sourceSlipLocationId ? { location_id: sourceSlipLocationId } : {}),
    status: "In Progress",
    ...(userId ? { created_by: userId } : {}),
    products,
    ...(slipNotes.length > 0 ? { notes: slipNotes } : {}),
  };
}
