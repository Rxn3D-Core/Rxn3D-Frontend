import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
}

export const ImplantBrandCards: React.FC<ImplantBrandCardsProps> = ({
  implants,
  selectedImplantId,
  onSelectImplant,
  productId,
  arch
}) => {
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [hoveredImplantId, setHoveredImplantId] = useState<number | null>(null)

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
  }, [implants])

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

  if (!implants || implants.length === 0) {
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

      {/* Brand Cards Container */}
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
        {implants.map((implant, index) => {
          const isSelected = selectedImplantId === implant.id
          const isHovered = hoveredImplantId === implant.id
          
          return (
            <div
              key={implant.id}
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
              {/* Brand Logo/Image */}
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
                {implant.brand_name}
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
