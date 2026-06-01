"use client";

import type { Arch } from "../types";

const OVERLAY_CLASS =
  "absolute inset-0 z-[25] rounded-lg flex items-start justify-center pt-12 cursor-not-allowed";

const BADGE_CLASS =
  "text-xs text-[#7f7f7f] bg-white border border-[#d9d9d9] rounded px-3 py-1.5 shadow-sm select-none pointer-events-none text-center max-w-[min(100%,280px)]";

/** Full-arch panel shield when the user is adding a product on the opposite arch. */
export function OppositeArchAddProductShield({
  active,
  activeArch,
}: {
  active: boolean;
  activeArch: Arch;
}) {
  if (!active) return null;

  const label = activeArch === "maxillary" ? "Maxillary" : "Mandibular";
  const message = `Adding ${label} product — finish or cancel to continue`;

  return (
    <div
      className={OVERLAY_CLASS}
      style={{ backgroundColor: "rgba(245, 245, 245, 0.75)" }}
      title={message}
    >
      <span className={BADGE_CLASS}>{message}</span>
    </div>
  );
}
