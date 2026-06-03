"use client";

import { cn } from "@/lib/utils";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";

interface DoneTransitionButtonProps {
  onComplete: () => void;
  className?: string;
}

const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const T_GRAD = 380;
const T_SPARK_START = 295;
const T_SPARK_IN = 110;
const T_SWEEP_START = 365;
const T_SWEEP = 700;
const T_ARC_FADE_AT = T_SWEEP_START + T_SWEEP;
const T_ARC_FADE = 280;
const T_WHITE_START = T_ARC_FADE_AT;
const T_WHITE = 220;
const T_WRITE_START = T_WHITE_START + T_WHITE;
const T_WRITE = 520;
const ANIM_DONE = T_WRITE_START + T_WRITE;

const REF_W = 170;
const REF_PERIMETER = 428;

function pillPath(w: number, h: number, r: number): string {
  const midY = h / 2;
  return `M ${w} ${midY} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${midY}`;
}

/**
 * Arc-sweep Done button (Concept D). Sized to match the legacy px-6 py-1.5 Done control.
 * Plays the full transition on click, then calls onComplete.
 */
export function DoneTransitionButton({ onComplete, className = "" }: DoneTransitionButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const bgPremiumRef = useRef<HTMLDivElement>(null);
  const arcSvgRef = useRef<SVGSVGElement>(null);
  const arcMainRef = useRef<SVGPathElement>(null);
  const arcMidRef = useRef<SVGPathElement>(null);
  const arcOuterRef = useRef<SVGPathElement>(null);
  const whiteRevealRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const checkOuterRef = useRef<HTMLDivElement>(null);

  const arcGlowId = useId();
  const rxnGradId = useId();
  const checkGlowId = useId();

  const [dims, setDims] = useState({ w: 90, h: 30, r: 6 });
  const [busy, setBusy] = useState(false);

  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setDims({ w: width, h: height, r: 6 });
    }
  }, []);

  const hardReset = useCallback(() => {
    if (bgPremiumRef.current) bgPremiumRef.current.style.opacity = "0";
    if (arcSvgRef.current) arcSvgRef.current.style.opacity = "0";
    if (arcMainRef.current) arcMainRef.current.style.strokeDashoffset = "0";
    if (arcMidRef.current) arcMidRef.current.style.strokeDashoffset = "30";
    if (arcOuterRef.current) arcOuterRef.current.style.strokeDashoffset = "70";
    if (labelRef.current) labelRef.current.style.opacity = "1";
    if (whiteRevealRef.current) whiteRevealRef.current.style.opacity = "0";
    if (checkOuterRef.current) {
      checkOuterRef.current.style.opacity = "0";
      checkOuterRef.current.style.clipPath = "polygon(-5% 96%, 105% 118%, 105% 205%, -5% 205%)";
    }
  }, []);

  const play = useCallback(() => {
    if (busy) return;
    setBusy(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    hardReset();

    const perimeter = REF_PERIMETER * (dims.w / REF_W);
    const dashHead = 32 * (dims.w / REF_W);
    const dashTail = perimeter - dashHead;

    [arcMainRef, arcMidRef, arcOuterRef].forEach((ref) => {
      if (ref.current) {
        ref.current.style.strokeDasharray = `${dashHead} ${dashTail}`;
      }
    });

    const t0 = performance.now();

    const frame = (now: number) => {
      const e = now - t0;

      if (bgPremiumRef.current) {
        bgPremiumRef.current.style.opacity =
          e < T_GRAD ? String(easeOut(e / T_GRAD)) : "1";
      }

      if (e >= T_SPARK_START && arcSvgRef.current) {
        const sp = Math.min(1, (e - T_SPARK_START) / T_SPARK_IN);
        arcSvgRef.current.style.opacity =
          e < T_ARC_FADE_AT
            ? String(easeOut(sp))
            : String(Math.max(0, 1 - easeIn(Math.min(1, (e - T_ARC_FADE_AT) / T_ARC_FADE))));
      }

      if (e >= T_SWEEP_START) {
        const sp = Math.min(1, (e - T_SWEEP_START) / T_SWEEP);
        const d = -easeInOut(sp) * perimeter;
        if (arcMainRef.current) arcMainRef.current.style.strokeDashoffset = String(d);
        if (arcMidRef.current) arcMidRef.current.style.strokeDashoffset = String(d + 30 * (dims.w / REF_W));
        if (arcOuterRef.current) arcOuterRef.current.style.strokeDashoffset = String(d + 70 * (dims.w / REF_W));
      }

      if (e >= T_WHITE_START) {
        const p = Math.min(1, (e - T_WHITE_START) / T_WHITE);
        if (whiteRevealRef.current) whiteRevealRef.current.style.opacity = String(easeOut(p));
        if (labelRef.current) {
          labelRef.current.style.opacity = String(Math.max(0, 1 - easeIn(Math.min(1, p * 1.8))));
        }
      }

      if (e >= T_WRITE_START && checkOuterRef.current) {
        const p = Math.min(1, (e - T_WRITE_START) / T_WRITE);
        const ee = easeInOut(p);
        const topLeft = (1 - ee) * 115 - 20;
        const topRight = (1 - ee) * 115;
        checkOuterRef.current.style.opacity = "1";
        checkOuterRef.current.style.clipPath =
          `polygon(-5% ${topLeft.toFixed(1)}%, 105% ${topRight.toFixed(1)}%, 105% 205%, -5% 205%)`;
      }

      if (e >= ANIM_DONE) {
        if (bgPremiumRef.current) bgPremiumRef.current.style.opacity = "1";
        if (arcSvgRef.current) arcSvgRef.current.style.opacity = "0";
        if (labelRef.current) labelRef.current.style.opacity = "0";
        if (whiteRevealRef.current) whiteRevealRef.current.style.opacity = "1";
        if (checkOuterRef.current) {
          checkOuterRef.current.style.opacity = "1";
          checkOuterRef.current.style.clipPath = "polygon(-5% -20%, 105% 0%, 105% 205%, -5% 205%)";
        }
        onComplete();
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
  }, [busy, dims.w, hardReset, onComplete]);

  const pathD = pillPath(dims.w, dims.h, dims.r);
  const checkW = dims.w * (112 / REF_W);
  const checkH = dims.h * (100 / 56);
  const checkLeft = (dims.w - checkW) / 2;
  const checkTop = (dims.h - checkH) / 2;

  return (
    <button
      ref={btnRef}
      type="button"
      disabled={busy}
      onClick={play}
      aria-label="Done"
      className={cn(
        "relative inline-flex items-center justify-center px-6 py-1.5 rounded-[6px] overflow-visible cursor-pointer select-none shadow-md animate-fade-in disabled:pointer-events-none",
        className
      )}
      style={{ fontFamily: "Verdana, Arial, sans-serif" }}
    >
      <div
        className="absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#1e81cb] to-[#08366b]"
        aria-hidden
      />
      <div
        ref={bgPremiumRef}
        className="absolute inset-0 rounded-[6px] opacity-0"
        style={{ background: "linear-gradient(to right, #1a60b0 0%, #4e2ab5 52%, #8425b2 100%)" }}
        aria-hidden
      />

      <svg
        ref={arcSvgRef}
        className="absolute inset-0 opacity-0 pointer-events-none overflow-visible"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        width={dims.w}
        height={dims.h}
        aria-hidden
      >
        <defs>
          <filter id={arcGlowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b2" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="b2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
        <path
          ref={arcOuterRef}
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={8 * (dims.w / REF_W)}
          strokeLinecap="round"
          strokeDashoffset="70"
        />
        <path
          ref={arcMidRef}
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth={3.5 * (dims.w / REF_W)}
          strokeLinecap="round"
          strokeDashoffset="30"
        />
        <path
          ref={arcMainRef}
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2 * (dims.w / REF_W)}
          strokeLinecap="round"
          filter={`url(#${arcGlowId})`}
        />
      </svg>

      <div className="absolute inset-0 rounded-[6px] overflow-hidden pointer-events-none" aria-hidden>
        <div ref={whiteRevealRef} className="absolute inset-0 bg-white opacity-0" />
      </div>

      <span
        ref={labelRef}
        className="relative z-[1] font-bold text-[14px] text-white pointer-events-none"
      >
        Done
      </span>

      <div
        ref={checkOuterRef}
        className="absolute opacity-0 pointer-events-none z-[2]"
        style={{ left: checkLeft, top: checkTop, width: checkW, height: checkH }}
        aria-hidden
      >
        <svg viewBox="0 0 181.91 162.9" className="w-full h-full block" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient
              id={rxnGradId}
              cx="96.59"
              cy="76.54"
              fx="96.59"
              fy="76.54"
              r="126.3"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#19a747" />
              <stop offset="0.15" stopColor="#1fa846" />
              <stop offset="0.36" stopColor="#30ad45" />
              <stop offset="0.6" stopColor="#4cb543" />
              <stop offset="0.85" stopColor="#73bf40" />
              <stop offset="1" stopColor="#8dc73f" />
            </radialGradient>
            <filter id={checkGlowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b2" />
              <feMerge>
                <feMergeNode in="b1" />
                <feMergeNode in="b2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            fill={`url(#${rxnGradId})`}
            filter={`url(#${checkGlowId})`}
            d="M181.91,0c-3.22,2.02-6.11,5.56-8.82,8.21-27.95,27.33-49.2,60.54-68.07,94.58-5.88,10.61-11.46,21.39-16.73,32.31-3.95,8.19-7.23,19.27-14.69,25.01-3.98,3.12-10.26,4.11-14.19.37-15.69-14.95-36.04-35.48-59.42-23.83,20.44-22.29,43.79-7.47,63.56,6.96C90.34,87.19,128.37,33.67,181.91,0Z"
          />
        </svg>
      </div>

      <div
        className="absolute inset-0 rounded-[6px] pointer-events-none"
        style={{ boxShadow: "0 9px 18px -7px rgba(11,53,94,0.35)" }}
        aria-hidden
      />
    </button>
  );
}
