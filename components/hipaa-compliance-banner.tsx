"use client"

import { useState, useMemo, useCallback, memo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Shield, Eye, Lock, AlertTriangle } from "lucide-react"

interface HIPAAComplianceBannerProps {
  variant?: "default" | "warning" | "info"
  showDetails?: boolean
  onAcknowledge?: () => void
}

// Memoize the variants object to prevent recreation on every render
const BANNER_VARIANTS = {
  default: {
    icon: Shield,
    className: "border-blue-200 bg-blue-50 text-blue-800",
    title: "HIPAA Compliance Notice"
  },
  warning: {
    icon: AlertTriangle,
    className: "border-yellow-200 bg-yellow-50 text-yellow-800",
    title: "Security Reminder"
  },
  info: {
    icon: Eye,
    className: "border-green-200 bg-green-50 text-green-800",
    title: "Privacy Protection Active"
  }
} as const

// Memoize the close icon SVG to prevent recreation
const CloseIcon = memo(() => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
))
CloseIcon.displayName = "CloseIcon"

// Memoize the expanded details content
const ExpandedDetails = memo(() => (
  <div className="mt-3 space-y-2 text-sm">
    <div className="flex items-start gap-2">
      <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <span>All data is encrypted in transit and at rest</span>
    </div>
    <div className="flex items-start gap-2">
      <Eye className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <span>Access is logged and monitored for security</span>
    </div>
    <div className="flex items-start gap-2">
      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <span>Report any security concerns immediately</span>
    </div>
  </div>
))
ExpandedDetails.displayName = "ExpandedDetails"

export const HIPAAComplianceBanner = memo(function HIPAAComplianceBanner({ 
  variant = "default", 
  showDetails = false,
  onAcknowledge 
}: HIPAAComplianceBannerProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const [showBanner, setShowBanner] = useState(true)
  const [showRemove, setShowRemove] = useState(true)

  // Memoize the current variant to prevent recalculation
  const currentVariant = useMemo(() => BANNER_VARIANTS[variant], [variant])
  const IconComponent = currentVariant.icon

  // Memoize event handlers to prevent recreation on every render
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleHideBanner = useCallback(() => {
    setShowBanner(false)
  }, [])

  const handleAcknowledge = useCallback(() => {
    onAcknowledge?.()
  }, [onAcknowledge])

  // Early return if banner is hidden
  if (!showBanner) {
    return null
  }

  return (
    <Alert className={currentVariant.className}>
      <IconComponent className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-semibold mb-1">{currentVariant.title}</div>
          <div className="flex items-center text-sm w-full">
            <span className="flex-1">
              This system contains Protected Health Information (PHI). You are responsible for maintaining the confidentiality and security of all patient data.
            </span>
          </div>
          
          {isExpanded && <ExpandedDetails />}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpanded}
            className="text-xs"
          >
            {isExpanded ? "Hide" : "Details"}
          </Button>
          {showRemove && (
            <div className="flex items-center ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="p-1 h-6 w-6 ml-2 self-center"
                aria-label="Remove"
                onClick={handleHideBanner}
                style={{ alignSelf: "center" }}
              >
                <CloseIcon />
              </Button>
            </div>
          )}
          {onAcknowledge && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcknowledge}
              className="text-xs"
            >
              Acknowledge
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}) 