"use client";

import { useEffect, type ReactNode } from "react";
import { VIRTUAL_SLIP_DESKTOP_WIDTH } from "@/lib/virtual-slip-desktop-width";

const DESKTOP_VIEWPORT = `width=${VIRTUAL_SLIP_DESKTOP_WIDTH}`;
/** Matches root `app/layout.tsx` viewport export. */
const ROOT_VIEWPORT = "width=device-width, initial-scale=1, maximum-scale=1";

/**
 * Keeps the virtual slip at the desktop layout on phones.
 *
 * 1. Swaps the viewport meta to a fixed desktop width so mobile browsers
 *    lay out (and usually scale-to-fit) like the web view.
 * 2. Wraps content in `min-width: 1280px` so flex/grid cannot collapse if
 *    the meta tag is slow to update on client navigations.
 *
 * Restores the root viewport when leaving the route.
 */
export function VirtualSlipDesktopViewport({ children }: { children: ReactNode }) {
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    const previous = meta?.getAttribute("content") ?? ROOT_VIEWPORT;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", DESKTOP_VIEWPORT);

    return () => {
      meta?.setAttribute("content", previous);
    };
  }, []);

  return (
    <div
      className="min-h-full"
      style={{ minWidth: VIRTUAL_SLIP_DESKTOP_WIDTH }}
    >
      {children}
    </div>
  );
}
