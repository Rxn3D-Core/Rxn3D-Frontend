import React from "react";
import { getRetentionSelectorShapeImageUrl } from "@/components/retention-option-selector-shapes";

/**
 * Renders a retention selector_shape on the arch chart using PNG assets
 * (same files as product management / super admin shape picker).
 */
export function RetentionSelectorShapeGraphic({
  shapeApiName,
  size,
}: {
  shapeApiName: string;
  size: number;
}) {
  const src = getRetentionSelectorShapeImageUrl(shapeApiName);
  if (!src) return null;

  return (
    <image
      href={src}
      x={0}
      y={0}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none" }}
    />
  );
}
