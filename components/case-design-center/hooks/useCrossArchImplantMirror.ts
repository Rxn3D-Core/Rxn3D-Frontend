"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { Arch, ProductApiData } from "../types";
import {
  cloneImplantDetailData,
  getImplantMirrorSourceTooth,
  isImplantDetailFilled,
} from "../utils/implantDetailHelpers";
/**
 * When the same fixed/removable product exists on both arches, copy completed implant
 * detail from the peer arch into empty implant teeth on this arch (tooth numbers may differ).
 * Works in both directions (upper→lower and lower→upper): whichever arch fills first,
 * the data clones to the other. User can override after the first-time clone.
 */
export function useCrossArchImplantMirror({
  arch,
  implantTeeth,
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
  /** @deprecated No longer used — implantTeeth already pre-filtered to Implant teeth. Kept for call-site compatibility. */
  retentionTypesMap?: Record<number, string[]>;
  /** @deprecated No longer used — retentionOptions availability was an unreliable guard. Kept for call-site compatibility. */
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
    // implantTeeth is already filtered to teeth with "Implant" retention type.
    if (implantTeeth.length === 0) return;
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
    peerImplantDetailByTooth,
    peerImplantCompleteByTooth,
    implantDetailByTooth,
    setImplantDetailByTooth,
    setImplantDetailCompleteByTooth,
  ]);
}
