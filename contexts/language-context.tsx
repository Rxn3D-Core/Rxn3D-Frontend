"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import i18n from "@/lib/i18n"

type LanguageContextType = {
  currentLanguage: string
  changeLanguage: (lang: string) => void
  languages: { code: string; name: string; nativeName: string }[]
}

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
]

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: "en",
  changeLanguage: () => {},
  languages,
})

export const useLanguage = () => useContext(LanguageContext)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const i18nInstance = i18n
  const [currentLanguage, setCurrentLanguage] = useState(i18nInstance.language || "en")
  
  const isInitialized = i18nInstance.isInitialized

  const changeLanguage = useCallback((lang: string) => {
    if (isInitialized) {
      i18nInstance.changeLanguage(lang)
    }
  }, [isInitialized]); 

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng)
      document.documentElement.lang = lng
      localStorage.setItem("i18nextLng", lng)
    }

    if (isInitialized) {
      i18nInstance.on("languageChanged", handleLanguageChanged)
    }

    return () => {
      if (isInitialized) {
        i18nInstance.off("languageChanged", handleLanguageChanged)
      }
    }
  }, [isInitialized]); // Only depend on the initialization state

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, languages }}>
      {children}
    </LanguageContext.Provider>
  )
}
