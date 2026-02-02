"use client"

import React, { RefObject } from "react"

export interface MandibularSectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  children: React.ReactNode
}

/**
 * Mandibular (lower arch) section of the tooth selection interface.
 * Renders the section container; content is passed as children from the page.
 */
export function MandibularSection({ sectionRef, children }: MandibularSectionProps) {
  return (
    <div
      ref={sectionRef}
      className="flex flex-col"
      style={{
        flex: "1 1 49%",
        background: "#FDFDFD",
      }}
    >
      {children}
    </div>
  )
}
