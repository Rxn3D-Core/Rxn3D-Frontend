"use client";

export type RetentionSelectorShapeDefinition = {
  id: string;
  name: string;
  apiName: string;
};

export const RETENTION_SELECTOR_SHAPE_IMAGE_DIR =
  "/images/retention-selector-shapes";

/** Selector shapes for retention options (product management, super admin, tooth chart). */
export const RETENTION_SELECTOR_SHAPES: RetentionSelectorShapeDefinition[] = [
  { id: "incomplete-circle", name: "Incomplete Circle", apiName: "Keyhole" },
  { id: "crescent", name: "Crescent", apiName: "Moon" },
  { id: "diamond", name: "Diamond", apiName: "Diamond" },
  { id: "square", name: "Square", apiName: "Square" },
  { id: "octagon", name: "Octagon", apiName: "Octagon" },
  { id: "triangle", name: "Triangle", apiName: "Triangle" },
  { id: "star", name: "Star", apiName: "Star" },
  { id: "pentagon", name: "Pentagon", apiName: "Pentagon" },
  { id: "starburst", name: "Starburst", apiName: "Burst" },
  { id: "implant", name: "Implant", apiName: "Implant" },
  { id: "prep", name: "Prep", apiName: "Prep" },
  { id: "pontic", name: "Pontic", apiName: "Pontic" },
];

export function getRetentionSelectorShapeByApiName(
  apiName: string | null | undefined
): RetentionSelectorShapeDefinition | undefined {
  if (!apiName) return undefined;
  const trimmed = apiName.trim();
  const exact = RETENTION_SELECTOR_SHAPES.find((s) => s.apiName === trimmed);
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  return RETENTION_SELECTOR_SHAPES.find(
    (s) => s.apiName.toLowerCase() === lower
  );
}

export function getRetentionSelectorShapeImageUrl(
  apiName: string | null | undefined
): string | null {
  const shape = getRetentionSelectorShapeByApiName(apiName);
  if (!shape) return null;
  return `${RETENTION_SELECTOR_SHAPE_IMAGE_DIR}/${shape.apiName}.png`;
}

export function getShapeApiName(shapeId: string): string | null {
  const shape = RETENTION_SELECTOR_SHAPES.find((s) => s.id === shapeId);
  return shape?.apiName ?? null;
}

export function getShapeIdFromApiName(apiName: string | null): string {
  if (!apiName) return "";
  const trimmed = apiName.trim();
  const shape =
    RETENTION_SELECTOR_SHAPES.find((s) => s.apiName === trimmed) ??
    RETENTION_SELECTOR_SHAPES.find(
      (s) => s.apiName.toLowerCase() === trimmed.toLowerCase()
    );
  return shape?.id ?? "";
}

/** Selected-state color used when tinting is needed (legacy). */
export const RETENTION_SELECTOR_SHAPE_COLOR = "#1162A8";
