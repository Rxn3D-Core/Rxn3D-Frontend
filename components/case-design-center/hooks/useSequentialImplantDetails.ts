import { useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { ImplantDetailData } from "../components/ImplantDetailSection";
import { defaultImplantDetailData } from "../components/ImplantDetailSection";
import {
  cloneImplantDetailData,
  getImplantMirrorSourceTooth,
  getImplantTeethInGroup,
  getSequentialVisibleImplantTeeth,
  isCompleteLabRecommendation,
  isImplantDetailFilled,
  isSameImplantDetailData,
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

  const visibleImplantTeeth = useMemo(() => {
    const anyLabRecommendation = implantTeeth.some(
      (tn) => implantDetailByTooth[tn]?.labRecommendationRequested
    );
    // Lab recommendation is one shared request for the implant group — show every tooth.
    if (anyLabRecommendation) return implantTeeth;
    return getSequentialVisibleImplantTeeth(implantTeeth, implantDetailCompleteByTooth);
  }, [implantTeeth, implantDetailCompleteByTooth, implantDetailByTooth]);

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
    const forceLabRecGroup = isCompleteLabRecommendation(source);

    setImplantDetailByTooth((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const tn of implantTeeth) {
        if (tn === mirrorSourceTooth) continue;
        const existing = prev[tn];
        const shouldOverwrite =
          forceLabRecGroup ||
          !isImplantDetailFilled(existing) ||
          (!!existing?.labRecommendationRequested &&
            !(existing.referencePhoto || existing.referencePhotoUrl)) ||
          // First tooth gained an abutment after later teeth were already mirrored.
          ((!!source?.abutmentType || !!source?.abutmentId) &&
            !(existing?.abutmentType || existing?.abutmentId));
        if (!shouldOverwrite) continue;
        // Lab-rec with photo used to reclone every run (forceLabRecGroup=true) → #185.
        if (isSameImplantDetailData(existing, source)) continue;
        next[tn] = cloneImplantDetailData(source!);
        changed = true;
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
      if (isCompleteLabRecommendation(stored)) {
        return stored ?? defaultImplantDetailData();
      }
      if (isImplantDetailFilled(stored) && !stored?.labRecommendationRequested) {
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

  const activeImplantTooth = visibleImplantTeeth.find(
    (tn) => implantDetailCompleteByTooth[tn] !== true
  );

  return {
    implantTeeth,
    visibleImplantTeeth,
    getImplantDetailValue,
    activeImplantTooth,
    mirrorSourceTooth,
  };
}
