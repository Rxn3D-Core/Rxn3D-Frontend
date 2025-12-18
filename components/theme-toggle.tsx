"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-11 xl:w-11 rounded-full hover:bg-gray-100 flex-shrink-0"
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 md:h-5 md:w-5 lg:h-5 lg:w-5 text-gray-600 hover:text-[#1162a8]" />
      ) : (
        <Sun className="h-4 w-4 md:h-5 md:w-5 lg:h-5 lg:w-5 text-gray-600 hover:text-[#1162a8]" />
      )}
    </Button>
  )
}
