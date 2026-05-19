"use client";

import { useMemo } from "react";
import { ImplantDetailSection, ImplantDetailData } from "./ImplantDetailSection";
import { useSequentialImplantDetails } from "../hooks/useSequentialImplantDetails";
import type { ProductAbutment } from "@/services/implant-api";

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
}: ImplantDetailBoxesProps) {
  const { implantTeeth, visibleImplantTeeth, getImplantDetailValue } = useSequentialImplantDetails({
    toothNumbers,
    retentionTypesMap,
    implantDetailByTooth,
    setImplantDetailByTooth,
    implantDetailCompleteByTooth,
  });

  const implantCustomerId = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const role = localStorage.getItem("role");
    const id =
      role === "office_admin" || role === "doctor"
        ? localStorage.getItem("selectedLabId")
        : localStorage.getItem("customerId");
    return id ? Number(id) : undefined;
  }, []);

  if (visibleImplantTeeth.length === 0) return null;

  const primaryImplantTooth = implantTeeth[0];

  return (
    <div className="flex flex-col gap-3">
      {visibleImplantTeeth.map((implantToothNumber) => (
        <ImplantDetailSection
          key={implantToothNumber}
          toothNumber={implantToothNumber}
          defaultCollapsed={implantToothNumber !== primaryImplantTooth}
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
