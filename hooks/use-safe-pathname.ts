"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * A safe wrapper around usePathname that handles cases where the router context
 * might not be available or initialized yet.
 */
export function useSafePathname(): string {
  const [pathname, setPathname] = useState<string>("")
  
  try {
    const routerPathname = usePathname()
    useEffect(() => {
      setPathname(routerPathname || "")
    }, [routerPathname])
  } catch (error) {
    // If usePathname fails, we'll use an empty string as fallback
    console.warn("usePathname failed, using fallback:", error)
    useEffect(() => {
      setPathname("")
    }, [])
  }
  
  return pathname
}
