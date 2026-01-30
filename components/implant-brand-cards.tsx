import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Implant {
  id: number
  brand_name: string
  system_name: string
  code: string
  image_url?: string
  platforms?: Array<{
    id: number
    name: string
    image?: string
  }>
}

interface ImplantBrandCardsProps {
  implants: Implant[]
  selectedImplantId?: number | null
  onSelectImplant: (implant: Implant) => void
  productId?: string
  arch?: "maxillary" | "mandibular"
  isLoading?: boolean
}

export const ImplantBrandCards: React.FC<ImplantBrandCardsProps> = ({
  implants,
  selectedImplantId,
  onSelectImplant,
  productId,
  arch,
  isLoading = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredImplantId, setHoveredImplantId] = useState<number | null>(null)

  const CARDS_TO_SHOW = 3
  const CARD_WIDTH = 155
  const CARD_GAP = 15

  // Calculate max index for navigation
  const maxIndex = Math.max(0, implants.length - CARDS_TO_SHOW)

  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < maxIndex

  // Scroll to selected implant when component mounts or selectedImplantId changes
  useEffect(() => {
    if (selectedImplantId) {
      const selectedIndex = implants.findIndex(i => i.id === selectedImplantId)
      if (selectedIndex !== -1) {
        // Center the selected card if possible
        const targetIndex = Math.max(0, Math.min(selectedIndex - 1, maxIndex))
        setCurrentIndex(targetIndex)
      }
    }
  }, [selectedImplantId, implants, maxIndex])

  const scroll = (direction: 'left' | 'right') => {
    if (direction === 'left' && canScrollLeft) {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    } else if (direction === 'right' && canScrollRight) {
      setCurrentIndex(prev => Math.min(maxIndex, prev + 1))
    }
  }

  const CARDS_TO_SHOW_SKELETON = 3
  const CARD_WIDTH_SKELETON = 155
  const CARD_GAP_SKELETON = 15
  const containerWidthSkeleton = (CARD_WIDTH_SKELETON * CARDS_TO_SHOW_SKELETON) + (CARD_GAP_SKELETON * (CARDS_TO_SHOW_SKELETON - 1))

  if (isLoading) {
    return (
      <div className="relative w-full mb-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Skeleton className="flex-shrink-0 rounded-full" style={{ width: '32px', height: '32px', marginRight: '15px' }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${CARD_GAP_SKELETON}px`,
            width: `${containerWidthSkeleton}px`,
            height: '205px'
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-4"
              style={{
                padding: '16px',
                width: `${CARD_WIDTH_SKELETON}px`,
                height: '185px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '7px'
              }}
            >
              <Skeleton className="rounded-[5px]" style={{ width: '123px', height: '123px' }} />
              <Skeleton className="h-4 rounded" style={{ width: '80px' }} />
            </div>
          ))}
        </div>
        <Skeleton className="flex-shrink-0 rounded-full" style={{ width: '32px', height: '32px', marginLeft: '15px' }} />
      </div>
    )
  }

  if (!implants || implants.length === 0) {
    return null
  }

  // Get the visible implants based on current index
  const visibleImplants = implants.slice(currentIndex, currentIndex + CARDS_TO_SHOW)

  // Container width for 3 cards + gaps
  const containerWidth = (CARD_WIDTH * CARDS_TO_SHOW) + (CARD_GAP * (CARDS_TO_SHOW - 1))

  return (
    <div className="relative w-full mb-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Left Navigation Arrow */}
      <button
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className={`flex-shrink-0 bg-white rounded-full p-2 shadow-md transition-colors ${
          canScrollLeft ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
        }`}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '15px'
        }}
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* Brand Cards Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${CARD_GAP}px`,
          width: `${containerWidth}px`,
          height: '205px',
          overflow: 'visible'
        }}
      >
        {visibleImplants.map((implant) => {
          const isSelected = selectedImplantId === implant.id
          const isHovered = hoveredImplantId === implant.id

          return (
            <div
              key={implant.id}
              data-implant-id={implant.id}
              onClick={() => onSelectImplant(implant)}
              onMouseEnter={() => setHoveredImplantId(implant.id)}
              onMouseLeave={() => setHoveredImplantId(null)}
              className="flex-shrink-0 cursor-pointer transition-all"
              style={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                gap: '16px',
                width: `${CARD_WIDTH}px`,
                height: '185px',
                background: '#FFFFFF',
                border: isSelected
                  ? '2px solid #1162A8'
                  : isHovered
                    ? '1px solid #1162A8'
                    : '1px solid #B4B0B0',
                borderRadius: '7px',
                boxShadow: isSelected
                  ? '9px 7px 21.5px rgba(0, 0, 0, 0.25)'
                  : isHovered
                    ? '0 2px 8px rgba(17, 98, 168, 0.15)'
                    : 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {/* Brand Logo/Image */}
              <div
                style={{
                  width: '123px',
                  height: '123px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: implant.image_url ? 'transparent' : '#F5F5F5'
                }}
              >
                {implant.image_url ? (
                  <img
                    src={implant.image_url}
                    alt={implant.brand_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '5px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F5F5F5',
                    borderRadius: '5px'
                  }}>
                    <span style={{
                      color: '#9BA5B7',
                      fontSize: '24px',
                      fontWeight: 600,
                      fontFamily: 'Verdana, Arial, sans-serif'
                    }}>
                      {implant.brand_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Brand Name - Clickable Label */}
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectImplant(implant)
                }}
                className="cursor-pointer"
                style={{
                  width: '123px',
                  height: '16px',
                  fontFamily: 'Verdana',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '10.9763px',
                  lineHeight: '15px',
                  textAlign: 'center',
                  letterSpacing: '-0.02em',
                  color: isHovered || isSelected ? '#1162A8' : '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
              >
                {implant.brand_name}
              </div>
            </div>
          )
        })}
      </div>

      {/* Right Navigation Arrow */}
      <button
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className={`flex-shrink-0 bg-white rounded-full p-2 shadow-md transition-colors ${
          canScrollRight ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
        }`}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '15px'
        }}
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  )
}
