"use client"

import React, { RefObject } from "react"

export interface MaxillarySectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  children: React.ReactNode
}

/**
 * Maxillary (upper arch) section of the tooth selection interface.
 * Renders the section container; content is passed as children from the page.
 */
export function MaxillarySection({ sectionRef, children }: MaxillarySectionProps) {
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
