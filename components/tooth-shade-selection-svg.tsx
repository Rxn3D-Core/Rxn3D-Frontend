import React, { useEffect, useMemo, useState } from "react";
import {
  CLASSICAL_FALLBACK_SHADES,
  getGuideLayout,
  getRackLineCount,
  resolveShadeColors,
  shadeStickDomId,
  shadeTranslate,
  SHADE_LAYOUT,
  STICK_PATHS,
  slotX,
  type ShadeGuideDisplayShade,
} from "./tooth-shade-guide-layout";

export type { ShadeGuideDisplayShade };

interface ToothShadeSelectionSVGProps {
  selectedShades: string[];
  onShadeClick?: (shade: string) => void;
  className?: string;
  showRequired?: boolean;
  /** Dynamic shade list from product API; falls back to VITA Classical. */
  shades?: ShadeGuideDisplayShade[];
  /** Footer label (e.g. selected shade guide system name). */
  guideLabel?: string;
}

function ShadeStickBlock({
  shade,
  index,
  isHovered,
  isClicked,
  isSelected,
}: {
  shade: ShadeGuideDisplayShade;
  index: number;
  isHovered: boolean;
  isClicked: boolean;
  isSelected: boolean;
}) {
  const id = shadeStickDomId(shade.name, index);
  const domIdSuffix = `${shade.name.replace(/\./g, "-")}-${index}`;
  const colors = resolveShadeColors(shade);
  const tx = shadeTranslate(index);

  const liftY = isClicked ? -10 : isHovered ? -60 : 0;
  const filter = isClicked
    ? "drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4))"
    : isHovered
      ? "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2))"
      : undefined;
  const scale = isClicked ? " scale(1.02)" : "";

  return (
    <g
      id={id}
      className="shade-stick"
      transform={`translate(${tx}, ${liftY})${scale}`}
      style={{
        transition: "transform 0.2s ease-out, filter 0.3s ease",
        transformOrigin: "center bottom",
        filter,
        cursor: "pointer",
      }}
      data-selected={isSelected ? "true" : "false"}
    >
      <defs>
        <filter
          id={`shade-shadow-${domIdSuffix}`}
          width="35.811"
          height="204.171"
          x="540.124"
          y="28.99"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dx="1.31" dy="4.584" />
          <feGaussianBlur stdDeviation="2.62" />
          <feColorMatrix values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
        <linearGradient
          id={`tooth-${domIdSuffix}`}
          x1="556.709"
          x2="556.709"
          y1="69.709"
          y2="29.645"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor={colors.color_code_cervical} />
          <stop offset="0.35" stopColor={colors.color_code_body} />
          <stop offset="0.65" stopColor={colors.color_code_body} />
          <stop offset="1" stopColor={colors.color_code_incisal} />
        </linearGradient>
        <linearGradient
          id={`highlight-f-${domIdSuffix}`}
          x1="563.5"
          x2="567.5"
          y1="63.5"
          y2="63.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`highlight-g-${domIdSuffix}`}
          x1="565.5"
          x2="566.5"
          y1="54"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`highlight-h-${domIdSuffix}`}
          x1="561"
          x2="563.5"
          y1="35"
          y2="37.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g filter={`url(#shade-shadow-${domIdSuffix})`}>
        <path fill="#8f8c88" d={STICK_PATHS.stick} />
        <path fill="#8f8c88" d={STICK_PATHS.neck} />
        <path fill={`url(#tooth-${domIdSuffix})`} d={STICK_PATHS.tooth} />
        <path fill={`url(#highlight-f-${domIdSuffix})`} d={STICK_PATHS.highlightF} opacity="0.42" />
        <path fill={`url(#highlight-g-${domIdSuffix})`} d={STICK_PATHS.highlightG} opacity="0.42" />
        <path fill={`url(#highlight-h-${domIdSuffix})`} d={STICK_PATHS.highlightH} opacity="0.42" />
      </g>
      <text
        x="557"
        y={SHADE_LAYOUT.labelY}
        textAnchor="middle"
        fontSize="8"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="600"
        fill="#000"
      >
        {shade.name}
      </text>
    </g>
  );
}

export const ToothShadeSelectionSVG: React.FC<ToothShadeSelectionSVGProps> = ({
  selectedShades,
  onShadeClick,
  className = "",
  showRequired = false,
  shades,
  guideLabel,
}) => {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayShades = shades?.length ? shades : CLASSICAL_FALLBACK_SHADES;
  const layout = useMemo(() => getGuideLayout(displayShades.length), [displayShades.length]);
  const rackLineCount = useMemo(
    () => getRackLineCount(layout.viewBoxWidth),
    [layout.viewBoxWidth]
  );

  useEffect(() => {
    setClickedIndex(null);
  }, [selectedShades]);

  const handleShadeClick = (index: number, shadeName: string) => {
    setClickedIndex(index);
    onShadeClick?.(shadeName);
  };

  const clipBWidth = layout.viewBoxWidth - SHADE_LAYOUT.clipBWidthDelta;
  const clipAUWidth = layout.viewBoxWidth - SHADE_LAYOUT.clipAUWidthDelta;
  const needsHorizontalScroll = layout.viewBoxWidth > SHADE_LAYOUT.baseViewBoxWidth;

  const hitAreaPath = displayShades
    .map((_, index) => {
      const x = slotX(index);
      const w = SHADE_LAYOUT.stickWidth;
      const h = SHADE_LAYOUT.hitAreaHeight;
      const y = SHADE_LAYOUT.hitAreaY;
      return `M${x} ${y}h${w}v${h}H${x}z`;
    })
    .join("");

  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox={`0 ${SHADE_LAYOUT.viewBoxY} ${layout.viewBoxWidth} ${SHADE_LAYOUT.viewBoxHeight}`}
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      className={showRequired ? "ring-2 ring-[#cf0202] rounded" : undefined}
    >
  <defs>
        <clipPath id="shade-guide-clip-a">
          <path fill="#fff" d={`M0-200h${layout.viewBoxWidth}v392.192H0z`} />
        </clipPath>
        <clipPath id="shade-guide-clip-b">
          <path fill="#fff" d={`M.417 81.624h${clipBWidth}V223.58H.417z`} />
        </clipPath>
        <clipPath id="shade-guide-clip-au">
          <path fill="#fff" d={`M.417 121.238h${clipAUWidth}V249.33H.416z`} />
        </clipPath>
        <linearGradient
          id="shade-guide-rail-gradient"
          x1={layout.centerX}
          x2={layout.centerX}
          y1="88"
          y2="123"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7a7d7e" />
          <stop offset="1" stopColor="#616263" />
          </linearGradient>
        <linearGradient
          id="shade-guide-rack-line"
          gradientUnits="objectBoundingBox"
          x1="1"
          y1="0.5"
          x2="0"
          y2="0.5"
        >
          <stop stopColor="#cfdce2" />
          <stop offset="0.99" stopColor="#a3a8a4" />
        </linearGradient>
  </defs>

      <g clipPath="url(#shade-guide-clip-a)">
        <rect fill="#fff" width={layout.viewBoxWidth} height="200" />
        <g clipPath="url(#shade-guide-clip-b)">
          <path
            fill="#616263"
            d={`M${SHADE_LAYOUT.holderLeft} 81.62h${layout.holderWidth}c5.749 0 10.413 2.757 10.413 6.155v87.88c0 9.164-12.59 16.605-28.095 16.605H28.526c-15.513 0-28.111-7.445-28.111-16.614V88.168c0-3.612 4.96-6.547 11.07-6.547`}
          />
        </g>

        <g id="shade-blocks">
          {displayShades.map((shade, index) => (
            <ShadeStickBlock
              key={`${shade.name}-${index}`}
              shade={shade}
              index={index}
              isHovered={hoveredIndex === index}
              isClicked={clickedIndex === index}
              isSelected={selectedShades.includes(shade.name)}
            />
          ))}
        </g>

        <g clipPath="url(#shade-guide-clip-au)">
          <path
            fill="#a3a8a4"
            d={`M${SHADE_LAYOUT.rackLeft} 122.956v53.449c0 8.754 12.565 15.856 28.07 15.856h${layout.rackBarWidth}c15.505 0 28.07-7.102 28.07-15.856v-53.449z`}
          />
          <g id="rack-lines">
            {Array.from({ length: rackLineCount }, (_, index) => (
              <g key={index} transform={`translate(${index * SHADE_LAYOUT.rackLineSpacing}, 0)`}>
                <path fill="url(#shade-guide-rack-line)" d={STICK_PATHS.rackLine} />
              </g>
            ))}
          </g>
          {guideLabel ? (
    <text
              x={layout.viewBoxWidth - 20}
              y="162"
              textAnchor="end"
              fontFamily="Inter, Arial, sans-serif"
              fontSize="10"
              fontStyle="italic"
              fill="#000"
            >
              {guideLabel}
    </text>
          ) : null}
        </g>
      </g>

      <g id="hit-areas">
        {displayShades.map((shade, index) => {
          const x = slotX(index);
          return (
  <rect
              key={`hit-${shade.name}-${index}`}
              x={x}
              y={SHADE_LAYOUT.hitAreaY}
              width={SHADE_LAYOUT.stickWidth}
              height={SHADE_LAYOUT.hitAreaHeight}
    fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex((prev) => (prev === index ? null : prev))}
              onClick={() => handleShadeClick(index, shade.name)}
            />
          );
        })}
        {/* Legacy combined path kept for accessibility tooling parity with reference */}
        <path fill="transparent" d={hitAreaPath} pointerEvents="none" />
      </g>
</svg>
  );

  return (
    <div
      className={`relative z-30 ${needsHorizontalScroll ? "overflow-x-auto overflow-y-visible" : "overflow-visible"} ${className}`}
      style={{ overflowY: "visible" }}
    >
      {svg}
      </div>
  );
};
