"use client"

import React from "react"

export interface SectionNavigationArrowsProps {
  show: boolean
}

export function SectionNavigationArrows({ show }: SectionNavigationArrowsProps) {
  if (!show) return null

  return (
    <div
      className="flex flex-row items-center justify-center gap-2 self-center"
      style={{
        minWidth: "60px",
        padding: "0px 10px",
      }}
    >
      <button
        type="button"
        className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        onClick={() => {}}
        aria-label="Previous"
        style={{ fontSize: "24px", fontWeight: "bold" }}
      >
        &#171;
      </button>
      <button
        type="button"
        className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        onClick={() => {}}
        aria-label="Next"
        style={{ fontSize: "24px", fontWeight: "bold" }}
      >
        &#187;
      </button>
    </div>
  )
}
