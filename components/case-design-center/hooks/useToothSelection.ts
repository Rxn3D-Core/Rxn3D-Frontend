"use client";

import { useState } from "react";
import type { Arch, RetentionType, RetentionPopoverState, AddedProduct, ProductExtraction } from "../types";
import { hasRetentionOptions } from "../utils/categoryHelpers";
import {
  isOverlayExtractionCode,
  toothHasTimBaseExtraction,
} from "../utils/extractionHelpers";

function isSelectionOnlyArch(addedProducts: AddedProduct[], arch: Arch): boolean {
  return addedProducts
    .filter((ap) => ap.arch === arch)
    .some((ap) => !hasRetentionOptions(ap.product));
}

export interface TreatArchAsRemovables {
  maxillary?: boolean;
  mandibular?: boolean;
}

export function useToothSelection(
  addedProducts: AddedProduct[] = [],
  treatArchAsRemovables?: TreatArchAsRemovables
) {
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([]);
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([]);

  const [maxillaryRetentionTypes, setMaxillaryRetentionTypes] = useState<Record<number, Array<RetentionType>>>({});
  const [mandibularRetentionTypes, setMandibularRetentionTypes] = useState<Record<number, Array<RetentionType>>>({});

  const [retentionPopoverState, setRetentionPopoverState] = useState<RetentionPopoverState>({
    arch: null,
    toothNumber: null,
  });

  // Maps toothNumber → extractionCode for non-default, exclusive extractions
  // Teeth NOT in this map are assumed to be in the default extraction (Teeth in mouth)
  const [maxillaryToothExtractionMap, setMaxillaryToothExtractionMap] = useState<Record<number, string>>({});
  const [mandibularToothExtractionMap, setMandibularToothExtractionMap] = useState<Record<number, string>>({});

  // Clasp is an overlay — a tooth can be in Clasps AND another status simultaneously
  const [maxillaryClaspTeeth, setMaxillaryClaspTeeth] = useState<number[]>([]);
  const [mandibularClaspTeeth, setMandibularClaspTeeth] = useState<number[]>([]);

  // Teeth assigned via the no-active-box path (tooth status popover) — these appear in BOTH status box and orange box
  const [maxillaryNoActiveBoxTeeth, setMaxillaryNoActiveBoxTeeth] = useState<number[]>([]);
  const [mandibularNoActiveBoxTeeth, setMandibularNoActiveBoxTeeth] = useState<number[]>([]);

  const maxillaryIsRemovables = treatArchAsRemovables?.maxillary ?? isSelectionOnlyArch(addedProducts, "maxillary");
  const mandibularIsRemovables = treatArchAsRemovables?.mandibular ?? isSelectionOnlyArch(addedProducts, "mandibular");

  const handleMaxillaryToothClick = (toothNumber: number) => {
    if (maxillaryIsRemovables) {
      // Removables: just toggle tooth selection, no retention popover
      setMaxillaryTeeth((prev) => {
        if (prev.includes(toothNumber)) {
          // Deselecting: also clean up extraction map and clasp set
          setMaxillaryToothExtractionMap((m) => {
            const { [toothNumber]: _, ...rest } = m;
            return rest;
          });
          setMaxillaryClaspTeeth((c) => c.filter((t) => t !== toothNumber));
          return prev.filter((t) => t !== toothNumber);
        }
        return [...prev, toothNumber];
      });
      return;
    }
    if (maxillaryTeeth.includes(toothNumber)) {
      setRetentionPopoverState({ arch: "maxillary", toothNumber });
    } else {
      setMaxillaryTeeth((prev) => [...prev, toothNumber]);
      setRetentionPopoverState({ arch: "maxillary", toothNumber });
    }
  };

  const handleMandibularToothClick = (toothNumber: number) => {
    if (mandibularIsRemovables) {
      // Removables: just toggle tooth selection, no retention popover
      setMandibularTeeth((prev) => {
        if (prev.includes(toothNumber)) {
          // Deselecting: also clean up extraction map and clasp set
          setMandibularToothExtractionMap((m) => {
            const { [toothNumber]: _, ...rest } = m;
            return rest;
          });
          setMandibularClaspTeeth((c) => c.filter((t) => t !== toothNumber));
          return prev.filter((t) => t !== toothNumber);
        }
        return [...prev, toothNumber];
      });
      return;
    }
    if (mandibularTeeth.includes(toothNumber)) {
      setRetentionPopoverState({ arch: "mandibular", toothNumber });
    } else {
      setMandibularTeeth((prev) => [...prev, toothNumber]);
      setRetentionPopoverState({ arch: "mandibular", toothNumber });
    }
  };

  const handleSelectRetentionType = (arch: Arch, toothNumber: number, type: RetentionType) => {
    const setter = arch === "maxillary" ? setMaxillaryRetentionTypes : setMandibularRetentionTypes;
    let isAdding = false;
    setter((prev) => {
      const current = prev[toothNumber] || [];
      if (current.includes(type)) {
        const { [toothNumber]: _, ...rest } = prev;
        return rest;
      }
      isAdding = true;
      return { ...prev, [toothNumber]: [type] };
    });
    // Mutual exclusivity: a tooth is either a retention type OR an extraction status —
    // assigning a retention type clears any extraction status on this tooth.
    if (isAdding) {
      const extSetter =
        arch === "maxillary" ? setMaxillaryToothExtractionMap : setMandibularToothExtractionMap;
      extSetter((m) => {
        if (!(toothNumber in m)) return m;
        const { [toothNumber]: _removed, ...rest } = m;
        return rest;
      });
    }
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
    setMaxillaryClaspTeeth((prev) => prev.filter((t) => t !== toothNumber));
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
    setMandibularClaspTeeth((prev) => prev.filter((t) => t !== toothNumber));
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  /**
   * Toggle a tooth into a non-default extraction box.
   * - Overlay extractions (overlay Yes): only on TIM base teeth; toggle independently of exclusive status
   * - Exclusive extractions: if already in that extraction → move back to default; otherwise assign
   */
  const handleToothExtractionToggle = (arch: Arch, toothNumber: number, extractionCode: string, extractions?: ProductExtraction[]) => {
    const toothExtractionMap =
      arch === "maxillary" ? maxillaryToothExtractionMap : mandibularToothExtractionMap;

    /** Look up max_teeth for the given extraction code (0 or negative = no limit) */
    const getMaxTeeth = (): number | null => {
      if (!extractions) return null;
      const ext = extractions.find((e) => e.code === extractionCode);
      const max = ext?.max_teeth ?? null;
      return max !== null && max > 0 ? max : null;
    };

    if (isOverlayExtractionCode(extractionCode, extractions)) {
      // Overlay: only on teeth whose base status is TIM (teeth in mouth / is_tim Yes)
      const setter = arch === "maxillary" ? setMaxillaryClaspTeeth : setMandibularClaspTeeth;
      setter((prev) => {
        if (prev.includes(toothNumber)) {
          return prev.filter((t) => t !== toothNumber);
        }
        if (!toothHasTimBaseExtraction(toothNumber, toothExtractionMap, extractions)) {
          return prev;
        }
        const maxTeeth = getMaxTeeth();
        if (maxTeeth !== null && prev.length >= maxTeeth) {
          return prev;
        }
        return [...prev, toothNumber];
      });
      return;
    }

    const setter = arch === "maxillary" ? setMaxillaryToothExtractionMap : setMandibularToothExtractionMap;
    const claspSetter = arch === "maxillary" ? setMaxillaryClaspTeeth : setMandibularClaspTeeth;
    const retentionSetter =
      arch === "maxillary" ? setMaxillaryRetentionTypes : setMandibularRetentionTypes;
    setter((prev) => {
      if (prev[toothNumber] === extractionCode) {
        // Already in this extraction → move back to default; also clear any clasp assignment
        claspSetter((c) => c.filter((t) => t !== toothNumber));
        const { [toothNumber]: _, ...rest } = prev;
        return rest;
      }
      // Adding — check max_teeth before assigning
      const maxTeeth = getMaxTeeth();
      if (maxTeeth !== null) {
        const currentCount = Object.values(prev).filter((c) => c === extractionCode).length;
        if (currentCount >= maxTeeth) {
          return prev; // At limit, block selection
        }
      }
      // Clear any prior clasp assignment before reassigning to a new exclusive code
      claspSetter((c) => c.filter((t) => t !== toothNumber));
      // Mutual exclusivity: a tooth is either a retention type OR an extraction status —
      // assigning a status clears any retention type (mirror of handleSelectRetentionType).
      retentionSetter((r) => {
        if (!(toothNumber in r)) return r;
        const { [toothNumber]: _removed, ...rest } = r;
        return rest;
      });
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
    setMaxillaryClaspTeeth([]);
    setMaxillaryNoActiveBoxTeeth([]);
  };

  const clearAllMandibularTeeth = () => {
    setMandibularTeeth([]);
    setMandibularRetentionTypes({});
    setMandibularToothExtractionMap({});
    setMandibularClaspTeeth([]);
    setMandibularNoActiveBoxTeeth([]);
  };

  return {
    maxillaryTeeth,
    mandibularTeeth,
    maxillaryRetentionTypes,
    mandibularRetentionTypes,
    retentionPopoverState,
    setRetentionPopoverState,
    // Exposed for read-only hydration (virtual slip page)
    setMaxillaryTeeth,
    setMandibularTeeth,
    setMaxillaryRetentionTypes,
    setMandibularRetentionTypes,
    handleMaxillaryToothClick,
    handleMandibularToothClick,
    handleSelectRetentionType,
    handleMaxillaryToothDeselect,
    handleMandibularToothDeselect,
    maxillaryToothExtractionMap,
    mandibularToothExtractionMap,
    setMaxillaryToothExtractionMap,
    setMandibularToothExtractionMap,
    maxillaryClaspTeeth,
    mandibularClaspTeeth,
    setMaxillaryClaspTeeth,
    setMandibularClaspTeeth,
    handleToothExtractionToggle,
    selectAllMaxillaryTeeth,
    selectAllMandibularTeeth,
    clearAllMaxillaryTeeth,
    clearAllMandibularTeeth,
    maxillaryNoActiveBoxTeeth,
    mandibularNoActiveBoxTeeth,
    setMaxillaryNoActiveBoxTeeth,
    setMandibularNoActiveBoxTeeth,
  };
}
