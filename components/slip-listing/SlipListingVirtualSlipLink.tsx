import Link from "next/link";
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes";
import { cn } from "@/lib/utils";

type SlipListingVirtualSlipLinkProps = {
  slipId: number;
  children: React.ReactNode;
  className?: string;
  /** Expands the link to fill the table cell padding for easier click / open in new tab. */
  variant?: "inline" | "cell";
  /** Matches listing table cell padding (`compact` = lab, `comfortable` = office). */
  cellPadding?: "compact" | "comfortable";
};

export function SlipListingVirtualSlipLink({
  slipId,
  children,
  className,
  variant = "inline",
  cellPadding = "compact",
}: SlipListingVirtualSlipLinkProps) {
  return (
    <Link
      href={buildVirtualSlipV2Path(slipId)}
      className={cn(
        variant === "cell" &&
          "relative z-[1] block text-gray-900 hover:text-[#1162A8] hover:underline",
        variant === "cell" &&
          cellPadding === "comfortable" &&
          "-mx-4 -my-3 px-4 py-3",
        variant === "cell" &&
          cellPadding === "compact" &&
          "-mx-3 -my-2 px-3 py-2",
        variant === "inline" && "text-inherit hover:text-[#1162A8] hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}
