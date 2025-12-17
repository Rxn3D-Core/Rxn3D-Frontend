import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a code from a name by taking the first letter of each word
 * @param name - The name to generate code from
 * @returns The generated code (e.g., "Sleep Apnea Device" -> "SAD")
 */
export function generateCodeFromName(name: string): string {
  if (!name || !name.trim()) return ""
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}
