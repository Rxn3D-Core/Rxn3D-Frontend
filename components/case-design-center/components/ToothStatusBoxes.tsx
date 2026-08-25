import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useSupportsHover } from "@/hooks/use-supports-hover";
import { DoneTransitionButton } from "./DoneTransitionButton";
import type { ProductExtraction } from "../types";
import { formatToothNumbersLabel } from "@/lib/virtual-slip-display";
import { getStatusBoxTeeth } from "../utils/removableToothDisplay";
import {
  isOverlayExtractionByFlag,
  isTimExtractionByFlag,
  shouldAutoSelectArchForDefaultExtraction,
} from "../utils/extractionHelpers";

interface ToothStatusBoxesProps {
  extractions: ProductExtraction[];
  selectedTeeth: number[];
  /** All tooth numbers for this arch (e.g. 1-16 for maxillary) */
  allArchTeeth: number[];
  /** toothNumber → extractionCode for teeth assigned to a non-TIM exclusive extraction */
  toothExtractionMap: Record<number, string>;
  /** Teeth assigned to the Clasp overlay (can coexist with other statuses) */
  claspTeeth: number[];
  /** Currently active extraction code (null = none selected) */
  activeExtractionCode: string | null;
  /** Called when a box is clicked to make it active — optionally receives the full extractions list */
  onActiveExtractionChange: (code: string | null, extractions?: ProductExtraction[]) => void;
  onToothExtractionToggle: (toothNumber: number, extractionCode: string, extractions?: ProductExtraction[]) => void;
  /** Called when "Teeth in mouth" box is clicked — selects all arch teeth */
  onSelectAllTeeth: (teeth: number[]) => void;
  /** Called whenever the required-validation error state changes */
  onRequiredValidationChange?: (hasValidation: boolean) => void;
  /** When true, enables removable-specific display: "All teeth selected" label and compact empty boxes */
  isRemovable?: boolean;
  /** When true, case has been submitted — hide blue active border on status boxes */
  submitted?: boolean;
  /** When true, do not auto-select all arch teeth for catalog default extraction (default tooth chart owns defaults). */
  skipDefaultAutoSelect?: boolean;
  /** When true, hide the default (Teeth in mouth) box — it's shown in the center navigation instead */
  hideDefaultBox?: boolean;
  /** When true, suppress the "Required: select at least N tooth" validation outline and message */
  disableRequiredValidation?: boolean;
  /** When true, render boxes with gray border and gray text (used in accordion headers) */
  grayed?: boolean;
  /** Optional UI-only display override keyed by extraction code. */
  displayTeethByCode?: Record<string, number[]>;
  /** Optional acknowledgement props to control Done button display */
  acknowledged?: boolean;
  onAcknowledgedChange?: (value: boolean) => void;
  /** Smaller icons and tighter boxes (virtual slip read-only view). */
  compact?: boolean;
}

const CleanToothSVG = ({ width = 40, height = 50 }: { width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 4C14.5 4 11 6.5 11 12C11 15.5 12 18.5 13 22C13.5 23.5 13 25.5 12.5 27.5C12.2 28.7 13.5 30 14.8 29.5C16.5 28.8 17.2 27 18 27C18.8 27 19.5 28.8 21.2 29.5C22.5 30 23.8 28.7 23.5 27.5C23 25.5 22.5 23.5 23 22C24 18.5 25 15.5 25 12C25 6.5 21.5 4 18 4Z"
      fill="#F2F2F2"
      stroke="#D9D9D9"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M14.5 10C14.5 10 16 9 18 9C20 9 21.5 10 21.5 10" stroke="#E6E6E6" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const RedXToothSVG = ({ width = 40, height = 50 }: { width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 4C14.5 4 11 6.5 11 12C11 15.5 12 18.5 13 22C13.5 23.5 13 25.5 12.5 27.5C12.2 28.7 13.5 30 14.8 29.5C16.5 28.8 17.2 27 18 27C18.8 27 19.5 28.8 21.2 29.5C22.5 30 23.8 28.7 23.5 27.5C23 25.5 22.5 23.5 23 22C24 18.5 25 15.5 25 12C25 6.5 21.5 4 18 4Z"
      fill="#F5EFEB"
      stroke="#D3C7BE"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M11.5 11.5L24.5 24.5M24.5 11.5L11.5 24.5" stroke="#A80000" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

const FixRepairSVG = ({ width = 40, height = 50 }: { width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 4C14.5 4 11 6.5 11 12C11 15.5 12 18.5 13 22C13.5 23.5 13 25.5 12.5 27.5C12.2 28.7 13.5 30 14.8 29.5C16.5 28.8 17.2 27 18 27C18.8 27 19.5 28.8 21.2 29.5C22.5 30 23.8 28.7 23.5 27.5C23 25.5 22.5 23.5 23 22C24 18.5 25 15.5 25 12C25 6.5 21.5 4 18 4Z"
      fill="#F2F2F2"
      stroke="#D9D9D9"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M13 20C13 18 14 17 15 17C16 17 17 18 17 20C17 21 16 22 15 22C14 22 13 21 13 20Z" fill="#1162A8" />
    <path d="M15 22L11 26" stroke="#1162A8" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ClaspsSVG = ({ width = 40, height = 50 }: { width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 4C14.5 4 11 6.5 11 12C11 15.5 12 18.5 13 22C13.5 23.5 13 25.5 12.5 27.5C12.2 28.7 13.5 30 14.8 29.5C16.5 28.8 17.2 27 18 27C18.8 27 19.5 28.8 21.2 29.5C22.5 30 23.8 28.7 23.5 27.5C23 25.5 22.5 23.5 23 22C24 18.5 25 15.5 25 12C25 6.5 21.5 4 18 4Z"
      fill="#F2F2F2"
      stroke="#D9D9D9"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M10 12C12 14 15 14 18 13C21 12 24 12 26 14" stroke="#7F8C8D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M9.5 12.5C9.5 12.5 9 10 10.5 9.5" stroke="#7F8C8D" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

function getExtractionIcon(code: string, name: string, width = 40, height = 50) {
  const lowerName = (name || "").toLowerCase();
  if (code === "MT" || lowerName.includes("missing")) {
    return <CleanToothSVG width={width} height={height} />;
  }
  if (code === "WE" || lowerName.includes("extract")) {
    return <RedXToothSVG width={width} height={height} />;
  }
  if (code === "FR" || code === "RP" || lowerName.includes("fix") || lowerName.includes("repair")) {
    return <FixRepairSVG width={width} height={height} />;
  }
  if (code === "CL" || lowerName.includes("clasp")) {
    return <ClaspsSVG width={width} height={height} />;
  }
  return <CleanToothSVG width={width} height={height} />;
}

/** Unassigned teeth (not in toothExtractionMap) belong to the is_tim extraction bucket. */
function isDefaultExtraction(extraction: ProductExtraction): boolean {
  return isTimExtractionByFlag(extraction);
}

/** Returns true if this extraction is required (is_required: "Yes", e.g. "Missing teeth") */
function isRequiredExtraction(extraction: ProductExtraction): boolean {
  return (
    extraction.is_required === "Yes" ||
    extraction.code === "MT" ||
    (extraction.name ?? "").toLowerCase().trim() === "missing teeth"
  );
}

/** Returns true if this extraction is optional (is_optional: "Yes", e.g. "Will extract on delivery", "Clasps") */
function isOptionalExtraction(extraction: ProductExtraction): boolean {
  return extraction.is_optional === "Yes";
}

/** Overlay extractions (API overlay === Yes) — teeth can coexist with TIM base status only. */
function isClaspExtraction(extraction: ProductExtraction): boolean {
  return isOverlayExtractionByFlag(extraction);
}

export function ToothStatusBoxes({
  extractions,
  selectedTeeth,
  allArchTeeth,
  toothExtractionMap,
  claspTeeth,
  activeExtractionCode,
  onActiveExtractionChange,
  onToothExtractionToggle: _onToothExtractionToggle,
  onSelectAllTeeth,
  onRequiredValidationChange,
  isRemovable = false,
  submitted = false,
  hideDefaultBox = false,
  skipDefaultAutoSelect = false,
  disableRequiredValidation = false,
  grayed = false,
  displayTeethByCode,
  acknowledged = false,
  onAcknowledgedChange,
  compact = false,
}: ToothStatusBoxesProps) {
  const allActiveExtractions = extractions
    .filter((e) => e.status === "Active" && e.name != null && e.code != null)
    .sort((a, b) => a.sequence - b.sequence);

  const activeExtractions = hideDefaultBox
    ? allActiveExtractions.filter((e) => !isTimExtractionByFlag(e))
    : allActiveExtractions;

  // Auto-select all arch teeth when a is_default extraction first appears (check unfiltered list)
  const hasAutoSelected = useRef(false);
  const shouldAutoSelectDefaultTeeth =
    !skipDefaultAutoSelect &&
    shouldAutoSelectArchForDefaultExtraction(allActiveExtractions);
  useEffect(() => {
    if (shouldAutoSelectDefaultTeeth && !hasAutoSelected.current && selectedTeeth.length === 0) {
      hasAutoSelected.current = true;
      onSelectAllTeeth(allArchTeeth);
    }
  }, [shouldAutoSelectDefaultTeeth, allArchTeeth, onSelectAllTeeth, selectedTeeth.length]);

  if (activeExtractions.length === 0) return null;

  const getTeethForBox = (extraction: ProductExtraction): number[] =>
    getStatusBoxTeeth({
      selectedTeeth,
      toothExtractionMap,
      claspTeeth,
      extractionCode: extraction.code,
      isDefault: isDefaultExtraction(extraction),
      isClasp: isClaspExtraction(extraction),
    });

  // Check if any optional extraction has teeth assigned (used for required validation)
  const anyOptionalHasTeeth = activeExtractions
    .filter((e) => isOptionalExtraction(e))
    .some((e) => getTeethForBox(e).length > 0);

  // Compute whether any required box is showing a validation error
  const hasRequiredValidation = !disableRequiredValidation && activeExtractions.some((e) => {
    if (!isRequiredExtraction(e)) return false;
    const teethForBox = getTeethForBox(e);
    return teethForBox.length === 0 && !anyOptionalHasTeeth;
  });

  const supportsHover = useSupportsHover();
  const [tooltipState, setTooltipState] = useState<{ label: string; x: number; y: number } | null>(null);

  const prevRequiredValidationRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevRequiredValidationRef.current === hasRequiredValidation) return;
    prevRequiredValidationRef.current = hasRequiredValidation;
    onRequiredValidationChange?.(hasRequiredValidation);
  }, [hasRequiredValidation, onRequiredValidationChange]);

  const isInteractive = !submitted && !grayed;
  const iconWidth = compact ? 26 : 40;
  const iconHeight = compact ? 30 : 50;
  const iconLeft = compact ? -10 : -18;
  const boxMinHeight = compact ? 40 : 50;
  const boxMinWidth = compact ? 120 : 148;
  const boxPadding = compact ? "4px 10px 4px 28px" : "8px 12px 8px 36px";
  const iconMaxHeight = compact ? boxMinHeight - 8 : iconHeight;
  const formatBoxTeethLabel = (teeth: number[]) =>
    compact
      ? formatToothNumbersLabel(teeth, { separator: ", " })
      : `#${[...teeth].sort((a, b) => a - b).join(", ")}`;

  return (
    <div
      className={`flex w-full flex-col ${
        compact
          ? "items-start gap-2 py-0"
          : `items-center justify-center ${acknowledged ? "pt-2 pb-0" : "py-0"}`
      }`}
    >
      {/* Horizontally centered row of extraction options */}
      <div
        className={`flex flex-wrap items-center ${
          compact ? "justify-start gap-3" : "justify-center gap-x-6 gap-y-2"
        }`}
      >
        {activeExtractions.map((extraction) => {
          const isActive = !submitted && activeExtractionCode === extraction.code;
          const teethForBox = getTeethForBox(extraction);
          const displayTeethForBox = displayTeethByCode?.[extraction.code] ?? teethForBox;
          const isEmpty = teethForBox.length === 0;

          // When submitted, hide empty boxes (no teeth assigned)
          if (submitted && isEmpty) return null;

          const toggleBox = () => {
            if (!isInteractive) return;
            onActiveExtractionChange(isActive ? null : extraction.code, extractions);
          };

          const boxIcon = extraction.image_url ? (
            <img
              alt=""
              loading="lazy"
              width={iconWidth}
              height={iconHeight}
              decoding="async"
              src={extraction.image_url}
              style={{
                color: "transparent",
                filter: "drop-shadow(rgba(35, 31, 32, 0.22) 5px 14px 13px)",
                position: "absolute",
                left: `${iconLeft}px`,
                top: "50%",
                transform: "translateY(-50%)",
                objectFit: "contain",
                width: `${iconWidth}px`,
                height: `${iconHeight}px`,
                maxHeight: `${iconMaxHeight}px`,
                maxWidth: `${iconWidth}px`,
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                left: `${iconLeft}px`,
                top: "50%",
                transform: "translateY(-50%)",
                filter: "drop-shadow(rgba(35, 31, 32, 0.22) 5px 14px 13px)",
                width: `${iconWidth}px`,
                height: `${iconHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {getExtractionIcon(extraction.code, extraction.name, iconWidth, iconHeight)}
            </div>
          );

          const tooltipLabel =
            isInteractive && supportsHover ? `assign teeth to ${extraction.name}` : undefined;
          const hoverHandlers = tooltipLabel
            ? {
                onMouseMove: (e: React.MouseEvent) => setTooltipState({ label: tooltipLabel, x: e.clientX, y: e.clientY }),
                onMouseLeave: () => setTooltipState(null),
              }
            : {};

          // Active state: blue border to indicate selection mode
          if (isActive) {
            return (
              <button
                key={extraction.id}
                type="button"
                aria-label={extraction.name}
                onClick={toggleBox}
                {...hoverHandlers}
                style={{
                  flex: "0 0 auto",
                  border: "2px solid rgb(211, 211, 211)",
                  borderRadius: "14px",
                  background: "rgb(255, 255, 255)",
                  minHeight: `${boxMinHeight}px`,
                  minWidth: `${boxMinWidth}px`,
                  width: "fit-content",
                  padding: boxPadding,
                  cursor: isInteractive ? "pointer" : "default",
                  textAlign: "center",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  boxShadow: "rgb(219, 234, 254) 0px 0px 0px 2px",
                  outline: "none",
                }}
                className="transition-all duration-300 transform hover:scale-[1.03]"
              >
                {boxIcon}
                <div style={{ display: "grid", gap: "2px", placeItems: "center", whiteSpace: "nowrap", fontFamily: "Verdana, Arial, sans-serif" }}>
                  <div style={{ color: "rgb(102, 102, 102)", fontSize: "12px", lineHeight: 1.15, fontWeight: 400 }}>
                    {extraction.name}
                  </div>
                  {displayTeethForBox.length > 0 && (
                    <div style={{ color: "rgb(102, 102, 102)", fontSize: "12px", lineHeight: 1.1, fontWeight: 400 }}>
                      {formatBoxTeethLabel(displayTeethForBox)}
                    </div>
                  )}
                </div>
              </button>
            );
          }

          // Inactive with visible teeth: show expanded box without the active blue border.
          // Only expand when there are teeth to display — if all teeth are filtered (product teeth),
          // show the minimal icon so the box doesn't appear expanded with no content.
          if (displayTeethForBox.length > 0) {
            return (
              <button
                key={extraction.id}
                type="button"
                aria-label={extraction.name}
                onClick={toggleBox}
                {...hoverHandlers}
                style={{
                  flex: "0 0 auto",
                  border: "2px solid rgb(211, 211, 211)",
                  borderRadius: "14px",
                  background: "rgb(255, 255, 255)",
                  minHeight: `${boxMinHeight}px`,
                  minWidth: `${boxMinWidth}px`,
                  width: "fit-content",
                  padding: boxPadding,
                  cursor: isInteractive ? "pointer" : "default",
                  textAlign: "center",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  outline: "none",
                }}
                className="transition-all duration-300 transform hover:scale-[1.03]"
              >
                {boxIcon}
                <div style={{ display: "grid", gap: "2px", placeItems: "center", whiteSpace: "nowrap", fontFamily: "Verdana, Arial, sans-serif" }}>
                  <div style={{ color: "rgb(102, 102, 102)", fontSize: "12px", lineHeight: 1.15, fontWeight: 400 }}>
                    {extraction.name}
                  </div>
                  {displayTeethForBox.length > 0 && (
                    <div style={{ color: "rgb(102, 102, 102)", fontSize: "12px", lineHeight: 1.1, fontWeight: 400 }}>
                      {formatBoxTeethLabel(displayTeethForBox)}
                    </div>
                  )}
                </div>
              </button>
            );
          }

          // Inactive empty: minimal stand-alone icon
          return (
            <div
              key={extraction.id}
              aria-label={extraction.name}
              className={`flex items-center cursor-pointer transition-all duration-300 transform hover:scale-[1.05] relative select-none justify-center ${
                compact ? "w-[26px] h-[30px]" : "w-[40px] h-[50px]"
              }`}
              onClick={toggleBox}
              {...hoverHandlers}
            >
              {extraction.image_url ? (
                <img
                  src={extraction.image_url}
                  alt={extraction.name}
                  width={iconWidth}
                  height={iconHeight}
                  style={{
                    color: "transparent",
                    filter: "drop-shadow(rgba(35, 31, 32, 0.22) 5px 14px 13px)",
                    objectFit: "contain",
                    width: `${iconWidth}px`,
                    height: `${iconHeight}px`,
                  }}
                />
              ) : (
                <div style={{ filter: "drop-shadow(rgba(35, 31, 32, 0.22) 5px 14px 13px)" }}>
                  {getExtractionIcon(extraction.code, extraction.name, iconWidth, iconHeight)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Done — only when a non-overlay (non-clasp) status has teeth; clasps alone are not product selection */}
      {!acknowledged &&
        onAcknowledgedChange &&
        activeExtractions.some(
          (e) => !isClaspExtraction(e) && getTeethForBox(e).length > 0
        ) && (
        <div className="w-full flex justify-center py-1 overflow-visible">
          <DoneTransitionButton onComplete={() => onAcknowledgedChange(true)} />
        </div>
      )}
      {supportsHover && tooltipState && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          style={{ position: "fixed", left: tooltipState.x + 12, top: tooltipState.y - 36, zIndex: 9999, pointerEvents: "none" }}
          className="bg-white/90 backdrop-blur-sm text-gray-900 border border-gray-200 text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap"
        >
          {tooltipState.label}
        </div>,
        document.body
      )}
    </div>
  );
}
