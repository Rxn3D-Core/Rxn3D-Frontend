"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type TextSize = "small" | "medium" | "large" | "extra-large"

interface AccessibilityContextType {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>("extra-large")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Load saved text size from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    
    setTextSize("medium")
    
    // Save the extra-large setting to localStorage
    localStorage.setItem("accessibility-text-size", "extra-large")
  }, [])

  // Save text size to localStorage and apply CSS variables
  useEffect(() => {
    if (typeof window === "undefined") return
    
    localStorage.setItem("accessibility-text-size", textSize)

    // Apply CSS custom properties based on text size
    const root = document.documentElement
    switch (textSize) {
      case "small":
        root.style.setProperty("--text-scale", "0.875")
        root.style.setProperty("--heading-scale", "0.9")
        break
      case "medium":
        root.style.setProperty("--text-scale", "1")
        root.style.setProperty("--heading-scale", "1")
        break
      case "large":
        root.style.setProperty("--text-scale", "1.125")
        root.style.setProperty("--heading-scale", "1.1")
        break
      case "extra-large":
        root.style.setProperty("--text-scale", "1.25")
        root.style.setProperty("--heading-scale", "1.2")
        break
    }
  }, [textSize])

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        setTextSize,
        isSettingsOpen,
        setIsSettingsOpen,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  }
  return context
}
