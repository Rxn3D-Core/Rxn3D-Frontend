"use client"

import * as React from "react"
import { Check, AlertTriangle, X, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export type ValidationState = "default" | "valid" | "warning" | "error" | "disabled"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  validationState?: ValidationState
  errorMessage?: string
  warningMessage?: string
  showValidIcon?: boolean
  /** When the input is a password, show an eye toggle to reveal/hide the value. */
  revealToggle?: boolean
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
      revealToggle = false,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [isRevealed, setIsRevealed] = React.useState(false)
    const hasValue = value !== undefined && value !== null && value !== ""

    const canReveal = revealToggle && type === "password"
    const effectiveType = canReveal && isRevealed ? "text" : type

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

    // Reveal/hide toggle for password fields
    const getRevealToggle = () => {
      if (!canReveal) return null

      return (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsRevealed((prev) => !prev)}
          className="shrink-0 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
          aria-label={isRevealed ? "Hide password" : "Show password"}
          aria-pressed={isRevealed}
        >
          {isRevealed ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      )
    }

    // If no label, return simple input
    if (!label) {
      return (
        <div
          style={{ borderColor: getBorderColorValue() }}
          className={cn(
            "flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border-[1.5px] bg-white px-4 py-2",
            "transition-all duration-200 ease-out",
            getRingEffect(),
            !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]",
            (disabled || validationState === "disabled") && "opacity-40 cursor-not-allowed bg-gray-50",
            className
          )}
        >
          <input
            type={effectiveType}
            ref={ref}
            value={value}
            disabled={disabled || validationState === "disabled"}
            className="min-w-0 flex-1 bg-transparent text-base outline-none disabled:cursor-not-allowed"
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
          {getRevealToggle()}
        </div>
      )
    }

    return (
      <div className="w-full pt-2">
        <div
          style={{ borderColor: getBorderColorValue() }}
          className={cn(
            "relative flex h-14 min-w-0 cursor-text items-center rounded-lg border-2 bg-white px-4 transition-all duration-200",
            getRingEffect(),
            !disabled && !isFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]",
            (disabled || validationState === "disabled") && "cursor-not-allowed bg-gray-50 opacity-40",
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
              "pointer-events-none absolute left-3 z-10 max-w-[calc(100%-1.5rem)] truncate bg-white px-1.5 text-xs leading-none transition-all duration-200",
              "-top-2.5"
            )}
          >
            {label}
          </label>
          <div className="flex items-center gap-2 min-w-0 w-full">
            <input
              type={effectiveType}
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
            {getRevealToggle()}
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
