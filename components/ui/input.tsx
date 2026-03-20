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

    return (
      <div className="w-full">
        <fieldset
          className={cn(
            "border-2 rounded-lg px-3 py-0 relative h-14 flex items-center min-w-0 transition-colors duration-150 bg-white",
            getBorderColor(),
            getRingEffect(),
            !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]",
            (disabled || validationState === "disabled") && "opacity-40 cursor-not-allowed bg-gray-50",
            className
          )}
        >
          <legend
            className={cn(
              "text-sm px-1 leading-none whitespace-nowrap transition-colors duration-150",
              getLabelColor()
            )}
          >
            {label}
          </legend>
          <div className="flex items-center gap-2 min-w-0 w-full">
            <input
              type={type}
              ref={ref}
              value={value}
              disabled={disabled || validationState === "disabled"}
              className="text-lg font-normal text-[#000000] bg-transparent outline-none leading-tight min-w-0 flex-1 truncate"
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
            {getValidationIcon()}
          </div>
        </fieldset>
        {validationState === "error" && errorMessage && (
          <p className="text-xs text-[#CF0202] mt-1 px-1">{errorMessage}</p>
        )}
        {validationState === "warning" && warningMessage && (
          <p className="text-xs text-[#FF9900] mt-1 px-1">{warningMessage}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
