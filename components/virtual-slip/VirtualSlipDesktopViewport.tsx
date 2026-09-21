"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { VIRTUAL_SLIP_DESKTOP_WIDTH } from "@/lib/virtual-slip-desktop-width";

/**
 * Keeps the virtual slip **page canvas** at the desktop layout on phones.
 *
 * Does **not** change the viewport meta — that stays `device-width` so portaled
 * modals/dialogs keep normal mobile responsive breakpoints.
 *
 * On narrow screens the 1280px canvas is scaled to fit the available width
 * (transform-origin top-left) so the design matches web without breaking modals.
 */
export function VirtualSlipDesktopViewport({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const available = outer.clientWidth;
      const nextScale = Math.min(1, available / VIRTUAL_SLIP_DESKTOP_WIDTH);
      setScale(nextScale);
      setScaledHeight(inner.scrollHeight * nextScale);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={outerRef} className="w-full" style={{ height: scaledHeight }}>
      <div
        ref={innerRef}
        style={{
          width: VIRTUAL_SLIP_DESKTOP_WIDTH,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
