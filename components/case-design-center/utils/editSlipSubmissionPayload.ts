import type { SlipCreationNote, SlipCreationProduct } from "@/services/slip-creation-service";
import type { SlipCreationMultipartFile } from "@/services/slip-creation-service";
import type { SlipProductSnapshot } from "../types";
import {
  prefetchImplantCatalogsForSnapshots,
  type AdvanceFieldFileSlot,
} from "./slipPayloadMappers";
import { snapshotToProduct } from "./caseSubmissionPayload";
import {
  buildBaselineEditSlipProducts,
  findBaselineProductForPrepared,
  mergeEditSlipProductWithBaseline,
  type EditSlipProduct,
} from "./apiSlipProductPayload";

export type { EditSlipProduct };

export type EditSlipPayload = {
  location_id?: number;
  status?: string;
  casepan_id?: number;
  casepan_number?: string;
  products?: EditSlipProduct[];
  notes?: SlipCreationNote[];
};

export interface BuildEditSlipPayloadParams {
  snapshots: SlipProductSnapshot[];
  apiProducts: unknown[];
  locationId?: number | null;
  status?: string | null;
  casepanId?: number | null;
  casepanNumber?: string | null;
  labCustomerId?: number;
}

function normalizeSlipProductType(type: string | null | undefined): "Upper" | "Lower" | null {
  const t = String(type ?? "").toLowerCase();
  if (t === "upper" || t === "maxillary") return "Upper";
  if (t === "lower" || t === "mandibular") return "Lower";
  return null;
}

function buildSlipProductIdByType(apiProducts: unknown[]): Map<"Upper" | "Lower", number> {
  const map = new Map<"Upper" | "Lower", number>();
  if (!Array.isArray(apiProducts)) return map;

  for (const row of apiProducts) {
    const product = row as { id?: number; type?: string };
    const archType = normalizeSlipProductType(product.type);
    if (archType && typeof product.id === "number" && product.id > 0) {
      map.set(archType, product.id);
    }
  }
  return map;
}

/** Strip `File` from advance_fields for JSON; collect multipart keys for PUT /slip/{id}/edit. */
function partitionAdvanceFieldsForEditMultipart(
  advance_fields: SlipCreationProduct["advance_fields"],
  productIndex: number
): { jsonFields: NonNullable<SlipCreationProduct["advance_fields"]>; fileSlots: AdvanceFieldFileSlot[] } {
  if (!advance_fields?.length) return { jsonFields: [], fileSlots: [] };

  const jsonFields: NonNullable<SlipCreationProduct["advance_fields"]> = [];
  const fileSlots: AdvanceFieldFileSlot[] = [];

  advance_fields.forEach((field, afIndex) => {
    if (field.file instanceof File) {
      fileSlots.push({
        formKey: `products[${productIndex}][advance_fields][${afIndex}][file]`,
        file: field.file,
      });
      const { file: _f, file_index: _i, ...rest } = field;
      jsonFields.push(rest);
    } else {
      jsonFields.push(field);
    }
  });

  return { jsonFields, fileSlots };
}

export interface BuildEditSlipSubmissionResult {
  payload: EditSlipPayload;
  multipartFiles: SlipCreationMultipartFile[];
}

export async function buildEditSlipSubmissionPayloadAsync(
  params: BuildEditSlipPayloadParams
): Promise<BuildEditSlipSubmissionResult> {
  const {
    snapshots,
    apiProducts,
    locationId,
    status,
    casepanId,
    casepanNumber,
    labCustomerId,
  } = params;

  const baselineProducts = buildBaselineEditSlipProducts(apiProducts);
  const filteredSnapshots = snapshots.filter(
    (s) => s.teethNumbers.length > 0 || s.productId > 0
  );

  const implantCatalogs = await prefetchImplantCatalogsForSnapshots(
    filteredSnapshots,
    labCustomerId ?? 0
  );

  const slipProductIds = buildSlipProductIdByType(apiProducts);
  const multipartFiles: SlipCreationMultipartFile[] = [];

  const preparedProducts: EditSlipProduct[] = filteredSnapshots.map((snap, productIndex) => {
    const product = snapshotToProduct(snap, implantCatalogs.get(snap.productId)) as EditSlipProduct;
    const existingId = slipProductIds.get(snap.type as "Upper" | "Lower");
    if (existingId) {
      product.id = existingId;
    }

    const { jsonFields, fileSlots } = partitionAdvanceFieldsForEditMultipart(
      product.advance_fields,
      productIndex
    );
    if (fileSlots.length > 0) {
      product.advance_fields = jsonFields;
      multipartFiles.push(...fileSlots.map((slot) => ({ formKey: slot.formKey, file: slot.file })));
    }

    return product;
  });

  const products: EditSlipProduct[] =
    preparedProducts.length > 0
      ? preparedProducts.map((prepared, index) => {
          const baseline = findBaselineProductForPrepared(prepared, baselineProducts, index);
          return baseline ? mergeEditSlipProductWithBaseline(prepared, baseline) : prepared;
        })
      : baselineProducts.map((baseline) => {
          const existingId = slipProductIds.get(baseline.type);
          return existingId ? { ...baseline, id: existingId } : baseline;
        });

  const slipNotes = products
    .map((p) => p.notes)
    .filter((note): note is string => Boolean(note))
    .map((note) => ({ note }));

  const payload: EditSlipPayload = {
    ...(locationId ? { location_id: locationId } : {}),
    ...(status ? { status } : {}),
    ...(casepanId ? { casepan_id: casepanId } : {}),
    ...(casepanNumber ? { casepan_number: casepanNumber } : {}),
    products,
    ...(slipNotes.length > 0 ? { notes: slipNotes } : {}),
  };

  if (process.env.NODE_ENV === "development") {
    console.debug("[case-design-center] slip/edit payload", {
      payload,
      multipartFileKeys: multipartFiles.map((f) => f.formKey),
    });
  }

  return { payload, multipartFiles };
}
