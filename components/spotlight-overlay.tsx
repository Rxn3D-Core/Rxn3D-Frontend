"use client"

import React, { useEffect, useState, useRef } from 'react'

interface SpotlightOverlayProps {
  isActive: boolean
  targetElement: HTMLElement | null
  onClose?: () => void
  children?: React.ReactNode
}

export default function SpotlightOverlay({
  isActive,
  targetElement,
  onClose,
  children
}: SpotlightOverlayProps) {
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !targetElement) return

    const updateSpotlightPosition = () => {
      const rect = targetElement.getBoundingClientRect()
      setSpotlightPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width + 20, // Add some padding
        height: rect.height + 20
      })
    }

    updateSpotlightPosition()

    // Update position on scroll and resize
    const handleScroll = () => updateSpotlightPosition()
    const handleResize = () => updateSpotlightPosition()

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isActive, targetElement])

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Spotlight circle */}
      <div
        className="absolute rounded-lg bg-white shadow-2xl transition-all duration-300 ease-in-out"
        style={{
          left: `${spotlightPosition.x - spotlightPosition.width / 2}px`,
          top: `${spotlightPosition.y - spotlightPosition.height / 2}px`,
          width: `${spotlightPosition.width}px`,
          height: `${spotlightPosition.height}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />
      
      {/* Optional content overlay */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-white rounded-lg p-6 shadow-xl max-w-md mx-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

