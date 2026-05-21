import { useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { ImplantDetailData } from "../components/ImplantDetailSection";
import { defaultImplantDetailData } from "../components/ImplantDetailSection";
import {
  cloneImplantDetailData,
  getImplantMirrorSourceTooth,
  getImplantTeethInGroup,
  getSequentialVisibleImplantTeeth,
  isImplantDetailFilled,
} from "../utils/implantDetailHelpers";

/** One implant box at a time; later teeth mirror the first completed implant. */
export function useSequentialImplantDetails({
  toothNumbers,
  retentionTypesMap,
  implantDetailByTooth,
  setImplantDetailByTooth,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
}: {
  toothNumbers: number[];
  retentionTypesMap: Record<number, string[]>;
  implantDetailByTooth: Record<number, ImplantDetailData>;
  setImplantDetailByTooth: Dispatch<SetStateAction<Record<number, ImplantDetailData>>>;
  implantDetailCompleteByTooth: Record<number, boolean>;
  setImplantDetailCompleteByTooth: Dispatch<SetStateAction<Record<number, boolean>>>;
}) {
  const implantTeeth = useMemo(
    () => getImplantTeethInGroup(toothNumbers, retentionTypesMap),
    [toothNumbers, retentionTypesMap]
  );

  const visibleImplantTeeth = useMemo(
    () => getSequentialVisibleImplantTeeth(implantTeeth, implantDetailCompleteByTooth),
    [implantTeeth, implantDetailCompleteByTooth]
  );

  const mirrorSourceTooth = useMemo(
    () =>
      getImplantMirrorSourceTooth(
        implantTeeth,
        implantDetailCompleteByTooth,
        implantDetailByTooth
      ),
    [implantTeeth, implantDetailCompleteByTooth, implantDetailByTooth]
  );

  const mirrorSourceComplete =
    mirrorSourceTooth != null &&
    implantDetailCompleteByTooth[mirrorSourceTooth] === true;

  useEffect(() => {
    if (!mirrorSourceComplete || mirrorSourceTooth == null || implantTeeth.length < 2) {
      return;
    }
    const source = implantDetailByTooth[mirrorSourceTooth];
    if (!isImplantDetailFilled(source)) return;

    setImplantDetailByTooth((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const tn of implantTeeth) {
        if (tn === mirrorSourceTooth) continue;
        if (!isImplantDetailFilled(prev[tn])) {
          next[tn] = cloneImplantDetailData(source!);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setImplantDetailCompleteByTooth((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const tn of implantTeeth) {
        if (tn === mirrorSourceTooth) continue;
        if (prev[tn] !== true) {
          next[tn] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [
    implantTeeth,
    mirrorSourceTooth,
    mirrorSourceComplete,
    implantDetailByTooth,
    setImplantDetailByTooth,
    setImplantDetailCompleteByTooth,
  ]);

  const getImplantDetailValue = useCallback(
    (toothNumber: number): ImplantDetailData => {
      const stored = implantDetailByTooth[toothNumber];
      if (isImplantDetailFilled(stored)) {
        return stored ?? defaultImplantDetailData();
      }
      if (
        mirrorSourceTooth != null &&
        toothNumber !== mirrorSourceTooth &&
        mirrorSourceComplete
      ) {
        const source = implantDetailByTooth[mirrorSourceTooth];
        if (isImplantDetailFilled(source)) {
          return cloneImplantDetailData(source!);
        }
      }
      return stored ?? defaultImplantDetailData();
    },
    [implantDetailByTooth, mirrorSourceTooth, mirrorSourceComplete]
  );

  const activeImplantTooth =
    visibleImplantTeeth.length > 0
      ? visibleImplantTeeth[visibleImplantTeeth.length - 1]
      : undefined;

  return {
    implantTeeth,
    visibleImplantTeeth,
    getImplantDetailValue,
    activeImplantTooth,
    mirrorSourceTooth,
  };
}
