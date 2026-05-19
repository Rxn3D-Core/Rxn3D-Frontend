"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  getRetentionSelectorShapeByApiName,
  getRetentionSelectorShapeImageUrl,
} from "@/components/retention-option-selector-shapes";

type RetentionSelectorShapeImageProps = {
  apiName: string;
  size?: number;
  /** When false, shows a muted version for unselected picker states. */
  selected?: boolean;
  className?: string;
  alt?: string;
};

/**
 * Renders a retention selector shape from PNG assets in public/images/retention-selector-shapes/.
 */
export function RetentionSelectorShapeImage({
  apiName,
  size = 38,
  selected = true,
  className,
  alt,
}: RetentionSelectorShapeImageProps) {
  const src = getRetentionSelectorShapeImageUrl(apiName);
  const shape = getRetentionSelectorShapeByApiName(apiName);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt ?? shape?.name ?? apiName}
      width={size}
      height={size}
      className={cn(
        "object-contain pointer-events-none",
        !selected && "opacity-40 grayscale",
        className
      )}
      draggable={false}
    />
  );
}
