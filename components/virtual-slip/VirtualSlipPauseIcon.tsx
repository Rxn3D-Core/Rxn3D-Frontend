export const VIRTUAL_SLIP_ON_HOLD_ICON_SRC = "/icons/virtual-slip-actions/on-hold.png";

type VirtualSlipPauseIconProps = {
  className?: string;
};

/** Colorful pause bars used for on-hold actions across virtual slip UI. */
export function VirtualSlipPauseIcon({ className = "h-7 w-7" }: VirtualSlipPauseIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled PNG asset
    <img
      src={VIRTUAL_SLIP_ON_HOLD_ICON_SRC}
      alt=""
      aria-hidden
      className={`object-contain ${className}`}
    />
  );
}
