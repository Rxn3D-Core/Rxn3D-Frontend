"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { Arch, ProductApiData } from "../types";
import {
  cloneImplantDetailData,
  getImplantMirrorSourceTooth,
  isImplantDetailFilled,
} from "../utils/implantDetailHelpers";
import { hasImplantRetention } from "../utils/implantHelpers";

/**
 * When the same fixed/removable product exists on both arches, copy completed implant
 * detail from the peer arch into empty implant teeth on this arch (tooth numbers may differ).
 */
export function useCrossArchImplantMirror({
  arch,
  implantTeeth,
  retentionTypesMap,
  retentionOptions,
  peerImplantDetailByTooth,
  peerImplantCompleteByTooth,
  implantDetailByTooth,
  setImplantDetailByTooth,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
  caseSubmitted = false,
}: {
  arch: Arch;
  implantTeeth: number[];
  retentionTypesMap: Record<number, string[]>;
  retentionOptions?: ProductApiData["retention_options"];
  peerImplantDetailByTooth?: Record<number, ImplantDetailData>;
  peerImplantCompleteByTooth?: Record<number, boolean>;
  implantDetailByTooth: Record<number, ImplantDetailData>;
  setImplantDetailByTooth: Dispatch<SetStateAction<Record<number, ImplantDetailData>>>;
  implantDetailCompleteByTooth: Record<number, boolean>;
  setImplantDetailCompleteByTooth: Dispatch<SetStateAction<Record<number, boolean>>>;
  caseSubmitted?: boolean;
}) {
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (caseSubmitted) return;
    if (implantTeeth.length === 0) return;
    if (!hasImplantRetention(implantTeeth, retentionTypesMap, retentionOptions)) return;
    if (!peerImplantDetailByTooth || Object.keys(peerImplantDetailByTooth).length === 0) return;

    const peerImplantTeeth = Object.keys(peerImplantDetailByTooth)
      .map(Number)
      .filter((tn) => (peerImplantCompleteByTooth?.[tn] || isImplantDetailFilled(peerImplantDetailByTooth[tn])));

    if (peerImplantTeeth.length === 0) return;

    const localHasData = implantTeeth.some((tn) => isImplantDetailFilled(implantDetailByTooth[tn]));
    if (localHasData) return;

    const peerSourceTooth = getImplantMirrorSourceTooth(
      peerImplantTeeth,
      peerImplantCompleteByTooth ?? {},
      peerImplantDetailByTooth
    );
    if (peerSourceTooth == null) return;
    const source = peerImplantDetailByTooth[peerSourceTooth];
    if (!isImplantDetailFilled(source)) return;

    const cloneKey = `${peerSourceTooth}:${JSON.stringify(source)}`;
    if (appliedRef.current === cloneKey) return;
    appliedRef.current = cloneKey;

    const cloned = cloneImplantDetailData(source!);
    setImplantDetailByTooth((prev) => {
      const next = { ...prev };
      for (const tn of implantTeeth) {
        if (!isImplantDetailFilled(prev[tn])) {
          next[tn] = cloneImplantDetailData(cloned);
        }
      }
      return next;
    });
    setImplantDetailCompleteByTooth((prev) => {
      const next = { ...prev };
      for (const tn of implantTeeth) {
        if (prev[tn] !== true) next[tn] = true;
      }
      return next;
    });
  }, [
    arch,
    caseSubmitted,
    implantTeeth,
    retentionTypesMap,
    retentionOptions,
    peerImplantDetailByTooth,
    peerImplantCompleteByTooth,
    implantDetailByTooth,
    setImplantDetailByTooth,
    setImplantDetailCompleteByTooth,
  ]);
}
