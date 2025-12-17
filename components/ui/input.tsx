"use client"

import * as React from "react"
import { Check, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ValidationState = "default" | "valid" | "warning" | "error" | "disabled"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  validationState?: ValidationState
  errorMessage?: string
  warningMessage?: string
  showValidIcon?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
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
    const shouldFloatLabel = label && (isFocused || hasValue)

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
        return <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
      }
      if (validationState === "warning" && hasValue) {
        return <AlertTriangle className="h-5 w-5 text-[#FF9900]" aria-label="Warning" />
      }
      if (validationState === "error" && hasValue) {
        return <X className="h-5 w-5 text-[#CF0202]" aria-label="Error" />
      }
      return null
    }

    // If no label, return simple input
    if (!label) {
      return (
        <input
          type={type}
          ref={ref}
          value={value}
          disabled={disabled || validationState === "disabled"}
          className={cn(
            "flex h-10 w-full rounded-lg border-[1.5px] bg-white px-4 py-2 text-base",
            "transition-all duration-200 ease-out",
            "focus:outline-none",
            getBorderColor(),
            getRingEffect(),
            !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]",
            (disabled || validationState === "disabled") && "opacity-40 cursor-not-allowed bg-gray-50",
            className
          )}
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
      )
    }

    // Return floating label input - label always visible inside field at top
    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            type={type}
            ref={ref}
            value={value}
            disabled={disabled || validationState === "disabled"}
            className={cn(
              // Increased height for internal label, padding-top for label space
              "flex h-14 w-full rounded-lg border-2 bg-white px-4 pt-6 pb-2 text-base",
              "transition-all ease-out",
              "focus:outline-none",
              "placeholder:text-gray-400",
              getBorderColor(),
              getRingEffect(),
              // Hover glow: 150ms ease-out with 20% opacity
              !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
              // Disabled: 40% opacity, 200ms ease-in
              (disabled || validationState === "disabled") &&
                "opacity-40 cursor-not-allowed bg-gray-50 transition-opacity duration-200",
              className
            )}
            style={{
              fontSize: '16px',
              transitionDuration: isFocused ? '250ms' : '150ms',
              transitionTimingFunction: isFocused ? 'ease-in-out' : 'ease-out'
            }}
            placeholder={props.placeholder}
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

          {/* Floating Label - always visible at top inside field when focused or has value */}
          {(isFocused || hasValue) && (
            <label
              className={cn(
                "absolute top-1 left-4 text-xs transition-all duration-200 ease-out pointer-events-none",
                getLabelColor()
              )}
              style={{ fontSize: '11px', lineHeight: '1' }}
            >
              {/* Show error/warning message as label if present, otherwise show regular label */}
              {validationState === "error" && errorMessage
                ? errorMessage
                : validationState === "warning" && warningMessage
                ? warningMessage
                : label}
            </label>
          )}

          {/* Validation Icon */}
          {getValidationIcon() && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getValidationIcon()}
            </div>
          )}
        </div>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
