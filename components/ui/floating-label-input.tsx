"use client"

import * as React from "react"
import { Check, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ValidationState = "default" | "valid" | "warning" | "error" | "disabled"

export interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  validationState?: ValidationState
  errorMessage?: string
  warningMessage?: string
  showValidIcon?: boolean
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  (
    {
      className,
      label,
      validationState = "default",
      errorMessage,
      warningMessage,
      showValidIcon = true,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const hasValue = value !== undefined && value !== null && value !== ""
    const shouldFloatLabel = isFocused || hasValue

    // Determine border color based on validation state
    const getBorderColor = () => {
      if (disabled || validationState === "disabled") return "border-[#BDBDBD]"
      if (validationState === "valid") return "border-[#119933]"
      if (validationState === "warning") return "border-[#FF9900]"
      if (validationState === "error") return "border-[#CF0202]"
      if (isFocused) return "border-[#1162A8]"
      return "border-[#E0E0E0]"
    }

    // Determine label color based on validation state
    const getLabelColor = () => {
      if (disabled || validationState === "disabled") return "text-[#BDBDBD]"
      if (validationState === "valid") return "text-[#119933]"
      if (validationState === "warning") return "text-[#FF9900]"
      if (validationState === "error") return "text-[#CF0202]"
      if (isFocused) return "text-[#1162A8]"
      return "text-gray-500"
    }

    // Determine ring/glow effect
    const getRingEffect = () => {
      if (disabled || validationState === "disabled") return ""
      if (isFocused && validationState === "default") {
        return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
      }
      if (isFocused && validationState === "valid") {
        return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
      }
      if (isFocused && validationState === "warning") {
        return "ring-2 ring-[#FF9900] ring-opacity-20 shadow-[0_0_0_4px_rgba(255,153,0,0.15)]"
      }
      if (isFocused && validationState === "error") {
        return "ring-2 ring-[#CF0202] ring-opacity-20 shadow-[0_0_0_4px_rgba(207,2,2,0.15)]"
      }
      return ""
    }

    // Get validation icon
    const getValidationIcon = () => {
      if (!showValidIcon) return null

      if (validationState === "valid" && hasValue) {
        return (
          <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
        )
      }
      if (validationState === "warning" && hasValue) {
        return (
          <AlertTriangle className="h-5 w-5 text-[#FF9900]" aria-label="Warning" />
        )
      }
      if (validationState === "error" && hasValue) {
        return (
          <X className="h-5 w-5 text-[#CF0202]" aria-label="Error" />
        )
      }
      return null
    }

    return (
      <div className="relative w-full">
        {/* Floating Label - appears above input when there's a value */}
        {hasValue && (
          <label
            className={cn(
              "absolute -top-2 left-3 bg-white px-1 text-xs transition-all z-10",
              getLabelColor()
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            value={value}
            disabled={disabled || validationState === "disabled"}
            className={cn(
              // Base styles
              "flex h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base",
              "transition-all duration-200 ease-out",
              "focus:outline-none",
              // Border color
              getBorderColor(),
              // Ring effect
              getRingEffect(),
              // Hover effect (soft glow)
              !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]",
              // Disabled state
              (disabled || validationState === "disabled") && "opacity-40 cursor-not-allowed bg-gray-50",
              className
            )}
            placeholder={hasValue ? "" : props.placeholder}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />

          {/* Validation Icon */}
          {getValidationIcon() && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getValidationIcon()}
            </div>
          )}
        </div>

        {/* Error Message */}
        {validationState === "error" && errorMessage && (
          <div className="flex items-center gap-1 mt-1 text-[#CF0202] text-sm">
            <X className="h-3.5 w-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Warning Message */}
        {validationState === "warning" && warningMessage && (
          <div className="flex items-center gap-1 mt-1 text-[#FF9900] text-sm">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{warningMessage}</span>
          </div>
        )}
      </div>
    )
  }
)

FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }
