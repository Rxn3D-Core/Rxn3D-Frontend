"use client";

/** Rounded color swatch for Gum Shade field previews in slip creation. */
export function GumShadePreviewSwatch({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  const fill = color.trim();
  if (!fill) return null;

  return (
    <svg
      width="29"
      height="29"
      viewBox="0 0 29 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`.trim()}
      aria-hidden
    >
      <rect width="28.0391" height="28.0391" rx="6" fill={fill} />
    </svg>
  );
}
