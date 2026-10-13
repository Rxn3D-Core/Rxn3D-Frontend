"use client"

import { useEffect } from "react"
import { setupGlobalFetchInterceptor } from "@/lib/fetch-interceptor"

// Install as soon as this client module loads.
if (typeof window !== "undefined") {
  setupGlobalFetchInterceptor()
}

/**
 * Client-only bootstrap. A side-effect import from the server `layout.tsx`
 * never runs in the browser, so the interceptor must be mounted here.
 */
export function FetchInterceptorBootstrap() {
  useEffect(() => {
    setupGlobalFetchInterceptor()
  }, [])

  return null
}
