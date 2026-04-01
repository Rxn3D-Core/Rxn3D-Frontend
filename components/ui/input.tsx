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

    // Determine border color based on validation state
    const getBorderColorValue = () => {
      if (disabled || validationState === "disabled") return "#BDBDBD"
      if (validationState === "valid") return "#119933"
      if (validationState === "warning") return "#FF9900"
      if (validationState === "error") return "#CF0202"
      if (isFocused) return "#1162A8"
      return "#E0E0E0"
    }

    // Determine label color based on validation state
    const getLabelColorValue = () => {
      if (disabled || validationState === "disabled") return "#BDBDBD"
      if (validationState === "valid") return "#119933"
      if (validationState === "warning") return "#FF9900"
      if (validationState === "error") return "#CF0202"
      if (isFocused) return "#1162A8"
      return "#6b7280"
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
          style={{ borderColor: getBorderColorValue() }}
          className={cn(
            "flex h-10 w-full rounded-lg border-[1.5px] bg-white px-4 py-2 text-base",
            "transition-all duration-200 ease-out",
            "focus:outline-none",
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
        <div
          style={{ borderColor: getBorderColorValue() }}
          className={cn(
            "border-2 rounded-lg px-4 relative h-14 flex items-center min-w-0 transition-all duration-200 bg-white cursor-text",
            getRingEffect(),
            !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]",
            (disabled || validationState === "disabled") && "opacity-40 cursor-not-allowed bg-gray-50",
            className
          )}
          onClick={() => {
            const input = document.getElementById(props.id || "")
            input?.focus()
          }}
        >
          <label
            htmlFor={props.id}
            style={{ color: getLabelColorValue() }}
            className={cn(
              "absolute left-4 transition-all duration-200 pointer-events-none",
              "-top-2.5 text-xs bg-white px-1"
            )}
          >
            {label}
          </label>
          <div className="flex items-center gap-2 min-w-0 w-full">
            <input
              type={type}
              ref={ref}
              value={value}
              disabled={disabled || validationState === "disabled"}
              className="text-[14px] font-normal text-[#000000] bg-transparent outline-none leading-tight min-w-0 flex-1 truncate"
              placeholder=""
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
        </div>
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
