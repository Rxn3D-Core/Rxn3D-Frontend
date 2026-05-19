import { useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { ImplantDetailData } from "../components/ImplantDetailSection";
import { defaultImplantDetailData } from "../components/ImplantDetailSection";
import {
  cloneImplantDetailData,
  getImplantTeethInGroup,
  getSequentialVisibleImplantTeeth,
  isImplantDetailFilled,
} from "../utils/implantDetailHelpers";

/** One implant box at a time; later teeth mirror the first once it is complete. */
export function useSequentialImplantDetails({
  toothNumbers,
  retentionTypesMap,
  implantDetailByTooth,
  setImplantDetailByTooth,
  implantDetailCompleteByTooth,
}: {
  toothNumbers: number[];
  retentionTypesMap: Record<number, string[]>;
  implantDetailByTooth: Record<number, ImplantDetailData>;
  setImplantDetailByTooth: Dispatch<SetStateAction<Record<number, ImplantDetailData>>>;
  implantDetailCompleteByTooth: Record<number, boolean>;
}) {
  const implantTeeth = useMemo(
    () => getImplantTeethInGroup(toothNumbers, retentionTypesMap),
    [toothNumbers, retentionTypesMap]
  );

  const visibleImplantTeeth = useMemo(
    () => getSequentialVisibleImplantTeeth(implantTeeth, implantDetailCompleteByTooth),
    [implantTeeth, implantDetailCompleteByTooth]
  );

  const primaryImplantTooth = implantTeeth[0];
  const primaryComplete =
    primaryImplantTooth != null &&
    implantDetailCompleteByTooth[primaryImplantTooth] === true;
  const primaryDetail =
    primaryImplantTooth != null ? implantDetailByTooth[primaryImplantTooth] : undefined;

  useEffect(() => {
    if (!primaryComplete || primaryImplantTooth == null || implantTeeth.length < 2) return;
    const source = implantDetailByTooth[primaryImplantTooth];
    if (!isImplantDetailFilled(source)) return;

    setImplantDetailByTooth((prev) => {
      let changed = false;
      const next = { ...prev };
      for (let i = 1; i < implantTeeth.length; i++) {
        const tn = implantTeeth[i];
        if (!isImplantDetailFilled(prev[tn])) {
          next[tn] = cloneImplantDetailData(source!);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

  }, [
    implantTeeth,
    primaryImplantTooth,
    primaryComplete,
    primaryDetail,
    implantDetailByTooth,
    setImplantDetailByTooth,
  ]);

  const getImplantDetailValue = useCallback(
    (toothNumber: number): ImplantDetailData => {
      const stored = implantDetailByTooth[toothNumber];
      if (isImplantDetailFilled(stored)) {
        return stored ?? defaultImplantDetailData();
      }
      if (
        primaryImplantTooth != null &&
        toothNumber !== primaryImplantTooth &&
        primaryComplete
      ) {
        const source = implantDetailByTooth[primaryImplantTooth];
        if (isImplantDetailFilled(source)) {
          return cloneImplantDetailData(source!);
        }
      }
      return stored ?? defaultImplantDetailData();
    },
    [implantDetailByTooth, primaryImplantTooth, primaryComplete]
  );

  return { implantTeeth, visibleImplantTeeth, getImplantDetailValue };
}
