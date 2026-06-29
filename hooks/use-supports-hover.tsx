"use client"

import * as React from "react"

/** True when the primary input supports hover (desktop mouse/trackpad). */
export function useSupportsHover() {
  const [supportsHover, setSupportsHover] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    const onChange = () => setSupportsHover(mql.matches)
    mql.addEventListener("change", onChange)
    setSupportsHover(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!supportsHover
}
