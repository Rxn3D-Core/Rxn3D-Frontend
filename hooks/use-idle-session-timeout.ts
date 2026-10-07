"use client"

import { useEffect, useRef } from "react"
import { clearSessionStorage } from "@/lib/clear-session-storage"

const DEFAULT_TIMEOUT_MS = 2 * 60 * 60 * 1000
const ACTIVITY_THROTTLE_MS = 1000
const CHECK_INTERVAL_MS = 30_000

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
]

function resolveTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES
  const minutes = raw ? Number(raw) : 120
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_TIMEOUT_MS
  }
  return minutes * 60 * 1000
}

async function forceIdleSignOut(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  try {
    if (token && apiBase) {
      await fetch(`${apiBase}/auth/logout`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    }
  } catch {
    // Ignore logout API failures; local session still clears.
  }

  clearSessionStorage()
  window.location.replace("/login?idle=1")
}

/**
 * Signs the user out after a period of browser inactivity.
 * Only run on authenticated layouts (ClientLayout).
 */
export function useIdleSessionTimeout(enabled = true): void {
  const lastActivityRef = useRef<number>(Date.now())
  const signingOutRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return
    }

    const timeoutMs = resolveTimeoutMs()
    let lastThrottle = 0

    const markActivity = () => {
      const now = Date.now()
      if (now - lastThrottle < ACTIVITY_THROTTLE_MS) {
        return
      }
      lastThrottle = now
      lastActivityRef.current = now
    }

    const checkIdle = () => {
      if (signingOutRef.current) {
        return
      }
      if (Date.now() - lastActivityRef.current < timeoutMs) {
        return
      }
      signingOutRef.current = true
      void forceIdleSignOut()
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true })
    })
    document.addEventListener("visibilitychange", markActivity)

    const intervalId = window.setInterval(checkIdle, CHECK_INTERVAL_MS)
    markActivity()

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity)
      })
      document.removeEventListener("visibilitychange", markActivity)
      window.clearInterval(intervalId)
    }
  }, [enabled])
}
