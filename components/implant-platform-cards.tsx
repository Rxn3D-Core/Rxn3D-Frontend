import React, { useState, useRef, useEffect } from 'react'
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
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [hoveredPlatformId, setHoveredPlatformId] = useState<number | null>(null)

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScrollability()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollability)
      window.addEventListener('resize', checkScrollability)
      return () => {
        container.removeEventListener('scroll', checkScrollability)
        window.removeEventListener('resize', checkScrollability)
      }
    }
  }, [platforms])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      const newPosition = direction === 'left' 
        ? scrollPosition - scrollAmount 
        : scrollPosition + scrollAmount
      
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      })
      setScrollPosition(newPosition)
    }
  }

  // Static/dummy platform data for testing (based on image reference)
  const staticPlatforms: ImplantPlatform[] = [
    { id: 1, name: 'Bone Level' },
    { id: 2, name: 'Truscan' },
    { id: 3, name: 'KATANA Zirconia' },
    { id: 4, name: 'Cercon xt ML' },
    { id: 5, name: '3M ESPE Lava Plus' }
  ]

  // Use static platforms if no platforms provided
  const displayPlatforms = (platforms && platforms.length > 0) ? platforms : staticPlatforms

  if (!displayPlatforms || displayPlatforms.length === 0) {
    return null
  }

  return (
    <div className="relative w-full mb-4" style={{ display: 'flex', justifyContent: 'center' }}>
      {/* Navigation Arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}
      
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Platform Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0px',
          gap: '15px',
          width: '835px',
          height: '185px',
          flex: 'none',
          order: 2,
          flexGrow: 0,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingLeft: canScrollLeft ? '40px' : '0',
          paddingRight: canScrollRight ? '40px' : '0'
        }}
        onScroll={checkScrollability}
      >
        {displayPlatforms.map((platform, index) => {
          const isSelected = selectedPlatformId === platform.id
          const isHovered = hoveredPlatformId === platform.id
          
          return (
            <div
              key={platform.id}
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
                width: '155px',
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
                flex: 'none',
                order: index,
                flexGrow: 0,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {/* Platform Logo/Image */}
              <div 
                style={{
                  width: '123px',
                  height: '123px',
                  borderRadius: '5px',
                  flex: 'none',
                  order: 0,
                  alignSelf: 'stretch',
                  flexGrow: 0,
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
                  flex: 'none',
                  order: 1,
                  alignSelf: 'stretch',
                  flexGrow: 0,
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
    </div>
  )
}
