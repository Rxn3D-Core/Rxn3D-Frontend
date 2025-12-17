"use client"

import React from "react"

interface LoadingOverlayProps {
  isLoading: boolean
  title?: string
  message?: string
  zIndex?: number
  className?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  title = "Loading",
  message = "Please wait...",
  zIndex = 10000,
  className = ""
}) => {
  if (!isLoading) return null

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-md ${className}`}
      style={{ 
        zIndex,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
        <img
          src="/images/ajax-loader.gif"
          alt="Loading..."
          className="h-24 w-24 mb-6"
        />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center">{message}</p>
      </div>
    </div>
  )
}

export default LoadingOverlay
