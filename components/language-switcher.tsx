"use client"

import { useLanguage } from "@/contexts/language-context" 
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, languages } = useLanguage()
  const { t } = useTranslation()

  if (!languages || languages.length === 0) {
    return (
      <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2" disabled>
        <Globe className="h-4 w-4 animate-spin" />
        <span className="hidden md:inline-block">Loading...</span>
      </Button>
    )
  }

  const currentLangDetails = languages.find((lang) => lang.code === currentLanguage) ||
    languages[0] || { code: "en", name: "English", nativeName: "English" }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline-block">{currentLangDetails.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={currentLanguage === language.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{language.nativeName}</span>
            <span className="text-muted-foreground text-xs">({language.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
