"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ImplantDetailSection,
  defaultImplantDetailData,
  type ImplantDetailData,
} from "@/components/case-design-center/components/ImplantDetailSection";
import type { ProductApiData } from "@/components/case-design-center/types";
import type { ImplantVM } from "@/lib/virtual-slip-view-model";
import {
  isEditableVirtualSlipImplant,
  isPendingLabRecommendationImplant,
} from "@/lib/virtual-slip-view-model";
import { resolveLibraryCustomerId } from "@/lib/customer-scope";
import { buildApiUrl } from "@/lib/api/client";
import {
  fetchCategoryImplantSettings,
  settingsForCategory,
  type ImplantFieldSettings,
} from "@/lib/api/category-implant-settings";
import { putSlipImplantDetails } from "@/lib/api/slip-implant-details";
import { buildImplantAndAbutmentDetails } from "@/components/case-design-center/utils/slipPayloadMappers";
import { buildAbutmentAddonEntries } from "@/components/case-design-center/utils/abutmentAddonSync";
import { selectedAbutmentHasTypeOptions } from "@/components/case-design-center/utils/implantDetailAbutmentOptions";
import {
  cloneImplantDetailData,
  isImplantDetailFilled,
  isImplantDetailFormComplete,
} from "@/components/case-design-center/utils/implantDetailHelpers";
import { fetchProductImplants } from "@/services/implant-api";

interface LabImplantSelectionModalProps {
  open: boolean;
  slipId: number;
  implants: ImplantVM[];
  labCustomerId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

function implantVmToDetail(row: ImplantVM): ImplantDetailData {
  const hasSelection = isEditableVirtualSlipImplant(row);
  if (!hasSelection) {
    return {
      ...defaultImplantDetailData(),
      labRecommendationRequested: false,
      referencePhotoUrl: row.referencePhotoUrl ?? null,
    };
  }
  return {
    ...defaultImplantDetailData(),
    brand: row.brand || "",
    systemName: row.systemName || "",
    platform: row.platform || "",
    size: row.size || "",
    abutmentType: row.abutmentType || "",
    abutmentDetail: row.abutmentOption || "",
    implantId: row.implantId ?? null,
    platformId: row.platformId ?? null,
    sizeId: row.sizeId ?? null,
    abutmentId: row.abutmentId ?? null,
    abutmentOptionId: row.abutmentOptionId ?? null,
    labRecommendationRequested: false,
    referencePhotoUrl: row.referencePhotoUrl ?? null,
  };
}

async function fetchLibraryProduct(
  productId: number,
  customerId?: number | null
): Promise<ProductApiData | null> {
  const url = new URL(buildApiUrl(`/library/products/${productId}`));
  if (customerId) url.searchParams.set("customer_id", String(customerId));
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return (json.data ?? null) as ProductApiData | null;
}

export function LabImplantSelectionModal({
  open,
  slipId,
  implants,
  labCustomerId,
  onClose,
  onSaved,
}: LabImplantSelectionModalProps) {
  const rows = useMemo(
    () => [...implants].sort((a, b) => a.toothNumber - b.toothNumber),
    [implants]
  );
  const firstRow = rows[0];
  const restRows = useMemo(() => rows.slice(1), [rows]);
  const isEditMode = useMemo(
    () =>
      rows.some(isEditableVirtualSlipImplant) &&
      !rows.every(isPendingLabRecommendationImplant),
    [rows]
  );
  const [detailByTooth, setDetailByTooth] = useState<Record<number, ImplantDetailData>>({});
  const [productById, setProductById] = useState<Record<number, ProductApiData>>({});
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [fieldSettingsByCategory, setFieldSettingsByCategory] = useState<
    Record<number, ImplantFieldSettings>
  >({});
  const [restRevealed, setRestRevealed] = useState(false);
  const [expandedToothNumber, setExpandedToothNumber] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customerId = labCustomerId ?? resolveLibraryCustomerId();

  useEffect(() => {
    if (!open) return;
    const next: Record<number, ImplantDetailData> = {};
    rows.forEach((row) => {
      next[row.toothNumber] = implantVmToDetail(row);
    });
    setDetailByTooth(next);
    setError(null);
    // Edit with existing selections: show all. New lab fill-in: first tooth only.
    const allAlreadyFilled =
      rows.length > 1 && rows.every((row) => isEditableVirtualSlipImplant(row));
    setRestRevealed(allAlreadyFilled || rows.length <= 1);
    setExpandedToothNumber(rows[0]?.toothNumber);
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const productIds = [
      ...new Set(
        rows
          .map((row) => row.productId)
          .filter((id): id is number => typeof id === "number" && id > 0)
      ),
    ];
    if (productIds.length === 0) {
      setProductsLoaded(true);
      return;
    }
    let cancelled = false;
    setProductsLoaded(false);
    Promise.all(productIds.map((id) => fetchLibraryProduct(id, customerId)))
      .then((loaded) => {
        if (cancelled) return;
        const next: Record<number, ProductApiData> = {};
        loaded.forEach((product, index) => {
          const id = productIds[index];
          if (product && id) next[id] = product;
        });
        setProductById(next);
      })
      .finally(() => {
        if (!cancelled) setProductsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, rows, customerId]);

  useEffect(() => {
    if (!open) return;
    const categoryIds = [
      ...new Set(
        rows
          .map((row) => row.categoryId)
          .filter((id): id is number => typeof id === "number" && id > 0)
      ),
    ];
    if (categoryIds.length === 0) return;
    let cancelled = false;
    Promise.all(
      categoryIds.map((categoryId) =>
        fetchCategoryImplantSettings({ customerId, categoryId }).then((settingsRows) => ({
          categoryId,
          fields: settingsForCategory(settingsRows, categoryId),
        }))
      )
    ).then((loaded) => {
      if (cancelled) return;
      const next: Record<number, ImplantFieldSettings> = {};
      loaded.forEach((row) => {
        next[row.categoryId] = row.fields;
      });
      setFieldSettingsByCategory(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, rows, customerId]);

  const firstToothComplete = useMemo(() => {
    if (!firstRow) return false;
    const product = firstRow.productId ? productById[firstRow.productId] : undefined;
    const categoryId =
      firstRow.categoryId ?? product?.subcategory?.category_id ?? null;
    const fieldSettings = categoryId ? fieldSettingsByCategory[categoryId] : undefined;
    const hasAbutments = (product?.abutments?.length ?? 0) > 0;
    return isImplantDetailFormComplete(
      detailByTooth[firstRow.toothNumber],
      fieldSettings,
      hasAbutments,
      selectedAbutmentHasTypeOptions(
        detailByTooth[firstRow.toothNumber],
        product?.abutments
      )
    );
  }, [firstRow, detailByTooth, productById, fieldSettingsByCategory]);

  // Same as slip create: once the first implant is complete, copy onto empty rest teeth once.
  // Do not re-run off every detailByTooth change — that was overwriting user inclusion edits
  // with the first tooth's "No inclusion".
  useEffect(() => {
    if (!open || !firstRow || restRows.length === 0 || !firstToothComplete) return;

    setDetailByTooth((prev) => {
      const source = prev[firstRow.toothNumber];
      if (!source) return prev;
      let changed = false;
      const next = { ...prev };
      const cloned = cloneImplantDetailData(source);
      for (const row of restRows) {
        const existing = prev[row.toothNumber];
        // Match slip: never overwrite a tooth that already has implant details.
        if (isImplantDetailFilled(existing)) continue;
        next[row.toothNumber] = cloneImplantDetailData(cloned);
        changed = true;
      }
      return changed ? next : prev;
    });

    if (!restRevealed) setRestRevealed(true);
  }, [open, firstRow, restRows, firstToothComplete, restRevealed]);

  const visibleRows = useMemo(() => {
    if (restRevealed || restRows.length === 0) return rows;
    return firstRow ? [firstRow] : [];
  }, [restRevealed, restRows.length, rows, firstRow]);

  const complete = useMemo(
    () =>
      rows.every((row) => {
        const product = row.productId ? productById[row.productId] : undefined;
        const categoryId = row.categoryId ?? product?.subcategory?.category_id ?? null;
        const fieldSettings = categoryId ? fieldSettingsByCategory[categoryId] : undefined;
        const hasAbutments = (product?.abutments?.length ?? 0) > 0;
        return isImplantDetailFormComplete(
          detailByTooth[row.toothNumber],
          fieldSettings,
          hasAbutments,
          selectedAbutmentHasTypeOptions(
            detailByTooth[row.toothNumber],
            product?.abutments
          )
        );
      }),
    [rows, detailByTooth, productById, fieldSettingsByCategory]
  );

  const defaultAddonPreview = useMemo(() => {
    const byProduct = new Map<number, Record<number, ImplantDetailData>>();
    for (const row of rows) {
      const productId = row.productId ?? 0;
      const details = byProduct.get(productId) ?? {};
      details[row.toothNumber] =
        detailByTooth[row.toothNumber] ?? defaultImplantDetailData();
      byProduct.set(productId, details);
    }
    const qtyByName = new Map<string, number>();
    for (const [productId, details] of byProduct.entries()) {
      const product = productById[productId];
      const entries = buildAbutmentAddonEntries(
        details,
        product?.abutments ?? [],
        product?.subcategory?.category_id ?? product?.subcategory?.category?.id ?? null
      );
      for (const entry of entries) {
        qtyByName.set(entry.name, (qtyByName.get(entry.name) ?? 0) + entry.qty);
      }
    }
    return Array.from(qtyByName.entries()).map(([name, qty]) => `${qty}x ${name}`);
  }, [rows, detailByTooth, productById]);

  if (!open) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const implant_details: Array<{
        id?: number | null;
        tooth_number: number;
        implant_id: number;
        implant_platform_id?: number;
        implant_platform_size_id?: number;
      }> = [];
      const abutment_details: Array<{
        tooth_number: number;
        abutment_type_id: number;
        abutment_option_id?: number;
      }> = [];

      const byProduct = new Map<number, ImplantVM[]>();
      for (const row of rows) {
        const productId = row.productId ?? 0;
        const list = byProduct.get(productId) ?? [];
        list.push(row);
        byProduct.set(productId, list);
      }

      for (const [productId, productRows] of byProduct.entries()) {
        const product = productById[productId] ?? {
          id: productId,
          abutments: [],
        } as ProductApiData;
        const details: Record<number, ImplantDetailData> = {};
        productRows.forEach((row) => {
          details[row.toothNumber] =
            detailByTooth[row.toothNumber] ?? defaultImplantDetailData();
        });
        const catalog =
          productId > 0 && customerId
            ? await fetchProductImplants(productId, customerId)
            : [];
        const mapped = buildImplantAndAbutmentDetails(product, details, catalog);
        for (const item of mapped.implant_details) {
          if (!item.implant_id) continue;
          const match = productRows.find((row) => row.toothNumber === item.teeth_number);
          implant_details.push({
            id: match?.implantDetailId,
            tooth_number: item.teeth_number,
            implant_id: item.implant_id,
            ...(item.implant_platform_id
              ? { implant_platform_id: item.implant_platform_id }
              : {}),
            ...(item.implant_platform_size_id
              ? { implant_platform_size_id: item.implant_platform_size_id }
              : {}),
          });
        }
        for (const item of mapped.abutment_details) {
          abutment_details.push({
            tooth_number: item.teeth_number,
            abutment_type_id: item.abutment_type_id,
            ...(item.abutment_option_id
              ? { abutment_option_id: item.abutment_option_id }
              : {}),
          });
        }
      }

      if (implant_details.length === 0) {
        throw new Error("Select an implant for each tooth.");
      }
      if (implant_details.length !== rows.length) {
        throw new Error("Complete implant details for every tooth.");
      }

      await putSlipImplantDetails(slipId, { implant_details, abutment_details });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {isEditMode ? "Edit implant details" : "Select implant details"}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {isEditMode
            ? "Update implant details for the selected teeth."
            : "Complete implant details for teeth that requested a lab recommendation."}
        </p>
        <div className="flex flex-col gap-3">
          {visibleRows.map((row) => {
            const product = row.productId ? productById[row.productId] : undefined;
            const categoryId = row.categoryId ?? product?.subcategory?.category_id ?? null;
            return (
              <ImplantDetailSection
                key={row.toothNumber}
                toothNumber={row.toothNumber}
                value={detailByTooth[row.toothNumber] ?? defaultImplantDetailData()}
                onChange={(data) =>
                  setDetailByTooth((prev) => ({ ...prev, [row.toothNumber]: data }))
                }
                productId={row.productId ?? product?.id}
                customerId={customerId ?? undefined}
                productAbutments={product?.abutments}
                fieldSettings={categoryId ? fieldSettingsByCategory[categoryId] : undefined}
                hideLabRecommendation
                isExpanded={expandedToothNumber === row.toothNumber}
                onExpandedChange={(expanded) => {
                  setExpandedToothNumber(expanded ? row.toothNumber : undefined);
                }}
              />
            );
          })}
        </div>
        {defaultAddonPreview.length > 0 ? (
          <p className="mt-3 text-sm text-gray-700">
            Default abutment addons: {defaultAddonPreview.join(", ")}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !complete || !productsLoaded}>
            {saving ? "Saving…" : isEditMode ? "Save changes" : "Save implant details"}
          </Button>
        </div>
      </div>
    </div>
  );
}
