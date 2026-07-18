"use client";

import { useEffect, useMemo, useState } from "react";
import { ImplantDetailSection, ImplantDetailData } from "./ImplantDetailSection";
import { useSequentialImplantDetails } from "../hooks/useSequentialImplantDetails";
import type { ProductAbutment } from "@/services/implant-api";
import { resolveLibraryCustomerId } from "../utils/libraryCustomerId";

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
  labCustomerId,
  expandedImplantTooth,
  onExpandedImplantToothChange,
}: ImplantDetailBoxesProps) {
  const { visibleImplantTeeth, getImplantDetailValue, activeImplantTooth } =
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

  // When the active (incomplete) implant tooth advances, auto-open only that accordion.
  useEffect(() => {
    if (activeImplantTooth != null) {
      setExpandedTooth(activeImplantTooth);
    }
  }, [activeImplantTooth]);

  const implantCustomerId = useMemo(
    () => labCustomerId ?? resolveLibraryCustomerId(),
    [labCustomerId]
  );

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
          onChange={(data) =>
            setImplantDetailByTooth((prev) => ({ ...prev, [implantToothNumber]: data }))
          }
          onCompleteChange={(complete) =>
            setImplantDetailCompleteByTooth((prev) => ({
              ...prev,
              [implantToothNumber]: complete,
            }))
          }
          caseSubmitted={caseSubmitted}
          advanceFields={advanceFields}
          productId={productId}
          customerId={implantCustomerId}
          productAbutments={productAbutments}
        />
      ))}
    </div>
  );
}
