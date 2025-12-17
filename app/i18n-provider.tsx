"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "@/lib/i18n"
import { LanguageProvider } from "@/contexts/language-context"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    
    // Prevent multiple initialization listeners
    if (initializedRef.current) {
      setIsReady(true)
      return
    }
    
    // Wait for i18n to be ready before rendering children
    if (i18n.isInitialized) {
      setIsReady(true)
      initializedRef.current = true
    } else {
      const handleInitialized = () => {
        setIsReady(true)
        initializedRef.current = true
        i18n.off("initialized", handleInitialized)
      }
      i18n.on("initialized", handleInitialized)
      
      return () => {
        i18n.off("initialized", handleInitialized)
      }
    }
  }, [])

  // Render children immediately, i18n will load translations in background
  // This prevents blocking the initial render
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  )
}
