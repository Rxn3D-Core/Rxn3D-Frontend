"use client"

import React, { useEffect, useState } from 'react'
import { use3DModelPreload } from '@/hooks/use-3d-model-preload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react'

interface PreloadStatusProps {
  showDetails?: boolean
  showManualTrigger?: boolean
  className?: string
}

export function PreloadStatus({ 
  showDetails = false, 
  showManualTrigger = false,
  className = "" 
}: PreloadStatusProps) {
  const { getTeethModelsStatus, preloadTeethModels } = use3DModelPreload()
  const [status, setStatus] = useState(getTeethModelsStatus())
  const [isManualLoading, setIsManualLoading] = useState(false)

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getTeethModelsStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [getTeethModelsStatus])

  const handleManualPreload = async () => {
    setIsManualLoading(true)
    try {
      await preloadTeethModels()
    } catch (error) {
      console.error('Manual preload failed:', error)
    } finally {
      setIsManualLoading(false)
    }
  }

  const getStatusIcon = () => {
    if (status.anyLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    } else if (status.allLoaded) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusText = () => {
    if (status.anyLoading) {
      return "Preloading 3D Models..."
    } else if (status.allLoaded) {
      return "3D Models Ready"
    } else {
      return "3D Models Pending"
    }
  }

  const getStatusColor = () => {
    if (status.anyLoading) {
      return "bg-blue-100 text-blue-800 border-blue-200"
    } else if (status.allLoaded) {
      return "bg-green-100 text-green-800 border-green-200"
    } else {
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 ${getStatusColor()}`}
      >
        <Zap className="w-3 h-3" />
        {getStatusIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
      </Badge>

      {showManualTrigger && !status.allLoaded && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualPreload}
          disabled={isManualLoading || status.anyLoading}
          className="h-6 px-2 text-xs"
        >
          {isManualLoading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Zap className="w-3 h-3 mr-1" />
          )}
          Preload Now
        </Button>
      )}
    </div>
  )
}

// Compact version for dashboard
export function CompactPreloadStatus() {
  return <PreloadStatus showDetails={false} showManualTrigger={false} />
}

// Full version with details and manual trigger
export function FullPreloadStatus() {
  return <PreloadStatus showDetails={true} showManualTrigger={true} />
}
