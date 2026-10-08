"use client";

import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

interface ProductImagePreviewProps {
  imageUrl: string | null | undefined;
  altText: string;
  /** Classes for the thumbnail container */
  containerClassName?: string;
  /** Classes for the thumbnail img element */
  imgClassName?: string;
  /** Fallback when no image */
  fallback?: React.ReactNode;
}

/** Compact product thumbnail in accordion header rows (50×50). */
export const productAccordionThumbnailContainerClass =
  "w-[50px] h-[50px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden";

/** Large product image in removable/fixed accordion headers (130×130).
 *  Matches product-name fieldset: 6px radius + light gray border, flush image. */
export const productAccordionLargeImageContainerClass =
  "w-[130px] h-[130px] rounded-[6px] border border-[rgb(217,217,217)] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-0";

/** Flush large accordion product image (no container padding). */
export const productAccordionLargeImageImgClass =
  "w-full h-full object-cover block";

/**
 * Wraps a product thumbnail so that hovering shows a larger preview popover.
 */
export function ProductImagePreview({
  imageUrl,
  altText,
  containerClassName = productAccordionThumbnailContainerClass,
  imgClassName = "w-[50px] h-[50px] object-cover",
  fallback,
}: ProductImagePreviewProps) {
  const defaultFallback = (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[10px] text-gray-400">No img</span>
    </div>
  );

  if (!imageUrl) {
    return <div className={containerClassName}>{fallback || defaultFallback}</div>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className={`${containerClassName} cursor-pointer`}>
          <img src={imageUrl} alt={altText} className={imgClassName} />
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="center"
        sideOffset={8}
        className="w-[240px] h-[240px] p-2 bg-white rounded-lg shadow-xl border border-gray-200 flex items-center justify-center"
      >
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-full max-h-full object-cover"
        />
      </HoverCardContent>
    </HoverCard>
  );
}
