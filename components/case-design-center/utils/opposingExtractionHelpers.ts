import type { Dispatch, SetStateAction } from "react";
import type { ProductExtraction, ProductOppositeExtraction } from "../types";
import {
  isOverlayExtractionCode,
  toothHasTimBaseExtraction,
} from "./extractionHelpers";

const MAXILLARY_ARCH_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_ARCH_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export function getOpposingArchTeeth(primaryArch: "maxillary" | "mandibular" | "both" | undefined): number[] {
  if (primaryArch === "maxillary") return [...MANDIBULAR_ARCH_TEETH];
  if (primaryArch === "mandibular") return [...MAXILLARY_ARCH_TEETH];
  return [];
}

/** Merge opposite_extractions rows with full product extraction metadata (color, images, overlay). */
export function mapOppositeExtractionsToProductExtractions(
  oppositeExtractions: ReadonlyArray<ProductOppositeExtraction> | undefined,
  productExtractions: ReadonlyArray<ProductExtraction> | undefined
): ProductExtraction[] {
  return (oppositeExtractions ?? [])
    .filter((row) => row?.code)
    .map((opp, idx) => {
      const oppExtra = opp as ProductOppositeExtraction & Partial<ProductExtraction>;
      const matched = (productExtractions ?? []).find(
        (e) =>
          Number(e.extraction_id) === Number(opp.id) ||
          e.code === opp.code ||
          Number(e.id) === Number(opp.id)
      );

      if (matched) {
        return {
          ...matched,
          name: opp.name ?? matched.name,
          code: opp.code ?? matched.code,
          color: opp.color ?? matched.color,
          is_default: opp.is_default ?? matched.is_default,
          is_required: opp.is_required ?? matched.is_required,
          is_optional: opp.is_optional ?? matched.is_optional,
          is_tim: oppExtra.is_tim ?? matched.is_tim,
          min_teeth: opp.min_teeth ?? matched.min_teeth,
          max_teeth: opp.max_teeth ?? matched.max_teeth,
          status: "Active",
        };
      }

      return {
        id: opp.id,
        extraction_id: opp.id,
        name: opp.name,
        code: opp.code,
        color: opp.color ?? null,
        url: null,
        is_default: opp.is_default ?? "No",
        is_required: opp.is_required ?? "No",
        is_optional: opp.is_optional ?? "No",
        min_teeth: opp.min_teeth ?? null,
        max_teeth: opp.max_teeth ?? null,
        is_image_extraction: oppExtra.is_image_extraction ?? "No",
        image_url: oppExtra.image_url ?? null,
        is_tim: oppExtra.is_tim ?? "No",
        overlay: oppExtra.overlay ?? "No",
        images: oppExtra.images ?? [],
        visibility_type: oppExtra.visibility_type ?? "Color",
        sequence: oppExtra.sequence ?? idx,
        status: "Active",
        price: null,
      };
    });
}

export function getOpposingSelectedTeeth(toothExtractionMap: Record<number, string>): number[] {
  return Object.keys(toothExtractionMap)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

export function toggleOpposingToothExtraction({
  toothNumber,
  extractionCode,
  extractions,
  toothExtractionMap,
  setToothExtractionMap,
  setClaspTeeth,
}: {
  toothNumber: number;
  extractionCode: string;
  extractions?: ProductExtraction[];
  toothExtractionMap: Record<number, string>;
  setToothExtractionMap: Dispatch<SetStateAction<Record<number, string>>>;
  setClaspTeeth: Dispatch<SetStateAction<number[]>>;
}): void {
  const getMaxTeeth = (): number | null => {
    if (!extractions) return null;
    const ext = extractions.find((e) => e.code === extractionCode);
    const max = ext?.max_teeth ?? null;
    return max !== null && max > 0 ? max : null;
  };

  if (isOverlayExtractionCode(extractionCode, extractions)) {
    setClaspTeeth((prev) => {
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

  setToothExtractionMap((prev) => {
    if (prev[toothNumber] === extractionCode) {
      setClaspTeeth((c) => c.filter((t) => t !== toothNumber));
      const { [toothNumber]: _, ...rest } = prev;
      return rest;
    }
    const maxTeeth = getMaxTeeth();
    if (maxTeeth !== null) {
      const currentCount = Object.values(prev).filter((c) => c === extractionCode).length;
      if (currentCount >= maxTeeth) {
        return prev;
      }
    }
    setClaspTeeth((c) => c.filter((t) => t !== toothNumber));
    return { ...prev, [toothNumber]: extractionCode };
  });
}
