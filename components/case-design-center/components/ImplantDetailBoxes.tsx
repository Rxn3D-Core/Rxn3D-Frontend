"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImplantDetailSection,
  defaultImplantDetailData,
  type ImplantDetailData,
} from "./ImplantDetailSection";
import { useSequentialImplantDetails } from "../hooks/useSequentialImplantDetails";
import type { ProductAbutment } from "@/services/implant-api";
import { resolveLibraryCustomerId } from "../utils/libraryCustomerId";
import {
  DEFAULT_IMPLANT_FIELD_SETTINGS,
  fetchCategoryImplantSettings,
  settingsForCategory,
  type ImplantFieldSettings,
} from "@/lib/api/category-implant-settings";
import { buildAbutmentAddonEntries } from "../utils/abutmentAddonSync";
import {
  cloneImplantDetailData,
  isCompleteLabRecommendation,
  isImplantDetailFormComplete,
} from "../utils/implantDetailHelpers";

interface ImplantDetailBoxesProps {
  toothNumbers: number[];
  retentionTypesMap: Record<number, string[]>;
  implantDetailByTooth: Record<number, ImplantDetailData>;
  setImplantDetailByTooth: React.Dispatch<
    React.SetStateAction<Record<number, ImplantDetailData>>
  >;
  implantDetailCompleteByTooth: Record<number, boolean>;
  setImplantDetailCompleteByTooth: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  caseSubmitted?: boolean;
  advanceFields?: import("../types").ProductAdvanceField[];
  productId?: number;
  productAbutments?: ProductAbutment[];
  categoryId?: number | null;
  onAbutmentAddonsChange?: (
    entries: Array<{ addon_id: number; qty: number; name: string }>
  ) => void;
  /** Lab customer id owning the product catalog (office flows select a lab in the wizard, not localStorage). */
  labCustomerId?: number | null;
  /** Arch-level: which implant tooth accordion is open (only one per arch). */
  expandedImplantTooth?: number;
  onExpandedImplantToothChange?: (toothNumber: number | undefined) => void;
}

export function ImplantDetailBoxes({
  toothNumbers,
  retentionTypesMap,
  implantDetailByTooth,
  setImplantDetailByTooth,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
  caseSubmitted = false,
  advanceFields,
  productId,
  productAbutments,
  categoryId,
  onAbutmentAddonsChange,
  labCustomerId,
  expandedImplantTooth,
  onExpandedImplantToothChange,
}: ImplantDetailBoxesProps) {
  const { visibleImplantTeeth, getImplantDetailValue, activeImplantTooth, implantTeeth } =
    useSequentialImplantDetails({
      toothNumbers,
      retentionTypesMap,
      implantDetailByTooth,
      setImplantDetailByTooth,
      implantDetailCompleteByTooth,
      setImplantDetailCompleteByTooth,
    });

  const isExpansionControlled = onExpandedImplantToothChange !== undefined;
  const [internalExpandedTooth, setInternalExpandedTooth] = useState<number | undefined>(
    activeImplantTooth
  );
  const expandedTooth = isExpansionControlled ? expandedImplantTooth : internalExpandedTooth;
  const setExpandedTooth = (tooth: number | undefined) => {
    if (isExpansionControlled) {
      onExpandedImplantToothChange(tooth);
    } else {
      setInternalExpandedTooth(tooth);
    }
  };

  // Auto-open the current incomplete implant tooth. Do not force-close: selecting
  // brand must keep the box open so platform / size / abutment can be chosen.
  useEffect(() => {
    if (activeImplantTooth != null) {
      setExpandedTooth(activeImplantTooth);
    }
  }, [activeImplantTooth]);

  const implantCustomerId = useMemo(
    () => labCustomerId ?? resolveLibraryCustomerId(),
    [labCustomerId]
  );
  const [fieldSettings, setFieldSettings] = useState<ImplantFieldSettings | undefined>(undefined);

  useEffect(() => {
    if (!categoryId || !implantCustomerId) return;
    fetchCategoryImplantSettings({
      customerId: implantCustomerId,
      categoryId,
    })
      .then((rows) => setFieldSettings(settingsForCategory(rows, categoryId)))
      .catch(() => setFieldSettings(undefined));
  }, [categoryId, implantCustomerId]);

  const hasAbutmentOptions = (productAbutments?.length ?? 0) > 0;
  const effectiveFieldSettings = fieldSettings ?? DEFAULT_IMPLANT_FIELD_SETTINGS;
  // Keep the parent complete flag in sync with the filled form. Relying only on
  // ImplantDetailSection's onCompleteChange effect can lag or miss a render.
  useEffect(() => {
    setImplantDetailCompleteByTooth((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const tn of visibleImplantTeeth) {
        const done = isImplantDetailFormComplete(
          implantDetailByTooth[tn],
          effectiveFieldSettings,
          hasAbutmentOptions
        );
        if (done && prev[tn] !== true) {
          next[tn] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [
    visibleImplantTeeth,
    implantDetailByTooth,
    effectiveFieldSettings,
    hasAbutmentOptions,
    setImplantDetailCompleteByTooth,
  ]);

  const lastAddonSig = useRef("");
  useEffect(() => {
    if (!onAbutmentAddonsChange) return;
    const entries = buildAbutmentAddonEntries(implantDetailByTooth, productAbutments ?? []);
    const sig = entries.map((e) => `${e.addon_id}:${e.qty}`).join("|");
    if (sig === lastAddonSig.current) return;
    lastAddonSig.current = sig;
    onAbutmentAddonsChange(entries);
  }, [implantDetailByTooth, productAbutments, onAbutmentAddonsChange]);

  if (visibleImplantTeeth.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {visibleImplantTeeth.map((implantToothNumber) => (
        <ImplantDetailSection
          key={implantToothNumber}
          toothNumber={implantToothNumber}
          isExpanded={expandedTooth === implantToothNumber}
          onExpandedChange={(expanded) => {
            if (expanded) {
              setExpandedTooth(implantToothNumber);
            } else if (expandedTooth === implantToothNumber) {
              setExpandedTooth(undefined);
            }
          }}
          value={getImplantDetailValue(implantToothNumber)}
          onChange={(data) => {
            const previous = implantDetailByTooth[implantToothNumber];
            // Preserve inclusion fields if a partial update somehow omitted them
            // (e.g. abutment-only patch from a stale closure).
            const merged: ImplantDetailData = {
              ...data,
              inclusions:
                data.inclusions ??
                previous?.inclusions ??
                defaultImplantDetailData().inclusions,
              inclusionQty:
                typeof data.inclusionQty === "number"
                  ? data.inclusionQty
                  : previous?.inclusionQty ?? 0,
              dynamicFields: {
                ...(previous?.dynamicFields ?? {}),
                ...(data.dynamicFields ?? {}),
              },
            };
            const applyingLabRec = !!merged.labRecommendationRequested;
            const clearingLabRec =
              !!previous?.labRecommendationRequested && !merged.labRecommendationRequested;
            const applyToGroup = applyingLabRec || clearingLabRec;

            setImplantDetailByTooth((prev) => {
              if (!applyToGroup || implantTeeth.length < 2) {
                return { ...prev, [implantToothNumber]: merged };
              }
              const next = { ...prev };
              const cloned = cloneImplantDetailData(merged);
              for (const tn of implantTeeth) {
                next[tn] = cloneImplantDetailData(cloned);
              }
              return next;
            });

            if (isCompleteLabRecommendation(merged)) {
              setImplantDetailCompleteByTooth((prev) => {
                const next = { ...prev };
                for (const tn of implantTeeth) {
                  next[tn] = true;
                }
                return next;
              });
            } else if (clearingLabRec) {
              setImplantDetailCompleteByTooth((prev) => {
                const next = { ...prev };
                for (const tn of implantTeeth) {
                  next[tn] = false;
                }
                return next;
              });
            }
          }}
          onCompleteChange={(complete) =>
            setImplantDetailCompleteByTooth((prev) => {
              if (prev[implantToothNumber] === complete) return prev;
              return { ...prev, [implantToothNumber]: complete };
            })
          }
          caseSubmitted={caseSubmitted}
          advanceFields={advanceFields}
          productId={productId}
          customerId={implantCustomerId}
          productAbutments={productAbutments}
          fieldSettings={fieldSettings}
        />
      ))}
    </div>
  );
}
