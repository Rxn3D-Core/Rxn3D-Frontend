import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImplantPlatform {
  id: number
  name: string
  image?: string
  image_url?: string
}

interface ImplantPlatformCardsProps {
  platforms: ImplantPlatform[]
  selectedPlatformId?: number | null
  onSelectPlatform: (platform: ImplantPlatform) => void
  productId?: string
  arch?: "maxillary" | "mandibular"
}

export const ImplantPlatformCards: React.FC<ImplantPlatformCardsProps> = ({
  platforms,
  selectedPlatformId,
  onSelectPlatform,
  productId,
  arch
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredPlatformId, setHoveredPlatformId] = useState<number | null>(null)

  const CARDS_TO_SHOW = 3
  const CARD_WIDTH = 155
  const CARD_GAP = 15

  // Static/dummy platform data for testing (based on image reference)
  const staticPlatforms: ImplantPlatform[] = [
    { id: 1, name: 'Bone Level' },
    { id: 2, name: 'Truscan' },
    { id: 3, name: 'Xtechnology' },
    { id: 4, name: 'H Implants' },
    { id: 5, name: 'Other Brands' }
  ]

  // Use static platforms if no platforms provided
  const displayPlatforms = (platforms && platforms.length > 0) ? platforms : staticPlatforms

  // Calculate max index for navigation
  const maxIndex = Math.max(0, displayPlatforms.length - CARDS_TO_SHOW)

  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < maxIndex

  // Scroll to selected platform when component mounts or selectedPlatformId changes
  useEffect(() => {
    if (selectedPlatformId) {
      const selectedIndex = displayPlatforms.findIndex(p => p.id === selectedPlatformId)
      if (selectedIndex !== -1) {
        // Center the selected card if possible
        const targetIndex = Math.max(0, Math.min(selectedIndex - 1, maxIndex))
        setCurrentIndex(targetIndex)
      }
    }
  }, [selectedPlatformId, displayPlatforms, maxIndex])

  const scroll = (direction: 'left' | 'right') => {
    if (direction === 'left' && canScrollLeft) {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    } else if (direction === 'right' && canScrollRight) {
      setCurrentIndex(prev => Math.min(maxIndex, prev + 1))
    }
  }

  if (!displayPlatforms || displayPlatforms.length === 0) {
    return null
  }

  // Get the visible platforms based on current index
  const visiblePlatforms = displayPlatforms.slice(currentIndex, currentIndex + CARDS_TO_SHOW)

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

      {/* Platform Cards Container */}
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
        {visiblePlatforms.map((platform) => {
          const isSelected = selectedPlatformId === platform.id
          const isHovered = hoveredPlatformId === platform.id

          return (
            <div
              key={platform.id}
              data-platform-id={platform.id}
              onClick={() => onSelectPlatform(platform)}
              onMouseEnter={() => setHoveredPlatformId(platform.id)}
              onMouseLeave={() => setHoveredPlatformId(null)}
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
              {/* Platform Logo/Image */}
              <div
                style={{
                  width: '123px',
                  height: '123px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: (platform.image_url || platform.image) ? 'transparent' : '#F5F5F5'
                }}
              >
                {(platform.image_url || platform.image) ? (
                  <img
                    src={platform.image_url || platform.image}
                    alt={platform.name}
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
                      {platform.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Platform Name - Clickable Label */}
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectPlatform(platform)
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
                {platform.name}
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
