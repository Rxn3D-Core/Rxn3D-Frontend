"use client";

import { cn } from "@/lib/utils";
import type { SlipPickupDropoffAction } from "@/lib/slip-location";
import { SLIP_LISTING_READY_TO_SEND_ICON_SRC } from "@/components/slip-listing/SlipListingReadyToSendIcon";

export interface VirtualSlipLocationActionProps {
  pickupDropoffAction?: SlipPickupDropoffAction | null;
  pickupDropoffLabel?: string;
  onPickupDropoff?: () => void;
  showReadyToSend?: boolean;
  onReadyToSend?: () => void;
  showAddStage?: boolean;
  onAddStage?: () => void;
  disabled?: boolean;
}

const ACTION_ICON_CLASS = "h-[72px] w-[72px] max-w-none object-contain";

function LocationActionButton({
  src,
  label,
  onClick,
  disabled = false,
}: {
  src: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabled ? undefined : label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        "shrink-0 transition-transform duration-200 ease-out",
        disabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:scale-110 active:scale-95"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyph */}
      <img
        src={src}
        alt=""
        width={72}
        height={72}
        className={cn(ACTION_ICON_CLASS, disabled && "opacity-50 grayscale")}
        aria-hidden
      />
    </button>
  );
}

/** Pick up, drop off, ready to send, or add stage — same priority as the former sticky footer FAB. */
export function VirtualSlipLocationAction({
  pickupDropoffAction = null,
  pickupDropoffLabel = "Pick up",
  onPickupDropoff,
  showReadyToSend = false,
  onReadyToSend,
  showAddStage = false,
  onAddStage,
  disabled = false,
}: VirtualSlipLocationActionProps) {
  const showAddStageAction = showAddStage && Boolean(onAddStage);
  const showReadyToSendAction =
    !showAddStageAction && showReadyToSend && Boolean(onReadyToSend);
  const showDriverAction =
    !showAddStageAction &&
    !showReadyToSendAction &&
    (pickupDropoffAction === "pickup" || pickupDropoffAction === "dropoff") &&
    Boolean(onPickupDropoff);

  const driverIconSrc =
    pickupDropoffAction === "dropoff"
      ? "/icons/virtual-slip-center/drop-off.svg"
      : "/icons/virtual-slip-center/pick-up.svg";

  const action =
    showAddStageAction && onAddStage
      ? {
          src: "/icons/virtual-slip-center/add-stage.svg",
          label: "Add stage",
          onClick: onAddStage,
        }
      : showReadyToSendAction && onReadyToSend
        ? {
            src: SLIP_LISTING_READY_TO_SEND_ICON_SRC,
            label: "Ready to send",
            onClick: onReadyToSend,
          }
        : showDriverAction && onPickupDropoff
          ? {
              src: driverIconSrc,
              label: pickupDropoffLabel,
              onClick: onPickupDropoff,
            }
          : null;

  if (!action) return null;

  return (
    <LocationActionButton
      src={action.src}
      label={action.label}
      onClick={action.onClick}
      disabled={disabled}
    />
  );
}
