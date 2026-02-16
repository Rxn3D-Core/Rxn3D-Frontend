"use client";

import { useState } from "react";
import type { Arch, RetentionType, RetentionPopoverState } from "../types";

export function useToothSelection() {
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([4, 5]);
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([19, 20]);

  const [maxillaryRetentionTypes, setMaxillaryRetentionTypes] = useState<Record<number, Array<RetentionType>>>({});
  const [mandibularRetentionTypes, setMandibularRetentionTypes] = useState<Record<number, Array<RetentionType>>>({});

  const [retentionPopoverState, setRetentionPopoverState] = useState<RetentionPopoverState>({
    arch: null,
    toothNumber: null,
  });

  const handleMaxillaryToothClick = (toothNumber: number) => {
    if (maxillaryTeeth.includes(toothNumber)) {
      setRetentionPopoverState({ arch: "maxillary", toothNumber });
    } else {
      setMaxillaryTeeth((prev) => [...prev, toothNumber]);
      setRetentionPopoverState({ arch: "maxillary", toothNumber });
    }
  };

  const handleMandibularToothClick = (toothNumber: number) => {
    if (mandibularTeeth.includes(toothNumber)) {
      setRetentionPopoverState({ arch: "mandibular", toothNumber });
    } else {
      setMandibularTeeth((prev) => [...prev, toothNumber]);
      setRetentionPopoverState({ arch: "mandibular", toothNumber });
    }
  };

  const handleSelectRetentionType = (arch: Arch, toothNumber: number, type: RetentionType) => {
    const setter = arch === "maxillary" ? setMaxillaryRetentionTypes : setMandibularRetentionTypes;
    setter((prev) => {
      const current = prev[toothNumber] || [];
      if (current.includes(type)) {
        const { [toothNumber]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [toothNumber]: [type] };
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  const handleMaxillaryToothDeselect = (toothNumber: number) => {
    setMaxillaryTeeth((prev) => prev.filter((t) => t !== toothNumber));
    setMaxillaryRetentionTypes((prev) => {
      const { [toothNumber]: _, ...rest } = prev;
      return rest;
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  const handleMandibularToothDeselect = (toothNumber: number) => {
    setMandibularTeeth((prev) => prev.filter((t) => t !== toothNumber));
    setMandibularRetentionTypes((prev) => {
      const { [toothNumber]: _, ...rest } = prev;
      return rest;
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  return {
    maxillaryTeeth,
    mandibularTeeth,
    maxillaryRetentionTypes,
    mandibularRetentionTypes,
    retentionPopoverState,
    setRetentionPopoverState,
    handleMaxillaryToothClick,
    handleMandibularToothClick,
    handleSelectRetentionType,
    handleMaxillaryToothDeselect,
    handleMandibularToothDeselect,
  };
}
