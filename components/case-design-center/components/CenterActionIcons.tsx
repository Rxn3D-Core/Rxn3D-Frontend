"use client";

import { useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE } from "@/lib/slip-location";

const CENTER_ICON_BASE = "/icons/virtual-slip-center";

const LEGACY_ICON_CLASS = "h-[52px] w-[52px]";
const VIRTUAL_SLIP_ICON_CLASS =
  "h-10 w-10 transition-[width,height] duration-200 ease-out group-hover:h-12 group-hover:w-12";

function CenterIcon({
  src,
  alt,
  className,
  virtualSlipSizing = false,
}: {
  src: string;
  alt: string;
  className?: string;
  virtualSlipSizing?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyphs
    <img
      src={src}
      alt={alt}
      width={virtualSlipSizing ? 40 : 52}
      height={virtualSlipSizing ? 40 : 52}
      className={cn(
        "object-contain",
        virtualSlipSizing ? VIRTUAL_SLIP_ICON_CLASS : LEGACY_ICON_CLASS,
        className
      )}
    />
  );
}

export function RushIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyph
    <img
      src={`${CENTER_ICON_BASE}/rush.svg`}
      alt=""
      width={53}
      height={53}
      className={cn("object-contain", className ?? "h-[52px] w-[52px]")}
      aria-hidden
    />
  );
}

/** @deprecated Use CenterActionIcons row props directly. */
export interface CenterExtraAction {
  key: string;
  label: string;
  onClick: () => void;
  icon: string;
  iconClassName?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

interface CenterRowIconDef {
  key: string;
  label: string;
  node: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

interface CenterActionIconsProps {
  visible: boolean;
  /** When true, render the full virtual-slip icon row (disabled if handler missing). */
  showFullIconRow?: boolean;
  /** 40×40 default, 48×48 on hover — used on virtual slip. */
  virtualSlipIconSizing?: boolean;
  /** Pencil — edit slip */
  onEditGeneral?: () => void;
  /** Stage / slip notes */
  onStickyNote?: () => void;
  /** @deprecated Use onStickyNote */
  onEdit?: () => void;
  onAddProduct?: () => void;
  onRush?: () => void;
  rushLabel?: string;
  onAttach?: () => void;
  onDriverHistory?: () => void;
  onCallLog?: () => void;
  onChangeDate?: () => void;
  onSendBackToOffice?: () => void;
  onHold?: () => void;
  onCancel?: () => void;
  canPutOnHold?: boolean;
  /** @deprecated Collapsible extras removed — use row props above. */
  extraActions?: CenterExtraAction[];
}

export function CenterActionIcons({
  visible,
  showFullIconRow = false,
  virtualSlipIconSizing = false,
  onEditGeneral,
  onStickyNote,
  onEdit,
  onAddProduct,
  onRush,
  rushLabel = "Request Rush",
  onAttach,
  onDriverHistory,
  onCallLog,
  onChangeDate,
  onSendBackToOffice,
  onHold,
  onCancel,
  canPutOnHold = true,
}: CenterActionIconsProps) {
  const [moreExpanded, setMoreExpanded] = useState(false);

  if (!visible) return null;

  const stickyNoteHandler = onStickyNote ?? onEdit;
  const iconButtonClass = cn(
    "shrink-0 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
    virtualSlipIconSizing
      ? "group h-10 w-10 overflow-visible transition-transform duration-200 ease-out hover:scale-[1.15] active:scale-95"
      : "h-14 w-14 transition-transform duration-200 ease-out hover:scale-[1.15]"
  );
  const rushIconClass = virtualSlipIconSizing
    ? VIRTUAL_SLIP_ICON_CLASS
    : LEGACY_ICON_CLASS;
  const calendarIconClass = virtualSlipIconSizing
    ? VIRTUAL_SLIP_ICON_CLASS
    : LEGACY_ICON_CLASS;
  const driverHistoryIconClass = virtualSlipIconSizing
    ? "h-10 w-[58px] transition-[width,height] duration-200 ease-out group-hover:h-12 group-hover:w-[70px]"
    : "h-[52px] w-[76px]";

  const rowIcon = (
    key: string,
    label: string,
    src: string,
    onClick?: () => void,
    options?: { disabled?: boolean; disabledMessage?: string; className?: string }
  ): CenterRowIconDef => ({
    key,
    label,
    onClick,
    disabled: options?.disabled,
    disabledMessage: options?.disabledMessage,
    node: (
      <CenterIcon
        src={`${CENTER_ICON_BASE}/${src}`}
        alt={label}
        virtualSlipSizing={virtualSlipIconSizing}
        className={options?.className}
      />
    ),
  });

  const primaryRowDefs: CenterRowIconDef[] = [
    rowIcon("edit-stage", "Edit slip", "edit-stage.svg", onEditGeneral),
    rowIcon("stage-notes", "Stage notes", "slip-note.png", stickyNoteHandler),
    rowIcon("add-product", "Add add-ons", "add-general.svg", onAddProduct),
    {
      key: "rush",
      label: rushLabel,
      onClick: onRush,
      node: <RushIcon className={rushIconClass} />,
    },
    rowIcon("attach", "Attach files", "attachments.svg", onAttach),
  ];

  const moreRowDefs: CenterRowIconDef[] = [
    rowIcon("driver-history", "Driver history", "driver-history.svg", onDriverHistory, {
      // Truck artwork is wide — scale width so visual height matches other row icons.
      className: driverHistoryIconClass,
    }),
    rowIcon("call-log", "Call log", "call-log.svg", onCallLog),
    {
      key: "change-date",
      label: "Change date",
      onClick: onChangeDate,
      node: (
        // eslint-disable-next-line @next/next/no-img-element -- bundled PNG glyph
        <img
          src="/icons/slip-listing/calendar.png"
          alt="Change date"
          width={virtualSlipIconSizing ? 40 : 52}
          height={virtualSlipIconSizing ? 40 : 52}
          className={cn("object-contain", calendarIconClass)}
        />
      ),
    },
    rowIcon("send-back-to-office", "Send back to office", "send-back-to-office.svg", onSendBackToOffice),
    rowIcon("on-hold", "On hold", "on-hold.png", onHold, {
      disabled: onHold ? !canPutOnHold : true,
      disabledMessage: canPutOnHold ? undefined : SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
    }),
    rowIcon("cancel", "Cancel case", "cancel.svg", onCancel),
  ];

  const fullRowDefs: CenterRowIconDef[] = [...primaryRowDefs, ...moreRowDefs];

  const compactRowDefs: CenterRowIconDef[] = [
    onEditGeneral
      ? rowIcon("edit-stage", "Edit slip", "edit-stage.svg", onEditGeneral)
      : null,
    stickyNoteHandler
      ? rowIcon("stage-notes", "Stage notes", "slip-note.png", stickyNoteHandler)
      : null,
    onAddProduct
      ? rowIcon("add-product", "Add add-ons", "add-general.svg", onAddProduct)
      : null,
    onRush
      ? {
          key: "rush",
          label: rushLabel,
          onClick: onRush,
          node: <RushIcon className={rushIconClass} />,
        }
      : null,
    onAttach ? rowIcon("attach", "Attach files", "attachments.svg", onAttach) : null,
  ].filter(Boolean) as CenterRowIconDef[];

  const isIconDisabled = (icon: CenterRowIconDef) =>
    icon.disabled ?? !icon.onClick;

  const icons = (
    showFullIconRow
      ? moreExpanded
        ? fullRowDefs
        : primaryRowDefs
      : compactRowDefs
  )
    // Hide disabled icons entirely — only render active actions.
    .filter((icon) => !isIconDisabled(icon));

  const renderIconButton = (icon: CenterRowIconDef) => {
    const disabled = icon.disabled ?? !icon.onClick;
    return (
      <Tooltip key={icon.key}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={disabled ? undefined : icon.onClick}
            disabled={disabled}
            className={iconButtonClass}
          >
            {icon.node}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{disabled && icon.disabledMessage ? icon.disabledMessage : icon.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="inline-flex flex-wrap items-center justify-center gap-[6px] py-0">
        {icons.map(renderIconButton)}

        {showFullIconRow && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setMoreExpanded((open) => !open)}
                className={iconButtonClass}
                aria-label={moreExpanded ? "Hide more actions" : "Show more actions"}
                aria-expanded={moreExpanded}
              >
                <CenterIcon
                  src={`${CENTER_ICON_BASE}/ellipsis.svg`}
                  alt=""
                  virtualSlipSizing={virtualSlipIconSizing}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{moreExpanded ? "Hide more actions" : "More actions"}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
