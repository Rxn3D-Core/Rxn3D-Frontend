"use client"

import { useRef, useCallback, useState, useId, type CSSProperties } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Figma idle — matches submit_button smooth (1).html */
const HOME = { left: 8, top: 4, rot: 15 }

const PLANE_KEYFRAMES: Keyframe[] = [
  {
    offset: 0,
    left: "8px",
    top: "4px",
    transform: "rotate(15deg)",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  {
    offset: 0.38,
    left: "162px",
    top: "2px",
    transform: "rotate(45deg)",
    easing: "step-start",
  },
  {
    offset: 0.381,
    left: "-8px",
    top: "80px",
    transform: "rotate(145.76deg)",
  },
  {
    offset: 0.46,
    left: "-8px",
    top: "80px",
    transform: "rotate(145.76deg)",
    easing: "cubic-bezier(0.2, 0, 0.1, 1)",
  },
  {
    offset: 0.82,
    left: "8px",
    top: "4px",
    transform: "rotate(15deg)",
  },
  {
    offset: 1,
    left: "8px",
    top: "4px",
    transform: "rotate(15deg)",
  },
]

const IDLE_BACKGROUND = "linear-gradient(256.66deg, #2AA6DE 0%, #82298D 50%, #C9539F 100%)"
const HOVER_BACKGROUND =
  "linear-gradient(202.47deg, #2aa6de 14.497%, #82298d 51.108%, #c9539f 116.71%)"
const DISABLED_BACKGROUND = "linear-gradient(180deg, #9BA5B7 0%, #7E8B9E 100%)"

export interface SubmitSlipButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  isSubmitting?: boolean
  className?: string
  type?: "button" | "submit"
}

function PaperPlaneIcon({ clipId }: { clipId: string }) {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 226 226"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block"
      aria-hidden
    >
      <g opacity="0.82" clipPath={`url(#${clipId})`}>
        <path
          d="M98.5574 193.661L162.758 72.6946L30.4229 107.939L68.6186 131.313L127.737 100.53L84.4059 151.176L98.5574 193.661Z"
          fill="white"
        />
        <path
          d="M84.4063 151.176L113.918 150.748L110.153 121.33L127.737 100.53L84.4063 151.176Z"
          fill="#D9ECFF"
        />
        <path
          d="M68.6182 131.314L127.736 100.53L84.4054 151.176"
          stroke="#EEF8FF"
          strokeWidth="8.01234"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect
            width="160.247"
            height="160.247"
            fill="white"
            transform="translate(0 99.7091) rotate(-38.4786)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}

export function SubmitSlipButton({
  onClick,
  disabled = false,
  isSubmitting = false,
  className,
  type = "button",
}: SubmitSlipButtonProps) {
  const clipId = useId().replace(/:/g, "")
  const planeRef = useRef<HTMLDivElement>(null)
  const loopAnimRef = useRef<Animation | null>(null)
  const returnAnimRef = useRef<Animation | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const isInteractive = !disabled && !isSubmitting

  const cancelAnimations = useCallback(() => {
    if (returnAnimRef.current) {
      returnAnimRef.current.cancel()
      returnAnimRef.current = null
    }
    if (loopAnimRef.current) {
      loopAnimRef.current.cancel()
      loopAnimRef.current = null
    }
  }, [])

  const resetPlaneToHome = useCallback(() => {
    const plane = planeRef.current
    if (!plane) return
    plane.style.left = `${HOME.left}px`
    plane.style.top = `${HOME.top}px`
    plane.style.transform = `rotate(${HOME.rot}deg)`
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (!isInteractive) return
    setIsHovered(true)

    const plane = planeRef.current
    if (!plane) return

    cancelAnimations()
    plane.style.cssText = ""

    loopAnimRef.current = plane.animate(PLANE_KEYFRAMES, {
      duration: 1600,
      iterations: Infinity,
    })
  }, [isInteractive, cancelAnimations])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)

    if (!loopAnimRef.current) {
      resetPlaneToHome()
      return
    }

    const plane = planeRef.current
    if (!plane) return

    loopAnimRef.current.pause()
    const cs = window.getComputedStyle(plane)
    const frozenLeft = cs.left
    const frozenTop = cs.top
    const frozenTransform = cs.transform
    loopAnimRef.current.cancel()
    loopAnimRef.current = null

    plane.style.left = frozenLeft
    plane.style.top = frozenTop
    plane.style.transform = frozenTransform

    requestAnimationFrame(() => {
      returnAnimRef.current = plane.animate(
        [
          { left: frozenLeft, top: frozenTop, transform: frozenTransform },
          {
            left: `${HOME.left}px`,
            top: `${HOME.top}px`,
            transform: `rotate(${HOME.rot}deg)`,
          },
        ],
        { duration: 380, easing: "ease-out", fill: "forwards" },
      )

      returnAnimRef.current.onfinish = () => {
        plane.style.left = `${HOME.left}px`
        plane.style.top = `${HOME.top}px`
        plane.style.transform = `rotate(${HOME.rot}deg)`
        returnAnimRef.current = null
      }
    })
  }, [resetPlaneToHome])

  const buttonStyle: CSSProperties = {
    position: "relative",
    width: isSubmitting ? "auto" : "170px",
    minWidth: isSubmitting ? "170px" : undefined,
    height: "56px",
    border: "none",
    borderRadius: "14px",
    cursor: isInteractive ? "pointer" : "not-allowed",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: isSubmitting ? "0 22px" : "0 22px 0 20px",
    boxShadow: isInteractive
      ? "0px 9px 18px -7px rgba(11, 53, 94, 0.38)"
      : "none",
    outline: "none",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    background:
      isInteractive && isHovered
        ? HOVER_BACKGROUND
        : isInteractive
          ? IDLE_BACKGROUND
          : DISABLED_BACKGROUND,
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isSubmitting}
      className={cn("w-full sm:w-auto", className)}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isSubmitting ? (
        <>
          <Loader2
            className="h-5 w-5 animate-spin text-white flex-shrink-0"
            aria-hidden
          />
          <span
            className="text-white whitespace-nowrap select-none pointer-events-none"
            style={{ fontSize: "18px", fontWeight: 600, lineHeight: "21px" }}
          >
            Submitting...
          </span>
        </>
      ) : (
        <>
          <div
            className="w-6 h-6 flex-shrink-0 opacity-0 pointer-events-none"
            aria-hidden
          />
          <span
            className="text-white whitespace-nowrap select-none pointer-events-none"
            style={{ fontSize: "18px", fontWeight: 600, lineHeight: "21px" }}
          >
            Submit Slip
          </span>
          <div
            ref={planeRef}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              left: `${HOME.left}px`,
              top: `${HOME.top}px`,
              width: "44px",
              height: "44px",
              transform: `rotate(${HOME.rot}deg)`,
              transformOrigin: "center center",
              willChange: "left, top, transform",
            }}
            aria-hidden
          >
            <PaperPlaneIcon clipId={clipId} />
          </div>
        </>
      )}
    </button>
  )
}
