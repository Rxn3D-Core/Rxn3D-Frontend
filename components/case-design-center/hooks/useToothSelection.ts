"use client";

import { useState } from "react";
import type { Arch, RetentionType, RetentionPopoverState } from "../types";

export function useToothSelection() {
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([]);
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([]);

  const [maxillaryRetentionTypes, setMaxillaryRetentionTypes] = useState<Record<number, Array<RetentionType>>>({});
  const [mandibularRetentionTypes, setMandibularRetentionTypes] = useState<Record<number, Array<RetentionType>>>({});

  const [retentionPopoverState, setRetentionPopoverState] = useState<RetentionPopoverState>({
    arch: null,
    toothNumber: null,
  });

  // Maps toothNumber → extractionCode for non-default extractions
  // Teeth NOT in this map are assumed to be in the default extraction (Teeth in mouth)
  const [maxillaryToothExtractionMap, setMaxillaryToothExtractionMap] = useState<Record<number, string>>({});
  const [mandibularToothExtractionMap, setMandibularToothExtractionMap] = useState<Record<number, string>>({});

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
    setMaxillaryToothExtractionMap((prev) => {
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
    setMandibularToothExtractionMap((prev) => {
      const { [toothNumber]: _, ...rest } = prev;
      return rest;
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  /**
   * Toggle a tooth into a non-default extraction box.
   * - If tooth is already in that extraction → move it back to default (remove from map)
   * - If tooth is in default or another extraction → assign it to this extraction
   */
  const handleToothExtractionToggle = (arch: Arch, toothNumber: number, extractionCode: string) => {
    const setter = arch === "maxillary" ? setMaxillaryToothExtractionMap : setMandibularToothExtractionMap;

    setter((prev) => {
      if (prev[toothNumber] === extractionCode) {
        // Already in this extraction → move back to default
        const { [toothNumber]: _, ...rest } = prev;
        return rest;
      }
      // Assign to this extraction
      return { ...prev, [toothNumber]: extractionCode };
    });
  };

  const selectAllMaxillaryTeeth = (teeth: number[]) => {
    setMaxillaryTeeth((prev) => {
      const merged = [...new Set([...prev, ...teeth])];
      return merged;
    });
  };

  const selectAllMandibularTeeth = (teeth: number[]) => {
    setMandibularTeeth((prev) => {
      const merged = [...new Set([...prev, ...teeth])];
      return merged;
    });
  };

  const clearAllMaxillaryTeeth = () => {
    setMaxillaryTeeth([]);
    setMaxillaryRetentionTypes({});
    setMaxillaryToothExtractionMap({});
  };

  const clearAllMandibularTeeth = () => {
    setMandibularTeeth([]);
    setMandibularRetentionTypes({});
    setMandibularToothExtractionMap({});
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
    maxillaryToothExtractionMap,
    mandibularToothExtractionMap,
    handleToothExtractionToggle,
    selectAllMaxillaryTeeth,
    selectAllMandibularTeeth,
    clearAllMaxillaryTeeth,
    clearAllMandibularTeeth,
  };
}
