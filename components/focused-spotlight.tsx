"use client"

import React, { useEffect, useState, useRef } from 'react'

interface FocusedSpotlightProps {
  isActive: boolean
  targetElement: HTMLElement | null
  onClose?: () => void
}

export default function FocusedSpotlight({
  isActive,
  targetElement,
  onClose
}: FocusedSpotlightProps) {
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !targetElement) return

    const updateSpotlightPosition = () => {
      const rect = targetElement.getBoundingClientRect()
      setSpotlightPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width + 24, // Add more padding for better visibility
        height: rect.height + 24
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
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          maskImage: `radial-gradient(ellipse ${spotlightPosition.width + 24}px ${spotlightPosition.height + 24}px at ${spotlightPosition.x}px ${spotlightPosition.y}px, transparent 50%, black 70%)`,
          WebkitMaskImage: `radial-gradient(ellipse ${spotlightPosition.width + 24}px ${spotlightPosition.height + 24}px at ${spotlightPosition.x}px ${spotlightPosition.y}px, transparent 50%, black 70%)`
        }}
      />
      
      {/* Optional instruction text */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-4 py-2 shadow-lg z-50">
        <p className="text-sm font-medium text-gray-700">
          Click outside to exit
        </p>
      </div>
    </>
  )
}

